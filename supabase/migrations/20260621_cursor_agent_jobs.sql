-- Cursor Cloud Agent jobs — Tagro task → Cursor execution bridge.
-- Queued by devs from /dev/tasks; dispatched via /api/cursor/* and cron poll.

create table if not exists cursor_agent_jobs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'dispatching', 'running', 'finished', 'error', 'cancelled')),
  prompt_text text not null,
  repo_url text,
  repo_ref text default 'main',
  auto_create_pr boolean not null default true,
  cursor_agent_id text,
  cursor_run_id text,
  cursor_agent_url text,
  pr_url text,
  branch_name text,
  result_summary text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dispatched_at timestamptz,
  finished_at timestamptz
);

create index if not exists idx_cursor_jobs_task on cursor_agent_jobs(task_id, created_at desc);
create index if not exists idx_cursor_jobs_status on cursor_agent_jobs(status) where status in ('queued', 'running');

alter table cursor_agent_jobs enable row level security;

drop policy if exists cursor_jobs_select on cursor_agent_jobs;
create policy cursor_jobs_select on cursor_agent_jobs for select
  using (
    exists (
      select 1 from project_assignments pa
      where pa.project_id = cursor_agent_jobs.project_id
        and pa.user_id = auth.uid()
        and pa.active = true
    )
    or exists (
      select 1 from projects p
      where p.id = cursor_agent_jobs.project_id
        and (p.user_id = auth.uid() or p.assigned_dev = auth.uid())
    )
  );

drop policy if exists cursor_jobs_insert on cursor_agent_jobs;
create policy cursor_jobs_insert on cursor_agent_jobs for insert
  with check (
    requested_by = auth.uid()
    and (
      exists (
        select 1 from project_assignments pa
        where pa.project_id = cursor_agent_jobs.project_id
          and pa.user_id = auth.uid()
          and pa.active = true
      )
      or exists (
        select 1 from projects p
        where p.id = cursor_agent_jobs.project_id
          and (p.user_id = auth.uid() or p.assigned_dev = auth.uid())
      )
    )
  );

drop policy if exists cursor_jobs_update on cursor_agent_jobs;
create policy cursor_jobs_update on cursor_agent_jobs for update
  using (
    exists (
      select 1 from project_assignments pa
      where pa.project_id = cursor_agent_jobs.project_id
        and pa.user_id = auth.uid()
        and pa.active = true
    )
    or exists (
      select 1 from projects p
      where p.id = cursor_agent_jobs.project_id
        and (p.user_id = auth.uid() or p.assigned_dev = auth.uid())
    )
  );
