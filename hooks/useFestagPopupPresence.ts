'use client'

import { useEffect, useState } from 'react'
import { FESTAG_SHEET_MS, prefersReducedMotion } from '@/lib/festag-sheet-motion'

/**
 * Mount / visible presence for CSS-transition sheets (is-visible pattern).
 * Exit delay matches sheet animation only — no extra lag.
 */
export function useFestagPopupPresence(open: boolean) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      if (prefersReducedMotion()) {
        setVisible(true)
        return
      }
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(id)
    }

    setVisible(false)
    if (prefersReducedMotion()) {
      setMounted(false)
      return
    }
    const t = window.setTimeout(() => setMounted(false), FESTAG_SHEET_MS)
    return () => window.clearTimeout(t)
  }, [open])

  return { mounted, visible }
}
