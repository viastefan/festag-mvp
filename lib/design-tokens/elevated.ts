/**
 * Festag Elevated Surfaces — calm, high-end floating plates.
 *
 * Not a technical chrome kit. One quiet language for workspace depth:
 * soft canvas → floating plate → nested glass/content.
 * Source for portal main, settings cards, and shared elevated shells.
 */

export const FESTAG_ELEVATED = {
  /** Floating content plate corner radius (light). Dark overrides to 20px. */
  plateRadius: '12px',
  /** Desktop inset — full-bleed portal main (no top/right/bottom gap). */
  plateInset: '0px',

  /** Soft Login ivory canvas — same paper as auth light. */
  canvasDesktop: '#FBF7EE',
  canvasMobile: '#FBF7EE',

  /** Nested elevated cards — soft porcelain white on ivory. */
  plateBg: '#FFFFFF',
  /** Whisper edge — felt more than seen. */
  plateBorder: 'rgba(40, 34, 28, 0.08)',
  /**
   * Elevation: soft inner light + contact + ambient.
   * Reads as presence, not a drop-shadow gadget.
   */
  plateShadow: [
    '0 1px 0 rgba(255, 255, 255, 0.88) inset',
    '0 0 0 0.5px rgba(15, 23, 42, 0.035)',
    '0 2px 6px rgba(15, 23, 42, 0.028)',
    '0 14px 40px rgba(15, 23, 42, 0.055)',
  ].join(', '),
  plateShadowSoft: [
    '0 1px 0 rgba(255, 255, 255, 0.7) inset',
    '0 0 0 0.5px rgba(15, 23, 42, 0.03)',
    '0 8px 24px rgba(15, 23, 42, 0.04)',
  ].join(', '),

  /** Nested tile radius inside the plate. */
  nestRadius: '10px',
} as const

/** Dark plate — deep OLED content, almost dissolves into the canvas. */
export const FESTAG_ELEVATED_DARK = {
  plateBg: '#0E0E10',
  plateBorder: 'rgba(255, 255, 255, 0.04)',
  plateShadow: [
    '0 1px 0 rgba(255, 255, 255, 0.03) inset',
    '0 0 0 0.5px rgba(255, 255, 255, 0.03)',
    '0 12px 40px rgba(0, 0, 0, 0.46)',
    '0 0 40px rgba(91, 100, 125, 0.05)',
  ].join(', '),
  plateShadowSoft: [
    '0 1px 0 rgba(255, 255, 255, 0.02) inset',
    '0 8px 28px rgba(0, 0, 0, 0.40)',
  ].join(', '),
} as const

/** CSS custom-property block for `:root` / light themes. */
export const FESTAG_ELEVATED_CSS_VARS = `
  --festag-plate-radius: ${FESTAG_ELEVATED.plateRadius};
  --festag-plate-inset: ${FESTAG_ELEVATED.plateInset};
  --festag-plate-nest-radius: ${FESTAG_ELEVATED.nestRadius};
  --festag-plate-bg: ${FESTAG_ELEVATED.plateBg};
  --festag-plate-border: ${FESTAG_ELEVATED.plateBorder};
  --festag-plate-shadow: ${FESTAG_ELEVATED.plateShadow};
  --festag-plate-shadow-soft: ${FESTAG_ELEVATED.plateShadowSoft};
`

export const FESTAG_ELEVATED_DARK_CSS_VARS = `
  --festag-plate-bg: ${FESTAG_ELEVATED_DARK.plateBg};
  --festag-plate-border: ${FESTAG_ELEVATED_DARK.plateBorder};
  --festag-plate-shadow: ${FESTAG_ELEVATED_DARK.plateShadow};
  --festag-plate-shadow-soft: ${FESTAG_ELEVATED_DARK.plateShadowSoft};
  --festag-plate-radius: 20px;
  --festag-plate-nest-radius: 14px;
`
