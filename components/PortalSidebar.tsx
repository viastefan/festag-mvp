'use client'

/**
 * PortalSidebar — Figma App-Festag (node 307:84).
 * Nav rail + „Letzte ausgeführt“ (Tagro/Chat-Verläufe).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import FestagIconButton from '@/components/ui/FestagIconButton'
import {
  Pulse, Bell, Cube, SquaresFour, ListChecks, File, Plugs, UsersThree, Question,
  SidebarSimple, CaretDown,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { useNotifications } from '@/hooks/useNotifications'

const ICON = 16

const NAV = [
  { href: '/dashboard', label: 'Statusabfrage', Icon: Pulse, gap: 20 },
  { href: '/messages', label: 'Inbox', Icon: Bell, gap: 19, badge: true },
  { href: '/projects', label: 'Projekte', Icon: Cube, gap: 22 },
  { href: '/decisions', label: 'Entscheidungen', Icon: SquaresFour, gap: 22 },
  { href: '/tasks', label: 'Tasks', Icon: ListChecks, gap: 21 },
  { href: '/docs', label: 'Dokumente', Icon: File, gap: 22 },
  { href: '/connectors', label: 'Connectors', Icon: Plugs, gap: 22 },
  { href: '/teams', label: 'Teams', Icon: UsersThree, gap: 16 },
] as const

type RecentItem = { id: string; label: string; href: string }

const MOCK_RECENT: RecentItem[] = [
  { id: 'm1', label: 'Entscheidung erteilt für Logo Farb..', href: '/decisions/mock-1' },
  { id: 'm2', label: 'Blocker erteilt für Premium Featur..', href: '/tasks' },
  { id: 'm3', label: 'Entscheidung abgelehnt Logo Farb..', href: '/decisions/mock-1' },
  { id: 'm4', label: 'Entscheidung erteilt für Logo Farb..', href: '/decisions/mock-2' },
  { id: 'm5', label: 'Blocker erteilt für Premium Featur..', href: '/tasks' },
  { id: 'm6', label: 'Entscheidung abgelehnt Logo Farb..', href: '/decisions/mock-3' },
  { id: 'm7', label: 'Entscheidung erteilt für Logo Farb..', href: '/decisions/mock-4' },
  { id: 'm8', label: 'Blocker erteilt für Premium Featur..', href: '/tasks' },
]

type Props = {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

function truncateLabel(text: string, max = 34) {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 2).trimEnd()}..`
}

export default function PortalSidebar({ collapsed = false, onToggleCollapse }: Props) {
  const pathname = usePathname() || ''
  const [initials, setInitials] = useState('ST')
  const [workspace, setWorkspace] = useState('Delivery')
  const [recent, setRecent] = useState<RecentItem[]>([])
  const { unread } = useNotifications({ unreadOnly: true, limit: 1 })

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/conversations', { credentials: 'include' })
      if (!res.ok) {
        setRecent(MOCK_RECENT)
        return
      }
      const data = await res.json().catch(() => null)
      const rows = Array.isArray(data?.conversations) ? data.conversations : []
      if (!rows.length) {
        setRecent(MOCK_RECENT)
        return
      }
      setRecent(rows.slice(0, 8).map((c: { id: string; title?: string; summary?: string }) => ({
        id: c.id,
        label: truncateLabel(c.summary || c.title || 'Tagro Chat'),
        href: `/ai?contextType=empty&contextTitle=${encodeURIComponent(c.title || 'Chat')}`,
      })))
    } catch {
      setRecent(MOCK_RECENT)
    }
  }, [])

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

  useEffect(() => { loadRecent() }, [loadRecent])

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/statusabfrage'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function openSearch() {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  const displayRecent = recent.length ? recent : MOCK_RECENT

  return (
    <nav
      className={`portal-nav${collapsed ? ' is-collapsed' : ''}`}
      aria-label="Portalnavigation"
      data-collapsed={collapsed ? '1' : '0'}
    >
      <style>{CSS}</style>

      <div className="portal-nav-top">
        <div className="portal-nav-header">
          <div className="portal-nav-ws">
            <div className="portal-nav-avatar" aria-hidden>{initials}</div>
            <div className="portal-nav-ws-text">
              <span className="portal-nav-ws-label">Workspace</span>
              <span className="portal-nav-ws-value">{workspace}</span>
            </div>
            <CaretDown size={8} weight="bold" className="portal-nav-ws-caret" aria-hidden />
          </div>
          <div className="portal-nav-utilities">
            <FestagIconButton size={28} aria-label="Suche" title="Suche (⌘K)" onClick={openSearch}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <circle cx="6.25" cy="6.25" r="4.25" stroke="currentColor" strokeWidth="1.25" />
                <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
            </FestagIconButton>
            <FestagIconButton
              size={28}
              aria-label={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
              title={collapsed ? 'Ausklappen' : 'Einklappen'}
              onClick={onToggleCollapse}
            >
              <SidebarSimple size={14} weight="regular" />
            </FestagIconButton>
          </div>
        </div>

        <div className="portal-nav-items">
          {NAV.map(item => {
            const Icon = item.Icon
            const active = isActive(item.href)
            const showBadge = 'badge' in item && item.badge && unread > 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`portal-nav-item${active ? ' active' : ''}`}
                style={{ ['--nav-gap' as string]: `${item.gap}px` }}
                title={collapsed ? item.label : undefined}
              >
                <span className="portal-nav-icon-wrap">
                  <Icon size={ICON} weight="regular" />
                  {showBadge && <span className="portal-nav-badge" aria-label={`${unread} ungelesen`} />}
                </span>
                <span className="portal-nav-label">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="portal-nav-bottom">
        <p className="portal-nav-recent-label">Letzte ausgeführt</p>
        <div className="portal-nav-recent" role="list">
          {displayRecent.map(item => (
            <Link key={item.id} href={item.href} className="portal-nav-recent-item" role="listitem" title={item.label}>
              {item.label}
            </Link>
          ))}
        </div>
        <Link href="/support" className="portal-nav-help" aria-label="Hilfe" title="Hilfe">
          <Question size={ICON} weight="regular" />
        </Link>
      </div>
    </nav>
  )
}

const CSS = `
  .portal-nav {
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    padding: 8px 0 10px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    color: var(--portal-muted, #6e717e);
    font-weight: 400;
    letter-spacing: 0;
    overflow: hidden;
    box-sizing: border-box;
  }

  .portal-nav-top {
    display: flex; flex-direction: column; gap: 20px;
    min-width: 0; flex: 1 1 auto; min-height: 0;
  }

  .portal-nav-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 6px; min-width: 0; flex-shrink: 0;
    padding: 0 2px;
  }

  .portal-nav-ws {
    display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;
  }

  .portal-nav-avatar {
    width: 36px; height: 36px; border-radius: 999px;
    background: var(--portal-nav-avatar-bg, rgba(255,255,255,.8));
    border: 1px solid var(--portal-nav-avatar-border, #f3f5f7);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 500;
    color: var(--portal-text, #0f0f10);
    flex-shrink: 0;
    letter-spacing: 0;
  }

  .portal-nav-ws-text {
    display: flex; flex-direction: column; align-items: flex-start;
    gap: 2px; line-height: 1; min-width: 0;
    transition: opacity .18s ease, width .18s ease;
  }

  .portal-nav-ws-label {
    font-size: 9px; font-weight: 400;
    color: var(--portal-muted, #6e717e);
    letter-spacing: 0;
  }

  .portal-nav-ws-value {
    font-size: 13px; font-weight: 400;
    color: var(--portal-text, #0f0f10);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 88px;
    letter-spacing: -0.01em;
  }

  .portal-nav-ws-caret {
    color: var(--portal-muted, #6e717e);
    flex-shrink: 0;
    margin-top: 6px;
    transition: opacity .18s ease;
  }

  .portal-nav-utilities {
    display: flex; align-items: center; gap: 4px; flex-shrink: 0;
    padding-top: 2px;
  }

  .portal-nav-items {
    display: flex; flex-direction: column; gap: 4px;
    min-width: 0;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .portal-nav-items::-webkit-scrollbar { display: none; }

  .portal-nav-item {
    display: flex; align-items: center;
    gap: var(--nav-gap, 20px);
    padding: 7px 10px;
    border-radius: 6px;
    color: var(--portal-muted, #6e717e);
    font-size: 14px; font-weight: 400;
    letter-spacing: 0; text-decoration: none;
    transition: color .12s, background .12s, box-shadow .12s;
    white-space: nowrap;
    min-height: 32px;
    box-sizing: border-box;
  }
  .portal-nav-item:hover:not(.active) {
    color: var(--portal-text, #0f0f10);
    background: rgba(255, 255, 255, 0.6);
    box-shadow: none;
  }
  .portal-nav-item.active {
    color: var(--portal-text, #0f0f10);
    background: var(--portal-nav-active-bg, rgba(255, 255, 255, 0.95));
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  [data-theme="dark"] .portal-nav-item:hover:not(.active),
  [data-theme="classic-dark"] .portal-nav-item:hover:not(.active) {
    background: rgba(255, 255, 255, 0.08);
  }
  [data-theme="dark"] .portal-nav-item.active,
  [data-theme="classic-dark"] .portal-nav-item.active {
    background: var(--portal-nav-active-bg, rgba(255, 255, 255, 0.1));
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  }

  .portal-nav-icon-wrap {
    position: relative;
    display: inline-flex; align-items: center; justify-content: center;
    width: 16px; height: 16px; flex-shrink: 0;
  }
  .portal-nav-badge {
    position: absolute; top: -2px; right: -3px;
    width: 6px; height: 6px; border-radius: 50%;
    background: #007aff;
    border: 1.5px solid var(--portal-bg, #f1f3f5);
  }
  .portal-nav-item.active .portal-nav-badge {
    border-color: var(--portal-nav-active-bg, #fff);
  }

  .portal-nav-label {
    overflow: hidden; text-overflow: ellipsis;
    transition: opacity .18s ease, width .18s ease;
  }

  .portal-nav-bottom {
    flex: 0 0 auto;
    display: flex; flex-direction: column;
    gap: 8px; min-width: 0;
    padding-top: 16px;
    margin-top: 8px;
    border-top: 1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 55%, transparent);
  }

  .portal-nav-recent-label {
    margin: 0 0 2px 10px;
    font-size: 11px; font-weight: 400;
    color: var(--portal-muted, #6e717e);
    letter-spacing: -0.01em;
  }

  .portal-nav-recent {
    display: flex; flex-direction: column; gap: 2px;
    max-height: 168px; overflow-y: auto;
    scrollbar-width: none;
    padding: 0 4px;
  }
  .portal-nav-recent::-webkit-scrollbar { display: none; }

  .portal-nav-recent-item {
    display: block;
    padding: 5px 8px;
    border-radius: 6px;
    font-size: 12px; font-weight: 400;
    line-height: 1.35;
    color: var(--portal-muted, #6e717e);
    text-decoration: none;
    letter-spacing: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    transition: color .12s, background .12s;
  }
  .portal-nav-recent-item:hover {
    color: var(--portal-text, #0f0f10);
    background: var(--portal-row-hover, rgba(241,243,245,.4));
  }

  .portal-nav-help {
    margin: 4px 0 0 10px; width: 28px; height: 28px;
    border: 0; background: transparent;
    color: var(--portal-muted, #6e717e);
    cursor: pointer; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    text-decoration: none; border-radius: 6px;
    transition: color .12s, background .12s;
    flex-shrink: 0;
  }
  .portal-nav-help:hover {
    color: var(--portal-text, #0f0f10);
    background: color-mix(in srgb, var(--portal-pill-bg, #f1f3f5) 55%, transparent);
  }

  /* ── Collapsed rail ── */
  .portal-nav.is-collapsed .portal-nav-ws-text,
  .portal-nav.is-collapsed .portal-nav-ws-caret,
  .portal-nav.is-collapsed .portal-nav-bottom {
    opacity: 0; height: 0; overflow: hidden; pointer-events: none;
    margin: 0; padding: 0; border: 0;
  }
  .portal-nav.is-collapsed .portal-nav-header {
    flex-direction: column; align-items: center; gap: 8px;
    padding: 0;
  }
  .portal-nav.is-collapsed .portal-nav-ws {
    justify-content: center;
  }
  .portal-nav.is-collapsed .portal-nav-utilities {
    flex-direction: column; gap: 4px; padding-top: 0;
  }
  .portal-nav.is-collapsed .portal-nav-label {
    opacity: 0; width: 0; pointer-events: none;
  }
  .portal-nav.is-collapsed .portal-nav-item {
    justify-content: center;
    gap: 0;
    padding: 8px;
    border-radius: 6px;
  }
  .portal-nav.is-collapsed .portal-nav-items { align-items: center; }
`
