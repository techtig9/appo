-- Phase 20: Paddle webhook idempotency.
-- Additive migration; does not modify existing business data.
create table if not exists public.paddle_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz,
  received_at timestamptz not null default now()
);

alter table public.paddle_webhook_events enable row level security;

-- No client policies: webhook ingestion uses the server service-role client.
create index if not exists paddle_webhook_events_received_at_idx
  on public.paddle_webhook_events (received_at desc);
