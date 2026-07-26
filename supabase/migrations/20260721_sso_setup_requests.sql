-- SSO setup requests (customer asks Festag to enable SAML) + enforce_sso flag

alter table public.organization_sso_providers
  add column if not exists enforce_sso boolean not null default false;

comment on column public.organization_sso_providers.enforce_sso is
  'When true, login UI nudges / prefers Firmen-SSO for this domain over Magic-Link/Google.';

do $$ begin
  create type sso_setup_request_status as enum ('open', 'in_progress', 'done', 'declined');
exception when duplicate_object then null; end $$;

create table if not exists public.sso_setup_requests (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  domain_norm text generated always as (lower(trim(domain))) stored,
  workspace_id uuid references public.workspaces(id) on delete set null,
  workspace_name text,
  requested_by uuid references auth.users(id) on delete set null,
  contact_email text,
  idp_hint text,
  notes text,
  status public.sso_setup_request_status not null default 'open',
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sso_setup_requests is
  'Enterprise SSO setup requests from workspace owners — Festag ops freischaltet manuell.';

create unique index if not exists sso_setup_requests_open_domain_uidx
  on public.sso_setup_requests (domain_norm)
  where status in ('open', 'in_progress');

create index if not exists sso_setup_requests_status_created_idx
  on public.sso_setup_requests (status, created_at desc);

alter table public.sso_setup_requests enable row level security;

drop policy if exists sso_setup_requests_service_all on public.sso_setup_requests;
create policy sso_setup_requests_service_all
  on public.sso_setup_requests
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists sso_setup_requests_admin_read on public.sso_setup_requests;
create policy sso_setup_requests_admin_read
  on public.sso_setup_requests
  for select
  using (
    exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.role = 'admin'
    )
  );

drop policy if exists sso_setup_requests_requester_read on public.sso_setup_requests;
create policy sso_setup_requests_requester_read
  on public.sso_setup_requests
  for select
  using (requested_by = auth.uid());

grant select, insert, update on public.sso_setup_requests to service_role;
