'use client'

import { useCallback, useLayoutEffect, useState } from 'react'
import {
  applyAppearanceForPath,
  applyTheme,
  detectThemeSurface,
  getTheme,
  setTheme as persistTheme,
  parseThemeEventDetail,
  type PanelThemeMode,
  type ThemeSurface,
} from '@/lib/theme'

export type AuthThemeMode = PanelThemeMode

/** Canvas colors — auth light landings are soft gray; dark matches .al-root #0f0f11. */
export const AUTH_CANVAS: Record<AuthThemeMode, string> = {
  light: '#f7f8f8',
  dark: '#0f0f11',
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
    const from = detectThemeSurface(window.location.pathname)
    const to = detectThemeSurface(path)
    applyAppearanceForPath(path)
    // Force paint of destination canvas before the next frame (avoids theme wobble / white flash).
    void document.documentElement.offsetHeight
    if (from !== to) {
      try { sessionStorage.setItem(PANEL_ENTER_KEY, to) } catch { /* noop */ }
    }
  } catch {
    applyAppearanceForPath(href)
    void document.documentElement.offsetHeight
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
