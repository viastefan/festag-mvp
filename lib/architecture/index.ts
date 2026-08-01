/**
 * Festag Architecture OS — platform guardian data (not Tagro workspace COO).
 * Doc: docs/festag-architecture-memory.md
 */

export {
  ARCHITECTURE_SECTIONS,
  type ArchitectureSection,
  type ArchitectureSectionId,
} from './sections'

export {
  ARCHITECTURE_MEMORY,
  getArchitectureMemory,
  listArchitectureMemory,
  type ArchitectureMemoryEntry,
  type ArchitectureMemoryStatus,
} from './memory'

export {
  ARCHITECTURE_HISTORY,
  ARCHITECTURE_CURRENT_VERSION,
  type ArchitectureHistoryEntry,
} from './history'

export {
  ARCHITECTURE_DOMAINS,
  computeArchitectureStatus,
  type ArchitectureDomain,
  type ArchitectureDomainHealth,
  type ArchitectureDomainId,
  type ArchitectureStatusSummary,
} from './status'

export {
  ARCHITECTURE_ROADMAP,
  ARCHITECTURE_REQUESTS,
  ARCHITECTURE_DEBT,
  type ArchitectureRoadmapItem,
  type ArchitectureFeatureRequest,
  type ArchitectureRequestStatus,
  type ArchitectureDebtItem,
} from './catalog'

/**
 * Architecture OS map pointers — not a Production dashboard.
 * Full reservation: lib/intelligence/production/ · docs/festag-production-intelligence.md
 */
export type ProductionIntelligenceMetric = {
  id: string
  label: string
  value: string
  hint: string
  live: boolean
}

export const PRODUCTION_INTELLIGENCE_METRICS: ProductionIntelligenceMetric[] = [
  {
    id: 'phase',
    label: 'Phase',
    value: 'Reserved',
    hint: 'Architecture only — no metering UI',
    live: false,
  },
  {
    id: 'score',
    label: 'Production Score',
    value: '—',
    hint: 'Multi-signal + why — not implemented',
    live: false,
  },
  {
    id: 'graph',
    label: 'Intelligence Graph',
    value: '—',
    hint: 'Integration events reserved in lib',
    live: false,
  },
  {
    id: 'module',
    label: 'Workspace Module',
    value: 'production',
    hint: 'Activates only for digital production',
    live: false,
  },
]
