'use client'

/**
 * TagroIconRail — slim 56px icon-only rail mirroring the real Festag
 * sidebar navigation (Personal · Workspace · Tagro · Tools). Rendered
 * during Tagro fullscreen mode and on /ai. Mobile-hidden.
 *
 * Icons + routes come from the same component set the full Sidebar uses
 * — no random phosphor placeholders. Active state is tracked via
 * pathname so the user always sees where they are.
 *
 * Two presentations are supported:
 *   - 'shell'  → fixed left rail used by ClientAppShell (default)
 *   - 'inline' → static rail rendered inside the Tagro overlay so the
 *                portal never visually covers the shell rail beneath it.
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ChatCircle,
  CheckSquare,
  FileText,
  FolderSimple,
  GearSix,
  House,
  Scales,
  Sparkle,
  Tray,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'

type RailItem = {
  id: string
  label: string
  icon: ReactNode
  href: string
  match: (path: string) => boolean
}

const ITEMS: RailItem[] = [
  // Mirrors the real Sidebar order (personal → workspace → tagro → tools).
  { id: 'statusabfrage', label: 'Statusabfrage', icon: <House size={18} />,         href: '/dashboard',  match: (p) => p === '/dashboard' },
  { id: 'inbox',         label: 'Inbox',         icon: <Tray size={18} />,          href: '/inbox',      match: (p) => p.startsWith('/inbox') },
  { id: 'projects',      label: 'Projekte',      icon: <FolderSimple size={18} />,  href: '/projects',   match: (p) => p === '/projects' || p.startsWith('/project/') },
  { id: 'tasks',         label: 'Tasks',         icon: <CheckSquare size={18} />,   href: '/tasks',      match: (p) => p.startsWith('/tasks') },
  { id: 'decisions',     label: 'Entscheidungen',icon: <Scales size={18} />,        href: '/decisions',  match: (p) => p.startsWith('/decisions') },
  { id: 'reports',       label: 'Statusberichte',icon: <FileText size={18} />,      href: '/reports',    match: (p) => p.startsWith('/reports') },
  { id: 'tagro',         label: 'Tagro',         icon: <ChatCircle size={18} />,    href: '/ai',         match: (p) => p.startsWith('/ai') },
]

export default function TagroIconRail({ variant = 'shell' }: { variant?: 'shell' | 'inline' } = {}) {
  const pathname = usePathname() || ''
  const router = useRouter()

  return (
    <aside className={`tir-rail tir-rail-${variant}`} role="navigation" aria-label="Festag Navigation">
      <button
        type="button"
        className="tir-mark"
        aria-label="Festag"
        title="Festag"
        onClick={() => router.push('/dashboard')}
      >
        <Sparkle size={16} weight="fill" />
      </button>

      <nav className="tir-list">
        {ITEMS.map(item => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={false}
              className={`tir-btn${active ? ' is-active' : ''}`}
              aria-label={item.label}
              title={item.label}
            >
              <span className="tir-ico" aria-hidden>{item.icon}</span>
              <span className="tir-sr">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="tir-bottom">
        <Link href="/settings" prefetch={false} className={`tir-btn${pathname.startsWith('/settings') ? ' is-active' : ''}`} aria-label="Einstellungen" title="Einstellungen">
          <span className="tir-ico" aria-hidden><GearSix size={18} /></span>
          <span className="tir-sr">Einstellungen</span>
        </Link>
      </div>

      <style>{`
        .tir-rail {
          width: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 14px 0 12px;
          gap: 6px;
          background: var(--bg-app, var(--bg));
          border-right: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
        }
        .tir-rail-shell {
          position: fixed; top: 0; left: 0; bottom: 0;
          z-index: 80;
        }
        .tir-rail-inline {
          position: relative;
          height: 100%;
          flex: 0 0 56px;
          background: transparent;
          border-right-color: rgba(255,255,255,.04);
        }
        [data-theme="dark"] .tir-rail-shell,
        [data-theme="classic-dark"] .tir-rail-shell {
          background: #080808;
          border-right-color: rgba(255,255,255,.06);
        }
        [data-theme="light"] .tir-rail-shell,
        [data-theme="read"] .tir-rail-shell {
          background: #F7F7F5;
          border-right-color: rgba(0,0,0,.06);
        }
        .tir-mark {
          width: 32px; height: 32px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 0; border-radius: 8px; background: transparent;
          color: #5B647D; cursor: pointer;
          margin-bottom: 6px;
          transition: background .14s ease;
        }
        .tir-mark:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .tir-list {
          flex: 1; width: 100%;
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; padding-top: 4px;
        }
        .tir-bottom {
          width: 100%;
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; padding-top: 8px;
        }
        .tir-btn {
          width: 36px; height: 36px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 0; border-radius: 8px; background: transparent;
          color: #666; cursor: pointer; text-decoration: none;
          transition: background .14s ease, color .14s ease, transform .14s ease;
        }
        [data-theme="dark"] .tir-btn,
        [data-theme="classic-dark"] .tir-btn { color: #737373; }
        .tir-btn:hover { color: #111; background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
        [data-theme="dark"] .tir-btn:hover,
        [data-theme="classic-dark"] .tir-btn:hover {
          color: #F4F4F4; background: rgba(255,255,255,.04);
        }
        .tir-btn.is-active {
          color: #111; background: color-mix(in srgb, var(--surface-2) 80%, transparent);
        }
        [data-theme="dark"] .tir-btn.is-active,
        [data-theme="classic-dark"] .tir-btn.is-active {
          color: #F4F4F4; background: rgba(255,255,255,.06);
        }
        .tir-btn:active { transform: scale(.96); }
        .tir-ico { display: inline-flex; }
        .tir-sr {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
        }
        @media (max-width: 768px) {
          .tir-rail-shell, .tir-rail-inline { display: none; }
        }
      `}</style>
    </aside>
  )
}
