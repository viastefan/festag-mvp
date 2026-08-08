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

export type FlowNode = {
  id: FlowNodeId
  label: string
  meta: string
  metaTone?: FlowTone
  x: number
  y: number
  tone: FlowTone
}

/** Curved connectors in a 100×100 viewBox — organic diamond → stem. */
export const FLOW_EDGES: string[] = [
  /* Kommunikation → Risiken / Entscheidungen */
  'M 50 11 C 50 20, 26 20, 26 31',
  'M 50 11 C 50 20, 74 20, 74 31',
  /* Risiken / Entscheidungen → Projektstatus */
  'M 26 34 C 26 46, 50 44, 50 54',
  'M 74 34 C 74 46, 50 44, 50 54',
  /* Projektstatus → Team / Projekt */
  'M 50 57 C 50 68, 28 66, 28 76',
  'M 50 57 C 50 72, 50 80, 50 90',
  /* Team → Projekt (soft close) */
  'M 28 78 C 28 88, 50 86, 50 90',
]

export const FLOW_LAYOUT: Array<Omit<FlowNode, 'label' | 'meta' | 'metaTone'>> = [
  { id: 'communication', x: 50, y: 10, tone: 'blue' },
  { id: 'risks', x: 26, y: 32, tone: 'red' },
  { id: 'decisions', x: 74, y: 32, tone: 'green' },
  { id: 'status', x: 50, y: 55, tone: 'blue' },
  { id: 'team', x: 28, y: 77, tone: 'ink' },
  { id: 'project', x: 50, y: 91, tone: 'ink' },
]

export const TONE_HEX: Record<FlowTone, string> = {
  blue: '#3B6FD4',
  red: '#C43C3C',
  green: '#2E9B52',
  ink: '#3A3A42',
}
