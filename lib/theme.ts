export type ThemeMode = 'system' | 'light' | 'pure-light' | 'read' | 'dark' | 'magic-blue' | 'classic-dark' | 'custom'

export function getTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'read'
  return (localStorage.getItem('festag_theme') as ThemeMode) || 'read'
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

export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', resolvedTheme(mode))
  document.documentElement.setAttribute('data-theme-choice', mode)
}
