import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getServiceClient } from '@/lib/supabase/service'
import { normalizeWorkspaceName } from '@/lib/pending-workspace'
import {
  checkWorkspaceNameAvailability,
  invalidateWorkspaceNameCache,
} from '@/lib/workspace-name-availability'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  getClientIp,
  rateLimitResponse,
} from '@/lib/auth-request'
import { getSupabaseUrl } from '@/lib/supabase/env'

export const runtime = 'nodejs'

const SUPABASE_URL = getSupabaseUrl()
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const BOOTSTRAP_LIMIT = { max: 20, windowMs: 15 * 60 * 1000 }

type Region = 'eu' | 'us' | 'global'

/**
 * POST /api/workspaces/bootstrap
 *
 * Creates or renames the signed-in user's personal workspace from the name
 * captured on /register or /create-workspace. Name/slug must be globally unique
 * (no auto-suffix). Idempotent when the personal workspace already exists.
 */
export async function POST(req: NextRequest) {
  try {
    const csrf = assertSameOriginOrNoOrigin(req)
    if (csrf) return csrf

    const ip = getClientIp(req)
    const gate = checkAuthRateLimit(`ws-bootstrap:ip:${ip}`, BOOTSTRAP_LIMIT)
    if (!gate.ok) return rateLimitResponse(gate.retryAfterSec)

    const cookieStore = cookies()
    const sbCookie = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(_cookies: { name: string; value: string; options: CookieOptions }[]) { /* read-only — session already established */ },
      },
    })
    const { data: { user } } = await sbCookie.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, reason: 'no_session' }, { status: 401 })

    const userGate = checkAuthRateLimit(`ws-bootstrap:u:${user.id}`, BOOTSTRAP_LIMIT)
    if (!userGate.ok) return rateLimitResponse(userGate.retryAfterSec)

    const sb = getServiceClient()
    if (!sb) {
      return NextResponse.json({ ok: false, reason: 'service_key_missing' }, { status: 500 })
    }

    let body: { name?: string; region?: Region } = {}
    try { body = await req.json() } catch { /* empty */ }

    const metaName = typeof user.user_metadata?.pending_workspace_name === 'string'
      ? user.user_metadata.pending_workspace_name
      : ''
    const rawName = normalizeWorkspaceName(body.name || metaName)
    if (!rawName) {
      return NextResponse.json(
        { ok: false, reason: 'name_required', message: 'Bitte einen Workspace-Namen eingeben.' },
        { status: 400 },
      )
    }

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

    const availability = await checkWorkspaceNameAvailability(sb, rawName, {
      excludeWorkspaceId: workspaceId ?? null,
      excludeProfileId: user.id,
      bypassCache: true, // claim path — never trust soft-positive cache
    })
    if (!availability.available) {
      return NextResponse.json(
        { ok: false, reason: 'name_taken', message: availability.reason },
        { status: 409 },
      )
    }

    const { name, slug } = availability

    const finishSideEffects = async (wsId: string) => {
      await Promise.all([
        sb.from('workspace_members').upsert(
          { workspace_id: wsId, user_id: user.id, role: 'owner' },
          { onConflict: 'workspace_id,user_id' },
        ),
        sb.from('onboarding_state').upsert({
          user_id: user.id,
          current_step: 'profile',
          workspace_done: true,
          // Hybrid onboarding continues on /onboarding (profile + team).
          // Do not set completed_at here.
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }),
        sb.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata || {}),
            pending_workspace_name: null,
            workspace_name: name,
          },
        }).catch(() => null),
      ])
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
      invalidateWorkspaceNameCache(name)
      await finishSideEffects(workspaceId)
      return NextResponse.json({
        ok: true,
        workspace: { id: workspaceId, name, slug, region },
      })
    }

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
      // Concurrent bootstrap for the same owner: treat existing personal ws as success.
      const { data: raced } = await sb
        .from('workspaces')
        .select('id, slug, name')
        .eq('primary_owner_id', user.id)
        .eq('is_personal', true)
        .maybeSingle()
      if (raced?.id) {
        const { error: updErr } = await sb
          .from('workspaces')
          .update({ name, slug, region })
          .eq('id', raced.id)
        if (updErr) {
          const taken = /duplicate|unique|workspaces_slug/i.test(updErr.message)
          return NextResponse.json({
            ok: false,
            reason: taken ? 'name_taken' : updErr.message,
            message: taken ? 'Dieser Workspace-Name ist bereits vergeben.' : updErr.message,
          }, { status: taken ? 409 : 500 })
        }
        invalidateWorkspaceNameCache(name)
        await finishSideEffects(raced.id)
        return NextResponse.json({
          ok: true,
          workspace: { id: raced.id, name, slug, region },
        })
      }
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

    invalidateWorkspaceNameCache(name)
    await finishSideEffects(created.id)

    return NextResponse.json({
      ok: true,
      workspace: { id: created.id, name, slug: created.slug, region },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || 'bootstrap_failed' }, { status: 500 })
  }
}
