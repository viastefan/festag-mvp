import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runTaskVerification } from '@/lib/tagro/verify-task'

/**
 * POST /api/tagro/verify-task { taskId }
 *
 * Manuelle Re-Verification eines Tasks (z.B. nachdem Nachweise ergänzt
 * wurden). Schreibt eine neue Zeile in `tagro_verifications`, aktualisiert
 * die Task-Felder und legt einen Activity-Log an.
 *
 * Im Gegensatz zu /api/dev/tasks/finish wird hier der `dev_status` NICHT
 * angefasst — nur der Veyra-Layer aktualisiert. Verwendung typisch:
 *   • Dev hat Proof ergänzt nach „proof_missing" und will neu prüfen
 *   • Owner reviewt Tasks Stunden später erneut
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const taskId = String(body?.taskId || '')
    if (!taskId) return NextResponse.json({ error: 'task_id_required' }, { status: 400 })

    const { data: task } = await supabase.from('tasks').select('id,project_id').eq('id', taskId).maybeSingle()
    if (!task) return NextResponse.json({ error: 'task_not_found' }, { status: 404 })

    const verdict = await runTaskVerification(supabase as any, taskId)

    await supabase.from('tagro_verifications').insert({
      task_id: taskId,
      project_id: (task as any).project_id,
      status: verdict.status,
      confidence: verdict.confidence,
      summary: verdict.summary,
      client_summary: verdict.clientSummary,
      issues_json: verdict.issues,
      evidence_json: verdict.evidence,
      recommended_next_action: verdict.recommendedNextAction,
      ran_by: 'tagro',
      model: 'heuristic-v1',
    })

    await supabase.from('tasks').update({
      tagro_verification_status: verdict.status,
      tagro_confidence: verdict.confidence,
      tagro_verification_summary: verdict.summary,
      tagro_client_summary: verdict.clientSummary,
      tagro_internal_notes: verdict.recommendedNextAction,
      updated_at: new Date().toISOString(),
    }).eq('id', taskId)

    await supabase.from('task_activity_logs').insert({
      task_id: taskId,
      project_id: (task as any).project_id,
      actor_id: null,
      actor_kind: 'tagro',
      event: 'tagro_check',
      metadata: { status: verdict.status, confidence: verdict.confidence, issues: verdict.issues },
      visible_to_client: false,
    }).then(() => null, () => null)

    return NextResponse.json({ ok: true, verification: verdict })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
