'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { BookOpen, CaretRight, Moon, Sun, X } from '@phosphor-icons/react'
import { PORTAL_SETTINGS } from '@/lib/portal-nav'
import { usePortalNavItems } from '@/hooks/usePortalNavItems'
import { getTheme, setTheme, type ThemeMode } from '@/lib/theme'
import {
  MOBILE_WHITE_BORDER,
  MOBILE_WHITE_ELEV,
} from '@/components/mobile/mobile-surface-tokens'

const THEME_OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'light', label: 'Hell', Icon: Sun },
  { mode: 'dark', label: 'Dunkel', Icon: Moon },
  { mode: 'read', label: 'Lesen', Icon: BookOpen },
]

function themeMatches(stored: ThemeMode, option: ThemeMode) {
  if (option === 'dark') return stored === 'dark' || stored === 'classic-dark'
  if (option === 'light') return stored === 'light' || stored === 'pure-light'
  return stored === option
}

const HERO_GRADIENT =
  'linear-gradient(145deg, #5b647d 0%, #4a5268 52%, #434b60 100%)'

type Props = {
  open: boolean
  onClose: () => void
}

export default function MobileNavSheet({ open, onClose }: Props) {
  const pathname = usePathname() || ''
  const [mounted, setMounted] = useState(false)
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const { items: navItems } = usePortalNavItems()

  const featured = navItems[0]
  const core = navItems.slice(1, 5)
  const more = navItems.slice(5).map(item =>
    item.href === '/docs' ? { ...item, href: '/documents' } : item,
  )

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    setThemeState(getTheme())
    const onTheme = (e: Event) => {
      const next = (e as CustomEvent<ThemeMode>).detail
      if (next) setThemeState(next)
    }
    window.addEventListener('festag-theme', onTheme)
    return () => window.removeEventListener('festag-theme', onTheme)
  }, [mounted])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open || !mounted) return null

  function isActive(href: string, match?: (path: string) => boolean) {
    if (match) return match(pathname)
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  function pickTheme(mode: ThemeMode) {
    setThemeState(mode)
    setTheme(mode)
  }

  const FeaturedIcon = featured?.Icon ?? PORTAL_SETTINGS.Icon
  const SettingsIcon = PORTAL_SETTINGS.Icon

  return createPortal(
    <div className="mns-root" role="presentation">
      <button type="button" className="mns-backdrop" aria-label="Schließen" onClick={onClose} />
      <nav className="mns-sheet" aria-label="Navigation">
        <div className="mns-grip" aria-hidden />

        <header className="mns-head">
          <div>
            <p className="mns-kicker">Festag</p>
            <h2 className="mns-title">Navigation</h2>
          </div>
          <button type="button" className="mns-close" onClick={onClose} aria-label="Schließen">
            <X size={16} weight="bold" />
          </button>
        </header>

        {featured && (
        <Link
          href={featured.href}
          className={`mns-hero${isActive(featured.href, featured.match) ? ' on' : ''}`}
          style={{ background: HERO_GRADIENT }}
          onClick={onClose}
        >
          <span className="mns-hero-icon" aria-hidden>
            <FeaturedIcon size={20} weight="regular" color="#fff" />
          </span>
          <span className="mns-hero-copy">
            <strong>{featured.label}</strong>
            <small>Gesamtbericht · Voice</small>
          </span>
          <span className="mns-hero-caret" aria-hidden>
            <CaretRight size={15} weight="bold" color="rgba(255,255,255,0.85)" />
          </span>
        </Link>
        )}

        {core.length > 0 && (
        <>
        <p className="mns-section">Arbeit</p>
        <div className="mns-grid">
          {core.map((item) => {
            const Icon = item.Icon
            const active = isActive(item.href, item.match)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mns-tile${active ? ' on' : ''}`}
                onClick={onClose}
              >
                <span className="mns-tile-icon" aria-hidden>
                  <Icon size={17} weight="regular" />
                </span>
                <span className="mns-tile-label">{item.label}</span>
              </Link>
            )
          })}
        </div>
        </>
        )}

        {more.length > 0 && (
        <>
        <p className="mns-section">Workspace</p>
        <div className="mns-group">
          {more.map((item, index) => {
            const Icon = item.Icon
            const active = isActive(item.href, item.match)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mns-row${active ? ' on' : ''}${index < more.length - 1 ? ' has-divider' : ''}`}
                onClick={onClose}
              >
                <span className="mns-row-icon" aria-hidden>
                  <Icon size={16} weight="regular" />
                </span>
                <span className="mns-row-label">{item.label}</span>
                <span className="mns-row-caret" aria-hidden>
                  <CaretRight size={13} weight="bold" />
                </span>
              </Link>
            )
          })}
        </div>
        </>
        )}

        <footer className="mns-foot">
          <Link
            href={PORTAL_SETTINGS.href}
            className={`mns-settings${isActive(PORTAL_SETTINGS.href, PORTAL_SETTINGS.match) ? ' on' : ''}`}
            onClick={onClose}
          >
            <SettingsIcon size={16} weight="regular" />
            <span>{PORTAL_SETTINGS.label}</span>
          </Link>

          <div className="mns-theme" role="group" aria-label="Erscheinungsbild">
            {THEME_OPTIONS.map(({ mode, label, Icon }) => {
              const on = themeMatches(theme, mode)
              return (
                <button
                  key={mode}
                  type="button"
                  className={on ? 'on' : ''}
                  onClick={() => pickTheme(mode)}
                  aria-label={label}
                  aria-pressed={on}
                  title={label}
                >
                  <Icon size={16} weight={on ? 'fill' : 'regular'} />
                </button>
              )
            })}
          </div>
        </footer>
      </nav>

      <style jsx>{`
        .mns-root {
          position: fixed;
          inset: 0;
          z-index: 20000;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          pointer-events: auto;
        }
        .mns-backdrop {
          position: absolute;
          inset: 0;
          z-index: 0;
          border: 0;
          padding: 0;
          margin: 0;
          cursor: default;
          background: rgba(10, 10, 12, 0.68);
          animation: mnsFade 0.22s ease both;
        }
        .mns-sheet {
          --mns-elev: ${MOBILE_WHITE_ELEV};
          --mns-border: ${MOBILE_WHITE_BORDER};

          position: relative;
          z-index: 1;
          width: 100%;
          max-height: min(88dvh, 760px);
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          color-scheme: light;
          background: #ffffff;
          color: #0f0f10;
          border-radius: 28px 28px 0 0;
          padding: 8px 20px calc(18px + env(safe-area-inset-bottom, 0px));
          box-shadow: 0 -24px 56px -18px rgba(15, 23, 42, 0.32);
          animation: mnsUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
        }
        .mns-grip {
          width: 40px;
          height: 4px;
          margin: 6px auto 16px;
          border-radius: 999px;
          background: rgba(15, 15, 16, 0.14);
          flex-shrink: 0;
        }
        .mns-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }
        .mns-kicker {
          margin: 0 0 3px;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #90959f;
        }
        .mns-title {
          margin: 0;
          font-size: 21px;
          font-weight: 400;
          letter-spacing: -0.02em;
          line-height: 1.08;
          color: #0f0f10;
        }
        .mns-close {
          width: 36px;
          height: 36px;
          border: var(--mns-border);
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          color: #4e5567;
          cursor: pointer;
          box-shadow: var(--mns-elev);
          flex-shrink: 0;
          padding: 0;
        }
        .mns-close:active { transform: scale(0.96); }

        .mns-hero {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
          min-height: 68px;
          padding: 14px 14px 14px 12px;
          margin: 0 0 18px;
          border: 0;
          border-radius: 16px;
          text-decoration: none !important;
          color: #ffffff !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 10px 28px -12px rgba(91, 100, 125, 0.55);
          -webkit-tap-highlight-color: transparent;
        }
        .mns-hero.on {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.22),
            0 0 0 2px rgba(91, 100, 125, 0.28),
            0 10px 28px -12px rgba(91, 100, 125, 0.55);
        }
        .mns-hero:active { transform: scale(0.99); }
        .mns-hero-icon {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.15);
          flex-shrink: 0;
        }
        .mns-hero-copy {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1 1 auto;
          min-width: 0;
        }
        .mns-hero-copy strong {
          display: block;
          font-size: 15px;
          font-weight: 400;
          letter-spacing: 0.005em;
          color: #ffffff;
        }
        .mns-hero-copy small {
          display: block;
          font-size: 12px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.74);
        }
        .mns-hero-caret {
          width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .mns-section {
          margin: 0 0 10px 2px;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #90959f;
        }
        .mns-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 18px;
        }
        .mns-tile {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 14px;
          min-height: 84px;
          padding: 12px 12px 11px;
          border-radius: 14px;
          border: var(--mns-border);
          background: #ffffff !important;
          color: #0f0f10 !important;
          text-decoration: none !important;
          box-shadow: var(--mns-elev);
          -webkit-tap-highlight-color: transparent;
        }
        .mns-tile:active { transform: scale(0.98); background: #fafafa !important; }
        .mns-tile.on {
          background: #f8f8fa !important;
          box-shadow: var(--mns-elev), inset 0 0 0 1px rgba(91, 100, 125, 0.18);
        }
        .mns-tile-icon {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #2a3032;
        }
        .mns-tile-label {
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.005em;
          line-height: 1.15;
        }

        .mns-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 14px;
          border-radius: 14px;
          border: var(--mns-border);
          background: #ffffff;
          box-shadow: var(--mns-elev);
          overflow: hidden;
        }
        .mns-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 50px;
          padding: 0 12px 0 10px;
          background: #ffffff !important;
          color: #2a3032 !important;
          text-decoration: none !important;
          -webkit-tap-highlight-color: transparent;
        }
        .mns-row.has-divider {
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .mns-row:active { background: #fafafa !important; }
        .mns-row.on { background: #f8f8fa !important; color: #0f0f10 !important; }
        .mns-row-icon {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          flex-shrink: 0;
          color: #2a3032;
        }
        .mns-row-label {
          flex: 1 1 auto;
          min-width: 0;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.005em;
        }
        .mns-row-caret {
          width: 14px;
          height: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #b8bcc6;
        }

        .mns-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 12px;
          margin-top: 2px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }
        .mns-settings {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 6px 2px;
          color: #6e717e !important;
          text-decoration: none !important;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.005em;
          flex: 1 1 auto;
          min-width: 0;
        }
        .mns-settings.on { color: #0f0f10 !important; }
        .mns-settings:active { opacity: 0.72; }

        .mns-theme {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
          padding: 3px;
          border-radius: 999px;
          border: var(--mns-border);
          background: #ffffff;
          box-shadow: var(--mns-elev);
        }
        .mns-theme button {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: #90959f;
          cursor: pointer;
          padding: 0;
          transition: background 0.14s ease, color 0.14s ease, box-shadow 0.14s ease;
        }
        .mns-theme button.on {
          background: #f3f4f6;
          color: #2a3032;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 1px 2px rgba(144, 149, 159, 0.14);
        }
        .mns-theme button:active { transform: scale(0.94); }

        @keyframes mnsFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mnsUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  )
}
