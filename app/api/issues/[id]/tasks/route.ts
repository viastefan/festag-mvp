import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ISSUE_TASK_LINK_KINDS, type IssueTaskLinkKind } from '@/lib/issues/types'

export const runtime = 'nodejs'

/**
 * POST   /api/issues/:id/tasks   { task_id, link_kind? }
 * DELETE /api/issues/:id/tasks   { task_id }
 */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { task_id?: string; link_kind?: string }
  if (!body.task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

  const linkKind: IssueTaskLinkKind = ISSUE_TASK_LINK_KINDS.includes(body.link_kind as IssueTaskLinkKind)
    ? (body.link_kind as IssueTaskLinkKind)
    : 'related'

  const { data: issue } = await (supa as any)
    .from('issues')
    .select('id,project_id')
    .eq('id', ctx.params.id)
    .maybeSingle()

  if (!issue) return NextResponse.json({ error: 'issue not found' }, { status: 404 })

  const { data: task } = await (supa as any)
    .from('tasks')
    .select('id,project_id')
    .eq('id', body.task_id)
    .maybeSingle()

  if (!task) return NextResponse.json({ error: 'task not found' }, { status: 404 })
  if (task.project_id !== issue.project_id) {
    return NextResponse.json({ error: 'task must belong to the same project' }, { status: 400 })
  }

  const { data, error } = await (supa as any)
    .from('issue_task_links')
    .upsert({
      issue_id: ctx.params.id,
      task_id: body.task_id,
      link_kind: linkKind,
    }, { onConflict: 'issue_id,task_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ link: data })
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { task_id?: string }
  if (!body.task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

  const { error } = await (supa as any)
    .from('issue_task_links')
    .delete()
    .eq('issue_id', ctx.params.id)
    .eq('task_id', body.task_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
