'use client'

import { useFestagSheetDismiss } from '@/hooks/useFestagSheetDismiss'

type Props = {
  onDismiss: () => void
  label?: string
}

export default function FestagPopupDragHandle({ onDismiss, label = 'Nach unten ziehen zum Schließen' }: Props) {
  const drag = useFestagSheetDismiss(onDismiss)

  return (
    <div
      className="festag-popup-drag-area"
      role="button"
      tabIndex={0}
      aria-label={label}
      onTouchStart={drag.onTouchStart}
      onTouchEnd={drag.onTouchEnd}
    >
      <div className="festag-popup-drag-handle" aria-hidden />
    </div>
  )
}
