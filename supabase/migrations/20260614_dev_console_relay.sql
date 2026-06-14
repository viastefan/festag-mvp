-- ─────────────────────────────────────────────────────────────────────────────
-- Dev Console Relay — WP1
--
-- The Tagro composer relay: a developer writes freely, Tagro decomposes the
-- message, translates each part for the client, and routes it to the right
-- client surface. This migration adds the persistence + badge plumbing:
--   1. dev_relay_dispatches — the send-ledger (one row per dispatched part)
--   2. message_assets       — assets attached to a console message pre-dispatch
--   3. multiple tagro threads per project (AI-style chat history) via a partial
--      unique index, with ensure_inbox_thread rewritten to keep working
--   4. client_inbox_counts / mark_inbox_read — per-category client badge counts
--
-- Depends on 20260614_inbox_relay_enums.sql (new category/type values).
-- Additive + idempotent. Reuses inbox_threads/inbox_items, project_assets.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. dev_relay_dispatches (send-ledger) ────────────────────────────────────
create table if not exists dev_relay_dispatches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  developer_id uuid references auth.users(id) on delete set null,
  source_item_id uuid references inbox_items(id) on delete set null,  -- the dev message
  relay_kind text not null,   -- status_update|decision|client_task|client_message|internal_note
  client_text text,
  internal_text text,
  decision_id uuid references decisions(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  status_report_id uuid references status_reports(id) on delete set null,
  client_inbox_item_id uuid references inbox_items(id) on delete set null,
  asset_ids uuid[] not null default '{}',           -- project_assets sent along
  ledger_task_id uuid references tasks(id) on delete set null,  -- the auto-checked proof task
  dispatch_hash text,                                -- idempotency: kind + client_text per source item
  dispatched_at timestamptz,                         -- null = proposed, not yet sent
  created_at timestamptz not null default now()
);

create index if not exists idx_relay_dispatches_project on dev_relay_dispatches(project_id, created_at desc);
create index if not exists idx_relay_dispatches_dev on dev_relay_dispatches(developer_id, dispatched_at);
create index if not exists idx_relay_dispatches_source on dev_relay_dispatches(source_item_id);
create unique index if not exists ux_relay_dispatch_hash
  on dev_relay_dispatches(source_item_id, dispatch_hash)
  where dispatched_at is not null and dispatch_hash is not null;

alter table dev_relay_dispatches enable row level security;
do $$ begin
  create policy dev_relay_dispatches_read on dev_relay_dispatches for select using (
    exists (select 1 from projects p where p.id = dev_relay_dispatches.project_id
      and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id)))
  );
exception when duplicate_object then null; end $$;


-- ── 2. message_assets (attachments on a console message, pre-dispatch) ───────
create table if not exists message_assets (
  id uuid primary key default gen_random_uuid(),
  inbox_item_id uuid not null references inbox_items(id) on delete cascade,
  asset_id uuid not null references project_assets(id) on delete cascade,
  send_to_client boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists ux_message_assets on message_assets(inbox_item_id, asset_id);
create index if not exists idx_message_assets_item on message_assets(inbox_item_id);

alter table message_assets enable row level security;
do $$ begin
  create policy message_assets_read on message_assets for select using (
    exists (select 1 from inbox_items i join projects p on p.id = i.project_id
      where i.id = message_assets.inbox_item_id
        and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id)))
  );
exception when duplicate_object then null; end $$;


-- ── 3. multiple tagro threads per project (chat history) ─────────────────────
-- The single-thread-per-category constraint blocks "New chat". Replace it with
-- a partial unique that keeps one thread per category for the badge categories
-- (decision/status_update/task_event/message/client/…) but allows many tagro
-- threads. ensure_inbox_thread is rewritten to match.
alter table inbox_threads add column if not exists pinned boolean not null default false;

alter table inbox_threads drop constraint if exists inbox_threads_user_id_project_id_category_key;
create unique index if not exists inbox_threads_one_per_category
  on inbox_threads(user_id, project_id, category)
  where category <> 'tagro';

create or replace function ensure_inbox_thread(
  p_user_id uuid, p_project_id uuid, p_category inbox_thread_category,
  p_title text, p_summary text default null, p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  -- tagro is multi-thread: reuse the latest thread for back-compat callers
  -- (ai/chat etc.); the Dev Console creates explicit threads via dev_console_thread().
  if p_category = 'tagro' then
    select id into v_id from inbox_threads
     where user_id = p_user_id and project_id = p_project_id and category = 'tagro'
     order by coalesce(last_item_at, created_at) desc limit 1;
    if v_id is null then
      insert into inbox_threads(user_id, project_id, category, title, summary, metadata)
      values (p_user_id, p_project_id, 'tagro', coalesce(p_title, 'Tagro Chat'), p_summary, coalesce(p_metadata, '{}'::jsonb))
      returning id into v_id;
    end if;
    return v_id;
  end if;

  insert into inbox_threads(user_id, project_id, category, title, summary, metadata)
  values (p_user_id, p_project_id, p_category, p_title, p_summary, coalesce(p_metadata, '{}'::jsonb))
  on conflict (user_id, project_id, category) where category <> 'tagro'
  do update set title = coalesce(excluded.title, inbox_threads.title),
                summary = coalesce(excluded.summary, inbox_threads.summary),
                metadata = inbox_threads.metadata || excluded.metadata,
                updated_at = now()
  returning id into v_id;
  return v_id;
end $$;

-- Get-or-create a specific Dev Console (tagro) chat thread.
--   p_thread_id set + owned → reuse it
--   p_new = true            → always a fresh thread
--   else                    → latest tagro thread, or a fresh one
create or replace function dev_console_thread(
  p_developer uuid, p_project uuid,
  p_thread_id uuid default null, p_new boolean default false, p_title text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_thread_id is not null then
    select id into v_id from inbox_threads
      where id = p_thread_id and user_id = p_developer and category = 'tagro';
    if v_id is not null then return v_id; end if;
  end if;
  if not p_new then
    select id into v_id from inbox_threads
      where user_id = p_developer and project_id = p_project and category = 'tagro'
      order by coalesce(last_item_at, created_at) desc limit 1;
    if v_id is not null then return v_id; end if;
  end if;
  insert into inbox_threads(user_id, project_id, category, title, summary, metadata)
  values (p_developer, p_project, 'tagro', coalesce(nullif(p_title, ''), 'Neuer Chat'), null, '{}'::jsonb)
  returning id into v_id;
  return v_id;
end $$;


-- ── 4. client badge RPCs ─────────────────────────────────────────────────────
-- Unread client inbox items for the calling user, per relay surface.
create or replace function client_inbox_counts(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); rec record;
begin
  select
    count(*) filter (where category = 'decision')      as decision,
    count(*) filter (where category = 'status_update') as status_update,
    count(*) filter (where category = 'task_event')    as task_event,
    count(*) filter (where category = 'message')       as message,
    count(*)                                            as total
  into rec
  from inbox_items
  where user_id = v_uid and project_id = p_project_id and read_at is null
    and category in ('decision','status_update','task_event','message');

  return jsonb_build_object(
    'decision',      coalesce(rec.decision, 0),
    'status_update', coalesce(rec.status_update, 0),
    'task_event',    coalesce(rec.task_event, 0),
    'message',       coalesce(rec.message, 0),
    'total',         coalesce(rec.total, 0)
  );
end $$;

-- Mark every open item in a thread read for the caller, zero the unread badge.
create or replace function mark_inbox_read(p_thread_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  update inbox_items set read_at = now()
   where thread_id = p_thread_id and user_id = v_uid and read_at is null;
  update inbox_threads set unread_count = 0, updated_at = now()
   where id = p_thread_id and user_id = v_uid;
end $$;


-- ── 5. grants ────────────────────────────────────────────────────────────────
grant execute on function ensure_inbox_thread(uuid, uuid, inbox_thread_category, text, text, jsonb) to authenticated, service_role;
grant execute on function dev_console_thread(uuid, uuid, uuid, boolean, text) to authenticated, service_role;
grant execute on function client_inbox_counts(uuid) to authenticated, service_role;
grant execute on function mark_inbox_read(uuid) to authenticated, service_role;
