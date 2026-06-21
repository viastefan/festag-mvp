'use client'

/**
 * PortalSidebar — Codex-inspired flat rail.
 * Nav + „Letzte ausgeführt" (Tagro/Chat-Verläufe).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FestagIconButton from '@/components/ui/FestagIconButton'
import NotificationsBell from '@/components/NotificationsBell'
import PortalWorkspacePopover from '@/components/PortalWorkspacePopover'
import {
  SidebarSimple, CaretDown, GearSix,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { usePortalNavItems } from '@/hooks/usePortalNavItems'
import WorkspaceSymbol from '@/components/WorkspaceSymbol'
import { createClient } from '@/lib/supabase/client'
import { autoAvatarColor, avatarInitials } from '@/lib/avatar'
import { loadSymbol, onSymbolChange } from '@/lib/workspace-symbol'
import { useNotifications } from '@/hooks/useNotifications'
import { useInboxUnread } from '@/hooks/useInboxUnread'
import { portalNavShortcutKeys } from '@/lib/portal-nav-shortcuts'
import {
  navShortcutPointerEnter,
  navShortcutPointerLeave,
  navShortcutDismissAll,
} from '@/lib/portal-nav-shortcut-coordinator'
import PortalNavShortcutTip from '@/components/portal/PortalNavShortcutTip'
import { useNavShortcutActive } from '@/hooks/useNavShortcutActive'

const WORKSPACE_MODE_LABELS: Record<string, string> = {
  delivery: 'Festag Delivery',
  team: 'Teams',
  agency: 'Agency',
}

const ICON = 18

function workspaceModeLabel(mode: string) {
  return WORKSPACE_MODE_LABELS[mode] || 'Festag Delivery'
}

type RecentItem = { id: string; label: string; href: string; age?: string }

type TeamMember = { id: string; name: string; color: string; avatarUrl: string | null }

const MOCK_RECENT: RecentItem[] = [
  { id: 'm1', label: 'Entscheidung erteilt für Logo Farb..', href: '/decisions/mock-1', age: '1 W' },
  { id: 'm2', label: 'Blocker erteilt für Premium Featur..', href: '/tasks', age: '1 W' },
  { id: 'm3', label: 'Entscheidung abgelehnt Logo Farb..', href: '/decisions/mock-1', age: '2 W' },
  { id: 'm4', label: 'Entscheidung erteilt für Logo Farb..', href: '/decisions/mock-2', age: '2 W' },
  { id: 'm5', label: 'Blocker erteilt für Premium Featur..', href: '/tasks', age: '3 W' },
  { id: 'm6', label: 'Entscheidung abgelehnt Logo Farb..', href: '/decisions/mock-3', age: '3 W' },
  { id: 'm7', label: 'Entscheidung erteilt für Logo Farb..', href: '/decisions/mock-4', age: '4 W' },
  { id: 'm8', label: 'Blocker erteilt für Premium Featur..', href: '/tasks', age: '4 W' },
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

function fmtRecentAge(iso?: string | null): string {
  if (!iso) return ''
  const weeks = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / (7 * 24 * 3600 * 1000)))
  return `${weeks} W`
}


function PortalNavItem({
  href,
  label,
  Icon,
  active,
  collapsed,
  showBadge,
  unread,
  shortcutActive,
}: {
  href: string
  label: string
  Icon: Icon
  active: boolean
  collapsed: boolean
  showBadge: boolean
  unread: number
  shortcutActive: boolean
}) {
  const shortcutKeys = portalNavShortcutKeys(href)
  const shortcutTitle = shortcutKeys?.join(' then ')

  return (
    <Link
      href={href}
      data-portal-nav-href={href}
      className={`portal-nav-item${active ? ' active' : ''}${shortcutKeys && !collapsed ? ' has-shortcut' : ''}`}
      title={collapsed ? label : shortcutTitle ? `${label} (${shortcutKeys?.join(' ')})` : label}
      onMouseEnter={() => { if (shortcutKeys && !collapsed) navShortcutPointerEnter(href) }}
      onMouseLeave={() => { if (shortcutKeys) navShortcutPointerLeave(href) }}
    >
      <span className="portal-nav-icon-wrap">
        <Icon size={ICON} weight="regular" />
        {showBadge && <span className="portal-nav-badge" aria-hidden />}
      </span>
      <span className="portal-nav-label">{label}</span>
      {showBadge && !collapsed && unread > 0 && !shortcutActive ? (
        <span className="portal-nav-count" aria-label={`${unread} ungelesen`}>
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  )
}

export default function PortalSidebar({ collapsed = false, onToggleCollapse }: Props) {
  const pathname = usePathname() || ''
  const onProjectsContext = pathname === '/projects' || pathname.startsWith('/project/')
  const wsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [wsMenuOpen, setWsMenuOpen] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceMode, setWorkspaceMode] = useState('delivery')
  const [wsSymbolKey, setWsSymbolKey] = useState('festag')
  const [wsPrefs, setWsPrefs] = useState(() => loadSymbol('festag'))
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [initials, setInitials] = useState('F')
  const [avatarColor, setAvatarColor] = useState('#5B647D')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [recent, setRecent] = useState<RecentItem[]>([])
  const { unread: notifUnread } = useNotifications({ unreadOnly: true, limit: 1 })
  const { unread: inboxUnread } = useInboxUnread()
  const { items: navItems } = usePortalNavItems()
  const shortcutActiveHref = useNavShortcutActive()
  const navShortcutLabels = useMemo(
    () => Object.fromEntries(navItems.map(item => [item.href, item.label])),
    [navItems],
  )

  useEffect(() => {
    if (collapsed) navShortcutDismissAll()
  }, [collapsed])

  const loadProjectsSidebar = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('projects')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false })
        .limit(8)
      if (!data?.length) {
        setRecent(prev => (prev.length ? prev : []))
        return
      }
      setRecent(data.map(p => ({
        id: p.id,
        label: truncateLabel(p.title || 'Projekt'),
        href: `/project/${p.id}`,
        age: fmtRecentAge(p.updated_at),
      })))
    } catch {
      /* keep previous recent rows */
    }
  }, [])

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/conversations', { credentials: 'include' })
      if (!res.ok) {
        setRecent(prev => (prev.length ? prev : MOCK_RECENT))
        return
      }
      const data = await res.json().catch(() => null)
      const rows = Array.isArray(data?.conversations) ? data.conversations : []
      if (!rows.length) {
        setRecent(prev => (prev.length ? prev : MOCK_RECENT))
        return
      }
      setRecent(rows.slice(0, 8).map((c: { id: string; title?: string; summary?: string; updated_at?: string }) => ({
        id: c.id,
        label: truncateLabel(c.summary || c.title || 'Tagro Chat'),
        href: `/ai?contextType=empty&contextTitle=${encodeURIComponent(c.title || 'Chat')}`,
        age: fmtRecentAge(c.updated_at),
      })))
    } catch {
      setRecent(prev => (prev.length ? prev : MOCK_RECENT))
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

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, first_name, email, avatar_url, avatar_color')
          .eq('id', u.id)
          .maybeSingle()

        if (!alive) return
        const p = profile as {
          full_name?: string | null
          first_name?: string | null
          email?: string | null
          avatar_url?: string | null
          avatar_color?: string | null
        } | null
        const userEmail = p?.email || u.email || ''
        const name = (p?.full_name || '').trim() || (p?.first_name || '').trim() || userEmail.split('@')[0] || 'Festag'
        setDisplayName(name)
        setEmail(userEmail)
        setInitials(avatarInitials(name, userEmail))
        setAvatarColor(p?.avatar_color || autoAvatarColor(u.id || userEmail))
        setAvatarUrl(p?.avatar_url ?? null)

        const { data: ws } = await supabase
          .from('workspaces')
          .select('id, name, mode')
          .eq('primary_owner_id', u.id)
          .eq('is_personal', true)
          .maybeSingle()
        if (!alive) return
        const mode = (ws as { mode?: string } | null)?.mode
        if (mode === 'team' || mode === 'agency' || mode === 'delivery') setWorkspaceMode(mode)
        const wn = typeof (ws as { name?: string } | null)?.name === 'string'
          ? (ws as { name: string }).name.trim()
          : ''
        if (wn) setWorkspaceName(wn)

        const wsId = (ws as { id?: string } | null)?.id
        if (wsId) {
          try {
            const { data: mem } = await supabase
              .from('workspace_members')
              .select('user_id, role')
              .eq('workspace_id', wsId)
            const memRows = (mem as { user_id: string }[] | null) ?? []
            const ids = Array.from(new Set([u.id, ...memRows.map(r => r.user_id)].filter(Boolean)))
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, full_name, first_name, email, avatar_url, avatar_color')
              .in('id', ids)
            const pById = new Map(
              ((profs ?? []) as Array<{
                id: string
                full_name?: string | null
                first_name?: string | null
                email?: string | null
                avatar_url?: string | null
                avatar_color?: string | null
              }>).map(row => [row.id, row]),
            )
            const toMember = (uid: string): TeamMember => {
              const pr = pById.get(uid)
              const nm = (pr?.full_name || '').trim() || (pr?.first_name || '').trim() || (pr?.email || '').split('@')[0] || 'Mitglied'
              return {
                id: uid,
                name: nm,
                color: pr?.avatar_color || autoAvatarColor(uid || pr?.email),
                avatarUrl: pr?.avatar_url ?? null,
              }
            }
            const ordered = [u.id, ...memRows.map(r => r.user_id).filter(x => x !== u.id)]
            setMembers(Array.from(new Set(ordered)).map(toMember))
          } catch { /* noop */ }
        }

        const symbolKey = (wn || mode || userEmail || 'festag').trim().toLowerCase()
        setWsSymbolKey(symbolKey)
        setWsPrefs(loadSymbol(symbolKey))
      } catch { /* noop */ }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const off = onSymbolChange((key, prefs) => {
      if (key === wsSymbolKey) setWsPrefs(prefs)
    })
    return off
  }, [wsSymbolKey])

  const workspaceLabel = workspaceModeLabel(workspaceMode)
  const workspaceMeta = workspaceLabel

  async function logout() {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  useEffect(() => {
    if (onProjectsContext) loadProjectsSidebar()
    else loadRecent()
  }, [onProjectsContext, loadProjectsSidebar, loadRecent])

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/statusabfrage'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function isRecentActive(item: RecentItem) {
    if (item.href.startsWith('/decisions/')) {
      return pathname === item.href
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

  const displayRecent = onProjectsContext ? recent : (recent.length ? recent : MOCK_RECENT)
  const recentLabel = onProjectsContext ? 'Deine Projekte' : 'Letzte ausgeführt'

  const activeRecentId = useMemo(() => {
    const match = displayRecent.find(item => isRecentActive(item))
    return match?.id ?? null
  }, [pathname, displayRecent])

  function openSearch() {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  return (
    <nav
      className={`portal-nav${collapsed ? ' is-collapsed' : ''}`}
      aria-label="Portalnavigation"
      data-collapsed={collapsed ? '1' : '0'}
    >
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: CSS }} />
      <PortalNavShortcutTip labelByHref={navShortcutLabels} collapsed={collapsed} />

      <div className="portal-nav-top">
        <div className="portal-nav-header">
          <PortalWorkspacePopover
            open={wsMenuOpen}
            onOpenChange={setWsMenuOpen}
            anchorRef={wsTriggerRef}
            workspaceLabel={workspaceLabel}
            workspaceMeta={workspaceMeta}
            wsPrefs={wsPrefs}
            displayName={displayName}
            email={email}
            initials={initials}
            avatarColor={avatarColor}
            avatarUrl={avatarUrl}
            members={members}
            onLogout={logout}
            railCollapsed={collapsed}
            trigger={(
              <button
                ref={wsTriggerRef}
                type="button"
                className={`portal-nav-ws${wsMenuOpen ? ' is-open' : ''}`}
                title={workspaceLabel}
                aria-label="Workspace-Menü"
                aria-haspopup="menu"
                aria-expanded={wsMenuOpen}
                onClick={() => setWsMenuOpen(v => !v)}
              >
                <div className="portal-nav-ws-mark" aria-hidden>
                  <WorkspaceSymbol
                    variant={wsPrefs.variant}
                    scheme={wsPrefs.scheme}
                    seed={wsPrefs.seed}
                    size={collapsed ? 28 : 20}
                  />
                </div>
                <div className="portal-nav-ws-copy">
                  <div className="portal-nav-ws-text">
                    <span className="portal-nav-ws-label">Workspace</span>
                    <span className="portal-nav-ws-value" title={workspaceLabel}>{workspaceLabel}</span>
                  </div>
                  <CaretDown size={8} weight="bold" className="portal-nav-ws-caret" aria-hidden />
                </div>
              </button>
            )}
          />
          <div className="portal-nav-utilities">
            <FestagIconButton size={28} aria-label="Suche" title="Suche (⌘K)" onClick={openSearch} className="portal-nav-util-btn">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <circle cx="6.25" cy="6.25" r="4.25" stroke="currentColor" strokeWidth="1.25" />
                <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
            </FestagIconButton>
            <div className="portal-nav-bell">
              <NotificationsBell variant="portal" limit={14} />
            </div>
            <FestagIconButton
              size={28}
              aria-label={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
              title={collapsed ? 'Ausklappen' : 'Einklappen'}
              onClick={onToggleCollapse}
              className="portal-nav-util-btn"
            >
              <SidebarSimple size={14} weight="regular" />
            </FestagIconButton>
          </div>
        </div>

        <div className="portal-nav-items" onMouseLeave={navShortcutDismissAll}>
          {navItems.map(item => {
            const active = item.match ? item.match(pathname) : isActive(item.href)
            const isInbox = item.href === '/messages' || item.href.startsWith('/messages')
            const itemUnread = isInbox ? inboxUnread : (item.badge ? notifUnread : 0)
            const showBadge = !!(item.badge && itemUnread > 0)
            return (
              <PortalNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.Icon}
                active={active}
                collapsed={collapsed}
                showBadge={showBadge}
                unread={itemUnread}
                shortcutActive={shortcutActiveHref === item.href}
              />
            )
          })}
        </div>
      </div>

      <div className="portal-nav-middle">
        <p className="portal-nav-recent-label">{recentLabel}</p>
        <div className="portal-nav-recent" role="list">
          {displayRecent.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className={`portal-nav-recent-item${activeRecentId === item.id ? ' active' : ''}`}
              role="listitem"
              title={item.label}
            >
              <span className="portal-nav-recent-text">{item.label}</span>
              {item.age ? <span className="portal-nav-recent-age">{item.age}</span> : null}
            </Link>
          ))}
        </div>
      </div>

      <div className="portal-nav-footer">
        <Link href="/settings" className="portal-nav-footer-link" title="Einstellungen">
          <GearSix size={ICON} weight="regular" />
          <span>Einstellungen</span>
        </Link>
        <Link href="/support" className="portal-nav-footer-btn" aria-label="Hilfe" title="Hilfe">
          Hilfe
        </Link>
      </div>
    </nav>
  )
}

const CSS = `
  .portal-nav {
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    padding: 12px 8px 12px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    color: var(--portal-muted, #6b6b6f);
    font-weight: 400;
    letter-spacing: 0.5px;
    overflow: hidden;
    box-sizing: border-box;
    background: transparent;
  }

  .portal-nav-top {
    display: flex; flex-direction: column; gap: 12px;
    min-width: 0; width: 100%;
    flex-shrink: 0;
  }

  .portal-nav-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 4px;
    min-width: 0;
    flex-shrink: 0;
    padding: 0;
  }

  .portal-nav-ws {
    display: flex; align-items: center; gap: 6px;
    min-width: 0;
    max-width: 100%;
    padding: 2px 4px 2px 2px;
    margin: -2px 0 -2px -2px;
    border: 0; background: transparent;
    border-radius: 8px;
    cursor: pointer;
    font: inherit; text-align: left;
    transition: background .12s ease;
    overflow: hidden;
  }

  .portal-nav-ws-copy {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 0 1 auto;
    max-width: 100%;
    overflow: hidden;
  }
  .portal-nav-ws:hover,
  .portal-nav-ws.is-open {
    background: var(--portal-row-hover, rgba(242,242,247,.6));
  }
  .portal-nav-ws:focus { outline: none; }
  .portal-nav-ws:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--portal-text, #1c1c1e) 35%, transparent);
    outline-offset: 2px;
  }

  .portal-nav-ws-mark {
    width: 20px; height: 20px;
    flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 5px;
    overflow: hidden;
  }
  .portal-nav-ws-mark > span,
  .portal-nav-ws-mark svg {
    border-radius: 6px !important;
  }

  .portal-nav-ws-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    line-height: 1.15;
    min-width: 0;
    flex: 0 1 auto;
    overflow: hidden;
    transition: opacity .18s ease, width .18s ease;
  }

  .portal-nav-ws-label {
    font-size: 10px;
    font-weight: 500;
    color: var(--portal-muted, #8e8e93);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .portal-nav-ws-value {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--portal-text, #1c1c1e);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    letter-spacing: 0;
    line-height: 1.2;
  }

  .portal-nav-ws-caret {
    color: var(--portal-muted, #8e8e93);
    flex-shrink: 0;
    opacity: 0.55;
    transition: opacity .18s ease, transform .18s ease;
  }
  .portal-nav-ws.is-open .portal-nav-ws-caret {
    transform: rotate(180deg);
    opacity: 1;
  }

  .portal-nav-utilities {
    display: flex;
    align-items: center;
    gap: 0;
    flex-shrink: 0;
  }
  .portal-nav-utilities .fui-icon-btn,
  .portal-nav-utilities .portal-nav-util-btn {
    background: transparent;
    border: none;
    box-shadow: none;
    transform: none;
    color: var(--portal-muted, #6b6b6f);
    border-radius: 6px;
    width: 24px;
    height: 24px;
    min-width: 24px;
    padding: 0;
  }
  .portal-nav-utilities .nb-trigger.portal {
    width: 24px !important;
    min-width: 24px !important;
    height: 24px !important;
    padding: 0 !important;
    border-radius: 6px !important;
  }
  .portal-nav-utilities .fui-icon-btn:hover:not(:disabled) {
    background: rgba(0,0,0,.04);
    border: none;
    box-shadow: none;
    transform: none;
    color: var(--portal-text, #1c1c1e);
  }
  .portal-nav-utilities .fui-icon-btn:active:not(:disabled) {
    background: rgba(0,0,0,.06);
    box-shadow: none;
    transform: none;
  }
  .portal-nav-bell {
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .portal-nav-items {
    display: flex; flex-direction: column; gap: 4px;
    min-width: 0;
    scrollbar-width: none;
  }
  .portal-nav-items::-webkit-scrollbar { display: none; }

  .portal-nav-item {
    display: flex; align-items: center;
    gap: 12px;
    padding: 0 12px;
    border-radius: 4px;
    color: var(--portal-muted, #6b6b6f);
    font-size: 13px; font-weight: 400;
    letter-spacing: 0.5px;
    text-decoration: none;
    transition: color .12s ease, background .12s ease;
    white-space: nowrap;
    min-height: 36px;
    box-sizing: border-box;
    width: 100%;
  }
  .portal-nav-item:hover:not(.active) {
    color: var(--portal-text, #1c1c1e);
    background: rgba(0,0,0,.035);
    box-shadow: none;
  }
  .portal-nav-item.active {
    color: var(--portal-text, #1c1c1e);
    background: rgba(0,0,0,.05);
    box-shadow: none;
    font-weight: 400;
  }

  [data-theme="dark"] .portal-nav-item:hover:not(.active),
  [data-theme="classic-dark"] .portal-nav-item:hover:not(.active) {
    background: rgba(255,255,255,.06);
  }
  [data-theme="dark"] .portal-nav-item.active,
  [data-theme="classic-dark"] .portal-nav-item.active {
    background: rgba(255,255,255,.09);
    box-shadow: none;
  }

  .portal-nav-icon-wrap {
    position: relative;
    display: inline-flex; align-items: center; justify-content: center;
    width: 18px; height: 18px; flex-shrink: 0;
  }
  .portal-nav-badge {
    position: absolute; top: -3px; right: -5px;
    width: 8px; height: 8px; border-radius: 50%;
    background: #ff3b30;
    border: 1.5px solid var(--portal-bg, #000000);
    box-shadow: 0 0 0 1px rgba(255, 59, 48, 0.35);
  }
  .portal-nav-item.active .portal-nav-badge {
    border-color: var(--portal-bg, #000);
  }

  .portal-nav-label {
    font-size: 13px; font-weight: inherit;
    letter-spacing: 0.5px;
    overflow: hidden; text-overflow: ellipsis;
    transition: opacity .18s ease, width .18s ease;
    flex: 1 1 auto;
    min-width: 0;
  }
  .portal-nav-count {
    margin-left: auto;
    flex-shrink: 0;
    min-width: 18px; height: 18px; padding: 0 5px;
    border-radius: 999px;
    background: rgba(255, 59, 48, 0.14);
    color: #ff453a;
    font-size: 10px; font-weight: 500;
    letter-spacing: 0;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .portal-nav-item.has-shortcut {
    position: relative;
  }
  [data-theme="light"] .portal-nav-count,
  [data-theme="read"] .portal-nav-count {
    color: #ff3b30;
    background: rgba(255, 59, 48, 0.12);
  }

  .portal-nav-middle {
    flex: 1 1 auto;
    min-height: 0;
    display: flex; flex-direction: column;
    gap: 6px;
    margin-top: 18px;
    padding-top: 0;
    border-top: none;
    overflow: hidden;
    font-weight: 400;
  }

  .portal-nav-recent-label {
    margin: 0 0 4px 12px;
    font-size: 11px; font-weight: 500;
    color: var(--portal-muted, #8e8e93);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .portal-nav-recent {
    display: flex; flex-direction: column; gap: 2px;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
    padding: 0;
  }
  .portal-nav-recent::-webkit-scrollbar { display: none; }

  .portal-nav-recent-item {
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px;
    padding: 0 12px;
    min-height: 34px;
    border-radius: 4px;
    font-size: 13px; font-weight: 400;
    line-height: 1.2;
    color: var(--portal-text, #1c1c1e);
    text-decoration: none;
    letter-spacing: 0.5px;
    transition: color .12s ease, background .12s ease;
    box-sizing: border-box;
  }
  .portal-nav-recent-item.active {
    background: rgba(0,0,0,.05);
  }
  [data-theme="dark"] .portal-nav-recent-item.active,
  [data-theme="classic-dark"] .portal-nav-recent-item.active {
    background: rgba(255,255,255,.09);
  }
  .portal-nav-recent-text {
    min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-size: 13px;
    font-weight: 400;
    color: var(--portal-text, #1c1c1e);
    letter-spacing: 0.5px;
  }
  .portal-nav-recent-age {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 400;
    color: var(--portal-muted, #8e8e93);
    letter-spacing: 0.5px;
    font-variant-numeric: tabular-nums;
  }
  .portal-nav-recent-item:hover {
    background: rgba(0,0,0,.035);
  }
  [data-theme="dark"] .portal-nav-recent-item:hover,
  [data-theme="classic-dark"] .portal-nav-recent-item:hover {
    background: rgba(255,255,255,.06);
  }

  .portal-nav-footer {
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px;
    padding: 12px 4px 0;
    margin-top: 10px;
    border-top: 0;
  }

  .portal-nav-footer-link {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 13px; font-weight: 400;
    color: var(--portal-muted, #6b6b6f);
    text-decoration: none;
    letter-spacing: 0.5px;
    transition: color .12s ease, background .12s ease;
  }
  .portal-nav-footer-link:hover {
    color: var(--portal-text, #1c1c1e);
    background: rgba(0,0,0,.035);
  }

  .portal-nav-footer-btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 6px 14px;
    border-radius: 999px;
    border: 0;
    background: rgba(0,0,0,.06);
    font-size: 12.5px; font-weight: 400;
    color: var(--portal-text, #1c1c1e);
    text-decoration: none;
    transition: background .12s ease;
  }
  .portal-nav-footer-btn:hover {
    background: rgba(0,0,0,.09);
  }
  .portal-nav-cmd-hint {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 32px; height: 28px; padding: 0 8px;
    border: 0; border-radius: 6px;
    background: rgba(0,0,0,.05);
    font-size: 11px; font-weight: 500;
    color: var(--portal-muted, #8e8e93);
    cursor: pointer;
    letter-spacing: 0.02em;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
  }
  .portal-nav-cmd-hint:hover {
    background: rgba(0,0,0,.08);
    color: var(--portal-text, #1c1c1e);
  }
  [data-theme="dark"] .portal-nav-cmd-hint,
  [data-theme="classic-dark"] .portal-nav-cmd-hint {
    background: rgba(255,255,255,.08);
  }
  [data-theme="dark"] .portal-nav-footer-btn,
  [data-theme="classic-dark"] .portal-nav-footer-btn {
    background: rgba(255,255,255,.08);
    color: var(--portal-text, #f4f4f4);
  }
  [data-theme="dark"] .portal-nav-footer-btn:hover,
  [data-theme="classic-dark"] .portal-nav-footer-btn:hover {
    background: rgba(255,255,255,.12);
  }

  /* ── Collapsed rail ── */
  .portal-nav.is-collapsed {
    padding: 12px 0 14px;
    align-items: center;
  }
  .portal-nav.is-collapsed .portal-nav-top {
    align-items: center;
    width: 100%;
  }
  .portal-nav.is-collapsed .portal-nav-ws-text,
  .portal-nav.is-collapsed .portal-nav-ws-copy,
  .portal-nav.is-collapsed .portal-nav-ws-caret,
  .portal-nav.is-collapsed .portal-nav-middle {
    display: none;
    opacity: 0; width: 0; height: 0; overflow: hidden; pointer-events: none;
    margin: 0; padding: 0; border: 0;
  }
  .portal-nav.is-collapsed .portal-nav-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    width: 100%;
    margin-top: auto;
    padding: 8px 0 0;
    opacity: 1;
    height: auto;
    overflow: visible;
    pointer-events: auto;
  }
  .portal-nav.is-collapsed .portal-nav-footer-link {
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: 4px;
  }
  .portal-nav.is-collapsed .portal-nav-footer-link span {
    display: none;
  }
  .portal-nav.is-collapsed .portal-nav-footer-btn {
    display: none;
  }
  .portal-nav.is-collapsed .portal-nav-header {
    flex-direction: column; align-items: center; justify-content: flex-start;
    gap: 10px;
    width: 100%;
    padding: 0;
    margin: 0;
  }
  .portal-nav.is-collapsed .portal-nav-ws {
    order: -1;
    flex: 0 0 auto;
    width: 100%;
    max-width: 56px;
    margin: 0 auto;
    gap: 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .portal-nav.is-collapsed .portal-nav-ws > :not(.portal-nav-ws-mark) {
    display: none !important;
  }
  .portal-nav.is-collapsed .portal-nav-ws-mark {
    width: 28px; height: 28px;
    margin: 0;
    padding: 0;
    flex: 0 0 auto;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    border-radius: 6px;
  }
  .portal-nav.is-collapsed .portal-nav-ws-mark > span {
    width: 28px !important;
    height: 28px !important;
    border-radius: 6px !important;
  }
  .portal-nav.is-collapsed .portal-nav-ws-mark svg {
    width: 28px !important;
    height: 28px !important;
    border-radius: 6px !important;
    display: block;
  }
  .portal-nav.is-collapsed .portal-nav-utilities {
    order: 0;
    flex-direction: column; align-items: center;
    gap: 4px;
    width: 100%;
    margin: 0 auto;
  }
  .portal-nav.is-collapsed .portal-nav-utilities .fui-icon-btn {
    margin: 0;
  }
  .portal-nav.is-collapsed .portal-nav-count {
    display: none;
  }
  .portal-nav.is-collapsed .portal-nav-bell {
    display: none;
  }
  .portal-nav.is-collapsed .portal-nav-label {
    opacity: 0; width: 0; pointer-events: none;
  }
  .portal-nav.is-collapsed .portal-nav-item {
    justify-content: center;
    gap: 0;
    padding: 8px;
    border-radius: 4px;
  }
  .portal-nav.is-collapsed .portal-nav-items { align-items: center; }

  @media (prefers-reduced-motion: reduce) {
    .pns-tip { animation: none !important; }
  }
`

export const PORTAL_SIDEBAR_CSS = CSS
