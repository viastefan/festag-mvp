'use client'

/**
 * Auth theme trigger — moon/sun opens a calm popup: Read · Light · Dark.
 * Read = sandy cream (Claude / previous warm light). Light = cool elevated. Dark = Night.
 */

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, Moon, Sun } from '@phosphor-icons/react'
import type { AuthThemeMode } from '@/lib/auth-theme'

type Props = {
  mode: AuthThemeMode
  onChange: (mode: AuthThemeMode) => void
  className?: string
  /** Class on the moon/sun trigger (al-theme-icon / dl-theme-icon / ae-theme). */
  triggerClassName?: string
  /** Placement of the menu relative to the trigger. */
  menuPlacement?: 'top' | 'bottom'
}

const OPTIONS: Array<{
  id: AuthThemeMode
  label: string
  hint: string
  Icon: typeof Moon
}> = [
  {
    id: 'read',
    label: 'Read',
    hint: 'Sandig weiß, ruhig lesen',
    Icon: BookOpen,
  },
  {
    id: 'light',
    label: 'Light',
    hint: 'Klares Hellgrau',
    Icon: Sun,
  },
  {
    id: 'dark',
    label: 'Dark',
    hint: 'Festag Night',
    Icon: Moon,
  },
]

export default function AuthThemeMenu({
  mode,
  onChange,
  className = '',
  triggerClassName = 'al-theme-icon',
  menuPlacement = 'top',
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const TriggerIcon = mode === 'dark' ? Sun : mode === 'read' ? BookOpen : Moon

  return (
    <div
      ref={rootRef}
      className={`atm ${className}`.trim()}
      data-open={open ? 'true' : 'false'}
      data-placement={menuPlacement}
    >
      <style>{ATM_CSS}</style>
      <button
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

      {open ? (
        <div className="atm-menu" role="menu" aria-label="Erscheinungsbild">
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
                <span className="atm-item-copy">
                  <span className="atm-item-label">{opt.label}</span>
                  <span className="atm-item-hint">{opt.hint}</span>
                </span>
                {active ? (
                  <Check className="atm-item-check" size={14} weight="bold" aria-hidden />
                ) : (
                  <span className="atm-item-swatch" data-mode={opt.id} aria-hidden />
                )}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

const ATM_CSS = `
  .atm {
    position: relative;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }
  .atm-menu {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    z-index: 80;
    min-width: 216px;
    padding: 6px;
    border-radius: 12px;
    background: #FFFFFF;
    border: 1px solid rgba(40, 34, 28, 0.10);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.9) inset,
      0 8px 28px rgba(40, 34, 28, 0.10);
    animation: atmIn 0.16s ease-out both;
  }
  .atm[data-placement="top"] .atm-menu {
    bottom: calc(100% + 10px);
  }
  .atm[data-placement="bottom"] .atm-menu {
    top: calc(100% + 10px);
  }
  .al-root[data-theme="dark"] .atm-menu,
  .dl-root[data-theme="dark"] .atm-menu {
    background: #1A1A1E;
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  }
  .al-root[data-theme="read"] .atm-menu,
  .dl-root[data-theme="read"] .atm-menu {
    background: #FAF9F5;
    border-color: rgba(40, 34, 28, 0.10);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.85) inset,
      0 8px 28px rgba(40, 34, 28, 0.08);
  }
  .atm-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #1e1e20;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease;
  }
  .atm-item:hover {
    background: rgba(40, 34, 28, 0.05);
  }
  .atm-item.is-active {
    background: rgba(40, 34, 28, 0.07);
  }
  .al-root[data-theme="dark"] .atm-item,
  .dl-root[data-theme="dark"] .atm-item {
    color: rgba(245, 245, 247, 0.88);
  }
  .al-root[data-theme="dark"] .atm-item:hover,
  .al-root[data-theme="dark"] .atm-item.is-active,
  .dl-root[data-theme="dark"] .atm-item:hover,
  .dl-root[data-theme="dark"] .atm-item.is-active {
    background: rgba(255, 255, 255, 0.06);
  }
  .atm-item-ico {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(40, 34, 28, 0.05);
    color: #5c554c;
    flex-shrink: 0;
  }
  .al-root[data-theme="dark"] .atm-item-ico,
  .dl-root[data-theme="dark"] .atm-item-ico {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(245, 245, 247, 0.7);
  }
  .atm-item-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .atm-item-label {
    font-size: 13.5px;
    font-weight: 400;
    letter-spacing: -0.01em;
    line-height: 1.25;
  }
  .atm-item-hint {
    font-size: 11.5px;
    line-height: 1.3;
    color: #8a8378;
  }
  .al-root[data-theme="dark"] .atm-item-hint,
  .dl-root[data-theme="dark"] .atm-item-hint {
    color: rgba(245, 245, 247, 0.45);
  }
  .atm-item-check {
    flex-shrink: 0;
    color: #5B647D;
  }
  .atm-item-swatch {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    flex-shrink: 0;
    border: 1px solid rgba(40, 34, 28, 0.12);
  }
  .atm-item-swatch[data-mode="read"] { background: #F5F2ED; }
  .atm-item-swatch[data-mode="light"] { background: #E8E9ED; }
  .atm-item-swatch[data-mode="dark"] { background: #070708; border-color: rgba(255,255,255,0.12); }
  @keyframes atmIn {
    from { opacity: 0; transform: translateX(-50%) translateY(4px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  .atm[data-placement="bottom"] .atm-menu {
    animation-name: atmInDown;
  }
  @keyframes atmInDown {
    from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`
