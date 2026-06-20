-- Linear connector project links + persisted executive daily reports.

-- ── linear_project_links ─────────────────────────────────────────────────────
create table if not exists linear_project_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  team_id text not null,
  team_key text,
  team_name text,
  active boolean not null default true,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, team_id)
);

create index if not exists idx_linear_links_project on linear_project_links(project_id) where active;
create index if not exists idx_linear_links_user on linear_project_links(user_id);

alter table linear_project_links enable row level security;

drop policy if exists linear_links_read on linear_project_links;
create policy linear_links_read on linear_project_links for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from project_assignments pa
       where pa.project_id = linear_project_links.project_id
         and pa.user_id = auth.uid()
         and pa.active
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'project_owner'))
  );

drop policy if exists linear_links_write on linear_project_links;
create policy linear_links_write on linear_project_links for all
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'project_owner'))
  )
  with check (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'project_owner'))
  );

-- ── executive_daily_reports ──────────────────────────────────────────────────
create table if not exists executive_daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Tagro Tagesbericht',
  body text not null default '',
  highlights jsonb not null default '[]'::jsonb,
  source text not null default 'synthesized'
    check (source in ('tagro', 'scheduled', 'synthesized')),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_exec_daily_user_generated
  on executive_daily_reports(user_id, generated_at desc);

alter table executive_daily_reports enable row level security;

drop policy if exists exec_daily_self on executive_daily_reports;
create policy exec_daily_self on executive_daily_reports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
