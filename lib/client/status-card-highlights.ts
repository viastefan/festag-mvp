import type { SupabaseClient } from '@supabase/supabase-js'
import { listClientActivity } from '@/lib/client/client-activity'
import { listClientDeliverables } from '@/lib/client/deliverables'
import { listPendingApprovals } from '@/lib/client/pending-approvals'
import { normalizeClientReport } from '@/lib/client/status-briefing'
import { DECISION_OPEN_STATUS_LIST } from '@/lib/decisions/types'
import { isClientVisibleTask } from '@/lib/tasks/client-view'

export type StatusCardGraphicKey =
  | 'overall'
  | '24h'
  | 'filter'
  | 'goals'
  | 'decisions'
  | 'tasks'
  | 'deliveries'

export type StatusCardHighlight = {
  lines: string[]
  subtitle?: string
  badge?: string | null
  nodeLabels?: string[]
  tagroPrompt?: string
}

export type StatusCardHighlightsMap = Partial<Record<StatusCardGraphicKey, StatusCardHighlight>>

const MAX_LINES = 8
const LINE_MAX = 46

function clip(text: string, max = LINE_MAX): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

function uniqueLines(groups: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of groups) {
    if (!raw) continue
    const line = clip(raw)
    if (!line) continue
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
    if (out.length >= MAX_LINES) break
  }
  return out
}

function isActiveProject(status: string | null | undefined): boolean {
  const s = (status || '').toLowerCase()
  return s !== 'done' && s !== 'archived' && s !== 'erledigt'
}

function hoursAgo(iso: string, hours: number): boolean {
  return Date.now() - new Date(iso).getTime() <= hours * 3600 * 1000
}

async function userProjects(sb: SupabaseClient<any>, userId: string) {
  const { data } = await sb
    .from('projects')
    .select('id,title,status')
    .or(`user_id.eq.${userId},client_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100)
  return ((data as any[]) ?? []) as Array<{ id: string; title?: string | null; status?: string | null }>
}

async function latestOverallReport(sb: SupabaseClient<any>, userId: string) {
  const { data: lastQuery } = await sb
    .from('client_status_queries')
    .select('status_report_id')
    .eq('user_id', userId)
    .eq('scope', 'overall')
    .not('status_report_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!(lastQuery as any)?.status_report_id) return null

  const { data: report } = await sb
    .from('status_reports')
    .select(
      'id, title, summary, content, blockers_json, current_work_json, next_steps_json, risks_json, decisions_needed_json, visible_to_client, created_at',
    )
    .eq('id', (lastQuery as any).status_report_id)
    .eq('visible_to_client', true)
    .maybeSingle()

  return report ?? null
}

async function listVisibleTasks(sb: SupabaseClient<any>, projectIds: string[]) {
  if (projectIds.length === 0) return []
  const { data } = await sb
    .from('tasks')
    .select('id,title,project_id,status,client_visible,tagro_client_summary,latest_client_update,updated_at')
    .in('project_id', projectIds)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(120)
  return ((data as any[]) ?? []).filter(isClientVisibleTask)
}

async function listOpenDecisions(sb: SupabaseClient<any>, userId: string) {
  const { data } = await sb
    .from('decisions')
    .select('id,title,project_id,created_at')
    .eq('requested_for', userId)
    .in('status', DECISION_OPEN_STATUS_LIST as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(12)
  return (data as any[]) ?? []
}

function taskLine(t: { title?: string | null; tagro_client_summary?: string | null }): string {
  return clip(String(t.tagro_client_summary || t.title || '').trim())
}

function arr(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((x) => String(x)).filter(Boolean) : []
}

export async function buildStatusCardHighlights(
  sb: SupabaseClient<any>,
  userId: string,
): Promise<StatusCardHighlightsMap> {
  const projects = await userProjects(sb, userId)
  const projectIds = projects.map((p) => p.id)
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.title || 'Projekt']))
  const activeProjects = projects.filter((p) => isActiveProject(p.status))

  const [reportRaw, tasks, approvals, activity, deliverables, decisions] = await Promise.all([
    latestOverallReport(sb, userId),
    listVisibleTasks(sb, projectIds),
    listPendingApprovals(sb, userId),
    listClientActivity(sb, userId, 14),
    listClientDeliverables(sb, userId, 12),
    listOpenDecisions(sb, userId),
  ])

  const report = reportRaw ? normalizeClientReport(reportRaw) : null
  const risks = arr((reportRaw as any)?.risks_json)

  const blockedTasks = tasks.filter((t) => (t.status || '').toLowerCase() === 'blocked')
  const waitingTasks = tasks.filter((t) => (t.status || '').toLowerCase() === 'waiting')
  const openTasks = tasks.filter((t) => {
    const s = (t.status || '').toLowerCase()
    return s !== 'done' && s !== 'completed' && s !== 'erledigt'
  })

  const activity24h = activity.filter((a) => hoursAgo(a.created_at, 24))
  const tasks24h = tasks.filter((t) => t.updated_at && hoursAgo(t.updated_at, 24))

  const pendingDeliverables = deliverables.filter((d) => d.approval_status === 'awaiting_review')
  const approvalTitles = approvals.items.map((a) => a.title)

  const urgentTotal =
    (report?.blockers.length ?? 0) +
    (report?.decisionsNeeded.length ?? 0) +
    approvals.count +
    blockedTasks.length +
    waitingTasks.length +
    pendingDeliverables.length

  const overallLines = uniqueLines([
    ...(report?.blockers ?? []),
    ...(report?.decisionsNeeded ?? []),
    ...risks,
    ...(report?.nextSteps ?? []),
    ...(report?.currentWork ?? []),
    ...approvalTitles,
    ...decisions.map((d) => d.title),
    ...blockedTasks.map(taskLine),
    ...waitingTasks.map(taskLine),
    ...activity.slice(0, 4).map((a) => a.title || a.body),
    activeProjects.length > 0
      ? `${activeProjects.length} aktive Projekt${activeProjects.length === 1 ? '' : 'e'} im Blick`
      : 'Noch kein aktives Projekt',
    openTasks.length > 0
      ? `${openTasks.length} offene Aufgabe${openTasks.length === 1 ? '' : 'n'}`
      : 'Keine offenen Aufgaben',
  ])

  const lines24h = uniqueLines([
    ...activity24h.map((a) => a.title || clip(a.body)),
    ...tasks24h.map(taskLine),
    ...(report?.currentWork ?? []).slice(0, 2),
    activity24h.length === 0 && tasks24h.length === 0
      ? 'Ruhiger Tag — keine sichtbaren Änderungen'
      : null,
    activity24h.length > 0 ? `${activity24h.length} Signal${activity24h.length === 1 ? '' : 'e'} in 24h` : null,
  ])

  const projectsWithPressure = new Map<string, number>()
  for (const t of [...blockedTasks, ...waitingTasks]) {
    if (!t.project_id) continue
    projectsWithPressure.set(t.project_id, (projectsWithPressure.get(t.project_id) ?? 0) + 1)
  }
  for (const d of decisions) {
    if (!d.project_id) continue
    projectsWithPressure.set(d.project_id, (projectsWithPressure.get(d.project_id) ?? 0) + 1)
  }

  const filterProjects = [...projectsWithPressure.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => projectMap[id])
    .filter(Boolean)

  const filterLines = uniqueLines([
    ...filterProjects.map((name) => `${name} braucht Fokus`),
    ...activeProjects.slice(0, 4).map((p) => p.title || 'Projekt'),
    activeProjects.length > 0 ? 'Alle Projekte filtern' : 'Noch keine Projekte',
  ])

  const decisionLines = uniqueLines([
    ...decisions.map((d) => d.title),
    ...waitingTasks.map(taskLine),
    ...(report?.decisionsNeeded ?? []),
    decisions.length === 0 ? 'Keine offene Entscheidung' : null,
  ])

  const taskLines = uniqueLines([
    ...blockedTasks.map(taskLine),
    ...waitingTasks.map(taskLine),
    ...openTasks.slice(0, 4).map(taskLine),
    blockedTasks.length > 0 ? `${blockedTasks.length} Blocker` : null,
    openTasks.length === 0 ? 'Alle Aufgaben erledigt' : null,
  ])

  const deliveryLines = uniqueLines([
    ...pendingDeliverables.map((d) => d.title),
    ...deliverables.slice(0, 4).map((d) => d.title),
    ...approvals.items.filter((a) => a.kind === 'deliverable').map((a) => a.title),
    pendingDeliverables.length > 0
      ? `${pendingDeliverables.length} Freigabe${pendingDeliverables.length === 1 ? '' : 'n'} offen`
      : 'Lieferungen auf Kurs',
  ])

  const goalsLines = uniqueLines([
    ...(report?.nextSteps ?? []).slice(0, 4),
    ...(report?.currentWork ?? []).slice(0, 2),
    'Fortschritt gegenüber deinen Zielen',
  ])

  const firstDelivery = pendingDeliverables[0] ?? deliverables[0]
  const tagroPrompt = firstDelivery
    ? clip(`Lieferung „${firstDelivery.title}“ prüfen und freigeben`, 64)
    : approvals.items[0]
      ? clip(`${approvals.items[0].title} — mit Tagro klären`, 64)
      : undefined

  return {
    overall: {
      lines: overallLines,
      subtitle:
        activeProjects.length > 0
          ? `${activeProjects.length} aktive Projekt${activeProjects.length === 1 ? '' : 'e'} im Überblick`
          : 'Ein Bericht deiner Gesamten Projekte',
      badge: urgentTotal > 0 ? (urgentTotal === 1 ? '1 offen' : `${urgentTotal} offen`) : null,
    },
    '24h': {
      lines: lines24h,
      subtitle:
        activity24h.length > 0 || tasks24h.length > 0
          ? `${activity24h.length + tasks24h.length} Update${activity24h.length + tasks24h.length === 1 ? '' : 's'} in 24 Stunden`
          : 'Was sich in den letzten 24 Stunden verändert hat',
    },
    filter: {
      lines: filterLines,
      nodeLabels: (filterProjects.length > 0 ? filterProjects : activeProjects.map((p) => p.title || 'Projekt')).slice(
        0,
        6,
      ),
      subtitle:
        filterProjects.length > 0
          ? `${filterProjects.length} Projekt${filterProjects.length === 1 ? '' : 'e'} mit offenen Punkten`
          : 'Bericht auf einzelne Projekte eingrenzen',
    },
    goals: {
      lines: goalsLines,
      subtitle: 'Fortschritt gegenüber deinen Zielen',
    },
    decisions: {
      lines: decisionLines.length > 0 ? decisionLines : ['Entscheidungen im Blick'],
      subtitle:
        decisions.length > 0
          ? `${decisions.length} Entscheidung${decisions.length === 1 ? '' : 'en'} warten auf dich`
          : 'Keine offene Entscheidung — Lieferung kann weiterlaufen',
      badge: decisions.length > 0 ? String(decisions.length) : null,
    },
    tasks: {
      lines: taskLines.length > 0 ? taskLines : ['Tasks im Blick'],
      subtitle:
        blockedTasks.length > 0
          ? `${blockedTasks.length} Blocker in deinen Projekten`
          : 'Aktuelle Aufgaben und Blocker im Blick',
      badge: blockedTasks.length > 0 ? String(blockedTasks.length) : null,
    },
    deliveries: {
      lines: deliveryLines,
      subtitle:
        pendingDeliverables.length > 0
          ? `${pendingDeliverables.length} Lieferung${pendingDeliverables.length === 1 ? '' : 'en'} zur Freigabe`
          : 'Anstehende und abgeschlossene Lieferungen',
      tagroPrompt,
      badge: pendingDeliverables.length > 0 ? String(pendingDeliverables.length) : null,
    },
  }
}
