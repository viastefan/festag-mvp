-- Festag — Realtime + sync hardening
--
-- 1. RLS write-policies that allow authenticated users to fan task events
--    out themselves, as a fallback when the service-role client is not
--    configured (e.g. local dev). Production still prefers the service
--    role — it bypasses RLS entirely.
--
-- 2. Add the relevant tables to the `supabase_realtime` publication so
--    the client subscriptions in hooks/useNotifications + useRealtimeTasks
--    actually receive postgres_changes.

-- ── task_activity_logs: allow Tagro/system rows where actor_id is null ─
drop policy if exists tal_write on task_activity_logs;
create policy tal_write on task_activity_logs for insert
  with check (
    -- Caller is admin/project_owner — wide-open audit access.
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
    -- Or the row records the caller's own action.
    or actor_id = auth.uid()
    -- Or it's a Tagro/system event that the caller may legitimately
    -- trigger — they must at least be able to see the task.
    or (
      actor_kind in ('tagro','system') and actor_id is null
      and exists (
        select 1 from tasks t
         where t.id = task_activity_logs.task_id
           and (
             t.assigned_to = auth.uid()
             or exists (
               select 1 from project_assignments pa
                where pa.project_id = t.project_id and pa.user_id = auth.uid() and pa.active
             )
           )
      )
    )
  );

-- ── notifications: allow inserts from authenticated callers ────
-- Conservative: the caller can insert a notification *for someone else*
-- only if they share a project, OR they're admin/project_owner. They can
-- always create a notification for themselves (useful for system events
-- triggered by client actions).
drop policy if exists notif_write on notifications;
create policy notif_write on notifications for insert
  with check (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
    or (
      project_id is not null and exists (
        select 1 from projects p
         where p.id = project_id
           and (
             p.user_id = auth.uid()
             or p.client_id = auth.uid()
             or is_workspace_member(p.workspace_id)
             or exists (
               select 1 from project_assignments pa
                where pa.project_id = p.id and pa.user_id = auth.uid() and pa.active
             )
           )
      )
    )
  );

-- ── Realtime publication ───────────────────────────────────────
-- Add the tables our client hooks subscribe to. Idempotent guards keep
-- replays safe even when the publication already covers them.
do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null;
          when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table tasks;
exception when duplicate_object then null;
          when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table task_activity_logs;
exception when duplicate_object then null;
          when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null;
          when others then null; end $$;
