-- Festag — Briefing-Zustellung
--
-- Auto-deliver Veyra briefings to a client/team-side email at a chosen
-- cadence (daily, weekly, biweekly) in a chosen format (email, audio,
-- both). Scoped per workspace + optional project. The cron worker
-- (separate Edge Function) reads `next_run_at` and fires when due.
--
-- This migration is additive + idempotent.

do $$ begin
  create type briefing_cadence as enum ('daily','weekly','biweekly','off');
exception when duplicate_object then null; end $$;

do $$ begin
  create type briefing_format as enum ('email','audio','both');
exception when duplicate_object then null; end $$;

create table if not exists briefing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  recipients text[] not null default '{}',     -- additional email recipients beyond the owner
  cadence briefing_cadence not null default 'off',
  format briefing_format not null default 'email',
  send_hour smallint not null default 8 check (send_hour between 0 and 23),
  timezone text not null default 'Europe/Berlin',
  active boolean not null default true,
  last_sent_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, workspace_id, project_id)
);

create index if not exists idx_briefing_subs_next_run
  on briefing_subscriptions(next_run_at)
  where active = true and cadence <> 'off';

create index if not exists idx_briefing_subs_workspace on briefing_subscriptions(workspace_id);

create or replace function touch_briefing_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_briefing_subs_updated_at on briefing_subscriptions;
create trigger trg_briefing_subs_updated_at
before update on briefing_subscriptions
for each row execute function touch_briefing_subscriptions_updated_at();

-- RLS — only the owning user (or workspace members) may read/write
alter table briefing_subscriptions enable row level security;

drop policy if exists briefing_subs_owner_read on briefing_subscriptions;
create policy briefing_subs_owner_read on briefing_subscriptions for select
  using (
    user_id = auth.uid()
    or (workspace_id is not null and is_workspace_member(workspace_id))
  );

drop policy if exists briefing_subs_owner_write on briefing_subscriptions;
create policy briefing_subs_owner_write on briefing_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Helper to compute next run timestamp based on cadence
create or replace function compute_next_briefing_run(
  p_cadence briefing_cadence,
  p_send_hour smallint,
  p_timezone text,
  p_now timestamptz default now()
) returns timestamptz
language plpgsql
immutable
as $$
declare
  v_local timestamp;
  v_today_at_hour timestamp;
  v_next timestamp;
begin
  if p_cadence = 'off' then
    return null;
  end if;

  v_local := (p_now at time zone coalesce(p_timezone, 'Europe/Berlin'))::timestamp;
  v_today_at_hour := date_trunc('day', v_local) + make_interval(hours => p_send_hour);

  -- If we already passed today's send-hour, push to next slot.
  if v_today_at_hour <= v_local then
    if p_cadence = 'daily'    then v_next := v_today_at_hour + interval '1 day';
    elsif p_cadence = 'weekly'   then v_next := v_today_at_hour + interval '7 days';
    elsif p_cadence = 'biweekly' then v_next := v_today_at_hour + interval '14 days';
    end if;
  else
    v_next := v_today_at_hour;
  end if;

  return v_next at time zone coalesce(p_timezone, 'Europe/Berlin');
end;
$$;
