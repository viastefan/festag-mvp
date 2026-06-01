-- CMS Content Intake (website projects) — see docs/cms-content-intake.md.
-- project_id is denormalised onto every table so RLS is a simple
-- is_project_member(project_id) check.

create table if not exists project_cms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  template_key text,
  title text not null default 'Website-Inhalte',
  status text not null default 'draft' check (status in ('draft','published')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create table if not exists cms_sections (
  id uuid primary key default gen_random_uuid(),
  project_cms_id uuid not null references project_cms(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  key text not null,
  title text not null,
  description text,
  ord int not null default 0,
  status text not null default 'offen' check (status in ('offen','ausgefuellt','uebernommen')),
  created_at timestamptz not null default now()
);

create table if not exists cms_fields (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references cms_sections(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  key text not null,
  label text not null,
  type text not null default 'text',
  help text,
  required boolean not null default false,
  ord int not null default 0,
  config jsonb not null default '{}'::jsonb
);

create table if not exists cms_values (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references cms_fields(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  value jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (field_id)
);

create index if not exists idx_cms_sections_cms on cms_sections(project_cms_id, ord);
create index if not exists idx_cms_fields_section on cms_fields(section_id, ord);
create index if not exists idx_cms_values_project on cms_values(project_id);

alter table project_cms enable row level security;
alter table cms_sections enable row level security;
alter table cms_fields enable row level security;
alter table cms_values enable row level security;

-- Read: any project member. Structure write: owner/dev. Values write: members.
do $$ begin
  create policy cms_read on project_cms for select using (is_project_member(project_id));
  create policy cms_struct_write on project_cms for all
    using (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
           or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.role in ('dev','admin')))
    with check (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
           or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.role in ('dev','admin')));

  create policy cms_sec_read on cms_sections for select using (is_project_member(project_id));
  create policy cms_sec_write on cms_sections for all
    using (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
           or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.role in ('dev','admin')))
    with check (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
           or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.role in ('dev','admin')));

  create policy cms_field_read on cms_fields for select using (is_project_member(project_id));
  create policy cms_field_write on cms_fields for all
    using (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
           or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.role in ('dev','admin')))
    with check (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
           or exists (select 1 from profiles pr where pr.id = auth.uid() and pr.role in ('dev','admin')));

  create policy cms_val_read on cms_values for select using (is_project_member(project_id));
  create policy cms_val_write on cms_values for all
    using (is_project_member(project_id)) with check (is_project_member(project_id));
exception when duplicate_object then null; end $$;
