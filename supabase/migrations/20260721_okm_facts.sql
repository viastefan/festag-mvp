-- Festag Adaptive Intelligence — Operational Knowledge Model (OKM) facts
-- Workspace-scoped collaboration patterns. Not personal surveillance.
-- Personal subject_user_id only when product settings allow (enforced in app).

create table if not exists public.okm_facts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  -- Stable upsert key within a workspace, e.g. decision.type.scope_change
  fact_key text not null,
  domain text not null
    check (domain in (
      'people', 'decision', 'communication', 'project',
      'workflow', 'technical', 'quality', 'process'
    )),
  dna_kind text
    check (dna_kind is null or dna_kind in (
      'decision', 'communication', 'quality', 'delivery'
    )),
  -- Short human-readable pattern — no raw PII / free-text dumps
  claim text not null,
  confidence real not null default 0.4
    check (confidence >= 0 and confidence <= 1),
  observation_count integer not null default 1
    check (observation_count >= 1),
  -- Evidence refs only (decision ids, project ids) — never message bodies
  evidence_json jsonb not null default '[]'::jsonb,
  source text not null default 'observation'
    check (source in ('observation', 'user_stated', 'imported')),
  -- Optional subject for opt-in personal collaboration profiles only
  subject_user_id uuid references auth.users(id) on delete set null,
  last_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, fact_key)
);

create index if not exists okm_facts_workspace_domain_idx
  on public.okm_facts (workspace_id, domain);

create index if not exists okm_facts_workspace_dna_idx
  on public.okm_facts (workspace_id, dna_kind)
  where dna_kind is not null;

create index if not exists okm_facts_workspace_updated_idx
  on public.okm_facts (workspace_id, updated_at desc);

comment on table public.okm_facts is
  'Adaptive Intelligence OKM — workspace Operational DNA patterns. Privacy: no cross-workspace sharing; personal subject_user_id requires product opt-in.';

alter table public.okm_facts enable row level security;

-- Members can read workspace facts (Tagro / settings).
drop policy if exists okm_facts_select_member on public.okm_facts;
create policy okm_facts_select_member on public.okm_facts
  for select
  using (public.is_workspace_member(workspace_id));

-- Members can insert/update (app still gates Adaptive Intelligence settings).
drop policy if exists okm_facts_insert_member on public.okm_facts;
create policy okm_facts_insert_member on public.okm_facts
  for insert
  with check (public.is_workspace_member(workspace_id));

drop policy if exists okm_facts_update_member on public.okm_facts;
create policy okm_facts_update_member on public.okm_facts
  for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Owners/admins may delete (opt-out / cleanup). Members can delete own workspace facts via membership.
drop policy if exists okm_facts_delete_member on public.okm_facts;
create policy okm_facts_delete_member on public.okm_facts
  for delete
  using (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.okm_facts to authenticated;
grant all on public.okm_facts to service_role;
