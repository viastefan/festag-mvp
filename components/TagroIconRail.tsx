'use client'

/**
 * TagroIconRail — PortalSidebar collapsed to a 56px icon rail for Tagro fullscreen.
 * Routes, icons and labels mirror PortalSidebar 1:1.
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import WorkspaceSymbol from '@/components/WorkspaceSymbol'
import { useNotifications } from '@/hooks/useNotifications'
import { useInboxUnread } from '@/hooks/useInboxUnread'
import { loadSymbol, onSymbolChange } from '@/lib/workspace-symbol'
import { PORTAL_NAV, PORTAL_SETTINGS } from '@/lib/portal-nav'
import type { MouseEvent } from 'react'

const ICON = 18

export type TagroIconRailProps = {
  variant?: 'shell' | 'inline'
  onNavigate?: (href: string) => void
}

export default function TagroIconRail({ variant = 'shell', onNavigate }: TagroIconRailProps) {
  const pathname = usePathname() || ''
  const router = useRouter()
  const [wsPrefs, setWsPrefs] = useState(() => loadSymbol('festag'))
  const { unread: notifUnread } = useNotifications({ unreadOnly: true, limit: 1 })
  const { unread: inboxUnread } = useInboxUnread()

  useEffect(() => {
    const off = onSymbolChange((key, prefs) => {
      if (key === 'festag') setWsPrefs(prefs)
    })
    return off
  }, [])

  function go(e: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!onNavigate) return
    e.preventDefault()
    onNavigate(href)
    window.setTimeout(() => router.push(href), 0)
  }

  function isActive(href: string, match?: (path: string) => boolean) {
    if (match) return match(pathname)
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  function renderItem(item: typeof PORTAL_NAV[number]) {
    const active = isActive(item.href, item.match)
    const Icon = item.Icon
    const isInbox = item.href === '/messages' || item.href.startsWith('/messages')
    const itemUnread = isInbox ? inboxUnread : (item.badge ? notifUnread : 0)
    const showBadge = item.badge && itemUnread > 0
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        className={`tir-btn${active ? ' is-active' : ''}`}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        title={item.label}
        onClick={(e) => go(e, item.href)}
      >
        <span className="tir-ico-wrap">
          <Icon size={ICON} weight="regular" />
          {showBadge && <span className="tir-badge" aria-label={`${itemUnread} ungelesen`} />}
        </span>
        <span className="tir-sr">{item.label}</span>
      </Link>
    )
  }

  const settingsActive = isActive(PORTAL_SETTINGS.href, PORTAL_SETTINGS.match)
  const SettingsIcon = PORTAL_SETTINGS.Icon

  return (
    <aside className={`tir-rail tir-rail-${variant}`} role="navigation" aria-label="Festag Navigation">
      <button
        type="button"
        className="tir-mark"
        aria-label="Festag"
        title="Festag"
        onClick={() => {
          const dest = '/dashboard'
          if (onNavigate) { onNavigate(dest); window.setTimeout(() => router.push(dest), 0) }
          else router.push(dest)
        }}
      >
        <WorkspaceSymbol
          variant={wsPrefs.variant}
          scheme={wsPrefs.scheme}
          seed={wsPrefs.seed}
          size={24}
        />
      </button>

      <nav className="tir-list">
        {PORTAL_NAV.map(renderItem)}
      </nav>

      <div className="tir-bottom">
        <Link
          href={PORTAL_SETTINGS.href}
          prefetch={false}
          className={`tir-btn${settingsActive ? ' is-active' : ''}`}
          aria-label={PORTAL_SETTINGS.label}
          title={PORTAL_SETTINGS.label}
          onClick={(e) => go(e, PORTAL_SETTINGS.href)}
        >
          <span className="tir-ico-wrap">
            <SettingsIcon size={ICON} weight="regular" />
          </span>
          <span className="tir-sr">{PORTAL_SETTINGS.label}</span>
        </Link>
      </div>

      <style>{`
        .tir-rail {
          width: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 0 14px;
          gap: 8px;
          background: var(--portal-bg, #F6F6F7);
          border-right: 1px solid rgba(0,0,0,.06);
          box-sizing: border-box;
        }
        .tir-rail-shell {
          position: fixed; top: 0; left: 0; bottom: 0;
          z-index: 80;
        }
        .tir-rail-inline {
          position: relative;
          height: 100%;
          flex: 0 0 56px;
        }
        [data-theme="dark"] .tir-rail,
        [data-theme="classic-dark"] .tir-rail {
          background: #111;
          border-right-color: rgba(255,255,255,.06);
        }
        .tir-mark {
          width: 28px; height: 28px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 0; border-radius: 6px; background: transparent;
          cursor: pointer; padding: 0;
          margin-bottom: 4px;
        }
        .tir-list {
          flex: 1; width: 100%;
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; padding-top: 2px;
          overflow-y: auto;
          scrollbar-width: none;
        }
        .tir-list::-webkit-scrollbar { display: none; }
        .tir-bottom {
          width: 100%;
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; padding-top: 8px;
        }
        .tir-btn {
          width: 36px; min-height: 36px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 0; border-radius: 4px; background: transparent;
          color: var(--portal-muted, #6b6b6f);
          cursor: pointer; text-decoration: none;
          transition: background .12s ease, color .12s ease;
          padding: 8px;
          box-sizing: border-box;
        }
        .tir-btn:hover {
          color: var(--portal-text, #1c1c1e);
          background: rgba(0,0,0,.035);
        }
        [data-theme="dark"] .tir-btn:hover,
        [data-theme="classic-dark"] .tir-btn:hover {
          color: #f4f4f4;
          background: rgba(255,255,255,.06);
        }
        .tir-btn.is-active {
          color: var(--portal-text, #1c1c1e);
          background: rgba(0,0,0,.05);
        }
        [data-theme="dark"] .tir-btn.is-active,
        [data-theme="classic-dark"] .tir-btn.is-active {
          color: #f4f4f4;
          background: rgba(255,255,255,.09);
        }
        .tir-btn:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--text) 50%, transparent);
          outline-offset: 2px;
        }
        .tir-ico-wrap {
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
          width: 18px; height: 18px;
        }
        .tir-badge {
          position: absolute; top: -3px; right: -5px;
          width: 8px; height: 8px; border-radius: 50%;
          background: #ff3b30;
          border: 1.5px solid var(--portal-bg, #000);
          box-shadow: 0 0 0 1px rgba(255, 59, 48, 0.35);
        }
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
