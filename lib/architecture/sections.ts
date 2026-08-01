/**
 * Festag Architecture module — section catalog (SSOT for /architecture).
 * Doc: docs/festag-architecture-memory.md
 */

export type ArchitectureSectionId =
  | 'status'
  | 'vision'
  | 'constitution'
  | 'design'
  | 'database'
  | 'apis'
  | 'ai'
  | 'workspace'
  | 'business'
  | 'roadmap'
  | 'requests'
  | 'debt'
  | 'production'
  | 'memory'
  | 'history'

export type ArchitectureSection = {
  id: ArchitectureSectionId
  label: string
  summary: string
  /** Doc or code anchors — calm, not jargon dumps */
  anchors?: string[]
}

export const ARCHITECTURE_SECTIONS: ArchitectureSection[] = [
  {
    id: 'status',
    label: 'Architecture Status',
    summary: 'Gesundheit der OS-Domänen — Vision bis Memory.',
  },
  {
    id: 'vision',
    label: 'Vision',
    summary: 'Operational Intelligence Platform — das Betriebssystem für Projekte.',
    anchors: [
      'docs/festag-product-north-star.md',
      'docs/festag-product-architecture.md',
      'docs/festag-adaptive-intelligence.md',
    ],
  },
  {
    id: 'constitution',
    label: 'Product Constitution',
    summary: 'Master laws — Product, Architecture, Experience, Identity, Auth, Integrations.',
    anchors: [
      'docs/festag-product-constitution.md',
      'docs/festag-architecture-confirmation.md',
      'docs/festag-experience-constitution.md',
      'docs/festag-identity-constitution.md',
      'docs/festag-authentication-onboarding-constitution.md',
      'docs/festag-integrations-constitution.md',
    ],
  },
  {
    id: 'design',
    label: 'Design System',
    summary: 'Tokens, Spacing, Radius, Motion, Shadows — eine Sprache für die ganze Plattform.',
    anchors: [
      'lib/design-tokens/dark.ts',
      'lib/design-tokens/elevated.ts',
      '.cursor/rules/festag-design-system-governance.mdc',
    ],
  },
  {
    id: 'database',
    label: 'Database',
    summary: 'Tabellen, Beziehungen, Policies — Wissen hängt am Projekt und Workspace.',
    anchors: ['supabase/migrations/', 'lib/intelligence/okm-store.ts'],
  },
  {
    id: 'apis',
    label: 'APIs',
    summary: 'OpenAI, Claude, GitHub, Stripe, Google, Apple und weitere Anbindungen.',
    anchors: ['lib/platform/integrations.ts', 'lib/payments/stripe.ts'],
  },
  {
    id: 'ai',
    label: 'AI Rules',
    summary: 'Tagro, Developer-Linse, Client-Linse — Infer first, ask second.',
    anchors: [
      'docs/festag-tagro-client-developer-scenarios.md',
      'docs/tagro-decision-orchestration.md',
      'lib/tagro/',
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace Rules',
    summary: 'Agency, Startup, Enterprise, Solo — Typ auf dem Workspace, nicht am Account.',
    anchors: ['lib/platform/workspace.ts', 'lib/platform/identity.ts'],
  },
  {
    id: 'business',
    label: 'Business Rules',
    summary: 'Pricing, Limits, Plans, Seats, AI- und Developer-Budget.',
    anchors: ['app/(app)/pricing/page.tsx', 'lib/addons-catalog.ts'],
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    summary: 'Was als Nächstes das Betriebssystem stärkt.',
  },
  {
    id: 'requests',
    label: 'Feature Requests',
    summary: 'Ideen noch nicht gebaut — priorisiert, mit Status.',
  },
  {
    id: 'debt',
    label: 'Technical Debt',
    summary: 'Ruhige Signale: Refactor, Duplikate, langsame APIs, UI-Drift.',
  },
  {
    id: 'production',
    label: 'Production Intelligence',
    summary:
      'Tagro Superintelligence pillar — digital production graph. Architecture reserved; not a dashboard.',
    anchors: [
      'docs/festag-production-intelligence.md',
      'lib/intelligence/production/',
      '.cursor/rules/festag-production-intelligence.mdc',
    ],
  },
  {
    id: 'memory',
    label: 'Architecture Memory',
    summary: 'Alle Architekturentscheidungen mit Begründung.',
    anchors: ['lib/architecture/memory.ts', 'docs/festag-architecture-memory.md'],
  },
  {
    id: 'history',
    label: 'Architecture History',
    summary: 'Versionslog der OS-Entscheidungen — warum, nicht nur was.',
    anchors: ['lib/architecture/history.ts'],
  },
]
