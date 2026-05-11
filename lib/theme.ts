export type ThemeMode = 'system' | 'light' | 'pure-light' | 'read' | 'dark' | 'magic-blue' | 'classic-dark' | 'custom'
export type FontMode = 'sf-pro' | 'aeonik'
export type DensityMode = 'comfortable' | 'compact'

const FONT_KEY = 'festag_font'
const DENSITY_KEY = 'festag_density'

export function getTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'read'
  return (localStorage.getItem('festag_theme') as ThemeMode) || 'read'
}

export function getFontMode(): FontMode {
  if (typeof window === 'undefined') return 'aeonik'
  const saved = localStorage.getItem(FONT_KEY)
  return saved === 'sf-pro' ? 'sf-pro' : 'aeonik'
}

export function getDensityMode(): DensityMode {
  if (typeof window === 'undefined') return 'comfortable'
  return (localStorage.getItem(DENSITY_KEY) as DensityMode) || 'comfortable'
}

function resolvedTheme(mode: ThemeMode) {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
    return 'light'
  }
  if (mode === 'pure-light') return 'pure-light'
  if (mode === 'magic-blue') return 'magic-blue'
  if (mode === 'classic-dark') return 'classic-dark'
  if (mode === 'custom') return 'custom'
  return mode
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem('festag_theme', mode)
  applyTheme(mode)
  window.dispatchEvent(new CustomEvent('festag-theme', { detail: mode }))
}

export function setFontMode(mode: FontMode) {
  localStorage.setItem(FONT_KEY, mode)
  applyFontMode(mode)
  window.dispatchEvent(new CustomEvent('festag-font', { detail: mode }))
}

export function setDensityMode(mode: DensityMode) {
  localStorage.setItem(DENSITY_KEY, mode)
  applyDensityMode(mode)
  window.dispatchEvent(new CustomEvent('festag-density', { detail: mode }))
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', resolvedTheme(mode))
  document.documentElement.setAttribute('data-theme-choice', mode)
}

export function applyFontMode(mode: FontMode) {
  document.documentElement.setAttribute('data-font', mode)
}

export function applyDensityMode(mode: DensityMode) {
  document.documentElement.setAttribute('data-density', mode)
}

export function applyAppearancePreferences() {
  applyTheme(getTheme())
  applyFontMode(getFontMode())
  applyDensityMode(getDensityMode())
}
