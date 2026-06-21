-- Festag: Dev-Panel Zugang für „stefan“ (einmalig im Supabase SQL Editor ausführen)
-- Dashboard: https://supabase.com/dashboard/project/xsdkoepwuvpuroijjain/sql/new
--
-- Danach: https://festag.app/dev/login
--   Benutzername: stefan
--   PIN:          642021

-- Schritt 1 — Spalten + Login-RPC (falls Migration noch nicht gepusht)
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

-- Schritt 2 — Zugang für stefan
do $$
declare
  v_id uuid;
  v_pin text := '642021';
begin
  select id into v_id
  from public.profiles
  where lower(dev_username) = 'stefan'
  limit 1;

  if v_id is null then
    select id into v_id
    from public.profiles
    where lower(coalesce(first_name, '')) = 'stefan'
       or lower(coalesce(full_name, '')) like 'stefan%'
       or lower(split_part(coalesce(email, ''), '@', 1)) = 'stefan'
    order by created_at desc nulls last
    limit 1;
  end if;

  if v_id is not null then
    update public.profiles set
      role = case when role in ('admin', 'project_owner') then role else 'admin' end,
      approval_status = 'approved',
      access_mode = coalesce(access_mode, 'pool'),
      dev_username = 'stefan',
      dev_pin = v_pin,
      onboarding_completed = true
    where id = v_id;
  else
    v_id := gen_random_uuid();
    insert into public.profiles (
      id, email, full_name, first_name, role, approval_status, access_mode,
      dev_username, dev_pin, onboarding_completed
    ) values (
      v_id, 'stefan@festag.dev', 'Stefan', 'Stefan', 'admin', 'approved', 'pool',
      'stefan', v_pin, true
    );
  end if;

  raise notice 'Dev login ready — username: stefan  pin: %  user_id: %', v_pin, v_id;
end $$;
