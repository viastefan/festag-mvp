'use client'

/**
 * Settings-mode sidebar. Replaces the main app Sidebar while the user
 * is anywhere under /settings.
 *
 * Sections live under /settings/<slug>. The root /settings maps to "profile".
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  House, UserCircle, SunHorizon, ShieldCheck, Bell, LinkSimple,
  Briefcase, Receipt, GearSix, CaretLeft,
} from '@phosphor-icons/react'

type Item = { slug: string; label: string; icon: React.ElementType }
type Group = { label: string; items: Item[] }

const GROUPS: Group[] = [
  {
    label: 'Konto',
    items: [
      { slug: '',              label: 'Profil',             icon: UserCircle },
      { slug: 'appearance',    label: 'Erscheinung',        icon: SunHorizon },
      { slug: 'security',      label: 'Sicherheit',         icon: ShieldCheck },
      { slug: 'notifications', label: 'Benachrichtigungen', icon: Bell },
      { slug: 'connected',     label: 'Verbundene Konten',  icon: LinkSimple },
    ],
  },
  {
    label: 'Arbeitsbereich',
    items: [
      { slug: 'workspace', label: 'Workspace',          icon: GearSix },
      { slug: 'company',   label: 'Unternehmen',        icon: Briefcase },
      { slug: 'billing',   label: 'Abrechnung & Steuer', icon: Receipt },
    ],
  },
]

function currentSlug(pathname: string | null) {
  if (!pathname) return ''
  // /settings → '', /settings/billing → 'billing'
  const m = pathname.match(/^\/settings(?:\/([^/?#]+))?/)
  return m?.[1] || ''
}

export default function SettingsSidebar() {
  const pathname = usePathname()
  const active = currentSlug(pathname)

  return (
    <>
      <style>{`
        .sset-shell {
          position: fixed;
          inset: 0 auto 0 0;
          width: var(--festag-sidebar-width, 260px);
          box-sizing: border-box;
          pointer-events: none;
        }
        .sset {
          display: flex; flex-direction: column;
          height: 100%; min-height: 0;
          padding: 12px 10px 18px;
          color: var(--text);
          font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
          font-weight: 400;
          letter-spacing: var(--ls-sidebar, .005em);
          pointer-events: all;
          background: var(--sidebar-bg);
          border-right: 1px solid var(--sidebar-border);
        }
        .sset-back {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 10px; margin: 0 2px 16px;
          border-radius: 10px;
          font-size: 13px; font-weight: 400; letter-spacing: var(--ls-sidebar, .005em);
          color: var(--nav-off-text);
          text-decoration: none;
          transition: background .12s, color .12s;
        }
        .sset-back:hover { background: var(--glass-nav-hover, rgba(0,0,0,.035)); color: var(--text); }
        [data-theme="dark"] .sset-back:hover { background: var(--glass-nav-hover, rgba(255,255,255,.06)); }
        .sset-group { margin-bottom: 12px; }
        .sset-group-label {
          padding: 6px 12px 6px;
          font-size: 12px; font-weight: 400; letter-spacing: var(--ls-sidebar, .005em);
          color: var(--nav-off-text);
        }
        .sset-item {
          display: flex; align-items: center; gap: 10px;
          margin: 0 2px;
          padding: 0 10px;
          min-height: 34px;
          border-radius: 10px;
          font-size: 13px; font-weight: 400;
          letter-spacing: var(--ls-sidebar, .005em);
          color: var(--nav-off-text);
          text-decoration: none;
          transition: background .12s, color .12s;
        }
        .sset-item:hover { background: var(--glass-nav-hover, rgba(0,0,0,.035)); color: var(--text); }
        [data-theme="dark"] .sset-item:hover { background: var(--glass-nav-hover, rgba(255,255,255,.06)); }
        .sset-item.on {
          background: var(--nav-on); color: var(--nav-on-text); font-weight: 500;
        }
        [data-theme="dark"] .sset-item.on { background: var(--nav-on); }
      `}</style>

      <aside className="sset-shell" aria-label="Einstellungen">
        <div className="sset">
          <Link href="/dashboard" className="sset-back">
            <CaretLeft size={13} weight="regular" />
            <span>Zurück zur App</span>
          </Link>

          {GROUPS.map(group => (
            <div key={group.label} className="sset-group">
              <div className="sset-group-label">{group.label}</div>
              {group.items.map(item => {
                const href = item.slug ? `/settings/${item.slug}` : '/settings'
                const isActive = item.slug === active
                return (
                  <Link
                    key={item.slug || 'profile'}
                    href={href}
                    className={`sset-item${isActive ? ' on' : ''}`}
                  >
                    <item.icon size={14} weight="regular" />
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
