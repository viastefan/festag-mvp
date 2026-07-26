-- Dev auth hardening (additive data; replace RPC signature safely).
-- Extends setup flags, unique indexes, verify_dev_pin, and optional lockout log.

alter table public.profiles
  add column if not exists dev_workspace_name text,
  add column if not exists dev_pin_setup_required boolean not null default false,
  add column if not exists dev_google_linked boolean not null default false,
  add column if not exists dev_github_linked boolean not null default false,
  add column if not exists dev_apple_linked boolean not null default false;

create unique index if not exists idx_profiles_dev_username_lower
  on public.profiles (lower(dev_username))
  where dev_username is not null;

create unique index if not exists idx_profiles_dev_workspace_name_lower
  on public.profiles (lower(trim(dev_workspace_name)))
  where dev_workspace_name is not null and trim(dev_workspace_name) <> '';

-- Soft: app layer requires 6-digit PINs going forward. Existing short PINs still
-- verify via RPC (4–6) until rotated via the invite flow.

drop function if exists public.verify_dev_pin(text, text);

create function public.verify_dev_pin(username_input text, pin_input text)
returns table(
  user_id uuid,
  user_email text,
  user_role text,
  setup_required boolean,
  workspace_name text,
  user_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := lower(trim(coalesce(username_input, '')));
  v_pin  text := trim(coalesce(pin_input, ''));
begin
  if length(v_user) < 2 or length(v_user) > 32 then
    return;
  end if;
  if length(v_pin) < 4 or length(v_pin) > 6 then
    return;
  end if;

  return query
  select
    p.id,
    coalesce(p.email, '')::text,
    coalesce(p.role, 'dev')::text,
    coalesce(p.dev_pin_setup_required, false),
    nullif(trim(coalesce(p.dev_workspace_name, '')), '')::text,
    coalesce(
      nullif(trim(coalesce(p.dev_workspace_name, '')), ''),
      nullif(trim(coalesce(p.full_name, '')), ''),
      nullif(trim(coalesce(p.dev_username, '')), ''),
      'Developer'
    )::text
  from public.profiles p
  where lower(trim(p.dev_username)) = v_user
    and p.dev_pin is not null
    and p.dev_pin = v_pin
    and p.role in ('dev', 'admin', 'project_owner')
    and coalesce(p.approval_status, 'approved') = 'approved'
  limit 1;
end;
$$;

revoke all on function public.verify_dev_pin(text, text) from public;
grant execute on function public.verify_dev_pin(text, text) to service_role;

create table if not exists public.auth_attempt_log (
  id bigserial primary key,
  kind text not null,
  subject text not null,
  ip_address text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_attempt_log_created
  on public.auth_attempt_log (created_at desc);

create index if not exists idx_auth_attempt_log_subject_created
  on public.auth_attempt_log (subject, created_at desc);

alter table public.auth_attempt_log enable row level security;

revoke all on public.auth_attempt_log from public, anon, authenticated;
grant select, insert on public.auth_attempt_log to service_role;
grant usage, select on sequence public.auth_attempt_log_id_seq to service_role;
