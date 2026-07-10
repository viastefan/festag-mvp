-- Documents feature: dev + client access to agency_documents.
-- Run once in Supabase SQL Editor if `supabase db push` is blocked.

drop policy if exists agency_documents_dev_project on agency_documents;
create policy agency_documents_dev_project on agency_documents for all
  using (
    project_id is not null
    and exists (
      select 1 from projects p
      where p.id = agency_documents.project_id
        and (
          p.assigned_dev = auth.uid()
          or exists (
            select 1 from project_assignments pa
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
      select 1 from projects p
      where p.id = agency_documents.project_id
        and (
          p.assigned_dev = auth.uid()
          or exists (
            select 1 from project_assignments pa
            where pa.project_id = p.id
              and pa.user_id = auth.uid()
              and pa.active = true
          )
        )
    )
  );

drop policy if exists agency_documents_client_read on agency_documents;
create policy agency_documents_client_read on agency_documents for select
  using (
    status in ('sent', 'paid')
    and project_id is not null
    and exists (
      select 1 from projects p
      where p.id = agency_documents.project_id
        and (p.client_id = auth.uid() or p.user_id = auth.uid())
    )
  );
