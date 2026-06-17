-- Festag — Account deletion audit log
--
-- Stays around AFTER auth.users delete cascades, so the row keeps the
-- email + reason for compliance / retention insight. Deliberately no
-- FK to auth.users — that would orphan the row at deletion time.

create table if not exists account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,                   -- the deleted user's id (no FK on purpose)
  email text,                     -- email at time of deletion
  reason text not null,           -- one of the predefined reason codes
  reason_details text,            -- free-text from the "Sonstiges" textarea
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'requested', -- requested / executed / failed / cancelled
  requested_at timestamptz not null default now(),
  executed_at timestamptz,
  failure_reason text
);

create index if not exists idx_account_deletion_requests_status on account_deletion_requests(status);
create index if not exists idx_account_deletion_requests_email on account_deletion_requests(email) where email is not null;

-- The user can SELECT their own deletion request rows up until their
-- auth user is gone; service role writes via the deletion API.
alter table account_deletion_requests enable row level security;

drop policy if exists deletion_requests_self_read on account_deletion_requests;
create policy deletion_requests_self_read on account_deletion_requests for select
  using (user_id = auth.uid());
