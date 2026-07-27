/**
 * Festag Night — dark design tokens (2026).
 *
 * Cool graphite–slate surfaces. Accent `#5B647D` for focus / links only —
 * never as colored CTA fills. Ready / primary CTAs are soft cool-white.
 * Semantic green stays for success only (ok badges, status).
 */

export const FESTAG_NIGHT = {
  /** Main canvas — cool near-black with slate undertone. */
  canvas: '#0B0C10',
  /** Secondary / content panels. */
  content: '#111318',
  /** Cards / raised sheets. */
  raised: '#171A21',
  /** Popups, menus, floating sheets. */
  popup: '#1C2028',
  /** Nested menus / highest elevation. */
  peak: '#222631',
  /** Hover wash. */
  hover: '#262A35',
  /** Active / pressed fill. */
  active: '#262A35',
  /** Input idle. */
  input: '#171A21',
  /** Input focus / filled. */
  inputFocus: '#1C2028',

  /** Primary text — soft cool ink, never pure #fff. */
  ink: '#E8EAF0',
  inkSecondary: '#C4C8D4',
  inkMuted: '#8B909E',
  inkFaint: '#6E7382',
  inkDisabled: '#555A68',
  /** Nav idle. */
  inkNav: '#8B909E',

  borderHairline: 'rgba(255, 255, 255, 0.04)',
  border: 'rgba(255, 255, 255, 0.06)',
  borderStrong: 'rgba(255, 255, 255, 0.08)',
  borderFocus: 'rgba(91, 100, 125, 0.55)',

  fillQuiet: 'rgba(255, 255, 255, 0.03)',
  fill: 'rgba(255, 255, 255, 0.03)',
  fillHover: 'rgba(255, 255, 255, 0.06)',
  fillActive: 'rgba(255, 255, 255, 0.08)',

  /**
   * Ready / primary CTA — soft cool-white on dark (never colored fills).
   * Quiet hierarchy: white primary, transparent secondary.
   */
  btnBg: '#F0F2F5',
  btnBgHover: '#DCE1E8',
  btnBgActive: '#CFD5DD',
  btnFg: '#1A1A1E',
  btnGlow: 'transparent',
  btnGradient: '#F0F2F5',
  btnGradientHover: '#DCE1E8',
  btnShadow: 'none',
  btnShadowHover: 'none',

  /** Secondary / idle auth CTA — quiet transparent. */
  btnQuietBg: 'rgba(255, 255, 255, 0.03)',
  btnQuietBgHover: 'rgba(255, 255, 255, 0.06)',
  btnQuietBgActive: 'rgba(255, 255, 255, 0.08)',
  btnQuietFg: '#C4C8D4',
  btnQuietBorder: 'rgba(255, 255, 255, 0.08)',

  /** Danger — dark red, never bright. */
  btnDangerBg: '#6B2E2E',
  btnDangerBgHover: '#7A3535',
  btnDangerBgActive: '#5A2626',
  btnDangerFg: '#E8EAF0',

  /** Soft cool scrim. */
  backdrop: 'rgba(11, 12, 16, 0.72)',
  backdropSoft: 'rgba(11, 12, 16, 0.42)',

  /** Calm semantics — readable, not neon. */
  green: '#2E9B52',
  greenBg: 'rgba(46, 155, 82, 0.12)',
  greenBorder: 'rgba(46, 155, 82, 0.22)',
  greenDark: '#268A45',
  amber: '#D6A34F',
  amberBg: 'rgba(214, 163, 79, 0.14)',
  amberDark: '#B8893E',
  red: '#D86060',
  redBg: 'rgba(216, 96, 96, 0.14)',
  blue: '#5B647D',
  blueBg: 'rgba(91, 100, 125, 0.16)',

  /** Brand accent = primary slate (focus / links — not CTA fills). */
  primary: '#5B647D',
  primaryHover: '#6A738C',
  primaryActive: '#4A5368',
  primaryGlow: 'rgba(91, 100, 125, 0.22)',
  accentSlate: '#5B647D',

  /** Geometry — full pills for buttons everywhere. */
  controlRadius: '999px',
  controlRadiusSm: '999px',
  controlRadiusLg: '999px',
  cardRadius: '20px',
  motionMs: '220ms',
  motionEase: 'ease-out',

  /** Atmospheric shadows — cool slate, never green glow. */
  shadowSm: '0 4px 16px rgba(11, 12, 16, 0.28)',
  shadowMd: '0 12px 40px rgba(0, 0, 0, 0.28)',
  shadowLg: '0 18px 56px rgba(11, 12, 16, 0.36)',
  shadowGlow: '0 0 40px rgba(91, 100, 125, 0.12)',

  /** Developer portal — same cool slate canvas. */
  devCanvas: '#0B0C10',
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

/** Auth idle CTA — quiet transparent; ready flips to Festag primary in CSS. */
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
