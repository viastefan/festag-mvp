import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { normalizeWorkspaceName, slugifyWorkspaceName } from '@/lib/pending-workspace'
import { RESERVED_SLUGS } from '@/lib/workspace-slug'

export const runtime = 'nodejs'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

type Region = 'eu' | 'us' | 'global'

async function assertNameAvailable(
  sb: ReturnType<typeof createServiceClient>,
  name: string,
  slug: string,
  excludeWorkspaceId?: string | null,
): Promise<string | null> {
  if (name.length < 2) return 'Der Name muss mindestens 2 Zeichen haben.'
  if (!slug || slug.length < 2) return 'Bitte einen Namen mit Buchstaben oder Zahlen verwenden.'
  if (RESERVED_SLUGS.has(slug)) return 'Dieser Name ist reserviert. Bitte wähle einen anderen.'

  const { data: bySlug } = await sb
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (bySlug && bySlug.id !== excludeWorkspaceId) {
    return 'Dieser Workspace-Name ist bereits vergeben.'
  }

  const { data: byName } = await sb
    .from('workspaces')
    .select('id, name')
    .ilike('name', name.replace(/[%_]/g, '\\$&'))
    .limit(5)
  const hit = (byName || []).find(
    (row: { id: string; name: string }) =>
      row.id !== excludeWorkspaceId &&
      normalizeWorkspaceName(row.name).toLowerCase() === name.toLowerCase(),
  )
  if (hit) return 'Dieser Workspace-Name ist bereits vergeben.'
  return null
}

/**
 * POST /api/workspaces/bootstrap
 *
 * Creates or renames the signed-in user's personal workspace from the name
 * captured on /register. Name/slug must be globally unique (no auto-suffix).
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const sbCookie = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(_cookies: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
      },
    })
    const { data: { user } } = await sbCookie.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, reason: 'no_session' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ ok: false, reason: 'service_key_missing' }, { status: 500 })
    }
    const sb = createServiceClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let body: { name?: string; region?: Region } = {}
    try { body = await req.json() } catch { /* empty */ }

    const metaName = typeof user.user_metadata?.pending_workspace_name === 'string'
      ? user.user_metadata.pending_workspace_name
      : ''
    const name = normalizeWorkspaceName(body.name || metaName)
    if (!name) {
      return NextResponse.json({ ok: false, reason: 'name_required', message: 'Bitte einen Workspace-Namen eingeben.' }, { status: 400 })
    }

    const slug = slugifyWorkspaceName(name)
    const region: Region =
      body.region === 'us' || body.region === 'global' || body.region === 'eu'
        ? body.region
        : 'eu'

    const { data: existing } = await sb
      .from('workspaces')
      .select('id, slug, name')
      .eq('primary_owner_id', user.id)
      .eq('is_personal', true)
      .maybeSingle()

    const workspaceId = existing?.id as string | undefined
    const conflict = await assertNameAvailable(sb, name, slug, workspaceId ?? null)
    if (conflict) {
      return NextResponse.json({ ok: false, reason: 'name_taken', message: conflict }, { status: 409 })
    }

    if (workspaceId) {
      const { error } = await sb
        .from('workspaces')
        .update({ name, slug, region })
        .eq('id', workspaceId)
      if (error) {
        const taken = /duplicate|unique|workspaces_slug/i.test(error.message)
        return NextResponse.json({
          ok: false,
          reason: taken ? 'name_taken' : error.message,
          message: taken ? 'Dieser Workspace-Name ist bereits vergeben.' : error.message,
        }, { status: taken ? 409 : 500 })
      }
    } else {
      const { data: created, error } = await sb
        .from('workspaces')
        .insert({
          name,
          slug,
          region,
          primary_owner_id: user.id,
          is_personal: true,
          mode: 'team',
          metadata: { sourced_from: 'register' },
        })
        .select('id, slug')
        .single()
      if (error) {
        const taken = /duplicate|unique|workspaces_slug/i.test(error.message)
        return NextResponse.json({
          ok: false,
          reason: taken ? 'name_taken' : error.message,
          message: taken ? 'Dieser Workspace-Name ist bereits vergeben.' : error.message,
        }, { status: taken ? 409 : 500 })
      }
      if (!created?.id) {
        return NextResponse.json({ ok: false, reason: 'create_failed' }, { status: 500 })
      }
      await sb.from('workspace_members').upsert(
        { workspace_id: created.id, user_id: user.id, role: 'owner' },
        { onConflict: 'workspace_id,user_id' },
      )
      await sb.from('onboarding_state').upsert({
        user_id: user.id,
        current_step: 'profile',
        workspace_done: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      try {
        await sb.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata || {}),
            pending_workspace_name: null,
            workspace_name: name,
          },
        })
      } catch { /* non-fatal */ }

      return NextResponse.json({
        ok: true,
        workspace: { id: created.id, name, slug: created.slug, region },
      })
    }

    await sb.from('workspace_members').upsert(
      { workspace_id: workspaceId, user_id: user.id, role: 'owner' },
      { onConflict: 'workspace_id,user_id' },
    )
    await sb.from('onboarding_state').upsert({
      user_id: user.id,
      current_step: 'profile',
      workspace_done: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    try {
      await sb.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata || {}),
          pending_workspace_name: null,
          workspace_name: name,
        },
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({
      ok: true,
      workspace: { id: workspaceId, name, slug, region },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || 'bootstrap_failed' }, { status: 500 })
  }
}
