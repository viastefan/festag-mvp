'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  applyAppearanceForPath,
  applyDensityMode,
  applyFontMode,
  applyTheme,
  parseThemeEventDetail,
  type DensityMode,
  type FontMode,
} from '@/lib/theme'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'

  useEffect(() => {
    applyAppearanceForPath(pathname)
  }, [pathname])

  useEffect(() => {
    const themeHandler = (e: Event) => {
      const parsed = parseThemeEventDetail((e as CustomEvent).detail)
      if (!parsed) return
      applyTheme(parsed.mode, parsed.surface)
    }
    const fontHandler = (e: Event) => {
      if (e instanceof CustomEvent) applyFontMode(e.detail as FontMode)
    }
    const densityHandler = (e: Event) => {
      if (e instanceof CustomEvent) applyDensityMode(e.detail as DensityMode)
    }
    window.addEventListener('festag-theme', themeHandler)
    window.addEventListener('festag-font', fontHandler)
    window.addEventListener('festag-density', densityHandler)
    return () => {
      window.removeEventListener('festag-theme', themeHandler)
      window.removeEventListener('festag-font', fontHandler)
      window.removeEventListener('festag-density', densityHandler)
    }
  }, [])

  return <>{children}</>
}
