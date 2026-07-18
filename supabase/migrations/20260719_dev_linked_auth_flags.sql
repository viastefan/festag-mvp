-- Linked OAuth providers for conditional Dev login buttons + setup columns if missing.

alter table public.profiles
  add column if not exists dev_workspace_name text,
  add column if not exists dev_pin_setup_required boolean not null default false,
  add column if not exists dev_google_linked boolean not null default false,
  add column if not exists dev_github_linked boolean not null default false,
  add column if not exists dev_apple_linked boolean not null default false;

create unique index if not exists idx_profiles_dev_workspace_name_lower
  on public.profiles (lower(trim(dev_workspace_name)))
  where dev_workspace_name is not null and trim(dev_workspace_name) <> '';
