-- Festag — Modular Project Operating System (Phase 1)
--
-- Foundation for "Veyra klassifiziert das Projekt → richtige Module/Rollen/
-- Portale". Every project gets a typed classification + a module set + a
-- visibility level + a list of connected data sources. The values are
-- additive — old queries that ignore them keep working unchanged.
--
-- Type enums are declared open enough to cover the eight launch types
-- without locking us in: hybrid catches multi-discipline projects.

-- ── enums ──────────────────────────────────────────────────────
do $$ begin
  create type project_type as enum (
    'software',     -- App / Platform / SaaS / Backend
    'website',      -- Landingpage / Marketing-Site / CMS
    'marketing',    -- Campaign / Performance / Ads / Social
    'seo',          -- SEO / Content / Technical SEO
    'branding',     -- Design / Identity / Asset System
    'automation',   -- AI-Workflows / Integrations / Operations
    'consulting',   -- Strategy / Digital Advisory
    'hybrid'        -- mehrere der oben (Veyra pickt das passendste Preset)
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_delivery_model as enum (
    'festag_delivery',     -- Festag setzt um
    'team_internal',       -- internes Team
    'agency_client',       -- Agentur setzt für eigenen Kunden um
    'white_label_client',  -- White-Label Kundenprojekt
    'hybrid_delivery'      -- gemischt (Festag + Agentur + interne)
  );
exception when duplicate_object then null; end $$;

do $$ begin
  -- How much of the workspace the client sees. Driven by portal logic.
  create type project_visibility_level as enum (
    'full',     -- alles ausser explizit als internal markiert
    'standard', -- nur client-relevante Module
    'minimal'   -- nur Briefing + Meilensteine + Entscheidungen
  );
exception when duplicate_object then null; end $$;

-- ── columns ────────────────────────────────────────────────────
alter table projects
  add column if not exists project_type project_type,
  add column if not exists industry_context text,
  add column if not exists delivery_model project_delivery_model,
  add column if not exists client_visibility_level project_visibility_level not null default 'standard',
  add column if not exists enabled_modules jsonb not null default '[]'::jsonb,
  add column if not exists enabled_briefing_modules jsonb not null default '[]'::jsonb,
  add column if not exists connected_data_sources jsonb not null default '{}'::jsonb,
  add column if not exists executor_roles text[] not null default '{}'::text[],
  add column if not exists classifier_metadata jsonb not null default '{}'::jsonb,
  add column if not exists classified_at timestamptz;

-- ── classifier audit log ──────────────────────────────────────
-- Optional but very cheap. Lets us tune the classifier later by reviewing
-- which raw inputs led to which preset, and keeps the door open for
-- "Veyra re-classified this project" history.
create table if not exists project_classifier_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  input jsonb not null,           -- the raw answers fed to Veyra
  output jsonb not null,          -- the chosen preset
  source text not null default 'tagro_classifier', -- 'tagro_classifier' / 'manual_override' / 'heuristic'
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at timestamptz not null default now()
);

create index if not exists idx_classifier_runs_project on project_classifier_runs(project_id);
create index if not exists idx_classifier_runs_user on project_classifier_runs(user_id);

alter table project_classifier_runs enable row level security;

drop policy if exists classifier_runs_owner_read on project_classifier_runs;
create policy classifier_runs_owner_read on project_classifier_runs for select
  using (
    user_id = auth.uid()
    or (workspace_id is not null and is_workspace_member(workspace_id))
  );

drop policy if exists classifier_runs_owner_write on project_classifier_runs;
create policy classifier_runs_owner_write on project_classifier_runs for insert
  with check (user_id = auth.uid());

-- ── indexes for filtering ─────────────────────────────────────
create index if not exists idx_projects_type on projects(project_type) where project_type is not null;
create index if not exists idx_projects_delivery_model on projects(delivery_model) where delivery_model is not null;

-- ── backfill: every existing project gets a sane default ─────
update projects
   set project_type = case
     when title ilike '%app%' or title ilike '%saas%' or title ilike '%platt%'  or title ilike '%plattform%' or description ilike '%app%' or description ilike '%saas%' then 'software'::project_type
     when title ilike '%website%' or title ilike '%landingpage%' or title ilike '%page%' or description ilike '%website%' or description ilike '%landingpage%' then 'website'::project_type
     when title ilike '%kampagne%' or title ilike '%ads%' or title ilike '%marketing%' or description ilike '%ads%' or description ilike '%kampagne%' then 'marketing'::project_type
     when title ilike '%seo%' or description ilike '%seo%' then 'seo'::project_type
     when title ilike '%brand%' or title ilike '%design%' or description ilike '%brand%' then 'branding'::project_type
     when title ilike '%automation%' or title ilike '%automatisier%' or description ilike '%automation%' then 'automation'::project_type
     else 'software'::project_type
   end
 where project_type is null;

update projects
   set delivery_model = 'festag_delivery'::project_delivery_model
 where delivery_model is null;
