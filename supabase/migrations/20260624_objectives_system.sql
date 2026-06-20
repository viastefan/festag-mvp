-- Objectives system — OKR-style goals linked to projects and tasks.
-- Tagro uses objectives to answer "why is work happening?" across the org.

create table if not exists objectives (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete set null,
  title text not null,
  description text,
  target_date date,
  status text not null default 'active'
    check (status in ('active', 'completed', 'paused', 'cancelled')),
  progress_pct integer not null default 0
    check (progress_pct >= 0 and progress_pct <= 100),
  owner uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_objectives_project on objectives(project_id, status);
create index if not exists idx_objectives_target on objectives(target_date) where status = 'active';

create table if not exists objective_task_links (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references objectives(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (objective_id, task_id)
);

create index if not exists idx_objective_task_links_task on objective_task_links(task_id);

create or replace function touch_objectives_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_objectives_updated_at on objectives;
create trigger trg_objectives_updated_at
before update on objectives
for each row execute function touch_objectives_updated_at();

alter table objectives enable row level security;
alter table objective_task_links enable row level security;

drop policy if exists objectives_project_read on objectives;
create policy objectives_project_read on objectives
  for select using (can_access_decision_project(project_id));

drop policy if exists objectives_project_insert on objectives;
create policy objectives_project_insert on objectives
  for insert with check (can_access_decision_project(project_id));

drop policy if exists objectives_project_update on objectives;
create policy objectives_project_update on objectives
  for update
  using (can_access_decision_project(project_id))
  with check (can_access_decision_project(project_id));

drop policy if exists objectives_project_delete on objectives;
create policy objectives_project_delete on objectives
  for delete using (can_access_decision_project(project_id));

drop policy if exists objective_task_links_read on objective_task_links;
create policy objective_task_links_read on objective_task_links
  for select using (
    exists (
      select 1 from objectives o
      where o.id = objective_task_links.objective_id
        and can_access_decision_project(o.project_id)
    )
  );

drop policy if exists objective_task_links_insert on objective_task_links;
create policy objective_task_links_insert on objective_task_links
  for insert with check (
    exists (
      select 1 from objectives o
      where o.id = objective_task_links.objective_id
        and can_access_decision_project(o.project_id)
    )
  );

drop policy if exists objective_task_links_delete on objective_task_links;
create policy objective_task_links_delete on objective_task_links
  for delete using (
    exists (
      select 1 from objectives o
      where o.id = objective_task_links.objective_id
        and can_access_decision_project(o.project_id)
    )
  );
