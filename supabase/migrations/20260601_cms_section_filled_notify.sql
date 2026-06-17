-- When a CMS section flips to 'ausgefuellt', notify the project owner + the
-- assigned dev(s). SECURITY DEFINER so it works regardless of who filled it,
-- without a service-role key. Wrapped so a notify error never blocks the save.
create or replace function notify_cms_section_filled()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text;
begin
  if new.status = 'ausgefuellt' and (old.status is distinct from new.status) then
    begin
      select p.user_id, p.title into v_owner, v_title from projects p where p.id = new.project_id;

      insert into notifications (user_id, type, title, message, link, project_id)
      values (v_owner, 'cms_section_filled', 'Inhalte ausgefüllt',
              'Der Bereich „'||new.title||'" wurde im Inhalts-Intake ausgefüllt.',
              '/project/'||new.project_id, new.project_id);

      insert into notifications (user_id, type, title, message, link, project_id)
      select pa.user_id, 'cms_section_filled', 'Inhalte ausgefüllt',
             'Der Bereich „'||new.title||'" wurde im Inhalts-Intake ausgefüllt.',
             '/dev/projects/'||new.project_id, new.project_id
      from project_assignments pa
      where pa.project_id = new.project_id and pa.active = true and pa.user_id <> v_owner;
    exception when others then null;
    end;
  end if;
  return new;
end $$;

drop trigger if exists trg_cms_section_filled on cms_sections;
create trigger trg_cms_section_filled after update on cms_sections
for each row execute function notify_cms_section_filled();
