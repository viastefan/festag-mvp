-- ════════════════════════════════════════════════════════════════
-- Festag — Project Proposals (Budget-Klärung) + Stripe Provider
-- Migration: 20260612_project_proposals_payment.sql
-- ════════════════════════════════════════════════════════════════

-- ── Budget-Rahmen auf Projekt (vom Client gesetzt) ────────────
alter table projects
  add column if not exists budget_min numeric,
  add column if not exists budget_max numeric,
  add column if not exists budget_currency text not null default 'EUR',
  add column if not exists budget_note_raw text,
  add column if not exists budget_note_translated text,
  add column if not exists desired_start_date date,
  add column if not exists is_dev_team boolean not null default false,
  add column if not exists team_lead_dev uuid references auth.users(id) on delete set null;

-- ── Proposal-Statemachine ─────────────────────────────────────
do $$ begin
  create type project_proposal_status as enum (
    'proposed',
    'budget_clarification',
    'accepted',
    'declined',
    'expired',
    'withdrawn'
  );
exception when duplicate_object then null; end $$;

create table if not exists project_proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  dev_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
  status project_proposal_status not null default 'proposed',
  dev_proposed_price numeric,
  dev_proposed_currency text default 'EUR',
  dev_proposed_start_date date,
  dev_proposed_duration_days int,
  dev_clarification_raw text,
  dev_clarification_translated text,
  client_response_raw text,
  client_response_translated text,
  role_on_project text not null default 'developer',
  is_team_lead boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  unique (project_id, dev_id)
);

create index if not exists idx_proposals_project on project_proposals(project_id);
create index if not exists idx_proposals_dev_status on project_proposals(dev_id, status);
create index if not exists idx_proposals_pool_expiry on project_proposals(expires_at) where status in ('proposed','budget_clarification');

alter table project_proposals enable row level security;

drop policy if exists proposals_read on project_proposals;
create policy proposals_read on project_proposals for select
  using (
    dev_id = auth.uid()
    or exists (
      select 1 from projects p
       where p.id = project_proposals.project_id
         and (p.user_id = auth.uid() or is_workspace_member(p.workspace_id))
    )
  );

drop policy if exists proposals_insert_owner on project_proposals;
create policy proposals_insert_owner on project_proposals for insert
  with check (
    exists (
      select 1 from projects p
       where p.id = project_proposals.project_id
         and (p.user_id = auth.uid() or is_workspace_member(p.workspace_id))
    )
    or dev_id = auth.uid()
  );

drop policy if exists proposals_write_dev on project_proposals;
create policy proposals_write_dev on project_proposals for update
  using (dev_id = auth.uid()) with check (dev_id = auth.uid());

drop policy if exists proposals_write_owner on project_proposals;
create policy proposals_write_owner on project_proposals for update
  using (exists (
    select 1 from projects p
     where p.id = project_proposals.project_id
       and (p.user_id = auth.uid() or is_workspace_member(p.workspace_id))
  ));

-- ── Timestamps trigger ────────────────────────────────────────
create or replace function touch_project_proposals()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_proposals_touch on project_proposals;
create trigger trg_proposals_touch before update on project_proposals
for each row execute function touch_project_proposals();

-- ── Sync proposal acceptance → project_assignments ────────────
create or replace function sync_proposal_to_assignment()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'accepted' and (old.status is distinct from 'accepted') then
    insert into project_assignments (project_id, user_id, role_on_project, assigned_by, active)
    values (new.project_id, new.dev_id, new.role_on_project, new.invited_by, true)
    on conflict (project_id, user_id) do update
       set active = true, role_on_project = excluded.role_on_project;
    update projects set assigned_dev = new.dev_id
      where id = new.project_id and assigned_dev is null;
    new.accepted_at = now();
  end if;
  if new.status = 'declined' and (old.status is distinct from 'declined') then
    new.declined_at = now();
  end if;
  return new;
end; $$;

drop trigger if exists trg_proposal_sync on project_proposals;
create trigger trg_proposal_sync before update on project_proposals
for each row execute function sync_proposal_to_assignment();

-- ── Dev-Invitations (2-Step Flow für invite_new_dev) ─────────
create table if not exists dev_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  dev_email text not null,
  dev_name text,
  confirm_token text not null unique,
  reject_token text not null unique,
  status text not null default 'awaiting_confirmation'
    check (status in ('awaiting_confirmation','confirmed','rejected','expired','onboarded')),
  confirmed_at timestamptz,
  rejected_at timestamptz,
  onboarded_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_dev_invitations_email on dev_invitations(dev_email);
create index if not exists idx_dev_invitations_status on dev_invitations(status, expires_at);

alter table dev_invitations enable row level security;

drop policy if exists dev_invitations_owner on dev_invitations;
create policy dev_invitations_owner on dev_invitations for select
  using (invited_by = auth.uid());

drop policy if exists dev_invitations_insert on dev_invitations;
create policy dev_invitations_insert on dev_invitations for insert
  with check (invited_by = auth.uid());

-- ── Payments: Stripe als 3. Provider ──────────────────────────
alter table payments
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists invoice_number text,
  add column if not exists invoice_pdf_url text,
  add column if not exists payment_method text;

create index if not exists idx_payments_stripe_intent on payments(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index if not exists idx_payments_method on payments(payment_method);

-- ── Milestone-Templates ───────────────────────────────────────
alter table milestones
  add column if not exists template_key text,
  add column if not exists percentage numeric,
  add column if not exists confirmed_by_client_at timestamptz,
  add column if not exists confirmed_by_dev_at timestamptz;

-- ── Projekt-Lifecycle: Milestone-Bestätigung ──────────────────
alter table projects
  add column if not exists milestone_structure_confirmed boolean not null default false,
  add column if not exists milestone_structure_confirmed_at timestamptz;

-- ── Workspace-Branding: Rechnungsdaten ────────────────────────
alter table workspace_branding
  add column if not exists invoice_company_name text,
  add column if not exists invoice_company_address text,
  add column if not exists invoice_iban text,
  add column if not exists invoice_bic text,
  add column if not exists invoice_vat_id text,
  add column if not exists invoice_footer text;

-- ── Invoice-Zähler pro Workspace ──────────────────────────────
create table if not exists invoice_counters (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  year int not null,
  last_number int not null default 0
);

-- ── Storage Bucket für Rechnungs-PDFs ─────────────────────────
insert into storage.buckets (id, name, public)
  values ('invoices', 'invoices', false)
  on conflict (id) do nothing;

-- ── Realtime für Proposals ────────────────────────────────────
alter publication supabase_realtime add table project_proposals;
