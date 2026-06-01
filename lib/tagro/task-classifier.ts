import { clampConfidence, clampPriority, type ActionItemType, type VeyraActionItem, type TaskType } from './task-rules'
import { defaultPriorityForTaskType, groupKeyForTaskType } from './status-mapper'

export function classifyClientTask(input: string): {
  taskType: TaskType
  priority: 'critical' | 'high' | 'medium' | 'low'
} {
  const text = input.toLowerCase()

  if (/\b(bug|fehler|kaputt|broken|crash|geht nicht|funktioniert nicht)\b/.test(text)) {
    return { taskType: 'bug_report', priority: 'high' }
  }
  if (/\b(blocker|blockiert|dringend|kritisch|security|sicherheit)\b/.test(text)) {
    return { taskType: 'blocker_resolution', priority: 'high' }
  }
  if (/\b(ändern|change|verbessern|anpassen|ergänzen|feature|wunsch)\b/.test(text)) {
    return { taskType: 'change_request', priority: 'medium' }
  }

  return { taskType: 'client_request', priority: 'medium' }
}

export function normalizeActionItem(item: VeyraActionItem): VeyraActionItem {
  const type: ActionItemType = [
    'client_task',
    'dev_task',
    'decision',
    'admin_task',
    'blocker_task',
    'follow_up',
    'no_action',
  ].includes(item.type) ? item.type : 'follow_up'

  return {
    ...item,
    type,
    title: String(item.title || '').trim(),
    description: String(item.description || '').trim(),
    priority: clampPriority(item.priority, type === 'blocker_task' || type === 'decision' ? 'high' : 'medium'),
    confidence_score: clampConfidence(item.confidence_score),
  }
}

export function taskShapeForActionItem(item: VeyraActionItem) {
  switch (item.type) {
    case 'client_task':
      return {
        task_type: 'status_report_action' as TaskType,
        audience: 'client',
        client_visible: true,
        client_status: 'submitted',
        dev_status: null,
        group_key: 'client_action',
      }
    case 'dev_task':
      return {
        task_type: 'internal_dev_task' as TaskType,
        audience: 'developer',
        client_visible: Boolean(item.client_visible),
        client_status: item.client_visible ? 'assigned' : 'submitted',
        dev_status: 'todo',
        group_key: 'development',
      }
    case 'admin_task':
      return {
        task_type: 'admin_review_task' as TaskType,
        audience: 'admin',
        client_visible: false,
        client_status: 'submitted',
        dev_status: null,
        group_key: 'admin',
      }
    case 'blocker_task':
      return {
        task_type: 'blocker_resolution' as TaskType,
        audience: item.owner_type === 'client' ? 'client' : 'developer',
        client_visible: item.client_visible !== false,
        client_status: item.owner_type === 'client' ? 'waiting_for_client' : 'in_progress',
        dev_status: item.owner_type === 'client' ? 'blocked' : 'todo',
        group_key: 'blocker',
      }
    case 'follow_up':
      return {
        task_type: 'follow_up' as TaskType,
        audience: item.owner_type === 'client' ? 'client' : 'developer',
        client_visible: item.client_visible !== false,
        client_status: item.owner_type === 'client' ? 'submitted' : 'assigned',
        dev_status: item.owner_type === 'client' ? null : 'todo',
        group_key: groupKeyForTaskType('follow_up'),
      }
    default:
      return {
        task_type: 'follow_up' as TaskType,
        audience: 'tagro',
        client_visible: false,
        client_status: 'submitted',
        dev_status: null,
        group_key: groupKeyForTaskType('follow_up'),
      }
  }
}

export function defaultTaskMeta(taskType: TaskType) {
  return {
    group_key: groupKeyForTaskType(taskType),
    priority: defaultPriorityForTaskType(taskType),
  }
}

