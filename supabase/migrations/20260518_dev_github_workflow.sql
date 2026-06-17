-- Festag — DEV portal GitHub workflow
--
-- Adds the join between Veyra's task layer and GitHub activity, plus a
-- lightweight work-session table so a developer can:
--   1. link a commit / PR to a task they were working on
--   2. start / stop a timed work session against a task
--   3. expose the same data back as "recent activity" on the overview
--
-- Additive + idempotent — replays cleanly against an existing schema.

-- ── github_commits: link to a task ─────────────────────────────
alter table github_commits add column if not exists task_id uuid references tasks(id) on delete set null;
alter table github_commits add column if not exists linked_by uuid references auth.users(id) on delete set null;
alter table github_commits add column if not exists linked_at timestamptz;
alter table github_commits add column if not exists branch_name text;

create index if not exists idx_gh_commits_task on github_commits(task_id) where task_id is not null;
create index if not exists idx_gh_commits_repo_committed_at on github_commits(repo_id, committed_at desc);

-- ── github_pull_requests: link to a task ───────────────────────
alter table github_pull_requests add column if not exists task_id uuid references tasks(id) on delete set null;
alter table github_pull_requests add column if not exists linked_by uuid references auth.users(id) on delete set null;
alter table github_pull_requests add column if not exists linked_at timestamptz;
alter table github_pull_requests add column if not exists head_branch text;
alter table github_pull_requests add column if not exists base_branch text;

create index if not exists idx_gh_prs_task on github_pull_requests(task_id) where task_id is not null;
create index if not exists idx_gh_prs_repo_updated on github_pull_requests(repo_id, updated_at_github desc);

-- ── github_repositories: sync bookkeeping ──────────────────────
alter table github_repositories add column if not exists last_synced_at timestamptz;
alter table github_repositories add column if not exists last_sync_status text;
alter table github_repositories add column if not exists last_sync_error text;
alter table github_repositories add column if not exists installation_id bigint;

-- ── tasks: light workflow fields ───────────────────────────────
alter table tasks add column if not exists branch_name text;
alter table tasks add column if not exists last_dev_action_at timestamptz;
alter table tasks add column if not exists last_status_change_by uuid references auth.users(id) on delete set null;

create index if not exists idx_tasks_branch_name on tasks(branch_name) where branch_name is not null;
create index if not exists idx_tasks_last_dev_action on tasks(last_dev_action_at desc) where last_dev_action_at is not null;

-- ── dev_work_sessions ──────────────────────────────────────────
create table if not exists dev_work_sessions (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  note text,
  source text not null default 'manual',     -- manual | github | tagro
  created_at timestamptz not null default now()
);
create index if not exists idx_dev_sessions_dev_open
  on dev_work_sessions(developer_id) where ended_at is null;
create index if not exists idx_dev_sessions_task
  on dev_work_sessions(task_id, started_at desc) where task_id is not null;

alter table dev_work_sessions enable row level security;
drop policy if exists dws_read on dev_work_sessions;
create policy dws_read on dev_work_sessions for select
  using (
    auth.uid() = developer_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );
drop policy if exists dws_write on dev_work_sessions;
create policy dws_write on dev_work_sessions for all
  using (auth.uid() = developer_id)
  with check (auth.uid() = developer_id);

-- ── helper: only one open session per developer ────────────────
create or replace function ensure_single_open_dev_session()
returns trigger
language plpgsql
as $$
begin
  if new.ended_at is null then
    update dev_work_sessions
       set ended_at = now(),
           duration_seconds = greatest(0, extract(epoch from now() - started_at)::int)
     where developer_id = new.developer_id
       and id <> new.id
       and ended_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_single_open_dev_session on dev_work_sessions;
create trigger trg_single_open_dev_session
before insert on dev_work_sessions
for each row execute function ensure_single_open_dev_session();

-- ── tasks: write policy for assigned developers ────────────────
-- Lets a developer flip their own task's status / branch / dev_status without
-- needing admin rights. We keep RLS conservative: only assigned devs or
-- workspace owners / admins may update.
do $$ begin
  create policy tasks_dev_update on tasks for update
    using (
      assigned_to = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
      or exists (
        select 1 from project_assignments pa
         where pa.project_id = tasks.project_id and pa.user_id = auth.uid() and pa.active
      )
    )
    with check (
      assigned_to = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
      or exists (
        select 1 from project_assignments pa
         where pa.project_id = tasks.project_id and pa.user_id = auth.uid() and pa.active
      )
    );
exception when duplicate_object then null; end $$;

-- ── github_repositories: write-back for sync metadata ──────────
-- The sync routine runs as the developer; allow the developer (and admins)
-- to update sync bookkeeping fields on their own repos.
drop policy if exists gh_repos_update_sync on github_repositories;
create policy gh_repos_update_sync on github_repositories for update
  using (
    auth.uid() = developer_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  )
  with check (
    auth.uid() = developer_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );

-- ── github_commits / pull_requests: insert + update from API routes ─
-- The sync API uses an authenticated user context (NOT service role) so we
-- need permissive write policies for the rows that already pass the read
-- predicate.
drop policy if exists gh_commits_dev_write on github_commits;
create policy gh_commits_dev_write on github_commits for all
  using (
    exists (
      select 1 from github_repositories r
       where r.id = github_commits.repo_id
         and (
           r.developer_id = auth.uid()
           or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','project_owner'))
         )
    )
  )
  with check (
    exists (
      select 1 from github_repositories r
       where r.id = github_commits.repo_id
         and (
           r.developer_id = auth.uid()
           or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','project_owner'))
         )
    )
  );

drop policy if exists gh_prs_dev_write on github_pull_requests;
create policy gh_prs_dev_write on github_pull_requests for all
  using (
    exists (
      select 1 from github_repositories r
       where r.id = github_pull_requests.repo_id
         and (
           r.developer_id = auth.uid()
           or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','project_owner'))
         )
    )
  )
  with check (
    exists (
      select 1 from github_repositories r
       where r.id = github_pull_requests.repo_id
         and (
           r.developer_id = auth.uid()
           or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','project_owner'))
         )
    )
  );

-- ── github_connections: developer manages own row ──────────────
drop policy if exists gh_conn_write on github_connections;
create policy gh_conn_write on github_connections for all
  using (auth.uid() = developer_id)
  with check (auth.uid() = developer_id);
