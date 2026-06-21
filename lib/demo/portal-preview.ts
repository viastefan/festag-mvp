import type { ExecutiveDailyReport, ExecutiveOverview } from '@/lib/executive/types'
import type { ClientDeliverable } from '@/lib/client/deliverables'
import type { ClientTimelineItem } from '@/lib/client/timeline'
import type { DevActivityOverview } from '@/lib/dev/activity-feed'
import type { DevVisibilityOverview } from '@/lib/dev/visibility-feed'
import type { PendingApproval } from '@/lib/client/pending-approvals'
import type { ClientActivityItem } from '@/lib/client/client-activity'
import type { TeamWorkloadOverview } from '@/lib/teams/build-workload'
import type { Objective } from '@/lib/objectives/types'

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600000).toISOString()
}

function daysAgo(d: number) {
  return new Date(Date.now() - d * 86400000).toISOString()
}

/** Show rich preview UI when auth/API fails or demo mode is on. */
export function shouldUseDemoFallback(status?: number): boolean {
  if (process.env.NEXT_PUBLIC_FESTAG_DEMO === '1') return true
  return status === 401 || status === 0
}

export const DEMO_EXECUTIVE_OVERVIEW: ExecutiveOverview = {
  health: 'watch',
  headline: 'Zwei Projekte laufen planmäßig — ein Punkt braucht eine Entscheidung.',
  summary: 'Premium Relaunch: Hero-Video V3 wartet auf Freigabe. Festag Platform: Login-Flow in Review.',
  progress_pct: 68,
  open_issues: 3,
  critical_issues: 1,
  open_decisions: 2,
  active_objectives: 4,
  objectives_at_risk: 1,
  velocity_7d: 12,
  forecast_days_min: null,
  forecast_days_max: null,
  projects: [
    {
      id: 'demo-premium-relaunch',
      title: 'Premium Relaunch',
      color: '#6366f1',
      health: 'watch',
      progress_pct: 72,
      open_issues: 1,
      critical_issues: 0,
      open_decisions: 1,
      velocity_7d: 5,
      summary: 'Homepage-Video V3 hochgeladen — Client-Freigabe ausstehend.',
    },
    {
      id: 'demo-festag-platform',
      title: 'Festag Platform',
      color: '#0ea5e9',
      health: 'healthy',
      progress_pct: 81,
      open_issues: 1,
      critical_issues: 0,
      open_decisions: 0,
      velocity_7d: 4,
      summary: 'Login-Flow und Client Portal im Review — keine Blocker.',
    },
    {
      id: 'demo-brand-campaign',
      title: 'Brand Campaign Q3',
      color: '#f59e0b',
      health: 'risk',
      progress_pct: 41,
      open_issues: 1,
      critical_issues: 1,
      open_decisions: 1,
      velocity_7d: 3,
      summary: 'API-Anbindung blockiert — Entscheidung zu Scope nötig.',
    },
  ],
  generated_at: new Date().toISOString(),
}

export const DEMO_EXECUTIVE_DAILY_REPORT: ExecutiveDailyReport = {
  title: 'Tagro Tagesbericht',
  date_label: new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
  body: [
    'Heute lief der Premium Relaunch stabil weiter: Das Team hat Homepage-Video V3 geliefert und wartet auf Client-Freigabe.',
    'Bei Festag Platform steht der Login-Flow in Review — aus Kundensicht wirkt alles planmäßig.',
    'Brand Campaign Q3 hat einen Blocker: Die API-Anbindung verzögert den Launch. Eine Scope-Entscheidung würde den Verzug begrenzen.',
  ].join('\n\n'),
  highlights: [
    'Homepage-Video V3 zur Freigabe bereit',
    '12 abgeschlossene Tasks in 7 Tagen',
    '1 kritisches Issue bei Brand Campaign',
  ],
  source: 'synthesized',
  generated_at: new Date().toISOString(),
}

export const DEMO_DELIVERABLES: ClientDeliverable[] = [
  {
    id: 'demo-del-1',
    title: 'Homepage Video V3',
    description: 'Finaler Schnitt für Hero-Section',
    kind: 'video',
    status: 'analyzed',
    approval_status: 'awaiting_review',
    project_id: 'demo-premium-relaunch',
    project_title: 'Premium Relaunch',
    uploaded_by: null,
    created_at: hoursAgo(4),
    analyzed_at: hoursAgo(3.5),
    summary: 'Tagro: Neuer Schnitt mit klarerer Botschaft in den ersten 3 Sekunden. Ton und Tempo passen zur Markenlinie — Freigabe empfohlen.',
    requires_client_approval: true,
    preview_url: null,
    external_url: null,
    storage_path: null,
  },
  {
    id: 'demo-del-2',
    title: 'Login-Flow Prototype',
    description: 'Interaktiver Figma-Prototyp',
    kind: 'design',
    status: 'approved',
    approval_status: 'approved',
    project_id: 'demo-festag-platform',
    project_title: 'Festag Platform',
    uploaded_by: null,
    created_at: daysAgo(2),
    analyzed_at: daysAgo(2),
    summary: 'Client hat den Flow freigegeben. Nächster Schritt: Implementierung im Dev Panel.',
    requires_client_approval: false,
    preview_url: null,
    external_url: null,
    storage_path: null,
  },
  {
    id: 'demo-del-3',
    title: 'Brand Guidelines PDF',
    description: 'Aktualisierte Farb- und Typo-Regeln',
    kind: 'document',
    status: 'analyzed',
    approval_status: 'none',
    project_id: 'demo-brand-campaign',
    project_title: 'Brand Campaign Q3',
    uploaded_by: null,
    created_at: daysAgo(5),
    analyzed_at: daysAgo(5),
    summary: 'Referenzdokument für alle Kampagnen-Assets — rein informativ, keine Freigabe nötig.',
    requires_client_approval: false,
    preview_url: null,
    external_url: null,
    storage_path: null,
  },
]

export const DEMO_CLIENT_TIMELINE: ClientTimelineItem[] = [
  {
    id: 'demo-tl-1',
    kind: 'deliverable',
    project_id: 'demo-premium-relaunch',
    project_title: 'Premium Relaunch',
    title: 'Homepage Video V3 hochgeladen',
    body: 'Das Team hat den finalen Hero-Schnitt geliefert. Tagro empfiehlt Freigabe — klarere Botschaft in den ersten Sekunden.',
    created_at: hoursAgo(4),
  },
  {
    id: 'demo-tl-2',
    kind: 'task',
    project_id: 'demo-festag-platform',
    project_title: 'Festag Platform',
    title: 'Login-Flow in Review',
    body: 'Der neue Anmelde-Flow ist implementiert und wartet auf interne Prüfung, bevor er sichtbar wird.',
    created_at: hoursAgo(9),
  },
  {
    id: 'demo-tl-3',
    kind: 'signal',
    project_id: 'demo-brand-campaign',
    project_title: 'Brand Campaign Q3',
    title: 'Blocker: API-Anbindung',
    body: 'Die externe Schnittstelle antwortet nicht zuverlässig. Das Team schlägt eine Scope-Entscheidung vor.',
    created_at: hoursAgo(14),
  },
  {
    id: 'demo-tl-4',
    kind: 'approval',
    project_id: 'demo-festag-platform',
    project_title: 'Festag Platform',
    title: 'Login-Flow freigegeben',
    body: 'Du hast den Prototyp bestätigt — das Team setzt die Umsetzung fort.',
    created_at: daysAgo(2),
  },
  {
    id: 'demo-tl-5',
    kind: 'meeting',
    project_id: 'demo-premium-relaunch',
    project_title: 'Premium Relaunch',
    title: 'Weekly Sync — Entscheidungen',
    body: 'Launch-Datum bestätigt. Video-Freigabe als nächster Meilenstein.',
    created_at: daysAgo(3),
  },
]

export type DemoActivityFeedItem = {
  id: string
  title: string
  event_type: string
  actor_role: string
  created_at: string
  projects?: { title: string } | null
  impact?: string
  risk?: boolean
}

export const DEMO_ACTIVITY_FEED: DemoActivityFeedItem[] = [
  {
    id: 'demo-act-1',
    title: 'Homepage Video V3 — Client-sichtbare Lieferung',
    event_type: 'progress',
    actor_role: 'dev',
    created_at: hoursAgo(4),
    projects: { title: 'Premium Relaunch' },
  },
  {
    id: 'demo-act-2',
    title: 'Tagro: Tagesbericht für Führung synthetisiert',
    event_type: 'ai_report',
    actor_role: 'ai',
    created_at: hoursAgo(6),
    projects: null,
  },
  {
    id: 'demo-act-3',
    title: 'PR #142 merged — Login-Flow',
    event_type: 'task_done',
    actor_role: 'dev',
    created_at: hoursAgo(9),
    projects: { title: 'Festag Platform' },
  },
  {
    id: 'demo-act-4',
    title: 'Blocker gemeldet: API-Anbindung',
    event_type: 'blocker',
    actor_role: 'dev',
    created_at: hoursAgo(14),
    projects: { title: 'Brand Campaign Q3' },
    risk: true,
    impact: 'risk',
  },
  {
    id: 'demo-act-5',
    title: 'Entscheidung offen: Scope API vs. MVP',
    event_type: 'issue',
    actor_role: 'system',
    created_at: hoursAgo(18),
    projects: { title: 'Brand Campaign Q3' },
  },
  {
    id: 'demo-act-6',
    title: 'Client-Freigabe: Login-Flow Prototype',
    event_type: 'task_done',
    actor_role: 'client',
    created_at: daysAgo(2),
    projects: { title: 'Festag Platform' },
  },
]

export const DEMO_DEV_VISIBILITY: DevVisibilityOverview = {
  stats: {
    total: 8,
    client_visible: 5,
    signals_7d: 6,
    pending_deliverables: 1,
  },
  rows: [
    {
      id: 'demo-vis-1',
      project_id: 'demo-premium-relaunch',
      project_title: 'Premium Relaunch',
      type: 'deliverable',
      source: 'festag',
      content: 'homepage-video-v3.mp4 hochgeladen',
      client_visible: true,
      client_translation: 'Neues Homepage-Video ist bereit — klarere Botschaft in den ersten Sekunden. Bitte Freigabe im Client Panel.',
      internal_summary: 'Asset analyzed, awaiting client approval',
      created_at: hoursAgo(4),
      created_by: null,
    },
    {
      id: 'demo-vis-2',
      project_id: 'demo-festag-platform',
      project_title: 'Festag Platform',
      type: 'progress',
      source: 'github',
      content: 'PR #142 merged: Login flow polish',
      client_visible: true,
      client_translation: 'Der Anmelde-Flow wurde verbessert und ist intern in Review — aus deiner Sicht läuft alles planmäßig.',
      internal_summary: 'Merged PR, dev review pending',
      created_at: hoursAgo(9),
      created_by: null,
    },
    {
      id: 'demo-vis-3',
      project_id: 'demo-brand-campaign',
      project_title: 'Brand Campaign Q3',
      type: 'blocker',
      source: 'festag',
      content: 'API endpoint timeout on staging',
      client_visible: true,
      client_translation: 'Ein technischer Blocker verzögert die Anbindung. Das Team schlägt eine Scope-Entscheidung vor, um den Launch zu sichern.',
      internal_summary: 'Blocker issue, needs decision',
      created_at: hoursAgo(14),
      created_by: null,
    },
    {
      id: 'demo-vis-4',
      project_id: 'demo-festag-platform',
      project_title: 'Festag Platform',
      type: 'work_log',
      source: 'festag',
      content: 'Daily update: Login mobile fixes done',
      client_visible: true,
      client_translation: 'Mobile Login wurde heute gefixt — nächster Schritt ist der interne Review.',
      internal_summary: null,
      created_at: daysAgo(1),
      created_by: null,
    },
    {
      id: 'demo-vis-5',
      project_id: 'demo-premium-relaunch',
      project_title: 'Premium Relaunch',
      type: 'internal',
      source: 'festag',
      content: 'Color grading notes for editor',
      client_visible: false,
      client_translation: null,
      internal_summary: 'Internal only — color correction notes',
      created_at: daysAgo(1),
      created_by: null,
    },
  ],
}

export const DEMO_DEV_ACTIVITY: DevActivityOverview = {
  stats: {
    signals: 6,
    commits_7d: 14,
    pulls_open: 2,
    client_visible: 4,
  },
  rows: [
    {
      id: 'demo-da-1',
      kind: 'proof',
      project_id: 'demo-premium-relaunch',
      project_title: 'Premium Relaunch',
      title: 'Homepage Video V3 hochgeladen',
      body: 'homepage-video-v3.mp4 → Tagro analysiert → Client sieht Lieferung',
      created_at: hoursAgo(4),
      client_visible: true,
      href: '/dev/deliverables',
    },
    {
      id: 'demo-da-2',
      kind: 'pull_request',
      project_id: 'demo-festag-platform',
      project_title: 'Festag Platform',
      title: 'PR #142 merged — Login flow',
      body: 'feat(auth): mobile login polish',
      created_at: hoursAgo(9),
      client_visible: true,
      href: '/dev/github',
    },
    {
      id: 'demo-da-3',
      kind: 'issue',
      project_id: 'demo-brand-campaign',
      project_title: 'Brand Campaign Q3',
      title: 'Blocker: API timeout',
      body: 'Staging endpoint unreliable — escalated to client-visible signal',
      created_at: hoursAgo(14),
      client_visible: true,
      href: '/dev/issues',
    },
    {
      id: 'demo-da-4',
      kind: 'work_log',
      project_id: 'demo-festag-platform',
      project_title: 'Festag Platform',
      title: 'Tagesupdate gesendet',
      body: 'Mobile Login fixes — an Tagro übergeben',
      created_at: daysAgo(1),
      client_visible: true,
      href: '/dev/briefing',
    },
    {
      id: 'demo-da-5',
      kind: 'commit',
      project_id: 'demo-festag-platform',
      project_title: 'Festag Platform',
      title: 'a3f9c2d — fix portal nav dark mode',
      body: 'Internal commit, not client-visible',
      created_at: daysAgo(1),
      client_visible: false,
      href: '/dev/github',
    },
  ],
}

export const DEMO_PENDING_APPROVALS: PendingApproval[] = [
  {
    id: 'demo-pa-1',
    kind: 'deliverable',
    title: 'Homepage Video V3',
    project_id: 'demo-premium-relaunch',
    project_title: 'Premium Relaunch',
    created_at: hoursAgo(4),
    href: '/deliverables',
  },
  {
    id: 'demo-pa-2',
    kind: 'decision',
    title: 'Launch-Datum bestätigen',
    project_id: 'demo-premium-relaunch',
    project_title: 'Premium Relaunch',
    created_at: hoursAgo(20),
    href: '/decisions',
  },
]

export const DEMO_CLIENT_ACTIVITY: ClientActivityItem[] = [
  {
    id: 'demo-ca-1',
    kind: 'signal',
    project_id: 'demo-premium-relaunch',
    project_title: 'Premium Relaunch',
    title: 'Homepage Video V3 bereit',
    body: 'Das Team hat den finalen Hero-Schnitt geliefert — Freigabe im Client Panel.',
    created_at: hoursAgo(4),
  },
  {
    id: 'demo-ca-2',
    kind: 'signal',
    project_id: 'demo-festag-platform',
    project_title: 'Festag Platform',
    title: 'Login-Flow verbessert',
    body: 'Mobile Login wurde gefixt; interne Review läuft — aus deiner Sicht planmäßig.',
    created_at: hoursAgo(9),
  },
]

export const DEMO_TEAM_OVERVIEW: TeamWorkloadOverview = {
  members: [
    {
      id: 'demo-team-alex',
      email: 'alex@festag.app',
      full_name: 'Alex Meyer',
      first_name: 'Alex',
      role: 'developer',
      position: 'Full Stack',
      availability: 'full_time',
    },
    {
      id: 'demo-team-sam',
      email: 'sam@festag.app',
      full_name: 'Sam Keller',
      first_name: 'Sam',
      role: 'designer',
      position: 'Design',
      availability: 'full_time',
    },
    {
      id: 'demo-team-jo',
      email: 'jo@festag.app',
      full_name: 'Jo Richter',
      first_name: 'Jo',
      role: 'project_owner',
      position: 'Delivery Lead',
      availability: 'full_time',
    },
  ],
  workloads: {
    'demo-team-alex': {
      active: 4, review: 2, blocked: 1, open: 6, done: 12,
      lastActive: hoursAgo(2), overloaded: false, atRisk: true,
    },
    'demo-team-sam': {
      active: 2, review: 0, blocked: 0, open: 2, done: 8,
      lastActive: hoursAgo(5), overloaded: false, atRisk: false,
    },
    'demo-team-jo': {
      active: 1, review: 1, blocked: 0, open: 2, done: 5,
      lastActive: hoursAgo(1), overloaded: false, atRisk: false,
    },
  },
  totals: {
    members: 3,
    available: 3,
    reviewBacklog: 3,
    blocked: 1,
    overloaded: 0,
    velocity_7d: 8,
  },
  tagro_insights: [
    '1 offene Blocker im Team',
    'Review-Backlog: 3 Tasks warten auf Freigabe',
  ],
}

export const DEMO_OBJECTIVE_PROJECTS: Record<string, { id: string; title: string; color: string }> = {
  'demo-premium-relaunch': { id: 'demo-premium-relaunch', title: 'Premium Relaunch', color: '#6366f1' },
  'demo-festag-platform': { id: 'demo-festag-platform', title: 'Festag Platform', color: '#0ea5e9' },
  'demo-brand-campaign': { id: 'demo-brand-campaign', title: 'Brand Campaign Q3', color: '#f59e0b' },
}

function daysFromNow(d: number) {
  return new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
}

export const DEMO_OBJECTIVES: Objective[] = [
  {
    id: 'demo-obj-1',
    project_id: 'demo-premium-relaunch',
    title: 'Premium Relaunch live bringen',
    description: 'Hero-Video, neue Pricing-Seite und Client-Portal bis Q3 — Tagro verknüpft Fortschritt mit diesem Ziel.',
    target_date: daysFromNow(45),
    status: 'active',
    progress_pct: 62,
    created_at: daysAgo(30),
    updated_at: hoursAgo(4),
    task_count: 8,
    task_done: 5,
    at_risk: false,
  },
  {
    id: 'demo-obj-2',
    project_id: 'demo-festag-platform',
    title: 'Client Portal MVP freigeben',
    description: 'Lieferungen, Entscheidungen und Aktivität für Kunden sichtbar machen.',
    target_date: daysFromNow(12),
    status: 'active',
    progress_pct: 78,
    created_at: daysAgo(21),
    updated_at: hoursAgo(2),
    task_count: 11,
    task_done: 9,
    at_risk: false,
  },
  {
    id: 'demo-obj-3',
    project_id: 'demo-brand-campaign',
    title: 'API-Launch ohne Scope-Verzug',
    description: 'MVP-Scope vs. volle API-Anbindung — Entscheidung blockiert Fortschritt.',
    target_date: daysFromNow(7),
    status: 'active',
    progress_pct: 38,
    created_at: daysAgo(14),
    updated_at: hoursAgo(8),
    task_count: 6,
    task_done: 2,
    at_risk: true,
  },
  {
    id: 'demo-obj-4',
    project_id: 'demo-premium-relaunch',
    title: 'Brand Guidelines dokumentieren',
    description: 'Einheitliche Typo, Farben und Motion für alle Lieferungen.',
    target_date: daysAgo(5),
    status: 'completed',
    progress_pct: 100,
    created_at: daysAgo(60),
    updated_at: daysAgo(3),
    task_count: 4,
    task_done: 4,
    at_risk: false,
  },
]

export type DemoCaptureRow = {
  id: string
  project_id: string
  page_url: string | null
  page_title: string | null
  transcript: string
  tagro_summary: string | null
  structured_changes: Array<{ title?: string; description?: string; affected?: string; suggested?: string }> | null
  warnings: string[] | null
  status: string
  created_at: string
}

export const DEMO_CAPTURE_PROJECTS: Record<string, { id: string; title: string; color: string }> = {
  'demo-premium-relaunch': { id: 'demo-premium-relaunch', title: 'Premium Relaunch', color: '#6366f1' },
  'demo-festag-platform': { id: 'demo-festag-platform', title: 'Festag Platform', color: '#0ea5e9' },
}

export const DEMO_CAPTURES: DemoCaptureRow[] = [
  {
    id: 'demo-cap-1',
    project_id: 'demo-premium-relaunch',
    page_url: 'https://staging.example.com/preise',
    page_title: 'Preisseite',
    transcript: '[Seite: /preise]\n„Die zweite Karte braucht einen klareren Button-Text."',
    tagro_summary: 'CTA auf der Preisseite soll klarer und handlungsorientierter formuliert werden.',
    structured_changes: [
      {
        title: 'Professional-CTA schärfen',
        description: 'Der Button auf der mittleren Karte wirkt zu generisch.',
        affected: '/preise · Karte Professional',
        suggested: 'Text auf „Jetzt starten" ändern',
      },
    ],
    warnings: [],
    status: 'ready_review',
    created_at: hoursAgo(3),
  },
  {
    id: 'demo-cap-2',
    project_id: 'demo-festag-platform',
    page_url: 'https://staging.example.com/login',
    page_title: 'Login',
    transcript: '[Seite: /login]\n„Passwort vergessen ist zu versteckt."',
    tagro_summary: 'Login-Flow: Passwort-Reset soll sichtbarer platziert werden.',
    structured_changes: [
      {
        title: 'Passwort-Reset sichtbarer',
        description: 'Link ist visuell zu schwach und wird übersehen.',
        affected: '/login · Formular',
        suggested: 'Link direkt unter dem Passwort-Feld platzieren',
      },
    ],
    warnings: ['Scope unklar — betrifft nur Mobile oder auch Desktop?'],
    status: 'approved',
    created_at: hoursAgo(26),
  },
]
