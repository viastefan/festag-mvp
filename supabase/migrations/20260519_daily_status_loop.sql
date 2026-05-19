-- Festag — Daily status loop
--
-- Workflow:
--   1. Tagro fires once a day at 16:00 local time.
--   2. For every active developer on a non-archived project a row in
--      `dev_daily_prompts` is created (one per dev+date).
--   3. The dev sees a calm prompt card in /dev, posts a short status
--      (or skips). The post is stored in `developer_updates` (already
--      exists) AND a translated, client-safe row in `status_reports`.
--   4. The client may at any time hit "Status jetzt abrufen" — we log
--      the query in `client_status_queries` for analytics and rate
--      limiting, then return / regenerate the latest status_report.

create table if not exists dev_daily_prompts (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  prompt_date date not null,
  state text not null default 'open',          -- open | submitted | skipped | expired
  submitted_at timestamptz,
  related_update_id uuid references developer_updates(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (developer_id, project_id, prompt_date)
);
create index if not exists idx_dev_prompts_dev_state on dev_daily_prompts(developer_id, state) where state = 'open';
create index if not exists idx_dev_prompts_date on dev_daily_prompts(prompt_date);

alter table dev_daily_prompts enable row level security;

drop policy if exists ddp_self_read on dev_daily_prompts;
create policy ddp_self_read on dev_daily_prompts for select
  using (
    auth.uid() = developer_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );

drop policy if exists ddp_self_update on dev_daily_prompts;
create policy ddp_self_update on dev_daily_prompts for update
  using (auth.uid() = developer_id)
  with check (auth.uid() = developer_id);

-- client_status_queries: a thin audit log so we can show "Stand vom Xx Uhr"
-- and gate accidental hammering of the on-demand button.
create table if not exists client_status_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  scope text not null default 'project',        -- project | overall
  source text not null default 'client_portal', -- client_portal | api | system
  status_report_id uuid references status_reports(id) on delete set null,
  generated_fresh boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_csq_user_recent on client_status_queries(user_id, created_at desc);
create index if not exists idx_csq_project on client_status_queries(project_id, created_at desc) where project_id is not null;

alter table client_status_queries enable row level security;
drop policy if exists csq_self_read on client_status_queries;
create policy csq_self_read on client_status_queries for select
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );
drop policy if exists csq_insert_self on client_status_queries;
create policy csq_insert_self on client_status_queries for insert
  with check (auth.uid() = user_id);

-- status_reports: keep the existing table; just make sure we can
-- distinguish the daily-loop rows from one-off reports.
alter table status_reports add column if not exists generated_on date;
create index if not exists idx_status_reports_project_generated_on on status_reports(project_id, generated_on desc) where generated_on is not null;
