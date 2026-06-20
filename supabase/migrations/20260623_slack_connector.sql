-- Slack connector — channel links + message dedup for work_signals import.

create table if not exists slack_channel_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  team_id text,
  team_name text,
  channel_id text not null,
  channel_name text,
  active boolean not null default true,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, channel_id)
);

create index if not exists idx_slack_links_project on slack_channel_links(project_id) where active;
create index if not exists idx_slack_links_user on slack_channel_links(user_id);

alter table slack_channel_links enable row level security;

drop policy if exists slack_links_read on slack_channel_links;
create policy slack_links_read on slack_channel_links for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from project_assignments pa
       where pa.project_id = slack_channel_links.project_id
         and pa.user_id = auth.uid()
         and pa.active
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'project_owner'))
  );

drop policy if exists slack_links_write on slack_channel_links;
create policy slack_links_write on slack_channel_links for all
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'project_owner'))
  )
  with check (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'project_owner'))
  );

create table if not exists slack_synced_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  channel_id text not null,
  message_ts text not null,
  work_signal_id uuid references work_signals(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, channel_id, message_ts)
);

create index if not exists idx_slack_synced_project on slack_synced_messages(project_id, created_at desc);

alter table slack_synced_messages enable row level security;

drop policy if exists slack_synced_read on slack_synced_messages;
create policy slack_synced_read on slack_synced_messages for select
  using (
    exists (
      select 1 from projects p
       where p.id = slack_synced_messages.project_id
         and (p.user_id = auth.uid() or p.client_id = auth.uid())
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'project_owner'))
  );

drop policy if exists slack_synced_write on slack_synced_messages;
create policy slack_synced_write on slack_synced_messages for all
  using (
    exists (
      select 1 from projects p
       where p.id = slack_synced_messages.project_id
         and p.user_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'project_owner'))
  )
  with check (
    exists (
      select 1 from projects p
       where p.id = slack_synced_messages.project_id
         and p.user_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'project_owner'))
  );
