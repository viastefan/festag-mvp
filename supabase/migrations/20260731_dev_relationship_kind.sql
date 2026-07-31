-- Dev relationship on invites + membership (Adaptive Execution posture).
-- Rule A: invite carries how the developer relates to the client workspace.
-- Cold-start fallback lives on profiles.dev_relationship until an invite lands.

alter table public.developer_invites
  add column if not exists relationship_kind text not null default 'freelancer'
    check (relationship_kind in (
      'festag_internal',
      'agency_member',
      'freelancer',
      'client_company_dev'
    ));

alter table public.developer_invites
  add column if not exists workspace_mode text
    check (workspace_mode is null or workspace_mode in ('delivery', 'team', 'agency'));

alter table public.workspace_members
  add column if not exists relationship_kind text
    check (relationship_kind is null or relationship_kind in (
      'festag_internal',
      'agency_member',
      'freelancer',
      'client_company_dev'
    ));

alter table public.profiles
  add column if not exists dev_relationship text
    check (dev_relationship is null or dev_relationship in (
      'festag_internal',
      'agency_member',
      'freelancer',
      'client_company_dev'
    ));

comment on column public.developer_invites.relationship_kind is
  'How the invitee relates to this workspace — drives Execution Panel modules.';
comment on column public.developer_invites.workspace_mode is
  'Snapshot of workspaces.mode at invite time.';
comment on column public.workspace_members.relationship_kind is
  'Copied from invite on accept; SSOT for per-membership posture.';
comment on column public.profiles.dev_relationship is
  'Cold-start / home posture when no invite membership yet; invite overrides.';
