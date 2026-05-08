'use client'
import { useEffect } from 'react'
import { applyAppearancePreferences, applyDensityMode, applyFontMode, applyTheme } from '@/lib/theme'
import type { DensityMode, FontMode, ThemeMode } from '@/lib/theme'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply on mount
    applyAppearancePreferences()
    // Update data-theme instantly when toggled (same tab)
    const themeHandler = (e: Event) => {
      if (e instanceof CustomEvent) applyTheme(e.detail as ThemeMode)
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
