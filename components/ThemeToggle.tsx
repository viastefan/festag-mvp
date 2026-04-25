'use client'
import { useState, useEffect } from 'react'
import { getTheme, setTheme, ThemeMode } from '@/lib/theme'

export default function ThemeToggle({ position = 'fixed' }: { position?: 'fixed' | 'relative' }) {
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => { setMode(getTheme()) }, [])

  function cycle() {
    const next: Record<ThemeMode, ThemeMode> = { dark: 'light', light: 'read', read: 'dark' }
    const n = next[mode]
    setMode(n)
    setTheme(n)
  }

  const icons: Record<ThemeMode, React.ReactNode> = {
    dark: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    light: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    read: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  }
  const labels: Record<ThemeMode, string> = { dark: 'Hell', light: 'Lese', read: 'Dunkel' }

  return (
    <button
      onClick={cycle}
      title={`Zu ${labels[mode]}-Modus wechseln`}
      style={{
        position: position === 'fixed' ? 'fixed' : 'relative',
        top: position === 'fixed' ? 16 : undefined,
        right: position === 'fixed' ? 16 : undefined,
        zIndex: 200,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 12px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        color: 'var(--text-secondary)',
        fontSize: 12, fontWeight: 600,
        cursor: 'pointer',
        transition: 'all .15s',
        backdropFilter: 'blur(12px)',
      }}
    >
      {icons[mode]}
      <span style={{ fontSize: 11, letterSpacing: '.04em' }}>
        {mode === 'dark' ? 'DARK' : mode === 'light' ? 'LIGHT' : 'READ'}
      </span>
    </button>
  )
}
