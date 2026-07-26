export type DocSheetThemePref = 'light' | 'dark' | 'auto'

export function isAppDarkTheme(theme: string | null | undefined): boolean {
  return theme === 'dark' || theme === 'classic-dark'
}

export function resolveSheetTheme(
  pref: unknown,
  appTheme?: string | null,
): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref
  return isAppDarkTheme(appTheme) ? 'dark' : 'light'
}

export function sheetThemeClass(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? 'doc-sheet--dark' : 'doc-sheet--light'
}
