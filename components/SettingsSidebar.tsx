'use client'

/**
 * Settings-mode sidebar — Vercel-style text nav.
 * Replaces the main app Sidebar while the user is anywhere under /settings.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CaretLeft } from '@phosphor-icons/react'
import {
  SETTINGS_NAV_ITEMS,
  settingsSlugFromPath,
} from '@/components/settings/settings-config'
import SettingsNavItems from '@/components/settings/SettingsNavItems'

export default function SettingsSidebar() {
  const pathname = usePathname()
  const active = settingsSlugFromPath(pathname)

  return (
    <>
      <style>{`
        .sset-shell {
          position: fixed;
          inset: 0 auto 0 0;
          width: var(--festag-sidebar-width, 260px);
          box-sizing: border-box;
          pointer-events: none;
          z-index: 20;
        }
        .sset {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          padding: 20px 12px 24px;
          color: var(--text);
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-weight: 400;
          letter-spacing: 0;
          pointer-events: all;
          background: var(--sidebar-bg);
          border-right: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
          overflow-y: auto;
        }
        html[data-theme="dark"] .sset,
        html[data-theme="classic-dark"] .sset {
          border-right-color: rgba(255, 255, 255, 0.08);
        }
        .sset-back {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 6px 8px;
          margin: 0 0 16px;
          min-height: 32px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          text-decoration: none;
          transition: background 0.12s;
        }
        .sset-back:hover {
          background: color-mix(in srgb, var(--text) 5%, transparent);
        }
        .sset-back-arrow {
          position: absolute;
          left: 8px;
          display: flex;
          align-items: center;
          color: var(--text-muted);
          transition: color 0.12s;
        }
        .sset-back:hover .sset-back-arrow {
          color: var(--text);
        }
        .sset-nav {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .sset-item {
          display: flex;
          align-items: center;
          width: 100%;
          margin: 0;
          padding: 6px 8px;
          min-height: 32px;
          border: 0;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 400;
          color: var(--text-secondary);
          text-decoration: none;
          transition: background 0.12s, color 0.12s;
          cursor: pointer;
          background: transparent;
          text-align: left;
          font-family: inherit;
        }
        .sset-item:hover {
          background: color-mix(in srgb, var(--text) 5%, transparent);
          color: var(--text);
        }
        .sset-item.on {
          background: color-mix(in srgb, var(--text) 8%, transparent);
          color: var(--text);
          font-weight: 500;
        }
        @media (max-width: 768px) {
          .sset-shell { display: none !important; }
        }
      `}</style>

      <aside className="sset-shell" aria-label="Einstellungen">
        <div className="sset">
          <Link href="/dashboard" className="sset-back" aria-label="Zurück zur App">
            <span className="sset-back-arrow" aria-hidden>
              <CaretLeft size={14} weight="regular" />
            </span>
            Einstellungen
          </Link>

          <nav className="sset-nav" aria-label="Einstellungsbereiche">
            <SettingsNavItems
              items={SETTINGS_NAV_ITEMS}
              activeSlug={active}
              itemClassName={isActive => `sset-item${isActive ? ' on' : ''}`}
            />
          </nav>
        </div>
      </aside>
    </>
  )
}
