-- ════════════════════════════════════════════════════════════════
-- Festag — schema additions for phases 8–14
-- Run this in Supabase SQL editor (or push via supabase CLI).
-- All statements are idempotent (IF NOT EXISTS / ON CONFLICT).
-- ════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. profiles — add dev matching fields
-- ──────────────────────────────────────────────────────────────
alter table profiles
  add column if not exists bio text,
  add column if not exists skills text[] default '{}',
  add column if not exists hourly_rate numeric,
  add column if not exists availability text default 'full_time',
  add column if not exists timezone text default 'Europe/Berlin',
  add column if not exists access_mode text default 'pool';

-- ──────────────────────────────────────────────────────────────
-- 2. milestones — per-project payment milestones
-- ──────────────────────────────────────────────────────────────
create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  amount numeric not null default 0,
  status text default 'locked' check (status in ('paid','pending','locked')),
  due_date date,
  order_index int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_milestones_project on milestones(project_id);

-- ──────────────────────────────────────────────────────────────
-- 3. payments — Mollie + Enjyn transactions
-- ──────────────────────────────────────────────────────────────
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  project_id uuid references projects(id),
  milestone_id uuid references milestones(id),
  provider text not null,         -- 'mollie' | 'enjyn'
  provider_id text unique,        -- external payment id
  status text default 'pending',  -- pending | paid | failed | refunded
  amount numeric not null,
  currency text default 'EUR',
  description text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_payments_user on payments(user_id);
create index if not exists idx_payments_project on payments(project_id);

-- ──────────────────────────────────────────────────────────────
-- 4. team_invites — extend with PIN + access_mode
-- ──────────────────────────────────────────────────────────────
alter table team_invites
  add column if not exists pin text,
  add column if not exists invited_name text,
  add column if not exists access_mode text default 'open',
  add column if not exists project_id uuid references projects(id);

-- ──────────────────────────────────────────────────────────────
-- 5. team_members — collaborators on a dev's team
-- ──────────────────────────────────────────────────────────────
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  member_id uuid references auth.users(id) on delete cascade,
  role text default 'collaborator',
  created_at timestamptz default now(),
  unique(owner_id, member_id)
);
create index if not exists idx_team_owner on team_members(owner_id);

-- ──────────────────────────────────────────────────────────────
-- 6. time_entries — dev work tracking
-- ──────────────────────────────────────────────────────────────
create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  seconds int not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  note text,
  created_at timestamptz default now()
);
create index if not exists idx_time_user_started on time_entries(user_id, started_at desc);
create index if not exists idx_time_project on time_entries(project_id);

-- ──────────────────────────────────────────────────────────────
-- 7. user_connectors — Notion, Zapier, Slack, etc.
-- ──────────────────────────────────────────────────────────────
create table if not exists user_connectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  connector_id text not null,
  status text default 'connected',
  config jsonb,
  connected_at timestamptz default now(),
  disconnected_at timestamptz,
  unique(user_id, connector_id)
);
create index if not exists idx_user_connectors_user on user_connectors(user_id);

-- ──────────────────────────────────────────────────────────────
-- 8. support_messages — floating widget submissions
-- ──────────────────────────────────────────────────────────────
create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  email text,
  message text not null,
  page text,
  resolved bool default false,
  created_at timestamptz default now()
);
create index if not exists idx_support_created on support_messages(created_at desc);

-- ──────────────────────────────────────────────────────────────
-- 9. tasks — extend with priority + AI source attribution
-- ──────────────────────────────────────────────────────────────
alter table tasks
  add column if not exists priority text default 'medium' check (priority in ('critical','high','medium','low')),
  add column if not exists source text default 'manual',
  add column if not exists source_report_id uuid references ai_updates(id) on delete set null,
  add column if not exists assigned_to uuid references auth.users(id),
  add column if not exists tags text[] default '{}',
  add column if not exists acceptance_criteria text[] default '{}',
  add column if not exists estimated_hours numeric,
  add column if not exists requires_approval bool default false,
  add column if not exists epic_id uuid;

-- ──────────────────────────────────────────────────────────────
-- 10. epics — used by AI decompose
-- ──────────────────────────────────────────────────────────────
create table if not exists epics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  priority text default 'medium',
  estimated_effort text,
  order_index int default 0,
  created_at timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 11. projects — extend with AI fields + assigned_dev
-- ──────────────────────────────────────────────────────────────
alter table projects
  add column if not exists assigned_dev uuid references auth.users(id),
  add column if not exists goals text[] default '{}',
  add column if not exists success_criteria text[] default '{}',
  add column if not exists risks text[] default '{}',
  add column if not exists open_questions text[] default '{}',
  add column if not exists scope_summary text,
  add column if not exists ai_decomposed_at timestamptz,
  add column if not exists budget numeric;

-- ──────────────────────────────────────────────────────────────
-- 12. documents — extend with uploader + size + mime
-- ──────────────────────────────────────────────────────────────
alter table documents
  add column if not exists uploaded_by uuid references auth.users(id),
  add column if not exists size bigint,
  add column if not exists mime text;

-- ──────────────────────────────────────────────────────────────
-- 13. RLS placeholders — enable but stay permissive for now.
--     Tighten once frontend is stable.
-- ──────────────────────────────────────────────────────────────
alter table milestones        enable row level security;
alter table payments          enable row level security;
alter table team_members      enable row level security;
alter table time_entries      enable row level security;
alter table user_connectors   enable row level security;
alter table support_messages  enable row level security;
alter table epics             enable row level security;

-- Permissive read policies (replace with stricter rules later)
do $$
begin
  if not exists (select 1 from pg_policies where tablename='milestones' and policyname='read_own') then
    create policy read_own on milestones for select using (true);
    create policy ins_own  on milestones for insert with check (true);
    create policy upd_own  on milestones for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='payments' and policyname='read_own') then
    create policy read_own on payments for select using (auth.uid() = user_id);
    create policy ins_any  on payments for insert with check (true);
    create policy upd_any  on payments for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='time_entries' and policyname='read_own') then
    create policy read_own on time_entries for select using (auth.uid() = user_id);
    create policy ins_own  on time_entries for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='user_connectors' and policyname='own') then
    create policy own on user_connectors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='support_messages' and policyname='ins') then
    create policy ins on support_messages for insert with check (true);
    create policy read_admin on support_messages for select using (auth.uid() in (select id from profiles where role='admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename='team_members' and policyname='read') then
    create policy read on team_members for select using (auth.uid() = owner_id or auth.uid() = member_id);
    create policy ins  on team_members for insert with check (auth.uid() = owner_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='epics' and policyname='all') then
    create policy all_perm on epics for all using (true) with check (true);
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- 14. Storage bucket for documents
-- ──────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('documents', 'documents', true)
  on conflict (id) do nothing;
