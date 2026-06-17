import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deriveDecisionRisks } from '@/lib/decisions/risks'

export const runtime = 'nodejs'

const OPEN_STATES = new Set(['open', 'waiting_for_client', 'in_progress'])

/**
 * GET /api/decisions/risks
 * Returns client-facing risk signals derived from open decisions.
 */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const [{ data: forMe }, { data: byMe }] = await Promise.all([
    (supa as any).from('decisions').select('*').eq('requested_for', user.id).order('created_at', { ascending: false }).limit(200),
    (supa as any).from('decisions').select('*').eq('created_by', user.id).order('created_at', { ascending: false }).limit(200),
  ])

  const seen = new Set<string>()
  const merged: any[] = []
  for (const row of [...(forMe ?? []), ...(byMe ?? [])]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    merged.push(row)
  }

  const open = merged.filter(d => OPEN_STATES.has(d.status))
  const projectIds = Array.from(new Set(open.map(d => d.project_id).filter(Boolean)))

  const projects: Record<string, { id: string; title: string }> = {}
  if (projectIds.length) {
    const { data: rows } = await (supa as any)
      .from('projects')
      .select('id,title')
      .in('id', projectIds)
    for (const p of rows ?? []) projects[p.id] = p
  }

  const risks = deriveDecisionRisks(open, projects)

  return NextResponse.json({
    risks,
    count: risks.length,
    critical_count: risks.filter(r => r.severity === 'critical').length,
    open_count: open.filter(d => d.requested_for === user.id).length,
  })
}
