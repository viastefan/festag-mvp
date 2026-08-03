'use client'

/**
 * Account panel — docks to the right of the sidebar (same language as Search).
 * Abstract graphic header · large Create Workspace hint · menu below.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  GearSix,
  User,
  SignOut,
  Plus,
  Moon,
  Sun,
} from '@phosphor-icons/react'
import {
  CLOSE_ACCOUNT_PANEL_EVENT,
  OPEN_ACCOUNT_PANEL_EVENT,
  TOGGLE_ACCOUNT_PANEL_EVENT,
} from '@/lib/account-panel-open'
import { openWorkspaceCreateWizard } from '@/lib/workspace-create-open'
import { prepareAuthRouteTransition } from '@/lib/auth-theme'
import {
  getTheme,
  setTheme,
  parseThemeEventDetail,
  type PanelThemeMode,
} from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'
import {
  getDisplayName,
  getFullDisplayName,
  getInitials,
  type UserProfile,
} from '@/lib/hooks/useUser'
import { appShellRoleLabel } from '@/components/app-shell/app-shell-nav'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import {
  FESTAG_SHEET_EASE,
  FESTAG_SHEET_MS,
} from '@/lib/festag-sheet-motion'

type Props = {
  user: UserProfile | null
}

export default function AppShellAccountPanel({ user }: Props) {
  const [open, setOpen] = useState(false)
  const [themeMode, setThemeMode] = useState<PanelThemeMode>('light')
  const isMobile = useFestagMobile()

  const displayName = getFullDisplayName(user) || getDisplayName(user) || 'You'
  const role = appShellRoleLabel(user?.role)
  const initials = getInitials(user)
  const isDark = themeMode === 'dark'

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
    function onOpen() { setOpen(true) }
    function onClose() { setOpen(false) }
    function onToggle() { setOpen((v) => !v) }
    window.addEventListener(OPEN_ACCOUNT_PANEL_EVENT, onOpen)
    window.addEventListener(CLOSE_ACCOUNT_PANEL_EVENT, onClose)
    window.addEventListener(TOGGLE_ACCOUNT_PANEL_EVENT, onToggle)
    return () => {
      window.removeEventListener(OPEN_ACCOUNT_PANEL_EVENT, onOpen)
      window.removeEventListener(CLOSE_ACCOUNT_PANEL_EVENT, onClose)
      window.removeEventListener(TOGGLE_ACCOUNT_PANEL_EVENT, onToggle)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    if (isMobile) document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, isMobile])

  function close() {
    setOpen(false)
  }

  function createWorkspace() {
    close()
    openWorkspaceCreateWizard()
  }

  function toggleTheme() {
    const next: PanelThemeMode = themeMode === 'dark' ? 'light' : 'dark'
    setTheme(next, 'client')
    setThemeMode(next)
  }

  async function signOut() {
    close()
    prepareAuthRouteTransition('/login')
    await createClient().auth.signOut()
    window.location.assign('/login')
  }

  const dock = !isMobile
  const panelClass = [
    'fas-account-panel',
    'festag-popup-surface',
    dock ? 'fas-account-panel--dock' : 'festag-popup-mobile-sheet',
  ].join(' ')

  return (
    <AnimatePresence>
      {open ? (
        <>
          <style>{ACCOUNT_PANEL_CSS}</style>
          <motion.div
            className={`fas-account-backdrop${dock ? ' fas-account-backdrop--dock' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FESTAG_SHEET_MS / 1000, ease: FESTAG_SHEET_EASE }}
            onClick={close}
            aria-hidden
          />
          <motion.aside
            className={panelClass}
            role="dialog"
            aria-modal="true"
            aria-label="Account"
            style={dock ? { transformOrigin: 'left center' } : undefined}
            initial={dock
              ? { opacity: 0, x: -18, scaleX: 0.985 }
              : { y: '100%' }}
            animate={dock
              ? { opacity: 1, x: 0, scaleX: 1 }
              : { y: 0 }}
            exit={dock
              ? { opacity: 0, x: -12, scaleX: 0.99 }
              : { y: '100%' }}
            transition={dock
              ? { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }
              : { type: 'tween', duration: FESTAG_SHEET_MS / 1000, ease: FESTAG_SHEET_EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            {!dock ? (
              <FestagPopupDragHandle onDismiss={close} visible />
            ) : null}

            <div className="fas-account-art" aria-hidden="true">
              <svg className="fas-account-art-svg" viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="fas-acc-bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--fas-acc-art-a)" />
                    <stop offset="100%" stopColor="var(--fas-acc-art-b)" />
                  </linearGradient>
                  <radialGradient id="fas-acc-glow" cx="0.28" cy="0.2" r="0.7">
                    <stop offset="0%" stopColor="var(--fas-acc-art-glow)" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="var(--fas-acc-art-glow)" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="320" height="140" fill="url(#fas-acc-bg)" />
                <rect width="320" height="140" fill="url(#fas-acc-glow)" />
                <g opacity="0.55" fill="none" stroke="var(--fas-acc-art-line)" strokeWidth="1.2">
                  <circle cx="248" cy="42" r="38" />
                  <circle cx="248" cy="42" r="22" />
                  <circle cx="248" cy="42" r="8" fill="var(--fas-acc-art-line)" stroke="none" opacity="0.85" />
                </g>
                <g opacity="0.35" fill="var(--fas-acc-art-line)">
                  <rect x="28" y="28" width="18" height="18" rx="4" />
                  <rect x="52" y="28" width="18" height="18" rx="4" opacity="0.55" />
                  <rect x="28" y="52" width="18" height="18" rx="4" opacity="0.7" />
                  <rect x="52" y="52" width="18" height="18" rx="4" opacity="0.4" />
                  <rect x="76" y="40" width="18" height="18" rx="4" opacity="0.5" />
                </g>
                <g opacity="0.4" fill="var(--fas-acc-art-line)">
                  <circle cx="150" cy="96" r="3.2" />
                  <circle cx="168" cy="88" r="2.2" />
                  <circle cx="186" cy="98" r="2.8" />
                  <circle cx="204" cy="84" r="1.8" />
                  <circle cx="132" cy="84" r="2" />
                </g>
              </svg>
              <div className="fas-account-art-fade" />
            </div>

            <div className="fas-account-body">
              <button
                type="button"
                className="fas-account-create"
                onClick={createWorkspace}
              >
                <span className="fas-account-create-icon" aria-hidden="true">
                  <Plus size={18} weight="bold" />
                </span>
                <span className="fas-account-create-copy">
                  <span className="fas-account-create-title">Workspace erstellen</span>
                  <span className="fas-account-create-support">
                    Start your digital operating environment.
                  </span>
                </span>
              </button>

              <div className="fas-account-identity">
                <span className="fas-account-avatar" aria-hidden="true">{initials}</span>
                <span className="fas-account-id-copy">
                  <span className="fas-account-name">{displayName}</span>
                  <span className="fas-account-role">{role}</span>
                </span>
              </div>

              <nav className="fas-account-menu" aria-label="Account">
                <Link
                  href="/overview/settings"
                  className="fas-account-item"
                  onClick={close}
                >
                  <GearSix size={16} weight="light" />
                  Settings
                </Link>
                <Link
                  href="/overview/settings"
                  className="fas-account-item"
                  onClick={close}
                >
                  <User size={16} weight="light" />
                  Account
                </Link>
                <button type="button" className="fas-account-item" onClick={toggleTheme}>
                  {isDark ? <Sun size={16} weight="light" /> : <Moon size={16} weight="light" />}
                  {isDark ? 'Light mode' : 'Dark mode'}
                </button>
                <div className="fas-account-sep" />
                <button type="button" className="fas-account-item" onClick={() => void signOut()}>
                  <SignOut size={16} weight="light" />
                  Sign out
                </button>
              </nav>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}

const ACCOUNT_PANEL_CSS = `
.fas-account-backdrop {
  position: fixed;
  inset: 0;
  z-index: 81;
  background: var(--modal-backdrop, rgba(245, 245, 247, 0.72));
}
.fas-account-backdrop--dock {
  background: var(--modal-backdrop, rgba(245, 245, 247, 0.55));
}
html[data-theme="dark"] .fas-account-backdrop,
html[data-theme="classic-dark"] .fas-account-backdrop {
  background: var(--modal-backdrop, rgba(7, 7, 8, 0.80));
}

.fas-account-panel {
  --fas-acc-art-a: #E8ECF4;
  --fas-acc-art-b: #D5DCE8;
  --fas-acc-art-glow: #FFFFFF;
  --fas-acc-art-line: rgba(30, 40, 60, 0.22);

  position: fixed;
  z-index: 84;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--fas-popover, #ffffff);
  color: var(--fas-ink, #1A1917);
}

.fas-account-panel--dock {
  top: 0;
  bottom: 0;
  left: var(--festag-sidebar-width, var(--fas-sidebar-w, 232px));
  width: min(360px, calc(100vw - var(--festag-sidebar-width, 232px)));
  border-radius: 0 24px 24px 0;
  border: 0;
  border-right: 1px solid var(--fas-popover-border, rgba(15, 23, 42, 0.06));
  box-shadow: none;
  transition: left .22s cubic-bezier(.16, 1, .3, 1);
}

html[data-theme="dark"] .fas-account-panel,
html[data-theme="classic-dark"] .fas-account-panel {
  --fas-acc-art-a: #151822;
  --fas-acc-art-b: #0E1118;
  --fas-acc-art-glow: rgba(91, 100, 125, 0.45);
  --fas-acc-art-line: rgba(235, 232, 227, 0.22);
  background: var(--festag-black-popup, #1A1A1E);
  border-right-color: rgba(255, 255, 255, 0.06);
}

.fas-account-art {
  position: relative;
  height: 132px;
  flex-shrink: 0;
  overflow: hidden;
}

.fas-account-art-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.fas-account-art-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 48px;
  background: linear-gradient(180deg, transparent, var(--fas-popover, #ffffff));
  pointer-events: none;
}

html[data-theme="dark"] .fas-account-art-fade,
html[data-theme="classic-dark"] .fas-account-art-fade {
  background: linear-gradient(180deg, transparent, var(--festag-black-popup, #1A1A1E));
}

.fas-account-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 18px 22px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.fas-account-create {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  text-align: left;
  padding: 16px 16px;
  border-radius: 14px;
  border: 1px solid var(--fas-popover-border, rgba(30, 30, 32, 0.08));
  background: color-mix(in srgb, var(--fas-nav-hover, rgba(30,30,32,0.06)) 70%, transparent);
  color: inherit;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.14s ease, border-color 0.14s ease;
}

.fas-account-create:hover {
  background: var(--fas-nav-hover, rgba(30, 30, 32, 0.06));
  border-color: color-mix(in srgb, var(--fas-ink) 18%, transparent);
}

.fas-account-create-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--fas-btn-bg, #ffffff);
  border: 1px solid var(--fas-btn-border, rgba(30, 30, 32, 0.08));
  box-shadow: var(--fas-btn-shadow, 0 1px 2px rgba(0,0,0,0.04));
  color: var(--fas-ink);
  flex-shrink: 0;
}

html[data-theme="dark"] .fas-account-create-icon,
html[data-theme="classic-dark"] .fas-account-create-icon {
  background: rgba(186, 194, 210, 0.08);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(245, 245, 247, 0.92);
}

.fas-account-create-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding-top: 2px;
}

.fas-account-create-title {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.018em;
  line-height: 1.25;
  color: var(--fas-ink);
}

.fas-account-create-support {
  font-size: 13px;
  line-height: 1.45;
  color: var(--fas-ink-muted);
}

.fas-account-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 4px;
}

.fas-account-avatar {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--fas-nav-active, rgba(30, 30, 32, 0.09));
  color: var(--fas-ink);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.fas-account-id-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.fas-account-name {
  font-size: 14.5px;
  letter-spacing: -0.01em;
  color: var(--fas-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fas-account-role {
  font-size: 12.5px;
  color: var(--fas-ink-muted);
}

.fas-account-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fas-account-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--fas-ink);
  font-size: 14px;
  font-family: inherit;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.12s ease;
}

.fas-account-item:hover {
  background: var(--fas-nav-hover);
}

.fas-account-sep {
  height: 1px;
  background: var(--fas-sep);
  margin: 6px 8px;
}

@media (max-width: 768px) {
  .fas-account-panel:not(.fas-account-panel--dock) {
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    width: 100%;
    max-height: min(86vh, 640px);
    border-radius: 20px 20px 0 0;
  }
  .fas-account-art { height: 112px; }
}
`
