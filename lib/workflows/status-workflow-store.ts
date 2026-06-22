import {
  DEFAULT_STATUS_WORKFLOW,
  type StatusWorkflow,
} from '@/lib/workflows/status-workflow-types'

const STORAGE_KEY = 'festag_status_workflows_v1'
const ACTIVE_KEY = 'festag_status_workflow_active_v1'

function newId() {
  return `swf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function loadStatusWorkflows(): StatusWorkflow[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StatusWorkflow[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStatusWorkflows(workflows: StatusWorkflow[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows))
    window.dispatchEvent(new CustomEvent('festag-status-workflow-change'))
  } catch { /* quota */ }
}

export function loadActiveWorkflowId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function saveActiveWorkflowId(id: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ACTIVE_KEY, id)
    window.dispatchEvent(new CustomEvent('festag-status-workflow-change'))
  } catch { /* quota */ }
}

export function getOrCreateDefaultWorkflow(): StatusWorkflow {
  const existing = loadStatusWorkflows()
  const activeId = loadActiveWorkflowId()
  const active = existing.find(w => w.id === activeId) ?? existing[0]
  if (active) return active

  const created: StatusWorkflow = {
    id: newId(),
    updatedAt: new Date().toISOString(),
    ...DEFAULT_STATUS_WORKFLOW,
  }
  saveStatusWorkflows([created])
  saveActiveWorkflowId(created.id)
  return created
}

export function upsertStatusWorkflow(workflow: StatusWorkflow): StatusWorkflow {
  const all = loadStatusWorkflows()
  const idx = all.findIndex(w => w.id === workflow.id)
  const next = { ...workflow, updatedAt: new Date().toISOString() }
  if (idx >= 0) all[idx] = next
  else all.unshift(next)
  saveStatusWorkflows(all)
  saveActiveWorkflowId(next.id)
  return next
}
