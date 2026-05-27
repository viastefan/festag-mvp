-- workspaces.region — needed by the onboarding workspace-creation step
-- so each tenant declares its data residency preference up front.
alter table workspaces
  add column if not exists region text not null default 'eu'
  check (region in ('eu','us','global'));

create index if not exists idx_workspaces_region on workspaces(region);
