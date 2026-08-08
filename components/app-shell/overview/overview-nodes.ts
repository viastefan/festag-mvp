/**
 * Overview flow — the nodes Tagro reports on, and the shape of the path
 * between them. Positions are fractions of the stage so the flow scales.
 *
 * Layout mirrors the calm editorial tree:
 *   Kommunikation
 *     Risiken · Entscheidungen
 *           Projektstatus
 *     Team            Projekt
 */

export type FlowNodeId =
  | 'communication'
  | 'risks'
  | 'decisions'
  | 'status'
  | 'team'
  | 'project'

export type FlowTone = 'blue' | 'red' | 'green' | 'ink'

export type FlowNewsPulse = 'calm' | 'soft' | 'hot'

export type FlowNode = {
  id: FlowNodeId
  label: string
  meta: string
  /** Friendly news sentence — always visible on the node. */
  news: string
  /** @deprecated prefer `news` — kept for older call sites */
  line: string
  metaTone?: FlowTone
  pulse?: FlowNewsPulse
  x: number
  y: number
  tone: FlowTone
}

/** Curved connectors in a 100×100 viewBox — organic diamond → stem. */
export const FLOW_EDGES: string[] = [
  /* Kommunikation → Risiken / Entscheidungen */
  'M 50 12 C 50 20, 24 20, 24 29',
  'M 50 12 C 50 20, 76 20, 76 29',
  /* Risiken / Entscheidungen → Projektstatus */
  'M 24 34 C 24 46, 50 44, 50 52',
  'M 76 34 C 76 46, 50 44, 50 52',
  /* Projektstatus → Team / Projekt */
  'M 50 57 C 50 68, 26 66, 26 74',
  'M 50 57 C 50 74, 50 82, 50 91',
  /* Team → Projekt (soft close) */
  'M 26 78 C 26 88, 50 88, 50 91',
]

export const FLOW_LAYOUT: Array<Omit<FlowNode, 'label' | 'meta' | 'news' | 'line' | 'metaTone' | 'pulse'>> = [
  { id: 'communication', x: 50, y: 9, tone: 'blue' },
  { id: 'risks', x: 24, y: 31, tone: 'red' },
  { id: 'decisions', x: 76, y: 31, tone: 'green' },
  { id: 'status', x: 50, y: 54, tone: 'blue' },
  { id: 'team', x: 26, y: 76, tone: 'ink' },
  { id: 'project', x: 50, y: 93, tone: 'ink' },
]

export const TONE_HEX: Record<FlowTone, string> = {
  blue: '#3B6FD4',
  red: '#C43C3C',
  green: '#2E9B52',
  ink: '#3A3A42',
}
