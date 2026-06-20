-- Jira Cloud connector project links.

create table if not exists jira_project_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  jira_site text not null,
  jira_project_id text not null,
  jira_project_key text,
  jira_project_name text,
  active boolean not null default true,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, jira_site, jira_project_id)
);

create index if not exists idx_jira_links_project on jira_project_links(project_id) where active;
create index if not exists idx_jira_links_user on jira_project_links(user_id);

alter table jira_project_links enable row level security;

drop policy if exists jira_links_read on jira_project_links;
create policy jira_links_read on jira_project_links for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from project_assignments pa
       where pa.project_id = jira_project_links.project_id
         and pa.user_id = auth.uid()
         and pa.active
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'project_owner'))
  );

drop policy if exists jira_links_write on jira_project_links;
create policy jira_links_write on jira_project_links for all
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'project_owner'))
  )
  with check (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'project_owner'))
  );
