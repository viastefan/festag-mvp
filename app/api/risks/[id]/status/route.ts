import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeEvent } from '@/lib/risks/engine'
import { isValidRiskStatus, type Risk, type RiskStatus } from '@/lib/risks/types'

export const runtime = 'nodejs'

/**
 * POST /api/risks/[id]/status
 *
 * Lifecycle moves a human makes: resolve, dismiss, accept, reopen, or put a
 * risk back under observation. Body: { status, note? }
 */
const SUMMARY: Partial<Record<RiskStatus, string>> = {
  resolved: 'Als gelöst markiert.',
  dismissed: 'Verworfen — kein relevantes Risiko.',
  accepted: 'Bewusst akzeptiert.',
  mitigated: 'Maßnahme umgesetzt — Risiko abgesichert.',
  monitoring: 'Zurück in Beobachtung.',
  active: 'Wieder als aktiv eingestuft.',
  decision_required: 'Braucht eine Entscheidung.',
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  if (!isValidRiskStatus(body.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }
  const status = body.status as RiskStatus
  const note = typeof body.note === 'string' ? body.note.trim() : ''

  const { data: current } = await (supa as any)
    .from('risks').select('*').eq('id', params.id).maybeSingle()
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const risk = current as Risk

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status }

  if (status === 'resolved' || status === 'mitigated') {
    patch.resolved_at = now
    patch.resolution_note = note || null
  } else if (status === 'dismissed') {
    patch.dismissed_at = now
    patch.dismiss_reason = note || null
  } else {
    // Reopening clears the closing stamps so history stays truthful.
    patch.resolved_at = null
    patch.dismissed_at = null
  }

  const { data, error } = await (supa as any)
    .from('risks').update(patch).eq('id', params.id).select('*').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeEvent(supa, params.id, {
    event_type: status === 'resolved' ? 'resolved'
      : status === 'dismissed' ? 'dismissed'
      : status === 'accepted' ? 'accepted'
      : 'status_change',
    actor_kind: 'user',
    actor_user_id: user.id,
    from_status: risk.status,
    to_status: status,
    summary: note
      ? `${SUMMARY[status] ?? 'Status geändert.'} ${note}`
      : SUMMARY[status] ?? 'Status geändert.',
  })

  return NextResponse.json({ risk: data })
}
