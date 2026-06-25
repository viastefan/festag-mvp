'use client'

import { useFestagSheetDismiss } from '@/hooks/useFestagSheetDismiss'

type Props = {
  onDismiss: () => void
  label?: string
  onPointerDown?: (e: React.PointerEvent) => void
}

export default function FestagPopupDragHandle({
  onDismiss,
  label = 'Nach unten ziehen zum Schließen',
  onPointerDown,
}: Props) {
  const drag = useFestagSheetDismiss(onDismiss)

  return (
    <div
      className="festag-popup-drag-area"
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
