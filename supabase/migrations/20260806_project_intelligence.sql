-- Tagro Intelligence — Learning Engine storage.
--
-- Nothing here is user-facing terminology. The product surface speaks about
-- "Project Intelligence"; these tables are how Tagro remembers what worked.

-- ── Decision outcomes ────────────────────────────────────────────────────
-- One row per decision that reached an outcome. Scores are derived, never
-- hand-entered (see lib/intelligence/scoring.ts).
create table if not exists public.decision_outcomes (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null default 'general',

  acceptance text not null check (
    acceptance in ('accepted', 'modified', 'dev_override', 'rejected')
  ),
  reverted boolean not null default false,
  revisions integer not null default 0 check (revisions >= 0),
  bugs integer not null default 0 check (bugs >= 0),
  delay_days integer,
  satisfaction numeric check (satisfaction between 1 and 5),
  follow_up_questions integer not null default 0 check (follow_up_questions >= 0),

  outcome_score integer not null check (outcome_score between 0 and 100),
  parts_json jsonb not null default '{}'::jsonb,
  summary text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (decision_id)
);

create index if not exists decision_outcomes_project_idx
  on public.decision_outcomes (project_id);
create index if not exists decision_outcomes_category_idx
  on public.decision_outcomes (category);

-- ── Project DNA + wisdom ─────────────────────────────────────────────────
-- The profile a finished project leaves behind, so future projects can be
-- matched against what already succeeded.
create table if not exists public.project_intelligence (
  project_id uuid primary key references public.projects(id) on delete cascade,

  wisdom_score integer check (wisdom_score between 0 and 100),
  decision_count integer not null default 0,
  confidence integer check (confidence between 0 and 100),

  industry text,
  project_type text,
  stack text[],
  design_style text,
  brand_direction text,
  architecture text,
  hosting text,
  framework text,

  satisfaction numeric check (satisfaction between 1 and 5),
  delivery_days integer,
  revision_count integer not null default 0,
  bug_count integer not null default 0,

  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ── Decision patterns ────────────────────────────────────────────────────
-- Combinations of choices and how they actually turned out. Workspace-scoped
-- so each organisation learns from its own delivery history.
create table if not exists public.decision_patterns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  pattern_key text[] not null,
  outcome_score integer not null check (outcome_score between 0 and 100),
  sample_size integer not null default 1 check (sample_size > 0),
  updated_at timestamptz not null default now(),
  unique (workspace_id, pattern_key)
);

create index if not exists decision_patterns_workspace_idx
  on public.decision_patterns (workspace_id);

-- ── RLS — mirrors the existing decisions/projects access rules ───────────
alter table public.decision_outcomes enable row level security;
alter table public.project_intelligence enable row level security;
alter table public.decision_patterns enable row level security;

drop policy if exists decision_outcomes_project_read on public.decision_outcomes;
create policy decision_outcomes_project_read on public.decision_outcomes
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = decision_outcomes.project_id
        and (
          p.user_id = auth.uid()
          or p.client_id = auth.uid()
          or is_workspace_member(p.workspace_id)
        )
    )
  );

drop policy if exists project_intelligence_project_read on public.project_intelligence;
create policy project_intelligence_project_read on public.project_intelligence
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_intelligence.project_id
        and (
          p.user_id = auth.uid()
          or p.client_id = auth.uid()
          or is_workspace_member(p.workspace_id)
        )
    )
  );

drop policy if exists decision_patterns_workspace_read on public.decision_patterns;
create policy decision_patterns_workspace_read on public.decision_patterns
  for select using (is_workspace_member(workspace_id));

-- Scoring is written by trusted server code (service role), never by clients,
-- so no INSERT/UPDATE policies are granted to authenticated users here.
