/**
 * Festag Night — canonical dark design tokens (2026).
 *
 * Eye-friendly OLED: true-black canvas for depth, soft graphite elevations,
 * soft ink (not pure white), quiet hairlines, desaturated semantics.
 * Single source of truth for FOUC, theme.ts, CSS, and surface remappers.
 */

export const FESTAG_NIGHT = {
  /** True OLED depth — portal / auth / docs canvas. */
  canvas: '#000000',
  /** Primary content panels — soft graphite, not crushing charcoal. */
  content: '#0D0D10',
  /** Sheets / secondary panels — one calm step up. */
  raised: '#151518',
  /** Popups, menus, floating sheets. */
  popup: '#1B1B20',
  /** Nested menus / highest elevation. */
  peak: '#232328',
  /** Hover wash over content. */
  hover: '#18181C',
  /** Active / pressed fill. */
  active: '#1E1E24',
  /** Input idle fill. */
  input: '#141418',
  /** Input focus / filled. */
  inputFocus: '#1A1A20',

  /** Soft ink — reduces glare vs #FFFFFF. */
  ink: '#E4E4EA',
  inkSecondary: 'rgba(228, 228, 234, 0.58)',
  inkMuted: 'rgba(228, 228, 234, 0.40)',
  inkFaint: 'rgba(228, 228, 234, 0.24)',
  inkDisabled: 'rgba(228, 228, 234, 0.18)',
  /** Nav idle. */
  inkNav: 'rgba(228, 228, 234, 0.52)',

  borderHairline: 'rgba(255, 255, 255, 0.045)',
  border: 'rgba(255, 255, 255, 0.065)',
  borderStrong: 'rgba(255, 255, 255, 0.10)',
  borderFocus: 'rgba(255, 255, 255, 0.16)',

  fillQuiet: 'rgba(255, 255, 255, 0.035)',
  fill: 'rgba(255, 255, 255, 0.055)',
  fillHover: 'rgba(255, 255, 255, 0.075)',
  fillActive: 'rgba(255, 255, 255, 0.10)',

  /** Soft cool-white primary CTA — less glare than pure #fff. */
  btnBg: '#F0F2F5',
  btnBgHover: '#DCE1E8',
  btnBgActive: '#CFD5DD',
  btnFg: '#1A1A1E',

  /** Auth idle CTA — quiet slate on OLED (ready flips to white in CSS). */
  btnQuietBg: 'rgba(186, 194, 210, 0.08)',
  btnQuietBgHover: 'rgba(186, 194, 210, 0.12)',
  btnQuietBgActive: 'rgba(186, 194, 210, 0.16)',
  btnQuietFg: 'rgba(228, 228, 234, 0.90)',
  btnQuietBorder: 'rgba(255, 255, 255, 0.08)',

  /** Soft scrim — enough separation, not a black wall. */
  backdrop: 'rgba(0, 0, 0, 0.55)',
  /** Tagro / lighter overlays. */
  backdropSoft: 'rgba(0, 0, 0, 0.28)',

  /** Desaturated semantics — readable, not neon. */
  green: '#4BC98E',
  greenBg: 'rgba(75, 201, 142, 0.12)',
  greenBorder: 'rgba(75, 201, 142, 0.22)',
  greenDark: '#3BB87C',
  amber: '#C9A45C',
  amberBg: 'rgba(201, 164, 92, 0.12)',
  amberDark: '#B08E48',
  red: '#D97272',
  redBg: 'rgba(217, 114, 114, 0.12)',
  blue: '#6BA8E8',
  blueBg: 'rgba(107, 168, 232, 0.12)',

  /** Focus accent (shared with auth Google-slate stroke). */
  accentSlate: '#5B647D',

  /** Developer portal dark canvas (separate surface). */
  devCanvas: '#121212',
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
`

/** Auth-only CTA override (keeps shared elevation ladder from html). */
export const FESTAG_NIGHT_AUTH_BTN_VARS = `
  --festag-btn-dark-bg: ${FESTAG_NIGHT.btnQuietBg};
  --festag-btn-dark-bg-hover: ${FESTAG_NIGHT.btnQuietBgHover};
  --festag-btn-dark-bg-active: ${FESTAG_NIGHT.btnQuietBgActive};
  --festag-btn-dark-fg: ${FESTAG_NIGHT.btnQuietFg};
  --festag-btn-dark-fg-hover: rgba(228, 228, 234, 0.98);
  --festag-btn-dark-fg-active: #e4e4ea;
  --festag-btn-dark-border: ${FESTAG_NIGHT.btnQuietBorder};
  --festag-btn-dark-border-hover: rgba(255, 255, 255, 0.12);
  --festag-btn-dark-border-active: rgba(255, 255, 255, 0.10);
  --festag-btn-dark-shadow: none;
  --festag-btn-dark-shadow-hover: none;
  --festag-btn-dark-shadow-active: none;
`
