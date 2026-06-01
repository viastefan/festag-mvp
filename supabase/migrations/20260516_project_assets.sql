-- Festag — Intelligentes Asset-, Upload- und Produktionssystem
--
-- Foundation per the strategic spec: Veyra should not just see "files"
-- — it should see production context. Each asset has a typed category,
-- kind, visibility, and is linkable to tasks. The analysis_result field
-- holds what Veyra inferred (affected roles, suggested tasks, etc.).
--
-- This migration is additive + idempotent. UI / Veyra analysis / Figma
-- integration land in follow-up pushes; the schema is in place so they
-- can stack cleanly.

-- ── enums ──────────────────────────────────────────────────────
do $$ begin
  create type asset_category as enum (
    'ui_ux','development','marketing','branding','documentation',
    'video','analytics','strategy','automation','client_files','qa','legal','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_kind as enum (
    'file','figma','link','loom','video','audio','image','pdf','document','spreadsheet','code','screenshot'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_visibility as enum (
    'client_visible','team_only','internal_only','white_label_visible'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_status as enum ('uploaded','analyzed','approved','archived');
exception when duplicate_object then null; end $$;

-- ── tables ─────────────────────────────────────────────────────
create table if not exists project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete set null,
  -- Classification (Veyra fills these on analysis; defaults are safe)
  category asset_category not null default 'other',
  kind asset_kind not null default 'file',
  visibility asset_visibility not null default 'team_only',
  status asset_status not null default 'uploaded',
  -- Content addressing — either a storage path (uploaded file) or an external URL (Figma/Loom/Drive)
  title text not null,
  description text,
  storage_path text,           -- e.g. project-assets/<projectId>/<assetId>.<ext>
  external_url text,           -- Figma/Loom/Drive/external link
  preview_url text,            -- thumbnail / poster
  mime_type text,
  size_bytes bigint,
  -- Optional task linkage (one asset can also live on multiple tasks via task_assets)
  primary_task_id uuid references tasks(id) on delete set null,
  -- Free-form tags (sprint, phase, version, etc.)
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  -- Veyra analysis output
  analyzed_at timestamptz,
  analysis_result jsonb,
  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Many-to-many: tasks ↔ assets (a Loom can cover several tasks; a task can
-- have screens + specs + a video). Primary linkage stays via
-- project_assets.primary_task_id for quick "what's this asset for".
create table if not exists task_assets (
  task_id uuid not null references tasks(id) on delete cascade,
  asset_id uuid not null references project_assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, asset_id)
);

-- ── indexes ────────────────────────────────────────────────────
create index if not exists idx_project_assets_project on project_assets(project_id);
create index if not exists idx_project_assets_workspace on project_assets(workspace_id) where workspace_id is not null;
create index if not exists idx_project_assets_uploader on project_assets(uploaded_by);
create index if not exists idx_project_assets_kind on project_assets(kind);
create index if not exists idx_project_assets_category on project_assets(category);
create index if not exists idx_project_assets_primary_task on project_assets(primary_task_id) where primary_task_id is not null;
create index if not exists idx_project_assets_tags_gin on project_assets using gin (tags);
create index if not exists idx_project_assets_metadata_gin on project_assets using gin (metadata);
create index if not exists idx_task_assets_asset on task_assets(asset_id);

-- ── updated_at trigger ────────────────────────────────────────
create or replace function touch_project_assets_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_project_assets_touch on project_assets;
create trigger trg_project_assets_touch
before update on project_assets
for each row execute function touch_project_assets_updated_at();

-- ── RLS ────────────────────────────────────────────────────────
alter table project_assets enable row level security;
alter table task_assets enable row level security;

-- Read access: workspace members of the asset's workspace OR the
-- project owner (covers legacy projects with no workspace_id yet).
drop policy if exists project_assets_read on project_assets;
create policy project_assets_read on project_assets for select
  using (
    uploaded_by = auth.uid()
    or (workspace_id is not null and is_workspace_member(workspace_id))
    or exists (
      select 1 from projects p
       where p.id = project_assets.project_id
         and (p.user_id = auth.uid() or (p.workspace_id is not null and is_workspace_member(p.workspace_id)))
    )
  );

-- Insert: any signed-in user who can read the parent project.
drop policy if exists project_assets_insert on project_assets;
create policy project_assets_insert on project_assets for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from projects p
       where p.id = project_id
         and (p.user_id = auth.uid() or (p.workspace_id is not null and is_workspace_member(p.workspace_id)))
    )
  );

-- Update / delete: uploader or workspace owner.
drop policy if exists project_assets_update on project_assets;
create policy project_assets_update on project_assets for update
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from workspaces w
       where w.id = project_assets.workspace_id and w.primary_owner_id = auth.uid()
    )
  );

drop policy if exists project_assets_delete on project_assets;
create policy project_assets_delete on project_assets for delete
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from workspaces w
       where w.id = project_assets.workspace_id and w.primary_owner_id = auth.uid()
    )
  );

-- task_assets: visible if the user can see the underlying project_asset row.
drop policy if exists task_assets_read on task_assets;
create policy task_assets_read on task_assets for select
  using (
    exists (
      select 1 from project_assets pa
       where pa.id = task_assets.asset_id
         and (
           pa.uploaded_by = auth.uid()
           or (pa.workspace_id is not null and is_workspace_member(pa.workspace_id))
         )
    )
  );

drop policy if exists task_assets_write on task_assets;
create policy task_assets_write on task_assets for all
  using (
    exists (
      select 1 from project_assets pa
       where pa.id = task_assets.asset_id
         and (
           pa.uploaded_by = auth.uid()
           or (pa.workspace_id is not null and is_workspace_member(pa.workspace_id))
         )
    )
  )
  with check (
    exists (
      select 1 from project_assets pa
       where pa.id = task_assets.asset_id
         and (
           pa.uploaded_by = auth.uid()
           or (pa.workspace_id is not null and is_workspace_member(pa.workspace_id))
         )
    )
  );

-- ── storage bucket for actual uploads ────────────────────────
-- public=false so signed URLs are required; clients ask Festag for a link.
insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', false)
on conflict (id) do nothing;

-- Storage RLS: a user can only put files under
-- project-assets/<projectId>/... where they have project access.
-- The first folder segment is the projectId.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
     where schemaname='storage' and tablename='objects'
       and policyname ilike 'project_assets%'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy project_assets_storage_read
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-assets'
    and exists (
      select 1 from projects p
       where p.id = ((storage.foldername(name))[1])::uuid
         and (p.user_id = auth.uid() or (p.workspace_id is not null and is_workspace_member(p.workspace_id)))
    )
  );

create policy project_assets_storage_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-assets'
    and exists (
      select 1 from projects p
       where p.id = ((storage.foldername(name))[1])::uuid
         and (p.user_id = auth.uid() or (p.workspace_id is not null and is_workspace_member(p.workspace_id)))
    )
  );

create policy project_assets_storage_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-assets'
    and exists (
      select 1 from projects p
       where p.id = ((storage.foldername(name))[1])::uuid
         and (p.user_id = auth.uid() or (p.workspace_id is not null and is_workspace_member(p.workspace_id)))
    )
  );
