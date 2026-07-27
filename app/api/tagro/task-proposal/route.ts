import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from '@/lib/supabase/server'
import { createManualClientTask, createTagroClientTask, ensureProjectAccess } from '@/lib/tagro/task-actions'
import { TASK_PROPOSAL_RUN } from '@/lib/tagro/model/runs'
import { runTagroModel } from '@/lib/tagro/run'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function serviceClient(fallback: any) {
  return SERVICE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    : fallback
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const projectId = String(body.projectId || body.project_id || '').trim()
    const mode = body.mode === 'manual' ? 'manual' : 'tagro'
    const description = String(body.description || body.text || '').trim()
    const title = String(body.title || '').trim()

    if (!projectId) {
      return NextResponse.json({ ok: false, error: 'project_id_required' }, { status: 400 })
    }
    if (!title && !description) {
      return NextResponse.json({ ok: false, error: 'description_required' }, { status: 400 })
    }

    const cookieClient = createCookieClient()
    const { data: { user } } = await cookieClient.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    const sb = serviceClient(cookieClient)
    await ensureProjectAccess(sb as any, projectId, user.id)

    if (mode === 'manual') {
      const task = await createManualClientTask({
        sb: sb as any,
        actorId: user.id,
        projectId,
        title: title || description.split(/\s+/).slice(0, 9).join(' '),
        description,
        priority: body.priority,
        dueDate: body.dueDate || body.due_date || null,
        labels: Array.isArray(body.labels) ? body.labels : [],
      })
      return NextResponse.json({ ok: true, task })
    }

    const shouldCreate = Boolean(body.confirmCreate || body.create)
    let proposal = body.proposal
    let usedOperationalDna = false

    if (!proposal) {
      const result = await runTagroModel({
        sb: sb as any,
        definition: TASK_PROPOSAL_RUN,
        input: { title, description },
        projectId,
        actorId: user.id,
      })
      proposal = {
        ...(result.output as any),
        used_operational_dna: result.usedOperationalDna,
      }
      usedOperationalDna = result.usedOperationalDna
    }

    if (!shouldCreate) {
      return NextResponse.json({ ok: true, proposal, usedOperationalDna: Boolean(proposal?.used_operational_dna ?? usedOperationalDna) })
    }

    const task = await createTagroClientTask({
      sb: sb as any,
      actorId: user.id,
      projectId,
      proposal,
      originalText: description || title,
      dueDate: body.dueDate || body.due_date || null,
      labels: Array.isArray(body.labels) ? body.labels : [],
    })

    return NextResponse.json({ ok: true, task, proposal })
  } catch (error: any) {
    const message = error?.message || 'task_proposal_failed'
    const status = message === 'project_access_denied' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}

