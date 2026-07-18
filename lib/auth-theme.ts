'use client'

import { useCallback, useLayoutEffect, useState } from 'react'
import {
  applyAppearanceForPath,
  detectThemeSurface,
  getTheme,
  setTheme as persistTheme,
  parseThemeEventDetail,
  type PanelThemeMode,
  type ThemeSurface,
} from '@/lib/theme'

export type AuthThemeMode = PanelThemeMode

/** Canvas colors — auth light landings are pure white; portal canvas stays gray. */
export const AUTH_CANVAS: Record<AuthThemeMode, string> = {
  light: '#ffffff',
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
    const from = detectThemeSurface(window.location.pathname)
    const to = detectThemeSurface(path)
    applyAppearanceForPath(path)
    if (from !== to) {
      try { sessionStorage.setItem(PANEL_ENTER_KEY, to) } catch { /* noop */ }
      // Force paint of destination canvas before exit fade (avoids theme wobble).
      void document.documentElement.offsetHeight
    }
  } catch {
    applyAppearanceForPath(href)
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

export function useAuthTheme(surface: ThemeSurface) {
  // Stable SSR/client fallback — real preference applied in useLayoutEffect before paint.
  const fallback: AuthThemeMode = surface === 'dev' ? 'dark' : 'light'
  const [mode, setModeState] = useState<AuthThemeMode>(fallback)

  useLayoutEffect(() => {
    const stored = getTheme(surface)
    setModeState(stored)
    applyAuthTheme(stored, surface)
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
