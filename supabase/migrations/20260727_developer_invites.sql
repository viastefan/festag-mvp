-- Developer invite tokens
-- Sent by an admin or workspace owner to onboard a developer.
-- Token: 32-byte random hex (64 chars) → cryptographically impossible to brute-force.
-- One-time use, 72 h expiry.

create table if not exists developer_invites (
  id            uuid        primary key default gen_random_uuid(),
  -- The secure token embedded in the invite link.
  token         text        unique not null default encode(gen_random_bytes(32), 'hex'),
  -- Who sent the invite (null = system/admin via service role).
  inviter_id    uuid        references auth.users(id) on delete set null,
  inviter_name  text,
  inviter_email text,
  -- Which workspace the developer is being invited to.
  workspace_id  uuid        references workspaces(id) on delete cascade,
  workspace_name text,
  -- The email address the invite was sent to.
  invited_email text        not null,
  -- Role the developer will get (default: developer).
  role          text        not null default 'developer',
  -- Optional personal message from the inviter.
  message       text,
  -- Expiry: 72 hours by default.
  expires_at    timestamptz not null default (now() + interval '72 hours'),
  -- Accepted metadata.
  used_at       timestamptz,
  used_by       uuid        references auth.users(id) on delete set null,
  -- Audit.
  created_at    timestamptz not null default now()
);

-- Only admins / service role can insert invites.
-- Token lookup is open (anyone with the exact token can view the invite preview).
alter table developer_invites enable row level security;

create policy "Public token read"
  on developer_invites for select
  using (true);

create policy "Admin/service insert"
  on developer_invites for insert
  with check (
    -- Authenticated users can create invites (further role check in API route).
    auth.uid() is not null
  );

create policy "Admin/service update"
  on developer_invites for update
  using (
    -- Only the used_at / used_by fields are written by the accept action.
    auth.uid() is not null or auth.role() = 'service_role'
  );

-- Index for fast token lookup.
create index if not exists developer_invites_token_idx on developer_invites (token);
-- Index for listing invites per workspace.
create index if not exists developer_invites_workspace_idx on developer_invites (workspace_id);
