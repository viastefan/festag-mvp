import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from '@/lib/supabase/server'
import { buildTagroContext, contextToPromptText } from '@/lib/tagro/task-context-builder'
import { taskProposalPrompt } from '@/lib/tagro/task-prompts'
import { runOpenAIJson } from '@/lib/tagro/openai'
import { classifyClientTask } from '@/lib/tagro/task-classifier'
import { createManualClientTask, createTagroClientTask, ensureProjectAccess, saveTagroRun } from '@/lib/tagro/task-actions'
import { clampConfidence, clampPriority } from '@/lib/tagro/task-rules'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function serviceClient(fallback: any) {
  return SERVICE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    : fallback
}

function fallbackProposal(text: string, title?: string) {
  const classified = classifyClientTask(`${title ?? ''} ${text}`)
  const cleanTitle = title?.trim() || text.trim().split(/\s+/).slice(0, 9).join(' ').replace(/[.,;:!?]+$/, '') || 'Neue Aufgabe'

  return {
    client_summary: text.trim() || cleanTitle,
    suggested_title: cleanTitle,
    suggested_description: text.trim() || cleanTitle,
    task_type: 'tagro_structured_client_task',
    priority: classified.priority,
    possible_dev_interpretation: `Client-Wunsch strukturieren und als ${classified.taskType} im Projekt-Workflow prüfen.`,
    possible_dev_tasks: [`${cleanTitle} fachlich prüfen`, `${cleanTitle} technisch einordnen`],
    risks: [],
    open_questions: [],
    recommended_next_step: 'Als Aufgabe im Projekt-Workflow anlegen.',
    needs_decision: false,
    confidence_score: 0.64,
  }
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

    if (!proposal) {
      const context = await buildTagroContext({ sb: sb as any, projectId, purpose: 'task_proposal' })
      const prompt = taskProposalPrompt(contextToPromptText(context), `${title ? `${title}\n` : ''}${description}`)
      const result = await runOpenAIJson({
        prompt,
        runType: 'task_proposal',
        fallback: () => fallbackProposal(description, title),
      })
      proposal = {
        ...fallbackProposal(description, title),
        ...(result.output as any),
        priority: clampPriority((result.output as any).priority, 'medium'),
        confidence_score: clampConfidence((result.output as any).confidence_score),
      }
      await saveTagroRun(sb as any, {
        projectId,
        runType: 'task_proposal',
        inputJson: { title, description },
        outputJson: proposal,
        model: result.model,
        status: result.status,
        errorMessage: (result as any).error ?? null,
      })
    }

    if (!shouldCreate) {
      return NextResponse.json({ ok: true, proposal })
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

