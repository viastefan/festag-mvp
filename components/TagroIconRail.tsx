'use client'

/**
 * TagroIconRail — slim 56px icon-only navigation rail.
 *
 * Shown instead of the full Sidebar when Tagro is in fullscreen agent mode
 * (and on /ai). Preserves Festag orientation without competing with the
 * agent workspace. Mobile is excluded — at <=768px the rail is hidden and
 * mobile uses the regular bottom-nav / 2-button object bar.
 *
 * No labels, no workspace card, no section headings — only icons. Active
 * icon tracks the current pathname so the user always sees where they are.
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Cards,
  ChatCircleDots,
  Checks,
  FolderSimple,
  GearSix,
  House,
  ListChecks,
  Sparkle,
  Tray,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'

type RailItem = {
  id: string
  label: string
  icon: ReactNode
  href?: string
  match?: (path: string) => boolean
  onClick?: () => void
}

export default function TagroIconRail() {
  const pathname = usePathname() || ''
  const router = useRouter()

  const items: RailItem[] = [
    {
      id: 'dashboard',
      label: 'Statusabfrage',
      icon: <House size={18} weight="regular" />,
      href: '/dashboard',
      match: (p) => p === '/dashboard',
    },
    {
      id: 'projects',
      label: 'Projekte',
      icon: <FolderSimple size={18} weight="regular" />,
      href: '/projects',
      match: (p) => p === '/projects' || p.startsWith('/project/'),
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <ListChecks size={18} weight="regular" />,
      href: '/tasks',
      match: (p) => p.startsWith('/tasks'),
    },
    {
      id: 'decisions',
      label: 'Entscheidungen',
      icon: <Checks size={18} weight="regular" />,
      href: '/decisions',
      match: (p) => p.startsWith('/decisions'),
    },
    {
      id: 'documents',
      label: 'Dokumente',
      icon: <Cards size={18} weight="regular" />,
      href: '/documents',
      match: (p) => p.startsWith('/documents'),
    },
    {
      id: 'inbox',
      label: 'Inbox',
      icon: <Tray size={18} weight="regular" />,
      href: '/inbox',
      match: (p) => p.startsWith('/inbox') || p.startsWith('/messages'),
    },
    {
      id: 'tagro',
      label: 'Tagro',
      icon: <ChatCircleDots size={18} weight="regular" />,
      href: '/ai',
      match: (p) => p.startsWith('/ai'),
    },
  ]

  const settings: RailItem = {
    id: 'settings',
    label: 'Einstellungen',
    icon: <GearSix size={18} weight="regular" />,
    href: '/settings',
    match: (p) => p.startsWith('/settings'),
  }

  function renderItem(it: RailItem) {
    const active = it.match ? it.match(pathname) : false
    const cls = `tir-btn${active ? ' is-active' : ''}`
    const content = (
      <>
        <span className="tir-ico" aria-hidden="true">{it.icon}</span>
        <span className="tir-sr">{it.label}</span>
      </>
    )
    if (it.href) {
      return (
        <Link key={it.id} href={it.href} className={cls} aria-label={it.label} title={it.label} prefetch={false}>
          {content}
        </Link>
      )
    }
    return (
      <button key={it.id} type="button" className={cls} aria-label={it.label} title={it.label} onClick={it.onClick}>
        {content}
      </button>
    )
  }

  return (
    <aside className="tir-rail" role="navigation" aria-label="Navigation">
      <div className="tir-brand" aria-hidden="true">
        <button
          type="button"
          className="tir-mark"
          aria-label="Festag"
          title="Festag"
          onClick={() => router.push('/dashboard')}
        >
          <Sparkle size={16} weight="fill" />
        </button>
      </div>

      <nav className="tir-list">
        {items.map(renderItem)}
      </nav>

      <div className="tir-bottom">
        {renderItem(settings)}
      </div>

      <style>{`
        .tir-rail {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 14px 0 12px;
          gap: 6px;
          background: var(--bg-app, var(--bg));
          border-right: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
          z-index: 80;
        }
        [data-theme="dark"] .tir-rail,
        [data-theme="classic-dark"] .tir-rail {
          background: #080808;
          border-right-color: rgba(255,255,255,.06);
        }
        [data-theme="light"] .tir-rail,
        [data-theme="read"] .tir-rail {
          background: #F7F7F5;
          border-right-color: rgba(0,0,0,.06);
        }
        .tir-brand {
          width: 100%;
          display: flex;
          justify-content: center;
          padding-bottom: 6px;
          margin-bottom: 4px;
        }
        .tir-mark {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 0;
          background: transparent;
          color: #5B647D;
          cursor: pointer;
          transition: background .14s ease, color .14s ease;
        }
        .tir-mark:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .tir-list {
          flex: 1;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding-top: 4px;
        }
        .tir-bottom {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding-top: 8px;
        }
        .tir-btn {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 0;
          background: transparent;
          color: #666;
          cursor: pointer;
          text-decoration: none;
          transition: background .14s ease, color .14s ease, transform .14s ease;
        }
        [data-theme="dark"] .tir-btn,
        [data-theme="classic-dark"] .tir-btn { color: #737373; }
        .tir-btn:hover {
          color: #111;
          background: color-mix(in srgb, var(--surface-2) 70%, transparent);
        }
        [data-theme="dark"] .tir-btn:hover,
        [data-theme="classic-dark"] .tir-btn:hover {
          color: #F4F4F4;
          background: rgba(255,255,255,.04);
        }
        .tir-btn.is-active {
          color: #111;
          background: color-mix(in srgb, var(--surface-2) 80%, transparent);
        }
        [data-theme="dark"] .tir-btn.is-active,
        [data-theme="classic-dark"] .tir-btn.is-active {
          color: #F4F4F4;
          background: rgba(255,255,255,.06);
        }
        .tir-btn:active { transform: scale(.96); }
        .tir-ico { display: inline-flex; }
        .tir-sr {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          white-space: nowrap;
          border: 0;
        }
        @media (max-width: 768px) {
          .tir-rail { display: none; }
        }
      `}</style>
    </aside>
  )
}
