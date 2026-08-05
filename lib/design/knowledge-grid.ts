/**
 * Knowledge Grid — silent project knowledge as subtle dots.
 * Not connected. No labels. Calm like stars.
 */

export type KnowledgeDot = {
  x: number
  y: number
  /** 0–1 subtle size variance */
  scale: number
}

/** Deterministic pseudo-random for stable layouts. */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/** Generate organic dot field for the upper canvas (percent coords). */
export function generateKnowledgeGrid(count = 52, seed = 0xf057a9): KnowledgeDot[] {
  const rand = seeded(seed)
  const dots: KnowledgeDot[] = []
  for (let i = 0; i < count; i += 1) {
    /* Upper ~62% of canvas — knowledge sleeps above the story */
    const x = 6 + rand() * 88
    const y = 4 + rand() * 58
    const scale = 0.72 + rand() * 0.55
    dots.push({ x, y, scale })
  }
  return dots
}

/** Anchor dot for the active decision — near upper center-left like the mock. */
export const KNOWLEDGE_ANCHOR: KnowledgeDot = { x: 50, y: 24, scale: 1.15 }
