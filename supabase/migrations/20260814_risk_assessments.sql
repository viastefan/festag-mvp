-- Risiko-Bewertungen aus dem mobilen Risiko-Flow.
-- Ein blockierter Task gilt als Risiko; sobald er bewertet ist, verschwindet er
-- aus der Dashboard-Warteschlange.
create table if not exists risk_assessments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  impact text not null check (impact in ('low', 'mid', 'high')),
  probability text not null check (probability in ('low', 'mid', 'high')),
  measure text not null check (measure in ('accept', 'mitigate', 'delegate')),
  -- 'tagro' = Empfehlung übernommen, 'manual' = selbst gewählt.
  source text not null default 'manual' check (source in ('manual', 'tagro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, user_id)
);

create index if not exists idx_risk_assessments_user
  on risk_assessments (user_id, created_at desc);

create index if not exists idx_risk_assessments_task
  on risk_assessments (task_id);

alter table risk_assessments enable row level security;

drop policy if exists risk_assessments_own on risk_assessments;
create policy risk_assessments_own on risk_assessments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
