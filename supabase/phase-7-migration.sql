-- Appo Phase 7 — collaboration & invitations
-- Additive migration. Apply after phase-6-migration.sql.
create table if not exists app_collaborators (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references apps(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  role text not null default 'viewer' check (role in ('editor','viewer')),
  created_at timestamptz default now(),
  unique(app_id, user_id)
);

create table if not exists app_invitations (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references apps(id) on delete cascade not null,
  inviter_id uuid references users(id) on delete cascade not null,
  email text not null,
  role text not null default 'viewer' check (role in ('editor','viewer')),
  token_hash text unique not null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  accepted_at timestamptz
);

create index if not exists idx_app_collaborators_app on app_collaborators(app_id);
create index if not exists idx_app_collaborators_user on app_collaborators(user_id);
create index if not exists idx_app_invitations_app on app_invitations(app_id);
create index if not exists idx_app_invitations_email on app_invitations(lower(email));

alter table app_collaborators enable row level security;
alter table app_invitations enable row level security;

create policy "collaborators can view shared apps" on app_collaborators
  for select using (
    user_id = auth.uid() or exists (select 1 from apps where apps.id = app_collaborators.app_id and apps.user_id = auth.uid())
  );

create policy "invitees can view own invitations" on app_invitations
  for select using (lower(email) = lower(coalesce(auth.jwt()->>'email','')) or inviter_id = auth.uid());

-- Writes are intentionally service-role only so role/ownership cannot be forged from the client.
