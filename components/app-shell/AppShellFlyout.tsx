'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from '@phosphor-icons/react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  /** one calm line under the title — what this panel is for */
  note?: string
  /** right-aligned header action, e.g. "Alle gelesen" */
  action?: ReactNode
  footer?: ReactNode
  children: ReactNode
  /** element that opened the panel — clicking it again must not re-open */
  anchorRef?: React.RefObject<HTMLElement>
  /** the sidebar element; the panel docks to its right edge and tucks under it */
  hostRef: React.RefObject<HTMLElement>
  labelledBy?: string
}

/**
 * The docked panel beside the sidebar.
 *
 * Festag has one surface for "the sidebar opened something": a sheet of the
 * same paper, the same height and the same corner radius, that slides out from
 * *underneath* the rail. It is portalled next to the sidebar and painted one
 * layer below it, so the rail's own edge overlaps the panel — which is what
 * makes it read as unfolding out of the sidebar rather than floating over it.
 *
 * Notifications, help and account all use it, so opening any of them feels
 * like the same movement instead of three different popups.
 */
export default function AppShellFlyout({
  open, onClose, title, note, action, footer, children, anchorRef, hostRef, labelledBy,
}: Props) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  /* The panel is a sibling of the sidebar inside .fas-root — that is the only
     place where "one layer behind the rail" is expressible without fighting
     the rail's own stacking context. */
  useEffect(() => {
    setHost(hostRef.current?.parentElement ?? null)
  }, [hostRef, open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (panelRef.current?.contains(target)) return
      if (anchorRef?.current?.contains(target)) return
      // Clicks inside the sidebar itself close the panel too — the rail and
      // the panel are one object, and the rail's next action wins.
      onClose()
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose, anchorRef])

  if (!host) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="fas-flyout-scrim"
            aria-label="Schließen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            className="fas-flyout"
            role="dialog"
            aria-label={labelledBy ? undefined : title}
            aria-labelledby={labelledBy}
            initial={{ opacity: 0, x: -22, scaleX: 0.985 }}
            animate={{ opacity: 1, x: 0, scaleX: 1 }}
            exit={{ opacity: 0, x: -16, scaleX: 0.99 }}
            transition={{ type: 'spring', stiffness: 460, damping: 40, mass: 0.85 }}
            style={{ transformOrigin: 'left center' }}
          >
            <header className="fas-flyout-head">
              <div className="fas-flyout-head-copy">
                <h2 className="fas-flyout-title">{title}</h2>
                {note ? <p className="fas-flyout-note">{note}</p> : null}
              </div>
              {action}
              <button type="button" className="fas-flyout-close" aria-label="Schließen" onClick={onClose}>
                <X size={14} weight="bold" />
              </button>
            </header>
            <div className="fas-flyout-body">{children}</div>
            {footer ? <footer className="fas-flyout-foot">{footer}</footer> : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    host,
  )
}
