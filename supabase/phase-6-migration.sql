-- Appo Phase 6: production-style release lifecycle metadata.
-- Additive only: existing apps, versions and deployments remain intact.
alter table deployments add column if not exists version_id uuid references app_versions(id);
alter table deployments add column if not exists status text not null default 'live' check (status in ('queued','building','live','failed','rolled_back'));
alter table deployments add column if not exists is_current boolean not null default false;
alter table deployments add column if not exists released_at timestamptz;
alter table deployments add column if not exists rolled_back_at timestamptz;
alter table deployments add column if not exists previous_deployment_id uuid references deployments(id);

create index if not exists idx_deployments_app_current on deployments(app_id, is_current);
create index if not exists idx_deployments_version_id on deployments(version_id);

-- Existing live web deployments become current where possible.
update deployments d
set is_current = true,
    status = case when d.store_status = 'live' then 'live' else d.status end,
    released_at = coalesce(d.released_at, now())
where d.id in (
  select distinct on (app_id) id
  from deployments
  where platform = 'web'
  order by app_id, id desc
);
