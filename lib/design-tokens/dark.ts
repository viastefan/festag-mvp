/**
 * Forest Intelligence — Festag dark design tokens (2026).
 *
 * Warm forest greens (never pure black / neon SaaS). Brand accent is the
 * real Festag primary slate `#5B647D` — calm, serious, never electric blue.
 * Surfaces carry the forest ladder; CTAs stay solid slate or quiet transparent.
 */

export const FESTAG_NIGHT = {
  /** Main canvas — forest near-black, not OLED #000. */
  canvas: '#0B0F0D',
  /** Secondary / content panels. */
  content: '#111816',
  /** Cards / raised sheets. */
  raised: '#161F1C',
  /** Popups, menus, floating sheets. */
  popup: '#1A2521',
  /** Nested menus / highest elevation. */
  peak: '#1A2521',
  /** Hover wash. */
  hover: '#202D28',
  /** Active / pressed fill. */
  active: '#202D28',
  /** Input idle — dark green surface. */
  input: '#161F1C',
  /** Input focus / filled. */
  inputFocus: '#1A2521',

  /** Primary text — soft off-white, never pure #fff. */
  ink: '#F5F8F6',
  inkSecondary: '#C7D0CC',
  inkMuted: '#8B9893',
  inkFaint: '#6D7873',
  inkDisabled: '#55605B',
  /** Nav idle. */
  inkNav: '#8B9893',

  borderHairline: 'rgba(255, 255, 255, 0.04)',
  border: 'rgba(255, 255, 255, 0.06)',
  borderStrong: 'rgba(255, 255, 255, 0.08)',
  borderFocus: 'rgba(91, 100, 125, 0.55)',

  fillQuiet: 'rgba(255, 255, 255, 0.03)',
  fill: 'rgba(255, 255, 255, 0.03)',
  fillHover: 'rgba(255, 255, 255, 0.06)',
  fillActive: 'rgba(255, 255, 255, 0.08)',

  /**
   * Festag primary slate — solid, quiet, no neon / no glow.
   * Same brand accent used across auth, Tagro, documents.
   */
  btnBg: '#5B647D',
  btnBgHover: '#6A738C',
  btnBgActive: '#4A5368',
  btnFg: '#F5F8F6',
  btnGlow: 'transparent',
  btnGradient: '#5B647D',
  btnGradientHover: '#6A738C',
  btnShadow: '0 1px 2px rgba(0, 0, 0, 0.22)',
  btnShadowHover: '0 2px 6px rgba(0, 0, 0, 0.24)',

  /** Secondary / idle auth CTA — quiet transparent. */
  btnQuietBg: 'rgba(255, 255, 255, 0.03)',
  btnQuietBgHover: 'rgba(255, 255, 255, 0.06)',
  btnQuietBgActive: 'rgba(255, 255, 255, 0.08)',
  btnQuietFg: '#C7D0CC',
  btnQuietBorder: 'rgba(255, 255, 255, 0.08)',

  /** Danger — dark red, never bright. */
  btnDangerBg: '#6B2E2E',
  btnDangerBgHover: '#7A3535',
  btnDangerBgActive: '#5A2626',
  btnDangerFg: '#F5F8F6',

  /** Soft forest scrim. */
  backdrop: 'rgba(11, 15, 13, 0.72)',
  backdropSoft: 'rgba(11, 15, 13, 0.42)',

  /** Calm semantics — readable, not neon. */
  green: '#2FA56E',
  greenBg: 'rgba(47, 165, 110, 0.14)',
  greenBorder: 'rgba(47, 165, 110, 0.22)',
  greenDark: '#268A5A',
  amber: '#D6A34F',
  amberBg: 'rgba(214, 163, 79, 0.14)',
  amberDark: '#B8893E',
  red: '#D86060',
  redBg: 'rgba(216, 96, 96, 0.14)',
  blue: '#5B647D',
  blueBg: 'rgba(91, 100, 125, 0.16)',

  /** Brand primary + quiet focus. */
  primary: '#5B647D',
  primaryHover: '#6A738C',
  primaryActive: '#4A5368',
  primaryGlow: 'rgba(91, 100, 125, 0.22)',
  accentSlate: '#5B647D',

  /** Geometry */
  controlRadius: '14px',
  controlRadiusSm: '12px',
  controlRadiusLg: '16px',
  cardRadius: '20px',
  motionMs: '220ms',
  motionEase: 'ease-out',

  /** Atmospheric shadows — forest-tinted, never colored glow. */
  shadowSm: '0 4px 16px rgba(18, 40, 35, 0.18)',
  shadowMd: '0 12px 40px rgba(0, 0, 0, 0.22)',
  shadowLg: '0 18px 56px rgba(18, 40, 35, 0.28)',
  shadowGlow: '0 0 40px rgba(18, 40, 35, 0.18)',

  /** Developer portal — same Forest Intelligence canvas. */
  devCanvas: '#0B0F0D',
} as const

export type FestagNightToken = keyof typeof FESTAG_NIGHT

/** CSS custom-property block for `[data-theme="dark"]` / classic-dark. */
export const FESTAG_NIGHT_CSS_VARS = `
  --festag-black-canvas: ${FESTAG_NIGHT.canvas};
  --festag-black-content: ${FESTAG_NIGHT.content};
  --festag-black-raised: ${FESTAG_NIGHT.raised};
  --festag-black-popup: ${FESTAG_NIGHT.popup};
  --festag-black-peak: ${FESTAG_NIGHT.peak};

  --festag-night-ink: ${FESTAG_NIGHT.ink};
  --festag-night-ink-2: ${FESTAG_NIGHT.inkSecondary};
  --festag-night-ink-3: ${FESTAG_NIGHT.inkMuted};
  --festag-night-ink-4: ${FESTAG_NIGHT.inkFaint};
  --festag-night-fill: ${FESTAG_NIGHT.fill};
  --festag-night-fill-hover: ${FESTAG_NIGHT.fillHover};
  --festag-night-fill-active: ${FESTAG_NIGHT.fillActive};
  --festag-night-line: ${FESTAG_NIGHT.border};
  --festag-night-line-strong: ${FESTAG_NIGHT.borderStrong};

  --festag-primary: ${FESTAG_NIGHT.primary};
  --festag-primary-hover: ${FESTAG_NIGHT.primaryHover};
  --festag-primary-active: ${FESTAG_NIGHT.primaryActive};
  --festag-primary-glow: ${FESTAG_NIGHT.primaryGlow};
  --festag-card-radius: ${FESTAG_NIGHT.cardRadius};
  --festag-motion: ${FESTAG_NIGHT.motionMs} ${FESTAG_NIGHT.motionEase};
`

/** Auth idle CTA — quiet transparent; ready flips to Festag slate in CSS. */
export const FESTAG_NIGHT_AUTH_BTN_VARS = `
  --festag-btn-dark-bg: ${FESTAG_NIGHT.btnQuietBg};
  --festag-btn-dark-bg-hover: ${FESTAG_NIGHT.btnQuietBgHover};
  --festag-btn-dark-bg-active: ${FESTAG_NIGHT.btnQuietBgActive};
  --festag-btn-dark-fg: ${FESTAG_NIGHT.btnQuietFg};
  --festag-btn-dark-fg-hover: ${FESTAG_NIGHT.ink};
  --festag-btn-dark-fg-active: ${FESTAG_NIGHT.ink};
  --festag-btn-dark-border: ${FESTAG_NIGHT.btnQuietBorder};
  --festag-btn-dark-border-hover: rgba(255, 255, 255, 0.10);
  --festag-btn-dark-border-active: rgba(255, 255, 255, 0.08);
  --festag-btn-dark-shadow: none;
  --festag-btn-dark-shadow-hover: none;
  --festag-btn-dark-shadow-active: none;
`
