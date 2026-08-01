/**
 * Architecture Status — calm health of Festag OS domains.
 * Doc: docs/festag-architecture-memory.md
 */

export type ArchitectureDomainId =
  | 'vision'
  | 'ux'
  | 'database'
  | 'apis'
  | 'design'
  | 'ai'
  | 'pricing'
  | 'workspace'
  | 'roadmap'
  | 'production'
  | 'architecture'
  | 'memory'

export type ArchitectureDomainHealth = 'healthy' | 'attention' | 'gap'

export type ArchitectureDomain = {
  id: ArchitectureDomainId
  label: string
  health: ArchitectureDomainHealth
  note: string
}

/**
 * Seeded platform health — evolve toward live checks (migrations, token drift, debt).
 * Placeholders for Production stay honest: attention until metered.
 */
export const ARCHITECTURE_DOMAINS: ArchitectureDomain[] = [
  {
    id: 'vision',
    label: 'Vision',
    health: 'healthy',
    note: 'North Star und Adaptive Intelligence dokumentiert.',
  },
  {
    id: 'ux',
    label: 'UX',
    health: 'healthy',
    note: 'Experience Constitution + Auth-Chrome locked.',
  },
  {
    id: 'database',
    label: 'Database',
    health: 'attention',
    note: 'Hosted baseline + inkrementelle Migrations — Schema-Karte noch unvollständig.',
  },
  {
    id: 'apis',
    label: 'APIs',
    health: 'healthy',
    note: 'Integrations Constitution + Provider-Schichten vorhanden.',
  },
  {
    id: 'design',
    label: 'Design',
    health: 'healthy',
    note: 'Tokens und Governance aktiv (Night, Plate, CTAs).',
  },
  {
    id: 'ai',
    label: 'AI',
    health: 'healthy',
    note: 'Tagro-Szenarien und OKM-Fundament vorhanden.',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    health: 'attention',
    note: 'Checkout-UI vorhanden — zentrale Limits/Seats noch nicht SSOT.',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    health: 'healthy',
    note: 'Workspace-primary bestätigt · Personalisierung live.',
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    health: 'attention',
    note: 'Roadmap jetzt im Architecture-Modul — noch manuell gepflegt.',
  },
  {
    id: 'production',
    label: 'Production',
    health: 'attention',
    note: 'Architecture reserved (interfaces, events, schema). No live UI — intentional.',
  },
  {
    id: 'architecture',
    label: 'Architecture',
    health: 'healthy',
    note: 'Architecture Confirmation locked · Modul /architecture live.',
  },
  {
    id: 'memory',
    label: 'Memory',
    health: 'healthy',
    note: 'Architecture Memory + History als Code-SSOT.',
  },
]

export type ArchitectureStatusSummary = {
  score: number
  label: 'Healthy' | 'Attention' | 'Critical'
  healthy: number
  attention: number
  gap: number
  total: number
}

export function computeArchitectureStatus(
  domains: ArchitectureDomain[] = ARCHITECTURE_DOMAINS,
): ArchitectureStatusSummary {
  const total = domains.length
  const healthy = domains.filter(d => d.health === 'healthy').length
  const attention = domains.filter(d => d.health === 'attention').length
  const gap = domains.filter(d => d.health === 'gap').length
  const score = Math.round(
    ((healthy * 1 + attention * 0.55 + gap * 0.15) / Math.max(total, 1)) * 100,
  )
  const label: ArchitectureStatusSummary['label'] =
    gap >= 3 || score < 70 ? 'Critical' : attention >= 3 || score < 88 ? 'Attention' : 'Healthy'
  return { score, label, healthy, attention, gap, total }
}
