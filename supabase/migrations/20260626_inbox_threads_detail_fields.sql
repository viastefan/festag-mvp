-- Benachrichtigungen detail fields for thread-level metadata.
-- Idempotent — safe to re-run.

alter table inbox_threads
  add column if not exists sender_name text,
  add column if not exists project_name text,
  add column if not exists original_text text,
  add column if not exists tagro_translation text;

create index if not exists idx_inbox_threads_category
  on inbox_threads (user_id, category);
