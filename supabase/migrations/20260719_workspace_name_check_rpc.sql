-- Public workspace-name availability check for /register when
-- SUPABASE_SERVICE_ROLE_KEY is missing on the deployment.
-- SECURITY DEFINER bypasses RLS; only returns availability, never row payloads.

create or replace function public.check_workspace_name_available(
  p_name text,
  p_exclude_workspace_id uuid default null,
  p_exclude_profile_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_slug text;
  v_reserved text[] := array[
    'dashboard','projects','project','tasks','decisions','reports',
    'messages','inbox','ai','notes','observers','clients','teams',
    'settings','connectors','addons','estimator','docs','blog',
    'onboarding','login','register','logout','dev','new-project',
    'whats-new','updates','download','documents','voice-reports',
    'workspace','workspaces','api','auth','invite','invites',
    'festag','admin','help','support','pricing','legal'
  ];
  v_hit uuid;
begin
  v_name := nullif(trim(both from regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), '');
  if v_name is null then
    return jsonb_build_object(
      'ok', true, 'available', false,
      'name', '', 'slug', '',
      'reason', 'Bitte einen Workspace-Namen eingeben.'
    );
  end if;

  if char_length(v_name) > 64 then
    v_name := left(v_name, 64);
  end if;

  if char_length(v_name) < 2 then
    return jsonb_build_object(
      'ok', true, 'available', false,
      'name', v_name, 'slug', '',
      'reason', 'Der Name muss mindestens 2 Zeichen haben.'
    );
  end if;

  -- Mirror lib/pending-workspace slugifyWorkspaceName (umlauts + non-alnum → -).
  v_slug := lower(v_name);
  v_slug := replace(replace(replace(replace(v_slug, 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss');
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  v_slug := left(v_slug, 32);

  if v_slug is null or char_length(v_slug) < 2 then
    return jsonb_build_object(
      'ok', true, 'available', false,
      'name', v_name, 'slug', '',
      'reason', 'Bitte einen Namen mit Buchstaben oder Zahlen verwenden.'
    );
  end if;

  if v_slug = any (v_reserved) then
    return jsonb_build_object(
      'ok', true, 'available', false,
      'name', v_name, 'slug', v_slug,
      'reason', 'Dieser Name ist reserviert. Bitte wähle einen anderen.'
    );
  end if;

  select w.id into v_hit
  from public.workspaces w
  where w.slug = v_slug
    and (p_exclude_workspace_id is null or w.id <> p_exclude_workspace_id)
  limit 1;
  if v_hit is not null then
    return jsonb_build_object(
      'ok', true, 'available', false,
      'name', v_name, 'slug', v_slug,
      'reason', 'Dieser Workspace-Name ist bereits vergeben.'
    );
  end if;

  select w.id into v_hit
  from public.workspaces w
  where lower(trim(both from regexp_replace(coalesce(w.name, ''), '\s+', ' ', 'g'))) = lower(v_name)
    and (p_exclude_workspace_id is null or w.id <> p_exclude_workspace_id)
  limit 1;
  if v_hit is not null then
    return jsonb_build_object(
      'ok', true, 'available', false,
      'name', v_name, 'slug', v_slug,
      'reason', 'Dieser Workspace-Name ist bereits vergeben.'
    );
  end if;

  select p.id into v_hit
  from public.profiles p
  where p.dev_workspace_name is not null
    and lower(trim(both from regexp_replace(coalesce(p.dev_workspace_name, ''), '\s+', ' ', 'g'))) = lower(v_name)
    and (p_exclude_profile_id is null or p.id <> p_exclude_profile_id)
  limit 1;
  if v_hit is not null then
    return jsonb_build_object(
      'ok', true, 'available', false,
      'name', v_name, 'slug', v_slug,
      'reason', 'Dieser Workspace-Name ist bereits vergeben.'
    );
  end if;

  return jsonb_build_object(
    'ok', true, 'available', true,
    'name', v_name, 'slug', v_slug
  );
end;
$$;

revoke all on function public.check_workspace_name_available(text, uuid, uuid) from public;
grant execute on function public.check_workspace_name_available(text, uuid, uuid) to anon, authenticated, service_role;
