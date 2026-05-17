-- Festag — workspace_observers
--
-- Mitbeobachter: Personen, die der Client einlädt, einzelne Projekte
-- mitzuverfolgen. Read-only oder Comment, projekt-scoped.
--
-- Bewusst entkoppelt von project_members (= ausführende Rollen).
-- Mitbeobachter sind stille Stakeholder: Co-Founder, Marketing, Eltern,
-- Investoren, Buchhaltung, Partner. Sie sehen Projektstatus, Briefings
-- und Tasks (read-only) — bauen aber nichts.
--
-- Datenmodell:
-- - owner_user_id: wer hat eingeladen (der Client selbst)
-- - email: Adressat. Falls bereits Festag-User → user_id aufgefüllt,
--   sonst pending bis Annahme.
-- - access_level: 'read' | 'comment'
-- - project_ids: welche Projekte er sehen darf. NULL = alle Projekte
--   des owners.
-- - status: 'pending' | 'joined' | 'revoked'

create table if not exists workspace_observers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text,
  access_level text not null default 'read'
    check (access_level in ('read','comment')),
  project_ids uuid[],
  status text not null default 'pending'
    check (status in ('pending','joined','revoked')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  last_seen_at timestamptz,
  invite_token text unique default encode(gen_random_bytes(18), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, email)
);

create index if not exists idx_observers_owner on workspace_observers(owner_user_id);
create index if not exists idx_observers_user on workspace_observers(user_id);
create index if not exists idx_observers_email on workspace_observers(email);

alter table workspace_observers enable row level security;

-- Owner darf seine eigenen Observer sehen und verwalten
drop policy if exists "observers_owner_select" on workspace_observers;
create policy "observers_owner_select" on workspace_observers
  for select using (auth.uid() = owner_user_id);

drop policy if exists "observers_owner_insert" on workspace_observers;
create policy "observers_owner_insert" on workspace_observers
  for insert with check (auth.uid() = owner_user_id);

drop policy if exists "observers_owner_update" on workspace_observers;
create policy "observers_owner_update" on workspace_observers
  for update using (auth.uid() = owner_user_id);

drop policy if exists "observers_owner_delete" on workspace_observers;
create policy "observers_owner_delete" on workspace_observers
  for delete using (auth.uid() = owner_user_id);

-- Der eingeladene Observer darf SEINE eigenen Einträge sehen
drop policy if exists "observers_self_select" on workspace_observers;
create policy "observers_self_select" on workspace_observers
  for select using (auth.uid() = user_id);

-- updated_at touch
create or replace function touch_workspace_observers_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_observers_updated_at on workspace_observers;
create trigger trg_observers_updated_at
  before update on workspace_observers
  for each row execute function touch_workspace_observers_updated_at();

comment on table workspace_observers is
  'Mitbeobachter: Read-only/Comment-Zugriff auf einzelne Projekte. Stille Stakeholder, nicht ausführende Rolle.';
