'use client'

/**
 * PortalSidebar — Figma App-Festag rail (node 323:140).
 * Used by /decisions and future portal-style pages.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Pulse, Bell, Folder, Scissors, ListChecks, File, Sparkle, UsersThree, Question,
  MagnifyingGlass, SidebarSimple, CaretDown,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard', label: 'Statusabfrage', icon: Pulse, gap: 20 },
  { href: '/messages', label: 'Inbox', icon: Bell, gap: 19 },
  { href: '/projects', label: 'Projekte', icon: Folder, gap: 22 },
  { href: '/decisions', label: 'Entscheidungen', icon: Scissors, gap: 22 },
  { href: '/tasks', label: 'Tasks', icon: ListChecks, gap: 21 },
  { href: '/docs', label: 'Dokumente', icon: File, gap: 22 },
  { href: '/tagro', label: 'Tagro Co-Pilot', icon: Sparkle, gap: 22 },
  { href: '/teams', label: 'Teams', icon: UsersThree, gap: 16 },
] as const

export default function PortalSidebar() {
  const pathname = usePathname() || ''
  const [initials, setInitials] = useState('ST')
  const [workspace, setWorkspace] = useState('Delivery')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const u = sessionData.session?.user
        if (!u || !alive) return

        const name: string = (u.user_metadata?.full_name || u.email || 'ST')
        const parts = name.replace(/^@/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2)
        setInitials(parts.map(p => p[0]?.toUpperCase()).join('') || 'ST')

        const { data: ws } = await supabase
          .from('workspaces')
          .select('name')
          .eq('primary_owner_id', u.id)
          .limit(1)
          .maybeSingle()
        if (ws?.name && alive) setWorkspace(ws.name)
      } catch { /* noop */ }
    })()
    return () => { alive = false }
  }, [])

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/statusabfrage'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="portal-nav" aria-label="Portalnavigation">
      <style>{CSS}</style>

      <div className="portal-nav-top">
        <div className="portal-nav-header">
          <div className="portal-nav-ws">
            <div className="portal-nav-avatar">{initials}</div>
            <div className="portal-nav-ws-text">
              <span className="portal-nav-ws-label">Workspace</span>
              <span className="portal-nav-ws-value">{workspace}</span>
            </div>
            <CaretDown size={8} weight="bold" className="portal-nav-ws-caret" aria-hidden />
          </div>
          <div className="portal-nav-utilities">
            <button type="button" className="portal-nav-utility" aria-label="Suche" title="Suche">
              <MagnifyingGlass size={14} weight="regular" />
            </button>
            <button type="button" className="portal-nav-utility" aria-label="Sidebar" title="Sidebar">
              <SidebarSimple size={14} weight="regular" />
            </button>
          </div>
        </div>

        <div className="portal-nav-items">
          {NAV.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`portal-nav-item${active ? ' active' : ''}`}
                style={{ ['--nav-gap' as string]: `${item.gap}px` }}
              >
                <Icon size={18} weight="regular" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <Link href="/support" className="portal-nav-help" aria-label="Hilfe" title="Hilfe">
        <Question size={20} weight="light" />
      </Link>
    </nav>
  )
}

const CSS = `
  .portal-nav {
    width: 100%; height: 100%;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 12px 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    color: var(--portal-muted, #6e717e);
  }

  .portal-nav-top { display: flex; flex-direction: column; gap: 24px; }

  .portal-nav-header {
    display: flex; align-items: center; justify-content: space-between;
    width: 184px; gap: 8px;
  }

  .portal-nav-ws {
    display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;
  }

  .portal-nav-avatar {
    width: 41px; height: 40px; border-radius: 999px;
    background: var(--portal-nav-avatar-bg, rgba(255,255,255,.8));
    border: 1px solid var(--portal-nav-avatar-border, #f3f5f7);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 500;
    color: var(--portal-text, #0f0f10);
    flex-shrink: 0;
  }

  .portal-nav-ws-text {
    display: flex; flex-direction: column; align-items: flex-start;
    line-height: 1; min-width: 0;
  }

  .portal-nav-ws-label {
    font-size: 9px; font-weight: 400;
    color: var(--portal-muted, #6e717e);
  }

  .portal-nav-ws-value {
    font-size: 14px; font-weight: 400;
    color: var(--portal-text, #0f0f10);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 72px;
  }

  .portal-nav-ws-caret { color: var(--portal-muted, #6e717e); flex-shrink: 0; }

  .portal-nav-utilities {
    display: flex; align-items: center; gap: 6px; flex-shrink: 0;
  }

  .portal-nav-utility {
    width: 18px; height: 18px; padding: 0; border: 0; background: transparent;
    color: var(--portal-muted, #6e717e); cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: color .12s;
  }
  .portal-nav-utility:hover { color: var(--portal-text, #0f0f10); }

  .portal-nav-items { display: flex; flex-direction: column; gap: 16px; }

  .portal-nav-item {
    display: flex; align-items: center;
    gap: var(--nav-gap, 20px);
    padding: 8px 12px;
    border-radius: 8px 6px 8px 8px;
    color: var(--portal-muted, #6e717e);
    font-size: 16px; font-weight: 400;
    letter-spacing: .02em; text-decoration: none;
    transition: color .12s, background .12s;
  }
  .portal-nav-item:hover { color: var(--portal-text, #0f0f10); }
  .portal-nav-item.active {
    color: var(--portal-text, #0f0f10);
    background: var(--portal-nav-active-bg, rgba(255,255,255,.8));
  }
  .portal-nav-item svg { flex-shrink: 0; }

  .portal-nav-help {
    margin-left: 12px; width: 24px; height: 24px;
    border: 0; background: transparent;
    color: var(--portal-muted, #6e717e);
    cursor: pointer; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    text-decoration: none;
    transition: color .12s;
  }
  .portal-nav-help:hover { color: var(--portal-text, #0f0f10); }
`
