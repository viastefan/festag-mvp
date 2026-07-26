-- Client Moments — immutable shareable Delivery Pulse snapshots for white-label portals.
-- Public access is via service-role API only (unguessable token). No broad anon RLS.

create table if not exists public.client_moments (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  agency_client_id uuid not null references public.agency_clients(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null default 'Lieferstand',
  scope text not null default 'overall' check (scope in ('overall', 'project')),
  project_id uuid references public.projects(id) on delete set null,
  pulse_json jsonb not null default '{}'::jsonb,
  proof_json jsonb not null default '[]'::jsonb,
  summary text,
  branding_json jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.client_moments is
  'Published Delivery Pulse snapshots for white-label Client Moment share links.';

create index if not exists client_moments_token_idx on public.client_moments (token);
create index if not exists client_moments_client_idx on public.client_moments (agency_client_id, created_at desc);

alter table public.client_moments enable row level security;

-- Workspace members can manage moments for their clients; public reads go through service API.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_moments'
      and policyname = 'client_moments_workspace_member'
  ) then
    create policy client_moments_workspace_member
      on public.client_moments
      for all
      using (is_workspace_member(workspace_id))
      with check (is_workspace_member(workspace_id));
  end if;
end $$;

grant select, insert, update, delete on public.client_moments to authenticated;
grant select, insert, update, delete on public.client_moments to service_role;
