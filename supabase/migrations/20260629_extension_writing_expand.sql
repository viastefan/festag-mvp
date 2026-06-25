-- Extension writing assistant — feedback action + usage telemetry.

alter table extension_writing_events
  drop constraint if exists extension_writing_events_action_check;

alter table extension_writing_events
  add constraint extension_writing_events_action_check
  check (action in ('clearer', 'professional', 'shorter', 'feedback', 'casual'));

create table if not exists extension_improve_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  page_domain text,
  applied boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_extension_improve_usage_user_created
  on extension_improve_usage(user_id, created_at desc);

alter table extension_improve_usage enable row level security;

do $$ begin
  create policy extension_improve_usage_owner_select
    on extension_improve_usage for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy extension_improve_usage_owner_insert
    on extension_improve_usage for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
