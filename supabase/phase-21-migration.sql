-- ============================================================
-- Phase 21 — transactional credits, notifications, audit log,
--            email delivery log, richer templates.
-- Additive migration. Apply after phase-20-migration.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Atomic credit consumption (P0 billing-correctness fix)
-- ------------------------------------------------------------
-- Every credit-consuming route previously did:
--     read credits_remaining  ->  subtract in Node  ->  write the result
-- Two generations started at the same moment both read the same balance
-- and both wrote (balance - cost), so the user was charged once for two
-- generations. Under a burst the account effectively generates for free.
-- The read-modify-write also cannot go negative safely.
--
-- This function performs the check and the decrement inside one statement,
-- so Postgres row locking serialises concurrent callers. It returns the
-- new balance, or NULL when the balance is insufficient (which the caller
-- must treat as "charge refused", not as an error).
create or replace function public.consume_credits(
  p_user_id uuid,
  p_amount int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int;
begin
  if p_amount < 0 then
    raise exception 'consume_credits: amount must not be negative';
  end if;

  update public.subscriptions
     set credits_remaining = credits_remaining - p_amount
   where user_id = p_user_id
     and credits_remaining >= p_amount
  returning credits_remaining into v_remaining;

  return v_remaining; -- NULL when no row matched (insufficient credits)
end;
$$;

-- Refund path for actions that must reserve credits before a long-running
-- job. Capped at credits_granted so a double refund cannot mint credits.
create or replace function public.refund_credits(
  p_user_id uuid,
  p_amount int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int;
begin
  if p_amount < 0 then
    raise exception 'refund_credits: amount must not be negative';
  end if;

  update public.subscriptions
     set credits_remaining = least(credits_remaining + p_amount, credits_granted)
   where user_id = p_user_id
  returning credits_remaining into v_remaining;

  return v_remaining;
end;
$$;

revoke all on function public.consume_credits(uuid, int) from public, anon, authenticated;
revoke all on function public.refund_credits(uuid, int) from public, anon, authenticated;
-- Only the service role may move credits. A logged-in user calling this
-- RPC directly with their own id would otherwise be able to zero out (or,
-- via refund, top up) their own balance.
grant execute on function public.consume_credits(uuid, int) to service_role;
grant execute on function public.refund_credits(uuid, int) to service_role;

-- Credits can never be negative, whatever writes them.
alter table public.subscriptions
  drop constraint if exists subscriptions_credits_non_negative;
alter table public.subscriptions
  add constraint subscriptions_credits_non_negative check (credits_remaining >= 0);

-- ------------------------------------------------------------
-- 2. Paddle webhook idempotency keyed on the EVENT id
-- ------------------------------------------------------------
-- The existing table's primary key was populated from `event.data.id`,
-- which for a subscription event is the SUBSCRIPTION id, not the event id.
-- Consequence: subscription.created inserted the subscription id, and the
-- later subscription.updated (an upgrade) collided with it and was
-- discarded as a "duplicate" — the customer paid for an upgrade that was
-- never applied. Paddle Billing sends a real per-delivery `event_id`;
-- these columns record what the row actually refers to so the two can
-- never be conflated again.
alter table public.paddle_webhook_events
  add column if not exists subject_id text,
  add column if not exists occurred_at timestamptz,
  add column if not exists status text not null default 'received'
    check (status in ('received', 'processed', 'failed', 'ignored')),
  add column if not exists error_detail text;

create index if not exists paddle_webhook_events_subject_idx
  on public.paddle_webhook_events (subject_id);

-- ------------------------------------------------------------
-- 3. Notification centre
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  category text not null check (category in ('auth','generation','project','deployment','billing','team','system')),
  title text not null,
  body text,
  href text,
  severity text not null default 'info' check (severity in ('info','success','warning','error')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

-- Read own; mark own as read. Creation is service-role only so a client
-- cannot fabricate a "Payment successful" notification for itself.
create policy "users can view own notifications" on public.notifications
  for select using (user_id = auth.uid());
create policy "users can mark own notifications read" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 4. Audit log
-- ------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  actor_email text,
  action text not null,
  resource_type text,
  resource_id text,
  ip_hash text,          -- hashed, never the raw address
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_created_idx
  on public.audit_logs (user_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action);

alter table public.audit_logs enable row level security;

create policy "users can view own audit log" on public.audit_logs
  for select using (user_id = auth.uid());
-- No insert policy: entries are written by the service role only, so a
-- user cannot forge or backdate their own history.

-- ------------------------------------------------------------
-- 5. Email delivery log
-- ------------------------------------------------------------
-- Two jobs: de-duplicating "you signed in" notifications when a single
-- sign-in produces several auth state changes, and giving support a
-- truthful answer to "was the email actually sent?".
create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  recipient text not null,
  template text not null,
  dedupe_key text,
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  error_detail text,
  created_at timestamptz not null default now()
);

create unique index if not exists email_deliveries_dedupe_idx
  on public.email_deliveries (dedupe_key) where dedupe_key is not null;
create index if not exists email_deliveries_user_idx
  on public.email_deliveries (user_id, created_at desc);

alter table public.email_deliveries enable row level security;
-- Service-role only: nothing in the browser needs to read delivery rows,
-- and they contain recipient addresses.

-- ------------------------------------------------------------
-- 6. Notification preferences on the user profile
-- ------------------------------------------------------------
alter table public.users
  add column if not exists avatar_url text,
  add column if not exists email_security_alerts boolean not null default true,
  add column if not exists email_product_updates boolean not null default true,
  add column if not exists email_billing_alerts boolean not null default true,
  add column if not exists marketing_opt_in boolean not null default false;

-- ------------------------------------------------------------
-- 7. Template catalogue columns
-- ------------------------------------------------------------
-- The seed catalogue previously carried (category, name, thumbnail) only,
-- with every thumbnail null — the marketplace rendered cards with no
-- image and no description. These columns back a real catalogue entry.
alter table public.templates
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists platforms text[] not null default '{web}',
  add column if not exists difficulty text
    check (difficulty is null or difficulty in ('starter','intermediate','advanced')),
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_new boolean not null default false,
  add column if not exists popularity int not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists templates_slug_idx on public.templates (slug) where slug is not null;
create index if not exists templates_category_idx on public.templates (category);

-- ------------------------------------------------------------
-- 8. Provision new columns for existing accounts
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name'  -- Google OAuth uses full_name
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, credits_remaining, credits_granted)
  values (new.id, 'free', 2000, 2000)
  on conflict do nothing;

  return new;
end;
$$;
