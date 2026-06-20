export const OBJECTIVE_STATUSES = ['active', 'completed', 'paused', 'cancelled'] as const
export type ObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number]

export const OBJECTIVE_ACTIVE_STATUSES: ReadonlySet<ObjectiveStatus> = new Set<ObjectiveStatus>(['active'])

export type Objective = {
  id: string
  project_id: string
  workspace_id?: string | null
  title: string
  description?: string | null
  target_date?: string | null
  status: ObjectiveStatus
  progress_pct: number
  owner?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  task_count?: number
  task_done?: number
  at_risk?: boolean
}

export type ObjectiveCreateInput = {
  project_id: string
  title: string
  description?: string | null
  target_date?: string | null
  status?: ObjectiveStatus
  owner?: string | null
  task_ids?: string[]
}

export type ObjectiveUpdateInput = Partial<
  Pick<Objective, 'title' | 'description' | 'target_date' | 'status' | 'owner' | 'progress_pct'>
>

export function isValidObjectiveStatus(value: string | null | undefined): value is ObjectiveStatus {
  return !!value && OBJECTIVE_STATUSES.includes(value as ObjectiveStatus)
}

export function isObjectiveAtRisk(obj: Pick<Objective, 'status' | 'target_date' | 'progress_pct'>): boolean {
  if (obj.status !== 'active') return false
  if (!obj.target_date) return false
  const target = new Date(obj.target_date).getTime()
  if (Number.isNaN(target)) return false
  const daysLeft = (target - Date.now()) / (24 * 3600 * 1000)
  if (daysLeft < 0) return true
  if (daysLeft <= 14 && obj.progress_pct < 70) return true
  return false
}
