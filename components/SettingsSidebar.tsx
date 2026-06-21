'use client'

/**
 * Settings-mode sidebar. Replaces the main app Sidebar while the user
 * is anywhere under /settings.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CaretLeft } from '@phosphor-icons/react'
import {
  SETTINGS_NAV_GROUPS,
  settingsHref,
  settingsSlugFromPath,
} from '@/components/settings/settings-config'

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
          display: flex; flex-direction: column;
          height: 100%; min-height: 0;
          padding: 16px 14px 18px;
          color: var(--text);
          font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
          font-weight: 400;
          letter-spacing: 0;
          pointer-events: all;
          background: var(--sidebar-bg);
          border-right: 0;
          box-shadow: none;
          overflow-y: auto;
        }
        .sset-back {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 0 12px; margin: 0 0 18px;
          min-height: 36px;
          border-radius: 4px;
          font-size: 13px; font-weight: 400; letter-spacing: 0;
          color: var(--nav-off-text);
          text-decoration: none;
          transition: background .12s, color .12s;
        }
        .sset-back:hover { background: var(--glass-nav-hover, rgba(0,0,0,.035)); color: var(--text); }
        [data-theme="dark"] .sset-back:hover { background: var(--glass-nav-hover, rgba(255,255,255,.06)); }
        .sset-group { margin-bottom: 12px; }
        .sset-group-label {
          padding: 6px 12px 8px;
          font-size: 11px; font-weight: 500; letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #8E8E93;
        }
        .sset-item {
          display: flex; align-items: center; gap: 12px;
          margin: 0;
          padding: 0 12px;
          min-height: 36px;
          border-radius: 4px;
          font-size: 13px; font-weight: 400;
          letter-spacing: 0;
          color: var(--nav-off-text);
          text-decoration: none;
          transition: background .12s, color .12s;
        }
        .sset-item:hover { background: var(--glass-nav-hover, rgba(0,0,0,.035)); color: var(--text); }
        [data-theme="dark"] .sset-item:hover { background: var(--glass-nav-hover, rgba(255,255,255,.06)); }
        .sset-item.on {
          background: var(--nav-on); color: var(--nav-on-text); font-weight: 400;
        }
        [data-theme="dark"] .sset-item.on { background: var(--nav-on); }
        @media (max-width: 768px) {
          .sset-shell { display: none !important; }
        }
      `}</style>

      <aside className="sset-shell" aria-label="Einstellungen">
        <div className="sset">
          <Link href="/dashboard" className="sset-back">
            <CaretLeft size={13} weight="regular" />
            <span>Zurück zur App</span>
          </Link>

          {SETTINGS_NAV_GROUPS.map(group => (
            <div key={group.label} className="sset-group">
              <div className="sset-group-label">{group.label}</div>
              {group.items.map(item => {
                const href = settingsHref(item.slug)
                const isActive = item.slug === active
                return (
                  <Link
                    key={item.slug || 'profile'}
                    href={href}
                    className={`sset-item${isActive ? ' on' : ''}`}
                  >
                    <item.icon size={18} weight="regular" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
