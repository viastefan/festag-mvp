-- Festag — profile settings autosave + language preference
--
-- Settings reads and writes these columns directly from the client. Keep this
-- migration idempotent so older environments can be brought up to date without
-- breaking already-provisioned Supabase projects.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists position text,
  add column if not exists phone text,
  add column if not exists bio text,
  add column if not exists linkedin_url text,
  add column if not exists timezone text default 'Europe/Berlin',
  add column if not exists language_pref text default 'de',
  add column if not exists theme_pref text default 'read',
  add column if not exists avatar_color text,
  add column if not exists notif_email boolean default true,
  add column if not exists notif_push boolean default false,
  add column if not exists company_name text,
  add column if not exists company_desc text,
  add column if not exists company_industry text,
  add column if not exists company_size text,
  add column if not exists company_website text,
  add column if not exists legal_form text,
  add column if not exists vat_number text,
  add column if not exists tax_number text,
  add column if not exists company_address text,
  add column if not exists company_city text,
  add column if not exists company_zip text,
  add column if not exists company_country text default 'Deutschland';

update public.profiles
   set language_pref = 'de'
 where language_pref is not null
   and language_pref not in ('de', 'en');

do $$
begin
  alter table public.profiles
    add constraint profiles_language_pref_check
    check (language_pref in ('de', 'en'));
exception
  when duplicate_object then null;
end $$;

update public.profiles
   set first_name = nullif(split_part(trim(full_name), ' ', 1), '')
 where first_name is null
   and nullif(trim(coalesce(full_name, '')), '') is not null;
