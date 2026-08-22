/**
 * Festag ground tokens.
 *
 * Was warm paper ivory until the 2026-08-22 constitution replaced the visual
 * law with a neutral ground — see docs/festag-design-constitution.md. The
 * export keeps its name because it is the single source every surface reads
 * (app shell, page styles, overview flow, auth, theme); changing the values
 * here moves the whole product at once, which is the point.
 *
 * `muted` moved from #8a8378 to #5B5B66 for a reason beyond taste: the old
 * pair sat near 2.4:1 on its own background. 4.5:1 is the floor now.
 */

export const FESTAG_SAND = {
  /** Main canvas — neutral ground (app chrome). */
  canvas: '#F7F7F8',
  /**
   * Read Mode keeps its warm paper. The constitution governs app chrome; a
   * reading surface is a different job, and long-form text on warm paper is
   * easier on the eye than on cool grey. This was lost by accident when the
   * ground went neutral — AUTH_READ_CANVAS was reading `canvas`, so Read Mode
   * changed along with everything else without anyone deciding it should.
   */
  readCanvas: '#FBF7EE',
  readCanvasSoft: '#FCFAF3',
  /** Card / lifted surface. */
  canvasSoft: '#FFFFFF',
  /** Sunken — tracks, wells. */
  canvasDeep: '#E9E9EC',
  /** Raised — hover, secondary fills. */
  canvasWarm: '#F1F1F3',
  /** Idle CTA fill. */
  cta: '#FFFFFF',
  ctaHover: '#F7F7F8',
  ctaActive: '#F1F1F3',
  ctaFg: '#0F0F14',
  ctaBorder: 'rgba(15, 15, 20, 0.07)',
  ctaBorderHover: 'rgba(15, 15, 20, 0.12)',
  ready: '#FFFFFF',
  readyHover: '#F7F7F8',
  readyActive: '#F1F1F3',
  /* One filled primary action per surface, and it is ink — not a brand wash. */
  primary: '#0F0F14',
  primaryHover: '#26262E',
  primaryActive: '#000004',
  primaryFg: '#FFFFFF',
  primarySoft: 'rgba(46, 107, 255, 0.10)',
  primarySoftHover: 'rgba(46, 107, 255, 0.16)',
  primaryBorder: 'rgba(46, 107, 255, 0.28)',
  muted: '#5B5B66',
  ink: '#0F0F14',
} as const

/** Quiet sandy cream for read html body. */
export const FESTAG_SAND_BODY_WASH = `
  linear-gradient(180deg, ${FESTAG_SAND.canvasSoft} 0%, ${FESTAG_SAND.canvas} 100%)
`.replace(/\s+/g, ' ').trim()
