'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getTheme,
  setTheme as persistTheme,
  parseThemeEventDetail,
  type PanelThemeMode,
  type ThemeSurface,
} from '@/lib/theme'

export type AuthThemeMode = PanelThemeMode

/** Canvas colors aligned with portal surfaces (Codex light, OLED dark, warm read). */
export const AUTH_CANVAS: Record<AuthThemeMode, string> = {
  light: '#F5F5F7',
  dark: '#0c0c0e',
  read: '#F7F4EC',
}

export function applyAuthTheme(mode: AuthThemeMode, surface: ThemeSurface) {
  persistTheme(mode, surface)
}

export function useAuthTheme(surface: ThemeSurface) {
  const fallback: AuthThemeMode = surface === 'dev' ? 'dark' : 'light'
  const [mode, setModeState] = useState<AuthThemeMode>(fallback)

  useEffect(() => {
    const stored = getTheme(surface)
    setModeState(stored)
    applyAuthTheme(stored, surface)
  }, [surface])

  useEffect(() => {
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
