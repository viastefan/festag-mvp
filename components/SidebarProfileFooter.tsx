'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowsClockwise,
  Article,
  ChartLineUp,
  CreditCard,
  DownloadSimple,
  GearSix,
  GridFour,
  Lifebuoy,
  LinkSimple,
  RocketLaunch,
  SignOut,
  Sparkle,
} from '@phosphor-icons/react'

import { AVATAR_COLORS, avatarTextColor } from '@/lib/avatar'
import { getFontMode, getTheme, setFontMode, setTheme } from '@/lib/theme'
import type { FontMode, ThemeMode } from '@/lib/theme'

type SidebarProfileFooterProps = {
  avatarColor: string
  avatarUrl: string | null
  displayName: string
  email: string
  initials: string
  isClient: boolean
  onAvatarColorChange: (color: string) => void | Promise<void>
  onLogout: () => void | Promise<void>
  plan: string
}

type FooterMenuItem = {
  href?: string
  label: string
  icon: React.ComponentType<any>
  hint?: string
  onClick?: () => void | Promise<void>
}

function planLabel(plan: string) {
  if (plan === 'starter') return 'Starter'
  if (plan === 'pro') return 'Pro'
  if (plan === 'enterprise') return 'Ent.'
  return null
}

export default function SidebarProfileFooter({
  avatarColor,
  avatarUrl,
  displayName,
  email,
  initials,
  isClient,
  onAvatarColorChange,
  onLogout,
  plan,
}: SidebarProfileFooterProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark')
  const [fontMode, setFontModeState] = useState<FontMode>('aeonik')
  const [userMenu, setUserMenu] = useState(false)
  const [userMenuPosition, setUserMenuPosition] = useState({ left: 0, top: 0 })
  const footerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setThemeMode(getTheme())
    setFontModeState(getFontMode())
  }, [])

  useEffect(() => {
    function updatePosition() {
      const rect = footerRef.current?.getBoundingClientRect()
      if (!rect) return
      setUserMenuPosition({
        left: Math.max(16, rect.left),
        top: Math.min(window.innerHeight - 24, rect.bottom + 8),
      })
    }

    if (userMenu) updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [userMenu])

  const currentPlanLabel = planLabel(plan)
  const avatarFg = avatarTextColor(avatarColor)
  const accountItems: FooterMenuItem[] = [
    { href: '/settings', label: 'Einstellungen', icon: GearSix, hint: '⌘,' },
    { href: '/account', label: 'Konto-Verlauf', icon: ChartLineUp },
    ...(isClient ? [{ href: '/billing', label: 'Abrechnung & Plan', icon: CreditCard }] : []),
    { href: '/download', label: 'Download App', icon: DownloadSimple },
  ]
  const workspaceItems: FooterMenuItem[] = [
    { href: '/messages', label: 'Support kontaktieren', icon: Lifebuoy },
    { href: '/connectors', label: 'Connectors', icon: LinkSimple },
    { href: '/addons', label: 'Add-Ons', icon: GridFour },
    ...(isClient ? [{ href: '/pricing', label: 'Tarif upgraden', icon: RocketLaunch }] : []),
  ]
  const updateItems: FooterMenuItem[] = [
    { href: '/reports', label: 'Statusberichte', icon: Sparkle },
    { href: '/updates', label: 'What’s new', icon: Sparkle },
    { href: '/updates', label: 'Blogartikel', icon: Article },
    { href: '/activity', label: 'Letzte Aktivitäten', icon: ArrowsClockwise },
  ]

  return (
    <div ref={footerRef} style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center', gap: 4, zIndex: 40 }}>
      {userMenu && typeof document !== 'undefined' && createPortal((
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 119990 }} onClick={() => setUserMenu(false)} />
          <div style={{
            position: 'fixed',
            left: userMenuPosition.left,
            top: userMenuPosition.top,
            width: 264,
            maxWidth: 'min(264px, calc(100vw - 32px))',
            maxHeight: 'calc(100dvh - 28px)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 14px 36px rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.08)',
            zIndex: 120000,
            padding: '6px',
            overflowX: 'hidden',
            overflowY: 'auto',
            animation: 'spf-pop .14s ease-out both',
          }}>
            <p className="spf-section-label">Konto</p>
            {accountItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.label} href={item.href!} className="spf-menu-row" onClick={() => setUserMenu(false)}>
                  <Icon size={17} color="var(--text-muted)" weight="regular" />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.hint ? <span className="spf-hint">{item.hint}</span> : null}
                </Link>
              )
            })}

            <p className="spf-section-label">Design</p>
            <div className="spf-theme-grid">
              {([
                { mode: 'system' as ThemeMode, label: 'System', swatch: '#1f2328' },
                { mode: 'light' as ThemeMode, label: 'Light', swatch: '#ffffff' },
                { mode: 'pure-light' as ThemeMode, label: 'Pure', swatch: '#f7f7f7' },
                { mode: 'read' as ThemeMode, label: 'Read', swatch: '#f1ede3' },
                { mode: 'dark' as ThemeMode, label: 'Dark', swatch: '#141515' },
                { mode: 'magic-blue' as ThemeMode, label: 'Blue', swatch: '#11172a' },
              ] as const).map(({ mode, label, swatch }) => {
                const active = themeMode === mode
                return (
                  <button
                    key={mode}
                    className={`spf-theme-chip${active ? ' is-active' : ''}`}
                    onClick={() => {
                      setThemeMode(mode)
                      setTheme(mode)
                    }}
                    type="button"
                  >
                    <span style={{ background: swatch }} />
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="spf-segment">
              {([
                { mode: 'aeonik' as FontMode, label: 'Aeonik' },
                { mode: 'sf-pro' as FontMode, label: 'SF Pro' },
              ] as const).map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  className={fontMode === mode ? 'is-active' : ''}
                  onClick={() => {
                    setFontModeState(mode)
                    setFontMode(mode)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="spf-section-label">Profilfarbe</p>
            <div className="spf-color-row">
              {AVATAR_COLORS.slice(0, 10).map((color) => (
                <button
                  key={color}
                  onClick={() => onAvatarColorChange(color)}
                  style={{
                    background: avatarUrl ? 'var(--surface)' : color,
                    borderColor: avatarUrl ? color : 'transparent',
                    outline: avatarColor === color ? '2px solid var(--text)' : 'none',
                  }}
                  aria-label={`Farbe ${color}`}
                />
              ))}
            </div>

            <p className="spf-section-label">Workspace</p>
            {workspaceItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.label} href={item.href!} className="spf-menu-row" onClick={() => setUserMenu(false)}>
                  <Icon size={17} color="var(--text-muted)" weight="regular" />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </Link>
              )
            })}

            <p className="spf-section-label">What's new</p>
            {updateItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.label} href={item.href!} className="spf-menu-row" onClick={() => setUserMenu(false)}>
                  <Icon size={17} color="var(--text-muted)" weight="regular" />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </Link>
              )
            })}

            <button className="spf-menu-row" onClick={onLogout} style={{ width: '100%' }}>
              <SignOut size={17} color="var(--text-muted)" weight="regular" />
              <span style={{ flex: 1 }}>Abmelden</span>
            </button>
          </div>
        </>
      ), document.body)}

      <button
        className="spf-trigger"
        onClick={() => setUserMenu((open) => !open)}
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          maxWidth: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '5px 8px 5px 5px',
          borderRadius: 8,
          background: userMenu ? 'var(--surface-2)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'background .1s',
          justifyContent: 'flex-start',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(event) => {
          if (!userMenu) event.currentTarget.style.background = 'var(--surface-2)'
        }}
        onMouseLeave={(event) => {
          if (!userMenu) event.currentTarget.style.background = 'transparent'
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2px solid ${avatarColor}`,
              flexShrink: 0,
            }}
          />
        ) : (
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: avatarColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9.5,
            fontWeight: 700,
            color: avatarFg,
            flexShrink: 0,
            letterSpacing: '.02em',
          }}>
            {initials}
          </div>
        )}

        <span style={{ minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          {currentPlanLabel && (
            <>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>·</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', flexShrink: 0 }}>
                {currentPlanLabel}
              </span>
            </>
          )}
        </span>

        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, opacity: .55 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <style>{`
        @keyframes spf-pop {
          from { opacity: 0; transform: translateY(4px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .spf-menu-row {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 9px;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background .08s;
          width: 100%;
          border: none;
          font-family: inherit;
          background: transparent;
          text-decoration: none;
          color: var(--text);
          font-size: 12px;
          font-weight: 500;
          text-align: left;
          box-sizing: border-box;
          min-height: 30px;
        }
        .spf-menu-row:hover { background: var(--surface-2); }
        .spf-menu-row:focus,
        .spf-trigger:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        .spf-menu-row:focus-visible,
        .spf-trigger:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }
        .spf-section-label {
          margin: 7px 0 2px;
          padding: 0 10px;
          color: var(--text-muted);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .04em;
          text-align: left;
        }
        .spf-hint {
          flex-shrink: 0;
          color: var(--text-muted);
          font-size: 10px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
        }
        .spf-theme-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 5px;
          padding: 4px 6px 7px;
        }
        .spf-theme-chip {
          min-height: 29px;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          padding: 0 7px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 600;
        }
        .spf-theme-chip span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1px solid var(--border);
          flex-shrink: 0;
        }
        .spf-theme-chip.is-active {
          color: var(--text);
          background: var(--surface-2);
          border-color: var(--border);
        }
        .spf-segment {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3px;
          padding: 0 6px 7px;
        }
        .spf-segment button {
          min-height: 28px;
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 11.5px;
          font-weight: 650;
          background: transparent;
        }
        .spf-segment button.is-active {
          color: var(--text);
          background: var(--surface-2);
          box-shadow: inset 0 0 0 1px var(--border);
        }
        .spf-color-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          padding: 5px 10px 7px;
        }
        .spf-color-row button {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid transparent;
          padding: 0;
        }
      `}</style>
    </div>
  )
}
