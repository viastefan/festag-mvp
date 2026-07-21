-- Delivery Pulse snapshots — Tagro-compressed progress / risk / next for client + CEO.

create table if not exists public.delivery_pulses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  scope text not null check (scope in ('overall', 'project')),
  progress text not null,
  risk text not null,
  next_step text not null,
  health text not null check (health in ('healthy', 'watch', 'risk', 'blocked')),
  confidence real not null default 0.5,
  proof_capsules jsonb not null default '[]'::jsonb,
  source text not null default 'heuristic',
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.delivery_pulses is
  'Compressed 3-line Delivery Pulse (progress, risk, next) for client/CEO clarity.';

create index if not exists delivery_pulses_user_scope_idx
  on public.delivery_pulses (user_id, scope, generated_at desc);

create index if not exists delivery_pulses_project_idx
  on public.delivery_pulses (project_id, generated_at desc)
  where project_id is not null;

alter table public.delivery_pulses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'delivery_pulses'
      and policyname = 'delivery_pulses_own'
  ) then
    create policy delivery_pulses_own
      on public.delivery_pulses
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

grant select, insert, update, delete on public.delivery_pulses to authenticated;
grant select, insert, update, delete on public.delivery_pulses to service_role;
