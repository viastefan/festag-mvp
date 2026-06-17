-- Client Posteingang only: dev/admin execution events stay in notifications.
-- Removes wrongly mirrored team-category inbox rows from the prior trigger.

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

  -- Human Execution Layer (dev panel) — notifications only, never inbox_items.
  if new.audience in ('dev', 'admin') then
    return new;
  end if;

  if v_kind = 'dev_accepted' then
    return new;
  end if;

  v_category := case
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
      'thread_title', coalesce(nullif(trim(new.title), ''), 'Posteingang'),
      'source_label', case
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

-- Clean up execution-layer rows that were mirrored before this fix.
delete from inbox_items
where source_table = 'notifications'
  and category = 'team';
