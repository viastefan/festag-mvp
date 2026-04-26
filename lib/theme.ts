export type ThemeMode = 'dark' | 'light' | 'read'

export function getTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem('festag_theme') as ThemeMode) || 'dark'
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem('festag_theme', mode)
  document.documentElement.setAttribute('data-theme', mode)
  // Custom event so same-tab listeners update
  window.dispatchEvent(new CustomEvent('festag-theme', { detail: mode }))
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode)
}
