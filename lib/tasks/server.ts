/**
 * Server-side task helpers shared by every /api/tasks route.
 * One place resolves "does this person exist on this task, and as what".
 */

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { resolveProjectAccess, taskVisibleTo, type ProjectAccess } from '@/lib/tasks/access'
import { isTaskLifecycle, type TaskLifecycle } from '@/lib/tasks/lifecycle'

export type TaskContext = {
  user: { id: string }
  /** session client — respects RLS, used for reads */
  supabase: SupabaseClient<any>
  /** service client when configured — used for authorised writes + fan-out */
  writer: SupabaseClient<any>
  task: any
  access: ProjectAccess
  flow: TaskLifecycle
}

export type TaskContextError = { response: NextResponse }

export function isContextError(value: TaskContext | TaskContextError): value is TaskContextError {
  return 'response' in value
}

/**
 * Resolve the task and the caller's role on it, or produce the right refusal.
 * A task the caller may not see answers 404 — never 403 — so the API does not
 * confirm that an id exists.
 */
export async function loadTaskContext(taskId: string): Promise<TaskContext | TaskContextError> {
  const supabase = createClient() as unknown as SupabaseClient<any>
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { response: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }) }
  }
  if (!taskId) {
    return { response: NextResponse.json({ error: 'task_required' }, { status: 400 }) }
  }

  const { data: task } = await (supabase as any).from('tasks').select('*').eq('id', taskId).maybeSingle()
  if (!task) {
    return { response: NextResponse.json({ error: 'task_not_found' }, { status: 404 }) }
  }

  const access = await resolveProjectAccess(supabase as any, task.project_id, user.id)
  if (!access || !taskVisibleTo(task, access.role)) {
    return { response: NextResponse.json({ error: 'task_not_found' }, { status: 404 }) }
  }

  return {
    user: { id: user.id },
    supabase,
    writer: (getServiceClient() as any) ?? supabase,
    task,
    access,
    flow: isTaskLifecycle(task.dev_status) ? task.dev_status : 'new',
  }
}

/** Human-readable sentence for the activity trail — never raw enum values. */
export function actorLabel(name?: string | null): string {
  return (name || '').trim() || 'Ein Teammitglied'
}
