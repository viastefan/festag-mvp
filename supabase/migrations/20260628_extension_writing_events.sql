-- Extension writing assistant — learn from applied improvements per user.

create table if not exists extension_writing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_text text not null,
  improved_text text not null,
  action text not null check (action in ('clearer', 'professional', 'shorter')),
  page_domain text,
  page_title text,
  applied boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_extension_writing_events_user_created
  on extension_writing_events(user_id, created_at desc);

alter table extension_writing_events enable row level security;

do $$ begin
  create policy extension_writing_events_owner_select
    on extension_writing_events for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy extension_writing_events_owner_insert
    on extension_writing_events for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
