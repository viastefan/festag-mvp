'use client'

/**
 * Festag Modal — shared primitive für ALLE Pop-ups.
 * Uses festag-popup-surface tokens (see festag-popup-styles.css).
 */

import { useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'form'

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
  /** Mobile bottom sheet — drag handle at top (hidden on desktop). */
  dragHandle?:  boolean
}

export default function Modal({
  open, onClose, size = 'md',
  title, subtitle, children, footer,
  noBackdropClose, bare, noPadding,
  surfaceClassName, closeIconSize = 12, headline, dragHandle,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = useFestagMobile()
  const sheetEntry = Boolean(dragHandle && isMobile)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const el = ref.current
    if (!el) return
    const focusable = el.querySelector<HTMLElement>(
      'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    requestAnimationFrame(() => focusable?.focus())
  }, [open])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="festag-modal-host"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => { if (!noBackdropClose) onClose() }}
        >
          <motion.div
            ref={ref}
            className={`festag-popup-surface festag-modal-surface festag-modal-surface--${size}${surfaceClassName ? ` ${surfaceClassName}` : ''}${sheetEntry ? ' festag-popup-mobile-sheet' : ''}`}
            initial={sheetEntry ? { opacity: 0, y: 28 } : { opacity: 0, scale: 0.985, y: 4 }}
            animate={sheetEntry ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={sheetEntry ? { opacity: 0, y: 16 } : { opacity: 0, scale: 0.985, y: 2 }}
            transition={{ duration: sheetEntry ? 0.26 : 0.20, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {sheetEntry && <FestagPopupDragHandle onDismiss={onClose} />}
            {!bare && (headline || title || subtitle) && (
              <div className="festag-modal-head">
                <div className="festag-modal-head-copy">
                  {headline ?? (
                    <>
                      {title && <h2 className="festag-modal-title">{title}</h2>}
                      {subtitle && <p className="festag-modal-subtitle">{subtitle}</p>}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="festag-modal-close"
                  onClick={onClose}
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
    primary:   { background: 'var(--btn-prim)',  color: 'var(--btn-prim-text)', border: 'none' },
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
