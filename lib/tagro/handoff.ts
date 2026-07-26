import type { TagroOpenDetail } from '@/components/TagroOverlay'

const HANDOFF_KEY = 'festag_tagro_handoff'

/** Persist a Tagro open payload across navigation (e.g. public legal → /tagro). */
export function stashTagroHandoff(detail: TagroOpenDetail) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(detail))
  } catch {
    /* ignore quota / private mode */
  }
}

/** Consume a one-shot Tagro handoff, or null if none. */
export function consumeTagroHandoff(): TagroOpenDetail | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY)
    if (!raw) return null
    sessionStorage.removeItem(HANDOFF_KEY)
    const parsed = JSON.parse(raw) as TagroOpenDetail
    if (!parsed || typeof parsed !== 'object' || !parsed.contextType) return null
    return parsed
  } catch {
    return null
  }
}
