-- ════════════════════════════════════════════════════════════════
-- Festag — Project Lifecycle Locks (2026-05-07)
--
-- Implementiert Lösch-Logik:
--   1. Unbegonnen (intake/draft, keine Tasks, kein Payment) → direkt löschen
--   2. Begonnen (Tasks vorhanden) → Warning erforderlich
--   3. Milestone bezahlt → Lock, nur via Support
--
-- Auch: Maintenance-Flat als eigener Milestone-Typ.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. milestones — Erweiterung für Subscription-Typ + paid-tracking
-- ──────────────────────────────────────────────────────────────
alter table milestones
  add column if not exists kind        text default 'milestone'
    check (kind in ('milestone','one_time','maintenance','subscription')),
  add column if not exists currency    text default 'EUR',
  add column if not exists paid_at     timestamptz,
  add column if not exists paid_amount numeric;

-- ──────────────────────────────────────────────────────────────
-- 2. projects — Soft-Delete + Lifecycle-Felder
-- ──────────────────────────────────────────────────────────────
alter table projects
  add column if not exists deleted_at      timestamptz,
  add column if not exists deletion_reason text,
  add column if not exists locked_at       timestamptz,
  add column if not exists locked_reason   text,
  add column if not exists pricing_mode    text default 'managed'
    check (pricing_mode in ('managed','whitelabel'));

create index if not exists idx_projects_active on projects(user_id) where deleted_at is null;

-- ──────────────────────────────────────────────────────────────
-- 3. RPC — project_deletion_state(project_id)
--    Liefert: { state, reason, paid_milestones, total_milestones }
--    state ∈ 'free' | 'warn' | 'locked' | 'already_deleted'
-- ──────────────────────────────────────────────────────────────
create or replace function project_deletion_state(p_project_id uuid)
returns table (
  state text,
  reason text,
  paid_count int,
  task_count int,
  has_paid_milestone bool
)
language plpgsql
security definer
as $$
declare
  v_proj projects%rowtype;
  v_paid int := 0;
  v_tasks int := 0;
begin
  select * into v_proj from projects where id = p_project_id limit 1;
  if not found then
    return query select 'not_found'::text, 'project not found'::text, 0, 0, false;
    return;
  end if;
  if v_proj.deleted_at is not null then
    return query select 'already_deleted'::text, 'project already deleted'::text, 0, 0, false;
    return;
  end if;

  select count(*) into v_paid from milestones
    where project_id = p_project_id and (status = 'paid' or paid_at is not null);
  select count(*) into v_tasks from tasks where project_id = p_project_id;

  if v_paid > 0 then
    return query select 'locked'::text,
                        'Mindestens ein Meilenstein wurde bezahlt — Löschen nur via Support möglich.'::text,
                        v_paid, v_tasks, true;
  elsif v_tasks > 0 or v_proj.assigned_dev is not null or v_proj.status not in ('intake','draft','planning') then
    return query select 'warn'::text,
                        'Projekt ist bereits gestartet — bitte Löschung mit Eingabe des Projektnamens bestätigen.'::text,
                        0, v_tasks, false;
  else
    return query select 'free'::text,
                        'Projekt ist noch nicht gestartet — direktes Löschen möglich.'::text,
                        0, v_tasks, false;
  end if;
end $$;

grant execute on function project_deletion_state(uuid) to authenticated, service_role;

-- ──────────────────────────────────────────────────────────────
-- 4. RPC — soft_delete_project(project_id, confirmation_text)
--    Führt Löschung nur aus wenn:
--      - state = 'free'  (ohne Confirmation)
--      - state = 'warn'  + confirmation_text matcht Projekttitel
--    Bei state = 'locked' immer abgelehnt.
-- ──────────────────────────────────────────────────────────────
create or replace function soft_delete_project(p_project_id uuid, p_confirmation text default null)
returns table (
  ok bool,
  state text,
  reason text
)
language plpgsql
security definer
as $$
declare
  v_proj projects%rowtype;
  v_paid int := 0;
  v_tasks int := 0;
  v_caller uuid := auth.uid();
begin
  select * into v_proj from projects where id = p_project_id limit 1;
  if not found then
    return query select false, 'not_found'::text, 'project not found'::text;
    return;
  end if;
  -- Nur Owner (oder admin) darf löschen
  if v_proj.user_id <> v_caller and not exists (
    select 1 from profiles where id = v_caller and role = 'admin'
  ) then
    return query select false, 'forbidden'::text, 'not project owner'::text;
    return;
  end if;

  select count(*) into v_paid from milestones
    where project_id = p_project_id and (status = 'paid' or paid_at is not null);
  select count(*) into v_tasks from tasks where project_id = p_project_id;

  if v_paid > 0 then
    return query select false, 'locked'::text,
                        'Bezahlte Meilensteine — Löschen via Support erforderlich.'::text;
    return;
  end if;

  if v_tasks > 0 or v_proj.assigned_dev is not null or v_proj.status not in ('intake','draft','planning') then
    if p_confirmation is null or lower(trim(p_confirmation)) <> lower(trim(coalesce(v_proj.title, ''))) then
      return query select false, 'warn'::text,
                          'Bestätigung erforderlich — Projektname eingeben.'::text;
      return;
    end if;
  end if;

  update projects
    set deleted_at = now(),
        deletion_reason = case
          when p_confirmation is null then 'self-delete (free state)'
          else 'self-delete with confirmation'
        end
    where id = p_project_id;

  return query select true, 'deleted'::text, 'project soft-deleted'::text;
end $$;

grant execute on function soft_delete_project(uuid, text) to authenticated, service_role;
