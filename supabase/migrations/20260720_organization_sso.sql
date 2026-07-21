-- Enterprise SSO registry + login attempt audit (Supabase SAML + Festag domain map)

do $$ begin
  create type sso_provider_status as enum ('pending', 'active', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sso_login_outcome as enum ('started', 'success', 'failed', 'domain_unknown');
exception when duplicate_object then null; end $$;

create table if not exists public.organization_sso_providers (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  domain_norm text generated always as (lower(trim(domain))) stored,
  supabase_provider_id text,
  workspace_id uuid references public.workspaces(id) on delete set null,
  display_name text not null default '',
  default_member_role public.workspace_member_role not null default 'member',
  status public.sso_provider_status not null default 'pending',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organization_sso_providers is
  'Maps email domains to Supabase SAML providers and optional Festag workspaces for JIT join.';

create unique index if not exists organization_sso_providers_domain_uidx
  on public.organization_sso_providers (domain_norm);

create index if not exists organization_sso_providers_active_idx
  on public.organization_sso_providers (domain_norm)
  where status = 'active';

create table if not exists public.sso_login_attempts (
  id uuid primary key default gen_random_uuid(),
  domain text,
  domain_norm text generated always as (lower(trim(coalesce(domain, '')))) stored,
  email_hint text,
  user_id uuid references auth.users(id) on delete set null,
  provider_id uuid references public.organization_sso_providers(id) on delete set null,
  outcome public.sso_login_outcome not null default 'started',
  error_message text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.sso_login_attempts is
  'Audit trail for SSO start/success/failure — support and security review.';

create index if not exists sso_login_attempts_domain_created_idx
  on public.sso_login_attempts (domain_norm, created_at desc);

create index if not exists sso_login_attempts_user_created_idx
  on public.sso_login_attempts (user_id, created_at desc)
  where user_id is not null;

alter table public.organization_sso_providers enable row level security;
alter table public.sso_login_attempts enable row level security;

drop policy if exists organization_sso_providers_service_all on public.organization_sso_providers;
create policy organization_sso_providers_service_all
  on public.organization_sso_providers
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists organization_sso_providers_admin_read on public.organization_sso_providers;
create policy organization_sso_providers_admin_read
  on public.organization_sso_providers
  for select
  using (
    exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.role = 'admin'
    )
  );

drop policy if exists sso_login_attempts_service_all on public.sso_login_attempts;
create policy sso_login_attempts_service_all
  on public.sso_login_attempts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists sso_login_attempts_admin_read on public.sso_login_attempts;
create policy sso_login_attempts_admin_read
  on public.sso_login_attempts
  for select
  using (
    exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.role = 'admin'
    )
  );

grant select, insert, update, delete on public.organization_sso_providers to service_role;
grant select, insert, update on public.sso_login_attempts to service_role;
