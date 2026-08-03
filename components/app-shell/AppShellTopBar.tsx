'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Moon,
  Sun,
  SignOut,
  GearSix,
  User,
} from '@phosphor-icons/react'
import {
  appShellRoleLabel,
} from '@/components/app-shell/app-shell-nav'
import { prepareAuthRouteTransition } from '@/lib/auth-theme'
import { getTheme, setTheme, parseThemeEventDetail, type PanelThemeMode } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'
import { getDisplayName, getFullDisplayName, getInitials, type UserProfile } from '@/lib/hooks/useUser'

type Props = {
  user: UserProfile | null
}

type Menu = 'profile' | null

export default function AppShellTopBar({ user }: Props) {
  const [menu, setMenu] = useState<Menu>(null)
  const [themeMode, setThemeMode] = useState<PanelThemeMode>('light')
  const wrapRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!menu) return
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenu(null)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  function toggleTheme() {
    const next: PanelThemeMode = themeMode === 'dark' ? 'light' : 'dark'
    setTheme(next, 'client')
    setThemeMode(next)
  }

  async function signOut() {
    setMenu(null)
    prepareAuthRouteTransition('/login')
    await createClient().auth.signOut()
    window.location.assign('/login')
  }

  const displayName = getFullDisplayName(user) || getDisplayName(user) || 'You'
  const role = appShellRoleLabel(user?.role)
  const initials = getInitials(user)
  const isDark = themeMode === 'dark'

  return (
    <header className="fas-topbar" ref={wrapRef}>
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

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="fas-icon-btn"
            aria-label="Profile"
            aria-expanded={menu === 'profile'}
            onClick={() => setMenu(menu === 'profile' ? null : 'profile')}
            style={{ width: 'auto', padding: '0 6px', gap: 8 }}
          >
            <span className="fas-profile-avatar" style={{ width: 24, height: 24, fontSize: 10 }} aria-hidden="true">
              {initials}
            </span>
          </button>
          {menu === 'profile' && (
            <div className="fas-popover" role="menu">
              <div className="fas-popover-title" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ color: 'var(--fas-ink)', fontSize: 13.5 }}>{displayName}</span>
                <span>{role}</span>
              </div>
              <Link
                href="/overview/settings"
                className="fas-popover-item"
                onClick={() => setMenu(null)}
              >
                <GearSix size={14} weight="light" />
                Settings
              </Link>
              <Link
                href="/overview/settings"
                className="fas-popover-item"
                onClick={() => setMenu(null)}
              >
                <User size={14} weight="light" />
                Account
              </Link>
              <div className="fas-popover-sep" />
              <button type="button" className="fas-popover-item" onClick={signOut}>
                <SignOut size={14} weight="light" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
