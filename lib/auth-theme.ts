'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
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
import { FESTAG_NIGHT } from '@/lib/design-tokens/dark'
import { FESTAG_SAND } from '@/lib/design-tokens/sand-read'

export type AuthThemeMode = PanelThemeMode

/** Canvas colors — light auth uses full sand (same as Lesen); read = sand; dark = Night. */
export const AUTH_CANVAS: Record<AuthThemeMode, string> = {
  light: FESTAG_SAND.canvas,
  dark: FESTAG_NIGHT.canvas,
  read: FESTAG_SAND.canvas,
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

/** Mark destination for a soft auth enter (register → onboarding, panel switch, …). */
export function markPanelEnter(surface: ThemeSurface) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(PANEL_ENTER_KEY, surface)
  } catch { /* noop */ }
}

/** One-shot panel-enter flag after Dev ↔ client switch or auth→auth handoff. */
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

/** Soft-continue destinations that stay on the ivory auth canvas. */
export function isSoftAuthContinuePath(href: string): boolean {
  try {
    const path = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'https://festag.app').pathname
    return (
      path === '/onboarding' ||
      path.startsWith('/onboarding/') ||
      path === '/create-workspace' ||
      path.startsWith('/create-workspace/')
    )
  } catch {
    return href.startsWith('/onboarding') || href.startsWith('/create-workspace')
  }
}

/** Prefer FOUC/html theme on the client so SSR fallback never paints light text on a white canvas. */
function readInitialAuthTheme(surface: ThemeSurface): AuthThemeMode {
  // Must match SSR output exactly — never read `document` here. Reading FOUC
  // during client hydration made useState init return `dark` while the server
  // HTML still had `data-theme="light"`, and React could leave the attribute
  // stuck on light while hook state / aria / icons already said dark.
  return surface === 'dev' ? 'dark' : 'light'
}

/** Keep `.al-root` / `.dl-root` data-theme in sync even if React skips the attr write. */
function syncAuthRootThemeAttr(mode: AuthThemeMode) {
  if (typeof document === 'undefined') return
  document.querySelectorAll('.al-root, .dl-root').forEach((el) => {
    if (el.getAttribute('data-theme') !== mode) {
      el.setAttribute('data-theme', mode)
    }
  })
}

export function useAuthTheme(surface: ThemeSurface) {
  // Client: match FOUC html attr / storage on first render. SSR: surface default.
  const [mode, setModeState] = useState<AuthThemeMode>(() => readInitialAuthTheme(surface))

  // Sync once from storage. Do NOT also run a mode→DOM effect on the same
  // mount frame — that re-applied the SSR fallback (`light`) after storage
  // said `dark`, so React state and the canvas disagreed. First toggle then
  // looked like a no-op (state dark→light while already looking light).
  useLayoutEffect(() => {
    const stored = getTheme(surface)
    setModeState(stored)
    applyTheme(stored, surface)
    syncAuthRootThemeAttr(stored)
  }, [surface])

  // Re-assert root attr whenever mode changes (covers boot→shell mount +
  // hydration attribute desync where fiber props are dark but DOM stays light).
  useLayoutEffect(() => {
    syncAuthRootThemeAttr(mode)
  }, [mode])

  useLayoutEffect(() => {
    const onTheme = (e: Event) => {
      const parsed = parseThemeEventDetail((e as CustomEvent).detail)
      if (!parsed || parsed.surface !== surface) return
      if (parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'read') {
        setModeState(parsed.mode)
        applyTheme(parsed.mode, surface)
        syncAuthRootThemeAttr(parsed.mode)
      }
    }
    window.addEventListener('festag-theme', onTheme)
    return () => window.removeEventListener('festag-theme', onTheme)
  }, [surface])

  const setMode = useCallback(
    (next: AuthThemeMode) => {
      applyAuthTheme(next, surface)
      setModeState(next)
      syncAuthRootThemeAttr(next)
    },
    [surface],
  )

  const modeRef = useRef(mode)
  modeRef.current = mode

  /** Light ↔ dark from React state (source of truth for the icon / aria). */
  const toggleLightDark = useCallback(() => {
    const next: AuthThemeMode = modeRef.current === 'dark' ? 'light' : 'dark'
    applyAuthTheme(next, surface)
    syncAuthRootThemeAttr(next)
    setModeState(next)
  }, [surface])

  /**
   * Attach to the auth `<main>` so the first mount after the boot spinner
   * still gets the live mode (mode effect may have run before `.al-root` existed).
   */
  const rootRef = useCallback(
    (el: HTMLElement | null) => {
      if (el) el.setAttribute('data-theme', mode)
    },
    [mode],
  )

  return { mode, setMode, toggleLightDark, rootRef, canvas: AUTH_CANVAS[mode] }
}
