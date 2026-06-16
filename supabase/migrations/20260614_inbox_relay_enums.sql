-- ─────────────────────────────────────────────────────────────────────────────
-- Dev Console Relay — enum extensions (must run BEFORE the relay migration)
--
-- New enum values can't be USED in the same transaction they're added, so the
-- enum additions live in their own migration. The relay tables, the rewritten
-- ensure_inbox_thread, and client_inbox_counts (next migration) depend on these.
--
-- Client artifacts the Dev Console routes to live in their own inbox category so
-- the client-side badge per nav item is a clean per-category count:
--   decision · status_update · task_event · message
-- (status_update / task_event already existed as inbox_item_type values; here we
--  also add them as inbox_thread_category values, plus decision/message.)
-- ─────────────────────────────────────────────────────────────────────────────

alter type inbox_thread_category add value if not exists 'decision';
alter type inbox_thread_category add value if not exists 'status_update';
alter type inbox_thread_category add value if not exists 'task_event';
alter type inbox_thread_category add value if not exists 'message';

alter type inbox_item_type add value if not exists 'decision';
alter type inbox_item_type add value if not exists 'message';
