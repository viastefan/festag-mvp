-- Keep onboarding state explicit per account. Every authenticated user must
-- complete onboarding once before entering protected app routes.
alter table public.onboarding_state
  add column if not exists design_done boolean not null default false;

alter table public.onboarding_state
  alter column profile_done set default false,
  alter column workspace_done set default false;

create index if not exists onboarding_state_completed_at_idx
  on public.onboarding_state (user_id, completed_at);
