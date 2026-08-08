/**
 * Overview flow — a transit map of the project.
 *
 * Stations sit on a 88px lattice so every route is a pure 45° diagonal or a
 * straight vertical. That is what keeps the map from looking hand-drawn: the
 * angles are quantised, the way a metro map quantises them, so no connector can
 * ever read as crooked. Coordinates are in viewBox units, and the stage locks
 * itself to FLOW_VIEWBOX's aspect ratio, so the SVG and the HTML station labels
 * share one coordinate space and cannot drift apart.
 *
 *            Kommunikation
 *            /           \
 *      Risiken         Entscheidungen
 *            \           /
 *            Projektstatus
 *            /           |
 *        Team            |
 *            \           |
 *              Projekt
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

/** Where a station's label sits relative to its dot, so it never covers a route. */
export type FlowAnchor = 'top' | 'bottom' | 'left' | 'right'

export type FlowNode = {
  id: FlowNodeId
  label: string
  meta: string
  /** Friendly news sentence — shown when the station is in focus. */
  news: string
  /** @deprecated prefer `news` — kept for older call sites */
  line: string
  metaTone?: FlowTone
  pulse?: FlowNewsPulse
  x: number
  y: number
  anchor: FlowAnchor
  tone: FlowTone
}

/** Map canvas in abstract units — the stage matches this ratio exactly.
 *  Stations stay in the left half; the right half is label room. */
export const FLOW_VIEWBOX = { w: 360, h: 470 } as const

/** @deprecated the layout is hand-placed now — nothing snaps to a lattice. */
export const FLOW_GRID = 88

type Station = Omit<FlowNode, 'label' | 'meta' | 'news' | 'line' | 'metaTone' | 'pulse'>

/**
 * One main flow, read top to bottom. Hand-placed and deliberately off-grid:
 * the x offsets never repeat and no two drops match, so the spine bends like a
 * river instead of stepping like a diagram. Labels always sit to the right, so
 * every station keeps the same reading rhythm.
 */
export const FLOW_LAYOUT: Station[] = [
  { id: 'communication', x: 126, y: 42, anchor: 'right', tone: 'blue' },
  { id: 'decisions', x: 208, y: 128, anchor: 'right', tone: 'green' },
  { id: 'risks', x: 94, y: 214, anchor: 'right', tone: 'red' },
  { id: 'status', x: 186, y: 296, anchor: 'right', tone: 'blue' },
  { id: 'team', x: 108, y: 378, anchor: 'right', tone: 'ink' },
  { id: 'project', x: 166, y: 446, anchor: 'right', tone: 'ink' },
]

/** One continuous spine — consecutive stations, so no route can ever cross. */
export const FLOW_ROUTES: Array<[FlowNodeId, FlowNodeId]> = FLOW_LAYOUT
  .slice(0, -1)
  .map((s, i) => [s.id, FLOW_LAYOUT[i + 1].id])

const BY_ID = new Map(FLOW_LAYOUT.map((s) => [s.id, s]))

/**
 * Smooth flow connector between two stations.
 *
 * The handles follow the dominant axis: a route that mostly falls leaves and
 * enters vertically, a route that mostly runs across leaves and enters
 * horizontally. Both handles are always mirrored, so the curve is symmetric
 * about its midpoint and meets each station head-on.
 *
 * This is what the old freehand curves got wrong — their handles pointed in
 * arbitrary directions, so lines hit the stations at inconsistent angles and
 * read as crooked. Deriving the handles from the actual delta means an
 * irregular, hand-placed layout still produces clean curves.
 */
export function flowRoutePath(from: FlowNodeId, to: FlowNodeId): string {
  const a = BY_ID.get(from)
  const b = BY_ID.get(to)
  if (!a || !b) return ''
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (Math.abs(dx) > Math.abs(dy)) {
    const k = dx * 0.5
    return `M ${a.x} ${a.y} C ${a.x + k} ${a.y}, ${b.x - k} ${b.y}, ${b.x} ${b.y}`
  }
  const k = dy * 0.5
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + k}, ${b.x} ${b.y - k}, ${b.x} ${b.y}`
}

export const TONE_HEX: Record<FlowTone, string> = {
  blue: '#3B6FD4',
  red: '#C43C3C',
  green: '#2E9B52',
  ink: '#3A3A42',
}
