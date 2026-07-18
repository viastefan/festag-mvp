-- Additive indexes for auth / workspace name-check / bootstrap hot paths.
-- No destructive changes, no data deletion.

-- Invite-PIN recovery (session / register / resend-pin) filters setup accounts by pin.
create index if not exists idx_profiles_dev_pin_setup
  on public.profiles (dev_pin)
  where coalesce(dev_pin_setup_required, false) = true
    and dev_pin is not null;

-- Bootstrap looks up personal workspace by owner.
create index if not exists idx_workspaces_owner_personal
  on public.workspaces (primary_owner_id)
  where is_personal = true;

-- Case-insensitive name probes in checkWorkspaceNameAvailability (ilike without wildcards).
-- Non-unique: historical case variants may exist; app + slug uniqueness still gate claims.
create index if not exists idx_workspaces_name_lower
  on public.workspaces (lower(trim(name)));
