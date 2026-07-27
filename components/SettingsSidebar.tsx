'use client'

/**
 * Settings-mode sidebar — Cursor-density grouped rail.
 * Replaces the main app Sidebar while the user is anywhere under /settings.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from '@phosphor-icons/react'
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
          padding: 14px 10px 20px;
          color: var(--text);
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-weight: 400;
          letter-spacing: 0;
          pointer-events: all;
          background: var(--sidebar-bg, var(--bg));
          border-right: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
          overflow-y: auto;
        }
        html[data-theme="dark"] .sset,
        html[data-theme="classic-dark"] .sset {
          background: #000000;
          border-right-color: rgba(255, 255, 255, 0.06);
        }
        html[data-theme="light"] .sset,
        html[data-theme="read"] .sset,
        html[data-theme="pure-light"] .sset {
          background: color-mix(in srgb, var(--bg) 92%, #fff);
          border-right-color: rgba(0, 0, 0, 0.06);
        }
        .sset-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          max-width: 100%;
          padding: 6px 8px;
          margin: 0 2px 14px;
          min-height: 28px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 400;
          color: var(--text-secondary);
          text-decoration: none;
          transition: background 0.12s, color 0.12s;
        }
        .sset-back:hover {
          background: color-mix(in srgb, var(--text) 6%, transparent);
          color: var(--text);
        }
        .sset-back-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          opacity: 0.75;
        }
        .sset-nav {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 0 2px;
        }
        .sset-group {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .sset-group-label {
          margin: 0 0 4px;
          padding: 2px 8px;
          font-size: 11.5px;
          font-weight: 500;
          letter-spacing: 0.01em;
          color: var(--text-muted);
          user-select: none;
        }
        .sset-item {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          margin: 0;
          padding: 6px 8px;
          min-height: 30px;
          border: 0;
          border-radius: 6px;
          font-size: 13.5px;
          font-weight: 400;
          color: var(--text-secondary);
          text-decoration: none;
          transition: background 0.12s, color 0.12s;
          cursor: pointer;
          background: transparent;
          text-align: left;
          font-family: inherit;
        }
        .sset-item-icon,
        .settings-nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          opacity: 0.72;
        }
        .sset-item:hover {
          background: color-mix(in srgb, var(--text) 5%, transparent);
          color: var(--text);
        }
        .sset-item:hover .sset-item-icon,
        .sset-item:hover .settings-nav-icon {
          opacity: 0.92;
        }
        .sset-item.on {
          background: color-mix(in srgb, var(--text) 9%, transparent);
          color: var(--text);
          font-weight: 500;
        }
        .sset-item.on .sset-item-icon,
        .sset-item.on .settings-nav-icon {
          opacity: 1;
        }
        html[data-theme="dark"] .sset-item.on,
        html[data-theme="classic-dark"] .sset-item.on {
          background: rgba(255, 255, 255, 0.08);
        }
        html[data-theme="dark"] .sset-item:hover,
        html[data-theme="classic-dark"] .sset-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        @media (max-width: 768px) {
          .sset-shell { display: none !important; }
        }
      `}</style>

      <aside className="sset-shell" aria-label="Einstellungen">
        <div className="sset">
          <Link href="/dashboard" className="sset-back" aria-label="Zurück zum Portal">
            <span className="sset-back-icon" aria-hidden>
              <ArrowLeft size={14} weight="bold" />
            </span>
            Zurück zum Portal
          </Link>

          <nav className="sset-nav" aria-label="Einstellungsbereiche">
            {SETTINGS_NAV_GROUPS.map(group => (
              <div key={group.label} className="sset-group">
                <p className="sset-group-label">{group.label}</p>
                <SettingsNavItems
                  items={group.items}
                  activeSlug={active}
                  showIcons
                  itemClassName={isActive => `sset-item${isActive ? ' on' : ''}`}
                />
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  )
}
