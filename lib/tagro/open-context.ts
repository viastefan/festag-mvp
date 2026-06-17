import type { TagroOpenDetail } from '@/components/TagroOverlay'

type DecisionLike = {
  id: string
  title?: string | null
  client_title?: string | null
  status?: string | null
  project_id?: string | null
  client_summary?: string | null
  description?: string | null
}

type TaskLike = {
  id: string
  title?: string | null
  status?: string | null
  project_id?: string | null
  client_visible?: boolean | null
}

type ProjectLike = {
  id: string
  title?: string | null
}

export function tagroOpenFromDecision(
  decision: DecisionLike,
  project?: ProjectLike | null,
): TagroOpenDetail {
  return {
    contextType: 'decision',
    id: decision.id,
    title: decision.client_title || decision.title || 'Entscheidung',
    subtitle: project?.title || decision.client_summary || decision.description || undefined,
    status: decision.status,
    projectId: decision.project_id ?? project?.id,
  }
}

export function tagroOpenFromTask(
  task: TaskLike,
  project?: ProjectLike | null,
): TagroOpenDetail {
  return {
    contextType: 'task',
    id: task.id,
    title: task.title || 'Aufgabe',
    subtitle: project?.title,
    status: task.status,
    projectId: project?.id ?? task.project_id ?? undefined,
    clientVisible: task.client_visible,
  }
}
