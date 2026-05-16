-- Festag — DEV Portal foundation
--
-- Schafft die Backend-Grundlage für den Developer-Bereich, GitHub-
-- Integration und Tagro-Reports. Bewusst additiv: keine bestehenden
-- Spalten/Policies werden umgeschrieben.
--
-- Lifecycle:
--   profiles.role  in (client | dev | admin | pending_developer | project_owner)
--   profiles.approval_status (für pending_developer Workflow)
--   profiles.provider (email | google | github | sso)
--   profiles.github_* (verlinktes GitHub-Konto)
--
-- Neue Tabellen:
--   project_assignments     — wer ist auf welchem Projekt
--   developer_updates       — tägliche/projektbezogene Status-Updates
--   developer_daily_plans   — von Tagro generierte Tages-Pläne
--   github_connections      — verschlüsselte OAuth-Tokens (server-only)
--   github_repositories     — verbundene Repos pro Projekt
--   github_commits          — synchronisierte Commits
--   github_pull_requests    — synchronisierte PRs
--   tagro_reports           — interne + client-safe Reports (audience-tagged)
--   audit_logs              — wer hat was wann gemacht

-- ── profiles: rolling extension ─────────────────────────────────
alter table profiles add column if not exists approval_status text default 'approved';
alter table profiles add column if not exists provider text;
alter table profiles add column if not exists github_user_id bigint;
alter table profiles add column if not exists github_username text;
alter table profiles add column if not exists github_avatar_url text;
alter table profiles add column if not exists github_profile_url text;
alter table profiles add column if not exists github_email text;
alter table profiles add column if not exists github_connected_at timestamptz;

create unique index if not exists idx_profiles_github_user_id on profiles(github_user_id) where github_user_id is not null;
create index if not exists idx_profiles_approval_status on profiles(approval_status) where approval_status <> 'approved';

-- ── project_assignments ─────────────────────────────────────────
create table if not exists project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_on_project text not null default 'developer',
  active boolean not null default true,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);
create index if not exists idx_project_assignments_user on project_assignments(user_id) where active = true;
create index if not exists idx_project_assignments_project on project_assignments(project_id) where active = true;

alter table project_assignments enable row level security;
drop policy if exists pa_read on project_assignments;
create policy pa_read on project_assignments for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from projects p
       where p.id = project_assignments.project_id
         and is_workspace_member(p.workspace_id)
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );

drop policy if exists pa_write on project_assignments;
create policy pa_write on project_assignments for all
  using (
    exists (
      select 1 from projects p
        join workspaces w on w.id = p.workspace_id
       where p.id = project_assignments.project_id
         and w.primary_owner_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  )
  with check (
    exists (
      select 1 from projects p
        join workspaces w on w.id = p.workspace_id
       where p.id = project_assignments.project_id
         and w.primary_owner_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );

-- ── developer_updates ───────────────────────────────────────────
create table if not exists developer_updates (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  update_text text not null,
  status text default 'in_progress',         -- in_progress | done | blocked
  blocker boolean not null default false,
  blocker_description text,
  github_refs_json jsonb,                    -- [{ kind:'commit'|'pr', url, sha?, number? }]
  created_at timestamptz not null default now()
);
create index if not exists idx_dev_updates_dev on developer_updates(developer_id, created_at desc);
create index if not exists idx_dev_updates_project on developer_updates(project_id, created_at desc) where project_id is not null;

alter table developer_updates enable row level security;
drop policy if exists du_read on developer_updates;
create policy du_read on developer_updates for select
  using (
    auth.uid() = developer_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
    or exists (
      select 1 from project_assignments pa
       where pa.project_id = developer_updates.project_id and pa.user_id = auth.uid() and pa.active
    )
  );

drop policy if exists du_write on developer_updates;
create policy du_write on developer_updates for insert
  with check (auth.uid() = developer_id);
drop policy if exists du_update on developer_updates;
create policy du_update on developer_updates for update
  using (auth.uid() = developer_id);

-- ── developer_daily_plans ───────────────────────────────────────
create table if not exists developer_daily_plans (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  date date not null,
  focus_summary text,
  plan_json jsonb,                           -- [{ task_id, title, expected_outcome, sequence }]
  status text not null default 'draft',      -- draft | confirmed | done
  created_by_tagro boolean not null default true,
  created_at timestamptz not null default now(),
  unique (developer_id, date, project_id)
);
create index if not exists idx_dev_daily_plans_dev on developer_daily_plans(developer_id, date desc);

alter table developer_daily_plans enable row level security;
drop policy if exists ddp_read on developer_daily_plans;
create policy ddp_read on developer_daily_plans for select
  using (
    auth.uid() = developer_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );
drop policy if exists ddp_write on developer_daily_plans;
create policy ddp_write on developer_daily_plans for all
  using (auth.uid() = developer_id or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner')))
  with check (auth.uid() = developer_id or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner')));

-- ── github_connections ──────────────────────────────────────────
-- IMPORTANT: Tokens are stored encrypted and never read from the client
-- (RLS allows only the owner to see their own row; tokens are masked in
-- the API response).
create table if not exists github_connections (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references auth.users(id) on delete cascade,
  github_user_id bigint,
  github_username text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  scope text,
  connected_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (developer_id)
);
alter table github_connections enable row level security;
drop policy if exists gh_conn_self on github_connections;
create policy gh_conn_self on github_connections for select
  using (auth.uid() = developer_id);

-- ── github_repositories ─────────────────────────────────────────
create table if not exists github_repositories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  developer_id uuid references auth.users(id) on delete set null,
  owner text not null,
  repo_name text not null,
  repo_full_name text not null,
  repo_url text not null,
  default_branch text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project_id, repo_full_name)
);
create index if not exists idx_gh_repos_project on github_repositories(project_id) where active;
alter table github_repositories enable row level security;
drop policy if exists gh_repos_read on github_repositories;
create policy gh_repos_read on github_repositories for select
  using (
    auth.uid() = developer_id
    or exists (
      select 1 from project_assignments pa
       where pa.project_id = github_repositories.project_id and pa.user_id = auth.uid() and pa.active
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );
drop policy if exists gh_repos_write on github_repositories;
create policy gh_repos_write on github_repositories for all
  using (
    auth.uid() = developer_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  )
  with check (
    auth.uid() = developer_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );

-- ── github_commits ──────────────────────────────────────────────
create table if not exists github_commits (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references github_repositories(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  developer_id uuid references auth.users(id) on delete set null,
  commit_sha text not null,
  message text,
  author_name text,
  author_email text,
  commit_url text,
  committed_at timestamptz,
  files_changed_count int,
  raw_payload jsonb,
  tagro_summary text,
  task_match_confidence numeric(3,2),  -- 0.00 - 1.00
  created_at timestamptz not null default now(),
  unique (repo_id, commit_sha)
);
create index if not exists idx_gh_commits_project on github_commits(project_id, committed_at desc) where project_id is not null;

alter table github_commits enable row level security;
drop policy if exists gh_commits_read on github_commits;
create policy gh_commits_read on github_commits for select
  using (
    exists (
      select 1 from project_assignments pa
       where pa.project_id = github_commits.project_id and pa.user_id = auth.uid() and pa.active
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );

-- ── github_pull_requests ────────────────────────────────────────
create table if not exists github_pull_requests (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references github_repositories(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  developer_id uuid references auth.users(id) on delete set null,
  pr_number int not null,
  title text,
  state text,                          -- open | closed
  merged boolean default false,
  pr_url text,
  created_at_github timestamptz,
  updated_at_github timestamptz,
  merged_at timestamptz,
  raw_payload jsonb,
  tagro_summary text,
  created_at timestamptz not null default now(),
  unique (repo_id, pr_number)
);
create index if not exists idx_gh_pr_project on github_pull_requests(project_id, updated_at_github desc) where project_id is not null;

alter table github_pull_requests enable row level security;
drop policy if exists gh_prs_read on github_pull_requests;
create policy gh_prs_read on github_pull_requests for select
  using (
    exists (
      select 1 from project_assignments pa
       where pa.project_id = github_pull_requests.project_id and pa.user_id = auth.uid() and pa.active
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );

-- ── tagro_reports ───────────────────────────────────────────────
-- audience-tagged: dieselbe Datenlage, verschiedene Stimmen.
create table if not exists tagro_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  generated_for uuid references auth.users(id) on delete set null,
  audience text not null,             -- internal_dev | internal_admin | client_safe | executive
  report_type text not null,          -- daily | weekly | adhoc | blocker_alert
  title text,
  summary text,
  completed_work text,
  current_work text,
  next_steps text,
  blockers text,
  risks text,
  confidence_score numeric(3,2),
  source_data_json jsonb,
  visible_to_client boolean not null default false,
  approved_by_admin uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_tagro_reports_project on tagro_reports(project_id, created_at desc);
create index if not exists idx_tagro_reports_audience on tagro_reports(project_id, audience, visible_to_client);

alter table tagro_reports enable row level security;
-- Devs see internal_dev reports for their assigned projects.
-- Admins see everything. Clients see only `visible_to_client = true` AND audience = 'client_safe'.
drop policy if exists tr_read on tagro_reports;
create policy tr_read on tagro_reports for select
  using (
    -- admin / project_owner
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
    -- developer-audience reports for assigned devs
    or (
      audience in ('internal_dev','internal_admin')
      and exists (
        select 1 from project_assignments pa
         where pa.project_id = tagro_reports.project_id and pa.user_id = auth.uid() and pa.active
      )
    )
    -- client-safe + approved for workspace members
    or (
      audience = 'client_safe' and visible_to_client = true
      and exists (
        select 1 from projects p
         where p.id = tagro_reports.project_id and is_workspace_member(p.workspace_id)
      )
    )
  );

-- ── audit_logs ──────────────────────────────────────────────────
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_actor on audit_logs(actor_id, created_at desc);
create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id, created_at desc);

alter table audit_logs enable row level security;
-- Only admins/project_owners can read audit logs.
drop policy if exists audit_admin_read on audit_logs;
create policy audit_admin_read on audit_logs for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner')));
