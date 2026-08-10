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
/**
 * Anchors follow the bend: a station that is a right-hand crest carries its
 * label on the right, a left-hand crest on the left. Labels then always sit on
 * the OUTSIDE of the curve, which is the only placement the spine cannot run
 * through — with no station marker to hide behind, a label centred on the point
 * gets a line straight across its text.
 */
export const FLOW_LAYOUT: Station[] = [
  { id: 'communication', x: 118, y: 46, anchor: 'left', tone: 'blue' },
  { id: 'decisions', x: 218, y: 132, anchor: 'right', tone: 'green' },
  { id: 'risks', x: 88, y: 218, anchor: 'left', tone: 'red' },
  { id: 'status', x: 200, y: 300, anchor: 'right', tone: 'blue' },
  { id: 'team', x: 94, y: 374, anchor: 'left', tone: 'ink' },
  { id: 'project', x: 170, y: 438, anchor: 'right', tone: 'ink' },
]

export const BY_ID = new Map(FLOW_LAYOUT.map((s) => [s.id, s]))

/**
 * The whole flow as ONE continuous stroke through every station.
 *
 * Built with a Catmull-Rom spline converted to cubic Béziers: each control
 * handle is derived from the neighbouring points, which makes the tangents
 * match across every join. Drawing the spine as independent segments only
 * guarantees the ends meet — the direction still jumps at each station, and
 * those kinks are what made the earlier curves look hand-drawn.
 *
 * There are no station markers, so the line has to carry the whole shape: it
 * passes through each point and the label sits beside it.
 */
export function flowSpinePath(): string {
  const p = FLOW_LAYOUT
  if (p.length < 2) return ''
  let d = `M ${p[0].x} ${p[0].y}`
  for (let i = 0; i < p.length - 1; i++) {
    const prev = p[i - 1] || p[i]
    const cur = p[i]
    const next = p[i + 1]
    const after = p[i + 2] || next
    /* Catmull-Rom → Bézier: handles are a sixth of the neighbour span. */
    const c1x = cur.x + (next.x - prev.x) / 6
    const c1y = cur.y + (next.y - prev.y) / 6
    const c2x = next.x - (after.x - cur.x) / 6
    const c2y = next.y - (after.y - cur.y) / 6
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${next.x} ${next.y}`
  }
  return d
}

export const TONE_HEX: Record<FlowTone, string> = {
  blue: '#3B82F6',
  red: '#E14B4B',
  green: '#25A55B',
  ink: '#343841',
}
