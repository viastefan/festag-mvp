-- ─────────────────────────────────────────────────────────────────────────────
-- Dev Console Relay — WP8: mark a whole inbox category read
--
-- mark_inbox_read(thread) is thread-scoped, but the client surfaces (decisions /
-- tasks / status / messages) aren't project-scoped — opening "Entscheidungen"
-- should clear the badge across every project. This marks all of the caller's
-- unread items of one relay category read and zeroes the affected threads.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function mark_inbox_category_read(p_category inbox_thread_category)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  update inbox_items set read_at = now()
   where user_id = v_uid and category = p_category and read_at is null;

  update inbox_threads t set unread_count = 0, updated_at = now()
   where t.user_id = v_uid and t.category = p_category and t.unread_count > 0;
end $$;

grant execute on function mark_inbox_category_read(inbox_thread_category) to authenticated, service_role;
