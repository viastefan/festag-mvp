-- ─────────────────────────────────────────────────────────────────────────────
-- Decision Engine v1
--
-- Extends the existing `decisions` table with bidirectional framing
-- (Tagro translates between client and dev), structured response types,
-- explicit authority + delegation, full lifecycle states, and audit trail.
--
-- Adds three companion tables:
--   - decision_events  : append-only audit log of every state transition
--   - decision_links   : connects decisions to tasks/reports/messages they
--                        block, affect, originate from, or resolve
--   - decision_options : structured options replacing options_json (the
--                        legacy column is preserved for back-compat reads)
--
-- All column additions use `if not exists`. The status check is rebuilt to
-- accept both the new state-machine values and the legacy ones, so existing
-- rows remain valid.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. decisions: extend in place ────────────────────────────────────────────
alter table decisions
  -- Bidirectional framing. Tagro produces both sides.
  add column if not exists client_title text,
  add column if not exists client_summary text,
  add column if not exists internal_title text,
  add column if not exists internal_description text,
  add column if not exists tagro_reasoning text,
  add column if not exists tagro_recommendation_reason text,
  add column if not exists tagro_confidence_in_framing numeric
    check (tagro_confidence_in_framing is null
           or (tagro_confidence_in_framing >= 0
               and tagro_confidence_in_framing <= 1)),

  -- Decision typology. Drives which delegation rules apply and which
  -- detection sources are allowed to author the decision.
  --   scope | budget | direction | approval | risk_response | tradeoff
  --   clarification | escalation | legal | payment | contract | data_protection
  add column if not exists decision_type text not null default 'direction',

  -- Response shape the client picks from.
  --   binary | single_choice | multi_choice | free_text
  add column if not exists response_type text not null default 'single_choice',

  -- Who is allowed to decide.
  --   client | owner | client_and_owner | tagro_default
  add column if not exists authority text not null default 'client',
  add column if not exists delegate_allowed boolean not null default true,

  -- The actual response. Shape depends on response_type:
  --   { selected_option_id: text }                    (single_choice)
  --   { binary_value: 'yes' | 'no' }                  (binary)
  --   { selected_option_ids: text[] }                 (multi_choice)
  --   { free_text: text }                             (free_text)
  add column if not exists response_value jsonb,
  add column if not exists rationale text,

  -- Tagro-delegated decisions. When the client picked "Tagro entscheiden
  -- lassen", `decided_by` stays null and these fields carry the audit.
  add column if not exists tagro_delegation_reason text,
  add column if not exists override_window_until timestamptz,

  -- Lifecycle bookkeeping.
  add column if not exists applied_at timestamptz,
  add column if not exists superseded_by uuid references decisions(id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists created_by_tagro boolean not null default false,

  -- Urgency + scheduling. Best-effort additions if not yet present.
  add column if not exists urgency text not null default 'normal',
  add column if not exists deadline_hard timestamptz,

  -- Routing (introduced earlier via app code; ensured here for fresh DBs).
  add column if not exists requested_for uuid references auth.users(id) on delete set null,
  add column if not exists notification_channels text[] not null default array['inapp']::text[],
  add column if not exists notified_at timestamptz,

  -- Project owner who approved a tagro-delegated decision after the fact
  -- (or accepted the override window expiring). Distinct from decided_by
  -- which captures who chose the option.
  add column if not exists approved_by_owner uuid references auth.users(id) on delete set null,
  add column if not exists approved_by_owner_at timestamptz;

-- Rebuild status check so both new states and legacy values stay valid.
alter table decisions drop constraint if exists decisions_status_check;
alter table decisions
  add constraint decisions_status_check check (status in (
    'drafted','pending_client','awaiting_clarification',
    'decided','applied','archived',
    'rejected','expired','superseded',
    -- legacy values, kept for back-compat:
    'open','waiting_for_client','in_progress','closed'
  ));

-- Urgency check.
alter table decisions drop constraint if exists decisions_urgency_check;
alter table decisions
  add constraint decisions_urgency_check check (urgency in ('low','normal','high','critical'));

-- Response type check.
alter table decisions drop constraint if exists decisions_response_type_check;
alter table decisions
  add constraint decisions_response_type_check check (response_type in ('binary','single_choice','multi_choice','free_text'));

-- Authority check.
alter table decisions drop constraint if exists decisions_authority_check;
alter table decisions
  add constraint decisions_authority_check check (authority in ('client','owner','client_and_owner','tagro_default'));

-- Type check. Loose, just guarding typos.
alter table decisions drop constraint if exists decisions_type_check;
alter table decisions
  add constraint decisions_type_check check (decision_type in (
    'scope','budget','direction','approval','risk_response','tradeoff',
    'clarification','escalation','legal','payment','contract','data_protection'
  ));

create index if not exists idx_decisions_state_urgency on decisions(project_id, status, urgency);
create index if not exists idx_decisions_requested_for_open on decisions(requested_for)
  where status in ('pending_client','awaiting_clarification','open','waiting_for_client');
create index if not exists idx_decisions_authority on decisions(project_id, authority);
create index if not exists idx_decisions_applied_at on decisions(applied_at);
create index if not exists idx_decisions_superseded_by on decisions(superseded_by);


-- ── 2. decision_options ──────────────────────────────────────────────────────
create table if not exists decision_options (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  ordinal int not null default 0,
  external_id text,
  label text not null,
  client_label text,
  description text,
  technical_notes text,
  -- Structured shape: { cost_delta?, time_delta_days?, risk_delta?, scope_delta? }
  implications_json jsonb not null default '{}'::jsonb,
  recommended_by_tagro boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_decision_options_ord on decision_options(decision_id, ordinal);
create index if not exists idx_decision_options_decision on decision_options(decision_id);


-- ── 3. decision_events (audit) ───────────────────────────────────────────────
create table if not exists decision_events (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  -- created | framed | published | clarification_requested | clarification_resolved
  -- | decided | delegated_to_tagro | overridden | applied | superseded | expired
  -- | archived | reopened | option_added | option_removed | recommendation_set
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  -- user | tagro | system
  actor_kind text not null default 'user',
  from_status text,
  to_status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_decision_events_decision_created
  on decision_events(decision_id, created_at desc);
create index if not exists idx_decision_events_type on decision_events(event_type);


-- ── 4. decision_links ────────────────────────────────────────────────────────
create table if not exists decision_links (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  -- task | status_report | message | blocker | milestone
  target_kind text not null,
  target_id uuid not null,
  -- blocks | affects | originated_from | resolves
  link_kind text not null default 'blocks',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_decision_links_unique
  on decision_links(decision_id, target_kind, target_id, link_kind);
create index if not exists idx_decision_links_target on decision_links(target_kind, target_id);
create index if not exists idx_decision_links_decision on decision_links(decision_id);


-- ── 5. RLS ───────────────────────────────────────────────────────────────────
alter table decision_options enable row level security;
alter table decision_events enable row level security;
alter table decision_links enable row level security;

-- Reads follow project access exactly like decisions itself.
do $$ begin
  create policy decision_options_project_read on decision_options for select using (
    exists (
      select 1 from decisions d
        join projects p on p.id = d.project_id
       where d.id = decision_options.decision_id
         and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy decision_events_project_read on decision_events for select using (
    exists (
      select 1 from decisions d
        join projects p on p.id = d.project_id
       where d.id = decision_events.decision_id
         and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy decision_links_project_read on decision_links for select using (
    exists (
      select 1 from decisions d
        join projects p on p.id = d.project_id
       where d.id = decision_links.decision_id
         and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
    )
  );
exception when duplicate_object then null; end $$;

-- Writes are server-side only (service role). No insert/update/delete policies
-- — matches the existing decisions table pattern.


-- ── 6. Audit emitter trigger ────────────────────────────────────────────────
-- Every change of `status` on a decision writes a row to decision_events.
-- Catches anything an API caller forgets to log explicitly.
create or replace function emit_decision_status_event() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into decision_events(decision_id, event_type, actor_user_id, actor_kind, from_status, to_status, payload)
    values (new.id, 'created', new.created_by, case when new.created_by_tagro then 'tagro' else 'user' end,
            null, new.status, jsonb_build_object('decision_type', new.decision_type, 'response_type', new.response_type));
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into decision_events(decision_id, event_type, actor_user_id, actor_kind, from_status, to_status, payload)
    values (
      new.id,
      case new.status
        when 'decided' then case when new.tagro_delegation_reason is not null and new.decided_by is null then 'delegated_to_tagro' else 'decided' end
        when 'applied' then 'applied'
        when 'awaiting_clarification' then 'clarification_requested'
        when 'pending_client' then case when old.status = 'awaiting_clarification' then 'clarification_resolved' else 'published' end
        when 'superseded' then 'superseded'
        when 'archived' then 'archived'
        when 'expired' then 'expired'
        when 'rejected' then 'rejected'
        else 'status_change'
      end,
      new.decided_by,
      case when new.created_by_tagro and new.decided_by is null then 'tagro' else 'user' end,
      old.status, new.status,
      jsonb_build_object(
        'rationale', new.rationale,
        'delegation_reason', new.tagro_delegation_reason,
        'selected', new.response_value
      )
    );
    return new;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_decisions_status_event on decisions;
create trigger trg_decisions_status_event
after insert or update on decisions
for each row execute function emit_decision_status_event();
