import { NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { emitDevActionToClient } from '@/lib/client/connection-bridge'

export const runtime = 'nodejs'

/**
 * POST /api/dev/publish-to-client
 *
 * Dev manually sends a client-safe update via Tagro translation.
 * Body: { projectId, text, taskId?, notificationId? }
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user: cookieUser } } = await supabase.auth.getUser()
    const user = cookieUser ?? getDevUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const projectId = String(body?.projectId || '')
    const text = String(body?.text || '').trim()
    const taskId = body?.taskId ? String(body.taskId) : null
    const previewOnly = !!body?.preview
    if (!projectId || !text) {
      return NextResponse.json({ error: 'project_and_text_required' }, { status: 400 })
    }

    const writer = getServiceClient() ?? supabase
    const { data: project } = await supabase.from('projects')
      .select('id,title,user_id,client_id')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

    if (previewOnly) {
      const { translateDevUpdate } = await import('@/lib/tagro/translate-update')
      const translated = await translateDevUpdate({
        devText: text,
        projectTitle: (project as any).title ?? null,
      })
      return NextResponse.json({
        ok: true,
        preview: true,
        clientSummary: translated.clientSummary,
        blockers: translated.blockers,
        nextSteps: translated.nextSteps,
      })
    }

    const { clientNotified, signalId } = await emitDevActionToClient(writer as any, {
      projectId,
      type: 'status_note',
      content: text,
      source: 'dev_publish',
      visibility: 'client',
      createdBy: user.id,
      relatedTaskId: taskId,
      inboxTitle: `${(project as any).title} · Team-Update`,
      notifyClient: true,
    })

    return NextResponse.json({
      ok: true,
      clientSummary: text,
      inboxItemId: signalId,
      clientNotified,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server_error' }, { status: 500 })
  }
}
