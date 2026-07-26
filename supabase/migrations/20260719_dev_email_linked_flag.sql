-- Email as a linkable Dev login method (alongside Google / Apple / GitHub).

alter table public.profiles
  add column if not exists dev_email_linked boolean not null default false;

-- Invited / provisioned Devs already have an email on the profile — treat as linked.
update public.profiles
set dev_email_linked = true
where email is not null
  and trim(email) <> ''
  and coalesce(dev_email_linked, false) = false
  and role in ('dev', 'admin', 'project_owner', 'pending_developer');
