'use client'

/**
 * MobilePageDock — bottom sheet handle + zwei Aktions-Buttons.
 *
 * Pro Seite konfigurierbar (primary = breite Ghost-Pille, secondary = runder CTA).
 * Der Drag-Handle oben feuert `onDragUp` — typisch: Neues-Projekt-Sheet.
 */

import type { ReactNode } from 'react'
import {
  MOBILE_DOCK_SHELL_SHADOW,
  MOBILE_PRIMARY_ELEV,
  MOBILE_WHITE_BORDER,
  MOBILE_WHITE_ELEV,
} from '@/components/mobile/mobile-surface-tokens'

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

      <style jsx>{`
        .mpd-root {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 50;
          pointer-events: auto;
        }
        .mpd-shell {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
          background: #ffffff;
          border-radius: 36px 36px 0 0;
          box-shadow: ${MOBILE_DOCK_SHELL_SHADOW};
          padding: 10px 16px 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
        }
        .mpd-grip {
          width: 40px;
          height: 4px;
          margin-bottom: 14px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.12);
          flex-shrink: 0;
          cursor: grab;
          touch-action: none;
        }
        .mpd-row {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
        }
        .mpd-ghost {
          position: relative;
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 54px;
          padding: 0 20px;
          border: ${MOBILE_WHITE_BORDER};
          border-radius: 999px;
          background: #ffffff;
          color: #8e8e93;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 16px;
          font-weight: 400;
          letter-spacing: 0.005em;
          cursor: pointer;
          box-shadow: ${MOBILE_WHITE_ELEV};
          -webkit-tap-highlight-color: transparent;
        }
        .mpd-ghost:active {
          background: #f8f8f8;
          transform: scale(0.985);
        }
        .mpd-ghost-icon {
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #8e8e93;
          pointer-events: none;
        }
        .mpd-ghost-icon :global(svg) {
          width: 14px;
          height: 14px;
        }
        .mpd-ghost-label {
          width: 100%;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          pointer-events: none;
        }
        .mpd-primary {
          width: 54px;
          height: 54px;
          flex-shrink: 0;
          border: 0;
          border-radius: 999px;
          background: var(--btn-prim, #5b647d);
          color: var(--btn-prim-text, #ffffff);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          box-shadow: ${MOBILE_PRIMARY_ELEV};
          -webkit-tap-highlight-color: transparent;
        }
        .mpd-primary :global(svg) {
          width: 20px;
          height: 20px;
        }
        .mpd-primary:active {
          transform: scale(0.97);
          background: color-mix(in srgb, var(--btn-prim, #5b647d) 88%, #000);
        }

        :global([data-theme='dark']) .mpd-shell,
        :global([data-theme='classic-dark']) .mpd-shell {
          background: #1c1c1e;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.42);
        }
        :global([data-theme='dark']) .mpd-grip,
        :global([data-theme='classic-dark']) .mpd-grip {
          background: rgba(255, 255, 255, 0.22);
        }
        :global([data-theme='dark']) .mpd-ghost,
        :global([data-theme='classic-dark']) .mpd-ghost {
          background: rgba(255, 255, 255, 0.11);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #9aa0ac;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 2px 8px rgba(0, 0, 0, 0.42);
        }
        :global([data-theme='dark']) .mpd-ghost-icon,
        :global([data-theme='classic-dark']) .mpd-ghost-icon {
          color: #9aa0ac;
        }
        :global([data-theme='dark']) .mpd-primary,
        :global([data-theme='classic-dark']) .mpd-primary {
          background: #ffffff;
          color: #121214;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.92),
            0 2px 8px rgba(0, 0, 0, 0.36);
        }

        @media (max-width: 768px) {
          .mpd-root {
            display: flex;
          }
        }
      `}</style>
    </div>
  )
}
