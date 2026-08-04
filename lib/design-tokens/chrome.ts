/**
 * Festag chrome geometry — controls (buttons / inputs) stay sharper than cards.
 * Linear-adjacent: tight radius, hairline strokes, glassy text from below.
 */

export const FESTAG_CHROME = {
  /** Buttons, inputs, search fields */
  radiusControl: '4px',
  /** Nested chips / small controls */
  radiusControlSm: '4px',
  /** Cards, sheets, popovers */
  radiusCard: '8px',
  /** Large panels */
  radiusPanel: '10px',
  /** Idle / focus strokes on controls — always hairline */
  strokeControl: '1px',
} as const

/** CSS custom properties for `.al-root` / `:root` / shell scopes. */
export const FESTAG_CHROME_CSS_VARS = `
  --festag-auth-radius: ${FESTAG_CHROME.radiusControl};
  --festag-auth-radius-sm: ${FESTAG_CHROME.radiusControlSm};
  --festag-auth-radius-lg: ${FESTAG_CHROME.radiusCard};
  --festag-control-radius: ${FESTAG_CHROME.radiusControl};
  --festag-control-radius-sm: ${FESTAG_CHROME.radiusControlSm};
  --festag-control-radius-lg: ${FESTAG_CHROME.radiusCard};
  --festag-input-radius: ${FESTAG_CHROME.radiusControl};
  --festag-stroke-control: ${FESTAG_CHROME.strokeControl};
`.replace(/\s+/g, ' ').trim()
