'use client'
import { useEffect } from 'react'
import { getTheme, applyTheme } from '@/lib/theme'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(getTheme())
  }, [])
  return <>{children}</>
}
