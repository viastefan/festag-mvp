/**
 * Canonical Festag auth chrome — Login, Register, Onboarding, Dev login.
 *
 * Geometry: serious soft rects (`8px`), not pills — same in Light / Read / Dark.
 * Dark: flat Festag Night OLED + quiet ghost CTAs; ready = warm bone.
 * Accent: Festag primary blue `#5B647D` (Light). Read Google = warm charcoal.
 * Light: Anthropic / Claude ivory (`#FAF9F5`, same as Lesen) + white Linear CTAs.
 * Read: same ivory canvas — layout/spacing identical to Light.
 */

import { FESTAG_NIGHT } from '@/lib/design-tokens/dark'
import { FESTAG_SAND } from '@/lib/design-tokens/sand-read'

/**
 * Login/Register light canvas — Anthropic paper ivory (anthropic.com body),
 * shared with Lesen so auth never reads as sterile white.
 * Primary blue accents stay Festag.
 */
export const AUTH_LIGHT_CANVAS = FESTAG_SAND.canvas
/**
 * Primary caret / blink / selection / quiet input focus — slightly softer than
 * Festag fill primary `#5B647D` (Google CTA stays on Night primary).
 */
export const AUTH_CARET = '#66708D'
export const AUTH_CARET_SELECTION = 'rgba(102, 112, 141, 0.28)'
/**
 * Auth dark canvas — Primary Dusk (same OS foundation as mobile onboarding).
 * Deeper than flat Night OLED so auth feels cinematic, not like a login card.
 */
export const AUTH_DARK_CANVAS = '#0C0D12'
/** Auth read canvas — same Anthropic / Claude ivory as light. */
export const AUTH_READ_CANVAS = FESTAG_SAND.canvas

/**
 * Shared Aeonik Regular tracking — Login, Register, Onboarding.
 * Slightly open (not negative display crush), quieter than the old 0.02em stretch.
 */
export const AUTH_TRACKING_UI = '0.01em'
export const AUTH_TRACKING_DISPLAY = '0.006em'
export const AUTH_TRACKING_VARS = `
  --auth-tracking:${AUTH_TRACKING_UI};
  --auth-tracking-display:${AUTH_TRACKING_DISPLAY};
`

/**
 * Desktop auth chrome (≥769px) — classic narrow login column.
 * 300px — tighter than the 340/480 stretches; calm centered stack.
 * Onboarding `.mob` content column matches this width 1:1.
 */
export const AUTH_DESKTOP_CHROME_VARS = `
  --al-panel-width:300px;
  --al-os-gutter:48px;
  --al-os-content-max:300px;
  ${AUTH_TRACKING_VARS.trim()}
  --al-hero-display-size:28px;
  --al-hero-display-lh:30px;
  --al-hero-name-size:28px;
  --al-hero-name-lh:30px;
  --al-hero-caret-h:22px;
  --festag-btn-height:42px;
  --festag-input-height:46px;
  --festag-input-font-size:15px;
  --al-desktop-hero-gap:28px;
  --al-desktop-stack-gap:14px;
  --al-desktop-divider-gap:28px;
  --al-desktop-field-gap:16px;
  --al-desktop-secondary-gap:28px;
  --al-os-card-radius:14px;
  --al-os-card-pad-y:18px;
  --al-os-card-pad-x:18px;
  --al-os-card-gap:10px;
`

/** Cool blue-slate muted — light + dark secondary copy (never warm zinc gray). */
export const AUTH_MUTED_LIGHT = '#8891a0'
/** Light placeholders — quieter / slightly lighter than muted. */
export const AUTH_MUTED_SOFT_LIGHT = '#9AA3B0'
export const AUTH_MUTED_DARK = '#8891a0'
/** Dark placeholders — quieter / slightly deeper than muted. */
export const AUTH_MUTED_SOFT_DARK = '#6B7385'
/** Warm muted ink on sandy read. */
export const AUTH_MUTED_READ = FESTAG_SAND.muted
export const AUTH_MUTED_SOFT_READ = '#9a9288'

/**
 * Shared mobile auth type + column (≤768).
 * One scale for login/register + onboarding — H1 and username match.
 */
export const AUTH_MOBILE_CHROME_VARS = `
  --festag-auth-mobile-gutter:28px;
  --al-mobile-gutter:28px;
  --al-chrome-gutter:28px;
  --al-col-pad:28px;
  --dl-mobile-gutter:28px;
  --dl-col-pad:28px;
  ${AUTH_TRACKING_VARS.trim()}
  /* Match master canvas AuthStage / onboarding H1 (26) — not oversized 34 */
  --al-hero-display-size:22px;
  --al-hero-display-lh:26px;
  --al-hero-name-size:22px;
  --al-hero-name-lh:26px;
  --al-hero-caret-h:18px;
  --dl-hero-display-size:22px;
  --dl-hero-display-lh:26px;
  --dl-hero-name-size:22px;
  --dl-hero-name-lh:26px;
  --dl-hero-caret-h:18px;
  --festag-btn-height:44px;
  --festag-input-height:46px;
  /* Same as canvas AuthStage email — never taller/shorter than other fields. */
  --festag-email-input-height:46px;
  --festag-input-font-size:15px;
`

/** CSS custom properties for light auth surfaces (.al-root / .dl-root default). */
export const AUTH_CHROME_VARS_LIGHT = `
  --festag-auth-radius:6px;
  --festag-auth-radius-sm:6px;
  --festag-auth-radius-lg:8px;
  --festag-control-radius:var(--festag-auth-radius);
  --festag-control-radius-sm:var(--festag-auth-radius-sm);
  --festag-control-radius-lg:var(--festag-auth-radius-lg);
  --festag-input-radius:8px;
  --festag-auth-canvas:${AUTH_LIGHT_CANVAS};
  --festag-btn-height:40px;
  /* Email field only — 1px taller than CTAs. */
  --festag-input-height:46px;
  --festag-input-font-size:15px;
  /* Soft white CTAs — hairline only on read canvas (no 3D lift). */
  --festag-btn-dark-bg:#ffffff;
  --festag-btn-dark-bg-hover:#fafafa;
  --festag-btn-dark-bg-active:#f5f5f6;
  --festag-btn-dark-fg:#1e1e20;
  --festag-btn-dark-fg-hover:#1e1e20;
  --festag-btn-dark-fg-active:#1e1e20;
  --festag-btn-dark-border:rgba(30,30,32,0.08);
  --festag-btn-dark-border-hover:rgba(30,30,32,0.10);
  --festag-btn-dark-border-active:rgba(30,30,32,0.08);
  --festag-btn-dark-shadow:none;
  --festag-btn-dark-shadow-hover:none;
  --festag-btn-dark-shadow-active:none;
  /* Ready Weiter — same white plate; hairline only (canvas already separates white). */
  --festag-btn-ready-bg:#ffffff;
  --festag-btn-ready-bg-hover:#fafafa;
  --festag-btn-ready-bg-active:#f5f5f6;
  --festag-btn-ready-fg:#1e1e20;
  --festag-btn-ready-border:rgba(30,30,32,0.10);
  --festag-btn-ready-border-hover:rgba(30,30,32,0.12);
  --festag-btn-ready-border-active:rgba(30,30,32,0.08);
  --festag-btn-ready-shadow:none;
  --festag-btn-ready-shadow-hover:none;
  --festag-btn-ready-shadow-active:none;
  /* Accent + Google — Festag primary blue. */
  --festag-btn-google-bg:${FESTAG_NIGHT.primary};
  --festag-btn-google-bg-hover:#6A738C;
  --festag-btn-google-bg-active:#4A5368;
  --festag-btn-google-fg:#F5F6F8;
  --festag-primary:${FESTAG_NIGHT.primary};
  --al-accent:${FESTAG_NIGHT.primary};
  --festag-caret:${AUTH_CARET};
  --festag-input-caret:${AUTH_CARET};
  --festag-input-fill:transparent;
  --festag-input-fill-focus:transparent;
  --festag-input-placeholder:${AUTH_MUTED_LIGHT};
  /* Quiet ink hairline — matches Intent / canvas AuthStage email */
  --festag-input-border:rgba(30,30,32,0.10);
  --festag-input-border-hover:rgba(30,30,32,0.14);
  --festag-input-border-width:1px;
  --festag-input-border-filled:rgba(30,30,32,0.16);
  --festag-input-border-width-filled:1px;
  --festag-input-border-focus:${AUTH_CARET};
  --festag-input-border-width-focus:1px;
  --festag-btn-border-width-focus:2px;
  --festag-btn-border-focus:${AUTH_CARET};
  --festag-caret-selection:${AUTH_CARET_SELECTION};
  --festag-oauth-icon-opacity:0.92;
  --festag-oauth-icon-opacity-hover:1;
  --al-text-muted:${AUTH_MUTED_LIGHT};
  --al-text-muted-soft:${AUTH_MUTED_SOFT_LIGHT};
`

/**
 * Read — same geometry as Light (6px soft rects, heights, type).
 * Only palette differs: sandy cream canvas + charcoal Google.
 */
export const AUTH_CHROME_VARS_READ = `
  --festag-auth-radius:6px;
  --festag-auth-radius-sm:6px;
  --festag-auth-radius-lg:8px;
  --festag-control-radius:var(--festag-auth-radius);
  --festag-control-radius-sm:var(--festag-auth-radius-sm);
  --festag-control-radius-lg:var(--festag-auth-radius-lg);
  --festag-input-radius:8px;
  --festag-auth-canvas:${FESTAG_SAND.canvas};
  --festag-btn-height:40px;
  --festag-input-height:46px;
  --festag-input-font-size:15px;
  --festag-btn-dark-bg:#ffffff;
  --festag-btn-dark-bg-hover:#fafafa;
  --festag-btn-dark-bg-active:#f5f5f6;
  --festag-btn-dark-fg:#1e1e20;
  --festag-btn-dark-fg-hover:#1e1e20;
  --festag-btn-dark-fg-active:#1e1e20;
  --festag-btn-dark-border:rgba(30,30,32,0.08);
  --festag-btn-dark-border-hover:rgba(30,30,32,0.10);
  --festag-btn-dark-border-active:rgba(30,30,32,0.08);
  --festag-btn-dark-shadow:none;
  --festag-btn-dark-shadow-hover:none;
  --festag-btn-dark-shadow-active:none;
  --festag-btn-ready-bg:#ffffff;
  --festag-btn-ready-bg-hover:#fafafa;
  --festag-btn-ready-bg-active:#f5f5f6;
  --festag-btn-ready-fg:#1e1e20;
  --festag-btn-ready-shadow:none;
  --festag-btn-ready-shadow-hover:none;
  --festag-btn-ready-shadow-active:none;
  /* Google — warm charcoal (not primary blue). */
  --festag-btn-google-bg:#2F2C2A;
  --festag-btn-google-bg-hover:#3A3632;
  --festag-btn-google-bg-active:#242220;
  --festag-btn-google-fg:#F5F6F8;
  --festag-primary:#5C554C;
  --al-accent:#5C554C;
  --festag-caret:${AUTH_CARET};
  --festag-input-caret:${AUTH_CARET};
  --festag-input-fill:transparent;
  --festag-input-fill-focus:transparent;
  --festag-input-placeholder:${AUTH_MUTED_READ};
  --festag-input-border:rgba(30,30,32,0.10);
  --festag-input-border-hover:rgba(30,30,32,0.14);
  --festag-input-border-width:1px;
  --festag-input-border-filled:rgba(30,30,32,0.16);
  --festag-input-border-width-filled:1px;
  --festag-input-border-focus:${AUTH_CARET};
  --festag-input-border-width-focus:1px;
  --festag-btn-border-width-focus:2px;
  --festag-btn-border-focus:${AUTH_CARET};
  --festag-caret-selection:${AUTH_CARET_SELECTION};
  --festag-oauth-icon-opacity:0.92;
  --festag-oauth-icon-opacity-hover:1;
  --al-text-muted:${AUTH_MUTED_READ};
  --al-text-muted-soft:${AUTH_MUTED_SOFT_READ};
`

/**
 * Dark auth — deep zinc, hairline ghosts, bone ready CTA.
 * Brand marks stay monochrome + muted until hover.
 */
export const AUTH_CHROME_VARS_DARK = `
  --festag-auth-radius:6px;
  --festag-auth-radius-sm:6px;
  --festag-auth-radius-lg:8px;
  --festag-control-radius:var(--festag-auth-radius);
  --festag-control-radius-sm:var(--festag-auth-radius-sm);
  --festag-control-radius-lg:var(--festag-auth-radius-lg);
  --festag-input-radius:8px;
  --festag-auth-canvas:${AUTH_DARK_CANVAS};
  --festag-btn-height:40px;
  /* Email field only — 1px taller than CTAs. */
  --festag-input-height:46px;
  --festag-input-font-size:15px;
  --festag-primary:${FESTAG_NIGHT.primary};
  --al-accent:${FESTAG_NIGHT.primary};
  --festag-black-canvas:${AUTH_DARK_CANVAS};
  --festag-black-content:#12141C;
  --festag-black-raised:#181B24;
  --festag-black-popup:#1C1F2A;
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
  --festag-caret:${AUTH_CARET};
  --festag-input-caret:${AUTH_CARET};
  --festag-caret-selection:${AUTH_CARET_SELECTION};
  --festag-input-placeholder:${AUTH_MUTED_SOFT_DARK};
  --festag-input-border:rgba(255,255,255,0.08);
  --festag-input-border-hover:rgba(255,255,255,0.14);
  --festag-input-border-width:1px;
  /* Focus = Festag primary blue (same as light) — minimally thicker than idle. */
  --festag-input-border-filled:rgba(255,255,255,0.22);
  --festag-input-border-width-filled:1px;
  --festag-input-border-focus:${FESTAG_NIGHT.primary};
  --festag-input-border-width-focus:1px;
  --festag-btn-border-width-focus:2px;
  --festag-btn-border-focus:${FESTAG_NIGHT.primary};
  --festag-input-focus-glow:none;
  /* OAuth icons/labels must read as active — not disabled ghosts. */
  --festag-oauth-icon-opacity:0.95;
  --festag-oauth-icon-opacity-hover:1;
  --festag-btn-oauth-fg:rgba(245,245,247,0.94);
  --festag-btn-oauth-fg-hover:rgba(255,255,255,1);
  --al-text-muted:${AUTH_MUTED_DARK};
  --al-text-muted-soft:${AUTH_MUTED_SOFT_DARK};
`

export const AUTH_INPUT_FILL_LIGHT = 'transparent'
export const AUTH_INPUT_FILL_LIGHT_FOCUS = 'transparent'
export const AUTH_INPUT_AUTOFILL_LIGHT = AUTH_LIGHT_CANVAS
export const AUTH_INPUT_FILL_DARK = 'transparent'
export const AUTH_INPUT_FILL_DARK_FOCUS = 'transparent'
/** Chrome autofill needs opaque inset — match auth canvas so it reads as no fill. */
export const AUTH_INPUT_AUTOFILL_DARK = AUTH_DARK_CANVAS
export const AUTH_INPUT_FG_DARK = FESTAG_NIGHT.ink
export const AUTH_INPUT_CARET_DARK = FESTAG_NIGHT.inkSecondary
export const AUTH_INPUT_PLACEHOLDER_DARK = AUTH_MUTED_SOFT_DARK
export const AUTH_INPUT_PLACEHOLDER_LIGHT = AUTH_MUTED_SOFT_LIGHT
