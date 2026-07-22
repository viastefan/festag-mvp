'use client'

/**
 * Festag Modal — shared primitive für ALLE Pop-ups.
 * Uses festag-popup-surface tokens (see festag-popup-styles.css).
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { useFestagOutsideClickHint, isPointerOverOverlay } from '@/hooks/useFestagOutsideClickHint'
import {
  FESTAG_SHEET_EASE,
  FESTAG_SHEET_EASE_OUT,
  FESTAG_SHEET_MS,
} from '@/lib/festag-sheet-motion'

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'form'

const SHEET_OPEN = {
  type: 'tween' as const,
  duration: FESTAG_SHEET_MS / 1000,
  ease: FESTAG_SHEET_EASE,
}
const SHEET_CLOSE = {
  type: 'tween' as const,
  duration: FESTAG_SHEET_MS / 1000,
  ease: FESTAG_SHEET_EASE_OUT,
}

interface Props {
  open:       boolean
  onClose:    () => void
  size?:      Size
  title?:     string
  subtitle?:  string
  children:   ReactNode
  footer?:    ReactNode
  noBackdropClose?: boolean
  bare?:       boolean
  noPadding?:  boolean
  surfaceClassName?: string
  closeIconSize?: number
  headline?:    ReactNode
  /** @deprecated Prefer title + subtitle as H1 + T1 body. Kept for API compatibility. */
  leadHeadline?: boolean
  /** Mobile bottom sheet — drag handle at top (hidden on desktop). */
  dragHandle?:  boolean
  /** Focus first field when opened (disable during loading phases). */
  autoFocus?:   boolean
}

export default function Modal({
  open, onClose, size = 'md',
  title, subtitle, children, footer,
  noBackdropClose, bare,   noPadding,
  surfaceClassName, closeIconSize = 12, headline, leadHeadline: _leadHeadline, dragHandle,
  autoFocus = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = useFestagMobile()
  const sheetEntry = Boolean(dragHandle && isMobile)
  const dragControls = useDragControls()
  const [closing, setClosing] = useState(false)
  const [entered, setEntered] = useState(false)
  const { showHint, onOverlayPointer, reset: resetOutsideHint } =
    useFestagOutsideClickHint(open && !noBackdropClose, 1)

  const requestClose = useCallback(() => {
    if (noBackdropClose) return
    if (sheetEntry) setClosing(true)
    else onClose()
  }, [noBackdropClose, onClose, sheetEntry])

  useEffect(() => {
    if (open) resetOutsideHint()
  }, [open, resetOutsideHint])

  useEffect(() => {
    if (!open) {
      setClosing(false)
      setEntered(false)
      return
    }
    if (!sheetEntry) return
    const id = requestAnimationFrame(() => setEntered(true))
    return () => {
      cancelAnimationFrame(id)
      setEntered(false)
    }
  }, [open, sheetEntry])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, requestClose])

  useEffect(() => {
    if (!open || !autoFocus) return
    const el = ref.current
    if (!el) return
    const focusable = el.querySelector<HTMLElement>(
      'input[type="text"]:not([disabled]), input[type="search"]:not([disabled]), textarea:not([disabled]), input:not([type]):not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const id = requestAnimationFrame(() => focusable?.focus())
    return () => cancelAnimationFrame(id)
  }, [open, autoFocus])

  const onSheetDragEnd = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (noBackdropClose) return
    const sheetH = ref.current?.offsetHeight ?? window.innerHeight
    const draggedFar = info.offset.y > sheetH * 0.35
    const flickedDown = info.velocity.y > 700
    if (info.offset.y > 0 && (draggedFar || flickedDown)) setClosing(true)
  }, [noBackdropClose])

  if (typeof document === 'undefined') return null

  const surfaceClass = [
    'festag-popup-surface',
    'festag-modal-surface',
    `festag-modal-surface--${size}`,
    sheetEntry ? 'festag-popup-mobile-sheet' : '',
    surfaceClassName ?? '',
  ].filter(Boolean).join(' ')

  const desktopMotion = size === 'form'
    ? {
        initial: { opacity: 0, scale: 0.97, y: 14 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98, y: 8 },
        transition: { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.92 },
      }
    : {
        initial: { opacity: 0, scale: 0.985, y: 4 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.985, y: 2 },
        transition: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
      }

  const sheetMotion = sheetEntry
    ? {
        drag: 'y' as const,
        dragControls,
        dragListener: false,
        dragConstraints: { top: 0 },
        dragElastic: 0,
        dragMomentum: false,
        onDragEnd: onSheetDragEnd,
        initial: { y: '100%' },
        animate: { y: (entered && !closing) ? 0 : '100%' },
        transition: closing ? SHEET_CLOSE : SHEET_OPEN,
        onAnimationComplete: () => {
          if (closing) {
            setClosing(false)
            onClose()
          }
        },
      }
    : desktopMotion

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={`festag-modal-host${sheetEntry ? ' festag-modal-host--sheet' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FESTAG_SHEET_MS / 1000, ease: FESTAG_SHEET_EASE }}
          onClick={() => { requestClose() }}
          onPointerMove={e => {
            onOverlayPointer(isPointerOverOverlay(e, '.festag-popup-surface, .festag-modal-surface'))
          }}
          onPointerLeave={() => onOverlayPointer(false)}
        >
          {showHint ? (
            <p className="festag-modal-outside-hint" aria-hidden="true">
              Durch Klicken schließen.
            </p>
          ) : null}
          <motion.div
            ref={ref}
            className={surfaceClass}
            {...sheetMotion}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {sheetEntry && (
              <FestagPopupDragHandle
                onDismiss={requestClose}
                onPointerDown={e => {
                  if (!noBackdropClose) dragControls.start(e)
                }}
              />
            )}
            {!bare && (headline || title || subtitle) && (
              <div className="festag-modal-head">
                <div className="festag-modal-head-copy">
                  {headline ?? (
                    <>
                      {title ? <h2 className="festag-modal-title">{title}</h2> : null}
                      {subtitle ? (
                        <p className="festag-modal-lede-t1">{subtitle}</p>
                      ) : null}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="festag-modal-close"
                  onClick={requestClose}
                  aria-label="Schließen"
                >
                  <X size={closeIconSize} weight="bold" />
                </button>
              </div>
            )}

            <div className={`festag-modal-body${noPadding ? ' festag-modal-body--flush' : ''}`}>
              {children}
            </div>

            {footer && (
              <div className="festag-modal-foot">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Standardisierte Modal-Buttons */
export function ModalButton({
  variant = 'secondary',
  onClick,
  disabled,
  loading,
  children,
}: {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  onClick?: () => void
  disabled?: boolean
  loading?:  boolean
  children:  ReactNode
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   {
      background: 'var(--festag-btn-dark-bg, var(--btn-prim))',
      color: 'var(--festag-btn-dark-fg, var(--btn-prim-text))',
      border: '0.7px solid var(--festag-btn-dark-border, transparent)',
      boxShadow: 'var(--festag-btn-dark-shadow, none)',
    },
    secondary: { background: 'var(--fp-pill, var(--surface-2))', color: 'var(--fp-text, var(--text))', border: '1px solid var(--fp-border, var(--border))' },
    danger:    { background: 'var(--red,#D14343)', color: '#fff', border: 'none' },
    ghost:     { background: 'transparent', color: 'var(--fp-muted, var(--text-secondary))', border: 'none' },
  }
  return (
    <button
      className="modal-cta"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        cursor: disabled || loading ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        fontFamily: 'inherit',
        ...styles[variant],
      }}
    >
      {loading && (
        <span style={{
          width: 11, height: 11,
          border: '1.5px solid currentColor', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin .7s linear infinite',
          display: 'inline-block', opacity: 0.8,
        }}/>
      )}
      {children}
    </button>
  )
}
