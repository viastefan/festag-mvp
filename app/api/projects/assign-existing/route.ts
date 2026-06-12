import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { translateBudgetNote } from '@/lib/tagro/translate-budget'
import { sendDevAssignmentEmail } from '@/lib/email/send'

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
      .select('id,title,user_id,scope_summary,budget_min,budget_max,budget_currency')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
    if (project.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const devHandle: string | undefined = body?.devHandle?.toString().trim()
    const devEmail: string | undefined = body?.devEmail?.toString().trim().toLowerCase()
    if (!devHandle && !devEmail) return NextResponse.json({ error: 'missing_dev_identifier' }, { status: 400 })

    let devProfile: any = null
    if (devHandle) {
      const { data } = await sb
        .from('profiles')
        .select('id,email,full_name,dev_username,role')
        .eq('dev_username', devHandle)
        .maybeSingle()
      devProfile = data
    }
    if (!devProfile && devEmail) {
      const { data } = await sb
        .from('profiles')
        .select('id,email,full_name,dev_username,role')
        .ilike('email', devEmail)
        .maybeSingle()
      devProfile = data
    }
    if (!devProfile) return NextResponse.json({ error: 'dev_not_found' }, { status: 404 })

    const budgetNote = body?.budgetNote?.toString().trim() || null
    let budgetNoteTranslated: string | null = null
    if (budgetNote) {
      try {
        const t = await translateBudgetNote({
          rawNote: budgetNote,
          projectTitle: project.title,
          budgetMin: project.budget_min,
          budgetMax: project.budget_max,
        })
        budgetNoteTranslated = t.translatedNote
      } catch {
        budgetNoteTranslated = budgetNote
      }
    }

    if (budgetNote) {
      await sb.from('projects').update({
        budget_note_raw: budgetNote,
        budget_note_translated: budgetNoteTranslated,
        delivery_model: 'assign_existing_dev',
      }).eq('id', projectId)
    } else {
      await sb.from('projects').update({
        delivery_model: 'assign_existing_dev',
      }).eq('id', projectId)
    }

    await sb.from('project_proposals').upsert({
      project_id: projectId,
      dev_id: devProfile.id,
      invited_by: user.id,
      status: 'proposed',
      role_on_project: 'developer',
    }, { onConflict: 'project_id,dev_id' })

    await sb.from('notifications').insert({
      user_id: devProfile.id,
      project_id: projectId,
      audience: 'dev',
      kind: 'proposal_received',
      type: 'proposal_received',
      title: `Neues Projektangebot: ${project.title}`,
      body: `Du wurdest für „${project.title}" vorgeschlagen. Prüfe das Briefing und entscheide.`,
      message: `Neues Projektangebot für „${project.title}".`,
      read: false,
      payload: {
        project_id: projectId,
        project_title: project.title,
        budget_min: project.budget_min,
        budget_max: project.budget_max,
        scope_summary: project.scope_summary,
      },
    })

    const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    if (devProfile.email) {
      await sendDevAssignmentEmail({
        to: devProfile.email,
        devName: devProfile.full_name,
        projectTitle: project.title || 'Dein Projekt',
        scope: project.scope_summary,
        devPanelUrl: `${base}/dev`,
        fromName: 'Festag',
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, devId: devProfile.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'assign_existing_failed' }, { status: 500 })
  }
}
