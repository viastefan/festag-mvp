'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  Pulse, Bell, Cube, SquaresFour, ListChecks, File, Plugs, UsersThree, GearSix, X, CaretRight,
} from '@phosphor-icons/react'

const FEATURED = {
  href: '/dashboard',
  label: 'Statusabfrage',
  hint: 'Gesamtbericht · Voice',
  Icon: Pulse,
} as const

const CORE = [
  { href: '/projects', label: 'Projekte', Icon: Cube },
  { href: '/decisions', label: 'Entscheidungen', Icon: SquaresFour },
  { href: '/tasks', label: 'Tasks', Icon: ListChecks },
  { href: '/messages', label: 'Inbox', Icon: Bell },
] as const

const MORE = [
  { href: '/docs', label: 'Dokumente', Icon: File },
  { href: '/connectors', label: 'Connectors', Icon: Plugs },
  { href: '/teams', label: 'Teams', Icon: UsersThree },
] as const

const SETTINGS = { href: '/settings', label: 'Einstellungen', Icon: GearSix } as const

type Props = {
  open: boolean
  onClose: () => void
}

export default function MobileNavSheet({ open, onClose }: Props) {
  const pathname = usePathname() || ''

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/settings') return pathname.startsWith('/settings')
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const FeaturedIcon = FEATURED.Icon

  return (
    <>
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

        <Link
          href={FEATURED.href}
          className={`mns-hero${isActive(FEATURED.href) ? ' on' : ''}`}
          onClick={onClose}
          style={{ animationDelay: '40ms' }}
        >
          <span className="mns-hero-icon" aria-hidden>
            <FeaturedIcon size={22} weight="regular" />
          </span>
          <span className="mns-hero-copy">
            <strong>{FEATURED.label}</strong>
            <small>{FEATURED.hint}</small>
          </span>
          <CaretRight size={16} weight="bold" className="mns-hero-caret" />
        </Link>

        <p className="mns-section">Arbeit</p>
        <div className="mns-grid">
          {CORE.map((item, i) => {
            const Icon = item.Icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mns-tile${active ? ' on' : ''}`}
                onClick={onClose}
                style={{ animationDelay: `${80 + i * 35}ms` }}
              >
                <span className="mns-tile-icon" aria-hidden>
                  <Icon size={18} weight="regular" />
                </span>
                <span className="mns-tile-label">{item.label}</span>
              </Link>
            )
          })}
        </div>

        <p className="mns-section">Workspace</p>
        <div className="mns-list">
          {MORE.map((item, i) => {
            const Icon = item.Icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mns-row${active ? ' on' : ''}`}
                onClick={onClose}
                style={{ animationDelay: `${220 + i * 30}ms` }}
              >
                <span className="mns-row-icon" aria-hidden>
                  <Icon size={17} weight="regular" />
                </span>
                <span className="mns-row-label">{item.label}</span>
                <CaretRight size={14} weight="bold" className="mns-row-caret" />
              </Link>
            )
          })}
        </div>

        <div className="mns-foot">
          <Link
            href={SETTINGS.href}
            className={`mns-settings${isActive(SETTINGS.href) ? ' on' : ''}`}
            onClick={onClose}
            style={{ animationDelay: '320ms' }}
          >
            <GearSix size={17} weight="regular" />
            <span>{SETTINGS.label}</span>
          </Link>
        </div>
      </nav>

      <style jsx>{`
        .mns-backdrop {
          position: fixed;
          inset: 0;
          z-index: 800;
          border: 0;
          padding: 0;
          cursor: default;
          background: rgba(15, 15, 16, 0.38);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: mnsFade 0.22s ease both;
        }
        .mns-sheet {
          --mns-elev:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 1px 0 rgba(0, 0, 0, 0.04),
            0 4px 10px rgba(144, 149, 159, 0.14);
          --mns-border: 1px solid rgba(0, 0, 0, 0.06);

          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 801;
          max-height: 88vh;
          overflow-y: auto;
          background: #fcfcfc;
          color: #0f0f10;
          border-radius: 28px 28px 0 0;
          padding: 8px 18px calc(14px + env(safe-area-inset-bottom, 0px));
          box-shadow: 0 -24px 64px -20px rgba(15, 23, 42, 0.22);
          animation: mnsUp 0.34s cubic-bezier(0.16, 1, 0.3, 1) both;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
        }
        :global([data-theme="dark"]) .mns-sheet,
        :global([data-theme="classic-dark"]) .mns-sheet {
          --mns-elev:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 2px 8px rgba(0, 0, 0, 0.38);
          --mns-border: 1px solid rgba(255, 255, 255, 0.1);
          background: #141416;
          color: #f4f4f4;
          box-shadow: 0 -24px 64px -20px rgba(0, 0, 0, 0.55);
        }
        .mns-grip {
          width: 40px;
          height: 4px;
          margin: 4px auto 16px;
          border-radius: 999px;
          background: rgba(15, 15, 16, 0.12);
          flex-shrink: 0;
        }
        :global([data-theme="dark"]) .mns-grip,
        :global([data-theme="classic-dark"]) .mns-grip {
          background: rgba(255, 255, 255, 0.16);
        }
        .mns-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }
        .mns-kicker {
          margin: 0 0 2px;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #90959f;
        }
        .mns-title {
          margin: 0;
          font-size: 22px;
          font-weight: 400;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .mns-close {
          width: 34px;
          height: 34px;
          border: var(--mns-border);
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          color: #4e5567;
          cursor: pointer;
          box-shadow: var(--mns-elev);
          flex-shrink: 0;
        }
        :global([data-theme="dark"]) .mns-close,
        :global([data-theme="classic-dark"]) .mns-close {
          background: rgba(255, 255, 255, 0.08);
          color: #c8ccd4;
        }

        .mns-hero {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 16px 16px 14px;
          margin-bottom: 18px;
          border-radius: 18px;
          text-decoration: none;
          color: #fff;
          background: linear-gradient(145deg, #5b647d 0%, #4a5268 52%, #434b60 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            0 10px 28px -8px rgba(91, 100, 125, 0.55);
          animation: mnsItemIn 0.36s cubic-bezier(0.16, 1, 0.3, 1) both;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.14s ease, box-shadow 0.14s ease;
        }
        .mns-hero:active {
          transform: scale(0.985);
        }
        .mns-hero.on {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 0 0 2px rgba(255, 255, 255, 0.28),
            0 10px 28px -8px rgba(91, 100, 125, 0.55);
        }
        .mns-hero-icon {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.14);
          flex-shrink: 0;
        }
        .mns-hero-copy {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 0;
        }
        .mns-hero-copy strong {
          font-size: 16px;
          font-weight: 400;
          letter-spacing: 0.005em;
        }
        .mns-hero-copy small {
          font-size: 12px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.72);
          letter-spacing: 0.01em;
        }
        .mns-hero :global(.mns-hero-caret) {
          flex-shrink: 0;
          opacity: 0.72;
        }

        .mns-section {
          margin: 0 0 10px 4px;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.07em;
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
          min-height: 92px;
          padding: 14px;
          border-radius: 14px;
          border: var(--mns-border);
          background: #fff;
          color: #0f0f10;
          text-decoration: none;
          box-shadow: var(--mns-elev);
          animation: mnsItemIn 0.36s cubic-bezier(0.16, 1, 0.3, 1) both;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.12s ease, background 0.12s ease;
        }
        .mns-tile:active { transform: scale(0.98); }
        .mns-tile.on {
          background: #f8f8fa;
          box-shadow:
            var(--mns-elev),
            inset 0 0 0 1px rgba(91, 100, 125, 0.22);
        }
        :global([data-theme="dark"]) .mns-tile,
        :global([data-theme="classic-dark"]) .mns-tile {
          background: rgba(255, 255, 255, 0.07);
          color: #f4f4f4;
        }
        :global([data-theme="dark"]) .mns-tile.on,
        :global([data-theme="classic-dark"]) .mns-tile.on {
          background: rgba(255, 255, 255, 0.11);
        }
        .mns-tile-icon {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #2a3032;
        }
        :global([data-theme="dark"]) .mns-tile-icon,
        :global([data-theme="classic-dark"]) .mns-tile-icon {
          background: rgba(255, 255, 255, 0.1);
          color: #e8eaee;
        }
        .mns-tile-label {
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.005em;
          line-height: 1.2;
        }

        .mns-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }
        .mns-row {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 48px;
          padding: 0 12px 0 10px;
          border-radius: 12px;
          border: var(--mns-border);
          background: #fff;
          color: #2a3032;
          text-decoration: none;
          box-shadow: var(--mns-elev);
          animation: mnsItemIn 0.36s cubic-bezier(0.16, 1, 0.3, 1) both;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.12s ease;
        }
        .mns-row:active { transform: scale(0.99); }
        .mns-row.on {
          background: #f8f8fa;
          color: #0f0f10;
        }
        :global([data-theme="dark"]) .mns-row,
        :global([data-theme="classic-dark"]) .mns-row {
          background: rgba(255, 255, 255, 0.07);
          color: #d9dce2;
        }
        :global([data-theme="dark"]) .mns-row.on,
        :global([data-theme="classic-dark"]) .mns-row.on {
          background: rgba(255, 255, 255, 0.11);
          color: #f4f4f4;
        }
        .mns-row-icon {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          flex-shrink: 0;
        }
        :global([data-theme="dark"]) .mns-row-icon,
        :global([data-theme="classic-dark"]) .mns-row-icon {
          background: rgba(255, 255, 255, 0.1);
        }
        .mns-row-label {
          flex: 1;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.005em;
        }
        .mns-row :global(.mns-row-caret) {
          color: #b0b4be;
          flex-shrink: 0;
        }

        .mns-foot {
          padding-top: 4px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }
        :global([data-theme="dark"]) .mns-foot,
        :global([data-theme="classic-dark"]) .mns-foot {
          border-top-color: rgba(255, 255, 255, 0.08);
        }
        .mns-settings {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 44px;
          padding: 8px 4px;
          color: #6e717e;
          text-decoration: none;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.005em;
          animation: mnsItemIn 0.36s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .mns-settings.on { color: #0f0f10; }
        :global([data-theme="dark"]) .mns-settings,
        :global([data-theme="classic-dark"]) .mns-settings { color: #9aa0ac; }
        :global([data-theme="dark"]) .mns-settings.on,
        :global([data-theme="classic-dark"]) .mns-settings.on { color: #f4f4f4; }

        @keyframes mnsFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mnsUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes mnsItemIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mns-hero,
          .mns-tile,
          .mns-row,
          .mns-settings {
            animation: none;
          }
        }
      `}</style>
    </>
  )
}
