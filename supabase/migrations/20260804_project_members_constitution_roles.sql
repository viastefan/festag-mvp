-- Expand project_members.role to constitution ProjectRole + legacy aliases.
alter table public.project_members drop constraint if exists project_members_role_check;
alter table public.project_members add constraint project_members_role_check
  check (role = any (array[
    'project_owner'::text,
    'admin'::text,
    'member'::text,
    'client'::text,
    'developer'::text,
    'designer'::text,
    'viewer'::text,
    'dev'::text,
    'lead'::text
  ]));
