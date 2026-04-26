'use client'
import { useEffect } from 'react'
import { getTheme, applyTheme, ThemeMode } from '@/lib/theme'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply on mount
    applyTheme(getTheme())
    // Update data-theme instantly when toggled (same tab)
    const handler = (e: Event) => {
      if (e instanceof CustomEvent) applyTheme(e.detail as ThemeMode)
    }
    window.addEventListener('festag-theme', handler)
    return () => window.removeEventListener('festag-theme', handler)
  }, [])
  return <>{children}</>
}
