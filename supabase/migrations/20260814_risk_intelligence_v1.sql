-- ─────────────────────────────────────────────────────────────────────────────
-- Festag — Risk Intelligence v1
--
-- Risk becomes a first-class object. Until now "Risiken" were derived on the
-- fly (open decisions in lib/decisions/risks.ts, blocked tasks on the
-- dashboard) and never persisted, so nothing could be tracked, explained,
-- decided on, or resolved.
--
-- One Risk object, many presentations: the client sees client_title /
-- client_summary, delivery sees title / description + evidence. Same row.
--
--   risks          the object itself (probability, impact, severity, lifecycle)
--   risk_signals   the evidence — why Festag believes this risk exists
--   risk_links     what it affects (tasks, decisions, milestones, issues)
--   risk_events    append-only, human-readable history
--   risk_settings  per-workspace detection behaviour + Tagro autonomy
--
-- Access follows the existing project model via can_access_decision_project()
-- (20260619_decisions_rls_realtime_notify.sql).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 0. Access helper ─────────────────────────────────────────────────────────
-- Normally introduced by 20260619_decisions_rls_realtime_notify.sql. Repeated
-- here verbatim (create or replace) so this migration can be applied on a
-- database that hasn't caught up with the decision migrations yet — every
-- policy below depends on it.
create or replace function can_access_decision_project(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from projects p
    where p.id = p_project
      and (
        p.user_id = auth.uid()
        or p.client_id = auth.uid()
        or is_workspace_member(p.workspace_id)
        or exists (
          select 1 from project_assignments pa
          where pa.project_id = p.id
            and pa.user_id = auth.uid()
            and pa.active
        )
      )
  );
$$;

grant execute on function can_access_decision_project(uuid) to authenticated;


-- ── 1. risks ─────────────────────────────────────────────────────────────────
create table if not exists risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete set null,

  -- Delivery framing (developer / project owner).
  title text not null,
  description text,

  -- Client framing. Tagro writes these; never expose raw dev language.
  client_title text,
  client_summary text,

  -- delivery | technical | scope | budget | quality | dependency
  -- | team | client | timeline | other
  category text not null default 'delivery',

  -- 0..1. Festag assessment, not an objective probability.
  probability numeric(3,2)
    check (probability is null or (probability >= 0 and probability <= 1)),
  -- low | medium | high | critical
  impact text not null default 'medium',
  -- Derived deterministically from probability + impact + time sensitivity
  -- + dependency count (lib/risks/severity.ts). Never invented by the model.
  severity text not null default 'medium',
  -- How sure Festag is that this is a real risk (separate from probability).
  confidence numeric(3,2)
    check (confidence is null or (confidence >= 0 and confidence <= 1)),

  -- detected | active | monitoring | decision_required
  -- | accepted | mitigated | resolved | dismissed
  status text not null default 'detected',

  -- tagro | manual | developer | client | github | task | timeline | system
  source text not null default 'tagro',
  -- Stable dedupe key for detected risks, e.g. 'task_blocked:<task_id>'.
  -- Detection upserts on it so 10 failed CI events stay one risk.
  fingerprint text,

  -- Consequence if nothing changes.
  potential_delay_days numeric(5,1),
  potential_cost numeric(12,2),

  recommendation text,
  recommendation_reason text,

  -- The chosen Maßnahme: accept | mitigate | delegate | monitor
  response text,
  response_note text,
  responded_by uuid references auth.users(id) on delete set null,
  responded_at timestamptz,

  owner_id uuid references auth.users(id) on delete set null,
  decision_id uuid references decisions(id) on delete set null,

  detected_at timestamptz not null default now(),
  last_signal_at timestamptz,
  signal_count int not null default 0,

  resolved_at timestamptz,
  resolution_note text,
  dismissed_at timestamptz,
  dismiss_reason text,

  created_by uuid references auth.users(id) on delete set null,
  created_by_tagro boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint risks_category_check check (category in (
    'delivery','technical','scope','budget','quality','dependency',
    'team','client','timeline','other'
  )),
  constraint risks_impact_check check (impact in ('low','medium','high','critical')),
  constraint risks_severity_check check (severity in ('low','medium','high','critical')),
  constraint risks_status_check check (status in (
    'detected','active','monitoring','decision_required',
    'accepted','mitigated','resolved','dismissed'
  )),
  constraint risks_source_check check (source in (
    'tagro','manual','developer','client','github','task','timeline','system'
  )),
  constraint risks_response_check check (response is null or response in (
    'accept','mitigate','delegate','monitor'
  ))
);

create index if not exists idx_risks_project_status on risks(project_id, status);
create index if not exists idx_risks_project_severity on risks(project_id, severity);
create index if not exists idx_risks_workspace_status on risks(workspace_id, status);
create index if not exists idx_risks_owner on risks(owner_id) where owner_id is not null;
create index if not exists idx_risks_decision on risks(decision_id) where decision_id is not null;
create index if not exists idx_risks_updated on risks(updated_at desc);

-- One live risk per fingerprint per project. Closed risks keep their
-- fingerprint for history, and a recurrence opens a fresh row.
create unique index if not exists ux_risks_open_fingerprint
  on risks(project_id, fingerprint)
  where fingerprint is not null
    and status in ('detected','active','monitoring','decision_required','accepted');


-- ── 2. risk_signals — the evidence ───────────────────────────────────────────
-- Every line under "Warum Festag das erkannt hat". One row per observation;
-- repeated observations bump `occurrences` instead of duplicating.
create table if not exists risk_signals (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid not null references risks(id) on delete cascade,

  -- work_signal | task | decision | github | ci | timeline | client | manual | system
  source_type text not null,
  -- Row id in the source system when it is a Festag table.
  source_ref uuid,
  -- Free-form id for external systems (PR number, check run id, …).
  source_external_id text,
  -- Stable key within one risk: repeated ingests update instead of insert.
  dedupe_key text not null,

  -- Human-readable. This is what the UI renders — never raw event payloads.
  label text not null,
  detail text,

  -- How much this observation contributed to the assessment (0..1).
  weight numeric(3,2) not null default 0.2
    check (weight >= 0 and weight <= 1),
  occurrences int not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint risk_signals_source_check check (source_type in (
    'work_signal','task','decision','github','ci','timeline','client','manual','system'
  ))
);

create unique index if not exists ux_risk_signals_dedupe
  on risk_signals(risk_id, dedupe_key);
create index if not exists idx_risk_signals_risk on risk_signals(risk_id, occurred_at desc);
create index if not exists idx_risk_signals_source on risk_signals(source_type, source_ref)
  where source_ref is not null;


-- ── 3. risk_links — what the risk touches ────────────────────────────────────
create table if not exists risk_links (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid not null references risks(id) on delete cascade,
  -- task | decision | milestone | issue | project | status_report | developer
  target_kind text not null,
  target_id uuid not null,
  -- affects | blocks | caused_by | resolves | originated_from
  link_kind text not null default 'affects',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint risk_links_kind_check check (target_kind in (
    'task','decision','milestone','issue','project','status_report','developer'
  )),
  constraint risk_links_link_check check (link_kind in (
    'affects','blocks','caused_by','resolves','originated_from'
  ))
);

create unique index if not exists ux_risk_links_unique
  on risk_links(risk_id, target_kind, target_id, link_kind);
create index if not exists idx_risk_links_target on risk_links(target_kind, target_id);


-- ── 4. risk_events — human-readable history ──────────────────────────────────
create table if not exists risk_events (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid not null references risks(id) on delete cascade,
  -- detected | created | probability_changed | severity_changed | signal_added
  -- | assessed | responded | decision_created | decision_applied
  -- | status_change | resolved | dismissed | accepted | reopened | note
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  -- user | tagro | system
  actor_kind text not null default 'system',
  from_status text,
  to_status text,
  -- One sentence in plain language: "Wahrscheinlichkeit gestiegen, weil …"
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint risk_events_actor_check check (actor_kind in ('user','tagro','system'))
);

create index if not exists idx_risk_events_risk on risk_events(risk_id, created_at desc);


-- ── 5. risk_settings — detection behaviour per workspace ─────────────────────
create table if not exists risk_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  -- null = workspace default; a row with project_id overrides it.
  project_id uuid references projects(id) on delete cascade,

  detect_risks boolean not null default true,
  detect_scope_changes boolean not null default true,
  detect_blockers boolean not null default true,

  -- low = only strong signals, high = surface weak signals earlier
  sensitivity text not null default 'medium',

  -- Which signal sources feed detection.
  source_tasks boolean not null default true,
  source_developer boolean not null default true,
  source_github boolean not null default true,
  source_client boolean not null default true,
  source_timeline boolean not null default true,
  source_decisions boolean not null default true,

  -- observe | recommend | assist | act
  autonomy text not null default 'recommend',
  -- Per-action permissions: { create_risk: 'auto'|'ask'|'off', … }
  action_permissions jsonb not null default '{}'::jsonb,

  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint risk_settings_sensitivity_check check (sensitivity in ('low','medium','high')),
  constraint risk_settings_autonomy_check check (autonomy in ('observe','recommend','assist','act'))
);

create unique index if not exists ux_risk_settings_workspace_default
  on risk_settings(workspace_id) where project_id is null;
create unique index if not exists ux_risk_settings_project
  on risk_settings(project_id) where project_id is not null;


-- ── 6. updated_at triggers ───────────────────────────────────────────────────
create or replace function touch_risks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_risks_updated_at on risks;
create trigger trg_risks_updated_at
before update on risks
for each row execute function touch_risks_updated_at();

drop trigger if exists trg_risk_settings_updated_at on risk_settings;
create trigger trg_risk_settings_updated_at
before update on risk_settings
for each row execute function touch_risks_updated_at();


-- ── 7. Lifecycle audit ───────────────────────────────────────────────────────
-- Safety net: any status change writes history even when an API path forgets.
-- API handlers write richer, more specific summaries themselves.
create or replace function emit_risk_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  label text;
begin
  if tg_op = 'INSERT' then
    insert into risk_events(risk_id, event_type, actor_user_id, actor_kind, from_status, to_status, summary, payload)
    values (
      new.id,
      case when new.created_by_tagro then 'detected' else 'created' end,
      new.created_by,
      case when new.created_by_tagro then 'tagro' else 'user' end,
      null,
      new.status,
      case when new.created_by_tagro
        then 'Festag hat dieses Risiko aus Projektsignalen erkannt.'
        else 'Risiko manuell angelegt.' end,
      jsonb_build_object('category', new.category, 'severity', new.severity, 'source', new.source)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    label := case new.status
      when 'resolved'          then 'Risiko als gelöst markiert.'
      when 'dismissed'         then 'Risiko verworfen.'
      when 'accepted'          then 'Risiko bewusst akzeptiert.'
      when 'mitigated'         then 'Maßnahme greift — Risiko abgesichert.'
      when 'monitoring'        then 'Risiko wird weiter beobachtet.'
      when 'decision_required' then 'Es braucht eine Entscheidung.'
      when 'active'            then 'Risiko ist aktiv.'
      else 'Status geändert.'
    end;

    insert into risk_events(risk_id, event_type, actor_user_id, actor_kind, from_status, to_status, summary, payload)
    values (
      new.id,
      case new.status
        when 'resolved'  then 'resolved'
        when 'dismissed' then 'dismissed'
        when 'accepted'  then 'accepted'
        else 'status_change'
      end,
      new.responded_by,
      case when new.responded_by is null then 'system' else 'user' end,
      old.status, new.status, label,
      jsonb_build_object('response', new.response, 'severity', new.severity)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_risks_status_event on risks;
create trigger trg_risks_status_event
after insert or update on risks
for each row execute function emit_risk_status_event();


-- ── 8. RLS ───────────────────────────────────────────────────────────────────
alter table risks enable row level security;
alter table risk_signals enable row level security;
alter table risk_links enable row level security;
alter table risk_events enable row level security;
alter table risk_settings enable row level security;

drop policy if exists risks_project_read on risks;
create policy risks_project_read on risks
  for select using (can_access_decision_project(project_id));

drop policy if exists risks_project_insert on risks;
create policy risks_project_insert on risks
  for insert with check (can_access_decision_project(project_id));

drop policy if exists risks_project_update on risks;
create policy risks_project_update on risks
  for update using (can_access_decision_project(project_id))
  with check (can_access_decision_project(project_id));

drop policy if exists risks_project_delete on risks;
create policy risks_project_delete on risks
  for delete using (can_access_decision_project(project_id));

-- Children follow the parent risk's project.
drop policy if exists risk_signals_read on risk_signals;
create policy risk_signals_read on risk_signals
  for select using (
    exists (select 1 from risks r where r.id = risk_signals.risk_id
              and can_access_decision_project(r.project_id))
  );

drop policy if exists risk_signals_insert on risk_signals;
create policy risk_signals_insert on risk_signals
  for insert with check (
    exists (select 1 from risks r where r.id = risk_signals.risk_id
              and can_access_decision_project(r.project_id))
  );

-- The engine bumps `occurrences` and refreshes labels on existing evidence.
drop policy if exists risk_signals_update on risk_signals;
create policy risk_signals_update on risk_signals
  for update using (
    exists (select 1 from risks r where r.id = risk_signals.risk_id
              and can_access_decision_project(r.project_id))
  )
  with check (
    exists (select 1 from risks r where r.id = risk_signals.risk_id
              and can_access_decision_project(r.project_id))
  );

drop policy if exists risk_links_read on risk_links;
create policy risk_links_read on risk_links
  for select using (
    exists (select 1 from risks r where r.id = risk_links.risk_id
              and can_access_decision_project(r.project_id))
  );

drop policy if exists risk_links_insert on risk_links;
create policy risk_links_insert on risk_links
  for insert with check (
    exists (select 1 from risks r where r.id = risk_links.risk_id
              and can_access_decision_project(r.project_id))
  );

drop policy if exists risk_links_delete on risk_links;
create policy risk_links_delete on risk_links
  for delete using (
    exists (select 1 from risks r where r.id = risk_links.risk_id
              and can_access_decision_project(r.project_id))
  );

drop policy if exists risk_events_read on risk_events;
create policy risk_events_read on risk_events
  for select using (
    exists (select 1 from risks r where r.id = risk_events.risk_id
              and can_access_decision_project(r.project_id))
  );

drop policy if exists risk_events_insert on risk_events;
create policy risk_events_insert on risk_events
  for insert with check (
    exists (select 1 from risks r where r.id = risk_events.risk_id
              and can_access_decision_project(r.project_id))
  );

drop policy if exists risk_settings_read on risk_settings;
create policy risk_settings_read on risk_settings
  for select using (is_workspace_member(workspace_id));

drop policy if exists risk_settings_write on risk_settings;
create policy risk_settings_write on risk_settings
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));


-- ── 9. Realtime ──────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table risks;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
