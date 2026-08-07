/**
 * Tagro Intelligence — Project DNA and decision patterns.
 *
 * Every finished project leaves a profile behind. New projects are matched
 * against the profiles that already succeeded, so Tagro reuses what worked
 * instead of re-deriving it from scratch.
 */

import type { DecisionPattern, ProjectDNA, ProjectRecord } from './types'

/** Field importance when comparing two projects. */
const DNA_WEIGHTS: Record<keyof ProjectDNA, number> = {
  industry: 2,
  projectType: 2.5,
  stack: 2,
  designStyle: 1,
  brandDirection: 0.75,
  architecture: 1.5,
  hosting: 1,
  framework: 1.5,
}

const norm = (v?: string) => (v || '').trim().toLowerCase()

/** Jaccard overlap of two tag lists. */
function listOverlap(a?: string[], b?: string[]): number | null {
  if (!a?.length || !b?.length) return null
  const setA = new Set(a.map(norm))
  const setB = new Set(b.map(norm))
  let shared = 0
  for (const v of setA) if (setB.has(v)) shared += 1
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? null : shared / union
}

/**
 * Similarity between two DNA profiles, 0–1.
 * Fields missing on either side are skipped rather than counted as mismatch.
 */
export function dnaSimilarity(a: ProjectDNA, b: ProjectDNA): number {
  let weighted = 0
  let weightSum = 0

  for (const key of Object.keys(DNA_WEIGHTS) as Array<keyof ProjectDNA>) {
    const w = DNA_WEIGHTS[key]
    let match: number | null = null

    if (key === 'stack') {
      match = listOverlap(a.stack, b.stack)
    } else {
      const av = norm(a[key] as string | undefined)
      const bv = norm(b[key] as string | undefined)
      if (av && bv) match = av === bv ? 1 : 0
    }

    if (match === null) continue
    weighted += match * w
    weightSum += w
  }

  return weightSum === 0 ? 0 : weighted / weightSum
}

/**
 * Find comparable past projects, best match first.
 * Only projects that actually went well are worth imitating, so weak
 * outcomes are filtered out by default.
 */
export function findComparableProjects(
  target: ProjectDNA,
  history: ProjectRecord[],
  opts: { minSimilarity?: number; minWisdom?: number; limit?: number } = {},
): Array<ProjectRecord & { similarity: number }> {
  const minSimilarity = opts.minSimilarity ?? 0.4
  const minWisdom = opts.minWisdom ?? 70
  const limit = opts.limit ?? 5

  return history
    .map((p) => ({ ...p, similarity: dnaSimilarity(target, p.dna) }))
    .filter((p) => p.similarity >= minSimilarity && p.wisdomScore >= minWisdom)
    .sort((a, b) =>
      b.similarity - a.similarity || b.wisdomScore - a.wisdomScore,
    )
    .slice(0, limit)
}

/** Stable key for a combination of decision values. */
export function patternKey(values: string[]): string[] {
  return [...new Set(values.map(norm).filter(Boolean))].sort()
}

/**
 * Fold a new observation into the pattern library. Patterns are stored as
 * running averages so repeated evidence outweighs a single lucky project.
 */
export function learnPattern(
  library: DecisionPattern[],
  values: string[],
  outcomeScore: number,
): DecisionPattern[] {
  const key = patternKey(values)
  if (key.length === 0) return library

  const id = key.join('|')
  const next = library.map((p) => ({ ...p }))
  const existing = next.find((p) => p.key.join('|') === id)

  if (!existing) {
    next.push({ key, outcomeScore: Math.round(outcomeScore), sampleSize: 1 })
    return next
  }

  const n = existing.sampleSize + 1
  existing.outcomeScore = Math.round(
    (existing.outcomeScore * existing.sampleSize + outcomeScore) / n,
  )
  existing.sampleSize = n
  return next
}

/**
 * Look up what past projects say about a proposed combination.
 * Returns the strongest matching pattern, if the library has seen it.
 */
export function matchPattern(
  library: DecisionPattern[],
  values: string[],
): DecisionPattern | null {
  const key = new Set(patternKey(values))
  if (key.size === 0) return null

  const candidates = library
    .filter((p) => p.key.every((k) => key.has(k)))
    .sort((a, b) => b.key.length - a.key.length || b.sampleSize - a.sampleSize)

  return candidates[0] ?? null
}
