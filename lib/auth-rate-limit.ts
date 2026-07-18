/**
 * In-process auth rate limiter + lockout helpers.
 *
 * Suitable for single-instance / warm serverless isolates. For true multi-region
 * ~100k traffic, back this with Redis / Upstash / edge WAF (documented in callers).
 */

type Bucket = {
  hits: number
  windowStart: number
  fails: number
  lockedUntil: number
}

const buckets = new Map<string, Bucket>()
const MAX_KEYS = 50_000

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return
  const keys = Array.from(buckets.keys())
  for (const k of keys) {
    const b = buckets.get(k)
    if (!b) continue
    if (now - b.windowStart > 60 * 60 * 1000 && now > b.lockedUntil) buckets.delete(k)
    if (buckets.size < MAX_KEYS * 0.8) break
  }
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number; reason: 'rate_limited' | 'locked' }

export type RateLimitOpts = {
  /** Max successful checks (attempts) per window. */
  max: number
  /** Sliding/fixed window length. */
  windowMs: number
  /** Consecutive failures before lockout (optional). */
  maxFails?: number
  /** Lockout duration after maxFails. */
  lockMs?: number
}

export function checkAuthRateLimit(key: string, opts: RateLimitOpts): RateLimitResult {
  const now = Date.now()
  prune(now)
  let b = buckets.get(key)
  if (!b) {
    b = { hits: 0, windowStart: now, fails: 0, lockedUntil: 0 }
    buckets.set(key, b)
  }

  if (b.lockedUntil > now) {
    return { ok: false, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000), reason: 'locked' }
  }

  if (now - b.windowStart > opts.windowMs) {
    b.hits = 0
    b.windowStart = now
  }

  if (b.hits >= opts.max) {
    const retryAfterSec = Math.ceil((opts.windowMs - (now - b.windowStart)) / 1000)
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec), reason: 'rate_limited' }
  }

  b.hits += 1
  return { ok: true, remaining: Math.max(0, opts.max - b.hits) }
}

/** Record a failed auth attempt; may engage lockout. */
export function recordAuthFailure(key: string, opts: Pick<RateLimitOpts, 'maxFails' | 'lockMs'> = {}): void {
  const maxFails = opts.maxFails ?? 8
  const lockMs = opts.lockMs ?? 15 * 60 * 1000
  const now = Date.now()
  let b = buckets.get(key)
  if (!b) {
    b = { hits: 0, windowStart: now, fails: 0, lockedUntil: 0 }
    buckets.set(key, b)
  }
  b.fails += 1
  if (b.fails >= maxFails) {
    b.lockedUntil = now + lockMs
    b.fails = 0
  }
}

export function clearAuthFailures(key: string): void {
  const b = buckets.get(key)
  if (!b) return
  b.fails = 0
  b.lockedUntil = 0
}

/** Test helper — not used in production routes. */
export function __resetAuthRateLimitForTests() {
  buckets.clear()
}
