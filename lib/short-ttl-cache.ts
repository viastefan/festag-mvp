/**
 * Process-local TTL cache for auth/workspace hot reads.
 *
 * Safe for soft-negative caching (login-options, name already taken).
 * Positive name-availability entries must use a very short TTL — uniqueness
 * is enforced by DB unique indexes on write; cache is only a latency aid.
 *
 * Not shared across Vercel isolates. For multi-region ~100k, use Redis/Upstash.
 */

type Entry<T> = { value: T; expiresAt: number }

const store = new Map<string, Entry<unknown>>()
const MAX_KEYS = 8_000

function prune(now: number) {
  if (store.size < MAX_KEYS) return
  const entries = Array.from(store.entries())
  for (let i = 0; i < entries.length; i++) {
    const [k, e] = entries[i]
    if (e.expiresAt <= now) store.delete(k)
    if (store.size < MAX_KEYS * 0.75) break
  }
  // Hard cap: drop oldest insertion-order keys if still over.
  if (store.size >= MAX_KEYS) {
    const excess = store.size - Math.floor(MAX_KEYS * 0.7)
    const keys = Array.from(store.keys())
    for (let i = 0; i < excess && i < keys.length; i++) {
      store.delete(keys[i])
    }
  }
}

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key) as Entry<T> | undefined
  if (!e) return undefined
  if (e.expiresAt <= Date.now()) {
    store.delete(key)
    return undefined
  }
  return e.value
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  const now = Date.now()
  prune(now)
  store.set(key, { value, expiresAt: now + Math.max(1, ttlMs) })
}

export function cacheDelete(key: string): void {
  store.delete(key)
}

/** Drop all keys with a given prefix (e.g. after claiming a workspace name). */
export function cacheDeletePrefix(prefix: string): void {
  const keys = Array.from(store.keys())
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].startsWith(prefix)) store.delete(keys[i])
  }
}

/** Test helper. */
export function __resetShortTtlCacheForTests() {
  store.clear()
}
