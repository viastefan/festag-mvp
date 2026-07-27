/**
 * Festag Night — dark design tokens (2026).
 *
 * Deep zinc OLED — serious, not washed blue-slate.
 * Accent `#5B647D` for focus / links. Auth Google is a quiet ghost (not filled blue).
 * Ready CTAs = warm bone on dark. Semantic green for success only.
 */

export const FESTAG_NIGHT = {
  /** Main canvas — near-black zinc. */
  canvas: '#070708',
  /** Secondary / content panels / floating plate. */
  content: '#0E0E10',
  /** Cards / raised sheets. */
  raised: '#151518',
  /** Popups, menus, floating sheets. */
  popup: '#1A1A1E',
  /** Nested menus / highest elevation. */
  peak: '#212126',
  /** Hover wash. */
  hover: '#27272C',
  /** Active / pressed fill. */
  active: '#27272C',
  /** Input idle. */
  input: '#151518',
  /** Input focus / filled. */
  inputFocus: '#1A1A1E',

  /** Primary text — soft cool ink, never pure #fff. */
  ink: '#E6E6EA',
  inkSecondary: '#B8B8C0',
  inkMuted: '#8A8A94',
  inkFaint: '#6A6A74',
  inkDisabled: '#52525A',
  /** Nav idle. */
  inkNav: '#8A8A94',

  borderHairline: 'rgba(255, 255, 255, 0.04)',
  border: 'rgba(255, 255, 255, 0.06)',
  borderStrong: 'rgba(255, 255, 255, 0.09)',
  borderFocus: 'rgba(186, 194, 210, 0.42)',

  fillQuiet: 'rgba(255, 255, 255, 0.03)',
  fill: 'rgba(255, 255, 255, 0.03)',
  fillHover: 'rgba(255, 255, 255, 0.05)',
  fillActive: 'rgba(255, 255, 255, 0.07)',

  /**
   * Ready / primary CTA — warm bone on dark (distinctive, serious).
   */
  btnBg: '#EBE8E3',
  btnBgHover: '#DDD9D2',
  btnBgActive: '#D0CBC3',
  btnFg: '#1A1917',
  btnGlow: 'transparent',
  btnGradient: '#EBE8E3',
  btnGradientHover: '#DDD9D2',
  btnShadow: 'none',
  btnShadowHover: 'none',

  /** Secondary / idle auth CTA — quiet transparent. */
  btnQuietBg: 'transparent',
  btnQuietBgHover: 'rgba(255, 255, 255, 0.04)',
  btnQuietBgActive: 'rgba(255, 255, 255, 0.06)',
  btnQuietFg: 'rgba(230, 230, 234, 0.62)',
  btnQuietBorder: 'rgba(255, 255, 255, 0.10)',

  /** Danger — dark red, never bright. */
  btnDangerBg: '#6B2E2E',
  btnDangerBgHover: '#7A3535',
  btnDangerBgActive: '#5A2626',
  btnDangerFg: '#E8EAF0',

  /** Soft cool scrim — matches deeper canvas. */
  backdrop: 'rgba(7, 7, 8, 0.80)',
  backdropSoft: 'rgba(7, 7, 8, 0.48)',

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
  primaryGlow: 'rgba(91, 100, 125, 0.18)',
  accentSlate: '#5B647D',

  /** Geometry — soft rects (auth uses 8px via chrome tokens). */
  controlRadius: '8px',
  controlRadiusSm: '8px',
  controlRadiusLg: '10px',
  cardRadius: '16px',
  motionMs: '220ms',
  motionEase: 'ease-out',

  /** Atmospheric shadows — deep black. */
  shadowSm: '0 4px 16px rgba(0, 0, 0, 0.40)',
  shadowMd: '0 12px 40px rgba(0, 0, 0, 0.44)',
  shadowLg: '0 18px 56px rgba(0, 0, 0, 0.52)',
  shadowGlow: '0 0 40px rgba(91, 100, 125, 0.08)',

  /** Developer portal — same deep canvas. */
  devCanvas: '#070708',
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

/** Auth idle CTA — quiet transparent; ready flips to bone in CSS. */
export const FESTAG_NIGHT_AUTH_BTN_VARS = `
  --festag-btn-dark-bg: ${FESTAG_NIGHT.btnQuietBg};
  --festag-btn-dark-bg-hover: ${FESTAG_NIGHT.btnQuietBgHover};
  --festag-btn-dark-bg-active: ${FESTAG_NIGHT.btnQuietBgActive};
  --festag-btn-dark-fg: ${FESTAG_NIGHT.btnQuietFg};
  --festag-btn-dark-fg-hover: ${FESTAG_NIGHT.ink};
  --festag-btn-dark-fg-active: ${FESTAG_NIGHT.ink};
  --festag-btn-dark-border: ${FESTAG_NIGHT.btnQuietBorder};
  --festag-btn-dark-border-hover: rgba(255, 255, 255, 0.16);
  --festag-btn-dark-border-active: rgba(255, 255, 255, 0.12);
  --festag-btn-dark-shadow: none;
  --festag-btn-dark-shadow-hover: none;
  --festag-btn-dark-shadow-active: none;
`
