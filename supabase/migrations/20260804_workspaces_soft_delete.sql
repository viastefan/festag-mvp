-- Soft-delete for workspace management (owner confirmation flow)
alter table public.workspaces
  add column if not exists deleted_at timestamptz null;

create index if not exists workspaces_deleted_at_idx
  on public.workspaces (deleted_at)
  where deleted_at is null;

comment on column public.workspaces.deleted_at is
  'Soft-delete timestamp. Active workspaces have deleted_at IS NULL.';
