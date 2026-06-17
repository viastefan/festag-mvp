import type { ClientStatus, DevStatus, GroupKey, Priority, TaskType } from './rules'

export function clientStatusFromDevStatus(
  devStatus: DevStatus | string | null | undefined,
  options: { waitingForClient?: boolean } = {},
): ClientStatus {
  if (devStatus === 'done') return 'completed'
  if (devStatus === 'review') return 'ready_for_review'
  if (devStatus === 'blocked') return options.waitingForClient ? 'waiting_for_client' : 'in_progress'
  if (devStatus === 'in_progress') return 'in_progress'
  if (devStatus === 'accepted' || devStatus === 'todo') return 'assigned'
  if (devStatus === 'cancelled') return 'cancelled'
  return 'submitted'
}

export function groupKeyForTaskType(taskType: TaskType | string | null | undefined): GroupKey {
  switch (taskType) {
    case 'client_action':
      return 'client_action'
    case 'decision_linked_task':
      return 'decision'
    case 'blocker_resolution':
      return 'blocker'
    case 'admin_review_task':
      return 'admin'
    case 'bug_report':
    case 'change_request':
    case 'internal_dev_task':
    case 'tagro_structured_client_task':
    case 'client_manual_task':
      return 'development'
    case 'github_follow_up':
    case 'briefing_action':
    case 'follow_up':
    case 'status_report_action':
      return 'follow_up'
    default:
      return 'development'
  }
}

export function defaultPriorityForTaskType(taskType: TaskType | string | null | undefined): Priority {
  if (taskType === 'blocker_resolution' || taskType === 'decision_linked_task') return 'high'
  if (taskType === 'client_action' || taskType === 'status_report_action') return 'medium'
  if (taskType === 'follow_up' || taskType === 'briefing_action') return 'medium'
  return 'medium'
}

export function sortWeightForGroup(groupKey: GroupKey | string | null | undefined) {
  switch (groupKey) {
    case 'blocker': return 10
    case 'decision': return 20
    case 'client_action': return 30
    case 'development': return 40
    case 'review': return 50
    case 'follow_up': return 60
    case 'material': return 70
    case 'testing': return 80
    case 'launch': return 90
    case 'admin': return 95
    default: return 100
  }
}

export function clientSafeStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'submitted': return 'Eingereicht'
    case 'assigned': return 'Zugewiesen'
    case 'in_progress': return 'In Umsetzung'
    case 'waiting_for_client': return 'Wartet auf Ihre Entscheidung'
    case 'waiting_for_assignment': return 'Wartet auf Zuweisung'
    case 'ready_for_review': return 'Bereit zur Prüfung'
    case 'completed': return 'Erledigt'
    case 'cancelled': return 'Abgebrochen'
    default: return 'Eingereicht'
  }
}
