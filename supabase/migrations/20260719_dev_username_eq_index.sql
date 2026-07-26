-- Hot path for PostgREST .eq('dev_username', …) on Dev login checks.
-- Complements idx_profiles_dev_username_lower (expression index for lower()).
-- Idempotent: already present on production when applied earlier.

create unique index if not exists idx_profiles_dev_username
  on public.profiles (dev_username)
  where dev_username is not null;
