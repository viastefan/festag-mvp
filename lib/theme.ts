export type ThemeMode = 'system' | 'light' | 'pure-light' | 'read' | 'dark' | 'classic-dark' | 'custom'
export type FontMode = 'sf-pro' | 'aeonik'
export type DensityMode = 'comfortable' | 'compact'
export type ThemeSurface = 'client' | 'dev'

/** Themes exposed in client + dev panel switchers. */
export const PANEL_THEME_MODES = ['light', 'dark', 'read'] as const
export type PanelThemeMode = (typeof PANEL_THEME_MODES)[number]

const FONT_KEY = 'festag_font'
const DENSITY_KEY = 'festag_density'
const THEME_KEY_CLIENT = 'festag_theme_client'
const THEME_KEY_DEV = 'festag_theme_dev'
const THEME_KEY_LEGACY = 'festag_theme'

export const DEFAULT_THEME: Record<ThemeSurface, PanelThemeMode> = {
  client: 'light',
  dev: 'dark',
}

export type ThemeChangeDetail = {
  mode: ThemeMode
  surface: ThemeSurface
}

export function detectThemeSurface(pathname?: string): ThemeSurface {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')
  return path.startsWith('/dev') ? 'dev' : 'client'
}

/** Login/register landings use pure white in light mode (not portal gray canvas). */
export function isAuthLandingPath(pathname?: string): boolean {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')
  return (
    path === '/login' ||
    path === '/register' ||
    path === '/create-workspace' ||
    path === '/dev/login' ||
    path.startsWith('/login/') ||
    path.startsWith('/register/') ||
    path.startsWith('/create-workspace/') ||
    path.startsWith('/dev/login/')
  )
}

function themeStorageKey(surface: ThemeSurface) {
  return surface === 'dev' ? THEME_KEY_DEV : THEME_KEY_CLIENT
}

export function normalizePanelTheme(mode: ThemeMode | string | null | undefined, surface: ThemeSurface): PanelThemeMode {
  if (mode === 'light' || mode === 'pure-light') return 'light'
  if (mode === 'read') return 'read'
  if (mode === 'dark' || mode === 'classic-dark' || mode === 'custom') return 'dark'
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
    return surface === 'dev' ? 'dark' : 'light'
  }
  return DEFAULT_THEME[surface]
}

function readStoredTheme(surface: ThemeSurface): PanelThemeMode | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(themeStorageKey(surface))
    if (raw) return normalizePanelTheme(raw, surface)
    const legacy = localStorage.getItem(THEME_KEY_LEGACY)
    if (legacy) {
      const normalized = normalizePanelTheme(legacy, surface)
      localStorage.setItem(themeStorageKey(surface), normalized)
      return normalized
    }
  } catch { /* noop */ }
  return null
}

export function getTheme(surface?: ThemeSurface): PanelThemeMode {
  const s = surface ?? detectThemeSurface()
  return readStoredTheme(s) ?? DEFAULT_THEME[s]
}

function resolvedTheme(mode: ThemeMode) {
  if (mode === 'pure-light') return 'pure-light'
  if (mode === 'classic-dark') return 'classic-dark'
  if (mode === 'custom') return 'custom'
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
    return 'light'
  }
  return mode
}

export function parseThemeEventDetail(detail: unknown): ThemeChangeDetail | null {
  if (typeof detail === 'string') {
    return { mode: normalizePanelTheme(detail, detectThemeSurface()), surface: detectThemeSurface() }
  }
  if (detail && typeof detail === 'object' && 'mode' in detail) {
    const d = detail as { mode?: ThemeMode; surface?: ThemeSurface }
    const surface = d.surface ?? detectThemeSurface()
    return { mode: normalizePanelTheme(d.mode ?? DEFAULT_THEME[surface], surface), surface }
  }
  return null
}

export function syncDocumentCanvas(mode: ThemeMode, surface: ThemeSurface, pathname?: string) {
  if (typeof document === 'undefined') return
  const resolved = resolvedTheme(mode)
  const isDark = resolved === 'dark' || resolved === 'classic-dark' || resolved === 'custom'
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')
  const bg = isDark
    ? '#000000'
    : resolved === 'read'
      ? '#F7F4EC'
      : isAuthLandingPath(path)
        ? '#ffffff'
        : '#F5F5F7'
  const root = document.documentElement
  root.style.backgroundColor = bg
  root.style.colorScheme = isDark ? 'dark' : 'light'
  if (isAuthLandingPath(path)) root.setAttribute('data-auth-landing', '')
  else root.removeAttribute('data-auth-landing')
  if (document.body) {
    document.body.style.backgroundColor = bg
    document.body.classList.toggle('festag-theme-surface-client', surface === 'client')
    document.body.classList.toggle('festag-theme-surface-dev', surface === 'dev')
  }
}

export function setTheme(mode: ThemeMode, surface?: ThemeSurface) {
  const s = surface ?? detectThemeSurface()
  const normalized = normalizePanelTheme(mode, s)
  try { localStorage.setItem(themeStorageKey(s), normalized) } catch { /* noop */ }
  applyTheme(normalized, s)
  window.dispatchEvent(new CustomEvent<ThemeChangeDetail>('festag-theme', { detail: { mode: normalized, surface: s } }))
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

export function applyTheme(mode: ThemeMode, surface?: ThemeSurface) {
  const s = surface ?? detectThemeSurface()
  const normalized = normalizePanelTheme(mode, s)
  document.documentElement.setAttribute('data-theme', resolvedTheme(normalized))
  document.documentElement.setAttribute('data-theme-choice', normalized)
  document.documentElement.setAttribute('data-theme-surface', s)
  syncDocumentCanvas(normalized, s)
}

export function applyFontMode(mode: FontMode) {
  document.documentElement.setAttribute('data-font', mode)
}

export function applyDensityMode(mode: DensityMode) {
  document.documentElement.setAttribute('data-density', mode)
}

export function applyAppearanceForPath(pathname: string) {
  const surface = detectThemeSurface(pathname)
  const mode = getTheme(surface)
  document.documentElement.setAttribute('data-theme', resolvedTheme(mode))
  document.documentElement.setAttribute('data-theme-choice', mode)
  document.documentElement.setAttribute('data-theme-surface', surface)
  syncDocumentCanvas(mode, surface, pathname)
  applyFontMode(getFontMode())
  applyDensityMode(getDensityMode())
}

export function applyAppearancePreferences(pathname?: string) {
  applyAppearanceForPath(pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/'))
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
