/**
 * Festag sand / read light surface — shared by auth light + panel `read` theme.
 * Warm paper canvas; CTAs lift as soft cream (never stark white on sand).
 * Accent = warm stone (not cold slate blue) — sand + cream is the dual identity.
 */

export const FESTAG_SAND = {
  /** Main canvas — auth light + read. */
  canvas: '#F4F0E8',
  /** Softer high stop for read gradients. */
  canvasSoft: '#F7F4EC',
  /** Idle CTA fill — warm cream, cut for sand. */
  cta: '#FBF8F2',
  ctaHover: '#F3EEE4',
  ctaActive: '#EBE4D8',
  ctaFg: '#1e1e20',
  ctaBorder: 'rgba(40, 34, 28, 0.10)',
  ctaBorderHover: 'rgba(40, 34, 28, 0.14)',
  /** Ready / Weiter — slightly brighter paper lift. */
  ready: '#FFFDF8',
  readyHover: '#F7F2E8',
  readyActive: '#EFE8DC',
  /** Warm stone — Google / focus / light primary (fits sand, not SaaS blue). */
  primary: '#5C554C',
  primaryHover: '#6B6359',
  primaryActive: '#4A453E',
  primaryFg: '#F7F4EC',
  /** Quiet warm wash — hovers / soft accents on sand. */
  primarySoft: 'rgba(92, 85, 76, 0.08)',
  primarySoftHover: 'rgba(92, 85, 76, 0.12)',
  primaryBorder: 'rgba(92, 85, 76, 0.22)',
  muted: '#8a8378',
  ink: '#1e1e20',
} as const

/** Quiet sand wash for read / light html body (CSS background value). */
export const FESTAG_SAND_BODY_WASH = `
  radial-gradient(ellipse 90% 55% at 18% -8%, rgba(236, 176, 128, 0.10), transparent 58%),
  radial-gradient(ellipse 55% 40% at 78% 8%, rgba(92, 85, 76, 0.05), transparent 55%),
  radial-gradient(ellipse 70% 50% at 92% 108%, rgba(220, 154, 108, 0.06), transparent 55%),
  linear-gradient(180deg, ${FESTAG_SAND.canvasSoft} 0%, ${FESTAG_SAND.canvas} 52%, #F1EBDF 100%)
`.replace(/\s+/g, ' ').trim()
