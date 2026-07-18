'use client'

import { useCallback, useLayoutEffect, useState } from 'react'
import {
  applyAppearanceForPath,
  getTheme,
  setTheme as persistTheme,
  parseThemeEventDetail,
  type PanelThemeMode,
  type ThemeSurface,
} from '@/lib/theme'

export type AuthThemeMode = PanelThemeMode

/** Canvas colors — must match html/body from syncDocumentCanvas (no white flash). */
export const AUTH_CANVAS: Record<AuthThemeMode, string> = {
  light: '#F5F5F7',
  dark: '#000000',
  read: '#F7F4EC',
}

export function applyAuthTheme(mode: AuthThemeMode, surface: ThemeSurface) {
  persistTheme(mode, surface)
}

/** Apply destination surface theme before client navigation so the canvas never flashes white. */
export function prepareAuthRouteTransition(href: string) {
  if (typeof window === 'undefined') return
  try {
    const path = new URL(href, window.location.origin).pathname
    applyAppearanceForPath(path)
  } catch {
    applyAppearanceForPath(href)
  }
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
