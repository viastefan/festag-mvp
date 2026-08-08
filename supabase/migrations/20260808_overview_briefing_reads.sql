-- Overview daily briefing read receipts (archive when fully read).
create table if not exists overview_briefing_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid,
  briefing_date date not null,
  read_at timestamptz not null default now(),
  archived boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

create index if not exists idx_overview_briefing_reads_user_date
  on overview_briefing_reads (user_id, briefing_date desc);

alter table overview_briefing_reads enable row level security;

drop policy if exists overview_briefing_reads_own on overview_briefing_reads;
create policy overview_briefing_reads_own on overview_briefing_reads
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
