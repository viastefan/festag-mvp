/**
 * Architecture History — versioned log of OS-shaping decisions (“git for decisions”).
 * Doc: docs/festag-architecture-memory.md
 */

export type ArchitectureHistoryEntry = {
  version: string
  title: string
  summary: string
  date: string
  memoryIds: string[]
}

export const ARCHITECTURE_HISTORY: ArchitectureHistoryEntry[] = [
  {
    version: '3.8',
    title: 'Overview as Tagro Operating Interface',
    summary:
      'Overview redesigned as Living Network: idle silence with disconnected nodes, blue connection grows on context, one floating decision panel, status + voice footer. No continuous animation. No KPI widgets.',
    date: '2026-08-04',
    memoryIds: ['overview-tagro-core-interface'],
  },
  {
    version: '3.7',
    title: 'Create Project Core Flow · Entry Intent',
    summary:
      'Domain-first: process before dashboard. After Workspace Ready with zero projects → Create first project (name + optional description), Tagro draft with human confirm, optional invite, land in project — not empty Overview. Entry Intent > Role for first landing. Overview deferred until real project data exists.',
    date: '2026-08-04',
    memoryIds: [
      'create-project-core-flow',
      'entry-intent-landing',
      'workspace-creation-as-os',
      'tagro-intent-intake',
      'festag-os-vs-workspace',
      'overview-tagro-core-interface',
    ],
  },
  {
    version: '3.6',
    title: 'Tagro Intent Intake',
    summary:
      'Project creation is no longer a form. One intelligent input → Tagro detects intent → editable draft → human confirms. APIs intent-intake + intent-confirm.',
    date: '2026-08-04',
    memoryIds: ['tagro-intent-intake', 'workspace-creation-as-os'],
  },
  {
    version: '3.1',
    title: 'Build Onboarding v2',
    summary:
      'Name → Position? → Workspace wählen → Quellen? → Abschluss. Invites later. Workspace Context NL no longer the Build spine.',
    date: '2026-08-02',
    memoryIds: ['build-onboarding-v2'],
  },
  {
    version: '3.0',
    title: 'Festag OS Constitution v1.0',
    summary:
      'Platform law for 5–10 years: eight pillars over features. Experience Intelligence added. Smart Writing, Decision Intelligence, Token Intelligence as cross-cutting — not products.',
    date: '2026-08-01',
    memoryIds: ['festag-os-constitution-v1', 'experience-intelligence'],
  },
  {
    version: '2.6',
    title: 'Tagro Invisible Operating Intelligence',
    summary:
      'Constitution II: Tagro is the OS intelligence, not a chat product. Context-first loop, chat as one surface, never re-ask known context, confidence over automation.',
    date: '2026-08-01',
    memoryIds: ['tagro-invisible-intelligence'],
  },
  {
    version: '2.5',
    title: 'Tagro Superintelligence Constitution',
    summary:
      'Operating Intelligence System law: six independent layers, Superintelligence as coordinator, ownership gate, no Auto Mode, invisible intelligence.',
    date: '2026-08-01',
    memoryIds: ['tagro-superintelligence'],
  },
  {
    version: '2.4',
    title: 'Workspace Intelligence & Architecture Memory',
    summary:
      'Architecture-Modul als OS-Oberfläche. Memory speichert Gründe. Architect AI gateet Features vor dem Code.',
    date: '2026-08-01',
    memoryIds: ['architecture-memory', 'workspace-intelligence', 'architect-vs-tagro'],
  },
  {
    version: '2.3',
    title: 'Production Intelligence',
    summary:
      'Tagro Superintelligence pillar reserved: production graph, score model, modular activation. Not a chatbot, not token vanity, not Auto Mode.',
    date: '2026-08-01',
    memoryIds: ['ai-budget', 'production-intelligence'],
  },
  {
    version: '2.2',
    title: 'Universal Login',
    summary:
      'Eine Auth-Erfahrung. Kein paralleler Dev Login als Produkt. Workspace modular, Rollen als Linsen.',
    date: '2026-08-01',
    memoryIds: ['universal-login'],
  },
  {
    version: '2.1',
    title: 'Neue Workspace-Logik',
    summary:
      'One Platform. Workspace-primary. Architecture Confirmation locked. Client/Dev Apps deprecated.',
    date: '2026-07-01',
    memoryIds: ['one-platform', 'workspace-primary', 'workspace-context'],
  },
  {
    version: '2.0',
    title: 'Product Constitution',
    summary:
      'Festag als Operating System for Projects. Project SSOT. Statusbericht als primäre Entscheidungsfläche.',
    date: '2026-06-01',
    memoryIds: ['project-ssot', 'statusbericht-primary'],
  },
]

export const ARCHITECTURE_CURRENT_VERSION =
  ARCHITECTURE_HISTORY[0]?.version ?? '2.4'
