/**
 * Overview flow — the nodes Tagro reports on, and the shape of the path
 * between them. Positions are fractions of the stage so the flow scales.
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

/** Curved connectors, drawn in a 100×100 viewBox. */
export const FLOW_EDGES: string[] = [
  'M 50 12 C 50 22, 30 22, 30 32',
  'M 50 12 C 50 22, 70 22, 70 32',
  'M 30 34 C 30 48, 55 46, 55 58',
  'M 70 34 C 70 48, 55 46, 55 58',
  'M 55 60 C 55 72, 32 68, 32 78',
  'M 55 60 C 55 78, 55 82, 55 92',
  'M 32 80 C 32 90, 55 88, 55 92',
]

export const FLOW_LAYOUT: Array<Omit<FlowNode, 'label' | 'meta' | 'metaTone'>> = [
  { id: 'communication', x: 50, y: 12, tone: 'blue' },
  { id: 'risks', x: 30, y: 33, tone: 'red' },
  { id: 'decisions', x: 70, y: 33, tone: 'green' },
  { id: 'status', x: 55, y: 59, tone: 'blue' },
  { id: 'team', x: 32, y: 79, tone: 'ink' },
  { id: 'project', x: 55, y: 93, tone: 'ink' },
]

export const TONE_HEX: Record<FlowTone, string> = {
  blue: '#3B6FD4',
  red: '#C43C3C',
  green: '#2E9B52',
  ink: '#3A3A42',
}
