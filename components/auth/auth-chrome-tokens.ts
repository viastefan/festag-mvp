/**
 * Canonical Festag auth chrome — Login, Register, Onboarding, Dev login.
 *
 * Geometry: serious soft rects (`8px`), not pills — same in Light / Read / Dark.
 * Dark: flat Festag Night OLED + quiet ghost CTAs; ready = warm bone.
 * Accent: Festag primary blue `#5B647D` (Light). Read Google = warm charcoal.
 * Light: clean white canvas (`#FFFFFF`) + white Linear CTAs.
 * Read: sandy cream canvas only — layout/spacing identical to Light.
 */

import { FESTAG_NIGHT } from '@/lib/design-tokens/dark'
import { FESTAG_SAND } from '@/lib/design-tokens/sand-read'

/** Auth light canvas — clean white (Vercel-like), not cool gray. */
export const AUTH_LIGHT_CANVAS = '#FFFFFF'
/**
 * Auth dark canvas — Primary Dusk (same OS foundation as mobile onboarding).
 * Deeper than flat Night OLED so auth feels cinematic, not like a login card.
 */
export const AUTH_DARK_CANVAS = '#0C0D12'
/** Auth read canvas — sandy cream (screenshot / Claude family). */
export const AUTH_READ_CANVAS = FESTAG_SAND.canvas

/**
 * Desktop auth OS chrome (≥769px) — architectural spacing, not stretched mobile.
 * Panel floats on the canvas; typography is the hero.
 */
export const AUTH_DESKTOP_CHROME_VARS = `
  --al-panel-width:540px;
  --al-hero-display-size:60px;
  --al-hero-display-lh:68px;
  --al-hero-name-size:36px;
  --al-hero-name-lh:44px;
  --al-hero-caret-h:36px;
  --festag-btn-height:46px;
  --festag-input-height:48px;
  --festag-input-font-size:16px;
  --al-desktop-hero-gap:40px;
  --al-desktop-stack-gap:12px;
  --al-desktop-divider-gap:32px;
  --al-desktop-field-gap:20px;
  --al-desktop-secondary-gap:32px;
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
  --festag-input-radius:8px;
  --festag-auth-canvas:${AUTH_LIGHT_CANVAS};
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
  --al-text-muted:${AUTH_MUTED_LIGHT};
  --al-text-muted-soft:${AUTH_MUTED_SOFT_LIGHT};
`

/**
 * Read — same geometry as Light (8px soft rects, heights, type).
 * Only palette differs: sandy cream canvas + charcoal Google.
 */
export const AUTH_CHROME_VARS_READ = `
  --festag-auth-radius:8px;
  --festag-auth-radius-sm:8px;
  --festag-auth-radius-lg:10px;
  --festag-control-radius:var(--festag-auth-radius);
  --festag-control-radius-sm:var(--festag-auth-radius-sm);
  --festag-control-radius-lg:var(--festag-auth-radius-lg);
  --festag-input-radius:8px;
  --festag-auth-canvas:${FESTAG_SAND.canvas};
  --festag-btn-height:40px;
  --festag-input-height:41px;
  --festag-input-font-size:16px;
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
  /* Google — warm charcoal (not primary blue). */
  --festag-btn-google-bg:#2F2C2A;
  --festag-btn-google-bg-hover:#3A3632;
  --festag-btn-google-bg-active:#242220;
  --festag-btn-google-fg:#F5F6F8;
  --festag-primary:#5C554C;
  --al-accent:#5C554C;
  --festag-input-fill:transparent;
  --festag-input-fill-focus:transparent;
  --festag-input-placeholder:${AUTH_MUTED_READ};
  --festag-input-border:rgba(30,30,32,0.15);
  --festag-input-border-hover:rgba(30,30,32,0.20);
  --festag-input-border-width:1px;
  --festag-input-border-focus:#5C554C;
  --festag-input-border-width-focus:1.5px;
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
  --festag-auth-radius:8px;
  --festag-auth-radius-sm:8px;
  --festag-auth-radius-lg:10px;
  --festag-control-radius:var(--festag-auth-radius);
  --festag-control-radius-sm:var(--festag-auth-radius-sm);
  --festag-control-radius-lg:var(--festag-auth-radius-lg);
  --festag-input-radius:8px;
  --festag-auth-canvas:${AUTH_DARK_CANVAS};
  --festag-btn-height:40px;
  /* Email field only — 1px taller than CTAs. */
  --festag-input-height:41px;
  --festag-input-font-size:16px;
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
  --festag-input-caret:${FESTAG_NIGHT.inkSecondary};
  --festag-input-placeholder:${AUTH_MUTED_SOFT_DARK};
  --festag-input-border:rgba(255,255,255,0.08);
  --festag-input-border-hover:rgba(255,255,255,0.14);
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
