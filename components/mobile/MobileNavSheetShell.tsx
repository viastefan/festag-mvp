'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@phosphor-icons/react'
import { useFestagSheetDismiss } from '@/hooks/useFestagSheetDismiss'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  ariaLabel?: string
  footer?: ReactNode
  children: ReactNode
}

export default function MobileNavSheetShell({
  open,
  onClose,
  title,
  ariaLabel = 'Navigation',
  footer,
  children,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const drag = useFestagSheetDismiss(onClose)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    document.body.classList.add('festag-nav-sheet-open')
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('festag-nav-sheet-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div className="mns-root" role="presentation">
      <button type="button" className="mns-backdrop" aria-label="Schließen" onClick={onClose} />
      <div className="mns-panel">
        <nav className="mns-sheet" aria-label={ariaLabel}>
          <div
            className="mns-handle"
            aria-hidden
            onTouchStart={drag.onTouchStart}
            onTouchEnd={drag.onTouchEnd}
          >
            <div className="mns-handle-bar" />
          </div>

          <div className="mns-scroll">
            <header className="mns-head">
              <h2 className="mns-title">{title}</h2>
              <button type="button" className="mns-close" onClick={onClose} aria-label="Schließen">
                <X size={14} weight="bold" />
              </button>
            </header>
            {children}
          </div>

          {footer ? <footer className="mns-foot">{footer}</footer> : null}
        </nav>
      </div>
    </div>,
    document.body,
  )
}
