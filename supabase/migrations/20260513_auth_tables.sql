-- onboarding_state
create table if not exists public.onboarding_state (
  user_id        uuid primary key references auth.users on delete cascade,
  current_step   text not null default 'welcome',
  profile_done   boolean not null default false,
  workspace_done boolean not null default false,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.onboarding_state enable row level security;
create policy "own onboarding" on public.onboarding_state
  for all using (auth.uid() = user_id);

-- auth_preferences
create table if not exists public.auth_preferences (
  user_id               uuid primary key references auth.users on delete cascade,
  preferred_login_method text,
  passkey_enabled       boolean not null default false,
  last_login_at         timestamptz,
  updated_at            timestamptz not null default now()
);
alter table public.auth_preferences enable row level security;
create policy "own auth prefs" on public.auth_preferences
  for all using (auth.uid() = user_id);

-- last_login_hints (device-local hints, anonymous-safe)
create table if not exists public.last_login_hints (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade,
  email_hint   text,
  provider     text not null,
  display_name text,
  avatar_url   text,
  last_used_at timestamptz not null default now()
);
alter table public.last_login_hints enable row level security;
create policy "own hints" on public.last_login_hints
  for all using (auth.uid() = user_id);

-- auto-create profile + onboarding_state on new user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do nothing;

  insert into public.onboarding_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.auth_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
