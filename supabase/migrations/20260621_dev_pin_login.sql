-- Dev panel PIN login — username + PIN on profiles, verified via RPC.
-- Used by /dev/login and /api/dev/session (service role only).

alter table public.profiles
  add column if not exists dev_username text,
  add column if not exists dev_pin text;

create unique index if not exists idx_profiles_dev_username_lower
  on public.profiles (lower(dev_username))
  where dev_username is not null;

create or replace function public.verify_dev_pin(username_input text, pin_input text)
returns table(user_id uuid, user_email text, user_role text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    p.id,
    coalesce(p.email, '')::text,
    coalesce(p.role, 'dev')::text
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
