-- Project Health v1 — composed, explainable health per project.
--
-- Health lives on project_intelligence rather than in a parallel table: it is
-- 1:1 per project and it is the same subject the Learning Engine already
-- profiles there (wisdom, DNA, confidence). A second table would split one
-- truth across two places.
--
-- Engine: lib/health/engine.ts (pure) · write path: lib/health/persist.ts
-- Constitution: docs/festag-production-intelligence.md — a score never ships
-- without the cause chain that explains it.

-- ── Health on the project profile ────────────────────────────────────────
alter table public.project_intelligence
  add column if not exists health_score integer
    check (health_score is null or health_score between 0 and 100),
  -- Vocabulary shared with Delivery Pulse so one project reads the same
  -- everywhere in the product.
  add column if not exists health_band text
    check (health_band is null or health_band in ('healthy', 'watch', 'risk', 'blocked')),
  -- Per-factor breakdown incl. the mandatory `why` for each factor.
  add column if not exists health_factors jsonb not null default '[]'::jsonb,
  -- How much of the model was actually measurable, 0–100.
  add column if not exists health_confidence integer
    check (health_confidence is null or health_confidence between 0 and 100),
  -- The factor dragging hardest, if any.
  add column if not exists health_cause text,
  add column if not exists health_computed_at timestamptz;

comment on column public.project_intelligence.health_score is
  'Composed project health 0-100. NULL means not measurable yet — never render as 0 or as healthy.';
comment on column public.project_intelligence.health_factors is
  'Array of {id, value, weight, why, evidence}. Every factor carries its cause; see lib/health/types.ts.';

-- ── Why it moved ─────────────────────────────────────────────────────────
-- Append-only cause chain. The constitution forbids shipping a score change
-- without an explainable reason, so `why` is NOT NULL by design.
create table if not exists public.project_health_deltas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  previous integer check (previous is null or previous between 0 and 100),
  next integer check (next is null or next between 0 and 100),
  why text not null,
  factors_touched text[] not null default '{}',
  at timestamptz not null default now()
);

create index if not exists project_health_deltas_project_at_idx
  on public.project_health_deltas (project_id, at desc);

-- ── RLS — mirrors project_intelligence exactly ───────────────────────────
alter table public.project_health_deltas enable row level security;

drop policy if exists project_health_deltas_project_read on public.project_health_deltas;
create policy project_health_deltas_project_read on public.project_health_deltas
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_health_deltas.project_id
        and (
          p.user_id = auth.uid()
          or p.client_id = auth.uid()
          or is_workspace_member(p.workspace_id)
        )
    )
  );

-- Health is computed by trusted server code (service role) only — no INSERT
-- or UPDATE policy is granted to authenticated users, same as the existing
-- intelligence tables.
