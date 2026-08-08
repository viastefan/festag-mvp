-- Project handover — the moment a project changes hands.
--
-- One row per offer. It carries who hands over to whom, what kind of
-- relationship that is, and (optionally) the price being offered. Accepting
-- it is what creates membership, notifications and — later — the contract.

create table if not exists public.project_handovers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,

  /* Derived from both profiles at creation time, never asked of the user. */
  relationship text not null check (
    relationship in ('dev_client', 'client_dev', 'dev_dev', 'unknown')
  ),
  /* What the recipient is expected to be on this project. */
  role_offered text not null default 'developer',

  message text,

  /* Offer. Absent means "price still open" — it can be agreed later,
     during the project, by either side. */
  offer_amount numeric check (offer_amount >= 0),
  offer_currency text not null default 'EUR',
  offer_note text,
  price_open boolean not null default true,

  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'declined', 'withdrawn', 'expired')
  ),
  decline_reason text,

  created_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz
);

create index if not exists project_handovers_to_idx
  on public.project_handovers (to_user_id, status);
create index if not exists project_handovers_project_idx
  on public.project_handovers (project_id);

/* Only one open offer per project per recipient. */
create unique index if not exists project_handovers_open_uniq
  on public.project_handovers (project_id, to_user_id)
  where status = 'pending';

alter table public.project_handovers enable row level security;

drop policy if exists project_handovers_read on public.project_handovers;
create policy project_handovers_read on public.project_handovers
  for select using (
    auth.uid() = to_user_id
    or auth.uid() = from_user_id
    or exists (
      select 1 from public.projects p
      where p.id = project_handovers.project_id
        and (p.user_id = auth.uid() or is_workspace_member(p.workspace_id))
    )
  );

/* The recipient answers; the sender may withdraw. Both go through the API,
   which is why writes stay with the service role. */
