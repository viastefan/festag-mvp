/**
 * Festag constellation — the living project graph.
 *
 * Each node is a small cluster of dots inside a dotted ring, with its label
 * set beside it. Drawn on canvas so the motion stays cheap.
 */

export type CanvasNode = {
  id: string
  /** Position as a fraction of the drawable area. */
  x: number
  y: number
  label: string
  sub?: string
  tone: 'ink' | 'amber' | 'red' | 'green'
  badge?: string
  interactive?: boolean
}

const TONES = {
  ink: { dot: '#3A3A42', ring: 'rgba(58,58,66,0.22)', badge: 'rgba(58,58,66,0.07)', text: '#5c5c62' },
  amber: { dot: '#C9932B', ring: 'rgba(201,147,43,0.30)', badge: 'rgba(201,147,43,0.10)', text: '#C9932B' },
  red: { dot: '#C43C3C', ring: 'rgba(196,60,60,0.28)', badge: 'rgba(196,60,60,0.09)', text: '#C43C3C' },
  green: { dot: '#2E9B52', ring: 'rgba(46,155,82,0.28)', badge: 'rgba(46,155,82,0.09)', text: '#2E9B52' },
} as const

const PAD = 72
const FONT = "'Aeonik', Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

/** Three-dot cluster — the Festag mark, scaled to the node. */
const CLUSTER = [
  { dx: -0.34, dy: -0.28, r: 0.3 },
  { dx: 0.34, dy: -0.28, r: 0.26 },
  { dx: 0, dy: 0.34, r: 0.34 },
]

function pos(n: CanvasNode, w: number, h: number) {
  return { x: PAD + n.x * (w - PAD * 2), y: PAD + n.y * (h - PAD * 2) }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function drawConstellation(
  canvas: HTMLCanvasElement,
  nodes: CanvasNode[],
  edges: Array<[string, string]>,
  hovered: string | null,
) {
  const parent = canvas.parentElement
  if (!parent) return
  const rect = parent.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const t = performance.now() * 0.001

  /* Edges — soft dotted curves, never straight lines. */
  ctx.setLineDash([1.5, 6])
  ctx.lineWidth = 1
  ctx.lineCap = 'round'
  for (const [fromId, toId] of edges) {
    const a = byId.get(fromId)
    const b = byId.get(toId)
    if (!a || !b) continue
    const p = pos(a, rect.width, rect.height)
    const q = pos(b, rect.width, rect.height)
    const active = hovered === fromId || hovered === toId
    ctx.strokeStyle = active ? 'rgba(30,30,32,0.20)' : 'rgba(30,30,32,0.13)'
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.bezierCurveTo(p.x, (p.y + q.y) / 2, q.x, (p.y + q.y) / 2, q.x, q.y)
    ctx.stroke()
  }
  ctx.setLineDash([])

  /* Nodes */
  for (const node of nodes) {
    const { x, y } = pos(node, rect.width, rect.height)
    const tone = TONES[node.tone]
    const hot = hovered === node.id
    const breathe = 1 + Math.sin(t * 1.2 + node.x * 6) * 0.02
    const ring = (hot ? 21 : 19) * breathe
    const unit = ring * 0.62

    ctx.setLineDash([1.5, 3.5])
    ctx.lineWidth = 1
    ctx.strokeStyle = tone.ring
    ctx.beginPath()
    ctx.arc(x, y, ring, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    for (const d of CLUSTER) {
      ctx.beginPath()
      ctx.arc(x + d.dx * unit, y + d.dy * unit, d.r * unit * (hot ? 1.08 : 1), 0, Math.PI * 2)
      ctx.fillStyle = tone.dot
      ctx.fill()
    }

    /* Label beside the cluster */
    const lx = x + ring + 16
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `400 16px ${FONT}`
    ctx.fillStyle = '#1E1E20'
    const hasSub = Boolean(node.sub)
    const labelY = hasSub || node.badge ? y - 4 : y + 5
    ctx.fillText(node.label, lx, labelY)
    const labelW = ctx.measureText(node.label).width

    if (node.sub) {
      ctx.font = `400 15px ${FONT}`
      ctx.fillStyle = '#8891a0'
      ctx.fillText(node.sub, lx, labelY + 21)
    }

    if (node.badge) {
      const by = labelY + (node.sub ? 34 : 10)
      ctx.font = `400 13px ${FONT}`
      const bw = ctx.measureText(node.badge).width + 18
      ctx.fillStyle = tone.badge
      roundRect(ctx, lx, by, bw, 22, 5)
      ctx.fill()
      ctx.fillStyle = tone.text
      ctx.fillText(node.badge, lx + 9, by + 15)
    }

    /* Keep the widest label in mind for hit testing generosity */
    void labelW
  }
}

/** Returns the id of the node under the pointer, or null. */
export function hitTestNode(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  nodes: CanvasNode[],
): string | null {
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  for (const node of nodes) {
    const p = pos(node, rect.width, rect.height)
    if (Math.hypot(x - p.x, y - p.y) < 30) return node.id
  }
  return null
}
