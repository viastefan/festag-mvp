/**
 * Deterministische Avatar-Farbe + Initialen.
 * Hash → Index in der Palette. Gleicher User = gleiche Farbe.
 * User kann diese später überschreiben (profiles.avatar_color).
 */

// Sanfte, marktreife Palette — Linear/Notion-Niveau.
// Keine Neon-Töne, keine Kindergarten-Bonbons.
export const AVATAR_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#64748B', // Slate
] as const

export type AvatarColor = typeof AVATAR_COLORS[number]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function autoAvatarColor(seed: string | null | undefined): string {
  if (!seed) return AVATAR_COLORS[12]
  return AVATAR_COLORS[hashStr(seed) % AVATAR_COLORS.length]
}

export function avatarInitials(firstName?: string | null, fullName?: string | null, email?: string | null): string {
  const fn = (firstName ?? '').trim()
  const full = (fullName ?? '').trim()
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  }
  if (fn) return fn.slice(0, 2).toUpperCase()
  const e = (email ?? '').trim()
  if (e) {
    const local = e.split('@')[0] || ''
    return local.slice(0, 2).toUpperCase()
  }
  return 'US'
}

/** Hellgrad-Wahl: Text auf farbigem Avatar — weiß für dunkle, dunkel für helle Töne. */
export function avatarTextColor(bg: string): '#fff' | '#0a0a0a' {
  // Quick luminance check via hex
  const m = bg.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.62 ? '#0a0a0a' : '#fff'
}
