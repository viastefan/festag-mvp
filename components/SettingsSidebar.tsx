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
          width: 212px;
          box-sizing: border-box;
          pointer-events: none;
        }
        .sset {
          display: flex; flex-direction: column;
          height: 100%; min-height: 0;
          padding: 14px 8px 18px;
          color: var(--text);
          font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
          pointer-events: all;
        }
        .sset-back {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 10px; margin: 0 4px 16px;
          border-radius: 8px;
          font-size: 13px; font-weight: 500; letter-spacing: 0.01em;
          color: var(--text-secondary);
          text-decoration: none;
          transition: background .12s, color .12s;
        }
        .sset-back:hover { background: rgba(0,0,0,.04); color: var(--text); }
        [data-theme="dark"] .sset-back:hover { background: rgba(255,255,255,.05); }
        .sset-group { margin-bottom: 14px; }
        .sset-group-label {
          padding: 6px 14px 6px;
          font-size: 11.5px; font-weight: 600; letter-spacing: 0.01em;
          color: var(--text-secondary);
        }
        .sset-item {
          display: flex; align-items: center; gap: 8px;
          margin: 0 4px;
          padding: 0 10px;
          min-height: 27px;
          border-radius: 8px;
          font-size: 13px; font-weight: 500;
          color: var(--text-secondary);
          text-decoration: none;
          transition: background .12s, color .12s;
        }
        .sset-item:hover { background: rgba(0,0,0,.04); color: var(--text); }
        [data-theme="dark"] .sset-item:hover { background: rgba(255,255,255,.05); }
        .sset-item.on {
          background: rgba(0,0,0,.05); color: var(--text); font-weight: 600;
        }
        [data-theme="dark"] .sset-item.on { background: rgba(255,255,255,.075); }
      `}</style>

      <aside className="sset-shell" aria-label="Einstellungen">
        <div className="sset">
          <Link href="/dashboard" className="sset-back">
            <CaretLeft size={13} weight="bold" />
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
                    <item.icon size={14} weight={isActive ? 'bold' : 'regular'} />
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
