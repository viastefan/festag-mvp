-- Onboarding: never seed full_name from the email local-part.
-- Email signup has no provider display name — leave the field empty so users type it.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  insert into public.profiles (id, email, full_name, role, avatar_url)
  values (
    new.id,
    new.email,
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'name',
          ''
        )
      ),
      ''
    ),
    'client',
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data->>'avatar_url',
          new.raw_user_meta_data->>'picture',
          ''
        )
      ),
      ''
    )
  )
  on conflict (id) do nothing;

  insert into public.onboarding_state (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.auth_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$function$;

-- Clear names that were only the email local-part (email signup seed).
update public.profiles p
set
  full_name = null,
  updated_at = now()
from auth.users u
where p.id = u.id
  and u.email is not null
  and nullif(trim(coalesce(p.full_name, '')), '') is not null
  and lower(trim(p.full_name)) = lower(split_part(u.email, '@', 1));
