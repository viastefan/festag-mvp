/** Shared helpers for legal ↔ auth return navigation. */

import { prepareAuthRouteTransition } from '@/lib/auth-theme'
import { applyAppearanceForPath } from '@/lib/theme'

export const LEGAL_RETURN_KEY = 'festag_legal_return'

const LEGAL_PATH_PREFIXES = [
  '/agb',
  '/datenschutz',
  '/nutzungsbedingungen',
  '/impressum',
  '/widerruf',
  '/privacy',
  '/terms',
  '/terms-of-use',
] as const

export function isLegalPath(path: string): boolean {
  return LEGAL_PATH_PREFIXES.some(
    p => path === p || path.startsWith(`${p}/`),
  )
}

export function isAuthReturnPath(path: string): boolean {
  return (
    path === '/login' ||
    path === '/register' ||
    path === '/create-workspace' ||
    path.startsWith('/login/') ||
    path.startsWith('/register/') ||
    path.startsWith('/create-workspace/') ||
    path === '/dev/login' ||
    path.startsWith('/dev/login')
  )
}

/** Call before navigating from auth → legal so wordmark can return correctly. */
export function rememberLegalReturn(fromPath?: string) {
  if (typeof window === 'undefined') return
  try {
    const path = fromPath ?? window.location.pathname
    if (isAuthReturnPath(path)) {
      sessionStorage.setItem(LEGAL_RETURN_KEY, path)
    }
  } catch {
    /* noop */
  }
}

export function readLegalReturn(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = sessionStorage.getItem(LEGAL_RETURN_KEY)
    if (stored && isAuthReturnPath(stored)) return stored
  } catch {
    /* noop */
  }
  return null
}

export function captureLegalReturnFromReferrer() {
  if (typeof window === 'undefined') return
  try {
    const existing = readLegalReturn()
    if (existing) return
    const ref = document.referrer
    if (!ref) return
    const url = new URL(ref)
    if (url.origin !== window.location.origin) return
    if (isAuthReturnPath(url.pathname)) {
      sessionStorage.setItem(LEGAL_RETURN_KEY, url.pathname)
    }
  } catch {
    /* noop */
  }
}

/** Shared Zurück navigation for legal chrome (TOC rail + wordmark). */
export function navigateLegalBack(
  push: (href: string) => void,
  back: () => void,
  homeHref = '/',
) {
  const returnPath = readLegalReturn()
  if (returnPath && isAuthReturnPath(returnPath)) {
    // Paint auth canvas (black/white) BEFORE unmounting the white legal page.
    prepareAuthRouteTransition(returnPath)
    push(returnPath)
    return
  }
  if (typeof window !== 'undefined' && window.history.length > 1) {
    try {
      const ref = document.referrer
      if (ref) {
        const url = new URL(ref)
        if (url.origin === window.location.origin) applyAppearanceForPath(url.pathname)
      }
    } catch { /* noop */ }
    back()
    return
  }
  push(homeHref || '/')
}
