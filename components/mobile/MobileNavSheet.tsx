'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { CaretRight, X } from '@phosphor-icons/react'
import { PORTAL_NAV, PORTAL_SETTINGS } from '@/lib/portal-nav'

const FEATURED = PORTAL_NAV[0]
const CORE = PORTAL_NAV.slice(1, 5)
const MORE = [
  ...PORTAL_NAV.slice(5).map((item) =>
    item.href === '/docs' ? { ...item, href: '/documents' } : item,
  ),
]

type Props = {
  open: boolean
  onClose: () => void
}

export default function MobileNavSheet({ open, onClose }: Props) {
  const pathname = usePathname() || ''
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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

  const FeaturedIcon = FEATURED.Icon
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

        <Link
          href={FEATURED.href}
          className={`mns-hero${isActive(FEATURED.href, FEATURED.match) ? ' on' : ''}`}
          onClick={onClose}
        >
          <span className="mns-hero-icon" aria-hidden>
            <FeaturedIcon size={22} weight="regular" />
          </span>
          <span className="mns-hero-copy">
            <strong>{FEATURED.label}</strong>
            <small>Gesamtbericht · Voice</small>
          </span>
          <span className="mns-hero-caret" aria-hidden>
            <CaretRight size={16} weight="bold" />
          </span>
        </Link>

        <p className="mns-section">Arbeit</p>
        <div className="mns-grid">
          {CORE.map((item) => {
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
                  <Icon size={18} weight="regular" />
                </span>
                <span className="mns-tile-label">{item.label}</span>
              </Link>
            )
          })}
        </div>

        <p className="mns-section">Workspace</p>
        <div className="mns-list">
          {MORE.map((item) => {
            const Icon = item.Icon
            const active = isActive(item.href, item.match)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mns-row${active ? ' on' : ''}`}
                onClick={onClose}
              >
                <span className="mns-row-icon" aria-hidden>
                  <Icon size={17} weight="regular" />
                </span>
                <span className="mns-row-label">{item.label}</span>
                <span className="mns-row-caret" aria-hidden>
                  <CaretRight size={14} weight="bold" />
                </span>
              </Link>
            )
          })}
        </div>

        <div className="mns-foot">
          <Link
            href={PORTAL_SETTINGS.href}
            className={`mns-settings${isActive(PORTAL_SETTINGS.href, PORTAL_SETTINGS.match) ? ' on' : ''}`}
            onClick={onClose}
          >
            <SettingsIcon size={17} weight="regular" />
            <span>{PORTAL_SETTINGS.label}</span>
          </Link>
        </div>
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
          background: rgba(15, 15, 16, 0.58);
        }
        .mns-sheet {
          --mns-elev:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 1px 0 rgba(0, 0, 0, 0.04),
            0 4px 10px rgba(144, 149, 159, 0.14);
          --mns-border: 1px solid rgba(0, 0, 0, 0.06);

          position: relative;
          z-index: 1;
          width: 100%;
          max-height: min(86dvh, 720px);
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          background: #fcfcfc;
          color: #0f0f10;
          border-radius: 24px 24px 0 0;
          padding: 8px 18px calc(16px + env(safe-area-inset-bottom, 0px));
          box-shadow: 0 -20px 48px -16px rgba(15, 23, 42, 0.28);
          animation: mnsUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
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
          box-shadow: 0 -20px 48px -16px rgba(0, 0, 0, 0.55);
        }
        .mns-grip {
          width: 40px;
          height: 4px;
          margin: 4px auto 14px;
          border-radius: 999px;
          background: rgba(15, 15, 16, 0.12);
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
          margin-bottom: 14px;
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
          padding: 0;
        }
        :global([data-theme="dark"]) .mns-close,
        :global([data-theme="classic-dark"]) .mns-close {
          background: rgba(255, 255, 255, 0.08);
          color: #c8ccd4;
        }

        .mns-hero {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
          padding: 14px 14px 14px 12px;
          margin: 0 0 16px;
          border: 0;
          border-radius: 16px;
          text-decoration: none;
          color: #fff !important;
          background: linear-gradient(145deg, #5b647d 0%, #4a5268 52%, #434b60 100%) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            0 8px 24px -10px rgba(91, 100, 125, 0.55);
          -webkit-tap-highlight-color: transparent;
        }
        .mns-hero.on {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 0 0 2px rgba(255, 255, 255, 0.24),
            0 8px 24px -10px rgba(91, 100, 125, 0.55);
        }
        .mns-hero-icon {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.14);
          flex-shrink: 0;
          color: #fff;
        }
        .mns-hero-copy {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1 1 auto;
          min-width: 0;
        }
        .mns-hero-copy strong {
          display: block;
          font-size: 16px;
          font-weight: 400;
          letter-spacing: 0.005em;
          color: #fff;
        }
        .mns-hero-copy small {
          display: block;
          font-size: 12px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.72);
          letter-spacing: 0.01em;
        }
        .mns-hero-caret {
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.8);
        }

        .mns-section {
          margin: 0 0 8px 2px;
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
          margin-bottom: 16px;
        }
        .mns-tile {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          min-height: 88px;
          padding: 12px;
          border-radius: 14px;
          border: var(--mns-border);
          background: #fff !important;
          color: #0f0f10 !important;
          text-decoration: none !important;
          box-shadow: var(--mns-elev);
          -webkit-tap-highlight-color: transparent;
        }
        .mns-tile.on {
          background: #f8f8fa !important;
          box-shadow:
            var(--mns-elev),
            inset 0 0 0 1px rgba(91, 100, 125, 0.2);
        }
        :global([data-theme="dark"]) .mns-tile,
        :global([data-theme="classic-dark"]) .mns-tile {
          background: rgba(255, 255, 255, 0.07) !important;
          color: #f4f4f4 !important;
        }
        .mns-tile-icon {
          width: 34px;
          height: 34px;
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
          gap: 8px;
          margin-bottom: 12px;
        }
        .mns-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 48px;
          padding: 0 12px 0 10px;
          border-radius: 12px;
          border: var(--mns-border);
          background: #fff !important;
          color: #2a3032 !important;
          text-decoration: none !important;
          box-shadow: var(--mns-elev);
          -webkit-tap-highlight-color: transparent;
        }
        .mns-row.on {
          background: #f8f8fa !important;
          color: #0f0f10 !important;
        }
        :global([data-theme="dark"]) .mns-row,
        :global([data-theme="classic-dark"]) .mns-row {
          background: rgba(255, 255, 255, 0.07) !important;
          color: #d9dce2 !important;
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
          flex: 1 1 auto;
          min-width: 0;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.005em;
        }
        .mns-row-caret {
          width: 16px;
          height: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #b0b4be;
        }

        .mns-foot {
          padding-top: 6px;
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
          padding: 8px 2px;
          color: #6e717e !important;
          text-decoration: none !important;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.005em;
        }
        .mns-settings.on { color: #0f0f10 !important; }
        :global([data-theme="dark"]) .mns-settings,
        :global([data-theme="classic-dark"]) .mns-settings { color: #9aa0ac !important; }
        :global([data-theme="dark"]) .mns-settings.on,
        :global([data-theme="classic-dark"]) .mns-settings.on { color: #f4f4f4 !important; }

        @keyframes mnsUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  )
}
