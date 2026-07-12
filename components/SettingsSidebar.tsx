'use client'

/**
 * Settings-mode sidebar — Vercel-style text nav.
 * Replaces the main app Sidebar while the user is anywhere under /settings.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CaretLeft } from '@phosphor-icons/react'
import {
  SETTINGS_NAV_GROUPS,
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
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          margin: 0 0 20px;
          min-height: 32px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 400;
          color: var(--text-muted);
          text-decoration: none;
          transition: background 0.12s, color 0.12s;
        }
        .sset-back:hover {
          background: color-mix(in srgb, var(--text) 5%, transparent);
          color: var(--text);
        }
        .sset-title {
          margin: 0 0 16px;
          padding: 0 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
        }
        .sset-group { margin-bottom: 16px; }
        .sset-group-label {
          padding: 0 8px 6px;
          font-size: 13px;
          font-weight: 400;
          color: var(--text-muted);
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
          <Link href="/dashboard" className="sset-back">
            <CaretLeft size={14} weight="regular" />
            <span>Zurück zur App</span>
          </Link>

          <p className="sset-title">Einstellungen</p>

          {SETTINGS_NAV_GROUPS.map(group => (
            <div key={group.label} className="sset-group">
              <div className="sset-group-label">{group.label}</div>
              <SettingsNavItems
                items={group.items}
                activeSlug={active}
                itemClassName={isActive => `sset-item${isActive ? ' on' : ''}`}
              />
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
