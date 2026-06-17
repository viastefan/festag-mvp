-- Festag — Decisions: RLS writes, realtime, client notify fan-out
--
-- Closes gaps so the decision engine works without service_role in local dev:
--   • authenticated project members can insert/update decisions + children
--   • clients (requested_for) can answer their decisions
--   • decisions table joins supabase_realtime (client list live updates)
--   • pending_client transitions fan a client notification + inbox mirror
--   • inbox mirror understands decision_* notification kinds

-- ── 1. Shared project-access helper ─────────────────────────────────────────
create or replace function can_access_decision_project(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from projects p
    where p.id = p_project
      and (
        p.user_id = auth.uid()
        or p.client_id = auth.uid()
        or is_workspace_member(p.workspace_id)
        or exists (
          select 1 from project_assignments pa
          where pa.project_id = p.id
            and pa.user_id = auth.uid()
            and pa.active
        )
      )
  );
$$;

grant execute on function can_access_decision_project(uuid) to authenticated;


-- ── 2. decisions: write policies (reads already exist) ──────────────────────
drop policy if exists decisions_project_insert on decisions;
create policy decisions_project_insert on decisions
  for insert
  with check (can_access_decision_project(project_id));

drop policy if exists decisions_project_update on decisions;
create policy decisions_project_update on decisions
  for update
  using (
    can_access_decision_project(project_id)
    or requested_for = auth.uid()
    or created_by = auth.uid()
  )
  with check (
    can_access_decision_project(project_id)
    or requested_for = auth.uid()
  );


-- ── 3. decision_options / events / links: insert for project members ────────
drop policy if exists decision_options_project_insert on decision_options;
create policy decision_options_project_insert on decision_options
  for insert
  with check (
    exists (
      select 1 from decisions d
      where d.id = decision_options.decision_id
        and can_access_decision_project(d.project_id)
    )
  );

drop policy if exists decision_events_project_insert on decision_events;
create policy decision_events_project_insert on decision_events
  for insert
  with check (
    exists (
      select 1 from decisions d
      where d.id = decision_events.decision_id
        and (
          can_access_decision_project(d.project_id)
          or d.requested_for = auth.uid()
        )
    )
  );

drop policy if exists decision_links_project_insert on decision_links;
create policy decision_links_project_insert on decision_links
  for insert
  with check (
    exists (
      select 1 from decisions d
      where d.id = decision_links.decision_id
        and can_access_decision_project(d.project_id)
    )
  );


-- ── 4. Realtime publication ─────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table decisions;
exception when duplicate_object then null;
          when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table decision_options;
exception when duplicate_object then null;
          when others then null;
end $$;


-- ── 5. Client notification when a decision goes live ────────────────────────
create or replace function notify_decision_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_body text;
begin
  if new.requested_for is null then
    return new;
  end if;

  if new.status <> 'pending_client' or coalesce(new.visible_to_client, false) = false then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'pending_client' then
    return new;
  end if;

  v_title := coalesce(nullif(trim(new.client_title), ''), nullif(trim(new.title), ''), 'Entscheidung');
  v_body := coalesce(
    nullif(trim(new.client_summary), ''),
    nullif(trim(new.description), ''),
    'Eine Entscheidung wartet auf deine Freigabe.'
  );

  insert into notifications (
    user_id, project_id, task_id,
    audience, kind, type,
    title, body, message,
    link, payload, read
  ) values (
    new.requested_for,
    new.project_id,
    new.source_task_id,
    'client',
    'decision_requested',
    'decision_requested',
    'Entscheidung: ' || left(v_title, 180),
    left(v_body, 400),
    left(v_body, 400),
    '/decisions?open=' || new.id::text,
    jsonb_build_object(
      'decision_id', new.id,
      'urgency', new.urgency,
      'actionable', true
    ),
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_decision_requested on decisions;
create trigger trg_notify_decision_requested
after insert or update of status, visible_to_client on decisions
for each row execute function notify_decision_requested();


-- ── 6. Engine notify helper — audience + legacy message column ──────────────
create or replace function _decision_notify(
  p_user uuid, p_project uuid, p_decision uuid,
  p_type text, p_title text, p_body text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then return; end if;
  insert into notifications(
    user_id, project_id, audience, kind, type,
    title, body, message, link, payload, read
  ) values (
    p_user,
    p_project,
    case
      when p_type in ('decision_answered', 'decision_applied') then 'dev'
      else 'client'
    end,
    p_type,
    p_type,
    p_title,
    left(coalesce(p_body, ''), 300),
    left(coalesce(p_body, ''), 300),
    '/decisions?open=' || p_decision::text,
    jsonb_build_object('decision_id', p_decision, 'actionable', p_type = 'decision_requested'),
    false
  );
end;
$$;


-- ── 7. Inbox mirror: decision notification kinds ────────────────────────────
do $$ begin
  alter type inbox_item_type add value 'decision_event';
exception when duplicate_object then null;
end $$;

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

  if new.audience in ('dev', 'admin') then
    return new;
  end if;

  if v_kind = 'dev_accepted' then
    return new;
  end if;

  v_category := case
    when v_kind ilike 'decision_%' then 'client'::inbox_thread_category
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
    when v_kind ilike 'decision_%' then 'decision_event'::inbox_item_type
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
        when v_kind ilike 'decision_%' then 'Entscheidungen'
        when v_category = 'billing' then 'Festag Abrechnung'
        when v_category = 'tagro' then 'Tagro'
        else 'Festag'
      end,
      'kind', v_kind,
      'audience', new.audience,
      'link', new.link,
      'task_id', new.task_id,
      'notification_id', new.id,
      'actionable', coalesce((new.payload->>'actionable')::boolean, v_kind ilike 'decision_%')
    ) || coalesce(new.payload, '{}'::jsonb)
  );

  return new;
end;
$$;
