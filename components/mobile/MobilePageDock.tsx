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
  /** Optional — omit for label-only ghost pills (Figma /projects dock). */
  icon?: ReactNode
  onClick: () => void
  ariaLabel: string
  disabled?: boolean
}

type Props = {
  onDragUp: () => void
  primary: MobileDockAction
  secondary: MobileDockAction
  /** Optional block between drag grip and action row (e.g. dashboard sheet rows). */
  inset?: ReactNode
  /** When set, dock shell uses this class (e.g. embedded in dashboard sheet). */
  shellClassName?: string
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

export default function MobilePageDock({ onDragUp, primary, secondary, inset, shellClassName }: Props) {
  return (
    <>
      <style>{MOBILE_PAGE_DOCK_CSS}</style>
      <div className="mpd-root" role="toolbar" aria-label="Seitenaktionen">
        <div className={`mpd-shell${shellClassName ? ` ${shellClassName}` : ''}`.trim()}>
          <div
            className="mpd-grip"
            role="separator"
            aria-label="Nach oben ziehen"
            onTouchStart={bindDragUp(onDragUp)}
          />
          {inset}
          <div className="mpd-row">
            <button
              type="button"
              className={`mpd-ghost${primary.disabled ? ' mpd-ghost--disabled' : ''}${primary.icon == null ? ' mpd-ghost--plain' : ''}`}
              onClick={primary.onClick}
              aria-label={primary.ariaLabel}
              disabled={primary.disabled}
            >
              {primary.icon != null ? (
                <span className="mpd-ghost-icon" aria-hidden>{primary.icon}</span>
              ) : null}
              {primary.label ? <span className="mpd-ghost-label">{primary.label}</span> : null}
            </button>
            <button
              type="button"
              className={`mpd-primary${secondary.disabled ? ' mpd-primary--disabled' : ''}`}
              onClick={secondary.onClick}
              aria-label={secondary.ariaLabel}
              disabled={secondary.disabled}
            >
              {secondary.icon}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
