/**
 * Seeded roadmap, feature requests, and technical debt for /architecture.
 * Evolve toward DB-backed lists — keep honest placeholders for now.
 */

export type ArchitectureRoadmapItem = {
  id: string
  title: string
  horizon: 'now' | 'next' | 'later'
  summary: string
}

export type ArchitectureRequestStatus = 'idea' | 'prioritized' | 'building' | 'shipped'

export type ArchitectureFeatureRequest = {
  id: string
  title: string
  status: ArchitectureRequestStatus
  priority: 1 | 2 | 3
  summary: string
}

export type ArchitectureDebtItem = {
  id: string
  title: string
  area: string
  summary: string
}

export const ARCHITECTURE_ROADMAP: ArchitectureRoadmapItem[] = [
  {
    id: 'arch-surface',
    title: 'Architecture Module',
    horizon: 'now',
    summary: 'OS-Oberfläche mit Memory, History und Status — diese Version.',
  },
  {
    id: 'prod-intel-implement',
    title: 'Production Intelligence Instrumentation',
    horizon: 'later',
    summary:
      'After architecture lock: events ingest, score with why, recommendations — still no Auto Mode.',
  },
  {
    id: 'workspace-intel-dashboard',
    title: 'Workspace Intelligence Dashboard',
    horizon: 'next',
    summary: 'Health, Budget, Delivery- und AI-Score als adaptive Workspace-Ansicht.',
  },
  {
    id: 'schema-map',
    title: 'Living Database Map',
    horizon: 'next',
    summary: 'Tabellen, Beziehungen und Policies aus Migrations + Runtime ableiten.',
  },
  {
    id: 'architect-ci',
    title: 'Architect Gate in CI',
    horizon: 'later',
    summary: 'Automatische Checks gegen Memory und Constitutions bei PRs.',
  },
  {
    id: 'shell-unify',
    title: 'Shell Unification',
    horizon: 'next',
    summary: 'Portal und /dev zur einen Rolle-Linse zusammenführen — Migration Debt abbauen.',
  },
]

export const ARCHITECTURE_REQUESTS: ArchitectureFeatureRequest[] = [
  {
    id: 'req-arch-status-chip',
    title: 'Architecture Status Chip',
    status: 'building',
    priority: 1,
    summary: 'Kompakter Status (Score + Healthy) im Builder-Kontext — Klick öffnet Domain-Checkliste.',
  },
  {
    id: 'req-decision-git',
    title: 'Decision Git API',
    status: 'prioritized',
    priority: 1,
    summary: 'Memory/History persistieren, versionieren, von Architect AI und Settings pflegbar.',
  },
  {
    id: 'req-ws-intel',
    title: 'Workspace Intelligence Page',
    status: 'idea',
    priority: 2,
    summary: 'Agency-Health, Budgets, Clients, Delivery — Runtime-Zwilling zu Architecture.',
  },
  {
    id: 'req-debt-radar',
    title: 'Tagro Debt Radar',
    status: 'idea',
    priority: 2,
    summary: 'Tagro erkennt doppelte Tabellen, langsame APIs und UI-Drift aus Nutzung.',
  },
]

export const ARCHITECTURE_DEBT: ArchitectureDebtItem[] = [
  {
    id: 'debt-dual-shell',
    title: 'Dual Shell Migration',
    area: 'Platform',
    summary: 'PortalAppShell und DevAppShell sind Migration Debt — nicht vertiefen.',
  },
  {
    id: 'debt-dev-login',
    title: 'Legacy Dev Login',
    area: 'Auth',
    summary: '/dev/login und parallele Auth-Chromen abbauen zugunsten Universal Login.',
  },
  {
    id: 'debt-plan-limits',
    title: 'Plan Limits SSOT',
    area: 'Business',
    summary: 'Pricing-UI ohne zentrale Seats/Limits/AI-Budget-Enforcement.',
  },
  {
    id: 'debt-schema-inventory',
    title: 'Schema Inventory',
    area: 'Database',
    summary: 'Hosted Baseline ist nicht aus Migrations allein rekonstruierbar — Karte fehlt.',
  },
]
