-- Festag — Agency Workspace + Kundenverwaltung + White-Label Basis
--
-- Phase 3 foundation: agency mode operators can group projects under a
-- proper client identity (not just "tagged projects"), and each agency
-- workspace can hold a White-Label branding profile.
--
-- Idempotent + additive — no existing query path breaks. White-Label
-- activation itself stays gated (premium); the schema just lets the UI
-- collect/preview the values.

-- ── agency_clients ─────────────────────────────────────────────
create table if not exists agency_clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  -- Display / lookup
  name text not null,
  slug text,
  description text,
  industry text,
  -- Primary contact (free-form so we don't lock ourselves to a CRM yet)
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  -- Branding overrides (per-client, only used when white-label is on)
  brand_color text,
  logo_url text,
  domain text,
  -- Status
  status text not null default 'active', -- active / paused / archived
  -- Audit
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create index if not exists idx_agency_clients_workspace on agency_clients(workspace_id);
create index if not exists idx_agency_clients_status on agency_clients(workspace_id, status);

-- projects gets a soft pointer to a client (agency workspaces only fill
-- this; team/delivery workspaces leave it null).
alter table projects add column if not exists client_id uuid references agency_clients(id) on delete set null;
create index if not exists idx_projects_client on projects(client_id) where client_id is not null;

create or replace function touch_agency_clients_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_agency_clients_touch on agency_clients;
create trigger trg_agency_clients_touch
before update on agency_clients
for each row execute function touch_agency_clients_updated_at();

alter table agency_clients enable row level security;

drop policy if exists agency_clients_member_read on agency_clients;
create policy agency_clients_member_read on agency_clients for select
  using (is_workspace_member(workspace_id));

drop policy if exists agency_clients_owner_write on agency_clients;
create policy agency_clients_owner_write on agency_clients for all
  using (
    exists (
      select 1 from workspaces w
       where w.id = agency_clients.workspace_id and w.primary_owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workspaces w
       where w.id = agency_clients.workspace_id and w.primary_owner_id = auth.uid()
    )
  );

-- ── workspace_branding ────────────────────────────────────────
-- One row per workspace. Premium White-Label sets these; Powered-by-
-- Festag mode keeps them null so the app falls back to Festag chrome.
create table if not exists workspace_branding (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  plan text not null default 'powered_by_festag', -- powered_by_festag / full_white_label / agency_os
  brand_name text,                     -- Display name in mails, PDFs, etc.
  brand_color text,                    -- Hex / token id
  brand_accent text,
  logo_url text,                       -- URL into storage or external
  logo_dark_url text,
  domain text,                         -- Custom subdomain or apex
  mail_from text,                      -- e.g. "Festag <hi@agency.com>"
  mail_reply_to text,
  pdf_footer text,
  audio_intro text,                    -- Spoken intro snippet for audio briefings
  custom_css text,                     -- last-resort hook
  activated_at timestamptz,            -- set when plan != powered_by_festag
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function touch_workspace_branding_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_workspace_branding_touch on workspace_branding;
create trigger trg_workspace_branding_touch
before update on workspace_branding
for each row execute function touch_workspace_branding_updated_at();

alter table workspace_branding enable row level security;

drop policy if exists workspace_branding_member_read on workspace_branding;
create policy workspace_branding_member_read on workspace_branding for select
  using (is_workspace_member(workspace_id));

drop policy if exists workspace_branding_owner_write on workspace_branding;
create policy workspace_branding_owner_write on workspace_branding for all
  using (
    exists (
      select 1 from workspaces w
       where w.id = workspace_branding.workspace_id and w.primary_owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workspaces w
       where w.id = workspace_branding.workspace_id and w.primary_owner_id = auth.uid()
    )
  );
