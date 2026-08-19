-- ═══════════════════════════════════════════════════════════════════════════
-- Festag — Tasks System v1
--
-- Before this migration the task lifecycle existed only in TypeScript
-- (`lib/tasks/work-types.ts`). The database contradicted it:
--
--   • `due_date` was inserted + selected by the product but never existed
--     → every client task creation AND the whole task list query threw.
--   • `tasks_status_check` allowed only todo|doing|done while the code
--     wrote 'waiting' / 'blocked' / 'review' → constraint violation.
--   • `client_visible_status`, `progress`, `completed_at` were written by
--     hand in ~10 places and drifted apart.
--
-- This migration makes the state machine real and server-side:
--
--   dev_status  = canonical execution lifecycle (DevFlow, constrained)
--        ↓ trigger
--   client_visible_status · status · progress · lifecycle timestamps
--
-- Any write — new API, legacy code, direct Supabase call — is normalised
-- into a legal state instead of throwing. Self-healing, not brittle.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · columns the product already writes ────────────────────────────────
alter table tasks add column if not exists due_date date;
alter table tasks add column if not exists started_at timestamptz;
alter table tasks add column if not exists blocked_reason text;
alter table tasks add column if not exists cancelled_at timestamptz;

-- ── 2 · lifecycle helper functions (mirror of lib/tasks/work-types.ts) ────
create or replace function festag_task_devflow(p_raw text)
returns text language plpgsql immutable as $$
declare v text := lower(trim(coalesce(p_raw, '')));
begin
  if v = '' then return null; end if;
  if v in ('new','assigned','in_progress','needs_review','blocked','on_hold',
           'finished_by_dev','verified_by_tagro','approved_by_owner',
           'completed','cancelled') then return v; end if;
  if v in ('done','delivered','erledigt','complete')             then return 'completed'; end if;
  if v in ('approved','owner_approved')                          then return 'approved_by_owner'; end if;
  if v in ('verified','tagro_verified')                          then return 'verified_by_tagro'; end if;
  if v in ('finished','submitted_for_review','ready')            then return 'finished_by_dev'; end if;
  if v in ('review','in_review','ready_review','ready_for_review','prüfung') then return 'needs_review'; end if;
  if v in ('waiting','waiting_for_client','waiting_for_assignment','wartet') then return 'blocked'; end if;
  if v in ('paused','hold','pausiert')                           then return 'on_hold'; end if;
  if v in ('doing','active','accepted','in-progress','wip')      then return 'in_progress'; end if;
  if v in ('todo','open','backlog','submitted','requested','draft','planned') then return 'new'; end if;
  if v in ('cancel','canceled','abgebrochen','rejected')          then return 'cancelled'; end if;
  return null;
end $$;

create or replace function festag_task_client_status(p_flow text)
returns text language sql immutable as $$
  select case p_flow
    when 'in_progress'       then 'in_progress'
    when 'needs_review'      then 'in_review'
    when 'finished_by_dev'   then 'in_review'
    when 'verified_by_tagro' then 'in_review'
    when 'approved_by_owner' then 'completed'
    when 'completed'         then 'completed'
    when 'blocked'           then 'waiting'
    when 'on_hold'           then 'on_hold'
    when 'cancelled'         then 'on_hold'
    else 'planned'
  end
$$;

-- legacy coarse column — kept in sync so old queries keep working
create or replace function festag_task_coarse_status(p_flow text)
returns text language sql immutable as $$
  select case p_flow
    when 'approved_by_owner' then 'done'
    when 'completed'         then 'done'
    when 'cancelled'         then 'cancelled'
    when 'new'               then 'todo'
    when 'assigned'          then 'todo'
    else 'doing'
  end
$$;

create or replace function festag_task_progress(p_flow text)
returns int language sql immutable as $$
  select case p_flow
    when 'in_progress'       then 30
    when 'needs_review'      then 70
    when 'finished_by_dev'   then 80
    when 'verified_by_tagro' then 90
    when 'approved_by_owner' then 100
    when 'completed'         then 100
    else 0
  end
$$;

-- client lens → execution lifecycle (used when someone writes the client view)
create or replace function festag_task_flow_from_client(p_client text, p_current text)
returns text language sql immutable as $$
  select case lower(coalesce(p_client, ''))
    when 'in_progress' then 'in_progress'
    when 'in_review'   then 'needs_review'
    when 'waiting'     then 'blocked'
    when 'on_hold'     then 'on_hold'
    when 'completed'   then 'completed'
    when 'planned'     then 'new'
    else p_current
  end
$$;

-- ── 3 · backfill dev_status from whatever signal each row carries ─────────
update tasks set dev_status = coalesce(
  festag_task_devflow(dev_status),
  festag_task_devflow(client_visible_status),
  festag_task_devflow(status),
  festag_task_devflow(client_status),
  case when assigned_to is not null then 'assigned' else 'new' end
);

alter table tasks alter column dev_status set default 'new';
alter table tasks alter column dev_status set not null;

alter table tasks drop constraint if exists tasks_dev_status_check;
alter table tasks add constraint tasks_dev_status_check check (
  dev_status = any (array['new','assigned','in_progress','needs_review','blocked',
                          'on_hold','finished_by_dev','verified_by_tagro',
                          'approved_by_owner','completed','cancelled'])
);

alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check check (
  status = any (array['todo','doing','done','cancelled'])
);

alter table tasks drop constraint if exists tasks_client_visible_status_check;
alter table tasks add constraint tasks_client_visible_status_check check (
  client_visible_status is null or client_visible_status = any (
    array['planned','in_progress','in_review','waiting','on_hold','completed'])
);

-- ── 4 · the state machine, enforced in the database ───────────────────────
create or replace function festag_tasks_sync_lifecycle()
returns trigger language plpgsql as $$
declare
  v_flow  text;
  v_prev  text;
  v_given text;
  v_explicit_progress boolean := false;
begin
  if tg_op = 'INSERT' then
    v_given := festag_task_devflow(new.dev_status);
    -- 'new' is the column default: treat it as "unspecified" and let the other
    -- signals speak, so legacy inserts that only set `status` land correctly.
    if v_given is null or v_given = 'new' then
      v_flow := coalesce(
        festag_task_devflow(new.client_visible_status),
        festag_task_devflow(new.status),
        festag_task_devflow(new.client_status),
        case when new.assigned_to is not null then 'assigned' else 'new' end
      );
    else
      v_flow := v_given;
    end if;
  else
    v_prev := old.dev_status;
    if new.dev_status is distinct from old.dev_status then
      v_flow := coalesce(festag_task_devflow(new.dev_status), old.dev_status);
    elsif new.client_visible_status is distinct from old.client_visible_status then
      v_flow := coalesce(festag_task_flow_from_client(new.client_visible_status, old.dev_status), old.dev_status);
    elsif new.status is distinct from old.status then
      v_flow := coalesce(festag_task_devflow(new.status), old.dev_status);
    elsif new.client_status is distinct from old.client_status then
      v_flow := coalesce(festag_task_devflow(new.client_status), old.dev_status);
    else
      v_flow := coalesce(festag_task_devflow(old.dev_status), 'new');
    end if;
    v_explicit_progress := new.progress is distinct from old.progress;
  end if;

  new.dev_status            := v_flow;
  new.client_visible_status := festag_task_client_status(v_flow);
  new.status                := festag_task_coarse_status(v_flow);

  -- progress: derived from the lifecycle unless the caller set it explicitly.
  -- blocked / on_hold keep the last known progress (work did not regress).
  if tg_op = 'INSERT' then
    if coalesce(new.progress, 0) = 0 then
      new.progress := festag_task_progress(v_flow);
    end if;
  elsif not v_explicit_progress and v_flow is distinct from v_prev
        and v_flow not in ('blocked', 'on_hold') then
    new.progress := festag_task_progress(v_flow);
  end if;
  new.progress := least(100, greatest(0, coalesce(new.progress, 0)));
  -- invariant: only a delivered task may read 100 %
  if v_flow not in ('approved_by_owner', 'completed') then
    new.progress := least(new.progress, 95);
  end if;

  -- lifecycle timestamps
  if v_flow = 'in_progress'       and new.started_at is null           then new.started_at := now(); end if;
  if v_flow = 'finished_by_dev'   and new.finished_by_dev_at is null   then new.finished_by_dev_at := now(); end if;
  if v_flow = 'verified_by_tagro' and new.verified_by_tagro_at is null then new.verified_by_tagro_at := now(); end if;
  if v_flow = 'approved_by_owner' and new.approved_by_owner_at is null then new.approved_by_owner_at := now(); end if;

  if v_flow in ('approved_by_owner', 'completed') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif v_flow <> 'cancelled' then
    new.completed_at := null;
  end if;

  if v_flow = 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  else
    new.cancelled_at := null;
  end if;

  -- a blocker reason only survives while the task is actually stuck
  if v_flow not in ('blocked', 'on_hold') then
    new.blocked_reason := null;
  end if;

  new.updated_at := now();
  if tg_op = 'UPDATE' and v_flow is distinct from v_prev then
    new.last_dev_action_at := now();
  end if;

  return new;
end $$;

drop trigger if exists trg_tasks_sync_lifecycle on tasks;
create trigger trg_tasks_sync_lifecycle
  before insert or update on tasks
  for each row execute function festag_tasks_sync_lifecycle();

-- normalise every existing row through the new machine
update tasks set dev_status = dev_status;
update tasks set progress = festag_task_progress(dev_status)
 where progress = 0
   and dev_status in ('in_progress','needs_review','finished_by_dev','verified_by_tagro','approved_by_owner','completed');

-- ── 5 · access: project + workspace members can read and work on tasks ────
drop policy if exists tasks_select_workspace on tasks;
create policy tasks_select_workspace on tasks for select using (
  exists (
    select 1 from projects p
     where p.id = tasks.project_id
       and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
  )
);

drop policy if exists tasks_member_insert on tasks;
create policy tasks_member_insert on tasks for insert with check (
  is_project_member(project_id)
  or exists (
    select 1 from projects p
     where p.id = project_id
       and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
  )
);

drop policy if exists tasks_member_update on tasks;
create policy tasks_member_update on tasks for update using (
  is_project_member(project_id)
  or exists (
    select 1 from projects p
     where p.id = tasks.project_id
       and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
  )
) with check (
  is_project_member(project_id)
  or exists (
    select 1 from projects p
     where p.id = tasks.project_id
       and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
  )
);

-- deletion stays narrow: project owner, workspace owner or the creator
drop policy if exists tasks_owner_delete on tasks;
create policy tasks_owner_delete on tasks for delete using (
  created_by = auth.uid()
  or exists (
    select 1 from projects p
     where p.id = tasks.project_id
       and (p.user_id = auth.uid() or is_workspace_member(p.workspace_id))
  )
);

-- ── 6 · indexes for the list surfaces ─────────────────────────────────────
create index if not exists idx_tasks_project_updated on tasks(project_id, updated_at desc);
create index if not exists idx_tasks_project_devstatus on tasks(project_id, dev_status);
create index if not exists idx_tasks_assigned_open on tasks(assigned_to)
  where dev_status not in ('completed','approved_by_owner','cancelled');
create index if not exists idx_tasks_due_date on tasks(due_date) where due_date is not null;
create index if not exists idx_tasks_created_by on tasks(created_by) where created_by is not null;
