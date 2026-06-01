-- Festag — Notizen mit Veyra-Vorschlägen, Teilen, Task-Spawning
--
-- Notizen sind das Schwester-Surface zum Veyra Chat: längere
-- Gedanken, die der Nutzer ablegen will und an die Veyra
-- Vorschläge anhängt (mögliche Tasks, Folgefragen, Risiken).
--
-- Eine Notiz kann:
--   1. mit anderen Workspace-Mitgliedern geteilt werden
--   2. in echte Tasks verwandelt werden (notes_spawned_tasks)
--   3. an ein Projekt gehängt werden (project_id, nullable)
--
-- Veyra speichert seine Vorschläge als JSONB-Spalte auf der Notiz —
-- so bleibt eine Notiz eine atomare Einheit (kein Join nötig).

-- ── notes ────────────────────────────────────────────────────
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null default 'Neue Notiz',
  body text,
  tags text[] not null default '{}'::text[],
  status text not null default 'active',          -- active | archived
  shared_with uuid[] not null default '{}'::uuid[],
  tagro_suggestions jsonb not null default '{}'::jsonb,
  tagro_last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notes_user        on notes(user_id, updated_at desc);
create index if not exists idx_notes_project     on notes(project_id, updated_at desc) where project_id is not null;
create index if not exists idx_notes_status      on notes(user_id, status) where status <> 'archived';
create index if not exists idx_notes_shared      on notes using gin(shared_with);
create index if not exists idx_notes_tags        on notes using gin(tags);

alter table notes enable row level security;

-- The owner sees everything, including their archived rows.
drop policy if exists notes_owner_all on notes;
create policy notes_owner_all on notes
  for all using (auth.uid() = user_id)
       with check (auth.uid() = user_id);

-- Shared-with users see + comment, but cannot mutate the row beyond
-- adding a spawned task (which lives in its own table).
drop policy if exists notes_shared_read on notes;
create policy notes_shared_read on notes
  for select using (auth.uid() = any(shared_with));

-- Admins and project_owners always see.
drop policy if exists notes_admin_read on notes;
create policy notes_admin_read on notes
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );

-- updated_at touch trigger so the list can sort honestly.
create or replace function touch_notes_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists trg_notes_touch on notes;
create trigger trg_notes_touch
  before update on notes
  for each row execute function touch_notes_updated_at();

-- ── notes_spawned_tasks — audit link note → task ────────────
-- Lets the UI render "3 Tasks aus dieser Notiz" without polluting
-- the tasks table with a hard column. Also makes it possible to
-- show the source note from a task's detail drawer later.
create table if not exists notes_spawned_tasks (
  note_id uuid not null references notes(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  suggestion_idx int,                            -- index into the suggestions array, optional
  spawned_by uuid references auth.users(id) on delete set null,
  spawned_at timestamptz not null default now(),
  primary key (note_id, task_id)
);
create index if not exists idx_nst_note on notes_spawned_tasks(note_id);
create index if not exists idx_nst_task on notes_spawned_tasks(task_id);

alter table notes_spawned_tasks enable row level security;
drop policy if exists nst_read on notes_spawned_tasks;
create policy nst_read on notes_spawned_tasks
  for select using (
    exists (select 1 from notes n where n.id = notes_spawned_tasks.note_id
              and (n.user_id = auth.uid() or auth.uid() = any(n.shared_with)))
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );
drop policy if exists nst_write on notes_spawned_tasks;
create policy nst_write on notes_spawned_tasks
  for insert with check (
    auth.uid() = spawned_by
    and exists (select 1 from notes n where n.id = notes_spawned_tasks.note_id
                  and (n.user_id = auth.uid() or auth.uid() = any(n.shared_with)))
  );
