import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { translateBudgetNote } from '@/lib/tagro/translate-budget'
import { notifyProjectCreated } from '@/lib/sync/project-created'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
    const sb = service as any

    const body = await req.json().catch(() => ({}))
    const projectId: string | undefined = body?.projectId
    if (!projectId) return NextResponse.json({ error: 'missing_projectId' }, { status: 400 })

    const { data: project } = await sb
      .from('projects')
      .select('id,title,user_id')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
    if (project.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const budget = body?.budget ?? {}
    const budgetMin = budget.min ? Number(budget.min) : null
    const budgetMax = budget.max ? Number(budget.max) : null
    const budgetCurrency = budget.currency || 'EUR'
    const budgetNoteRaw = budget.note ? String(budget.note).trim() : null
    const desiredStartDate = body?.desiredStartDate || null

    let budgetNoteTranslated: string | null = null
    if (budgetNoteRaw) {
      try {
        const translated = await translateBudgetNote({
          rawNote: budgetNoteRaw,
          projectTitle: project.title,
          budgetMin,
          budgetMax,
          currency: budgetCurrency,
        })
        budgetNoteTranslated = translated.translatedNote
      } catch {
        budgetNoteTranslated = budgetNoteRaw
      }
    }

    await sb.from('projects').update({
      delivery_model: 'festag_delivery',
      budget_min: budgetMin,
      budget_max: budgetMax,
      budget_currency: budgetCurrency,
      budget_note_raw: budgetNoteRaw,
      budget_note_translated: budgetNoteTranslated,
      desired_start_date: desiredStartDate,
    }).eq('id', projectId)

    await notifyProjectCreated({
      sb,
      projectId,
      projectTitle: project.title || 'Neues Projekt',
      actorId: user.id,
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'festag_pool_failed' }, { status: 500 })
  }
}
