-- Festag — Inbox Phase 2, Veyra Memory, Avatar Storage RLS hardening
-- Idempotent migration. Safe to re-run.

-- ──────────────────────────────────────────────────────────────
-- 1. Inbox Phase 2 enums + tables
-- ──────────────────────────────────────────────────────────────
do $$ begin
  create type inbox_thread_category as enum ('tagro','client','team','system','billing','support');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inbox_item_type as enum (
    'chat_message',
    'system_event',
    'project_event',
    'invoice_created',
    'payment_event',
    'guarantee_event',
    'support_event',
    'task_event',
    'status_update'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type inbox_thread_status as enum ('open','archived');
exception when duplicate_object then null; end $$;

create table if not exists inbox_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  category inbox_thread_category not null default 'tagro',
  title text not null,
  summary text,
  status inbox_thread_status not null default 'open',
  last_item_at timestamptz,
  unread_count integer not null default 0 check (unread_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, project_id, category)
);

create table if not exists inbox_items (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references inbox_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  category inbox_thread_category not null default 'tagro',
  type inbox_item_type not null default 'chat_message',
  title text not null,
  body text,
  actor_id uuid references auth.users(id) on delete set null,
  source_table text,
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists inbox_items_source_unique
  on inbox_items(source_table, source_id)
  where source_table is not null and source_id is not null;
create index if not exists idx_inbox_threads_user_last on inbox_threads(user_id, coalesce(last_item_at, created_at) desc);
create index if not exists idx_inbox_threads_project on inbox_threads(project_id) where project_id is not null;
create index if not exists idx_inbox_items_thread_created on inbox_items(thread_id, created_at desc);
create index if not exists idx_inbox_items_user_unread on inbox_items(user_id, created_at desc) where read_at is null;
create index if not exists idx_inbox_items_project on inbox_items(project_id) where project_id is not null;

create or replace function touch_inbox_thread_from_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update inbox_threads
     set last_item_at = greatest(coalesce(last_item_at, new.created_at), new.created_at),
         unread_count = unread_count + case when new.read_at is null then 1 else 0 end,
         updated_at = now()
   where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_inbox_items_touch_thread on inbox_items;
create trigger trg_inbox_items_touch_thread
after insert on inbox_items
for each row execute function touch_inbox_thread_from_item();

create or replace function ensure_inbox_thread(
  p_user_id uuid,
  p_project_id uuid,
  p_category inbox_thread_category,
  p_title text,
  p_summary text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into inbox_threads(user_id, project_id, category, title, summary, metadata)
  values (p_user_id, p_project_id, p_category, p_title, p_summary, coalesce(p_metadata, '{}'::jsonb))
  on conflict (user_id, project_id, category) do update
    set title = coalesce(excluded.title, inbox_threads.title),
        summary = coalesce(excluded.summary, inbox_threads.summary),
        metadata = inbox_threads.metadata || excluded.metadata,
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function create_inbox_item(
  p_user_id uuid,
  p_project_id uuid,
  p_category inbox_thread_category,
  p_type inbox_item_type,
  p_title text,
  p_body text default null,
  p_actor_id uuid default null,
  p_source_table text default null,
  p_source_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread_id uuid;
  v_item_id uuid;
  v_thread_title text;
begin
  if p_user_id is null then
    return null;
  end if;

  v_thread_title := case
    when p_category = 'billing' then 'Abrechnung'
    when p_category = 'system' then 'System'
    when p_category = 'support' then 'Support'
    when p_category = 'client' then 'Client-Kommunikation'
    when p_category = 'team' then 'Team-Kommunikation'
    else 'Veyra Chat'
  end;

  v_thread_id := ensure_inbox_thread(
    p_user_id,
    p_project_id,
    p_category,
    coalesce((p_metadata ->> 'thread_title'), v_thread_title),
    null,
    p_metadata
  );

  insert into inbox_items(
    thread_id, user_id, project_id, category, type, title, body,
    actor_id, source_table, source_id, metadata, created_at
  ) values (
    v_thread_id, p_user_id, p_project_id, p_category, p_type,
    coalesce(nullif(p_title, ''), v_thread_title), p_body,
    p_actor_id, p_source_table, p_source_id, coalesce(p_metadata, '{}'::jsonb), now()
  )
  on conflict (source_table, source_id) where source_table is not null and source_id is not null
  do update set
    title = excluded.title,
    body = excluded.body,
    metadata = inbox_items.metadata || excluded.metadata
  returning id into v_item_id;

  return v_item_id;
end;
$$;

-- ──────────────────────────────────────────────────────────────
-- 2. System events
-- ──────────────────────────────────────────────────────────────
create or replace function inbox_project_guarantee_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if new.user_id is null then
    return new;
  end if;

  select count(*) into v_count from projects where user_id = new.user_id;
  if v_count = 1 then
    perform create_inbox_item(
      new.user_id,
      new.id,
      'system',
      'guarantee_event',
      'Festag-Garantie aktiviert',
      'Dein erstes Projekt ist angelegt. Die Festag-Garantie ist für diesen Workspace aktiv.',
      null,
      'projects',
      new.id,
      jsonb_build_object('thread_title', 'System', 'event', 'first_project_guarantee')
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_inbox_project_guarantee_event on projects;
create trigger trg_inbox_project_guarantee_event
after insert on projects
for each row execute function inbox_project_guarantee_event();

create or replace function inbox_payment_invoice_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_project_id uuid;
  v_status text;
begin
  v_status := lower(coalesce(new.status, ''));
  if v_status not in ('paid','succeeded','completed') then
    return new;
  end if;

  v_project_id := new.project_id;
  if v_project_id is null and (new.metadata ->> 'projectId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_project_id := (new.metadata ->> 'projectId')::uuid;
  end if;
  v_user_id := new.user_id;

  if v_user_id is null and v_project_id is not null then
    select user_id into v_user_id from projects where id = v_project_id;
  end if;

  if v_user_id is null then
    return new;
  end if;

  perform create_inbox_item(
    v_user_id,
    v_project_id,
    'billing',
    'invoice_created',
    'Rechnung erstellt',
    coalesce(new.description, 'Eine Zahlung wurde verarbeitet und eine Rechnung wurde vorbereitet.'),
    null,
    'payments',
    new.id,
    jsonb_build_object(
      'thread_title', 'Abrechnung',
      'provider', new.provider,
      'provider_id', new.provider_id,
      'amount', new.amount,
      'currency', new.currency,
      'event', 'invoice_created'
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_inbox_payment_invoice_event on payments;
create trigger trg_inbox_payment_invoice_event
after insert or update of status on payments
for each row execute function inbox_payment_invoice_event();

-- ──────────────────────────────────────────────────────────────
-- 3. Migrate legacy /messages project chat into Veyra inbox threads
-- ──────────────────────────────────────────────────────────────
do $$
declare
  r record;
  v_thread_id uuid;
  v_owner uuid;
begin
  if to_regclass('public.messages') is null then
    return;
  end if;

  for r in
    select m.id, m.project_id, m.sender_id, m.message, m.is_ai, m.created_at, p.user_id, p.title as project_title
      from messages m
      join projects p on p.id = m.project_id
     where m.id is not null
  loop
    v_owner := coalesce(r.user_id, r.sender_id);
    if v_owner is null then
      continue;
    end if;

    v_thread_id := ensure_inbox_thread(
      v_owner,
      r.project_id,
      'tagro',
      'Veyra Chat',
      r.project_title,
      jsonb_build_object('thread_title', 'Veyra Chat', 'project_title', r.project_title)
    );

    insert into inbox_items(
      thread_id, user_id, project_id, category, type, title, body,
      actor_id, source_table, source_id, metadata, read_at, created_at
    ) values (
      v_thread_id,
      v_owner,
      r.project_id,
      'tagro',
      'chat_message',
      case when coalesce(r.is_ai, false) then 'Veyra' else 'Nachricht' end,
      r.message,
      r.sender_id,
      'messages',
      r.id,
      jsonb_build_object('is_ai', coalesce(r.is_ai, false), 'project_title', r.project_title),
      r.created_at,
      r.created_at
    )
    on conflict (source_table, source_id) where source_table is not null and source_id is not null do nothing;
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────
-- 4. Veyra Memory per client account/project
-- ──────────────────────────────────────────────────────────────
do $$ begin
  create type tagro_memory_scope as enum ('account','project','preference','fact','constraint','handoff');
exception when duplicate_object then null; end $$;

create table if not exists tagro_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  scope tagro_memory_scope not null default 'account',
  key text,
  content text not null,
  source text not null default 'manual',
  confidence numeric not null default 1 check (confidence >= 0 and confidence <= 1),
  embedding double precision[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, project_id, scope, key)
);

create index if not exists idx_tagro_memories_user_scope on tagro_memories(user_id, scope, updated_at desc);
create index if not exists idx_tagro_memories_project on tagro_memories(project_id, updated_at desc) where project_id is not null;
create index if not exists idx_tagro_memories_content_trgm on tagro_memories using gin (to_tsvector('simple', content));

create or replace function touch_tagro_memory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tagro_memories_updated_at on tagro_memories;
create trigger trg_tagro_memories_updated_at
before update on tagro_memories
for each row execute function touch_tagro_memory_updated_at();

create or replace function tagro_upsert_memory(
  p_user_id uuid,
  p_project_id uuid,
  p_scope tagro_memory_scope,
  p_key text,
  p_content text,
  p_source text default 'manual',
  p_confidence numeric default 1,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
    from tagro_memories
   where user_id = p_user_id
     and project_id is not distinct from p_project_id
     and scope = p_scope
     and key is not distinct from nullif(p_key, '')
   limit 1;

  if v_id is null then
    insert into tagro_memories(user_id, project_id, scope, key, content, source, confidence, metadata)
    values (p_user_id, p_project_id, p_scope, nullif(p_key, ''), p_content, coalesce(p_source, 'manual'), coalesce(p_confidence, 1), coalesce(p_metadata, '{}'::jsonb))
    returning id into v_id;
  else
    update tagro_memories
       set content = p_content,
           source = coalesce(p_source, 'manual'),
           confidence = coalesce(p_confidence, 1),
           metadata = tagro_memories.metadata || coalesce(p_metadata, '{}'::jsonb),
           updated_at = now()
     where id = v_id;
  end if;

  return v_id;
end;
$$;

-- ──────────────────────────────────────────────────────────────
-- 5. RLS
-- ──────────────────────────────────────────────────────────────
alter table inbox_threads enable row level security;
alter table inbox_items enable row level security;
alter table tagro_memories enable row level security;

do $$ begin
  create policy inbox_threads_owner_read on inbox_threads for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy inbox_threads_owner_update on inbox_threads for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy inbox_items_owner_read on inbox_items for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy inbox_items_owner_update on inbox_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy tagro_memories_owner_read on tagro_memories for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy tagro_memories_owner_insert on tagro_memories for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy tagro_memories_owner_update on tagro_memories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy tagro_memories_owner_delete on tagro_memories for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ──────────────────────────────────────────────────────────────
-- 6. Storage RLS hardening for avatars bucket
--    Only allow writes inside /<auth.uid()>/...
-- ──────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

do $$
declare
  p record;
begin
  for p in
    select policyname
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and (
         policyname ilike '%avatar%'
         or coalesce(qual, '') ilike '%avatars%'
         or coalesce(with_check, '') ilike '%avatars%'
       )
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy avatars_public_read
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy avatars_owner_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_owner_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_owner_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
