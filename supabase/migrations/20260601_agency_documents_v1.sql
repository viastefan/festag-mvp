-- Agency documents (Angebot / Vertrag / Rechnung builder).
-- Named agency_documents to avoid the pre-existing file-upload `documents` table.
create table if not exists agency_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references agency_clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
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
create index if not exists idx_agency_documents_workspace on agency_documents(workspace_id, created_at desc);
create index if not exists idx_agency_documents_client on agency_documents(client_id);
create index if not exists idx_agency_documents_project on agency_documents(project_id);

create table if not exists agency_document_counters (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null,
  value int not null default 0,
  primary key (workspace_id, kind)
);

create or replace function next_agency_doc_number(p_workspace uuid, p_kind text)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into agency_document_counters(workspace_id, kind, value) values (p_workspace, p_kind, 1)
    on conflict (workspace_id, kind) do update set value = agency_document_counters.value + 1
    returning value into v;
  return v;
end $$;

alter table agency_documents enable row level security;
do $$ begin
  create policy agency_documents_member_all on agency_documents for all
    using (is_workspace_member(workspace_id)
           or exists (select 1 from workspaces w where w.id = agency_documents.workspace_id and w.primary_owner_id = auth.uid()))
    with check (is_workspace_member(workspace_id)
           or exists (select 1 from workspaces w where w.id = agency_documents.workspace_id and w.primary_owner_id = auth.uid()));
exception when duplicate_object then null; end $$;
