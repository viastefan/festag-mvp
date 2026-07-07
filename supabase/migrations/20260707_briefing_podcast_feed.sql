-- Private podcast feeds for per-user briefing delivery (Spotify, Apple Podcasts, etc.)

create table if not exists briefing_podcast_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  secret_token text not null unique,
  title text not null,
  active boolean not null default true,
  cadence briefing_cadence not null default 'daily',
  last_episode_at timestamptz,
  linked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, workspace_id, project_id)
);

create index if not exists idx_briefing_podcast_feeds_user
  on briefing_podcast_feeds(user_id);

create index if not exists idx_briefing_podcast_feeds_active
  on briefing_podcast_feeds(active)
  where active = true;

create table if not exists briefing_podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references briefing_podcast_feeds(id) on delete cascade,
  title text not null,
  description text not null default '',
  audio_path text not null,
  duration_seconds integer,
  guid text not null unique,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_briefing_podcast_episodes_feed_published
  on briefing_podcast_episodes(feed_id, published_at desc);

alter table briefing_podcast_feeds enable row level security;
alter table briefing_podcast_episodes enable row level security;

drop policy if exists briefing_podcast_feeds_owner_read on briefing_podcast_feeds;
create policy briefing_podcast_feeds_owner_read on briefing_podcast_feeds for select
  using (
    user_id = auth.uid()
    or (workspace_id is not null and is_workspace_member(workspace_id))
  );

drop policy if exists briefing_podcast_feeds_owner_write on briefing_podcast_feeds;
create policy briefing_podcast_feeds_owner_write on briefing_podcast_feeds for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists briefing_podcast_episodes_owner_read on briefing_podcast_episodes;
create policy briefing_podcast_episodes_owner_read on briefing_podcast_episodes for select
  using (
    exists (
      select 1 from briefing_podcast_feeds f
      where f.id = briefing_podcast_episodes.feed_id
        and (f.user_id = auth.uid()
          or (f.workspace_id is not null and is_workspace_member(f.workspace_id)))
    )
  );

create or replace function touch_briefing_podcast_feeds_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_briefing_podcast_feeds_updated_at on briefing_podcast_feeds;
create trigger trg_briefing_podcast_feeds_updated_at
before update on briefing_podcast_feeds
for each row execute function touch_briefing_podcast_feeds_updated_at();

insert into storage.buckets (id, name, public)
values ('briefing-podcasts', 'briefing-podcasts', false)
on conflict (id) do nothing;

comment on table briefing_podcast_feeds is 'Per-user private RSS podcast feed for daily Tagro briefings';
comment on column briefing_podcast_feeds.secret_token is 'Unguessable token for private RSS URL — never list publicly';
