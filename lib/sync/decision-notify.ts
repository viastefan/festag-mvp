import type { SupabaseClient } from '@supabase/supabase-js'

export type DevDecisionNotifyKind = 'decision_answered' | 'decision_applied' | 'decision_requested'

export async function notifyDevDecisionEvent(
  supa: SupabaseClient<any>,
  input: {
    userId: string
    projectId: string
    kind: DevDecisionNotifyKind
    title: string
    body?: string | null
    link: string
    taskId?: string | null
    payload?: Record<string, unknown>
  },
) {
  const body = (input.body ?? '').slice(0, 400)
  await supa.from('notifications').insert({
    user_id: input.userId,
    project_id: input.projectId,
    task_id: input.taskId ?? null,
    audience: 'dev',
    kind: input.kind,
    type: input.kind,
    title: input.title.slice(0, 240),
    body,
    message: body,
    link: input.link,
    payload: input.payload ?? {},
    read: false,
  }).then(() => null, () => null)
}

export function devDecisionLink(decisionId: string, sourceTaskId?: string | null): string {
  if (sourceTaskId) return `/dev/tasks?id=${sourceTaskId}`
  return `/dev/decisions?open=${decisionId}`
}
