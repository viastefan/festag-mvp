import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { translateDevUpdate } from '@/lib/tagro/translate-update'
import { publishTagroClientUpdate } from '@/lib/sync/client-bridge'

/**
 * POST /api/inbox/reply
 * Agency reply from Benachrichtigungen — German in, Tagro translates for client.
 */
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  const projectId = typeof body?.projectId === 'string' ? body.projectId : ''
  if (!content || !projectId) {
    return NextResponse.json({ error: 'content_and_project_required' }, { status: 400 })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, client_id, user_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const translated = await translateDevUpdate({
    devText: content,
    projectTitle: project.title ?? null,
  })

  const writer = getServiceClient() ?? supabase

  if (project.client_id) {
    try {
      const result = await publishTagroClientUpdate({
        writer: writer as any,
        clientId: project.client_id,
        projectId,
        projectTitle: project.title ?? null,
        devText: content,
        preTranslated: translated.clientSummary,
        actorId: user.id,
        sourceTable: 'inbox_threads',
        sourceId: typeof body?.threadId === 'string' ? body.threadId : projectId,
        inboxTitle: project.title ? `${project.title}, Antwort` : 'Antwort',
      })
      return NextResponse.json({ ok: true, clientSummary: result.clientSummary })
    } catch {
      return NextResponse.json({ error: 'publish_failed' }, { status: 500 })
    }
  }

  const { error } = await writer.from('messages').insert({
    project_id: projectId,
    sender_id: user.id,
    message: translated.clientSummary,
    is_ai: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, clientSummary: translated.clientSummary })
}
