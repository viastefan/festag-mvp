/**
 * Mobile auth entry chooser — remembers Client vs Developer for the tab session.
 * Desktop skips the chooser; footer / deep links set the choice and go straight in.
 */

export type AuthEntryChoice = 'client' | 'dev'

const STORAGE_KEY = 'festag_auth_entry'
export const AUTH_ENTRY_MOBILE_MQ = '(max-width: 768px)'

export function getAuthEntryChoice(): AuthEntryChoice | null {
  if (typeof window === 'undefined') return null
  try {
    const v = sessionStorage.getItem(STORAGE_KEY)
    if (v === 'client' || v === 'dev') return v
  } catch { /* noop */ }
  return null
}

export function rememberAuthEntry(choice: AuthEntryChoice) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, choice)
  } catch { /* noop */ }
}

export function authPathForChoice(choice: AuthEntryChoice): string {
  return choice === 'dev' ? '/dev/login' : '/login'
}

export function isAuthEntryMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.matchMedia(AUTH_ENTRY_MOBILE_MQ).matches
  } catch {
    return false
  }
}
