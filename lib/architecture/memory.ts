/**
 * Architecture Memory — durable “why” for platform decisions.
 * Doc: docs/festag-architecture-memory.md
 */

export type ArchitectureMemoryStatus = 'locked' | 'evolving' | 'superseded'

export type ArchitectureMemoryEntry = {
  id: string
  question: string
  answer: string
  decision: string
  date: string
  version: string
  status: ArchitectureMemoryStatus
  /** Related constitution / doc paths */
  related?: string[]
}

export const ARCHITECTURE_MEMORY: ArchitectureMemoryEntry[] = [
  {
    id: 'one-platform',
    question: 'Warum gibt es keine Client App und Developer App mehr?',
    answer:
      'Es gibt nur eine Festag-Plattform. Erfahrungen entstehen aus Rollen und Permissions auf demselben Projektgraphen — nie aus getrennten Produkten.',
    decision: 'Client App / Developer App deprecated · One Account · Multiple Workspaces · Project Roles',
    date: '2026-07-01',
    version: '2.1',
    status: 'locked',
    related: [
      'docs/festag-architecture-confirmation.md',
      'docs/festag-product-constitution.md',
    ],
  },
  {
    id: 'universal-login',
    question: 'Warum gibt es keinen Dev Login?',
    answer:
      'Workspace ist modular aufgebaut. Eine Auth-Erfahrung für alle — Login, Register, Join, Verify. Rollen sind Linsen, keine zweiten Einstiege.',
    decision: 'Universal Login auf .al-root · /dev/login nur Migration Debt',
    date: '2026-08-01',
    version: '2.2',
    status: 'locked',
    related: [
      'docs/festag-authentication-onboarding-constitution.md',
      'docs/festag-architecture-confirmation.md',
    ],
  },
  {
    id: 'workspace-primary',
    question: 'Warum ist der Workspace das Primärobjekt?',
    answer:
      'Der Workspace beschreibt, wie Arbeit passiert — nicht wer der User ist. Projekte, Integrationen, Memory und Dashboard gehören zum Workspace.',
    decision: 'Workspace-primary · Account Profile ≠ Workspace Profile',
    date: '2026-07-01',
    version: '2.1',
    status: 'locked',
    related: ['docs/festag-architecture-confirmation.md', 'docs/festag-identity-constitution.md'],
  },
  {
    id: 'workspace-context',
    question: 'Warum kein Rollen-Dropdown im Onboarding?',
    answer:
      'Nutzer konfigurieren die Plattform nicht. Sie erzählen Tagro in natürlicher Sprache, woran sie arbeiten. Infer first. Ask second.',
    decision: 'Workspace Context als einziges Kontextfeld · Focus Areas optional',
    date: '2026-07-15',
    version: '2.1',
    status: 'locked',
    related: ['docs/festag-identity-constitution.md', 'lib/platform/identity.ts'],
  },
  {
    id: 'workspace-intelligence',
    question: 'Warum gibt es Workspace Intelligence?',
    answer:
      'Damit Dashboard, Module und Empfehlungen sich automatisch an Kontext, Rolle und Quellen anpassen — ohne manuelle Enterprise-Setup-Theater.',
    decision: 'Adaptive Workspace Intelligence als Kernfähigkeit',
    date: '2026-07-20',
    version: '2.4',
    status: 'evolving',
    related: ['docs/festag-adaptive-intelligence.md', 'lib/platform/workspace-personalization.ts'],
  },
  {
    id: 'ai-budget',
    question: 'Warum gibt es AI Budget?',
    answer:
      'Damit Projekte und Workspaces planbar bleiben. Intelligenz kostet — Transparenz schützt Vertrauen und Margen. Budget ist ein Signal innerhalb Production Intelligence — nicht das Produkt.',
    decision: 'AI Budget als Signal unter Production Intelligence (nicht Token-Dashboard)',
    date: '2026-08-01',
    version: '2.3',
    status: 'evolving',
    related: [
      'docs/festag-architecture-memory.md',
      'docs/festag-production-intelligence.md',
    ],
  },
  {
    id: 'production-intelligence',
    question: 'Warum ist Production Intelligence kein Dashboard und kein Token-Tracking?',
    answer:
      'Es ist die operative Intelligenzschicht für digitale Produktion — beobachtet, verbindet und optimiert Workflows über Tools hinweg. Tagro empfiehlt; Menschen entscheiden. Ein gleichwertiger Superintelligence-Pfeiler, nie Auto Mode.',
    decision:
      'Architecture reserved · Module production · interfaces in lib/intelligence/production · no UI yet',
    date: '2026-08-01',
    version: '2.3',
    status: 'locked',
    related: [
      'docs/festag-production-intelligence.md',
      'lib/intelligence/production/',
      '.cursor/rules/festag-production-intelligence.mdc',
    ],
  },
  {
    id: 'statusbericht-primary',
    question: 'Warum ist der Statusbericht die primäre Entscheidungsfläche?',
    answer:
      'Client und Developer brauchen keine parallelen Menüs für Freigaben und Risiken. Tagro mediieriert im Lesefluss — Action Cards statt PM-Chrome.',
    decision: 'Statusbericht / Tagro-first · Golden Gate in Real-World Scenarios',
    date: '2026-06-15',
    version: '2.0',
    status: 'locked',
    related: ['docs/festag-tagro-client-developer-scenarios.md'],
  },
  {
    id: 'project-ssot',
    question: 'Warum gehört Wissen dem Projekt, nicht der Person?',
    answer:
      'Menschen kommen und gehen. Projekte bleiben. Dateien, Entscheidungen, Tasks, Memory und Integrationen hängen am Projekt unter dem Workspace.',
    decision: 'Project is permanent · Creator = Project Owner',
    date: '2026-06-01',
    version: '2.0',
    status: 'locked',
    related: ['docs/festag-product-constitution.md'],
  },
  {
    id: 'architecture-memory',
    question: 'Warum gibt es Architecture Memory?',
    answer:
      'Damit zukünftige Änderungen wissen, warum etwas gebaut wurde — nicht nur was. Ideen und Gesetze gehen weder in Chats noch in stillen Refactors verloren.',
    decision: 'Architecture Memory + History als OS-Oberfläche /architecture',
    date: '2026-08-01',
    version: '2.4',
    status: 'evolving',
    related: ['docs/festag-architecture-memory.md', 'lib/architecture/'],
  },
  {
    id: 'architect-vs-tagro',
    question: 'Warum ist Festag Architect AI nicht dasselbe wie Tagro?',
    answer:
      'Tagro ist der ruhige COO des Workspace. Architect AI ist der Hüter der Plattform — Vision, Constitutions, Schema und Design — und prüft vor dem Code.',
    decision: 'Zwei Agenten · nie kollabieren',
    date: '2026-08-01',
    version: '2.4',
    status: 'locked',
    related: ['.cursor/rules/festag-architect-ai.mdc'],
  },
]

export function getArchitectureMemory(id: string): ArchitectureMemoryEntry | undefined {
  return ARCHITECTURE_MEMORY.find(e => e.id === id)
}

export function listArchitectureMemory(
  status?: ArchitectureMemoryStatus,
): ArchitectureMemoryEntry[] {
  if (!status) return ARCHITECTURE_MEMORY
  return ARCHITECTURE_MEMORY.filter(e => e.status === status)
}
