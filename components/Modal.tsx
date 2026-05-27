'use client'

/**
 * Festag Modal — shared primitive für ALLE Pop-ups.
 *
 * Ziele (premium, ruhig, Apple-Niveau):
 *  • Immer perfekt zentriert (vh + vw, viewport-fit)
 *  • Einheitlicher Backdrop: rgba(0,0,0,.45) + 8px backdrop-blur
 *  • Einheitliche Animation: scale .985 → 1, opacity 0 → 1, 180ms cubic-bezier
 *  • Einheitliche Border/Radius/Shadow
 *  • ESC schließt, Klick auf Backdrop schließt
 *  • Fokus-Trap intern (Tab bleibt im Modal)
 *  • Größen: sm (380), md (480), lg (640), xl (820), full (90vw)
 *  • Optional: header (Titel + close), footer (Aktionen)
 *
 * Migrationspfad: alle existierenden Pop-ups (DeleteProjectModal, TeamsModal,
 * NewTaskModal, NewProjectModal, AssignProjectModal, …) auf <Modal> umstellen.
 */

import { useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from '@phosphor-icons/react'

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full'

interface Props {
  open:       boolean
  onClose:    () => void
  size?:      Size
  title?:     string
  subtitle?:  string
  children:   ReactNode
  footer?:    ReactNode
  /** Backdrop-Klick deaktivieren (z.B. bei kritischen Aktionen) */
  noBackdropClose?: boolean
  /** Header & Close-Button ausblenden (für reine Confirm-Dialogs) */
  bare?:       boolean
  /** Padding um Body weglassen (für Custom-Layouts) */
  noPadding?:  boolean
}

const SIZE_PX: Record<Size, number | string> = {
  sm: 380, md: 480, lg: 640, xl: 820, full: 'calc(100vw - 32px)',
}

export default function Modal({
  open, onClose, size = 'md',
  title, subtitle, children, footer,
  noBackdropClose, bare, noPadding,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // ESC + outside click + body scroll-lock
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

  // Auto-focus first focusable
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

  const maxWidth = SIZE_PX[size]

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{    opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            background: 'var(--modal-backdrop, rgba(15,20,27,.45))',
            backdropFilter: 'blur(var(--modal-backdrop-blur, 8px)) saturate(140%)',
            WebkitBackdropFilter: 'blur(var(--modal-backdrop-blur, 8px)) saturate(140%)',
          }}
          onClick={() => { if (!noBackdropClose) onClose() }}
        >
          <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.985, y: 4 }}
            animate={{ opacity: 1, scale: 1,     y: 0 }}
            exit   ={{ opacity: 0, scale: 0.985, y: 2 }}
            transition={{ duration: 0.20, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{
              width: '100%',
              maxWidth,
              maxHeight: 'calc(100vh - 32px)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              fontFamily: 'inherit',
            }}
          >
            {!bare && (title || subtitle) && (
              <div style={{
                padding: '18px 22px 14px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                flexShrink: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {title && (
                    <h2 style={{
                      margin: 0,
                      fontSize: 16, fontWeight: 600,
                      letterSpacing: '-0.2px',
                      color: 'var(--text)',
                      lineHeight: 1.3,
                    }}>{title}</h2>
                  )}
                  {subtitle && (
                    <p style={{
                      margin: '3px 0 0',
                      fontSize: 12.5, color: 'var(--text-muted)',
                      lineHeight: 1.45,
                    }}>{subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Schließen"
                  style={{
                    width: 28, height: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 7,
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  <X size={12} weight="bold" />
                </button>
              </div>
            )}

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: noPadding ? 0 : '18px 22px',
              minHeight: 0,
            }}>
              {children}
            </div>

            {footer && (
              <div style={{
                padding: '12px 22px 16px',
                borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'flex-end', gap: 8,
                flexShrink: 0,
              }}>
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
    secondary: { background: 'var(--surface-2)', color: 'var(--text)',          border: '1px solid var(--border)' },
    danger:    { background: 'var(--red,#D14343)', color: '#fff',               border: 'none' },
    ghost:     { background: 'transparent',      color: 'var(--text-secondary)', border: 'none' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: 13, fontWeight: 600,
        cursor: disabled || loading ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 6,
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
