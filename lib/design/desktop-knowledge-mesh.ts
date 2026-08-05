/**
 * Desktop knowledge mesh — dotted field + faint connections (reference dashboard).
 */

export type MeshDot = {
  id: string
  x: number
  y: number
  scale: number
}

export type MeshEdge = {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function dist(a: MeshDot, b: MeshDot): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/** Organic dot field across the full canvas (percent coords). */
export function generateDesktopKnowledgeMesh(
  dotCount = 118,
  seed = 0x0a7d45,
): { dots: MeshDot[]; edges: MeshEdge[] } {
  const rand = seeded(seed)
  const dots: MeshDot[] = []

  for (let i = 0; i < dotCount; i += 1) {
    dots.push({
      id: `d${i}`,
      x: 4 + rand() * 92,
      y: 8 + rand() * 84,
      scale: 0.65 + rand() * 0.7,
    })
  }

  /* Anchor lattice — subtle grid anchors like the mock */
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 11; col += 1) {
      if (rand() > 0.42) continue
      dots.push({
        id: `g${row}-${col}`,
        x: 8 + col * 8.2 + (rand() - 0.5) * 3,
        y: 10 + row * 11 + (rand() - 0.5) * 4,
        scale: 0.55 + rand() * 0.35,
      })
    }
  }

  const edges: MeshEdge[] = []
  const maxDist = 16

  for (let i = 0; i < dots.length; i += 1) {
    const neighbors: Array<{ j: number; d: number }> = []
    for (let j = i + 1; j < dots.length; j += 1) {
      const d = dist(dots[i], dots[j])
      if (d <= maxDist) neighbors.push({ j, d })
    }
    neighbors.sort((a, b) => a.d - b.d)
    for (const n of neighbors.slice(0, 3)) {
      const id = `e:${dots[i].id}:${dots[n.j].id}`
      if (edges.some((e) => e.id === id)) continue
      edges.push({
        id,
        x1: dots[i].x,
        y1: dots[i].y,
        x2: dots[n.j].x,
        y2: dots[n.j].y,
      })
    }
  }

  return { dots, edges }
}
