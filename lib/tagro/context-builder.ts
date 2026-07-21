import type { SupabaseClient } from '@supabase/supabase-js'
import {
  emptyTagroOkmContext,
  loadTagroOkmContext,
  type TagroOkmContext,
} from '@/lib/tagro/okm-context'

export type TagroContextPurpose =
  | 'task_proposal'
  | 'status_report'
  | 'action_items'
  | 'client_safe'
  | 'decision_detection'

export type TagroContext = {
  project: any
  clientProfile: any | null
  tasks: any[]
  statusReports: any[]
  decisions: any[]
  projectMembers: any[]
  files: any[]
  memories: any[]
  purpose: TagroContextPurpose
  okm: TagroOkmContext
}

export async function buildTagroContext({
  sb,
  projectId,
  purpose,
}: {
  sb: SupabaseClient<any>
  projectId: string
  purpose: TagroContextPurpose
}): Promise<TagroContext> {
  if (!projectId) throw new Error('project_id_required')

  const { data: project, error } = await sb
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  if (error) throw error
  if (!project) throw new Error('project_not_found')

  const clientId = (project as any).client_id ?? (project as any).user_id ?? null
  const workspaceId = (project as any).workspace_id as string | null | undefined

  const [
    { data: clientProfile },
    { data: tasks },
    { data: statusReports },
    { data: decisions },
    { data: projectMembers },
    { data: files },
    { data: memories },
    okm,
  ] = await Promise.all([
    clientId
      ? sb.from('profiles').select('id,email,full_name,first_name,role,company_name,company_desc,company_industry').eq('id', clientId).maybeSingle()
      : Promise.resolve({ data: null } as any),
    sb.from('tasks').select('*').eq('project_id', projectId).order('updated_at', { ascending: false }).limit(80),
    sb.from('status_reports').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(8).then(
      (result) => result.error ? sb.from('ai_updates').select('*').eq('project_id', projectId).in('type', ['status_report', 'dev_progress_update']).order('created_at', { ascending: false }).limit(8) : result,
    ),
    sb.from('decisions').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(30),
    sb.from('project_members').select('*').eq('project_id', projectId),
    sb.from('documents').select('id,name,title,category,mime,size,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(30).then((result) => result, () => ({ data: [] } as any)),
    sb.from('tagro_memory').select('*').eq('project_id', projectId).order('updated_at', { ascending: false }).limit(20).then((result) => result, () => ({ data: [] } as any)),
    loadTagroOkmContext({ sb, workspaceId }).catch(() => emptyTagroOkmContext()),
  ])

  return {
    project,
    clientProfile: clientProfile ?? null,
    tasks: (tasks as any[]) ?? [],
    statusReports: (statusReports as any[]) ?? [],
    decisions: (decisions as any[]) ?? [],
    projectMembers: (projectMembers as any[]) ?? [],
    files: (files as any[]) ?? [],
    memories: (memories as any[]) ?? [],
    purpose,
    okm,
  }
}

export function contextToPromptText(context: TagroContext) {
  const openTasks = context.tasks.filter((task) => !['done', 'completed', 'cancelled'].includes(String(task.status ?? task.dev_status ?? task.client_status ?? '')))
  const completedTasks = context.tasks.filter((task) => ['done', 'completed'].includes(String(task.status ?? task.dev_status ?? task.client_status ?? '')))
  const openDecisions = context.decisions.filter((decision) => !['approved', 'rejected', 'cancelled'].includes(String(decision.status ?? '')))

  return [
    `Projekt: ${context.project?.title ?? 'Unbenanntes Projekt'}`,
    context.project?.description ? `Beschreibung: ${context.project.description}` : null,
    context.project?.phase || context.project?.status ? `Phase/Status: ${context.project?.phase ?? context.project?.status}` : null,
    context.clientProfile?.full_name || context.clientProfile?.email ? `Client: ${context.clientProfile?.full_name ?? context.clientProfile?.email}` : null,
    context.clientProfile?.company_desc ? `Client-Kontext: ${context.clientProfile.company_desc}` : null,
    `Offene Tasks (${openTasks.length}): ${openTasks.slice(0, 12).map((task) => `${task.title} [${task.task_type ?? task.status ?? 'task'}]`).join('; ') || 'keine'}`,
    `Erledigte Tasks zuletzt (${completedTasks.length}): ${completedTasks.slice(0, 8).map((task) => task.title).join('; ') || 'keine'}`,
    `Offene Entscheidungen (${openDecisions.length}): ${openDecisions.slice(0, 8).map((decision) => decision.title).join('; ') || 'keine'}`,
    `Projektmitglieder: ${context.projectMembers.map((member) => `${member.user_id}:${member.role}`).join('; ') || 'keine'}`,
    `Dateien/Links: ${context.files.map((file) => file.title ?? file.name).filter(Boolean).slice(0, 10).join('; ') || 'keine'}`,
    `Tagro Memory: ${context.memories.map((memory) => `${memory.memory_type}:${memory.key}=${JSON.stringify(memory.value_json)}`).slice(0, 10).join('; ') || 'keine'}`,
    `Letzte Statusberichte: ${context.statusReports.slice(0, 3).map((report) => report.summary ?? report.content).filter(Boolean).join('\n---\n') || 'keine'}`,
    context.okm?.promptBlock || null,
  ].filter(Boolean).join('\n')
}
