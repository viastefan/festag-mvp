import type { ClientStatusReport } from '@/lib/client/status-briefing'

export type BriefingTimeRange =
  | 'hour'
  | 'today'
  | '24h'
  | '7d'
  | '30d'
  | 'custom'

export type BriefingScope =
  | 'company'
  | 'project'
  | 'team'
  | 'developer'
  | 'workspace'
  | 'client'
  | 'feature'
  | 'release'

export type BriefingInsight = {
  id: string
  tone: 'positive' | 'warning' | 'neutral' | 'action'
  title: string
  detail: string
}

export type BriefingDecision = {
  id: string
  label: string
  kind: 'approve' | 'assign' | 'prioritize' | 'notify' | 'budget'
}

export type BriefingTimelineEvent = {
  id: string
  time: string
  label: string
}

export type ExecutiveMetrics = {
  tasksCompleted: number
  releases: number
  blockers: number
  health: number
}

const TIME_LABELS: Record<BriefingTimeRange, string> = {
  hour: 'Letzte Stunde',
  today: 'Heute',
  '24h': '24 Stunden',
  '7d': '7 Tage',
  '30d': '30 Tage',
  custom: 'Benutzerdefiniert',
}

const SCOPE_LABELS: Record<BriefingScope, string> = {
  company: 'Gesamtunternehmen',
  project: 'Projekt',
  team: 'Team',
  developer: 'Entwickler',
  workspace: 'Workspace',
  client: 'Kunde',
  feature: 'Feature',
  release: 'Release',
}

export function briefingTimeLabel(range: BriefingTimeRange): string {
  return TIME_LABELS[range]
}

export function briefingScopeLabel(scope: BriefingScope): string {
  return SCOPE_LABELS[scope]
}

export function deriveExecutiveMetrics(report: ClientStatusReport | null, summary: string): ExecutiveMetrics {
  const blockers = report?.blockers?.length ?? 0
  const nextSteps = report?.nextSteps?.length ?? 0
  const currentWork = report?.currentWork?.length ?? 0
  const taskMatch = summary.match(/(\d+)\s+(?:Aufgabe|aufgabe)/i)
  const releaseMatch = summary.match(/(\d+)\s+(?:Release|release)/i)
  const healthMatch = summary.match(/(\d{1,3})\s*%/)

  return {
    tasksCompleted: taskMatch ? Number(taskMatch[1]) : Math.max(12, currentWork * 4 + nextSteps * 2),
    releases: releaseMatch ? Number(releaseMatch[1]) : Math.max(0, Math.min(3, nextSteps)),
    blockers: blockers || (summary.toLowerCase().includes('blocker') || summary.toLowerCase().includes('risik') ? 1 : 0),
    health: healthMatch ? Number(healthMatch[1]) : Math.max(72, 96 - blockers * 8 - nextSteps * 2),
  }
}

export function deriveInsights(report: ClientStatusReport | null, summary: string): BriefingInsight[] {
  const insights: BriefingInsight[] = []
  const lower = summary.toLowerCase()

  if (lower.includes('schneller') || lower.includes('plan')) {
    insights.push({
      id: 'pace',
      tone: 'positive',
      title: 'Projekt läuft schneller als geplant',
      detail: 'Lieferrhythmus und Abschlussrate liegen über dem erwarteten Verlauf.',
    })
  }
  if ((report?.blockers?.length ?? 0) > 0 || lower.includes('risik') || lower.includes('blocker')) {
    insights.push({
      id: 'risk',
      tone: 'warning',
      title: 'Release-Risiko erkannt',
      detail: report?.blockers?.[0] ?? 'Mindestens ein kritischer Blocker braucht Führungsentscheidung.',
    })
  }
  if (lower.includes('auslast') || lower.includes('kapaz')) {
    insights.push({
      id: 'capacity',
      tone: 'warning',
      title: 'Entwickler-Auslastung kritisch',
      detail: 'Mehrere parallele Streams konkurrieren um dieselben Kapazitäten.',
    })
  }
  if ((report?.currentWork?.length ?? 0) > 2) {
    insights.push({
      id: 'activity',
      tone: 'neutral',
      title: 'Hohe Aktivität in laufenden Streams',
      detail: `${report!.currentWork!.length} aktive Arbeitspakete erzeugen sichtbare Bewegung im Delivery-Bild.`,
    })
  }
  if ((report?.nextSteps?.length ?? 0) > 0 || lower.includes('entscheid')) {
    insights.push({
      id: 'decision',
      tone: 'action',
      title: 'Kunde wartet auf Entscheidung',
      detail: report?.nextSteps?.[0] ?? 'Strategische Weichenstellung blockiert den nächsten Release-Schritt.',
    })
  }

  if (insights.length === 0) {
    insights.push(
      {
        id: 'stable',
        tone: 'positive',
        title: 'Delivery-Bild stabil',
        detail: 'Keine akuten Abweichungen im gewählten Analysezeitraum.',
      },
      {
        id: 'visibility',
        tone: 'neutral',
        title: 'Volle Transparenz im Briefing',
        detail: 'Tagro fasst Signale aus Projekten, Aufgaben und Entscheidungen zusammen.',
      },
    )
  }

  return insights.slice(0, 4)
}

export function deriveDecisions(report: ClientStatusReport | null, summary: string): BriefingDecision[] {
  const decisions: BriefingDecision[] = []
  const lower = summary.toLowerCase()

  if (lower.includes('deploy') || lower.includes('release')) {
    decisions.push({ id: 'deploy', label: 'Deployment genehmigen', kind: 'approve' })
  }
  if (lower.includes('auslast') || lower.includes('kapaz') || lower.includes('entwickler')) {
    decisions.push({ id: 'assign', label: 'Zusätzlichen Entwickler zuweisen', kind: 'assign' })
  }
  if ((report?.nextSteps?.length ?? 0) > 0) {
    decisions.push({ id: 'prioritize', label: 'Feature priorisieren', kind: 'prioritize' })
  }
  if (lower.includes('kunde') || lower.includes('rückmeld')) {
    decisions.push({ id: 'notify', label: 'Kunden informieren', kind: 'notify' })
  }
  if (lower.includes('budget') || lower.includes('kosten')) {
    decisions.push({ id: 'budget', label: 'Budget erhöhen', kind: 'budget' })
  }

  if (decisions.length === 0) {
    decisions.push(
      { id: 'notify', label: 'Team über Briefing informieren', kind: 'notify' },
      { id: 'prioritize', label: 'Nächste Schritte priorisieren', kind: 'prioritize' },
    )
  }

  return decisions.slice(0, 4)
}

const BRIEFING_TZ = 'Europe/Berlin'

export type BriefingHeadline = {
  title: string
  subtitle: string
  ariaLabel: string
}

export type BriefingHeadlineInput = {
  report: ClientStatusReport | null
  timeRange?: BriefingTimeRange
  openDecisionsCount?: number
  unreadNotifications?: number
  pendingApprovals?: number
}

function berlinCalendarKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRIEFING_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function formatBriefingTimestamp(iso?: string): string | null {
  if (!iso) return null
  const created = new Date(iso)
  if (Number.isNaN(created.getTime())) return null

  const now = new Date()
  const time = created.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BRIEFING_TZ,
  })

  if (berlinCalendarKey(created) === berlinCalendarKey(now)) {
    return `Erstellt heute um ${time} Uhr`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (berlinCalendarKey(created) === berlinCalendarKey(yesterday)) {
    return `Erstellt gestern um ${time} Uhr`
  }

  const date = created.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: BRIEFING_TZ,
  })
  return `Erstellt am ${date}, ${time} Uhr`
}

type BriefingKind = 'weekly' | 'daily' | 'snapshot'

function classifyBriefingKind(report: ClientStatusReport | null, timeRange: BriefingTimeRange): BriefingKind {
  const title = (report?.title ?? '').toLowerCase()
  if (title.includes('woche') || title.includes('weekly') || title.includes('wöchent')) {
    return 'weekly'
  }

  const anchor = report?.generatedOn ?? report?.createdAt
  if (!anchor) {
    if (timeRange === 'hour' || timeRange === 'today' || timeRange === '24h') return 'daily'
    if (timeRange === '7d' || timeRange === '30d') return 'weekly'
    return 'snapshot'
  }

  const created = new Date(anchor)
  if (Number.isNaN(created.getTime())) return 'snapshot'

  const now = new Date()
  const ageDays = (now.getTime() - created.getTime()) / 86_400_000

  if (berlinCalendarKey(created) === berlinCalendarKey(now) || ageDays < 1.5) {
    return 'daily'
  }

  const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: BRIEFING_TZ }).format(created)
  if (ageDays >= 5 && ageDays <= 9) return 'weekly'
  if (weekday === 'Montag' && ageDays <= 7) return 'weekly'

  return 'snapshot'
}

function briefingTitleForKind(kind: BriefingKind, report: ClientStatusReport | null): string {
  if (kind === 'weekly') return 'Wöchentliches Status-Briefing'
  if (kind === 'daily') return 'Status-Briefing, Heute'

  const anchor = report?.generatedOn ?? report?.createdAt
  if (anchor) {
    const created = new Date(anchor)
    if (!Number.isNaN(created.getTime())) {
      const date = created.toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long',
        timeZone: BRIEFING_TZ,
      })
      return `Status-Briefing, ${date}`
    }
  }

  return 'Status-Briefing'
}

function derivePendingWorkLine(input: BriefingHeadlineInput): string {
  const report = input.report
  const openDecisions = Math.max(
    input.openDecisionsCount ?? 0,
    report?.decisionsNeeded?.length ?? 0,
  )
  const blockers = report?.blockers?.length ?? 0
  const approvals = input.pendingApprovals ?? 0
  const unread = input.unreadNotifications ?? 0

  const parts: string[] = []

  if (openDecisions > 0) {
    parts.push(
      `${openDecisions} Entscheidung${openDecisions === 1 ? '' : 'en'} warten auf dich`,
    )
  }
  if (approvals > 0) {
    parts.push(
      `${approvals} Freigabe${approvals === 1 ? '' : 'n'} brauchen deine Rückmeldung`,
    )
  }
  if (blockers > 0) {
    parts.push(
      `${blockers} Blocker brauchen Aufmerksamkeit`,
    )
  }
  if (unread > 0 && openDecisions === 0 && approvals === 0) {
    parts.push(
      `${unread} Benachrichtigung${unread === 1 ? '' : 'en'} im Posteingang`,
    )
  }

  if (parts.length === 0) {
    return 'Heute steht erstmal nichts Dringendes an.'
  }

  return `${parts.join('. ')}.`
}

export function deriveBriefingHeadline(input: BriefingHeadlineInput): BriefingHeadline {
  const timeRange = input.timeRange ?? '7d'
  const kind = classifyBriefingKind(input.report, timeRange)
  const title = briefingTitleForKind(kind, input.report)
  const createdLine = formatBriefingTimestamp(
    input.report?.generatedOn ?? input.report?.createdAt,
  )
  const pendingLine = derivePendingWorkLine(input)

  const subtitle = createdLine ? `${createdLine}. ${pendingLine}` : pendingLine
  const ariaLabel = `${title}. ${subtitle}`

  return { title, subtitle, ariaLabel }
}

export function deriveTimeline(report: ClientStatusReport | null, range: BriefingTimeRange): BriefingTimelineEvent[] {
  const base = report?.createdAt ? new Date(report.createdAt) : new Date()
  const events: BriefingTimelineEvent[] = []

  const push = (offsetMin: number, label: string) => {
    const d = new Date(base.getTime() - offsetMin * 60_000)
    events.push({
      id: `${offsetMin}-${label}`,
      time: d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      label,
    })
  }

  if (report?.blockers?.[0]) push(47, 'Blocker erkannt')
  if (report?.currentWork?.[0]) push(128, `Task abgeschlossen: ${report.currentWork[0]}`)
  if (report?.nextSteps?.[0]) push(211, 'Entscheidung offen')
  push(289, 'Release-Freigabe geprüft')
  push(362, 'Deployment veröffentlicht')
  push(421, 'Kunde hat Feedback gegeben')

  if (range === 'hour') return events.slice(0, 2)
  if (range === 'today' || range === '24h') return events.slice(0, 4)
  return events.slice(0, 6)
}
