'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from '@phosphor-icons/react'
import { toggleAccountPanel } from '@/lib/account-panel-open'
import { getTheme, setTheme, parseThemeEventDetail, type PanelThemeMode } from '@/lib/theme'
import { getInitials, type UserProfile } from '@/lib/hooks/useUser'

type Props = {
  user: UserProfile | null
}

export default function AppShellTopBar({ user }: Props) {
  const [themeMode, setThemeMode] = useState<PanelThemeMode>('light')

  useEffect(() => {
    setThemeMode(getTheme('client'))
    const onTheme = (e: Event) => {
      const parsed = parseThemeEventDetail((e as CustomEvent).detail)
      if (!parsed) return
      if (parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'read') {
        setThemeMode(parsed.mode)
      }
    }
    window.addEventListener('festag-theme', onTheme)
    return () => window.removeEventListener('festag-theme', onTheme)
  }, [])

  function toggleTheme() {
    const next: PanelThemeMode = themeMode === 'dark' ? 'light' : 'dark'
    setTheme(next, 'client')
    setThemeMode(next)
  }

  const initials = getInitials(user)
  const isDark = themeMode === 'dark'

  return (
    <header className="fas-topbar">
      <div className="fas-topbar-left" />

      <div className="fas-topbar-right">
        <button
          type="button"
          className="fas-icon-btn"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggleTheme}
        >
          {isDark ? <Sun size={16} weight="light" /> : <Moon size={16} weight="light" />}
        </button>

        <button
          type="button"
          className="fas-icon-btn"
          aria-label="Account"
          onClick={() => toggleAccountPanel()}
          style={{ width: 'auto', padding: '0 6px', gap: 8 }}
        >
          <span className="fas-profile-avatar" style={{ width: 24, height: 24, fontSize: 10 }} aria-hidden="true">
            {initials}
          </span>
        </button>
      </div>
    </header>
  )
}
