/**
 * Builds the newsroom from what actually happened.
 *
 * Five sources, one editorial pass:
 *   decisions · tasks · risks · status reports · project activity
 *
 * The pass is where Festag earns its keep. Raw rows become sentences, open
 * items outrank closed ones, and anything the reader can act on carries the
 * action that closes it. A client never reads execution vocabulary — the role
 * lens picks the client-safe title where the row carries one.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { NewsCategory, NewsPayload, NewsStory } from '@/lib/news/types'
import { resolveWorkspaceAccess } from '@/lib/tasks/access'
import type { TaskViewerRole } from '@/lib/tasks/lifecycle'

const WINDOW_DAYS = 21
const MAX_STORIES = 60

type Ctx = {
  role: (projectId: string) => TaskViewerRole
  title: (projectId: string) => string | null
  clientLens: (projectId: string) => boolean
}

function clean(value?: string | null): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

/** Trim a body to something readable without cutting mid-word. */
function excerpt(value?: string | null, max = 180): string | null {
  const text = clean(value)
  if (!text) return null
  if (text.length <= max) return text
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`
}

export async function buildNews(
  sb: SupabaseClient<any>,
  userId: string,
): Promise<NewsPayload> {
  const access = await resolveWorkspaceAccess(sb, userId)
  const projectIds = Array.from(access.keys())
  const generatedAt = new Date().toISOString()

  if (!projectIds.length) {
    return {
      stories: [],
      digest: { line: 'Noch kein Projekt — sobald eines läuft, erscheint hier, was passiert.', openCount: 0, freshCount: 0 },
      projects: [],
      generatedAt,
    }
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()

  const [projectsRes, decisionsRes, tasksRes, risksRes, reportsRes, activityRes] = await Promise.all([
    sb.from('projects').select('id,title,color').in('id', projectIds)
      .then((r: any) => r, () => ({ data: [] })),
    sb.from('decisions')
      .select('id,project_id,title,client_title,internal_title,description,client_summary,impact_summary,status,urgency,due_at,decided_at,created_at,updated_at,visible_to_client')
      .in('project_id', projectIds)
      .or(`updated_at.gte.${since},status.in.(open,pending,awaiting_approval,detected,recommendation_ready,queued)`)
      .order('updated_at', { ascending: false }).limit(40)
      .then((r: any) => r, () => ({ data: [] })),
    sb.from('tasks')
      .select('id,project_id,title,dev_status,client_visible_status,priority,blocked_reason,latest_client_update,tagro_client_summary,client_visible,audience,task_type,updated_at,completed_at,due_date')
      .in('project_id', projectIds)
      .or(`updated_at.gte.${since},dev_status.in.(blocked,finished_by_dev,verified_by_tagro)`)
      .order('updated_at', { ascending: false }).limit(60)
      .then((r: any) => r, () => ({ data: [] })),
    sb.from('risks')
      .select('id,project_id,title,client_title,client_summary,description,severity,status,recommendation,potential_delay_days,detected_at,resolved_at,created_at,updated_at')
      .in('project_id', projectIds)
      .or(`updated_at.gte.${since},status.in.(open,detected,active,monitoring,escalated)`)
      .order('updated_at', { ascending: false }).limit(30)
      .then((r: any) => r, () => ({ data: [] })),
    sb.from('status_reports')
      .select('id,project_id,title,summary,audience,visible_to_client,created_at')
      .in('project_id', projectIds).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(20)
      .then((r: any) => r, () => ({ data: [] })),
    sb.from('activity_feed')
      .select('id,project_id,title,body,event_type,actor_role,created_at')
      .in('project_id', projectIds).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(40)
      .then((r: any) => r, () => ({ data: [] })),
  ])

  const projects = ((projectsRes?.data as any[]) ?? []).map((p) => ({
    id: p.id, title: p.title, color: p.color ?? null,
  }))
  const titleById = new Map(projects.map((p) => [p.id, p.title as string]))

  const ctx: Ctx = {
    role: (projectId) => access.get(projectId)?.role ?? 'observer',
    title: (projectId) => titleById.get(projectId) ?? null,
    clientLens: (projectId) => {
      const role = access.get(projectId)?.role
      return role === 'client' || role === 'observer'
    },
  }

  const stories: NewsStory[] = [
    ...decisionStories((decisionsRes?.data as any[]) ?? [], ctx),
    ...taskStories((tasksRes?.data as any[]) ?? [], ctx),
    ...riskStories((risksRes?.data as any[]) ?? [], ctx),
    ...reportStories((reportsRes?.data as any[]) ?? [], ctx),
    ...activityStories((activityRes?.data as any[]) ?? [], ctx),
  ]

  // Open items first, then by recency. Inside equal rank, newest wins.
  stories.sort((a, b) => {
    if (a.open !== b.open) return a.open ? -1 : 1
    if (a.rank !== b.rank) return b.rank - a.rank
    return new Date(b.at).getTime() - new Date(a.at).getTime()
  })

  const trimmed = stories.slice(0, MAX_STORIES)
  if (trimmed[0]?.open) trimmed[0].weight = 'lead'

  const openCount = trimmed.filter((s) => s.open).length

  return {
    stories: trimmed,
    digest: {
      line: digestLine(openCount, trimmed),
      openCount,
      freshCount: 0, // the reader's last visit lives in the browser
    },
    projects,
    generatedAt,
  }
}

/** The one sentence at the top. It must be true, and it must be short. */
function digestLine(openCount: number, stories: NewsStory[]): string {
  if (!stories.length) return 'Noch nichts passiert. Sobald sich etwas bewegt, steht es hier.'
  if (openCount === 0) return 'Nichts wartet auf dich. Die Umsetzung läuft.'

  const decisions = stories.filter((s) => s.open && s.category === 'decision').length
  const risks = stories.filter((s) => s.open && s.category === 'risk').length
  const parts: string[] = []
  if (decisions) parts.push(`${decisions} ${decisions === 1 ? 'Entscheidung' : 'Entscheidungen'}`)
  if (risks) parts.push(`${risks} ${risks === 1 ? 'Risiko' : 'Risiken'}`)
  const rest = openCount - decisions - risks
  if (rest > 0) parts.push(`${rest} ${rest === 1 ? 'Freigabe' : 'Freigaben'}`)

  return `${parts.join(' · ')} ${openCount === 1 ? 'wartet' : 'warten'} auf dich.`
}

/* ── Decisions ──────────────────────────────────────────────────────────── */

const OPEN_DECISION = new Set(['open', 'pending', 'awaiting_approval', 'detected', 'recommendation_ready', 'queued'])

function decisionStories(rows: any[], ctx: Ctx): NewsStory[] {
  return rows.map((row) => {
    const lens = ctx.clientLens(row.project_id)
    if (lens && row.visible_to_client === false) return null

    const title = clean(lens ? row.client_title : row.internal_title) || clean(row.title) || 'Entscheidung'
    const open = OPEN_DECISION.has(String(row.status || '').toLowerCase())
    const urgent = String(row.urgency || '').toLowerCase() === 'high' || String(row.urgency || '').toLowerCase() === 'critical'

    return {
      id: `decision:${row.id}`,
      category: 'decision' as NewsCategory,
      weight: open ? (urgent ? 'major' : 'normal') : 'quiet',
      headline: open
        ? `${title} — deine Entscheidung fehlt.`
        : `Entschieden: ${title}`,
      body: excerpt(lens ? (row.client_summary || row.impact_summary) : (row.impact_summary || row.description)),
      projectId: row.project_id,
      projectTitle: ctx.title(row.project_id),
      at: row.decided_at || row.updated_at || row.created_at,
      href: `/decisions?open=${row.id}`,
      action: open ? { label: 'Entscheiden', href: `/decisions?open=${row.id}` } : null,
      open,
      rank: open ? (urgent ? 98 : 90) : 40,
    }
  }).filter(Boolean) as NewsStory[]
}

/* ── Tasks ──────────────────────────────────────────────────────────────── */

function taskStories(rows: any[], ctx: Ctx): NewsStory[] {
  const out: NewsStory[] = []

  for (const row of rows) {
    const lens = ctx.clientLens(row.project_id)
    if (lens && (row.client_visible === false || row.audience === 'internal')) continue

    const flow = String(row.dev_status || '')
    const title = clean(row.title) || 'Aufgabe'
    const summary = excerpt(row.tagro_client_summary || row.latest_client_update)
    const base = {
      projectId: row.project_id,
      projectTitle: ctx.title(row.project_id),
      href: `/tasks?open=${row.id}`,
      body: summary,
    }

    if (flow === 'finished_by_dev' || flow === 'verified_by_tagro') {
      out.push({
        ...base,
        id: `task:${row.id}:review`,
        category: 'delivery',
        weight: 'major',
        headline: `„${title}" ist fertig und wartet auf deine Freigabe.`,
        at: row.updated_at,
        action: { label: 'Ansehen und freigeben', href: `/tasks?open=${row.id}` },
        open: true,
        rank: 95,
      })
      continue
    }

    if (flow === 'blocked') {
      out.push({
        ...base,
        id: `task:${row.id}:blocked`,
        category: 'risk',
        weight: 'major',
        headline: `„${title}" hängt fest.`,
        body: excerpt(row.blocked_reason) || summary,
        at: row.updated_at,
        action: { label: 'Blocker ansehen', href: `/tasks?open=${row.id}` },
        open: true,
        rank: 92,
      })
      continue
    }

    if (flow === 'completed' || flow === 'approved_by_owner') {
      out.push({
        ...base,
        id: `task:${row.id}:done`,
        category: 'delivery',
        weight: 'normal',
        headline: `„${title}" ist abgeschlossen.`,
        at: row.completed_at || row.updated_at,
        action: null,
        open: false,
        rank: 55,
      })
      continue
    }

    if (flow === 'in_progress') {
      out.push({
        ...base,
        id: `task:${row.id}:started`,
        category: 'progress',
        weight: 'quiet',
        headline: `An „${title}" wird gearbeitet.`,
        at: row.updated_at,
        action: null,
        open: false,
        rank: 30,
      })
    }
  }

  return out
}

/* ── Risks ──────────────────────────────────────────────────────────────── */

const OPEN_RISK = new Set(['open', 'detected', 'active', 'monitoring', 'escalated'])

function riskStories(rows: any[], ctx: Ctx): NewsStory[] {
  return rows.map((row) => {
    const lens = ctx.clientLens(row.project_id)
    const title = clean(lens ? row.client_title : row.title) || clean(row.title) || 'Risiko'
    const open = OPEN_RISK.has(String(row.status || '').toLowerCase())
    const severe = ['critical', 'high'].includes(String(row.severity || '').toLowerCase())

    const delay = Number(row.potential_delay_days) || 0
    const delayNote = delay > 0 ? ` Mögliche Verzögerung: ${delay} ${delay === 1 ? 'Tag' : 'Tage'}.` : ''

    return {
      id: `risk:${row.id}`,
      category: 'risk' as NewsCategory,
      weight: open && severe ? 'major' : 'normal',
      headline: open ? `Risiko erkannt: ${title}` : `Risiko geklärt: ${title}`,
      body: `${excerpt(lens ? (row.client_summary || row.description) : (row.description || row.recommendation)) ?? ''}${delayNote}`.trim() || null,
      projectId: row.project_id,
      projectTitle: ctx.title(row.project_id),
      at: row.resolved_at || row.updated_at || row.detected_at || row.created_at,
      href: `/risks?open=${row.id}`,
      action: open ? { label: 'Risiko ansehen', href: `/risks?open=${row.id}` } : null,
      open,
      rank: open ? (severe ? 96 : 88) : 45,
    }
  })
}

/* ── Status reports ─────────────────────────────────────────────────────── */

function reportStories(rows: any[], ctx: Ctx): NewsStory[] {
  return rows.map((row) => {
    const lens = ctx.clientLens(row.project_id)
    if (lens && row.visible_to_client === false) return null
    return {
      id: `report:${row.id}`,
      category: 'report' as NewsCategory,
      weight: 'normal' as const,
      headline: clean(row.title) || 'Neuer Statusbericht',
      body: excerpt(row.summary, 220),
      projectId: row.project_id,
      projectTitle: ctx.title(row.project_id),
      at: row.created_at,
      href: `/reports?open=${row.id}`,
      action: { label: 'Bericht lesen', href: `/reports?open=${row.id}` },
      open: false,
      rank: 60,
    }
  }).filter(Boolean) as NewsStory[]
}

/* ── Project activity ───────────────────────────────────────────────────── */

/* Aufgaben-Ereignisse erzählt die Aufgaben-Quelle mit echtem Lebenszyklus-
   Vokabular — hier wären sie nur ein zweites, schlechteres Exemplar. Alles
   andere auf Projektebene darf ins Blatt. */
function isTaskEcho(eventType: string): boolean {
  return eventType.startsWith('task_') || eventType.startsWith('decision_')
}

function activityStories(rows: any[], ctx: Ctx): NewsStory[] {
  return rows
    .filter((row) => {
      const event = String(row.event_type || '')
      return Boolean(event) && !isTaskEcho(event) && Boolean(clean(row.title))
    })
    .map((row) => ({
      id: `activity:${row.id}`,
      category: (String(row.event_type).includes('member') ? 'team' : 'progress') as NewsCategory,
      weight: 'quiet' as const,
      headline: clean(row.title) || 'Im Projekt hat sich etwas bewegt.',
      body: excerpt(row.body),
      projectId: row.project_id,
      projectTitle: ctx.title(row.project_id),
      at: row.created_at,
      href: row.project_id ? `/project/${row.project_id}` : null,
      action: null,
      open: false,
      rank: 25,
    }))
}
