/**
 * Canonical Festag auth chrome — Login, Register, Onboarding, Dev login.
 *
 * Geometry: serious soft rects (`8px`), not pills.
 * Dark: flat Festag Night OLED + quiet ghost CTAs; ready = warm bone.
 * Accent: Festag primary blue `#5B647D`.
 * Light: elevated cool canvas (same as Dev panel) + white Linear CTAs.
 */

import { FESTAG_NIGHT } from '@/lib/design-tokens/dark'
import { FESTAG_ELEVATED } from '@/lib/design-tokens/elevated'

/** Auth light canvas — cool elevated, same as Dev / Client light. */
export const AUTH_LIGHT_CANVAS = FESTAG_ELEVATED.canvasDesktop
/** Auth dark canvas — matches Festag Night. */
export const AUTH_DARK_CANVAS = FESTAG_NIGHT.canvas

/** Cool muted ink on elevated light (never warm sand stone). */
export const AUTH_MUTED_LIGHT = '#90959F'
export const AUTH_MUTED_SOFT_LIGHT = '#A0A5B0'

/**
 * Shared mobile auth type + column (≤768).
 * One scale for Client login/register, Dev login, onboarding — before dashboard.
 */
export const AUTH_MOBILE_CHROME_VARS = `
  --festag-auth-mobile-gutter:32px;
  --al-mobile-gutter:32px;
  --al-chrome-gutter:32px;
  --al-col-pad:32px;
  --dl-mobile-gutter:32px;
  --dl-col-pad:32px;
  --al-hero-display-size:32px;
  --al-hero-display-lh:39px;
  --al-hero-name-size:26px;
  --al-hero-name-lh:32px;
  --al-hero-caret-h:26px;
  --dl-hero-display-size:32px;
  --dl-hero-display-lh:39px;
  --dl-hero-name-size:26px;
  --dl-hero-name-lh:32px;
  --dl-hero-caret-h:26px;
  --festag-btn-height:42px;
  --festag-input-height:43px;
  /* 15.2px = 5% under the previous 16px mobile field type. */
  --festag-input-font-size:15.2px;
`

/** CSS custom properties for light auth surfaces (.al-root / .dl-root default). */
export const AUTH_CHROME_VARS_LIGHT = `
  --festag-auth-radius:8px;
  --festag-auth-radius-sm:8px;
  --festag-auth-radius-lg:10px;
  --festag-control-radius:var(--festag-auth-radius);
  --festag-control-radius-sm:var(--festag-auth-radius-sm);
  --festag-control-radius-lg:var(--festag-auth-radius-lg);
  --festag-auth-canvas:${FESTAG_ELEVATED.canvasDesktop};
  --festag-btn-height:40px;
  /* Email field only — 1px taller than CTAs. */
  --festag-input-height:41px;
  --festag-input-font-size:16px;
  /* White Linear CTAs on cool elevated canvas. */
  --festag-btn-dark-bg:#ffffff;
  --festag-btn-dark-bg-hover:#fafafa;
  --festag-btn-dark-bg-active:#f5f5f6;
  --festag-btn-dark-fg:#1e1e20;
  --festag-btn-dark-fg-hover:#1e1e20;
  --festag-btn-dark-fg-active:#1e1e20;
  --festag-btn-dark-border:rgba(30,30,32,0.08);
  --festag-btn-dark-border-hover:rgba(30,30,32,0.08);
  --festag-btn-dark-border-active:rgba(30,30,32,0.08);
  --festag-btn-dark-shadow:0 1px 2px rgba(0,0,0,0.04);
  --festag-btn-dark-shadow-hover:0 1px 2px rgba(0,0,0,0.04);
  --festag-btn-dark-shadow-active:none;
  --festag-btn-ready-bg:#ffffff;
  --festag-btn-ready-bg-hover:#fafafa;
  --festag-btn-ready-bg-active:#f5f5f6;
  --festag-btn-ready-fg:#1e1e20;
  /* Accent + Google — Festag primary blue. */
  --festag-btn-google-bg:${FESTAG_NIGHT.primary};
  --festag-btn-google-bg-hover:#6A738C;
  --festag-btn-google-bg-active:#4A5368;
  --festag-btn-google-fg:#F5F6F8;
  --festag-primary:${FESTAG_NIGHT.primary};
  --al-accent:${FESTAG_NIGHT.primary};
  --festag-input-fill:transparent;
  --festag-input-fill-focus:transparent;
  --festag-input-placeholder:${AUTH_MUTED_LIGHT};
  --festag-input-border:rgba(30,30,32,0.15);
  --festag-input-border-hover:rgba(30,30,32,0.20);
  --festag-input-border-width:1px;
  /* Focus = Festag primary blue (same as Google CTA). */
  --festag-input-border-focus:${FESTAG_NIGHT.primary};
  --festag-input-border-width-focus:1.5px;
  --festag-oauth-icon-opacity:0.92;
  --festag-oauth-icon-opacity-hover:1;
`

/**
 * Dark auth — deep zinc, hairline ghosts, bone ready CTA.
 * Brand marks stay monochrome + muted until hover.
 */
export const AUTH_CHROME_VARS_DARK = `
  --festag-auth-radius:8px;
  --festag-auth-radius-sm:8px;
  --festag-auth-radius-lg:10px;
  --festag-control-radius:var(--festag-auth-radius);
  --festag-control-radius-sm:var(--festag-auth-radius-sm);
  --festag-control-radius-lg:var(--festag-auth-radius-lg);
  --festag-auth-canvas:${FESTAG_NIGHT.canvas};
  --festag-btn-height:40px;
  /* Email field only — 1px taller than CTAs. */
  --festag-input-height:41px;
  --festag-input-font-size:16px;
  --festag-primary:${FESTAG_NIGHT.primary};
  --al-accent:${FESTAG_NIGHT.primary};
  --festag-black-canvas:${FESTAG_NIGHT.canvas};
  --festag-black-content:${FESTAG_NIGHT.content};
  --festag-black-raised:${FESTAG_NIGHT.raised};
  --festag-black-popup:${FESTAG_NIGHT.popup};
  --modal-backdrop:${FESTAG_NIGHT.backdrop};
  --fp-bg:var(--festag-black-popup, ${FESTAG_NIGHT.popup});
  --festag-btn-dark-bg:transparent;
  --festag-btn-dark-bg-hover:rgba(255,255,255,0.04);
  --festag-btn-dark-bg-active:rgba(255,255,255,0.06);
  --festag-btn-dark-fg:rgba(228,228,234,0.62);
  --festag-btn-dark-fg-hover:rgba(232,234,240,0.92);
  --festag-btn-dark-fg-active:rgba(232,234,240,0.96);
  --festag-btn-dark-border:rgba(255,255,255,0.10);
  --festag-btn-dark-border-hover:rgba(255,255,255,0.16);
  --festag-btn-dark-border-active:rgba(255,255,255,0.12);
  /* OAuth — soft lift so Google/Apple read as active (not disabled ghosts). */
  --festag-btn-oauth-bg:rgba(255,255,255,0.055);
  --festag-btn-oauth-bg-hover:rgba(255,255,255,0.08);
  --festag-btn-oauth-bg-active:rgba(255,255,255,0.10);
  --festag-btn-oauth-border:rgba(255,255,255,0.16);
  --festag-btn-oauth-border-hover:rgba(255,255,255,0.22);
  --festag-btn-dark-shadow:none;
  --festag-btn-dark-shadow-hover:none;
  --festag-btn-dark-shadow-active:none;
  --festag-btn-dark-ready-bg:${FESTAG_NIGHT.btnBg};
  --festag-btn-dark-ready-bg-hover:${FESTAG_NIGHT.btnBgHover};
  --festag-btn-dark-ready-bg-active:${FESTAG_NIGHT.btnBgActive};
  /* Ready — warm bone on deep zinc (not cool portal white). */
  --festag-btn-ready-bg:${FESTAG_NIGHT.btnBg};
  --festag-btn-ready-bg-hover:${FESTAG_NIGHT.btnBgHover};
  --festag-btn-ready-bg-active:${FESTAG_NIGHT.btnBgActive};
  --festag-btn-ready-fg:${FESTAG_NIGHT.btnFg};
  --festag-btn-ready-shadow:none;
  --festag-btn-ready-shadow-hover:none;
  --festag-input-fill:transparent;
  --festag-input-fill-focus:transparent;
  --festag-input-fg:${FESTAG_NIGHT.ink};
  --festag-input-caret:${FESTAG_NIGHT.inkSecondary};
  --festag-input-placeholder:${FESTAG_NIGHT.inkFaint};
  --festag-input-border:rgba(255,255,255,0.10);
  --festag-input-border-hover:rgba(255,255,255,0.16);
  --festag-input-border-width:1px;
  /* Focus = Festag primary blue (same as light). */
  --festag-input-border-focus:${FESTAG_NIGHT.primary};
  --festag-input-border-width-focus:1.5px;
  --festag-input-focus-glow:none;
  /* OAuth icons/labels must read as active — not disabled ghosts. */
  --festag-oauth-icon-opacity:0.95;
  --festag-oauth-icon-opacity-hover:1;
  --festag-btn-oauth-fg:rgba(245,245,247,0.94);
  --festag-btn-oauth-fg-hover:rgba(255,255,255,1);
`

export const AUTH_INPUT_FILL_LIGHT = 'transparent'
export const AUTH_INPUT_FILL_LIGHT_FOCUS = 'transparent'
export const AUTH_INPUT_AUTOFILL_LIGHT = AUTH_LIGHT_CANVAS
export const AUTH_INPUT_FILL_DARK = 'transparent'
export const AUTH_INPUT_FILL_DARK_FOCUS = 'transparent'
/** Chrome autofill needs opaque inset — match auth canvas so it reads as no fill. */
export const AUTH_INPUT_AUTOFILL_DARK = FESTAG_NIGHT.canvas
export const AUTH_INPUT_FG_DARK = FESTAG_NIGHT.ink
export const AUTH_INPUT_CARET_DARK = FESTAG_NIGHT.inkSecondary
export const AUTH_INPUT_PLACEHOLDER_DARK = FESTAG_NIGHT.inkFaint
export const AUTH_INPUT_PLACEHOLDER_LIGHT = AUTH_MUTED_LIGHT

export const AUTH_MUTED_DARK = FESTAG_NIGHT.inkSecondary
