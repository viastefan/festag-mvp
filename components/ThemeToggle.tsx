'use client'
import { useState, useEffect, useRef } from 'react'
import { getTheme, setTheme, ThemeMode } from '@/lib/theme'

const OPTIONS: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  {
    mode: 'dark',
    label: 'Dark',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  },
  {
    mode: 'light',
    label: 'Light',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  },
  {
    mode: 'read',
    label: 'Read',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  },
]

export default function ThemeToggle({ position = 'fixed' }: { position?: 'fixed' | 'relative' }) {
  const [mode, setMode] = useState<ThemeMode>('dark')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMode(getTheme())
    // Close on outside click
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function choose(m: ThemeMode) {
    setMode(m)
    setTheme(m)
    setOpen(false)
  }

  const current = OPTIONS.find(o => o.mode === mode) || OPTIONS[0]

  const wrapStyle: React.CSSProperties = position === 'fixed'
    ? { position: 'fixed', top: 16, right: 16, zIndex: 200 }
    : { position: 'relative' }

  return (
    <div ref={ref} style={wrapStyle}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          color: 'var(--text-secondary)',
          fontSize: 11, fontWeight: 700, letterSpacing: '.06em',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          fontFamily: 'inherit',
          transition: 'all .15s',
        }}
      >
        {current.icon}
        {current.label.toUpperCase()}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 6,
          boxShadow: 'var(--shadow-lg)',
          minWidth: 130,
          zIndex: 300,
        }}>
          {OPTIONS.map(opt => (
            <button
              key={opt.mode}
              onClick={() => choose(opt.mode)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 12px', borderRadius: 8, border: 'none',
                background: mode === opt.mode ? 'var(--card)' : 'transparent',
                color: mode === opt.mode ? 'var(--text)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: mode === opt.mode ? 700 : 500,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all .1s', textAlign: 'left',
              }}
            >
              {opt.icon}
              {opt.label}
              {mode === opt.mode && (
                <svg style={{ marginLeft: 'auto' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
