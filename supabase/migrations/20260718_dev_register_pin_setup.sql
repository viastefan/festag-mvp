-- Dev first-time register: workspace name + one-time invite PIN → personal PIN.
-- Invite PIN lives in profiles.dev_pin until setup is completed (dev_pin_setup_required).

alter table public.profiles
  add column if not exists dev_workspace_name text,
  add column if not exists dev_pin_setup_required boolean not null default false;

create unique index if not exists idx_profiles_dev_workspace_name_lower
  on public.profiles (lower(trim(dev_workspace_name)))
  where dev_workspace_name is not null and trim(dev_workspace_name) <> '';

-- Return setup + display fields with PIN verify (service role only).
create or replace function public.verify_dev_pin(username_input text, pin_input text)
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
begin
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
  where lower(trim(p.dev_username)) = lower(trim(username_input))
    and p.dev_pin = trim(pin_input)
    and p.role in ('dev', 'admin', 'project_owner')
    and coalesce(p.approval_status, 'approved') = 'approved'
  limit 1;
end;
$$;

revoke all on function public.verify_dev_pin(text, text) from public;
grant execute on function public.verify_dev_pin(text, text) to service_role;
