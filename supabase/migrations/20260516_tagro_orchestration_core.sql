-- Festag — Tagro orchestration core
--
-- Backend foundation for Tagro as the AI orchestration and product-logic
-- layer. This migration is additive and idempotent so it can be applied on
-- the current MVP schema without breaking existing ai_updates/tasks flows.

-- ── Projects ───────────────────────────────────────────────────
alter table projects
  add column if not exists client_id uuid references auth.users(id) on delete set null,
  add column if not exists phase text,
  add column if not exists progress int not null default 0,
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_projects_client on projects(client_id);
create index if not exists idx_projects_active on projects(active);

-- ── Status reports ─────────────────────────────────────────────
create table if not exists status_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  generated_by text not null default 'tagro',
  audience text not null default 'client',
  title text,
  content text not null default '',
  summary text,
  completed_work_json jsonb not null default '[]'::jsonb,
  current_work_json jsonb not null default '[]'::jsonb,
  next_steps_json jsonb not null default '[]'::jsonb,
  blockers_json jsonb not null default '[]'::jsonb,
  risks_json jsonb not null default '[]'::jsonb,
  client_actions_json jsonb not null default '[]'::jsonb,
  dev_followups_json jsonb not null default '[]'::jsonb,
  decisions_needed_json jsonb not null default '[]'::jsonb,
  action_items_json jsonb not null default '[]'::jsonb,
  visible_to_client boolean not null default true,
  approved_by_admin uuid references auth.users(id) on delete set null,
  action_items_processed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_status_reports_project_created on status_reports(project_id, created_at desc);
create index if not exists idx_status_reports_action_items on status_reports(project_id, action_items_processed);

-- ── Decisions ──────────────────────────────────────────────────
create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  source text not null default 'manual',
  source_report_id uuid references status_reports(id) on delete set null,
  source_task_id uuid references tasks(id) on delete set null,
  title text not null,
  description text,
  options_json jsonb not null default '[]'::jsonb,
  recommended_option text,
  impact_summary text,
  status text not null default 'waiting_for_client',
  selected_option text,
  visible_to_client boolean not null default true,
  due_date date,
  created_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_decisions_project_status on decisions(project_id, status);
create index if not exists idx_decisions_report on decisions(source_report_id);
create index if not exists idx_decisions_task on decisions(source_task_id);

-- ── Tasks orchestration fields ─────────────────────────────────
alter table tasks
  add column if not exists parent_task_id uuid references tasks(id) on delete set null,
  add column if not exists source_decision_id uuid references decisions(id) on delete set null,
  add column if not exists source_status_report_id uuid references status_reports(id) on delete set null,
  add column if not exists source_briefing_id uuid,
  add column if not exists origin text,
  add column if not exists audience text not null default 'client',
  add column if not exists task_type text not null default 'client_manual_task',
  add column if not exists group_key text not null default 'development',
  add column if not exists client_description text,
  add column if not exists dev_description text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists client_visible boolean not null default true,
  add column if not exists client_status text not null default 'submitted',
  add column if not exists dev_status text,
  add column if not exists label text,
  add column if not exists progress int not null default 0,
  add column if not exists latest_client_update text,
  add column if not exists latest_dev_update text,
  add column if not exists tagro_result_json jsonb,
  add column if not exists attachments_json jsonb,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_reason text;

create index if not exists idx_tasks_project_source_type on tasks(project_id, source, task_type);
create index if not exists idx_tasks_project_group on tasks(project_id, group_key, client_status, dev_status);
create index if not exists idx_tasks_status_report on tasks(source_status_report_id);
create index if not exists idx_tasks_decision on tasks(source_decision_id);
create index if not exists idx_tasks_assigned_dev_status on tasks(assigned_to, dev_status);

-- ── Task links ─────────────────────────────────────────────────
create table if not exists task_links (
  id uuid primary key default gen_random_uuid(),
  source_task_id uuid not null references tasks(id) on delete cascade,
  target_task_id uuid not null references tasks(id) on delete cascade,
  link_type text not null default 'related',
  created_at timestamptz not null default now(),
  unique(source_task_id, target_task_id, link_type)
);

create index if not exists idx_task_links_source on task_links(source_task_id);
create index if not exists idx_task_links_target on task_links(target_task_id);

-- ── Project-level Tagro memory table requested by product spec.
-- Existing tagro_memories remains for account-scoped memory.
create table if not exists tagro_memory (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  memory_type text not null,
  key text not null,
  value_json jsonb not null default '{}'::jsonb,
  confidence_score numeric not null default 1 check (confidence_score >= 0 and confidence_score <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, memory_type, key)
);

create index if not exists idx_tagro_memory_project_type on tagro_memory(project_id, memory_type, updated_at desc);

-- ── Tagro runs / audit ─────────────────────────────────────────
create table if not exists tagro_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  run_type text not null,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  model text,
  status text not null default 'completed',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tagro_runs_project_type on tagro_runs(project_id, run_type, created_at desc);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id, created_at desc);
create index if not exists idx_audit_logs_actor on audit_logs(actor_id, created_at desc);

-- ── Updated-at helper ──────────────────────────────────────────
create or replace function touch_tagro_orchestration_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_status_reports_updated_at on status_reports;
create trigger trg_status_reports_updated_at
before update on status_reports
for each row execute function touch_tagro_orchestration_updated_at();

drop trigger if exists trg_decisions_updated_at on decisions;
create trigger trg_decisions_updated_at
before update on decisions
for each row execute function touch_tagro_orchestration_updated_at();

drop trigger if exists trg_tagro_memory_updated_at on tagro_memory;
create trigger trg_tagro_memory_updated_at
before update on tagro_memory
for each row execute function touch_tagro_orchestration_updated_at();

-- ── RLS placeholders, conservative reads through project/workspace access.
alter table status_reports enable row level security;
alter table decisions enable row level security;
alter table task_links enable row level security;
alter table tagro_memory enable row level security;
alter table tagro_runs enable row level security;
alter table audit_logs enable row level security;

do $$ begin
  create policy status_reports_project_read on status_reports for select using (
    exists (
      select 1 from projects p
       where p.id = status_reports.project_id
         and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy decisions_project_read on decisions for select using (
    exists (
      select 1 from projects p
       where p.id = decisions.project_id
         and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy tagro_memory_project_read on tagro_memory for select using (
    exists (
      select 1 from projects p
       where p.id = tagro_memory.project_id
         and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
    )
  );
exception when duplicate_object then null; end $$;

-- Server-side Tagro writes use the service role. Client writes stay disabled
-- until the dedicated Server Actions validate role/project access.
