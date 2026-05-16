import type { SupabaseClient } from '@supabase/supabase-js'
import { classifyClientTask, defaultTaskMeta } from './task-classifier'
import { clientStatusFromDevStatus } from './status-mapper'
import { clampPriority, type DevStatus, type TaskProposalOutput, type TaskType } from './task-rules'
import { createTasksAndDecisionsFromActionItems, extractActionItemsFromStatusReport } from './status-report-actions'

export async function ensureProjectAccess(sb: SupabaseClient<any>, projectId: string, actorId: string) {
  if (!projectId) throw new Error('project_id_required')

  const { data: project, error } = await sb
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  if (error) throw error
  if (!project) throw new Error('project_not_found')

  const ownerId = (project as any).user_id ?? (project as any).client_id
  if (ownerId === actorId) return project

  const { data: member } = await sb
    .from('project_members')
    .select('user_id,role')
    .eq('project_id', projectId)
    .eq('user_id', actorId)
    .maybeSingle()

  if (!member) throw new Error('project_access_denied')
  return project
}

export async function getProjectDevelopers(sb: SupabaseClient<any>, projectId: string) {
  const { data } = await sb
    .from('project_members')
    .select('user_id,role,status')
    .eq('project_id', projectId)

  return ((data as any[]) ?? []).filter((member) => {
    const role = String(member.role ?? '').toLowerCase()
    return ['developer', 'dev', 'lead_dev', 'owner', 'admin'].includes(role)
  })
}

export async function logAudit(
  sb: SupabaseClient<any>,
  input: {
    actorId: string | null
    action: string
    entityType: string
    entityId?: string | null
    metadata?: Record<string, unknown>
  },
) {
  await sb.from('audit_logs').insert({
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  }).then(() => null, () => null)
}

export async function saveTagroRun(
  sb: SupabaseClient<any>,
  input: {
    projectId: string
    runType: string
    inputJson: Record<string, unknown>
    outputJson: Record<string, unknown>
    model?: string | null
    status?: string
    errorMessage?: string | null
  },
) {
  const { data } = await sb.from('tagro_runs').insert({
    project_id: input.projectId,
    run_type: input.runType,
    input_json: input.inputJson,
    output_json: input.outputJson,
    model: input.model ?? null,
    status: input.status ?? 'completed',
    error_message: input.errorMessage ?? null,
  }).select('id').single()
  return data
}

export async function createManualClientTask({
  sb,
  actorId,
  projectId,
  title,
  description,
  priority,
  dueDate,
  labels,
}: {
  sb: SupabaseClient<any>
  actorId: string
  projectId: string
  title: string
  description?: string | null
  priority?: string | null
  dueDate?: string | null
  labels?: string[]
}) {
  await ensureProjectAccess(sb, projectId, actorId)
  const developers = await getProjectDevelopers(sb, projectId)
  const assignedTo = developers.length === 1 ? developers[0].user_id : null
  const clientStatus = assignedTo ? 'assigned' : 'waiting_for_assignment'
  const classified = classifyClientTask(`${title} ${description ?? ''}`)
  const taskType: TaskType = classified.taskType === 'client_request' ? 'client_manual_task' : classified.taskType
  const meta = defaultTaskMeta(taskType)

  const { data, error } = await sb.from('tasks').insert({
    project_id: projectId,
    title,
    description: description || null,
    client_description: description || null,
    dev_description: description || null,
    source: 'client_manual',
    origin: 'client',
    audience: 'developer',
    task_type: taskType,
    group_key: meta.group_key,
    created_by: actorId,
    assigned_to: assignedTo,
    client_visible: true,
    client_status: clientStatus,
    dev_status: 'todo',
    status: assignedTo ? 'todo' : 'waiting',
    priority: priority === 'none' ? null : clampPriority(priority, classified.priority),
    due_date: dueDate || null,
    tags: labels?.length ? labels : null,
    label: labels?.[0] ?? null,
    progress: 0,
    latest_client_update: assignedTo ? 'Die Aufgabe wurde an den Projekt-Workflow weitergeleitet.' : 'Die Aufgabe wartet auf Zuweisung.',
    latest_dev_update: 'Client hat diese Aufgabe manuell erstellt.',
    requires_approval: false,
  }).select('*').single()

  if (error) throw error
  await logAudit(sb, {
    actorId,
    action: 'client_created_manual_task',
    entityType: 'task',
    entityId: data.id,
    metadata: { project_id: projectId, task_id: data.id, source: 'client_manual', actor_role: 'client' },
  })
  return data
}

export async function createTagroClientTask({
  sb,
  actorId,
  projectId,
  proposal,
  originalText,
  dueDate,
  labels,
}: {
  sb: SupabaseClient<any>
  actorId: string
  projectId: string
  proposal: TaskProposalOutput | Record<string, any>
  originalText?: string
  dueDate?: string | null
  labels?: string[]
}) {
  await ensureProjectAccess(sb, projectId, actorId)
  const developers = await getProjectDevelopers(sb, projectId)
  const assignedTo = developers.length === 1 ? developers[0].user_id : null
  const clientStatus = assignedTo ? 'assigned' : 'waiting_for_assignment'

  const title = String(proposal.suggested_title || '').trim() || String(originalText || '').split(/\s+/).slice(0, 9).join(' ')
  const description = String(proposal.suggested_description || proposal.client_summary || originalText || '').trim()

  const { data, error } = await sb.from('tasks').insert({
    project_id: projectId,
    title,
    description,
    client_description: proposal.client_summary || description,
    dev_description: proposal.possible_dev_interpretation || description,
    source: 'client_tagro',
    origin: 'client',
    audience: 'developer',
    task_type: 'tagro_structured_client_task',
    group_key: 'development',
    created_by: actorId,
    assigned_to: assignedTo,
    client_visible: true,
    client_status: clientStatus,
    dev_status: 'todo',
    status: assignedTo ? 'todo' : 'waiting',
    priority: clampPriority(proposal.priority, 'medium'),
    due_date: dueDate || null,
    tags: labels?.length ? labels : null,
    label: labels?.[0] ?? null,
    progress: 0,
    latest_client_update: 'Tagro hat den Vorschlag strukturiert und an den Projekt-Workflow übergeben.',
    latest_dev_update: proposal.possible_dev_interpretation || 'Tagro-strukturierter Client-Vorschlag.',
    tagro_result_json: proposal,
    requires_approval: false,
  }).select('*').single()

  if (error) throw error
  await logAudit(sb, {
    actorId,
    action: 'client_created_tagro_task',
    entityType: 'task',
    entityId: data.id,
    metadata: { project_id: projectId, task_id: data.id, source: 'client_tagro', actor_role: 'client' },
  })
  return data
}

export async function createTaskFromStatusReportAction({
  sb,
  actorId,
  projectId,
  sourceReportId,
  actionItem,
}: {
  sb: SupabaseClient<any>
  actorId: string | null
  projectId: string
  sourceReportId?: string | null
  actionItem: any
}) {
  const [created] = await createTasksAndDecisionsFromActionItems({
    sb,
    actorId,
    projectId,
    sourceReportId,
    actionItems: [actionItem],
  })
  return created ?? null
}

export async function createDevTaskFromClientTask({
  sb,
  clientTaskId,
  developerId,
  actorId,
}: {
  sb: SupabaseClient<any>
  clientTaskId: string
  developerId?: string | null
  actorId: string | null
}) {
  const { data: sourceTask, error } = await sb.from('tasks').select('*').eq('id', clientTaskId).maybeSingle()
  if (error) throw error
  if (!sourceTask) throw new Error('task_not_found')

  const { data: task, error: insertError } = await sb.from('tasks').insert({
    project_id: sourceTask.project_id,
    parent_task_id: sourceTask.id,
    title: sourceTask.title,
    description: sourceTask.dev_description || sourceTask.description,
    client_description: sourceTask.client_description,
    dev_description: sourceTask.dev_description || sourceTask.description,
    source: 'client_manual',
    origin: 'client',
    audience: 'developer',
    task_type: 'internal_dev_task',
    group_key: 'development',
    created_by: actorId,
    assigned_to: developerId ?? sourceTask.assigned_to ?? null,
    client_visible: false,
    client_status: 'assigned',
    dev_status: 'todo',
    status: 'todo',
    priority: sourceTask.priority,
    progress: 0,
    latest_dev_update: 'Aus Client-Aufgabe in Developer-Arbeit überführt.',
  }).select('*').single()

  if (insertError) throw insertError
  await sb.from('task_links').insert({ source_task_id: sourceTask.id, target_task_id: task.id, link_type: 'dev_work' }).then(() => null, () => null)
  return task
}

export async function updateDevTaskStatus({
  sb,
  taskId,
  devStatus,
  actorId,
  waitingForClient,
}: {
  sb: SupabaseClient<any>
  taskId: string
  devStatus: DevStatus
  actorId: string | null
  waitingForClient?: boolean
}) {
  const task = await updateClientStatusFromDevStatus({ sb, taskId, devStatus, waitingForClient })
  await logAudit(sb, {
    actorId,
    action: 'developer_updated_task_status',
    entityType: 'task',
    entityId: taskId,
    metadata: { task_id: taskId, dev_status: devStatus, client_status: task.client_status },
  })
  return task
}

export async function updateClientStatusFromDevStatus({
  sb,
  taskId,
  devStatus,
  waitingForClient,
}: {
  sb: SupabaseClient<any>
  taskId: string
  devStatus: DevStatus
  waitingForClient?: boolean
}) {
  const clientStatus = clientStatusFromDevStatus(devStatus, { waitingForClient })
  const { data, error } = await sb
    .from('tasks')
    .update({ dev_status: devStatus, client_status: clientStatus, status: devStatus === 'done' ? 'done' : devStatus })
    .eq('id', taskId)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function assignTaskToDeveloper(sb: SupabaseClient<any>, taskId: string, developerId: string, actorId: string) {
  const { data, error } = await sb
    .from('tasks')
    .update({ assigned_to: developerId, client_status: 'assigned', dev_status: 'todo', status: 'todo' })
    .eq('id', taskId)
    .select('*')
    .single()
  if (error) throw error
  await logAudit(sb, { actorId, action: 'admin_assigned_task', entityType: 'task', entityId: taskId, metadata: { task_id: taskId, assigned_to: developerId } })
  return data
}

export async function linkTaskToDecision(sb: SupabaseClient<any>, taskId: string, decisionId: string) {
  return sb.from('tasks').update({ source_decision_id: decisionId }).eq('id', taskId)
}

export async function linkTaskToStatusReport(sb: SupabaseClient<any>, taskId: string, statusReportId: string) {
  return sb.from('tasks').update({ source_status_report_id: statusReportId }).eq('id', taskId)
}

export async function getWorkspaceTasks(sb: SupabaseClient<any>, projectId: string) {
  const { data, error } = await sb.from('tasks').select('*').eq('project_id', projectId).order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getClientTasks(sb: SupabaseClient<any>, projectId: string) {
  const { data, error } = await sb.from('tasks').select('*').eq('project_id', projectId).eq('client_visible', true).order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getDeveloperTasks(sb: SupabaseClient<any>, developerId: string) {
  const { data, error } = await sb.from('tasks').select('*').eq('assigned_to', developerId).order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export { extractActionItemsFromStatusReport }

export async function processStatusReportActionItems({
  sb,
  actorId,
  projectId,
  sourceReportId,
  actionItems,
}: {
  sb: SupabaseClient<any>
  actorId: string | null
  projectId: string
  sourceReportId?: string | null
  actionItems: any[]
}) {
  return createTasksAndDecisionsFromActionItems({
    sb,
    actorId,
    projectId,
    sourceReportId,
    actionItems,
  })
}
