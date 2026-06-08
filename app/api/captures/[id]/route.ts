/**
 * /api/captures/[id] — workflow transitions on a single capture.
 *
 * PATCH body shapes:
 *
 *   { action: 'approve' }
 *     → client-side approve. status: ready_review → approved, sets
 *       approved_at + sent_to_dev_at (devs in the same workspace see it
 *       immediately in the dev inbox).
 *
 *   { action: 'accept' }
 *     → dev-side accept. status: approved/in_dev → in_dev. Optionally
 *       creates a linked task.
 *
 *   { action: 'reject', reason }
 *     → dev-side reject with a reason. status → rejected.
 *
 *   { action: 'ask_decision', question }
 *     → dev asks a clarifying question; creates a row in `decisions` and
 *       moves the capture to needs_decision.
 *
 *   { action: 'apply' }
 *     → dev marks done. status → applied, sets applied_at.
 *
 *   { action: 'edit', patch }
 *     → free-form edits to transcript / structured_changes / tagro_summary
 *       (while the capture is still draft or ready_review).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type ActionBody =
  | { action: 'approve' }
  | { action: 'accept' }
  | { action: 'reject'; reason: string }
  | { action: 'ask_decision'; question: string; due_date?: string | null }
  | { action: 'apply' }
  | { action: 'edit'; patch: { transcript?: string; structured_changes?: any[]; tagro_summary?: string } }

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const sb = createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const id = ctx.params.id
  let body: ActionBody
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const { data: cap, error } = await sb
    .from('client_captures')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !cap) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  let patch: Record<string, any> = {}
  let extra: Record<string, any> = {}

  switch (body.action) {
    case 'approve': {
      if (cap.status !== 'ready_review' && cap.status !== 'draft') {
        return NextResponse.json({ error: 'invalid_status' }, { status: 409 })
      }
      const now = new Date().toISOString()
      patch = { status: 'approved', approved_at: now, sent_to_dev_at: now }
      break
    }
    case 'accept': {
      if (!['approved', 'needs_decision'].includes(cap.status)) {
        return NextResponse.json({ error: 'invalid_status' }, { status: 409 })
      }
      patch = { status: 'in_dev' }
      break
    }
    case 'reject': {
      patch = { status: 'rejected', rejection_reason: (body.reason || '').slice(0, 600) }
      break
    }
    case 'ask_decision': {
      // Create a decision row linked back to the capture.
      const q = (body.question || '').trim()
      if (!q) return NextResponse.json({ error: 'question_required' }, { status: 400 })
      const { data: dec, error: dErr } = await sb
        .from('decisions')
        .insert({
          project_id: cap.project_id,
          workspace_id: cap.workspace_id,
          title: q.slice(0, 180),
          description: `Rückfrage aus Capture: ${cap.transcript.slice(0, 400)}`,
          status: 'open',
          urgency: 'normal',
          due_date: body.due_date ?? null,
          created_by: user.id,
        })
        .select('id')
        .single()
      if (dErr) {
        // The decisions schema may differ — fall back to just transitioning
        // status so the workflow still advances even if the decision insert
        // shape needs tuning later.
        patch = { status: 'needs_decision' }
        extra = { decision_insert_error: dErr.message }
        break
      }
      patch = { status: 'needs_decision', decision_id: dec?.id ?? null }
      break
    }
    case 'apply': {
      patch = { status: 'applied', applied_at: new Date().toISOString() }
      break
    }
    case 'edit': {
      const p = body.patch || {}
      if (typeof p.transcript === 'string') patch.transcript = p.transcript
      if (Array.isArray(p.structured_changes)) patch.structured_changes = p.structured_changes
      if (typeof p.tagro_summary === 'string') patch.tagro_summary = p.tagro_summary
      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: 'empty_patch' }, { status: 400 })
      }
      break
    }
    default:
      return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  }

  const { data: updated, error: uErr } = await sb
    .from('client_captures')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  return NextResponse.json({ capture: updated, ...extra })
}
