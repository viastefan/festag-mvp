-- Benachrichtigungen: read + preview on inbox_threads for bell badge queries.
-- Idempotent — safe to re-run.

alter table inbox_threads
  add column if not exists read boolean not null default false,
  add column if not exists preview text;

-- Backfill read from unread_count
update inbox_threads
   set read = (unread_count = 0)
 where read is distinct from (unread_count = 0);

-- Backfill preview from summary
update inbox_threads
   set preview = summary
 where preview is null and summary is not null;

create index if not exists idx_inbox_threads_unread
  on inbox_threads (user_id, read)
  where read = false;

-- Keep read in sync when unread_count changes
create or replace function sync_inbox_thread_read()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.read := (new.unread_count = 0);
  return new;
end;
$$;

drop trigger if exists inbox_threads_sync_read on inbox_threads;
create trigger inbox_threads_sync_read
  before insert or update of unread_count on inbox_threads
  for each row execute function sync_inbox_thread_read();
