import { createHash } from 'crypto'

/**
 * Deterministic UUID for composite inbox source keys.
 * `create_inbox_item` expects uuid — use this when the natural key is composite.
 */
export function inboxSourceId(...parts: string[]): string {
  const hash = createHash('sha256').update(parts.join(':')).digest('hex')
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-')
}
