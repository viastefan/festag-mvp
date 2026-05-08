'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
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
import { getTheme, setTheme, ThemeMode } from '@/lib/theme'

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
  const [designMenu, setDesignMenu] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark')
  const [userMenu, setUserMenu] = useState(false)
  const [userMenuPosition, setUserMenuPosition] = useState({ left: 0, bottom: 0 })
  const [designMenuPosition, setDesignMenuPosition] = useState({ left: 0, bottom: 0, width: 0 })
  const footerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setThemeMode(getTheme())
  }, [])

  useEffect(() => {
    function updatePosition() {
      const rect = footerRef.current?.getBoundingClientRect()
      if (!rect) return
      setUserMenuPosition({
        left: Math.max(16, rect.left),
        bottom: Math.max(16, window.innerHeight - rect.top + 8),
      })
      setDesignMenuPosition({
        left: Math.max(16, rect.left),
        bottom: Math.max(16, window.innerHeight - rect.top + 8),
        width: rect.width,
      })
    }

    if (userMenu || designMenu) updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [userMenu, designMenu])

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
    <div ref={footerRef} style={{ paddingTop: 8, marginTop: 2, position: 'relative', display: 'flex', alignItems: 'center', gap: 4, zIndex: 40 }}>
      {userMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 5000 }} onClick={() => setUserMenu(false)} />
          <div style={{
            position: 'fixed',
            left: userMenuPosition.left,
            bottom: userMenuPosition.bottom,
            width: 286,
            maxWidth: 'min(286px, calc(100vw - 32px))',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: '0 16px 48px rgba(0,0,0,0.20), 0 4px 12px rgba(0,0,0,0.10)',
            zIndex: 5001,
            padding: '8px',
            overflow: 'hidden',
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
      )}

      {designMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 5000 }} onClick={() => setDesignMenu(false)} />
          <div style={{
            position: 'fixed',
            left: designMenuPosition.left,
            bottom: designMenuPosition.bottom,
            width: Math.max(180, designMenuPosition.width),
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 16px 48px rgba(0,0,0,0.20), 0 4px 12px rgba(0,0,0,0.10)',
            zIndex: 5001,
            padding: '6px',
            overflow: 'hidden',
            animation: 'spf-pop .14s ease-out both',
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '6px 11px 4px', margin: 0, letterSpacing: '.04em', textAlign: 'left' }}>
              Design
            </p>

            {([
              { mode: 'system' as ThemeMode, label: 'System preference', swatch: 'system' },
              { mode: 'light' as ThemeMode, label: 'Light', swatch: 'light' },
              { mode: 'pure-light' as ThemeMode, label: 'Pure Light', swatch: 'pure' },
              { mode: 'read' as ThemeMode, label: 'Read Mode', swatch: 'read' },
              { mode: 'dark' as ThemeMode, label: 'Dark', swatch: 'dark' },
              { mode: 'magic-blue' as ThemeMode, label: 'Magic Blue', swatch: 'blue' },
              { mode: 'classic-dark' as ThemeMode, label: 'Classic Dark', swatch: 'dark' },
              { mode: 'custom' as ThemeMode, label: 'Custom', swatch: 'custom' },
            ] as const).map(({ mode, label, swatch }) => {
              const active = themeMode === mode
              const darkSwatch = swatch === 'dark' || swatch === 'blue' || swatch === 'custom' || swatch === 'system'
              return (
                <button
                  key={mode}
                  className="spf-menu-row"
                  onClick={() => {
                    setThemeMode(mode)
                    setTheme(mode)
                    if (mode !== 'custom') setDesignMenu(false)
                  }}
                  style={{ width: '100%', height: 32, gap: 10 }}
                >
                  <span style={{
                    width: 34,
                    height: 22,
                    borderRadius: 7,
                    background: darkSwatch ? '#11131a' : '#fff',
                    border: '1px solid var(--border)',
                    color: darkSwatch ? '#f5f5f5' : '#262626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                    boxShadow: swatch === 'blue' ? 'inset 0 0 0 2px rgba(94,117,255,.35)' : 'none',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: swatch === 'read' ? '#b08b45' : swatch === 'blue' ? '#6574ff' : '#7c86e8', marginRight: 4 }} />
                    Aa
                  </span>
                  <span style={{ flex: 1, color: active ? 'var(--text)' : 'var(--text-secondary)', fontWeight: active ? 650 : 500 }}>
                    {label}
                  </span>
                  {active && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #3b82f6)" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              )
            })}

            <div style={{ height: 1, background: 'var(--border)', margin: '4px 4px' }} />

            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '6px 11px 6px', margin: 0, letterSpacing: '.04em', textAlign: 'left' }}>
              Avatar-Farbe
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 11px 10px' }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `2px solid ${avatarColor}`,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: avatarColor,
                  color: avatarFg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {initials}
                </div>
              )}
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45, textAlign: 'left' }}>
                {avatarUrl ? 'Die gewählte Farbe rahmt dein Profilbild.' : 'Die gewählte Farbe füllt deinen Avatar mit Initialen.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, padding: '0 11px 10px' }}>
              {AVATAR_COLORS.map((color) => {
                const selected = avatarColor === color
                return (
                  <button
                    key={color}
                    onClick={() => onAvatarColorChange(color)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: avatarUrl ? 'var(--surface)' : color,
                      border: avatarUrl ? `2px solid ${color}` : '2px solid transparent',
                      outline: selected ? '2px solid var(--text)' : 'none',
                      outlineOffset: 2,
                      cursor: 'pointer',
                      padding: 0,
                      boxSizing: 'border-box',
                    }}
                    aria-label={`Farbe ${color}`}
                  />
                )
              })}
            </div>
          </div>
        </>
      )}

      <button
        onClick={() => { setUserMenu((open) => !open); setDesignMenu(false) }}
        style={{
          flex: 1,
          minWidth: 0,
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

      <button
        onClick={() => { setDesignMenu((open) => !open); setUserMenu(false) }}
        aria-label="Design-Einstellungen"
        style={{
          width: 30,
          height: 30,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          background: designMenu ? 'var(--surface-2)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'background .1s',
          color: 'var(--text-muted)',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(event) => {
          if (!designMenu) {
            event.currentTarget.style.background = 'var(--surface-2)'
            event.currentTarget.style.color = 'var(--text)'
          }
        }}
        onMouseLeave={(event) => {
          if (!designMenu) {
            event.currentTarget.style.background = 'transparent'
            event.currentTarget.style.color = 'var(--text-muted)'
          }
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="11" y2="6" />
          <circle cx="15" cy="6" r="2" />
          <line x1="17" y1="6" x2="20" y2="6" />
          <line x1="4" y1="18" x2="7" y2="18" />
          <circle cx="10" cy="18" r="2" />
          <line x1="12" y1="18" x2="20" y2="18" />
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
          min-height: 34px;
        }
        .spf-menu-row:hover { background: var(--surface-2); }
        .spf-section-label {
          margin: 8px 0 2px;
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
      `}</style>
    </div>
  )
}
