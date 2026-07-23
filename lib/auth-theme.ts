'use client'

import { useCallback, useLayoutEffect, useState } from 'react'
import {
  applyAppearanceForPath,
  applyTheme,
  detectThemeSurface,
  getTheme,
  isAuthLandingPath,
  setTheme as persistTheme,
  parseThemeEventDetail,
  type PanelThemeMode,
  type ThemeSurface,
} from '@/lib/theme'

export type AuthThemeMode = PanelThemeMode

/** Canvas colors — auth light soft gray; dark OLED black (Client + Dev share). */
export const AUTH_CANVAS: Record<AuthThemeMode, string> = {
  light: '#f7f8f8',
  dark: '#000000',
  read: '#F7F4EC',
}

const PANEL_ENTER_KEY = 'festag_panel_enter'

export function applyAuthTheme(mode: AuthThemeMode, surface: ThemeSurface) {
  persistTheme(mode, surface)
}

/** Apply destination surface theme before client navigation so the canvas never flashes white. */
export function prepareAuthRouteTransition(href: string) {
  if (typeof window === 'undefined') return
  try {
    const path = new URL(href, window.location.origin).pathname
    const fromPath = window.location.pathname
    const from = detectThemeSurface(fromPath)
    const to = detectThemeSurface(path)
    if (from !== to) {
      try { sessionStorage.setItem(PANEL_ENTER_KEY, to) } catch { /* noop */ }
    }
    // Auth landing ↔ auth landing (client ↔ Dev): do not flip html theme while the
    // outgoing screen is still painted — that caused a visible hitch. Destination
    // applies its own theme in useAuthTheme / FOUC on mount.
    const authToAuth = isAuthLandingPath(fromPath) && isAuthLandingPath(path)
    if (!authToAuth) {
      applyAppearanceForPath(path)
      void document.documentElement.offsetHeight
    }
  } catch {
    applyAppearanceForPath(href)
    void document.documentElement.offsetHeight
  }
}

/**
 * Leave auth chrome (login / register / onboarding / Dev) for Docs or other public pages
 * without a soft-nav overlap flash of the previous screen.
 */
export function navigateLeavingAuthChrome(href: string) {
  if (typeof window === 'undefined') return
  try {
    const path = new URL(href, window.location.origin).pathname
    // Paint docs/legal canvas before fading auth — never flash portal gray under the exit.
    applyAppearanceForPath(path)
    void document.documentElement.offsetHeight
    document.querySelectorAll('.al-root, .dl-root').forEach((el) => {
      el.classList.add('exiting')
    })
    // Hard assign: FOUC script paints the destination canvas on load — no shared React tree flash.
    window.location.assign(path)
  } catch {
    window.location.assign(href)
  }
}

/** True when navigating client ↔ Dev panel (longer exit + enter animation). */
export function isCrossPanelAuthNav(href: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const path = new URL(href, window.location.origin).pathname
    return detectThemeSurface(window.location.pathname) !== detectThemeSurface(path)
  } catch {
    return false
  }
}

/** One-shot panel-enter flag after Dev ↔ client switch. */
export function consumePanelEnter(): ThemeSurface | null {
  if (typeof window === 'undefined') return null
  try {
    const v = sessionStorage.getItem(PANEL_ENTER_KEY)
    if (v === 'dev' || v === 'client') {
      sessionStorage.removeItem(PANEL_ENTER_KEY)
      return v
    }
  } catch { /* noop */ }
  return null
}

/** Prefer FOUC/html theme on the client so SSR fallback never paints light text on a white canvas. */
function readInitialAuthTheme(surface: ThemeSurface): AuthThemeMode {
  if (typeof document !== 'undefined') {
    const htmlSurface = document.documentElement.getAttribute('data-theme-surface')
    const attr = document.documentElement.getAttribute('data-theme')
    if (
      htmlSurface === surface
      && (attr === 'light' || attr === 'dark' || attr === 'read')
    ) {
      return attr
    }
    try {
      return getTheme(surface)
    } catch { /* noop */ }
  }
  return surface === 'dev' ? 'dark' : 'light'
}

export function useAuthTheme(surface: ThemeSurface) {
  // Client: match FOUC html attr / storage on first render. SSR: surface default.
  const [mode, setModeState] = useState<AuthThemeMode>(() => readInitialAuthTheme(surface))

  useLayoutEffect(() => {
    const stored = getTheme(surface)
    setModeState(stored)
    applyAuthTheme(stored, surface)
    // Keep html[data-theme] locked to the auth canvas — portal dark must not bleach light auth chrome.
    applyTheme(stored, surface)
  }, [surface])

  // Re-lock html whenever mode changes (toggle, storage, soft route) so translucent
  // dark tokens never sit on a light auth canvas and bleach inputs.
  useLayoutEffect(() => {
    applyAuthTheme(mode, surface)
    applyTheme(mode, surface)
  }, [mode, surface])

  useLayoutEffect(() => {
    const onTheme = (e: Event) => {
      const parsed = parseThemeEventDetail((e as CustomEvent).detail)
      if (!parsed || parsed.surface !== surface) return
      if (parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'read') {
        setModeState(parsed.mode)
      }
    }
    window.addEventListener('festag-theme', onTheme)
    return () => window.removeEventListener('festag-theme', onTheme)
  }, [surface])

  const setMode = useCallback(
    (next: AuthThemeMode) => {
      applyAuthTheme(next, surface)
      setModeState(next)
    },
    [surface],
  )

  return { mode, setMode, canvas: AUTH_CANVAS[mode] }
}
