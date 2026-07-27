/**
 * Canonical Festag auth chrome tokens — login, register, onboarding, Dev login.
 * Light = white CTAs + transparent inputs with quiet 1px hairline idle
 * (2px slate accent on focus and while the field has a value).
 * Dark = Festag Night OLED (`lib/design-tokens/dark.ts`) + quieter slate CTAs
 * + transparent fields, same `#5B647D` focus / filled stroke.
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
 * Dark auth — Festag Night. Idle CTAs stay quieter than portal soft-white
 * primary. Ready primary stays solid white (Sana) in component CSS.
 * Inputs: soft fills + outer white hairline. Ladder matches html tokens.
 */
export const AUTH_CHROME_VARS_DARK = `
  --festag-auth-radius:12px;
  --festag-auth-radius-sm:10px;
  --festag-auth-radius-lg:14px;
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
  --festag-btn-dark-fg-hover:rgba(228,228,234,0.98);
  --festag-btn-dark-fg-active:#e4e4ea;
  --festag-btn-dark-border:${FESTAG_NIGHT.btnQuietBorder};
  --festag-btn-dark-border-hover:rgba(255,255,255,0.12);
  --festag-btn-dark-border-active:rgba(255,255,255,0.10);
  --festag-btn-dark-shadow:none;
  --festag-btn-dark-shadow-hover:none;
  --festag-btn-dark-shadow-active:none;
  --festag-btn-dark-ready-bg:rgba(186,194,210,0.20);
  --festag-btn-dark-ready-bg-hover:rgba(186,194,210,0.28);
  --festag-btn-dark-ready-bg-active:rgba(186,194,210,0.34);
  /* Festag Night ready primary — soft cool-white, not harsh #fff. */
  --festag-btn-ready-bg:${FESTAG_NIGHT.btnBg};
  --festag-btn-ready-bg-hover:${FESTAG_NIGHT.btnBgHover};
  --festag-btn-ready-bg-active:${FESTAG_NIGHT.btnBgActive};
  --festag-btn-ready-fg:${FESTAG_NIGHT.btnFg};
  --festag-input-fill:${FESTAG_NIGHT.input};
  --festag-input-fill-focus:${FESTAG_NIGHT.inputFocus};
  --festag-input-fg:rgba(228,228,234,0.92);
  --festag-input-caret:rgba(198,206,222,0.78);
  --festag-input-placeholder:rgba(228,228,234,0.30);
  --festag-input-border:rgba(255,255,255,0.12);
  --festag-input-border-hover:rgba(255,255,255,0.16);
  --festag-input-border-width:1px;
  --festag-input-border-focus:${FESTAG_NIGHT.accentSlate};
  --festag-input-border-width-focus:2px;
`

/** Solid hex mirrors for autofill inset paint (Chrome ignores translucent fills). */
export const AUTH_INPUT_FILL_LIGHT = 'transparent'
export const AUTH_INPUT_FILL_LIGHT_FOCUS = 'transparent'
/** Opaque canvas match for Chrome autofill inset (must not be transparent). */
export const AUTH_INPUT_AUTOFILL_LIGHT = '#f7f8f8'
export const AUTH_INPUT_FILL_DARK = FESTAG_NIGHT.input
export const AUTH_INPUT_FILL_DARK_FOCUS = FESTAG_NIGHT.inputFocus
/** Soft slate typed text on dark fields — quieter than button white. */
export const AUTH_INPUT_FG_DARK = 'rgba(228,228,234,0.92)'
export const AUTH_INPUT_CARET_DARK = 'rgba(198,206,222,0.78)'
export const AUTH_INPUT_PLACEHOLDER_DARK = 'rgba(228,228,234,0.30)'
/** Light placeholder — secondary gray, clearly visible on cool field fills. */
export const AUTH_INPUT_PLACEHOLDER_LIGHT = '#8e95a3'

/**
 * Canonical muted copy — light cool slate; dark matches Festag Night ink-2.
 */
export const AUTH_MUTED_LIGHT = '#8891a0'
export const AUTH_MUTED_DARK = FESTAG_NIGHT.inkSecondary
