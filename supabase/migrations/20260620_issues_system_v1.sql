-- Festag — Issue Management System v1
--
-- First-class issues entity (distinct from tasks). Supports manual creation
-- now; connector imports (GitHub, Jira, Linear) attach via source/source_id.
--
-- Companion table issue_task_links connects issues to Festag tasks.

-- ── 1. issues ────────────────────────────────────────────────────────────────
create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete set null,

  title text not null,
  description text,

  -- bug | feature | improvement | security | technical_debt | blocker
  issue_type text not null default 'bug',
  -- critical | high | medium | low
  severity text not null default 'medium',
  -- open | in_progress | resolved | closed | wont_fix
  status text not null default 'open',

  impact text,

  owner uuid references auth.users(id) on delete set null,
  reporter uuid references auth.users(id) on delete set null,

  -- manual | github | jira | linear | clickup | ai
  source text not null default 'manual',
  source_id text,
  source_url text,

  labels text[] not null default '{}'::text[],

  tagro_summary text,
  tagro_confidence numeric(3,2)
    check (tagro_confidence is null or (tagro_confidence >= 0 and tagro_confidence <= 1)),

  created_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint issues_type_check check (issue_type in (
    'bug', 'feature', 'improvement', 'security', 'technical_debt', 'blocker'
  )),
  constraint issues_severity_check check (severity in (
    'critical', 'high', 'medium', 'low'
  )),
  constraint issues_status_check check (status in (
    'open', 'in_progress', 'resolved', 'closed', 'wont_fix'
  )),
  constraint issues_source_check check (source in (
    'manual', 'github', 'jira', 'linear', 'clickup', 'ai'
  ))
);

create index if not exists idx_issues_project_status on issues(project_id, status);
create index if not exists idx_issues_project_severity on issues(project_id, severity);
create index if not exists idx_issues_project_type on issues(project_id, issue_type);
create index if not exists idx_issues_owner on issues(owner) where owner is not null;
create index if not exists idx_issues_source on issues(source, source_id) where source_id is not null;
create unique index if not exists ux_issues_project_source
  on issues(project_id, source, source_id)
  where source_id is not null;


-- ── 2. issue_task_links ──────────────────────────────────────────────────────
create table if not exists issue_task_links (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  -- blocks | related | duplicates | caused_by
  link_kind text not null default 'related',
  created_at timestamptz not null default now(),

  constraint issue_task_links_kind_check check (link_kind in (
    'blocks', 'related', 'duplicates', 'caused_by'
  ))
);

create unique index if not exists ux_issue_task_links_pair
  on issue_task_links(issue_id, task_id);
create index if not exists idx_issue_task_links_task on issue_task_links(task_id);


-- ── 3. updated_at trigger ──────────────────────────────────────────────────
create or replace function touch_issues_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_issues_updated_at on issues;
create trigger trg_issues_updated_at
before update on issues
for each row execute function touch_issues_updated_at();


-- ── 4. RLS ───────────────────────────────────────────────────────────────────
alter table issues enable row level security;
alter table issue_task_links enable row level security;

drop policy if exists issues_project_read on issues;
create policy issues_project_read on issues
  for select
  using (can_access_decision_project(project_id));

drop policy if exists issues_project_insert on issues;
create policy issues_project_insert on issues
  for insert
  with check (can_access_decision_project(project_id));

drop policy if exists issues_project_update on issues;
create policy issues_project_update on issues
  for update
  using (can_access_decision_project(project_id))
  with check (can_access_decision_project(project_id));

drop policy if exists issues_project_delete on issues;
create policy issues_project_delete on issues
  for delete
  using (can_access_decision_project(project_id));

drop policy if exists issue_task_links_read on issue_task_links;
create policy issue_task_links_read on issue_task_links
  for select
  using (
    exists (
      select 1 from issues i
      where i.id = issue_task_links.issue_id
        and can_access_decision_project(i.project_id)
    )
  );

drop policy if exists issue_task_links_insert on issue_task_links;
create policy issue_task_links_insert on issue_task_links
  for insert
  with check (
    exists (
      select 1 from issues i
      where i.id = issue_task_links.issue_id
        and can_access_decision_project(i.project_id)
    )
  );

drop policy if exists issue_task_links_delete on issue_task_links;
create policy issue_task_links_delete on issue_task_links
  for delete
  using (
    exists (
      select 1 from issues i
      where i.id = issue_task_links.issue_id
        and can_access_decision_project(i.project_id)
    )
  );


-- ── 5. Realtime ──────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table issues;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
