-- Festag — project_members: per-project Executor-Rollen
--
-- Bisher: ein User hat eine plattformweite role (client | dev | admin)
-- und gehört zu einem workspace. Für die Modular-Project-OS-Sicht
-- brauchen wir aber eine pro-Projekt-Zuweisung — z. B. "Anna ist
-- Designer im Projekt 'X' und gleichzeitig Project Manager in
-- Projekt 'Y'". Genau dafür ist diese Tabelle.
--
-- Sie greift in den ExecutorRole-Enum aus lib/project-modules.ts —
-- gespeichert wird aber als text, weil das Enum ohnehin in TS
-- pflegen müssen und ein DB-Enum nur Hürden ohne Nutzen baut.

create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Executor-Rolle in genau diesem Projekt.
  role text not null default 'developer',
  -- Optional: Zuständigkeitsschwerpunkt als Freitext (z. B. "Frontend",
  -- "Ads / Performance"). Nur Anzeige, kein Filter.
  focus text,
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists idx_project_members_project on project_members(project_id);
create index if not exists idx_project_members_user on project_members(user_id);

alter table project_members enable row level security;

-- Read: any member of the project's workspace
drop policy if exists project_members_read on project_members;
create policy project_members_read on project_members for select
  using (
    exists (
      select 1
        from projects p
       where p.id = project_members.project_id
         and (
           is_workspace_member(p.workspace_id)
           or auth.uid() = project_members.user_id
         )
    )
  );

-- Write: owner of the project's workspace (or the user themselves
-- when reading/removing their own row — owner controls additions).
drop policy if exists project_members_write on project_members;
create policy project_members_write on project_members for all
  using (
    exists (
      select 1
        from projects p
        join workspaces w on w.id = p.workspace_id
       where p.id = project_members.project_id
         and w.primary_owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
        from projects p
        join workspaces w on w.id = p.workspace_id
       where p.id = project_members.project_id
         and w.primary_owner_id = auth.uid()
    )
  );
