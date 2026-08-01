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
