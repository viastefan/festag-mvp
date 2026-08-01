/**
 * Festag sand / README (Lesen) canvas — warm paper ivory.
 * Slightly more yellow than Anthropic `#FAF9F5` so white CTAs lift calmly
 * without going orange or cream-heavy.
 */

export const FESTAG_SAND = {
  /** Main canvas — warm read paper (login, register, Lesen). */
  canvas: '#FBF7EE',
  /** Soft ivory lift (slightly brighter than body). */
  canvasSoft: '#FCFAF3',
  /** Deeper parchment wash. */
  canvasDeep: '#F1EBE0',
  /** Warm mid cream. */
  canvasWarm: '#F6F1E6',
  /** Idle CTA fill — soft white on sand. */
  cta: '#FFFFFF',
  ctaHover: '#F7F6F2',
  ctaActive: '#F0EEE6',
  ctaFg: '#1e1e20',
  ctaBorder: 'rgba(40, 34, 28, 0.10)',
  ctaBorderHover: 'rgba(40, 34, 28, 0.14)',
  ready: '#FFFFFF',
  readyHover: '#F7F6F2',
  readyActive: '#F0EEE6',
  primary: '#5C554C',
  primaryHover: '#6B6359',
  primaryActive: '#4A453E',
  primaryFg: '#FBF7EE',
  primarySoft: 'rgba(92, 85, 76, 0.08)',
  primarySoftHover: 'rgba(92, 85, 76, 0.12)',
  primaryBorder: 'rgba(92, 85, 76, 0.22)',
  muted: '#8a8378',
  ink: '#1e1e20',
} as const

/** Quiet sandy cream for read html body. */
export const FESTAG_SAND_BODY_WASH = `
  linear-gradient(180deg, ${FESTAG_SAND.canvasSoft} 0%, ${FESTAG_SAND.canvas} 100%)
`.replace(/\s+/g, ' ').trim()
