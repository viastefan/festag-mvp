-- Backfill onboarding state for accounts that existed before the current
-- onboarding flow. They must still complete onboarding exactly once.
insert into public.onboarding_state (user_id, current_step, created_at, updated_at)
select id, 'design', now(), now()
from auth.users
on conflict (user_id) do nothing;
