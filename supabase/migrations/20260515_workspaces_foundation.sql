-- Festag — Workspace foundation
--
-- Introduces the multi-workspace model. A user can belong to several
-- workspaces with different roles. Every workspace has exactly one
-- Primary Operating Mode: delivery (default), team, or agency. Mode
-- drives Sidebar, Dashboard, Roles, Billing, available Features.
--
-- This migration is purely additive + idempotent:
--   • new tables `workspaces`, `workspace_members`
--   • new enums `workspace_mode`, `workspace_member_role`
--   • SECURITY DEFINER helper `is_workspace_member` to keep RLS recursion-safe
--   • backfill: every existing auth.users row gets a personal Delivery
--     workspace; existing projects get linked via `projects.workspace_id`
--   • old `user_id` columns are NOT removed — queries that still go by
--     user keep working unchanged
--
-- Mode-specific role subsets, billing wiring, sidebar/dashboard adaptation
-- and the onboarding "wie willst du Festag nutzen?" question land in
-- follow-up migrations once this foundation is in place.

-- ── ENUMS ───────────────────────────────────────────────────────
do $$ begin
  create type workspace_mode as enum ('delivery','team','agency');
exception when duplicate_object then null; end $$;

do $$ begin
  create type workspace_member_role as enum (
    -- shared across modes
    'owner','admin','approver','finance','member','viewer',
    -- team workspace specifics
    'project_manager','developer','reviewer',
    -- agency workspace specifics
    'agency_owner','agency_admin','white_label_manager',
    -- delivery workspace specifics (client side)
    'client_owner','client_approver','client_viewer',
    -- internal Festag side (for delivery workspaces)
    'festag_project_owner','festag_developer'
  );
exception when duplicate_object then null; end $$;

-- ── TABLES ──────────────────────────────────────────────────────
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  mode workspace_mode not null default 'delivery',
  primary_owner_id uuid not null references auth.users(id) on delete cascade,
  is_personal boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role workspace_member_role not null default 'member',
  invited_email text,
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists idx_workspace_members_user on workspace_members(user_id);
create index if not exists idx_workspaces_primary_owner on workspaces(primary_owner_id);

-- ── HELPER (recursion-safe RLS) ─────────────────────────────────
create or replace function is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from workspace_members
     where workspace_id = p_workspace_id
       and user_id = auth.uid()
  );
$$;

grant execute on function is_workspace_member(uuid) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────
alter table workspaces enable row level security;
alter table workspace_members enable row level security;

drop policy if exists workspaces_member_read on workspaces;
create policy workspaces_member_read on workspaces for select
  using (primary_owner_id = auth.uid() or is_workspace_member(id));

drop policy if exists workspaces_owner_update on workspaces;
create policy workspaces_owner_update on workspaces for update
  using (primary_owner_id = auth.uid())
  with check (primary_owner_id = auth.uid());

drop policy if exists workspaces_owner_insert on workspaces;
create policy workspaces_owner_insert on workspaces for insert
  with check (primary_owner_id = auth.uid());

drop policy if exists workspace_members_member_read on workspace_members;
create policy workspace_members_member_read on workspace_members for select
  using (user_id = auth.uid() or is_workspace_member(workspace_id));

drop policy if exists workspace_members_owner_write on workspace_members;
create policy workspace_members_owner_write on workspace_members for all
  using (
    exists (
      select 1 from workspaces w
       where w.id = workspace_members.workspace_id
         and w.primary_owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workspaces w
       where w.id = workspace_members.workspace_id
         and w.primary_owner_id = auth.uid()
    )
  );

-- ── PROJECTS link ───────────────────────────────────────────────
alter table projects add column if not exists workspace_id uuid references workspaces(id) on delete set null;
create index if not exists idx_projects_workspace on projects(workspace_id);

-- ── BACKFILL ────────────────────────────────────────────────────
-- 1) one personal Delivery workspace per existing user
insert into workspaces (name, mode, primary_owner_id, is_personal)
select
  coalesce(nullif(p.full_name, ''), nullif(split_part(u.email, '@', 1), ''), 'Mein Workspace') || ' Workspace',
  'delivery'::workspace_mode,
  u.id,
  true
  from auth.users u
  left join profiles p on p.id = u.id
 where not exists (
   select 1 from workspaces w
    where w.primary_owner_id = u.id and w.is_personal = true
 );

-- 2) make the owner the workspace owner-member
insert into workspace_members (workspace_id, user_id, role)
select w.id, w.primary_owner_id, 'owner'::workspace_member_role
  from workspaces w
 where w.is_personal = true
   and not exists (
     select 1 from workspace_members wm
      where wm.workspace_id = w.id and wm.user_id = w.primary_owner_id
   );

-- 3) link existing projects to the owner's personal workspace
update projects p
   set workspace_id = w.id
  from workspaces w
 where w.primary_owner_id = p.user_id
   and w.is_personal = true
   and p.workspace_id is null;

-- ── updated_at trigger ──────────────────────────────────────────
create or replace function touch_workspace_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_workspaces_updated_at on workspaces;
create trigger trg_workspaces_updated_at
before update on workspaces
for each row execute function touch_workspace_updated_at();
