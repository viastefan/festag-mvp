'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, MagnifyingGlass, Moon, Sun } from '@phosphor-icons/react'
import { toggleAccountPanel } from '@/lib/account-panel-open'
import { getTheme, setTheme, parseThemeEventDetail, type PanelThemeMode } from '@/lib/theme'
import { getInitials, type UserProfile } from '@/lib/hooks/useUser'
import { useNotifications } from '@/hooks/useNotifications'

type Props = {
  user: UserProfile | null
}

export default function AppShellTopBar({ user }: Props) {
  const [themeMode, setThemeMode] = useState<PanelThemeMode>('light')
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { items: notifications, unread, markRead } = useNotifications({ limit: 10 })

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
    if (!notifOpen) return
    function onDoc(e: MouseEvent) {
      if (!notifRef.current?.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [notifOpen])

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
          className="fas-icon-btn fas-topbar-dup"
          aria-label="Suche"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
        >
          <MagnifyingGlass size={16} weight="light" />
        </button>

        <div className="fas-topbar-notif fas-topbar-dup" ref={notifRef}>
          <button
            type="button"
            className="fas-icon-btn"
            aria-label="Benachrichtigungen"
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Bell size={16} weight="light" />
            {unread > 0 ? <span className="fas-notif-dot" aria-hidden /> : null}
          </button>
          {notifOpen ? (
            <div className="fas-popover fas-notif-popover" role="dialog" aria-label="Notifications">
              {notifications.length === 0 ? (
                <p className="fas-notif-empty">No notifications yet.</p>
              ) : (
                <ul className="fas-notif-list">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        className="fas-notif-card"
                        onClick={() => {
                          void markRead(n.id)
                          if (n.link) window.location.href = n.link
                          setNotifOpen(false)
                        }}
                      >
                        <span className="fas-notif-card-title">{n.title}</span>
                        <span className="fas-notif-card-body">
                          {n.body || n.message || ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

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
