-- ─────────────────────────────────────────────────────────────────────────────
-- Decision Engine v2 — Orchestration
--
-- The deterministic half of Tagro's decision brain. The LLM (lib/decisions/
-- frame.ts) PROPOSES a classification + framing; THIS engine enforces it,
-- derives timing, scores urgency, drives the nudge cadence, escalates on
-- silence, and — only where the classification permits — auto-resolves at the
-- deadline. Paired 1:1 with docs/tagro-decision-orchestration.md (same enums,
-- same cadence, same column names).
--
-- Layers added here:
--   1. decisions          — scheduling + classification columns (reversibility,
--                           auto_resolve_strategy, due_at, urgency_score, …)
--   2. decision_policy     — per-project tuning (cap, quiet hours, cadence)
--   3. decision_recompute  — derive due_at / urgency for one decision
--   4. transition RPCs      — publish / decide / apply / delegate / clarify /
--                            owner_override (SECURITY DEFINER, canonical writes)
--   5. decisions_tick()     — the heartbeat: reminders, escalation, auto-resolve
--
-- Everything is additive and idempotent. Reuses v1 columns where they exist
-- (override_window_until = the 24h owner override window; deadline_hard;
-- approved_by_owner). tasks have no per-task due date, so blocking_horizon is a
-- decision-level input Tagro sets; blocked-task count + priority still feed the
-- urgency score.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. decisions: scheduling + classification ────────────────────────────────
alter table decisions
  -- Bezos door. Drives auto-resolve eligibility and deliberation default.
  add column if not exists reversibility text not null default 'unknown',
  -- What the engine may do at the deadline: tagro_default | escalate_only | hold
  add column if not exists auto_resolve_strategy text not null default 'escalate_only',

  -- Timing inputs (set by Tagro / the framer).
  add column if not exists lead_time_days int not null default 0,
  add column if not exists deliberation_hours numeric,        -- null → inherit door default
  add column if not exists cost_of_delay_per_day numeric,     -- €/day, feeds urgency only
  add column if not exists blocking_horizon timestamptz,       -- earliest moment blocked work needs the answer

  -- Derived scheduling state (engine owns these).
  add column if not exists surfaced_at timestamptz,            -- when it became visible to the decider
  add column if not exists due_at timestamptz,                 -- derived deadline
  add column if not exists effective_due_source text,          -- deadline_hard | blocking_horizon | deliberation_floor | type_default
  add column if not exists auto_resolve_at timestamptz,        -- when the engine acts on silence
  add column if not exists urgency_score numeric not null default 0,  -- 0..100

  -- Cadence + escalation bookkeeping.
  add column if not exists escalation_level int not null default 0,    -- 0 fresh · 1 reminded · 2 escalated · 3 auto/locked
  add column if not exists reminder_count int not null default 0,
  add column if not exists last_reminded_at timestamptz,
  add column if not exists next_reminder_at timestamptz,
  -- Open-decision cap: a queued decision is pending_client but not yet shown.
  add column if not exists queued boolean not null default false;

alter table decisions drop constraint if exists decisions_reversibility_check;
alter table decisions add constraint decisions_reversibility_check
  check (reversibility in ('two_way_door','one_way_door','unknown'));

alter table decisions drop constraint if exists decisions_auto_resolve_strategy_check;
alter table decisions add constraint decisions_auto_resolve_strategy_check
  check (auto_resolve_strategy in ('tagro_default','escalate_only','hold'));

alter table decisions drop constraint if exists decisions_due_source_check;
alter table decisions add constraint decisions_due_source_check
  check (effective_due_source is null or effective_due_source in
    ('deadline_hard','blocking_horizon','deliberation_floor','type_default'));

create index if not exists idx_decisions_tick_due
  on decisions(status, auto_resolve_at)
  where status in ('pending_client','awaiting_clarification');
create index if not exists idx_decisions_tick_reminder
  on decisions(status, next_reminder_at)
  where status in ('pending_client','awaiting_clarification');
create index if not exists idx_decisions_queued
  on decisions(project_id) where queued;


-- ── 2. decision_policy (per-project tuning) ──────────────────────────────────
create table if not exists decision_policy (
  project_id uuid primary key references projects(id) on delete cascade,
  max_open_client_decisions int not null default 3,
  quiet_hours_start int not null default 21,         -- local hour [0..23]
  quiet_hours_end int not null default 8,
  timezone text not null default 'Europe/Berlin',
  escalate_after_reminders int not null default 2,
  -- Deliberation defaults by door (hours).
  deliberation_hours_two_way numeric not null default 18,
  deliberation_hours_one_way numeric not null default 60,
  deliberation_hours_clarification numeric not null default 6,
  -- Reminder cadence by tier (hours between nudges).
  reminder_cadence_critical_h numeric not null default 6,
  reminder_cadence_high_h numeric not null default 24,
  reminder_cadence_normal_h numeric not null default 48,
  reminder_cadence_low_h numeric not null default 96,
  -- Fallback window when nothing anchors the deadline (hours).
  type_default_window_h numeric not null default 72,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table decision_policy enable row level security;
do $$ begin
  create policy decision_policy_project_read on decision_policy for select using (
    exists (
      select 1 from projects p
       where p.id = decision_policy.project_id
         and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
    )
  );
exception when duplicate_object then null; end $$;

-- Resolved policy: always returns exactly one row, falling back to defaults
-- when a project has no explicit policy. Used by the engine everywhere.
create or replace function decision_policy_resolved(p_project uuid)
returns table(
  max_open int, qstart int, qend int, tz text, escalate_after int,
  delib_two numeric, delib_one numeric, delib_clar numeric,
  cad_crit numeric, cad_high numeric, cad_norm numeric, cad_low numeric,
  type_window numeric
) language sql stable as $$
  select
    coalesce(dp.max_open_client_decisions, 3),
    coalesce(dp.quiet_hours_start, 21),
    coalesce(dp.quiet_hours_end, 8),
    coalesce(dp.timezone, 'Europe/Berlin'),
    coalesce(dp.escalate_after_reminders, 2),
    coalesce(dp.deliberation_hours_two_way, 18),
    coalesce(dp.deliberation_hours_one_way, 60),
    coalesce(dp.deliberation_hours_clarification, 6),
    coalesce(dp.reminder_cadence_critical_h, 6),
    coalesce(dp.reminder_cadence_high_h, 24),
    coalesce(dp.reminder_cadence_normal_h, 48),
    coalesce(dp.reminder_cadence_low_h, 96),
    coalesce(dp.type_default_window_h, 72)
  from (select 1) o
  left join decision_policy dp on dp.project_id = p_project;
$$;


-- ── 3. notification helper ───────────────────────────────────────────────────
create or replace function _decision_notify(
  p_user uuid, p_project uuid, p_decision uuid,
  p_type text, p_title text, p_body text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into notifications(user_id, project_id, kind, type, title, body, link, payload)
  values (
    p_user, p_project, p_type, p_type, p_title,
    left(coalesce(p_body, ''), 300),
    '/decisions?open=' || p_decision::text,
    jsonb_build_object('decision_id', p_decision)
  );
end $$;


-- ── 4. decision_recompute — derive due_at + urgency for one decision ─────────
create or replace function decision_recompute(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  d decisions;
  pol record;
  eff_delib numeric;
  floor_ts timestamptz;
  cand timestamptz;
  src text;
  lead interval;
  blocked_cnt int := 0;
  max_w int := 0;
  h numeric;
  score numeric := 0;
  tier text;
  tw numeric;
begin
  select * into d from decisions where id = p_id;
  if not found then return; end if;
  -- Only scheduled while it needs an answer.
  if d.status not in ('pending_client','awaiting_clarification') then return; end if;

  select * into pol from decision_policy_resolved(d.project_id);

  -- Effective deliberation window (clarification < two-way < one-way).
  if d.decision_type = 'clarification' then eff_delib := pol.delib_clar;
  elsif d.reversibility = 'one_way_door' then eff_delib := pol.delib_one;
  else eff_delib := pol.delib_two;
  end if;
  eff_delib := coalesce(d.deliberation_hours, eff_delib);

  lead := make_interval(days => coalesce(d.lead_time_days, 0));
  floor_ts := coalesce(d.surfaced_at, d.created_at) + make_interval(secs => (eff_delib * 3600)::int);

  -- due_at = min(deadline_hard − lead, blocking_horizon − lead), floored to the
  -- deliberation floor; falls back to surfaced_at + type_default_window.
  cand := null; src := null;
  if d.deadline_hard is not null then
    cand := d.deadline_hard - lead; src := 'deadline_hard';
  end if;
  if d.blocking_horizon is not null then
    if cand is null or (d.blocking_horizon - lead) < cand then
      cand := d.blocking_horizon - lead; src := 'blocking_horizon';
    end if;
  end if;

  if cand is not null then
    if floor_ts > cand then cand := floor_ts; src := 'deliberation_floor'; end if;
  else
    cand := coalesce(d.surfaced_at, d.created_at) + make_interval(secs => (pol.type_window * 3600)::int);
    src := 'type_default';
  end if;

  -- Blocked-task breadth + severity (tasks carry no dates, so this only feeds
  -- urgency, never the deadline).
  select
    count(*) filter (
      where t.completed_at is null
        and coalesce(t.status, '') not in ('done','completed','cancelled','archived')
    ),
    coalesce(max(case t.priority
        when 'critical' then 4 when 'high' then 3 when 'medium' then 2 when 'low' then 1 else 2 end), 0)
    into blocked_cnt, max_w
  from decision_links dl
  join tasks t on t.id = dl.target_id
  where dl.decision_id = p_id and dl.link_kind = 'blocks' and dl.target_kind = 'task';

  -- Urgency score (0..100). Mirror of docs §4.
  h := extract(epoch from (cand - now())) / 3600.0;
  if h <= 0 then
    score := 60 + least(15, (-h) / 4.0);                 -- overdue: 60+
  else
    score := 55 * (24.0 / (24.0 + h));                   -- convex ramp → ~55 at due
  end if;

  score := score + least(20, blocked_cnt * 5);           -- breadth
  score := score + least(16, 4 * max_w);                 -- severity
  if d.reversibility = 'one_way_door' then score := score + 12; end if;  -- door

  tw := case d.decision_type
          when 'legal' then 16 when 'contract' then 16
          when 'data_protection' then 14
          when 'payment' then 12 when 'escalation' then 12
          when 'scope' then 8 when 'budget' then 8
          else 0 end;
  score := score + tw;                                   -- type weight

  if coalesce(d.cost_of_delay_per_day, 0) > 0 then
    score := score + least(12, ln(1 + d.cost_of_delay_per_day) * 2);   -- €/day, log-scaled
  end if;
  score := score + least(10, coalesce(d.reminder_count, 0) * 3);        -- silence

  score := greatest(0, least(100, score));

  if score >= 75 then tier := 'critical';
  elsif score >= 50 then tier := 'high';
  elsif score >= 25 then tier := 'normal';
  else tier := 'low';
  end if;

  -- Hard overrides.
  if d.deadline_hard is not null then
    if d.deadline_hard - now() <= interval '6 hours' then tier := 'critical';
    elsif d.deadline_hard - now() <= interval '24 hours' and tier in ('low','normal') then tier := 'high';
    end if;
  end if;
  if now() >= cand then tier := 'critical'; end if;       -- overdue

  update decisions set
    due_at = cand,
    effective_due_source = src,
    auto_resolve_at = greatest(cand, floor_ts),
    urgency_score = round(score, 1),
    urgency = tier,
    next_reminder_at = coalesce(next_reminder_at, floor_ts),
    updated_at = now()
  where id = p_id;
end $$;


-- ── 5. transition RPCs (canonical, SECURITY DEFINER) ─────────────────────────

-- Publish a framed decision to its decider. Enforces the open-decision cap:
-- normal/low decisions queue (invisible) when the client is already at the cap.
create or replace function decision_publish(p_decision uuid, p_actor uuid default null)
returns decisions language plpgsql security definer set search_path = public as $$
declare d decisions; pol record; open_cnt int; do_queue boolean := false;
begin
  select * into d from decisions where id = p_decision;
  if not found then raise exception 'decision % not found', p_decision; end if;
  if d.status not in ('drafted','pending_client') then return d; end if;

  select * into pol from decision_policy_resolved(d.project_id);
  select count(*) into open_cnt from decisions
    where project_id = d.project_id and status = 'pending_client'
      and visible_to_client and not queued and id <> p_decision;
  if open_cnt >= pol.max_open and coalesce(d.urgency, 'normal') in ('low','normal') then
    do_queue := true;
  end if;

  update decisions set
    status = 'pending_client',
    surfaced_at = case when do_queue then surfaced_at else coalesce(surfaced_at, now()) end,
    visible_to_client = not do_queue,
    queued = do_queue,
    next_reminder_at = null
  where id = p_decision;

  if not do_queue then perform decision_recompute(p_decision); end if;
  select * into d from decisions where id = p_decision;
  return d;
end $$;

-- Record a clarification request and park the decision until it's answered.
-- direction: 'to_client' (dev → client) | 'to_dev' (client → dev/owner).
create or replace function decision_request_clarification(
  p_decision uuid, p_question text, p_direction text default 'to_client', p_actor uuid default null
) returns decisions language plpgsql security definer set search_path = public as $$
declare d decisions;
begin
  update decisions set status = 'awaiting_clarification', updated_at = now()
   where id = p_decision returning * into d;
  if not found then raise exception 'decision % not found', p_decision; end if;
  insert into decision_events(decision_id, event_type, actor_user_id, actor_kind, payload)
  values (p_decision, 'clarification_requested', p_actor,
          case when p_actor is null then 'tagro' else 'user' end,
          jsonb_build_object('question', p_question, 'direction', p_direction));
  return d;
end $$;

-- Resolve a clarification and re-surface the decision.
create or replace function decision_resolve_clarification(
  p_decision uuid, p_answer text, p_actor uuid default null
) returns decisions language plpgsql security definer set search_path = public as $$
declare d decisions;
begin
  update decisions set status = 'pending_client', updated_at = now()
   where id = p_decision returning * into d;
  if not found then raise exception 'decision % not found', p_decision; end if;
  insert into decision_events(decision_id, event_type, actor_user_id, actor_kind, payload)
  values (p_decision, 'clarification_resolved', p_actor,
          case when p_actor is null then 'tagro' else 'user' end,
          jsonb_build_object('answer', p_answer));
  perform decision_recompute(p_decision);
  return d;
end $$;

-- A human (client or owner) records the binding answer.
create or replace function decision_decide(
  p_decision uuid, p_response jsonb, p_rationale text default null, p_actor uuid default null
) returns decisions language plpgsql security definer set search_path = public as $$
declare d decisions;
begin
  update decisions set
    response_value = p_response,
    rationale = left(p_rationale, 4000),
    decided_by = p_actor,
    decided_at = now(),
    status = 'decided',
    updated_at = now()
  where id = p_decision returning * into d;
  if not found then raise exception 'decision % not found', p_decision; end if;
  return d;
end $$;

-- Client hands the call to Tagro. Allowed only on a reversible, non-compliance
-- decision that carries a recommendation.
create or replace function decision_delegate(p_decision uuid, p_actor uuid default null)
returns decisions language plpgsql security definer set search_path = public as $$
declare d decisions; rec_opt decision_options;
begin
  select * into d from decisions where id = p_decision;
  if not found then raise exception 'decision % not found', p_decision; end if;
  if not d.delegate_allowed
     or d.reversibility <> 'two_way_door'
     or d.decision_type in ('legal','contract','payment','data_protection') then
    raise exception 'delegation not allowed for decision %', p_decision;
  end if;
  select * into rec_opt from decision_options
    where decision_id = p_decision and recommended_by_tagro order by ordinal limit 1;
  if not found then raise exception 'no recommended option to delegate for %', p_decision; end if;

  update decisions set
    status = 'decided',
    response_value = jsonb_build_object('selected_option_id', coalesce(rec_opt.external_id, rec_opt.id::text)),
    selected_option = rec_opt.client_label,
    decided_by = null,
    decided_at = now(),
    tagro_delegation_reason = 'client_delegated',
    override_window_until = now() + interval '24 hours',
    updated_at = now()
  where id = p_decision returning * into d;
  return d;
end $$;

-- Owner overrides a Tagro-default / delegated decision inside the 24h window.
create or replace function decision_owner_override(
  p_decision uuid, p_response jsonb, p_actor uuid default null
) returns decisions language plpgsql security definer set search_path = public as $$
declare d decisions;
begin
  update decisions set
    response_value = p_response,
    decided_by = p_actor,
    decided_at = now(),
    approved_by_owner = p_actor,
    approved_by_owner_at = now(),
    tagro_delegation_reason = null,
    status = 'decided',
    updated_at = now()
  where id = p_decision
    and override_window_until is not null and override_window_until > now()
  returning * into d;
  if not found then raise exception 'no open override window for decision %', p_decision; end if;
  insert into decision_events(decision_id, event_type, actor_user_id, actor_kind, payload)
  values (p_decision, 'overridden', p_actor, 'user', jsonb_build_object('response', p_response));
  return d;
end $$;

-- Mark a decided decision as applied (work can proceed).
create or replace function decision_apply(p_decision uuid, p_actor uuid default null)
returns decisions language plpgsql security definer set search_path = public as $$
declare d decisions;
begin
  update decisions set status = 'applied', applied_at = now(), updated_at = now()
   where id = p_decision returning * into d;
  if not found then raise exception 'decision % not found', p_decision; end if;
  return d;
end $$;


-- ── 6. decisions_tick() — the heartbeat ──────────────────────────────────────
-- Recompute schedule, promote queued decisions, send reminders (respecting the
-- first-nudge delay, quiet hours, and per-tier cadence), escalate on silence,
-- and auto-resolve at the deadline ONLY where the classification permits it.
create or replace function decisions_tick()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r decisions;
  pol record;
  rec_opt decision_options;
  proj record;
  open_cnt int;
  cad numeric;
  loc timestamp;
  lh int;
  next_local timestamp;
  n_reminders int := 0;
  n_escalated int := 0;
  n_autoresolved int := 0;
  n_promoted int := 0;
  tier text;
begin
  for r in
    select * from decisions
     where status in ('pending_client','awaiting_clarification')
     order by created_at
     for update skip locked
  loop
    if r.surfaced_at is null then
      update decisions set surfaced_at = created_at where id = r.id;
      r.surfaced_at := r.created_at;
    end if;

    perform decision_recompute(r.id);
    select * into r from decisions where id = r.id;
    select * into pol from decision_policy_resolved(r.project_id);
    select user_id, client_id, title into proj from projects where id = r.project_id;

    -- Promote a queued decision when a slot frees (high/critical bypass the cap).
    if r.queued then
      select count(*) into open_cnt from decisions
        where project_id = r.project_id and status = 'pending_client'
          and visible_to_client and not queued;
      if open_cnt < pol.max_open or r.urgency in ('high','critical') then
        update decisions set queued = false, visible_to_client = true,
               surfaced_at = coalesce(surfaced_at, now()), next_reminder_at = null
         where id = r.id;
        n_promoted := n_promoted + 1;
      end if;
      continue;  -- never nudge a queued (or just-promoted) decision this tick
    end if;

    -- Deadline reached: auto-resolve where allowed, else escalate & hold.
    if r.status = 'pending_client' and r.auto_resolve_at is not null and now() >= r.auto_resolve_at then
      if r.reversibility = 'two_way_door'
         and r.auto_resolve_strategy = 'tagro_default'
         and r.decision_type not in ('legal','contract','payment','data_protection') then
        select * into rec_opt from decision_options
          where decision_id = r.id and recommended_by_tagro order by ordinal limit 1;
        if found then
          update decisions set
            status = 'decided',
            response_value = jsonb_build_object('selected_option_id', coalesce(rec_opt.external_id, rec_opt.id::text)),
            selected_option = rec_opt.client_label,
            decided_by = null,
            decided_at = now(),
            tagro_delegation_reason = 'auto_resolved_after_deadline',
            override_window_until = now() + interval '24 hours',
            escalation_level = 3,
            urgency = 'high'
          where id = r.id;
          perform _decision_notify(proj.user_id, r.project_id, r.id, 'decision_auto_resolved',
            'Tagro hat entschieden: ' || coalesce(r.client_title, r.title),
            'Keine Antwort bis zur Frist — Tagro hat die empfohlene Option gewählt. 24 h Override-Fenster offen.');
          if proj.client_id is not null then
            perform _decision_notify(proj.client_id, r.project_id, r.id, 'decision_auto_resolved',
              'Entscheidung automatisch getroffen: ' || coalesce(r.client_title, r.title),
              'Wir haben die empfohlene Option gewählt. Du kannst das in den nächsten 24 h ändern.');
          end if;
          n_autoresolved := n_autoresolved + 1;
          continue;
        end if;
      end if;
      -- Not eligible (one-way / compliance / escalate_only / hold / no rec): escalate.
      if r.escalation_level < 3 then
        update decisions set urgency = 'critical', escalation_level = greatest(escalation_level, 2)
         where id = r.id;
        perform _decision_notify(proj.user_id, r.project_id, r.id, 'decision_escalated',
          'Eskalation: ' || coalesce(r.internal_title, r.title),
          'Frist erreicht, keine Antwort. Bitte direkt klären oder Autorität neu zuweisen.');
        n_escalated := n_escalated + 1;
      end if;
      continue;
    end if;

    -- Reminder due?
    if r.next_reminder_at is not null and now() >= r.next_reminder_at then
      tier := r.urgency;

      -- Quiet hours defer everything except critical to the next morning.
      if tier <> 'critical' then
        loc := now() at time zone pol.tz;
        lh := extract(hour from loc)::int;
        if (lh >= pol.qstart or lh < pol.qend) then
          if lh >= pol.qstart then
            next_local := date_trunc('day', loc) + interval '1 day' + make_interval(hours => pol.qend);
          else
            next_local := date_trunc('day', loc) + make_interval(hours => pol.qend);
          end if;
          update decisions set next_reminder_at = (next_local at time zone pol.tz) where id = r.id;
          continue;
        end if;
      end if;

      cad := case tier
               when 'critical' then pol.cad_crit when 'high' then pol.cad_high
               when 'normal' then pol.cad_norm else pol.cad_low end;

      perform _decision_notify(
        coalesce(r.requested_for, proj.client_id, proj.user_id),
        r.project_id, r.id, 'decision_reminder',
        'Erinnerung: ' || coalesce(r.client_title, r.title),
        coalesce(r.client_summary, ''));

      update decisions set
        reminder_count = reminder_count + 1,
        last_reminded_at = now(),
        next_reminder_at = now() + make_interval(secs => (cad * 3600)::int),
        escalation_level = greatest(escalation_level, 1)
      where id = r.id;
      n_reminders := n_reminders + 1;

      -- Escalate to the owner after N silent reminders.
      if (r.reminder_count + 1) >= pol.escalate_after and r.escalation_level < 2 then
        update decisions set escalation_level = 2 where id = r.id;
        perform _decision_notify(proj.user_id, r.project_id, r.id, 'decision_escalated',
          'Eskalation: ' || coalesce(r.internal_title, r.title),
          'Mehrfach erinnert, keine Antwort vom Kunden. Bitte nachfassen.');
        n_escalated := n_escalated + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true, 'at', now(),
    'reminders', n_reminders, 'escalated', n_escalated,
    'auto_resolved', n_autoresolved, 'promoted', n_promoted);
end $$;


-- ── 7. grants ────────────────────────────────────────────────────────────────
grant execute on function decision_policy_resolved(uuid) to authenticated, service_role;
grant execute on function decision_recompute(uuid) to service_role;
grant execute on function decision_publish(uuid, uuid) to authenticated, service_role;
grant execute on function decision_request_clarification(uuid, text, text, uuid) to authenticated, service_role;
grant execute on function decision_resolve_clarification(uuid, text, uuid) to authenticated, service_role;
grant execute on function decision_decide(uuid, jsonb, text, uuid) to authenticated, service_role;
grant execute on function decision_delegate(uuid, uuid) to authenticated, service_role;
grant execute on function decision_owner_override(uuid, jsonb, uuid) to authenticated, service_role;
grant execute on function decision_apply(uuid, uuid) to authenticated, service_role;
grant execute on function decisions_tick() to service_role;


-- ── 8. heartbeat schedule (best-effort; ignored if pg_cron absent) ───────────
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('decisions-tick', '*/5 * * * *', 'select decisions_tick();');
  end if;
exception when others then null; end $$;
