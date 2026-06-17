import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeTagroPreview, type TagroExecuteInput } from '@/lib/tagro/overlay-execute'

export const runtime = 'nodejs'

/**
 * POST /api/tagro/execute
 * Server-authenticated apply for Tagro preview results (task, decision, note, status report).
 */
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Partial<TagroExecuteInput>
  const preview = String(body?.preview ?? '').trim()
  if (!preview) {
    return NextResponse.json({ error: 'preview_required' }, { status: 400 })
  }

  const ctx = body?.ctx ?? { contextType: 'empty' }
  const result = await executeTagroPreview({
    preview,
    suggestedAction: body?.suggestedAction,
    ctx: {
      contextType: String(ctx.contextType ?? 'empty'),
      id: ctx.id ? String(ctx.id) : undefined,
      projectId: ctx.projectId ? String(ctx.projectId) : undefined,
      title: ctx.title ? String(ctx.title) : undefined,
    },
  })

  if (!result.ok) {
    return NextResponse.json({
      error: 'execute_failed',
      mode: result.mode,
      message: result.message,
    }, { status: 422 })
  }

  const notificationId = body?.notificationId ? String(body.notificationId) : null
  if (notificationId) {
    await supabase.from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .then(() => null, () => null)
  }

  return NextResponse.json(result)
}
