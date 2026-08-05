/**
 * Festag Canvas — Read Mode · Knowledge Grid · Path
 *
 * The living surface of the Software Production OS.
 * Not widgets. Not dashboards. Context only.
 *
 * @see docs/festag-design-constitution.md
 */

/** Read Mode paper — warm off-white. Never pure white canvas. */
export const FESTAG_READ_PAPER = '#F8F6F2'

/** Festag Primary Blue — attention only. Never decorative. */
export const FESTAG_PRIMARY = '#5B647D'

export const FESTAG_CANVAS = {
  paper: FESTAG_READ_PAPER,
  paperWash: 'radial-gradient(ellipse 80% 60% at 50% 18%, rgba(255,255,255,0.55) 0%, transparent 72%)',
  ink: '#1A1917',
  inkMuted: '#8A8680',
  inkFaint: 'rgba(26, 25, 23, 0.14)',
  primary: FESTAG_PRIMARY,
  primarySoft: 'rgba(91, 100, 125, 0.12)',
  primaryInk: 'rgba(91, 100, 125, 0.72)',
  sheet: '#FFFFFF',
  sheetBorder: 'rgba(26, 25, 23, 0.06)',
  sheetShadow: '0 18px 48px rgba(20, 20, 20, 0.06), 0 2px 8px rgba(20, 20, 20, 0.03)',
  pathStroke: FESTAG_PRIMARY,
  pathWidth: 1.5,
  gridDot: 'rgba(26, 25, 23, 0.16)',
  gridDotActive: FESTAG_PRIMARY,
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeSlow: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const

export const FESTAG_CANVAS_CSS_VARS = `
  --festag-read-paper: ${FESTAG_CANVAS.paper};
  --festag-canvas-ink: ${FESTAG_CANVAS.ink};
  --festag-canvas-muted: ${FESTAG_CANVAS.inkMuted};
  --festag-canvas-primary: ${FESTAG_CANVAS.primary};
  --festag-canvas-primary-soft: ${FESTAG_CANVAS.primarySoft};
  --festag-canvas-sheet: ${FESTAG_CANVAS.sheet};
  --festag-canvas-ease: ${FESTAG_CANVAS.ease};
  --festag-canvas-ease-slow: ${FESTAG_CANVAS.easeSlow};
`.trim()
