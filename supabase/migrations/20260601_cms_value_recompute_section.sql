-- Recompute a section's status whenever a value changes. SECURITY DEFINER so a
-- client (who may write cms_values but not cms_sections) still flips the section
-- to 'ausgefuellt' — which in turn fires the dev-notify trigger.
create or replace function recompute_cms_section_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_section uuid; v_req_total int; v_req_filled int; v_status text; v_new text;
begin
  select section_id into v_section from cms_fields where id = new.field_id;
  if v_section is null then return new; end if;

  select count(*) filter (where f.required),
         count(*) filter (where f.required
                          and v.value is not null
                          and btrim(v.value::text, '"') <> '')
    into v_req_total, v_req_filled
  from cms_fields f
  left join cms_values v on v.field_id = f.id
  where f.section_id = v_section;

  v_new := case when v_req_total > 0 and v_req_filled = v_req_total then 'ausgefuellt' else 'offen' end;

  select status into v_status from cms_sections where id = v_section;
  if v_status = 'uebernommen' and v_new = 'ausgefuellt' then
    update cms_sections set status = 'ausgefuellt' where id = v_section;
  elsif v_status is distinct from 'uebernommen' and v_status is distinct from v_new then
    update cms_sections set status = v_new where id = v_section;
  end if;
  return new;
end $$;

drop trigger if exists trg_cms_value_recompute on cms_values;
create trigger trg_cms_value_recompute after insert or update on cms_values
for each row execute function recompute_cms_section_status();
