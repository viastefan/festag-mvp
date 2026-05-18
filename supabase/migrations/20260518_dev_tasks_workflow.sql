-- Festag — DEV Tasks workflow (Tagro verification + proof + checklist)
--
-- Lifts the `tasks` table from "status enum" into a real production
-- control system:
--   • work_type        — what kind of work this is (dev / website / marketing …)
--   • definition_of_done, expected_outcome
--   • required_proof_types — which proofs Tagro will demand on finish
--   • tagro_verification_status / tagro_confidence — the AI quality gate
--   • client_visible_status — the *translated* status the client sees
--
-- Plus three new tables:
--   • task_proofs            — proof items (commit / preview / screenshot / …)
--   • task_checklist_items   — explicit acceptance checklist
--   • tagro_verifications    — every run of the Tagro verification engine
--   • task_activity_logs     — per-task audit trail (replaces casual messages)
--
-- All additive + idempotent.

-- ── tasks: workflow fields ─────────────────────────────────────
alter table tasks add column if not exists work_type text;
alter table tasks add column if not exists definition_of_done text;
alter table tasks add column if not exists expected_outcome text;
alter table tasks add column if not exists required_proof_types text[] not null default '{}';
alter table tasks add column if not exists tagro_verification_status text;       -- pending|verified|needs_review|proof_missing|quality_issue|blocked|cannot_verify
alter table tasks add column if not exists tagro_confidence numeric(3,2);        -- 0..1
alter table tasks add column if not exists tagro_verification_summary text;
alter table tasks add column if not exists tagro_internal_notes text;
alter table tasks add column if not exists tagro_client_summary text;
alter table tasks add column if not exists finished_by_dev_at timestamptz;
alter table tasks add column if not exists verified_by_tagro_at timestamptz;
alter table tasks add column if not exists approved_by_owner_at timestamptz;
alter table tasks add column if not exists client_visible_status text;            -- planned|in_progress|in_review|completed|waiting|on_hold
alter table tasks add column if not exists weight numeric(4,2) not null default 1;

create index if not exists idx_tasks_work_type on tasks(work_type) where work_type is not null;
create index if not exists idx_tasks_tagro_status on tasks(tagro_verification_status) where tagro_verification_status is not null;
create index if not exists idx_tasks_client_visible_status on tasks(project_id, client_visible_status) where client_visible_status is not null;

-- ── task_proofs ────────────────────────────────────────────────
create table if not exists task_proofs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  added_by uuid references auth.users(id) on delete set null,
  proof_type text not null,            -- commit | pull_request | deployment | preview_url | screenshot | video | file | figma | website_url | analytics | text | comment | check_result
  url text,
  file_path text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'manual',    -- manual | github | vercel | tagro | webhook
  source_ref text,                          -- e.g. commit sha, PR number, deployment id
  created_at timestamptz not null default now()
);
create index if not exists idx_task_proofs_task on task_proofs(task_id, created_at desc);
create index if not exists idx_task_proofs_type on task_proofs(task_id, proof_type);

alter table task_proofs enable row level security;
drop policy if exists tp_read on task_proofs;
create policy tp_read on task_proofs for select
  using (
    exists (
      select 1 from tasks t
       where t.id = task_proofs.task_id
         and (
           t.assigned_to = auth.uid()
           or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
           or exists (
             select 1 from project_assignments pa
              where pa.project_id = t.project_id and pa.user_id = auth.uid() and pa.active
           )
         )
    )
  );
drop policy if exists tp_write on task_proofs;
create policy tp_write on task_proofs for all
  using (
    auth.uid() = added_by
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  )
  with check (
    auth.uid() = added_by
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );

-- ── task_checklist_items ───────────────────────────────────────
create table if not exists task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  position int not null default 0,
  label text not null,
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_task_checklist_task on task_checklist_items(task_id, position);

alter table task_checklist_items enable row level security;
drop policy if exists tci_read on task_checklist_items;
create policy tci_read on task_checklist_items for select
  using (
    exists (
      select 1 from tasks t
       where t.id = task_checklist_items.task_id
         and (
           t.assigned_to = auth.uid()
           or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
           or exists (
             select 1 from project_assignments pa
              where pa.project_id = t.project_id and pa.user_id = auth.uid() and pa.active
           )
         )
    )
  );
drop policy if exists tci_write on task_checklist_items;
create policy tci_write on task_checklist_items for all
  using (
    exists (
      select 1 from tasks t
       where t.id = task_checklist_items.task_id
         and (
           t.assigned_to = auth.uid()
           or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
           or exists (
             select 1 from project_assignments pa
              where pa.project_id = t.project_id and pa.user_id = auth.uid() and pa.active
           )
         )
    )
  )
  with check (
    exists (
      select 1 from tasks t
       where t.id = task_checklist_items.task_id
         and (
           t.assigned_to = auth.uid()
           or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
           or exists (
             select 1 from project_assignments pa
              where pa.project_id = t.project_id and pa.user_id = auth.uid() and pa.active
           )
         )
    )
  );

-- ── tagro_verifications ────────────────────────────────────────
create table if not exists tagro_verifications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  status text not null,                -- verified|needs_review|proof_missing|quality_issue|blocked|cannot_verify
  confidence numeric(3,2),             -- 0..1
  summary text,                        -- internal summary
  client_summary text,                 -- client-safe translation
  issues_json jsonb not null default '[]'::jsonb,
  evidence_json jsonb not null default '{}'::jsonb,
  recommended_next_action text,
  ran_by text not null default 'tagro',
  model text,
  created_at timestamptz not null default now()
);
create index if not exists idx_tagro_verifications_task on tagro_verifications(task_id, created_at desc);

alter table tagro_verifications enable row level security;
drop policy if exists tv_read on tagro_verifications;
create policy tv_read on tagro_verifications for select
  using (
    exists (
      select 1 from tasks t
       where t.id = tagro_verifications.task_id
         and (
           t.assigned_to = auth.uid()
           or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
           or exists (
             select 1 from project_assignments pa
              where pa.project_id = t.project_id and pa.user_id = auth.uid() and pa.active
           )
         )
    )
  );

-- ── task_activity_logs ─────────────────────────────────────────
-- Per-task audit trail. Replaces the looser `audit_logs` usage for
-- task events so the drawer can show a tight history without RLS gymnastics.
create table if not exists task_activity_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_kind text not null default 'human',   -- human | tagro | system | client
  event text not null,                         -- task_created | status_changed | proof_added | proof_removed | checklist_toggled | finished_by_dev | tagro_verified | needs_review | quality_issue | approved_by_owner | client_synced | work_log
  metadata jsonb not null default '{}'::jsonb,
  visible_to_client boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_task_activity_task on task_activity_logs(task_id, created_at desc);
create index if not exists idx_task_activity_project on task_activity_logs(project_id, created_at desc);

alter table task_activity_logs enable row level security;
drop policy if exists tal_read on task_activity_logs;
create policy tal_read on task_activity_logs for select
  using (
    exists (
      select 1 from tasks t
       where t.id = task_activity_logs.task_id
         and (
           t.assigned_to = auth.uid()
           or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
           or exists (
             select 1 from project_assignments pa
              where pa.project_id = t.project_id and pa.user_id = auth.uid() and pa.active
           )
           -- Clients see the visible_to_client subset.
           or (
             task_activity_logs.visible_to_client
             and exists (
               select 1 from projects p
                where p.id = t.project_id
                  and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
             )
           )
         )
    )
  );
drop policy if exists tal_write on task_activity_logs;
create policy tal_write on task_activity_logs for insert
  with check (
    actor_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );
