-- ─────────────────────────────────────────────────────────────────────────────
-- Festag work_type + work_signals foundation
--
-- Work type is the broad Festag category that drives which Execution Panel
-- modules surface and which Work Signal types Veyra accepts. project_type
-- stays as the granular preset (Landingpage, Mobile App, SEO, etc.).
--
-- MVP work types: software / design / marketing / general.
-- V2 reserved: construction / field_service / event / facility / operations.
-- ─────────────────────────────────────────────────────────────────────────────

alter table projects
  add column if not exists work_type text not null default 'software';

alter table projects drop constraint if exists projects_work_type_check;
alter table projects
  add constraint projects_work_type_check check (work_type in (
    'software','design','marketing','general',
    'construction','field_service','event','facility','operations'
  ));

create index if not exists idx_projects_work_type on projects(work_type);

-- work_signals: raw inputs Veyra interprets into status / risks /
-- decisions / next actions / client translations.
create table if not exists work_signals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  -- task_completed | blocker_reported | decision_needed | approval_requested
  -- | approval_received | file_uploaded | comment_added | status_note
  -- | scope_change | risk_reported | design_update | code_update
  -- | deployment_update | meeting_note | voice_note | photo_uploaded
  -- | location_checkin
  type text not null,
  source text not null default 'manual',
  content text,
  attachments_json jsonb not null default '[]'::jsonb,
  related_task_id uuid references tasks(id) on delete set null,
  related_decision_id uuid references decisions(id) on delete set null,
  -- internal | team | client
  visibility text not null default 'internal',
  tagro_classification_json jsonb not null default '{}'::jsonb,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_work_signals_project_type on work_signals(project_id, type, created_at desc);
create index if not exists idx_work_signals_task on work_signals(related_task_id);
create index if not exists idx_work_signals_visibility on work_signals(project_id, visibility);

alter table work_signals enable row level security;

do $$ begin
  create policy work_signals_project_read on work_signals for select using (
    exists (
      select 1 from projects p
       where p.id = work_signals.project_id
         and (p.user_id = auth.uid() or p.client_id = auth.uid()
              or is_workspace_member(p.workspace_id))
    )
  );
exception when duplicate_object then null; end $$;
