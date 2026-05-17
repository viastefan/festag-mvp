alter table tasks
  add column if not exists completed_at timestamptz;

create index if not exists idx_tasks_completed_at
  on tasks(completed_at desc)
  where completed_at is not null;
