/**
 * Overview daily briefing — read receipt helpers.
 * Local first (instant UI), then best-effort backend ack for archive.
 */

const STORAGE_PREFIX = 'festag:overview-briefing-read:'

export function todayBriefingKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function loadBriefingReadAt(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    return v && v.length > 8 ? v : null
  } catch {
    return null
  }
}

export function formatBriefingReadDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

/** Persist locally, then ask the API to archive as read. */
export async function markBriefingRead(key: string): Promise<string> {
  const iso = new Date().toISOString()
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, iso)
    } catch { /* private mode */ }
  }

  try {
    await fetch('/api/overview/briefing/ack', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefingDate: key, readAt: iso }),
    })
  } catch {
    /* preview / offline — local receipt still stands */
  }

  return iso
}
