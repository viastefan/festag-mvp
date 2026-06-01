-- Client invites (kind='client', "Kunde einladen") set role='client', but the
-- legacy role check only allowed dev/admin, so creating a client share link
-- failed with a check-constraint violation. Allow 'client' as a valid role.
alter table team_invites drop constraint if exists team_invites_role_check;
alter table team_invites add constraint team_invites_role_check
  check (role = any (array['dev'::text, 'admin'::text, 'client'::text]));
