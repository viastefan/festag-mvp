'use client'

/**
 * MobilePageDock — bottom sheet handle + zwei Aktions-Buttons.
 *
 * Pro Seite konfigurierbar (primary = breite Ghost-Pille, secondary = runder CTA).
 * Der Drag-Handle oben feuert `onDragUp` — typisch: Neues-Projekt-Sheet.
 */

import type { ReactNode } from 'react'
import { MOBILE_PAGE_DOCK_CSS } from '@/components/mobile/mobile-page-dock-styles'

export type MobileDockAction = {
  id: string
  label?: string
  icon: ReactNode
  onClick: () => void
  ariaLabel: string
}

type Props = {
  onDragUp: () => void
  primary: MobileDockAction
  secondary: MobileDockAction
}

function bindDragUp(onDragUp: () => void) {
  return (e: React.TouchEvent) => {
    const startY = e.touches[0].clientY
    const onMove = (ev: TouchEvent) => {
      if (startY - ev.touches[0].clientY > 40) {
        onDragUp()
        document.removeEventListener('touchmove', onMove)
        document.removeEventListener('touchend', onEnd)
      }
    }
    const onEnd = () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd, { once: true })
  }
}

export default function MobilePageDock({ onDragUp, primary, secondary }: Props) {
  return (
    <>
      <style>{MOBILE_PAGE_DOCK_CSS}</style>
      <div className="mpd-root" role="toolbar" aria-label="Seitenaktionen">
        <div className="mpd-shell">
          <div
            className="mpd-grip"
            role="separator"
            aria-label="Nach oben ziehen"
            onTouchStart={bindDragUp(onDragUp)}
          />
          <div className="mpd-row">
            <button
              type="button"
              className="mpd-ghost"
              onClick={primary.onClick}
              aria-label={primary.ariaLabel}
            >
              <span className="mpd-ghost-icon" aria-hidden>{primary.icon}</span>
              {primary.label ? <span className="mpd-ghost-label">{primary.label}</span> : null}
            </button>
            <button
              type="button"
              className="mpd-primary"
              onClick={secondary.onClick}
              aria-label={secondary.ariaLabel}
            >
              {secondary.icon}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
