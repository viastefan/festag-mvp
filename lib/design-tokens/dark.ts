/**
 * Festag Night — canonical dark design tokens (2026).
 *
 * Hip-hop OLED: true-black canvas, deeper graphite elevations (not washed gray),
 * soft ink (not pure white), quiet hairlines, desaturated semantics.
 * Single source of truth for FOUC, theme.ts, CSS, and surface remappers.
 */

export const FESTAG_NIGHT = {
  /** True OLED depth — portal / auth / docs canvas. */
  canvas: '#000000',
  /** Primary content panels — near-black graphite. */
  content: '#08080A',
  /** Sheets / secondary panels — one calm step up. */
  raised: '#0E0E12',
  /** Popups, menus, floating sheets — still dark, not light-gray. */
  popup: '#121218',
  /** Nested menus / highest elevation. */
  peak: '#18181E',
  /** Hover wash over content. */
  hover: '#141418',
  /** Active / pressed fill. */
  active: '#1A1A20',
  /** Input idle fill — raised enough to read on OLED. */
  input: '#14141A',
  /** Input focus / filled. */
  inputFocus: '#1A1A20',

  /** Soft ink — reduces glare vs #FFFFFF. */
  ink: '#E8E8EE',
  inkSecondary: 'rgba(232, 232, 238, 0.55)',
  inkMuted: 'rgba(232, 232, 238, 0.38)',
  inkFaint: 'rgba(232, 232, 238, 0.22)',
  inkDisabled: 'rgba(232, 232, 238, 0.16)',
  /** Nav idle. */
  inkNav: 'rgba(232, 232, 238, 0.48)',

  borderHairline: 'rgba(255, 255, 255, 0.04)',
  border: 'rgba(255, 255, 255, 0.06)',
  borderStrong: 'rgba(255, 255, 255, 0.10)',
  borderFocus: 'rgba(255, 255, 255, 0.14)',

  fillQuiet: 'rgba(255, 255, 255, 0.03)',
  fill: 'rgba(255, 255, 255, 0.05)',
  fillHover: 'rgba(255, 255, 255, 0.07)',
  fillActive: 'rgba(255, 255, 255, 0.09)',

  /** Soft cool-white primary CTA — less glare than pure #fff. */
  btnBg: '#F0F2F5',
  btnBgHover: '#DCE1E8',
  btnBgActive: '#CFD5DD',
  btnFg: '#1A1A1E',

  /** Auth idle CTA — readable slate on OLED (ready flips to white in CSS). */
  btnQuietBg: 'rgba(186, 194, 210, 0.12)',
  btnQuietBgHover: 'rgba(186, 194, 210, 0.18)',
  btnQuietBgActive: 'rgba(186, 194, 210, 0.24)',
  btnQuietFg: 'rgba(232, 232, 238, 0.94)',
  btnQuietBorder: 'rgba(255, 255, 255, 0.12)',

  /** Soft scrim — enough separation, not a black wall. */
  backdrop: 'rgba(0, 0, 0, 0.62)',
  /** Tagro / lighter overlays. */
  backdropSoft: 'rgba(0, 0, 0, 0.34)',

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

  /** Developer portal dark canvas — very dark green / warm olive OLED. */
  devCanvas: '#0e0f0c',
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
  --festag-btn-dark-fg-hover: rgba(232, 232, 238, 0.98);
  --festag-btn-dark-fg-active: #e8e8ee;
  --festag-btn-dark-border: ${FESTAG_NIGHT.btnQuietBorder};
  --festag-btn-dark-border-hover: rgba(255, 255, 255, 0.12);
  --festag-btn-dark-border-active: rgba(255, 255, 255, 0.10);
  --festag-btn-dark-shadow: none;
  --festag-btn-dark-shadow-hover: none;
  --festag-btn-dark-shadow-active: none;
`
