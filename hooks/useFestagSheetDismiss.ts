'use client'

import { useCallback, useRef } from 'react'

/** Swipe-down on drag handle area to dismiss mobile sheets. */
export function useFestagSheetDismiss(onClose: () => void, threshold = 72) {
  const startY = useRef(0)
  const dragging = useRef(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? 0
    dragging.current = true
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return
    dragging.current = false
    const endY = e.changedTouches[0]?.clientY ?? startY.current
    if (endY - startY.current > threshold) onClose()
  }, [onClose, threshold])

  return { onTouchStart, onTouchEnd }
}
