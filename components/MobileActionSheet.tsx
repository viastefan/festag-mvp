'use client'

/**
 * MobileActionSheet — native-feel bottom sheet for the mobile FAB.
 *
 * Slides up from the bottom, has a drag handle, dark surface, rounded
 * top corners. Closes on outside tap, Esc, or close button. Respects
 * the bottom safe-area inset.
 *
 * Used by the global mobile bottom-nav: the centre + button opens it
 * with a set of context-aware actions provided by the current page.
 */

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X } from '@phosphor-icons/react'
import { useFestagPopupPresence } from '@/hooks/useFestagPopupPresence'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'

export type ActionSheetItem = {
  label: string
  meta?: string
  icon?: React.ReactNode
  href?: string
  onClick?: () => void
  tone?: 'default' | 'primary' | 'danger'
  disabled?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  items: ActionSheetItem[]
}

export default function MobileActionSheet({ open, onClose, title, subtitle, items }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const { mounted, visible } = useFestagPopupPresence(open)

  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [mounted, onClose])

  if (!mounted) return null

  return (
    <div
      className={`mas-overlay${visible ? ' is-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Aktionen'}
    >
      <button
        type="button"
        className="mas-backdrop"
        aria-label="Schließen"
        onClick={onClose}
      />
      <div className="mas-sheet festag-popup-surface festag-popup-mobile-sheet festag-popup-mobile-sheet--inline" ref={sheetRef}>
        <FestagPopupDragHandle onDismiss={onClose} />
        {(title || subtitle) && (
          <header className="mas-head">
            <div>
              {title && <h2>{title}</h2>}
              {subtitle && <p>{subtitle}</p>}
            </div>
            <button type="button" className="mas-close" onClick={onClose} aria-label="Schließen">
              <X size={15} weight="bold" />
            </button>
          </header>
        )}
        <div className="mas-list">
          {items.map((item, i) => {
            const cls = `mas-row${item.tone ? ` tone-${item.tone}` : ''}${item.disabled ? ' disabled' : ''}`
            const inner = (
              <>
                {item.icon && <span className="mas-icon">{item.icon}</span>}
                <span className="mas-text">
                  <strong>{item.label}</strong>
                  {item.meta && <span>{item.meta}</span>}
                </span>
              </>
            )
            if (item.href && !item.disabled) {
              return (
                <Link key={i} href={item.href} className={cls} onClick={onClose}>
                  {inner}
                </Link>
              )
            }
            return (
              <button
                key={i}
                type="button"
                className={cls}
                onClick={() => { if (!item.disabled) { item.onClick?.(); onClose() } }}
                disabled={item.disabled}
              >
                {inner}
              </button>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        .mas-overlay {
          position: fixed; inset: 0; z-index: 13500;
          display: flex; flex-direction: column; justify-content: flex-end;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          pointer-events: none;
        }
        .mas-overlay.is-visible { pointer-events: auto; }
        .mas-backdrop {
          position: absolute; inset: 0;
          background: var(--modal-backdrop, rgba(245, 245, 247, 0.72));
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          border: 0; padding: 0; cursor: default;
          opacity: 0;
          transition: opacity var(--festag-sheet-ms, 240ms) ease;
          pointer-events: auto;
        }
        .mas-overlay.is-visible .mas-backdrop { opacity: 1; }
        .mas-sheet {
          position: relative;
          width: 100%;
          border-top: none;
          border-radius: 20px 20px 0 0;
          padding: 0 6px calc(env(safe-area-inset-bottom, 0px) + 10px);
          max-height: 85dvh;
          overflow-y: auto;
          animation: none !important;
          opacity: 0;
          transform: translate3d(0, 28px, 0);
          transition:
            opacity var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease, cubic-bezier(.16, 1, .3, 1)),
            transform var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease, cubic-bezier(.16, 1, .3, 1));
          will-change: transform, opacity;
          pointer-events: auto;
        }
        .mas-overlay.is-visible .mas-sheet {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
        .mas-overlay:not(.is-visible) .mas-sheet {
          transition:
            opacity var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease-out, cubic-bezier(.32, .72, 0, 1)),
            transform var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease-out, cubic-bezier(.32, .72, 0, 1));
        }
        .mas-sheet.festag-popup-mobile-sheet--inline {
          box-shadow:
            0 -1px 2px rgba(0, 0, 0, 0.28),
            0 -24px 56px -20px rgba(0, 0, 0, 0.55);
        }

        .mas-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 10px 14px 12px;
        }
        .mas-head h2 {
          margin: 0; font-size: 15px; font-weight: 500; letter-spacing: -.005em;
          color: var(--fp-text, var(--text));
        }
        .mas-head p {
          margin: 3px 0 0; font-size: 12px; font-weight: 500; letter-spacing: .012em;
          color: var(--fp-muted, var(--text-muted));
        }
        .mas-close {
          width: 28px; height: 28px;
          border: 0; background: transparent;
          color: var(--fp-muted, var(--text-muted)); border-radius: 8px;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background .12s, color .12s;
        }
        .mas-close:hover { background: var(--fp-hover, color-mix(in srgb, var(--surface-2) 70%, transparent)); color: var(--fp-text, var(--text)); }

        .mas-list {
          display: flex; flex-direction: column;
          gap: 2px;
          padding: 2px 6px 4px;
        }
        .mas-row {
          width: 100%;
          display: grid; grid-template-columns: 32px 1fr; gap: 12px;
          align-items: center;
          padding: 12px 12px;
          border: 0; background: transparent;
          border-radius: 8px !important;
          color: var(--fp-text, var(--text));
          text-decoration: none;
          font: inherit;
          text-align: left;
          cursor: pointer;
          transition: background .12s;
        }
        .mas-row:hover, .mas-row:active {
          background: color-mix(in srgb, var(--surface-2) 70%, transparent);
        }
        .mas-row.tone-primary {
          background: color-mix(in srgb, var(--btn-prim) 12%, transparent);
        }
        .mas-row.tone-primary:hover, .mas-row.tone-primary:active {
          background: color-mix(in srgb, var(--btn-prim) 22%, transparent);
        }
        .mas-row.tone-danger { color: #ef4444; }
        .mas-row.tone-danger:hover { background: color-mix(in srgb, #ef4444 10%, transparent); }
        .mas-row.disabled { opacity: .42; cursor: not-allowed; }

        .mas-icon {
          width: 32px; height: 32px;
          border-radius: 10px;
          display: inline-flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--surface-2) 70%, transparent);
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .mas-row.tone-primary .mas-icon {
          background: color-mix(in srgb, var(--btn-prim) 22%, transparent);
          color: var(--btn-prim);
        }
        .mas-text {
          min-width: 0;
          display: flex; flex-direction: column; gap: 2px;
        }
        .mas-text strong {
          font-size: 13.5px; font-weight: 500; letter-spacing: -.005em;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .mas-text span {
          font-size: 11.5px; font-weight: 500; letter-spacing: .012em;
          color: var(--text-muted);
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          line-height: 1.4;
        }

        @media (prefers-reduced-motion: reduce) {
          .mas-backdrop, .mas-sheet {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}
