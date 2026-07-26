import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OKM_DOMAINS, type OkmDomain, readAdaptiveIntelligenceSettings } from '@/lib/intelligence/okm'
import { listOkmFacts, loadWorkspaceAdaptiveSettings } from '@/lib/intelligence/okm-store'

export const runtime = 'nodejs'

async function assertWorkspaceAccess(
  supa: ReturnType<typeof createClient>,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const { data: member } = await (supa as any)
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle()

  if (member) return true

  const { data: ws } = await (supa as any)
    .from('workspaces')
    .select('id, primary_owner_id')
    .eq('id', workspaceId)
    .maybeSingle()

  return !!ws && ws.primary_owner_id === userId
}

/**
 * GET /api/intelligence/okm?workspaceId=…
 * Optional: includeWhenDisabled=1 — still list stored facts for Settings transparency.
 *
 * DELETE /api/intelligence/okm?workspaceId=… — clear all workspace OKM facts.
 */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const workspaceId = req.nextUrl.searchParams.get('workspaceId')?.trim()
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 })
  }

  if (!(await assertWorkspaceAccess(supa, user.id, workspaceId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const settings = readAdaptiveIntelligenceSettings(
    await loadWorkspaceAdaptiveSettings(supa as any, workspaceId),
  )
  const includeWhenDisabled = req.nextUrl.searchParams.get('includeWhenDisabled') === '1'

  if (!settings.adaptive_intelligence_enabled && !includeWhenDisabled) {
    return NextResponse.json({
      facts: [],
      settings,
      disabled: true,
    })
  }

  const domainParam = req.nextUrl.searchParams.get('domain')
  const domain =
    domainParam && (OKM_DOMAINS as readonly string[]).includes(domainParam)
      ? (domainParam as OkmDomain)
      : undefined

  try {
    let facts = await listOkmFacts(supa as any, workspaceId, {
      domain,
      limit: 40,
    })
    if (!settings.adaptive_personal_profiles) {
      facts = facts.filter((f) => !f.subject_user_id && f.domain !== 'people')
    }
    return NextResponse.json({
      facts,
      settings,
      disabled: !settings.adaptive_intelligence_enabled,
    })
  } catch (err: any) {
    const msg = String(err?.message || '')
    if (
      msg.includes('does not exist')
      || msg.includes('could not find the table')
      || msg.includes('schema cache')
    ) {
      return NextResponse.json({
        facts: [],
        settings,
        disabled: !settings.adaptive_intelligence_enabled,
        pendingMigration: true,
      })
    }
    return NextResponse.json({ error: err?.message ?? 'list_failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const workspaceId = req.nextUrl.searchParams.get('workspaceId')?.trim()
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 })
  }

  if (!(await assertWorkspaceAccess(supa, user.id, workspaceId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const { error, count } = await (supa as any)
      .from('okm_facts')
      .delete({ count: 'exact' })
      .eq('workspace_id', workspaceId)
    if (error) {
      const msg = String(error.message || '')
      if (
        error.code === '42P01'
        || error.code === 'PGRST205'
        || msg.includes('does not exist')
        || msg.includes('could not find the table')
      ) {
        return NextResponse.json({ ok: true, deleted: 0, pendingMigration: true })
      }
      throw new Error(error.message)
    }
    return NextResponse.json({ ok: true, deleted: count ?? null })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'delete_failed' }, { status: 500 })
  }
}
