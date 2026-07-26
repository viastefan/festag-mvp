-- Durable once-per-identity flag for Zugang wiederfinden support contact.
-- Unresolved rows block another recovery support send for the same email
-- (and optionally the same device key). Password/PIN reset paths stay open.

create table if not exists public.auth_recovery_support (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_norm text generated always as (lower(trim(email))) stored,
  device_key text,
  page text,
  message text,
  user_id uuid references auth.users(id) on delete set null,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

comment on table public.auth_recovery_support is
  'Recovery support contact ledger — one open request per email until resolved.';

create unique index if not exists auth_recovery_support_open_email_uidx
  on public.auth_recovery_support (email_norm)
  where resolved = false;

create index if not exists auth_recovery_support_device_open_idx
  on public.auth_recovery_support (device_key)
  where resolved = false and device_key is not null;

create index if not exists auth_recovery_support_created_idx
  on public.auth_recovery_support (created_at desc);

alter table public.auth_recovery_support enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'auth_recovery_support'
      and policyname = 'auth_recovery_support_service_all'
  ) then
    create policy auth_recovery_support_service_all
      on public.auth_recovery_support
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

grant select, insert, update on public.auth_recovery_support to service_role;
