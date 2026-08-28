-- appo — Supabase schema
-- Apply this as-is before writing any app code (Phase 1.1)

create table users (
  id uuid primary key references auth.users(id),
  name text,
  email text unique not null,
  role text not null default 'user' check (role in ('user','admin')),
  two_factor_enabled boolean not null default false,
  theme_preference text not null default 'system' check (theme_preference in ('light','dark','system')),
  onboarding_completed boolean not null default false, -- Guided Onboarding Checklist
  created_at timestamptz default now()
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  thumbnail text
);

-- Seed templates (Phase 1's "3-5 seed templates is enough to validate the
-- generator" requirement — the table existed before with no rows in it).
insert into templates (category, name, thumbnail) values
  ('fitness', 'Habit & Workout Tracker', null),
  ('ecommerce', 'Simple Shop Front', null),
  ('productivity', 'Task List', null),
  ('social', 'Photo Feed', null),
  ('booking', 'Appointment Scheduler', null);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  plan text not null default 'free' check (plan in ('free','starter','pro','business')),
  status text not null default 'active',
  provider text default 'paddle',
  paddle_subscription_id text,
  paddle_customer_id text,
  credits_remaining int not null default 2000,
  credits_granted int not null default 2000,
  renews_at timestamptz
);

create table apps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  name text not null,
  bundle_id text,
  platforms text[] default '{web}',
  version text default '1.0.0',
  build_number int default 1,
  -- Zero-cost value-adds:
  folder text,                          -- Project Folders & Tags
  tags text[] default '{}',             -- Project Folders & Tags
  cloned_from uuid references apps(id), -- Clone / Duplicate App (lineage tracking, no extra generation)
  is_public_template boolean not null default false, -- Publish to Public Template Gallery
  webhook_url text,                     -- Build/Deploy Webhook Notifications
  custom_subdomain text unique,         -- Custom Web Subdomain (Business only, enforced in app logic)
  is_favorite boolean not null default false, -- Favorite / Starred Apps
  share_slug text unique,               -- Shareable Preview Link (null until first shared)
  created_at timestamptz default now()
);

-- App Version History & Rollback: one row per generation/regeneration,
-- storing a pointer to the stored project snapshot (not the code itself —
-- code lives in Supabase Storage, this table just indexes versions).
create table app_versions (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references apps(id) not null,
  version_number int not null,
  storage_path text not null,
  change_summary text,
  created_at timestamptz default now()
);

create table deployments (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references apps(id) not null,
  platform text not null check (platform in ('ios','android','web')),
  build_id text,
  store_status text default 'draft',
  deployment_url text,
  ota_channel text
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  paddle_transaction_id text,
  amount numeric,
  status text,
  created_at timestamptz default now()
);

create index idx_apps_user_id on apps(user_id);
create index idx_apps_folder on apps(folder);
create index idx_app_versions_app_id on app_versions(app_id);
create index idx_subscriptions_user_id on subscriptions(user_id);

-- ============================================================
-- New-user provisioning
-- ============================================================
-- CRITICAL: supabase.auth.signUp() only creates a row in Supabase's own
-- auth.users table. Nothing else in this app ever created the matching
-- public.users / public.subscriptions rows that literally every route
-- queries immediately after checking auth — without this trigger, every
-- authenticated route breaks for every brand-new signup (most return
-- "Account not fully provisioned" since profile/subscription come back
-- null). Found during a full consistency audit, not by any test — there's
-- no way to unit-test "does signup actually provision the account" without
-- a real database. SECURITY DEFINER is required so this can insert despite
-- RLS below being locked down for the authenticated role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');

  insert into public.subscriptions (user_id, plan, credits_remaining, credits_granted)
  values (new.id, 'free', 2000, 2000);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
-- Design principle used throughout: the `authenticated` role (what a
-- logged-in user's own client executes as) gets SELECT on its own rows
-- everywhere, but write access ONLY where the write is genuinely safe for
-- a user to make directly with no server-side validation (their own app's
-- name/tags/folder, favoriting, etc). Anything with real value attached —
-- credits, subscription status/plan, plan-gated flags like
-- is_public_template or share_slug, another user's data — has NO direct
-- write policy at all; those go through service-role routes that validate
-- first (see the "Service-role write" comments throughout src/app/api/).
-- The service_role key used by createServiceRoleClient() bypasses RLS
-- entirely by design, which is what makes those routes work.

alter table users enable row level security;
alter table subscriptions enable row level security;
alter table apps enable row level security;
alter table app_versions enable row level security;
alter table deployments enable row level security;
alter table payments enable row level security;
alter table templates enable row level security;

-- users: read own row only. No insert/update/delete policy for
-- `authenticated` — the signup trigger above (security definer) handles
-- creation, and /api/account/profile + /api/account/delete (service role)
-- handle every update/delete. This is what stops a user from directly
-- PATCHing their own `role` column to 'admin' via the REST API — there's
-- no row-level policy that would even let the attempt reach the table.
create policy "users can view own row" on users
  for select using (id = auth.uid());

-- subscriptions: read own row only. No write policy at all for
-- `authenticated` — credits, plan, and status only ever change via
-- service-role routes (generate, build, cancel, the Paddle webhook, admin
-- overrides). This is the fix for the exploit a naive "update own row"
-- policy would otherwise allow: a user directly PATCHing their own
-- credits_remaining or plan via the REST API to grant themselves credits
-- or a paid plan without paying.
create policy "users can view own subscription" on subscriptions
  for select using (user_id = auth.uid());

-- apps: users fully own their own rows for the fields that are genuinely
-- theirs to control directly (name, tags, folder, favoriting, cloning,
-- generator inserts). Gate-sensitive fields (is_public_template,
-- share_slug, custom_subdomain, webhook_url) are still reachable through
-- this same broad policy at the ROW level — the column-level protection
-- for those specific fields lives in the routes that write them via
-- service role after checking plan access (see publish-template, share,
-- and generate route comments), not in a column-level grant here. A
-- determined technical user could still directly PATCH those specific
-- columns via the REST API today; closing that fully needs Postgres
-- column-level GRANT/REVOKE on top of this policy — a real next step, not
-- yet done, and called out here rather than silently assumed solved.
--
-- SELECT is deliberately wider than "own rows only": /api/templates reads
-- OTHER users' public templates via the regular (non-service-role) client
-- for the community gallery — an ownership-only policy would have looked
-- correct and silently broken that feature (empty gallery for everyone).
create policy "users can view own apps or public templates" on apps
  for select using (user_id = auth.uid() or is_public_template = true);
create policy "users can insert own apps" on apps
  for insert with check (user_id = auth.uid());
create policy "users can update own apps" on apps
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users can delete own apps" on apps
  for delete using (user_id = auth.uid());

-- app_versions: read-only for the owning user, via a join back to apps
-- (app_versions has no user_id column of its own). No direct write policy
-- — version rows are only ever created by /api/generate (service role)
-- and read by /api/apps/[id]/versions.
create policy "users can view own app versions" on app_versions
  for select using (
    exists (select 1 from apps where apps.id = app_versions.app_id and apps.user_id = auth.uid())
  );

-- deployments: same pattern as app_versions — read-only via a join, only
-- ever written by the service-role build route.
create policy "users can view own deployments" on deployments
  for select using (
    exists (select 1 from apps where apps.id = deployments.app_id and apps.user_id = auth.uid())
  );

-- payments: read-only, own rows. Only ever written by the service-role
-- Paddle webhook handler and account deletion — a user has no legitimate
-- reason to write their own payment history directly.
create policy "users can view own payments" on payments
  for select using (user_id = auth.uid());

-- templates: seed templates and public community templates should be
-- readable by any logged-in user (this is the gallery) — no per-row
-- ownership concept applies here the way it does elsewhere.
create policy "authenticated users can view templates" on templates
  for select using (auth.role() = 'authenticated');
