/**
 * Festag sand / README (Lesen) canvas — matches warm auth cream from screenshot.
 * Claude / Anthropic sandy white family (not cool gray, not orange wash).
 */

export const FESTAG_SAND = {
  /** Main canvas — README + auth read (warm sandy cream). */
  canvas: '#F5F2ED',
  /** Soft ivory lift. */
  canvasSoft: '#FAF9F5',
  /** Deeper parchment for nested wash. */
  canvasDeep: '#F0EEE6',
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
  primaryFg: '#FAF9F5',
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
