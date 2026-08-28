-- Phase 19: immutable production artifacts
-- Run after the existing Appo schema/migrations.

alter table public.app_versions
  add column if not exists artifact_checksum text,
  add column if not exists artifact_size_bytes bigint;

alter table public.deployments
  add column if not exists artifact_path text,
  add column if not exists artifact_checksum text,
  add column if not exists artifact_size_bytes bigint;

-- Private bucket: release ZIPs contain application source and must never be public.
insert into storage.buckets (id, name, public)
values ('app-releases', 'app-releases', false)
on conflict (id) do update set public = false;

-- Storage access is server-side through the Supabase service role.
-- No authenticated client policy is intentionally added: source artifacts are private.
