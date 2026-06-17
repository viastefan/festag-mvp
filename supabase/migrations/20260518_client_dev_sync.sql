-- Festag — Client ↔ Dev synchronisation layer
--
-- Adds the moving parts needed to keep the developer workspace and the
-- client workspace in lock-step without leaking technical detail:
--
--   • notifications — extend the existing table with project_id, task_id,
--                     audience, kind, body, payload, read_at. The legacy
--                     `type`/`message`/`read` columns stay so older surfaces
--                     keep working.
--   • client_request flow — new RLS policy on `tasks` lets clients insert
--                            rows with `task_type='client_request'` on
--                            projects they belong to.
--   • task_activity_logs — client-side read policy so visible_to_client
--                          entries surface in the client workspace.
--   • sync_task_client_status() trigger — keeps `client_visible_status` in
--                                          sync with `dev_status` / `status`
--                                          even if the row is updated
--                                          outside the /api/dev/tasks/* path.
--   • backfill — populate client_visible_status for legacy rows.

-- ── notifications: additive extension ──────────────────────────
alter table notifications add column if not exists project_id uuid references projects(id) on delete cascade;
alter table notifications add column if not exists task_id uuid references tasks(id) on delete cascade;
alter table notifications add column if not exists audience text not null default 'auto';
alter table notifications add column if not exists kind text;
alter table notifications add column if not exists body text;
alter table notifications add column if not exists payload jsonb not null default '{}'::jsonb;
alter table notifications add column if not exists read_at timestamptz;

update notifications set kind = coalesce(kind, type), body = coalesce(body, message) where kind is null or body is null;

create index if not exists idx_notifications_user_unread
  on notifications(user_id, created_at desc) where read = false;
create index if not exists idx_notifications_user_all on notifications(user_id, created_at desc);
create index if not exists idx_notifications_project on notifications(project_id, created_at desc) where project_id is not null;

alter table notifications enable row level security;

drop policy if exists notif_self_read on notifications;
create policy notif_self_read on notifications for select
  using (auth.uid() = user_id);

drop policy if exists notif_self_update on notifications;
create policy notif_self_update on notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists notif_admin_read on notifications;
create policy notif_admin_read on notifications for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner')));

-- ── tasks: client request RLS ──────────────────────────────────
do $$ begin
  create policy tasks_client_request_insert on tasks for insert
    with check (
      task_type = 'client_request'
      and exists (
        select 1 from projects p
         where p.id = tasks.project_id
           and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
      )
    );
exception when duplicate_object then null; end $$;

-- ── task_activity_logs: client read policy ─────────────────────
drop policy if exists tal_client_read on task_activity_logs;
create policy tal_client_read on task_activity_logs for select
  using (
    visible_to_client = true
    and exists (
      select 1 from tasks t join projects p on p.id = t.project_id
       where t.id = task_activity_logs.task_id
         and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
    )
  );

-- ── sync_task_client_status trigger ────────────────────────────
create or replace function sync_task_client_status()
returns trigger
language plpgsql
as $$
declare
  v_flow text := coalesce(new.dev_status, new.status, '');
  v_client text;
begin
  v_client := case
    when v_flow in ('done','completed','approved_by_owner') then 'completed'
    when v_flow in ('verified_by_tagro','finished_by_dev','needs_review','review','ready_review','ready_for_review','in_review') then 'in_review'
    when v_flow in ('blocked','waiting') then 'waiting'
    when v_flow in ('cancelled') then 'on_hold'
    when v_flow in ('in_progress','doing','active','accepted') then 'in_progress'
    else 'planned'
  end;
  if new.client_visible_status is distinct from v_client then
    new.client_visible_status := v_client;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_task_client_status on tasks;
create trigger trg_sync_task_client_status
before insert or update of status, dev_status on tasks
for each row execute function sync_task_client_status();

-- ── backfill ───────────────────────────────────────────────────
update tasks
   set client_visible_status =
     case
       when coalesce(dev_status, status, '') in ('done','completed','approved_by_owner') then 'completed'
       when coalesce(dev_status, status, '') in ('verified_by_tagro','finished_by_dev','needs_review','review','ready_review','ready_for_review','in_review') then 'in_review'
       when coalesce(dev_status, status, '') in ('blocked','waiting') then 'waiting'
       when coalesce(dev_status, status, '') in ('cancelled') then 'on_hold'
       when coalesce(dev_status, status, '') in ('in_progress','doing','active','accepted') then 'in_progress'
       else 'planned'
     end
 where client_visible_status is null;
