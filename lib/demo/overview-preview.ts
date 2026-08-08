/**
 * Local UI preview payload for Overview — no auth / no API.
 * Used when `?preview=1` or `NEXT_PUBLIC_FESTAG_DEMO=1`.
 */

import type { OverviewPayload } from '@/components/app-shell/WorkspaceOverviewLive'

export function isOverviewPreview(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_FESTAG_DEMO === '1'
  }
  if (process.env.NEXT_PUBLIC_FESTAG_DEMO === '1') return true
  try {
    return (new URLSearchParams(window.location.search).get('preview') || '').startsWith('1')
  } catch {
    return false
  }
}

/** Server/middleware: skip auth only in local development. */
export function isDevSkipAuth(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    (process.env.FESTAG_DEV_SKIP_AUTH === '1' || process.env.NEXT_PUBLIC_FESTAG_DEMO === '1')
  )
}

export const DEMO_OVERVIEW_PAYLOAD: OverviewPayload = {
  workspace: {
    id: 'demo-workspace',
    name: 'Workspace aa',
    domain: 'aa',
  },
  workspaces: [
    {
      id: 'demo-workspace',
      name: 'Workspace aa',
      slug: 'aa',
      isPersonal: false,
      role: 'owner',
    },
  ],
  summary: {
    activeProjects: 2,
    pendingDecisions: 2,
    teamMembers: 1,
    nextMilestone: null,
    calmLine: 'Heute stehen vorerst keine weiteren Termine oder Aufgaben an.',
  },
  briefing: {
    projectTitle: 'Festag Platform',
    lines: [
      'Heute stehen vorerst keine weiteren Termine oder Aufgaben an.',
      'Optional könnten wir prüfen, wie die bisherigen Entscheidungen umgesetzt wurden.',
      'Abgesehen davon gibt es keine auffälligen Vorkommnisse.',
      'Bei Bedarf können wir den bisherigen Fortschritt noch einmal durchgehen.',
    ],
    reportId: null,
    projectId: 'demo-project-1',
  },
  intelligence: {
    score: 86,
    headline: 'Dein Projekt läuft ruhig.',
    highlights: ['Keine offenen Risiken', 'Zwei Entscheidungen warten'],
    learned: null,
    confidence: 0.82,
  },
  projects: [
    {
      id: 'demo-project-1',
      title: 'Festag Platform',
      phase: 'build',
      progress: 68,
      health: 'healthy',
      status: 'active',
      nextMilestone: null,
    },
    {
      id: 'demo-project-2',
      title: 'Client Portal',
      phase: 'review',
      progress: 42,
      health: 'watch',
      status: 'active',
      nextMilestone: null,
    },
  ],
  tasks: [
    {
      id: 'demo-task-1',
      title: 'Overview Read-Stack finalisieren',
      status: 'in_progress',
      projectId: 'demo-project-1',
      projectTitle: 'Festag Platform',
      updatedAt: new Date().toISOString(),
    },
  ],
  decisions: [
    {
      id: 'demo-decision-1',
      title: 'Soll der Statusbericht wöchentlich bleiben?',
      summary: 'Tagro empfiehlt den bisherigen Rhythmus beizubehalten.',
      projectId: 'demo-project-1',
      projectTitle: 'Festag Platform',
      urgency: 'normal',
      dueDate: null,
      responseType: 'recommend',
      recommendedOptionId: 'opt-keep',
      recommendationReason: 'Der aktuelle Rhythmus passt zum Team.',
      options: [
        { id: 'opt-keep', label: 'Beibehalten', hint: null, recommended: true },
        { id: 'opt-change', label: 'Ändern', hint: null, recommended: false },
      ],
    },
    {
      id: 'demo-decision-2',
      title: 'Nächstes Release freigeben?',
      summary: null,
      projectId: 'demo-project-2',
      projectTitle: 'Client Portal',
      urgency: 'high',
      dueDate: null,
      options: [],
    },
  ],
  activity: [
    {
      id: 'demo-act-1',
      title: 'Design Review abgeschlossen',
      body: null,
      createdAt: new Date().toISOString(),
      projectTitle: 'Festag Platform',
    },
  ],
  team: [
    {
      id: 'demo-member-1',
      name: 'Stefan Dirnberger',
      avatarUrl: null,
      role: 'owner',
    },
  ],
}
