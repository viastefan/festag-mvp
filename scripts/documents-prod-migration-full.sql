-- Festag documents: full prod migration (idempotent).
-- Covers issuer/billing columns, agency_documents, counters, RLS.

-- ── Profile billing / issuer fields ───────────────────────────
alter table public.profiles
  add column if not exists company_name text,
  add column if not exists company_address text,
  add column if not exists company_city text,
  add column if not exists company_zip text,
  add column if not exists company_country text default 'Deutschland',
  add column if not exists vat_number text,
  add column if not exists tax_number text,
  add column if not exists phone text,
  add column if not exists invoice_iban text,
  add column if not exists invoice_bic text;

-- ── Workspace branding invoice fields ─────────────────────────
alter table public.workspace_branding
  add column if not exists invoice_company_name text,
  add column if not exists invoice_company_address text,
  add column if not exists invoice_iban text,
  add column if not exists invoice_bic text,
  add column if not exists invoice_vat_id text,
  add column if not exists invoice_footer text;

-- ── Agency documents core ─────────────────────────────────────
create table if not exists public.agency_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.agency_clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  kind text not null check (kind in ('angebot','vertrag','rechnung')),
  number int,
  number_label text,
  title text,
  data jsonb not null default '{}'::jsonb,
  brand_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','final','sent','paid')),
  total_cents int,
  currency text not null default 'EUR',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agency_documents_workspace on public.agency_documents(workspace_id, created_at desc);
create index if not exists idx_agency_documents_client on public.agency_documents(client_id);
create index if not exists idx_agency_documents_project on public.agency_documents(project_id);

create table if not exists public.agency_document_counters (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null,
  value int not null default 0,
  primary key (workspace_id, kind)
);

create or replace function public.next_agency_doc_number(p_workspace uuid, p_kind text)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into public.agency_document_counters(workspace_id, kind, value) values (p_workspace, p_kind, 1)
    on conflict (workspace_id, kind) do update set value = public.agency_document_counters.value + 1
    returning value into v;
  return v;
end $$;

alter table public.agency_documents enable row level security;

do $$ begin
  create policy agency_documents_member_all on public.agency_documents for all
    using (public.is_workspace_member(workspace_id)
           or exists (select 1 from public.workspaces w where w.id = agency_documents.workspace_id and w.primary_owner_id = auth.uid()))
    with check (public.is_workspace_member(workspace_id)
           or exists (select 1 from public.workspaces w where w.id = agency_documents.workspace_id and w.primary_owner_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── Dev + client document access ──────────────────────────────
drop policy if exists agency_documents_dev_project on public.agency_documents;
create policy agency_documents_dev_project on public.agency_documents for all
  using (
    project_id is not null
    and exists (
      select 1 from public.projects p
      where p.id = agency_documents.project_id
        and (
          p.assigned_dev = auth.uid()
          or exists (
            select 1 from public.project_assignments pa
            where pa.project_id = p.id
              and pa.user_id = auth.uid()
              and pa.active = true
          )
        )
    )
  )
  with check (
    project_id is not null
    and exists (
      select 1 from public.projects p
      where p.id = agency_documents.project_id
        and (
          p.assigned_dev = auth.uid()
          or exists (
            select 1 from public.project_assignments pa
            where pa.project_id = p.id
              and pa.user_id = auth.uid()
              and pa.active = true
          )
        )
    )
  );

drop policy if exists agency_documents_client_read on public.agency_documents;
create policy agency_documents_client_read on public.agency_documents for select
  using (
    status in ('sent', 'paid')
    and project_id is not null
    and exists (
      select 1 from public.projects p
      where p.id = agency_documents.project_id
        and (p.client_id = auth.uid() or p.user_id = auth.uid())
    )
  );
