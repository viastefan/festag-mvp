'use client'

import { useEffect, useRef, useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'

export type DevFilterOption = { value: string; label: string }

type Props = {
  value: string
  onChange: (value: string) => void
  options: DevFilterOption[]
  placeholder: string
  allLabel?: string
  className?: string
}

/** Dev-panel filter trigger + popover menu (Aeonik Regular via DevAppShell `.dev-menu`). */
export default function DevFilterDropdown({
  value,
  onChange,
  options,
  placeholder,
  allLabel = 'Alle',
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
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

  const selected = options.find(o => o.value === value)
  const label = selected?.label ?? placeholder

  return (
    <div className={`dev-filter-wrap${className ? ` ${className}` : ''}`} ref={wrapRef}>
      <button
        type="button"
        className={`dev-filter-trigger${open || value ? ' on' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(v => !v)}
      >
        <span>{label}</span>
        <CaretDown size={11} weight="bold" aria-hidden />
      </button>
      {open && (
        <div className="dev-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className={`dev-menu-item${!value ? ' on' : ''}`}
            onClick={() => { onChange(''); setOpen(false) }}
          >
            <span>{allLabel}</span>
            {!value && <span className="dev-menu-check">✓</span>}
          </button>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="menuitem"
              className={`dev-menu-item${value === opt.value ? ' on' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            >
              <span>{opt.label}</span>
              {value === opt.value && <span className="dev-menu-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
