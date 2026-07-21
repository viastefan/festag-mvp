import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OKM_DOMAINS, type OkmDomain, readAdaptiveIntelligenceSettings } from '@/lib/intelligence/okm'
import { listOkmFacts, loadWorkspaceAdaptiveSettings } from '@/lib/intelligence/okm-store'

export const runtime = 'nodejs'

/**
 * GET /api/intelligence/okm?workspaceId=…
 *
 * Lists workspace-scoped Operational DNA facts for Tagro / settings.
 * Respects Adaptive Intelligence master switch (empty when off).
 * Never returns personal-profile facts unless personal profiles are opted in.
 */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const workspaceId = req.nextUrl.searchParams.get('workspaceId')?.trim()
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 })
  }

  const { data: member } = await (supa as any)
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) {
    const { data: ws } = await (supa as any)
      .from('workspaces')
      .select('id, primary_owner_id')
      .eq('id', workspaceId)
      .maybeSingle()
    if (!ws || ws.primary_owner_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  const settings = readAdaptiveIntelligenceSettings(
    await loadWorkspaceAdaptiveSettings(supa as any, workspaceId),
  )
  if (!settings.adaptive_intelligence_enabled) {
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
    return NextResponse.json({ facts, settings })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'list_failed' }, { status: 500 })
  }
}
