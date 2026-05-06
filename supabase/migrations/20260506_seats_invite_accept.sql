-- ════════════════════════════════════════════════════════════════
-- Festag — Seats + Invite Acceptance Flow (2026-05-06)
--
-- Implementiert:
--   1. Email-first Invite Acceptance (Token statt sofortige PIN)
--   2. Explicit Seat Activation durch Owner
--   3. Multi-Tenant Seat-Bindung
--
-- Idempotent — alle Statements mit IF NOT EXISTS / DO blocks.
-- ════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. team_invites — Acceptance-Flow erweitern
-- ──────────────────────────────────────────────────────────────
alter table team_invites
  add column if not exists accept_token   text,
  add column if not exists accepted_at    timestamptz,
  add column if not exists pin_sent_at    timestamptz,
  add column if not exists redeemed_at    timestamptz,
  add column if not exists redeemed_by    uuid references auth.users(id),
  add column if not exists tenant_id      uuid,                       -- Org/Client der Einladung
  add column if not exists team_id        uuid,                       -- Optional: Team innerhalb des Tenant
  add column if not exists expires_at     timestamptz default (now() + interval '14 days');

create unique index if not exists idx_team_invites_accept_token
  on team_invites(accept_token) where accept_token is not null;

create index if not exists idx_team_invites_email_pending
  on team_invites(lower(email)) where status = 'pending';

-- ──────────────────────────────────────────────────────────────
-- 2. seats — explizit aktivierte Plätze pro Tenant
-- ──────────────────────────────────────────────────────────────
create table if not exists seats (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,                                     -- Owner / Org / Client
  user_id         uuid references auth.users(id) on delete cascade,  -- Eingeladener
  invite_id       uuid references team_invites(id) on delete set null,
  role            text not null check (role in ('client','dev','collaborator','admin')),
  status          text not null default 'reserved'
                  check (status in ('reserved','active','suspended','revoked')),
  activated_at    timestamptz,
  activated_by    uuid references auth.users(id),
  suspended_at    timestamptz,
  revoked_at      timestamptz,
  billed          bool default false,
  created_at      timestamptz default now(),
  unique(tenant_id, user_id)
);
create index if not exists idx_seats_tenant on seats(tenant_id);
create index if not exists idx_seats_user   on seats(user_id);

alter table seats enable row level security;

-- ──────────────────────────────────────────────────────────────
-- 3. RLS — Owner sieht alle Seats seines Tenants, User sieht eigene
-- ──────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_policies where tablename='seats' and policyname='read_own_or_tenant') then
    create policy read_own_or_tenant on seats for select
      using (auth.uid() = user_id or auth.uid() = tenant_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='seats' and policyname='ins_owner') then
    create policy ins_owner on seats for insert
      with check (auth.uid() = tenant_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='seats' and policyname='upd_owner') then
    create policy upd_owner on seats for update
      using (auth.uid() = tenant_id);
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- 4. RPC — accept_invite(token)
--    Markiert Invite als accepted, generiert PIN, schreibt seat reserved.
-- ──────────────────────────────────────────────────────────────
create or replace function accept_invite(p_token text)
returns table (
  invite_id uuid,
  email     text,
  role      text,
  tenant_id uuid,
  pin       text,
  expires_at timestamptz
)
language plpgsql
security definer
as $$
declare
  v_invite team_invites%rowtype;
  v_pin    text;
begin
  select * into v_invite
  from team_invites
  where accept_token = p_token
    and status = 'pending'
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    raise exception 'invite-not-found-or-expired';
  end if;

  if v_invite.accepted_at is not null then
    -- bereits angenommen → bestehenden PIN zurückgeben
    return query select v_invite.id, v_invite.email, v_invite.role,
                        v_invite.tenant_id, v_invite.pin, v_invite.expires_at;
    return;
  end if;

  v_pin := lpad(floor(random() * 1000000)::text, 6, '0');

  update team_invites
    set accepted_at = now(),
        pin = v_pin,
        pin_sent_at = now()
    where id = v_invite.id;

  return query select v_invite.id, v_invite.email, v_invite.role,
                      v_invite.tenant_id, v_pin,
                      coalesce(v_invite.expires_at, now() + interval '14 days');
end $$;

grant execute on function accept_invite(text) to anon, authenticated, service_role;

-- ──────────────────────────────────────────────────────────────
-- 5. RPC — redeem_invite_pin(email, pin)
--    Prüft PIN, markiert Invite redeemed, gibt seat-info zurück.
-- ──────────────────────────────────────────────────────────────
create or replace function redeem_invite_pin(p_email text, p_pin text, p_user_id uuid)
returns table (
  invite_id uuid,
  tenant_id uuid,
  role      text,
  team_id   uuid
)
language plpgsql
security definer
as $$
declare
  v_invite team_invites%rowtype;
begin
  select * into v_invite
  from team_invites
  where lower(email) = lower(p_email)
    and pin = p_pin
    and status = 'pending'
    and accepted_at is not null
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'invalid-pin-or-expired';
  end if;

  -- Mark invite as redeemed
  update team_invites
    set status = 'redeemed',
        redeemed_at = now(),
        redeemed_by = p_user_id
    where id = v_invite.id;

  -- Reserve seat (status=reserved — Owner muss explizit aktivieren)
  insert into seats (tenant_id, user_id, invite_id, role, status)
  values (v_invite.tenant_id, p_user_id, v_invite.id, v_invite.role, 'reserved')
  on conflict (tenant_id, user_id) do update
    set invite_id = excluded.invite_id,
        role = excluded.role;

  return query select v_invite.id, v_invite.tenant_id, v_invite.role, v_invite.team_id;
end $$;

grant execute on function redeem_invite_pin(text, text, uuid) to authenticated, service_role;

-- ──────────────────────────────────────────────────────────────
-- 6. RPC — activate_seat(seat_id)
--    Owner aktiviert reservierten Seat → status=active, billed=true.
-- ──────────────────────────────────────────────────────────────
create or replace function activate_seat(p_seat_id uuid)
returns seats
language plpgsql
security definer
as $$
declare
  v_seat seats%rowtype;
  v_caller uuid := auth.uid();
begin
  select * into v_seat from seats where id = p_seat_id limit 1;
  if not found then raise exception 'seat-not-found'; end if;
  if v_seat.tenant_id <> v_caller then raise exception 'not-tenant-owner'; end if;
  if v_seat.status = 'active' then return v_seat; end if;

  update seats
    set status = 'active',
        activated_at = now(),
        activated_by = v_caller,
        billed = true
    where id = p_seat_id
    returning * into v_seat;
  return v_seat;
end $$;

grant execute on function activate_seat(uuid) to authenticated, service_role;
