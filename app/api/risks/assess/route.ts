import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const LEVELS = new Set(['low', 'mid', 'high'])
const MEASURES = new Set(['accept', 'mitigate', 'delegate'])

/** Fehlt die Tabelle noch (Migration nicht eingespielt), soll der Flow nicht kippen. */
function isMissingTable(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || /relation .*risk_assessments.* does not exist/i.test(error?.message ?? '')
}

/**
 * GET /api/risks/assess
 * Liefert die bereits bewerteten Task-IDs des Nutzers.
 */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data, error } = await (supa as any)
    .from('risk_assessments')
    .select('task_id,impact,probability,measure,source,created_at')
    .eq('user_id', user.id)

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ assessments: [], pending_migration: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ assessments: data ?? [] })
}

/**
 * POST /api/risks/assess
 * Speichert Auswirkung, Wahrscheinlichkeit und Maßnahme zu einem Risiko.
 */
export async function POST(request: Request) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const taskId = typeof body.task_id === 'string' ? body.task_id : ''
  const impact = String(body.impact ?? '')
  const probability = String(body.probability ?? '')
  const measure = String(body.measure ?? '')
  const source = body.source === 'tagro' ? 'tagro' : 'manual'
  const projectId = typeof body.project_id === 'string' ? body.project_id : null

  if (!taskId) return NextResponse.json({ error: 'task_id required' }, { status: 400 })
  if (!LEVELS.has(impact)) return NextResponse.json({ error: 'invalid impact' }, { status: 400 })
  if (!LEVELS.has(probability)) return NextResponse.json({ error: 'invalid probability' }, { status: 400 })
  if (!MEASURES.has(measure)) return NextResponse.json({ error: 'invalid measure' }, { status: 400 })

  const { data, error } = await (supa as any)
    .from('risk_assessments')
    .upsert({
      task_id: taskId,
      user_id: user.id,
      project_id: projectId,
      impact,
      probability,
      measure,
      source,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'task_id,user_id' })
    .select()
    .single()

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ ok: false, pending_migration: true }, { status: 200 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, assessment: data })
}
