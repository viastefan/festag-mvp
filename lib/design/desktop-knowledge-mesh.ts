/**
 * Desktop knowledge mesh — dense reference constellation field.
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

/** Dense dotted web — reference dashboard fidelity. */
export function generateDesktopKnowledgeMesh(
  dotCount = 64,
  seed = 0x0a7d45,
): { dots: MeshDot[]; edges: MeshEdge[] } {
  const rand = seeded(seed)
  const dots: MeshDot[] = []

  /* Regular lattice — primary grid like the mock */
  for (let row = 0; row < 16; row += 1) {
    for (let col = 0; col < 20; col += 1) {
      const jitter = rand()
      if (jitter > 0.68) continue
      dots.push({
        id: `g${row}-${col}`,
        x: 2 + col * 4.85 + (rand() - 0.5) * 1.6,
        y: 3 + row * 6.1 + (rand() - 0.5) * 2,
        scale: 0.36 + rand() * 0.26,
      })
    }
  }

  /* Organic scatter */
  for (let i = 0; i < dotCount; i += 1) {
    dots.push({
      id: `d${i}`,
      x: 2 + rand() * 96,
      y: 3 + rand() * 94,
      scale: 0.32 + rand() * 0.4,
    })
  }

  const edges: MeshEdge[] = []
  const maxDist = 9.5

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
