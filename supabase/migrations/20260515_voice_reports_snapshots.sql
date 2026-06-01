-- Veyra Voice Reports are persisted as auditable status snapshots.
-- The transcript is the generated audio script, not a later speech-to-text guess.

create table if not exists voice_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  source_report_id uuid,
  mode text not null default 'full' check (mode in ('full','short','decision_only','risk_only')),
  status_snap_text text not null,
  audio_script text not null,
  transcript text not null,
  audio_url text,
  audio_provider text,
  voice_id text,
  duration_seconds integer,
  data_basis jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'manual' check (delivery_status in ('manual','queued','sent','failed','not_scheduled')),
  audio_status text not null default 'not_generated' check (audio_status in ('not_generated','ready','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_voice_reports_user_project_created
  on voice_reports(user_id, project_id, created_at desc);

create index if not exists idx_voice_reports_data_basis
  on voice_reports using gin(data_basis);

alter table voice_reports enable row level security;

drop policy if exists voice_reports_owner_read on voice_reports;
create policy voice_reports_owner_read on voice_reports
for select using (auth.uid() = user_id);

drop policy if exists voice_reports_owner_write on voice_reports;
create policy voice_reports_owner_write on voice_reports
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function touch_voice_reports_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_voice_reports_updated_at on voice_reports;
create trigger trg_voice_reports_updated_at
before update on voice_reports
for each row execute function touch_voice_reports_updated_at();
