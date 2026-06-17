'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Pulse, Bell, Cube, SquaresFour, ListChecks, File, Plugs, UsersThree, GearSix,
} from '@phosphor-icons/react'

const NAV = [
  { href: '/dashboard', label: 'Statusabfrage', Icon: Pulse },
  { href: '/messages', label: 'Inbox', Icon: Bell },
  { href: '/projects', label: 'Projekte', Icon: Cube },
  { href: '/decisions', label: 'Entscheidungen', Icon: SquaresFour },
  { href: '/tasks', label: 'Tasks', Icon: ListChecks },
  { href: '/docs', label: 'Dokumente', Icon: File },
  { href: '/connectors', label: 'Connectors', Icon: Plugs },
  { href: '/teams', label: 'Teams', Icon: UsersThree },
  { href: '/settings', label: 'Einstellungen', Icon: GearSix },
] as const

type Props = {
  open: boolean
  onClose: () => void
}

export default function MobileNavSheet({ open, onClose }: Props) {
  const pathname = usePathname() || ''

  if (!open) return null

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <button type="button" className="mns-backdrop" aria-label="Schließen" onClick={onClose} />
      <nav className="mns-sheet" aria-label="Navigation">
        <div className="mns-grip" aria-hidden />
        <div className="mns-links">
          {NAV.map(item => {
            const Icon = item.Icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mns-link${active ? ' on' : ''}`}
                onClick={onClose}
              >
                <Icon size={18} weight="regular" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      <style jsx>{`
        .mns-backdrop {
          position: fixed; inset: 0; z-index: 800;
          background: rgba(15, 15, 16, 0.32);
          border: 0; padding: 0; cursor: default;
          animation: mnsFade .18s ease both;
        }
        .mns-sheet {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 801;
          background: #fff;
          border-radius: 20px 20px 0 0;
          padding: 10px 16px calc(16px + env(safe-area-inset-bottom, 0px));
          box-shadow: 0 -8px 40px rgba(15, 23, 42, 0.14);
          animation: mnsUp .24s cubic-bezier(.16, 1, .3, 1) both;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
        }
        :global([data-theme="dark"]) .mns-sheet,
        :global([data-theme="classic-dark"]) .mns-sheet {
          background: #141416;
          box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.45);
        }
        .mns-grip {
          width: 40px; height: 4px; margin: 0 auto 14px;
          border-radius: 999px;
          background: rgba(15, 15, 16, 0.12);
        }
        .mns-links {
          display: flex; flex-direction: column; gap: 2px;
          max-height: min(62vh, 480px);
          overflow-y: auto;
        }
        .mns-link {
          display: flex; align-items: center; gap: 12px;
          min-height: 44px; padding: 0 12px;
          border-radius: 12px;
          color: #4e5567;
          text-decoration: none;
          font-size: 15px; font-weight: 400;
          letter-spacing: 0.005em;
        }
        .mns-link.on {
          background: rgba(0, 0, 0, 0.055);
          color: #0f0f10;
        }
        :global([data-theme="dark"]) .mns-link,
        :global([data-theme="classic-dark"]) .mns-link { color: #9aa0ac; }
        :global([data-theme="dark"]) .mns-link.on,
        :global([data-theme="classic-dark"]) .mns-link.on {
          background: rgba(255, 255, 255, 0.08);
          color: #f4f4f4;
        }
        @keyframes mnsFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mnsUp { from { transform: translateY(100%); } to { transform: none; } }
      `}</style>
    </>
  )
}
