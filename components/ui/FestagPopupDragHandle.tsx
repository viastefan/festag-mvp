'use client'

import { useEffect, useState } from 'react'
import { useFestagSheetDismiss } from '@/hooks/useFestagSheetDismiss'
import { prefersReducedMotion } from '@/lib/festag-sheet-motion'

type Props = {
  onDismiss: () => void
  label?: string
  onPointerDown?: (e: React.PointerEvent) => void
  /**
   * Sync with sheet presence (`useFestagPopupPresence` / Modal enter-exit).
   * Defaults to true — grip fades in on mount. Pass false while the host exits
   * so the grip animates out with the panel.
   */
  visible?: boolean
}

export default function FestagPopupDragHandle({
  onDismiss,
  label = 'Nach unten ziehen zum Schließen',
  onPointerDown,
  visible = true,
}: Props) {
  const drag = useFestagSheetDismiss(onDismiss)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!visible) {
      setEntered(false)
      return
    }
    if (prefersReducedMotion()) {
      setEntered(true)
      return
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true))
    })
    return () => cancelAnimationFrame(id)
  }, [visible])

  return (
    <div
      className={`festag-popup-drag-area${entered ? ' is-grip-visible' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={onPointerDown}
      onTouchStart={onPointerDown ? undefined : drag.onTouchStart}
      onTouchEnd={onPointerDown ? undefined : drag.onTouchEnd}
    >
      <div className="festag-popup-drag-handle" aria-hidden />
    </div>
  )
}
