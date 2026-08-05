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
    id: 'create-project-core-flow',
    question: 'Warum bauen wir Create Project vor Workspace Overview?',
    answer:
      'Festag verkauft den Prozess Idee→Workspace→Projekt→Tagro-Struktur→Einladung→Zusammenarbeit→Lieferung — kein Dashboard. Overview ist Aggregation; ohne Projekte ist sie leer und unehrlich. Der erste komplette Flow (Workspace→Projekt→Tagro-Draft→Invite→Projekt öffnen) macht Festag benutzbar. Workspace Overview kommt erst, wenn echte Projektdaten existieren.',
    decision:
      'Sprint order: Auth → Workspace → Create Project → Tagro draft (human confirms) → Invite → Project view → erst dann Workspace Overview. Doc: docs/festag-create-project-flow.md · v3.7',
    date: '2026-08-04',
    version: '3.7',
    status: 'locked',
    related: [
      'docs/festag-create-project-flow.md',
      'docs/festag-os-workspace-phases.md',
      '.cursor/rules/festag-os-workspace-phases.mdc',
      'lib/tagro/intent-intake.ts',
      'lib/new-project-open.ts',
      'components/NewProjectModal.tsx',
      'lib/platform/join.ts',
    ],
  },
  {
    id: 'entry-intent-landing',
    question: 'Warum steuert Intention den Einstieg — nicht Rolle?',
    answer:
      'Rolle steuert Sicht und Rechte. Intention (Einladung / Registrierung / Create) steuert den ersten Raum. Projekt-Invite → Projekt. Eigene Registrierung → Festag OS Overview. Workspace ohne Projekte → Create first project. Workspace-Mitgliedschaft → Workspace Overview. Sonst verliert Festag den Fokus: Kunden wollen „Wo ist mein Projekt?“, nicht Activity/Team am Tag 1. Eine Plattform, progressive Disclosure — Kapazität ≠ Tag-1-Oberfläche.',
    decision:
      'Entry Intent > Role for first landing. Invitation carries intent. joinCompletionRedirect → /project/:id. Zero projects after Ready → Create Project, not empty Overview.',
    date: '2026-08-04',
    version: '3.7',
    status: 'locked',
    related: [
      'docs/festag-create-project-flow.md',
      'lib/platform/join.ts',
      'docs/festag-authentication-onboarding-constitution.md',
      'docs/festag-product-constitution.md',
    ],
  },
  {
    id: 'workspace-creation-as-os',
    question: 'Warum ist Workspace-Erstellung kein Name→Template→Module-Wizard?',
    answer:
      'Der erste Workspace muss sich wie ein digitales Betriebssystem anfühlen, nicht wie ein Ordner. Oberfläche: sequentieller Popup-Slider auf Festag OS Overview (nicht Full-Page). Name + Subdomain machen ihn real; Use-Case-Karten wählen eine Aufgabe. Module und €19 gehören nicht in den ersten Moment. Erster Workspace gratis (Hobby); Zusatz-Workspaces → Workspace Plan. Erstes Projekt ist kein Slide im Wizard — aber nach Ready folgt sofort Create first project (nicht leeres Overview). Spätere Projekte: Tagro Intent Intake via openNewProject().',
    decision:
      'Phase 2: Name → Use-case → Creating → Ready → Create first project (if zero projects). No project/invite/module inside wizard slides. First WS free. SSOT workspace-creation + create-project-flow · v3.7',
    date: '2026-08-04',
    version: '3.7',
    status: 'locked',
    related: [
      'docs/festag-os-workspace-phases.md',
      'docs/festag-create-project-flow.md',
      '.cursor/rules/festag-os-workspace-phases.mdc',
      'lib/platform/workspace-creation.ts',
      'lib/platform/workspace-setup.ts',
      'lib/new-project-open.ts',
      'lib/tagro/intent-intake.ts',
      'components/app-shell/WorkspaceCreateWizardModal.tsx',
      'components/app-shell/AppShellNewProjectHost.tsx',
      'components/NewProjectModal.tsx',
      'components/app-shell/OverviewPendingInvites.tsx',
      'lib/workspace-create-open.ts',
    ],
  },
  {
    id: 'tagro-intent-intake',
    question: 'Warum ist Projekterstellung kein Create-Project-Formular?',
    answer:
      'Festag ist kein PM-Tool. First-project mode: Name (required) + optionale Beschreibung — minimal, ruhig. Tagro erzeugt einen editierbaren Struktur-Draft (Milestones, wenige Tasks); Speichern der Struktur erst nach Bestätigung. Später: freestyle Intent Intake (ein Input, Voice, Dateien) für Bug/Feature/Invite/Frage/Status. Nie Dutzende Tasks still auto-schreiben. Nie Fake-Loading ohne echte Draft-Arbeit.',
    decision:
      'Create Project = Intent Intake. First project: name + optional description → real prepare → draft → human confirms → land in project. APIs intent-intake + intent-confirm. Later freestyle kinds remain.',
    date: '2026-08-04',
    version: '3.7',
    status: 'locked',
    related: [
      'docs/festag-create-project-flow.md',
      'lib/tagro/intent-intake.ts',
      'components/NewProjectModal.tsx',
      'app/api/tagro/intent-intake/route.ts',
      'app/api/tagro/intent-confirm/route.ts',
      'docs/festag-tagro-invisible-intelligence.md',
    ],
  },
  {
    id: 'festag-os-vs-workspace',
    question: 'Warum gibt es Festag OS und Festag Workspace als getrennte Modi?',
    answer:
      'Ohne Workspace ist Festag ein ruhiges OS (Overview, Docs, Settings, Create Workspace) — der Nutzer versteht das Produkt und den nächsten Schritt. Mit Workspace und ohne Projekte: Create Project zuerst — nicht leere Aggregation. Mit Projekten wird dieselbe Plattform zum Workspace-OS; Overview aggregiert erst dann ehrlich. Overview bleibt der stabile Menüpunkt — Landung folgt Entry Intent.',
    decision:
      'Phase 1: Festag OS at /overview · Phase 2: Workspace Wizard · Phase 2b: Create Project core flow · Phase 3: Workspace Overview after real projects · v3.7',
    date: '2026-08-04',
    version: '3.7',
    status: 'locked',
    related: [
      'docs/festag-os-workspace-phases.md',
      'docs/festag-create-project-flow.md',
      '.cursor/rules/festag-os-workspace-phases.mdc',
      'components/app-shell/',
    ],
  },
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
    status: 'superseded',
    related: ['docs/festag-identity-constitution.md', 'lib/platform/identity.ts'],
  },
  {
    id: 'build-onboarding-v2',
    question: 'Warum Name → Position → Workspace → Quellen → Abschluss statt Workspace Context?',
    answer:
      'Build soll schnell und menschlich sein: Name (für E-Mails/Einladungen, skippable), optionale Position als soft signal, Workspace-Wahl, optionale Quellen, ruhiger Abschluss. Kein Invite-Gate im Onboarding. Kein Client|Dev-Fork über Position.',
    decision:
      'AUTH_ONBOARDING_FLOW: name → position? → workspace → connect? → done → preparing · invites later',
    date: '2026-08-02',
    version: '3.1',
    status: 'locked',
    related: [
      'docs/festag-authentication-onboarding-constitution.md',
      'lib/platform/master-onboarding.ts',
      'lib/platform/onboarding.ts',
    ],
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
    id: 'tagro-superintelligence',
    question: 'Warum ist Tagro Superintelligence keine einzelne AI-Funktion?',
    answer:
      'Tagro ist die Intelligenzschicht, die alles verbindet — sechs unabhängige Layer plus ein Koordinator darüber. Features ohne klaren Layer-Owner werden nicht gebaut. Nie Auto Mode. Intelligenz soll unsichtbar wirken.',
    decision:
      'Operating Intelligence System constitution locked · docs/festag-tagro-superintelligence.md · lib/intelligence/superintelligence.ts',
    date: '2026-08-01',
    version: '2.5',
    status: 'locked',
    related: [
      'docs/festag-tagro-superintelligence.md',
      'lib/intelligence/superintelligence.ts',
      '.cursor/rules/festag-tagro-superintelligence.mdc',
    ],
  },
  {
    id: 'tagro-invisible-intelligence',
    question: 'Warum ist Tagro kein Chat-Produkt?',
    answer:
      'Die Zukunft ist kontextuelle Intelligenz im Workflow — nicht isolierte Chat-Fenster. Tagro beobachtet, versteht, empfiehlt; Menschen bestätigen. Chat ist nur eine Oberfläche. Bekannten Kontext nie erneut abfragen. Ziel: Vertrauen, nicht Automation.',
    decision:
      'Constitution II locked · docs/festag-tagro-invisible-intelligence.md · lib/intelligence/invisible.ts',
    date: '2026-08-01',
    version: '2.6',
    status: 'locked',
    related: [
      'docs/festag-tagro-invisible-intelligence.md',
      'lib/intelligence/invisible.ts',
      '.cursor/rules/festag-tagro-invisible-intelligence.mdc',
    ],
  },
  {
    id: 'festag-os-constitution-v1',
    question: 'Warum keine Feature-Listen mehr als Produktstrategie?',
    answer:
      'Festag ist eine Plattform aus acht Säulen — nicht 30 Features. Jede Änderung muss einer Säule gehören. Sonst wird nicht gebaut. Das ist der Übergang von App zu Operating System.',
    decision:
      'Product Constitution v1.0 locked · docs/festag-os-constitution-v1.md · lib/intelligence/os-constitution.ts',
    date: '2026-08-01',
    version: '3.0',
    status: 'locked',
    related: [
      'docs/festag-os-constitution-v1.md',
      'lib/intelligence/os-constitution.ts',
      '.cursor/rules/festag-os-constitution-v1.mdc',
    ],
  },
  {
    id: 'experience-intelligence',
    question: 'Warum gibt es Experience Intelligence als eigene Säule?',
    answer:
      'Dieselbe Information muss unterschiedlich erlebt werden — Timing, Sprache, Dichte, Voice. Das ist kein Chat und keine Communication-Übersetzung allein. Voice lebt hier. Nie Surveillance.',
    decision: 'Layer 8 Experience Intelligence · Voice under Experience · personal adaptation opt-in',
    date: '2026-08-01',
    version: '3.0',
    status: 'locked',
    related: [
      'docs/festag-os-constitution-v1.md',
      'docs/festag-experience-constitution.md',
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
  {
    id: 'festag-design-constitution',
    question: 'What is Festag visual law (Read Mode, Knowledge Grid, Path)?',
    answer:
      'Festag is a Software Production OS — not SaaS. Read Mode paper #F8F6F2 is default everywhere. Primary #5B647D only for attention. Knowledge = silent subtle dots; Flow = one organic path, one decision, retract. Mobile = independent living story (not shrunk desktop). Typography (Aeonik) creates hierarchy — not borders/cards. Gate: why is this visible now?',
    decision: 'Design Constitution v1 · Knowledge vs Flow · MobileOverviewStory',
    date: '2026-08-05',
    version: '1.0',
    status: 'locked',
    related: [
      'docs/festag-design-constitution.md',
      '.cursor/rules/festag-design-constitution.mdc',
      'lib/design-tokens/festag-canvas.ts',
      'components/festag-canvas/KnowledgeGrid.tsx',
      'components/festag-canvas/FestagPath.tsx',
      'components/app-shell/overview/MobileOverviewStory.tsx',
    ],
  },
  {
    id: 'overview-tagro-core-interface',
    question: 'Warum ist Overview ein zoomable Workspace Board mit Project Path?',
    answer:
      'Overview is a zoomable Software Production OS: Level 1 Workspace Board (calm constellation — WHERE) and Level 2 Project View (decision path — WHY). Desktop: full-bleed constellation + line grid. Mobile: independent living story (Knowledge Grid → voice lyrics → one path → one panel → retract) — never shrunk desktop. Tagro is never the hero. Paper #F8F6F2 · primary #5B647D only for focus.',
    decision:
      'Overview v5.2 · Desktop Wissensraum + Mobile living story · Design Constitution v1',
    date: '2026-08-05',
    version: '5.2',
    status: 'locked',
    related: [
      'docs/festag-decision-canvas.md',
      'components/app-shell/WorkspaceBoard.tsx',
      'lib/overview/workspace-board.ts',
      'lib/overview/decision-canvas.ts',
      'app/api/workspaces/overview/route.ts',
      'docs/festag-tagro-invisible-intelligence.md',
      'docs/festag-experience-constitution.md',
    ],
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
