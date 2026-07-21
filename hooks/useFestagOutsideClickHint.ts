'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * First time the pointer enters the backdrop (outside the panel), show a calm
 * dismiss hint. Hide when leaving. Reappear only every Nth enter (default 3).
 *
 * Call `onOverlayPointer(true)` when the cursor is over the dimmed overlay
 * (not the panel), and `onOverlayPointer(false)` when it leaves that zone.
 */
export function useFestagOutsideClickHint(enabled = true, everyN = 3) {
  const [showHint, setShowHint] = useState(false)
  const entersRef = useRef(0)
  const overOverlayRef = useRef(false)

  const onOverlayPointer = useCallback((overOverlay: boolean) => {
    if (!enabled) return
    if (overOverlay) {
      if (overOverlayRef.current) return
      overOverlayRef.current = true
      entersRef.current += 1
      const n = entersRef.current
      if (n === 1 || n % everyN === 0) setShowHint(true)
    } else {
      if (!overOverlayRef.current) return
      overOverlayRef.current = false
      setShowHint(false)
    }
  }, [enabled, everyN])

  const reset = useCallback(() => {
    entersRef.current = 0
    overOverlayRef.current = false
    setShowHint(false)
  }, [])

  return { showHint, onOverlayPointer, reset }
}
