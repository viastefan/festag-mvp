'use client'

/**
 * Auth theme trigger — icon matches the active mode (Sun / SunHorizon / Moon).
 * Menu portals above the footer so it is never clipped by auth overflow.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Moon, Sun, SunHorizon } from '@phosphor-icons/react'
import type { AuthThemeMode } from '@/lib/auth-theme'

type Props = {
  mode: AuthThemeMode
  onChange: (mode: AuthThemeMode) => void
  className?: string
  /** Class on the trigger (al-theme-icon / dl-theme-icon / ae-theme). */
  triggerClassName?: string
  /** Preferred placement; may flip if there is no room. */
  menuPlacement?: 'top' | 'bottom'
}

const OPTIONS: Array<{
  id: AuthThemeMode
  label: string
  Icon: typeof Moon
}> = [
  {
    id: 'read',
    label: 'Read',
    Icon: SunHorizon,
  },
  {
    id: 'light',
    label: 'Light',
    Icon: Sun,
  },
  {
    id: 'dark',
    label: 'Dark',
    Icon: Moon,
  },
]

function triggerIconFor(mode: AuthThemeMode) {
  if (mode === 'dark') return Moon
  if (mode === 'read') return SunHorizon
  return Sun
}

export default function AuthThemeMenu({
  mode,
  onChange,
  className = '',
  triggerClassName = 'al-theme-icon',
  menuPlacement = 'top',
}: Props) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; place: 'top' | 'bottom' } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    const btn = triggerRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const menuW = menuRef.current?.offsetWidth ?? 200
    const menuH = menuRef.current?.offsetHeight ?? 132
    const gap = 10
    const pad = 12
    let place: 'top' | 'bottom' = menuPlacement
    if (place === 'top' && r.top < menuH + gap + pad) place = 'bottom'
    if (place === 'bottom' && window.innerHeight - r.bottom < menuH + gap + pad) place = 'top'

    let left = r.left + r.width / 2 - menuW / 2
    left = Math.max(pad, Math.min(left, window.innerWidth - menuW - pad))
    const top = place === 'top' ? r.top - gap - menuH : r.bottom + gap
    setCoords({ top, left, place })
  }, [menuPlacement])

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    updatePosition()
    const id = requestAnimationFrame(() => updatePosition())
    return () => cancelAnimationFrame(id)
  }, [open, updatePosition, mode])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onReposition() {
      updatePosition()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, updatePosition])

  const TriggerIcon = triggerIconFor(mode)

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            className="atm-menu"
            role="menu"
            aria-label="Erscheinungsbild"
            data-theme={mode}
            data-placement={coords?.place ?? menuPlacement}
            style={
              coords
                ? { top: coords.top, left: coords.left, visibility: 'visible' }
                : { top: 0, left: 0, visibility: 'hidden' }
            }
          >
            <style>{ATM_PORTAL_CSS}</style>
            {OPTIONS.map(opt => {
              const active = mode === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  className={`atm-item${active ? ' is-active' : ''}`}
                  data-mode={opt.id}
                  onClick={() => {
                    onChange(opt.id)
                    setOpen(false)
                  }}
                >
                  <span className="atm-item-ico" aria-hidden>
                    <opt.Icon size={15} weight="regular" />
                  </span>
                  <span className="atm-item-label">{opt.label}</span>
                  {active ? (
                    <Check className="atm-item-check" size={14} weight="bold" aria-hidden />
                  ) : (
                    <span className="atm-item-swatch" data-mode={opt.id} aria-hidden />
                  )}
                </button>
              )
            })}
          </div>,
          document.body,
        )
      : null

  return (
    <div
      ref={rootRef}
      className={`atm ${className}`.trim()}
      data-open={open ? 'true' : 'false'}
    >
      <style>{ATM_TRIGGER_CSS}</style>
      <button
        ref={triggerRef}
        type="button"
        className={`${triggerClassName} atm-trigger no-min-tap`.trim()}
        aria-label="Erscheinungsbild"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={e => e.preventDefault()}
        onClick={e => {
          setOpen(o => !o)
          ;(e.currentTarget as HTMLButtonElement).blur()
        }}
      >
        <TriggerIcon size={17} weight="regular" />
      </button>
      {menu}
    </div>
  )
}

const ATM_TRIGGER_CSS = `
  .atm {
    position: relative;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }
`

const ATM_PORTAL_CSS = `
  .atm-menu {
    position: fixed;
    z-index: 12000;
    box-sizing: border-box;
    min-width: 188px;
    padding: 6px;
    border-radius: var(--festag-plate-radius, 12px);
    background: #FFFFFF;
    border: 1px solid rgba(15, 23, 42, 0.055);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.88) inset,
      0 0 0 0.5px rgba(15, 23, 42, 0.04),
      0 8px 28px rgba(15, 23, 42, 0.10);
    animation: atmIn 0.15s cubic-bezier(.16, 1, .3, 1) both;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
  }
  .atm-menu[data-theme="dark"] {
    background: var(--festag-black-popup, #1A1A1E);
    border-color: rgba(255, 255, 255, 0.06);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.48);
  }
  .atm-menu[data-theme="read"] {
    background: #FFFFFF;
    border-color: rgba(40, 34, 28, 0.08);
  }
  .atm-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 40px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #1e1e20;
    font: inherit;
    font-size: 13.5px;
    font-weight: 400;
    letter-spacing: -0.01em;
    line-height: 1.25;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease;
  }
  .atm-item:hover {
    background: rgba(15, 23, 42, 0.04);
  }
  .atm-item.is-active {
    background: rgba(15, 23, 42, 0.06);
  }
  .atm-menu[data-theme="dark"] .atm-item {
    color: rgba(245, 245, 247, 0.9);
  }
  .atm-menu[data-theme="dark"] .atm-item:hover,
  .atm-menu[data-theme="dark"] .atm-item.is-active {
    background: rgba(255, 255, 255, 0.06);
  }
  .atm-item-ico {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.04);
    color: #5c5c62;
    flex-shrink: 0;
  }
  .atm-menu[data-theme="read"] .atm-item-ico {
    background: rgba(40, 34, 28, 0.05);
    color: #5c554c;
  }
  .atm-menu[data-theme="dark"] .atm-item-ico {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(245, 245, 247, 0.72);
  }
  .atm-item-label {
    flex: 1;
    min-width: 0;
  }
  .atm-item-check {
    flex-shrink: 0;
    color: #5B647D;
  }
  .atm-menu[data-theme="read"] .atm-item-check {
    color: #5C554C;
  }
  .atm-menu[data-theme="dark"] .atm-item-check {
    color: rgba(245, 245, 247, 0.75);
  }
  .atm-item-swatch {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    flex-shrink: 0;
    border: 1px solid rgba(15, 23, 42, 0.10);
  }
  .atm-item-swatch[data-mode="read"] { background: #FAF9F5; }
  .atm-item-swatch[data-mode="light"] { background: #FFFFFF; border-color: rgba(15,23,42,0.12); }
  .atm-item-swatch[data-mode="dark"] { background: #070708; border-color: rgba(255,255,255,0.14); }
  @keyframes atmIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .atm-menu[data-placement="bottom"] {
    animation-name: atmInDown;
  }
  @keyframes atmInDown {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
`
