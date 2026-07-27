-- Developer invite tokens.
--
-- Only a SHA-256 digest is stored. The raw 32-byte token exists solely in the
-- link returned by the trusted server route. All reads/writes use service_role;
-- anon/authenticated receive no Data API access to invite records.

create table if not exists public.developer_invites (
  id             uuid primary key default gen_random_uuid(),
  token_hash     text unique not null check (token_hash ~ '^[0-9a-f]{64}$'),
  inviter_id     uuid references auth.users(id) on delete set null,
  inviter_name   text,
  inviter_email  text,
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  workspace_name text not null,
  invited_email  text not null check (invited_email = lower(invited_email)),
  role           text not null default 'developer'
                   check (role in ('developer', 'designer', 'reviewer', 'admin')),
  message        text check (message is null or char_length(message) <= 500),
  expires_at     timestamptz not null default (now() + interval '72 hours'),
  used_at        timestamptz,
  used_by        uuid references auth.users(id) on delete set null,
  revoked_at     timestamptz,
  created_at     timestamptz not null default now(),
  check (used_at is null or used_by is not null)
);

alter table public.developer_invites enable row level security;

-- Remove the permissive policies from the initial draft if that draft was
-- applied manually before this migration was finalized.
drop policy if exists "Public token read" on public.developer_invites;
drop policy if exists "Admin/service insert" on public.developer_invites;
drop policy if exists "Admin/service update" on public.developer_invites;

revoke all on table public.developer_invites from anon, authenticated;
grant select, insert, update on table public.developer_invites to service_role;

create index if not exists developer_invites_workspace_idx
  on public.developer_invites (workspace_id, created_at desc);
create index if not exists developer_invites_pending_email_idx
  on public.developer_invites (workspace_id, invited_email)
  where used_at is null and revoked_at is null;
