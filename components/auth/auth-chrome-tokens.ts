/**
 * Canonical Festag auth chrome tokens — login, register, onboarding, Dev login.
 * Light = white CTAs + transparent inputs with quiet 1px hairline idle
 * (2px slate accent on focus and while the field has a value).
 * Dark = Forest Intelligence (`lib/design-tokens/dark.ts`) + quiet secondary CTAs
 * + dark-green fields, subtle blue focus glow. Ready primary = deep Festag blue.
 * Elevation ladder inherits from html[data-theme] — auth only overrides CTAs/inputs.
 */

import { FESTAG_NIGHT } from '@/lib/design-tokens/dark'

/** CSS custom properties for light auth surfaces (.al-root / .dl-root default). */
export const AUTH_CHROME_VARS_LIGHT = `
  --festag-auth-radius:12px;
  --festag-auth-radius-sm:10px;
  --festag-auth-radius-lg:14px;
  --festag-control-radius:var(--festag-auth-radius);
  --festag-control-radius-sm:var(--festag-auth-radius-sm);
  --festag-control-radius-lg:var(--festag-auth-radius-lg);
  --festag-btn-dark-bg:#ffffff;
  /* Hover — barely-there wash; press — no shadow. */
  --festag-btn-dark-bg-hover:#fafafa;
  --festag-btn-dark-bg-active:#f5f5f6;
  --festag-btn-dark-fg:#1e1e20;
  --festag-btn-dark-fg-hover:#1e1e20;
  --festag-btn-dark-fg-active:#1e1e20;
  --festag-btn-dark-border:rgba(30, 30, 32, 0.08);
  --festag-btn-dark-border-hover:rgba(30, 30, 32, 0.08);
  --festag-btn-dark-border-active:rgba(30, 30, 32, 0.08);
  --festag-btn-dark-shadow:0 1px 2px rgba(0, 0, 0, 0.04);
  --festag-btn-dark-shadow-hover:0 1px 2px rgba(0, 0, 0, 0.04);
  --festag-btn-dark-shadow-active:none;
  /* Transparent field — stroke defines the edge; no gray fill step. */
  --festag-input-fill:transparent;
  --festag-input-fill-focus:transparent;
  /* Placeholder — readable like Apple/Linear secondary, not near-invisible. */
  --festag-input-placeholder:#8e95a3;
  /* Quiet 1px hairline idle; focus / filled = 2px Festag slate accent. */
  --festag-input-border:rgba(30,30,32,0.15);
  --festag-input-border-hover:rgba(30,30,32,0.20);
  --festag-input-border-width:1px;
  --festag-input-border-focus:#5B647D;
  --festag-input-border-width-focus:2px;
`

/**
 * Dark auth — Forest Intelligence.
 * Idle CTAs stay quiet transparent; ready primary = deep blue gradient.
 * Inputs: dark-green fills + soft border; focus = subtle blue glow.
 */
export const AUTH_CHROME_VARS_DARK = `
  --festag-auth-radius:14px;
  --festag-auth-radius-sm:12px;
  --festag-auth-radius-lg:16px;
  --festag-control-radius:var(--festag-auth-radius);
  --festag-control-radius-sm:var(--festag-auth-radius-sm);
  --festag-control-radius-lg:var(--festag-auth-radius-lg);
  --festag-black-canvas:${FESTAG_NIGHT.canvas};
  --festag-black-content:${FESTAG_NIGHT.content};
  --festag-black-raised:${FESTAG_NIGHT.raised};
  --festag-black-popup:${FESTAG_NIGHT.popup};
  --modal-backdrop:${FESTAG_NIGHT.backdrop};
  --fp-bg:var(--festag-black-popup, ${FESTAG_NIGHT.popup});
  --festag-btn-dark-bg:${FESTAG_NIGHT.btnQuietBg};
  --festag-btn-dark-bg-hover:${FESTAG_NIGHT.btnQuietBgHover};
  --festag-btn-dark-bg-active:${FESTAG_NIGHT.btnQuietBgActive};
  --festag-btn-dark-fg:${FESTAG_NIGHT.btnQuietFg};
  --festag-btn-dark-fg-hover:${FESTAG_NIGHT.ink};
  --festag-btn-dark-fg-active:${FESTAG_NIGHT.ink};
  --festag-btn-dark-border:${FESTAG_NIGHT.btnQuietBorder};
  --festag-btn-dark-border-hover:rgba(255,255,255,0.10);
  --festag-btn-dark-border-active:rgba(255,255,255,0.08);
  --festag-btn-dark-shadow:none;
  --festag-btn-dark-shadow-hover:none;
  --festag-btn-dark-shadow-active:none;
  --festag-btn-dark-ready-bg:${FESTAG_NIGHT.btnBg};
  --festag-btn-dark-ready-bg-hover:${FESTAG_NIGHT.btnBgHover};
  --festag-btn-dark-ready-bg-active:${FESTAG_NIGHT.btnBgActive};
  /* Ready primary — deep Festag blue. */
  --festag-btn-ready-bg:${FESTAG_NIGHT.btnBg};
  --festag-btn-ready-bg-hover:${FESTAG_NIGHT.btnBgHover};
  --festag-btn-ready-bg-active:${FESTAG_NIGHT.btnBgActive};
  --festag-btn-ready-fg:${FESTAG_NIGHT.btnFg};
  --festag-btn-ready-shadow:${FESTAG_NIGHT.btnShadow};
  --festag-btn-ready-shadow-hover:${FESTAG_NIGHT.btnShadowHover};
  --festag-btn-gradient:${FESTAG_NIGHT.btnGradient};
  --festag-btn-gradient-hover:${FESTAG_NIGHT.btnGradientHover};
  --festag-input-fill:${FESTAG_NIGHT.input};
  --festag-input-fill-focus:${FESTAG_NIGHT.inputFocus};
  --festag-input-fg:${FESTAG_NIGHT.ink};
  --festag-input-caret:${FESTAG_NIGHT.inkSecondary};
  --festag-input-placeholder:${FESTAG_NIGHT.inkFaint};
  --festag-input-border:rgba(255,255,255,0.06);
  --festag-input-border-hover:rgba(255,255,255,0.08);
  --festag-input-border-width:1px;
  --festag-input-border-focus:${FESTAG_NIGHT.primary};
  --festag-input-border-width-focus:1px;
  --festag-input-focus-glow:0 0 0 3px ${FESTAG_NIGHT.primaryGlow};
`

/** Solid hex mirrors for autofill inset paint (Chrome ignores translucent fills). */
export const AUTH_INPUT_FILL_LIGHT = 'transparent'
export const AUTH_INPUT_FILL_LIGHT_FOCUS = 'transparent'
/** Opaque canvas match for Chrome autofill inset (must not be transparent). */
export const AUTH_INPUT_AUTOFILL_LIGHT = '#f7f8f8'
export const AUTH_INPUT_FILL_DARK = FESTAG_NIGHT.input
export const AUTH_INPUT_FILL_DARK_FOCUS = FESTAG_NIGHT.inputFocus
/** Soft forest typed text on dark fields. */
export const AUTH_INPUT_FG_DARK = FESTAG_NIGHT.ink
export const AUTH_INPUT_CARET_DARK = FESTAG_NIGHT.inkSecondary
export const AUTH_INPUT_PLACEHOLDER_DARK = FESTAG_NIGHT.inkFaint
/** Light placeholder — secondary gray, clearly visible on cool field fills. */
export const AUTH_INPUT_PLACEHOLDER_LIGHT = '#8e95a3'

/**
 * Canonical muted copy — light cool slate; dark matches Forest Intelligence secondary.
 */
export const AUTH_MUTED_LIGHT = '#8891a0'
export const AUTH_MUTED_DARK = FESTAG_NIGHT.inkSecondary
