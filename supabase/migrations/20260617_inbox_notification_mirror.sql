-- Mirror notifications → inbox_items so client Posteingang and dev inbox
-- share one structured feed. Also enables realtime on inbox tables.

-- ── Realtime publication ────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'inbox_items'
  ) then
    alter publication supabase_realtime add table inbox_items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'inbox_threads'
  ) then
    alter publication supabase_realtime add table inbox_threads;
  end if;
end $$;

-- ── Notification → inbox mirror ─────────────────────────────────
create or replace function inbox_mirror_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category inbox_thread_category;
  v_type inbox_item_type;
  v_kind text;
begin
  if new.user_id is null then
    return new;
  end if;

  v_kind := coalesce(new.kind, new.type, '');

  -- Explicit structured fan-out (proposal-accepted) writes richer items;
  -- skip the generic mirror to avoid a duplicate summary row.
  if v_kind = 'dev_accepted' then
    return new;
  end if;

  v_category := case
    when new.audience in ('dev', 'admin') then 'team'::inbox_thread_category
    when v_kind ilike '%billing%'
      or v_kind ilike '%invoice%'
      or v_kind ilike '%payment%'
      or new.type ilike '%invoice%'
      or new.type ilike '%payment%' then 'billing'::inbox_thread_category
    when v_kind in ('conversation_summary', 'tagro_summary', 'tagro_daily') then 'tagro'::inbox_thread_category
    when new.audience = 'client' then 'client'::inbox_thread_category
    else 'system'::inbox_thread_category
  end;

  v_type := case
    when v_kind ilike '%invoice%' or new.type ilike '%invoice%' then 'invoice_created'::inbox_item_type
    when v_kind ilike '%payment%' or new.type ilike '%payment%' then 'payment_event'::inbox_item_type
    when v_kind ilike '%guarantee%' then 'guarantee_event'::inbox_item_type
    when v_kind = 'conversation_summary' then 'status_update'::inbox_item_type
    when new.task_id is not null then 'task_event'::inbox_item_type
    when v_kind = 'dev_accepted' then 'project_event'::inbox_item_type
    else 'system_event'::inbox_item_type
  end;

  perform create_inbox_item(
    new.user_id,
    new.project_id,
    v_category,
    v_type,
    coalesce(nullif(trim(new.title), ''), 'Update'),
    coalesce(nullif(trim(new.body), ''), nullif(trim(new.message), '')),
    null,
    'notifications',
    new.id,
    jsonb_build_object(
      'thread_title', coalesce(nullif(trim(new.title), ''), 'Inbox'),
      'source_label', case
        when new.audience in ('dev', 'admin') then 'Festag Ops'
        when v_category = 'billing' then 'Festag Abrechnung'
        when v_category = 'tagro' then 'Tagro'
        else 'Festag'
      end,
      'kind', v_kind,
      'audience', new.audience,
      'link', new.link,
      'task_id', new.task_id,
      'notification_id', new.id,
      'actionable', coalesce((new.payload->>'actionable')::boolean, false)
    ) || coalesce(new.payload, '{}'::jsonb)
  );

  return new;
end;
$$;

drop trigger if exists trg_inbox_mirror_notification on notifications;
create trigger trg_inbox_mirror_notification
after insert on notifications
for each row execute function inbox_mirror_notification();

-- ── Backfill existing notifications (idempotent via source upsert) ─
create or replace function inbox_mirror_notification_manual(n notifications)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category inbox_thread_category;
  v_type inbox_item_type;
  v_kind text;
begin
  v_kind := coalesce(n.kind, n.type, '');

  if v_kind = 'dev_accepted' then
    return;
  end if;

  v_category := case
    when n.audience in ('dev', 'admin') then 'team'::inbox_thread_category
    when v_kind ilike '%billing%'
      or v_kind ilike '%invoice%'
      or v_kind ilike '%payment%'
      or n.type ilike '%invoice%'
      or n.type ilike '%payment%' then 'billing'::inbox_thread_category
    when v_kind in ('conversation_summary', 'tagro_summary', 'tagro_daily') then 'tagro'::inbox_thread_category
    when n.audience = 'client' then 'client'::inbox_thread_category
    else 'system'::inbox_thread_category
  end;

  v_type := case
    when v_kind ilike '%invoice%' or n.type ilike '%invoice%' then 'invoice_created'::inbox_item_type
    when v_kind ilike '%payment%' or n.type ilike '%payment%' then 'payment_event'::inbox_item_type
    when v_kind ilike '%guarantee%' then 'guarantee_event'::inbox_item_type
    when v_kind = 'conversation_summary' then 'status_update'::inbox_item_type
    when n.task_id is not null then 'task_event'::inbox_item_type
    when v_kind = 'dev_accepted' then 'project_event'::inbox_item_type
    else 'system_event'::inbox_item_type
  end;

  perform create_inbox_item(
    n.user_id,
    n.project_id,
    v_category,
    v_type,
    coalesce(nullif(trim(n.title), ''), 'Update'),
    coalesce(nullif(trim(n.body), ''), nullif(trim(n.message), '')),
    null,
    'notifications',
    n.id,
    jsonb_build_object(
      'thread_title', coalesce(nullif(trim(n.title), ''), 'Inbox'),
      'source_label', case
        when n.audience in ('dev', 'admin') then 'Festag Ops'
        when v_category = 'billing' then 'Festag Abrechnung'
        when v_category = 'tagro' then 'Tagro'
        else 'Festag'
      end,
      'kind', v_kind,
      'audience', n.audience,
      'link', n.link,
      'task_id', n.task_id,
      'notification_id', n.id,
      'actionable', coalesce((n.payload->>'actionable')::boolean, false)
    ) || coalesce(n.payload, '{}'::jsonb)
  );
end;
$$;

do $$
declare
  r record;
begin
  for r in
    select * from notifications
    where user_id is not null
    order by created_at asc
    limit 5000
  loop
    perform inbox_mirror_notification_manual(r);
  end loop;
end $$;

drop function if exists inbox_mirror_notification_manual(notifications);

