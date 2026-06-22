'use client'

/**
 * PortalSidebar — Codex-inspired flat rail.
 * Nav + „Letzte ausgeführt" (Tagro/Chat-Verläufe).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BriefingEqualizerIcon from '@/components/icons/BriefingEqualizerIcon'
import FestagIconButton from '@/components/ui/FestagIconButton'
import NotificationsBell from '@/components/NotificationsBell'
import PortalWorkspacePopover from '@/components/PortalWorkspacePopover'
import PortalHelpMenu from '@/components/portal/PortalHelpMenu'
import PortalWorkspaceNavMenu from '@/components/portal/PortalWorkspaceNavMenu'
import {
  SidebarSimple, CaretDown, GearSix, Question, SquaresFour, DotsThree,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { usePortalNavItems } from '@/hooks/usePortalNavItems'
import { createClient } from '@/lib/supabase/client'
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
import { onPortalNavClick } from '@/lib/portal-hard-nav'
import { openWeeklyBriefing } from '@/lib/weekly-briefing'
import { welcomeTourTargetForHref } from '@/lib/welcome-tour'

const WORKSPACE_MODE_LABELS: Record<string, string> = {
  delivery: 'Festag Delivery',
  team: 'Teams',
  agency: 'Agency',
}

const ICON = 16
const PORTAL_ICON_WEIGHT = 'bold' as const
const PORTAL_UTIL_STROKE = 1.5

const WORKSPACE_SUB_LINKS = [
  { href: '/workspace', label: 'Übersicht' },
  { href: '/documents', label: 'Dokumente' },
  { href: '/teams', label: 'Team' },
  { href: '/deliverables', label: 'Lieferungen' },
  { href: '/activity', label: 'Aktivität' },
] as const

const RECENT_EXPAND_KEY = 'festag-portal-recent-expanded'

function readExpanded(key: string, fallback = true): boolean {
  if (typeof window === 'undefined') return fallback
  try {
    const v = localStorage.getItem(key)
    if (v === '0') return false
    if (v === '1') return true
  } catch { /* noop */ }
  return fallback
}

function writeExpanded(key: string, open: boolean) {
  try { localStorage.setItem(key, open ? '1' : '0') } catch { /* noop */ }
}

function workspaceModeLabel(mode: string) {
  return WORKSPACE_MODE_LABELS[mode] || 'Festag Delivery'
}

type RecentItem = { id: string; label: string; href: string; age?: string }

type TeamMember = { id: string; name: string }

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
  pathname,
  tourTarget,
}: {
  href: string
  label: string
  Icon: Icon
  active: boolean
  collapsed: boolean
  showBadge: boolean
  unread: number
  shortcutActive: boolean
  pathname: string
  tourTarget?: string
}) {
  const shortcutKeys = portalNavShortcutKeys(href)
  const shortcutTitle = shortcutKeys?.join(' then ')

  return (
    <Link
      href={href}
      data-portal-nav-href={href}
      data-tour={tourTarget}
      className={`portal-nav-item${active ? ' active' : ''}${shortcutKeys && !collapsed ? ' has-shortcut' : ''}`}
      title={collapsed ? label : shortcutTitle ? `${label} (${shortcutKeys?.join(' ')})` : label}
      onClick={e => onPortalNavClick(pathname, href, e)}
      onMouseEnter={() => { if (shortcutKeys && !collapsed) navShortcutPointerEnter(href) }}
      onMouseLeave={() => { if (shortcutKeys) navShortcutPointerLeave(href) }}
    >
      <span className="portal-nav-icon-wrap">
        <Icon size={ICON} weight={PORTAL_ICON_WEIGHT} />
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
  const wsNavTriggerRef = useRef<HTMLButtonElement | null>(null)
  const helpTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [wsMenuOpen, setWsMenuOpen] = useState(false)
  const [workspaceNavMenuOpen, setWorkspaceNavMenuOpen] = useState(false)
  const [helpMenuOpen, setHelpMenuOpen] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceMode, setWorkspaceMode] = useState('delivery')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [recent, setRecent] = useState<RecentItem[]>([])
  const { unread: notifUnread } = useNotifications({ unreadOnly: true, limit: 1 })
  const { unread: inboxUnread } = useInboxUnread()
  const { items: navItems } = usePortalNavItems()
  const [recentExpanded, setRecentExpanded] = useState(true)
  const shortcutActiveHref = useNavShortcutActive()
  const navShortcutLabels = useMemo(
    () => Object.fromEntries(navItems.map(item => [item.href, item.label])),
    [navItems],
  )

  useEffect(() => {
    if (collapsed) navShortcutDismissAll()
  }, [collapsed])

  useEffect(() => {
    setRecentExpanded(readExpanded(RECENT_EXPAND_KEY, true))
  }, [])

  useEffect(() => {
    if (collapsed) setWorkspaceNavMenuOpen(false)
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
      const res = await fetch('/api/portal/recent-executed', { credentials: 'include' })
      if (!res.ok) {
        setRecent(prev => (prev.length ? prev : MOCK_RECENT))
        return
      }
      const data = await res.json().catch(() => null)
      const rows = Array.isArray(data?.items) ? data.items : []
      if (!rows.length) {
        setRecent(prev => (prev.length ? prev : MOCK_RECENT))
        return
      }
      setRecent(rows.map((c: { id: string; label: string; href: string; at?: string }) => ({
        id: c.id,
        label: truncateLabel(c.label),
        href: c.href,
        age: fmtRecentAge(c.at),
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
          .select('full_name, first_name, email')
          .eq('id', u.id)
          .maybeSingle()

        if (!alive) return
        const p = profile as {
          full_name?: string | null
          first_name?: string | null
          email?: string | null
        } | null
        const userEmail = p?.email || u.email || ''
        const name = (p?.full_name || '').trim() || (p?.first_name || '').trim() || userEmail.split('@')[0] || 'Festag'
        setDisplayName(name)
        setEmail(userEmail)

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
              .select('id, full_name, first_name, email')
              .in('id', ids)
            const pById = new Map(
              ((profs ?? []) as Array<{
                id: string
                full_name?: string | null
                first_name?: string | null
                email?: string | null
              }>).map(row => [row.id, row]),
            )
            const toMember = (uid: string): TeamMember => {
              const pr = pById.get(uid)
              const nm = (pr?.full_name || '').trim() || (pr?.first_name || '').trim() || (pr?.email || '').split('@')[0] || 'Mitglied'
              return { id: uid, name: nm }
            }
            const ordered = [u.id, ...memRows.map(r => r.user_id).filter(x => x !== u.id)]
            setMembers(Array.from(new Set(ordered)).map(toMember))
          } catch { /* noop */ }
        }
      } catch { /* noop */ }
    })()
    return () => { alive = false }
  }, [])

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
  const recentLabel = onProjectsContext ? 'Deine Projekte' : 'zuletzt ausgeführt'

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
            displayName={displayName}
            email={email}
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
                {collapsed ? (
                  <SquaresFour size={ICON} weight={PORTAL_ICON_WEIGHT} className="portal-nav-ws-icon" aria-hidden />
                ) : null}
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
                <circle cx="6.25" cy="6.25" r="4.25" stroke="currentColor" strokeWidth={PORTAL_UTIL_STROKE} />
                <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth={PORTAL_UTIL_STROKE} strokeLinecap="round" />
              </svg>
            </FestagIconButton>
            <div className="portal-nav-bell">
              <NotificationsBell variant="portal" limit={14} />
            </div>
            <FestagIconButton
              size={28}
              aria-label="Wöchentliches Status-Briefing"
              title="Status-Briefing"
              onClick={openWeeklyBriefing}
              className="portal-nav-util-btn portal-nav-briefing-btn"
            >
              <BriefingEqualizerIcon />
            </FestagIconButton>
            <FestagIconButton
              size={28}
              aria-label={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
              title={collapsed ? 'Ausklappen' : 'Einklappen'}
              onClick={onToggleCollapse}
              className="portal-nav-util-btn"
            >
              <SidebarSimple size={14} weight={PORTAL_ICON_WEIGHT} />
            </FestagIconButton>
          </div>
        </div>

        <div className="portal-nav-items" onMouseLeave={navShortcutDismissAll}>
          {navItems.map(item => {
            if (item.href === '/workspace') {
              const wsActive = pathname.startsWith('/workspace')
                || WORKSPACE_SUB_LINKS.some(l => l.href !== '/workspace' && (pathname === l.href || pathname.startsWith(`${l.href}/`)))
              const SquaresFourIcon = item.Icon
              const wsShortcutKeys = portalNavShortcutKeys('/workspace')
              const wsShortcutTitle = wsShortcutKeys?.join(' then ')
              const toggleWsMenu = () => setWorkspaceNavMenuOpen(v => !v)

              return (
                <PortalWorkspaceNavMenu
                  key={item.href}
                  open={workspaceNavMenuOpen}
                  onOpenChange={setWorkspaceNavMenuOpen}
                  anchorRef={wsNavTriggerRef}
                  railCollapsed={collapsed}
                  inline={!collapsed}
                  trigger={collapsed ? (
                    <button
                      ref={wsNavTriggerRef}
                      type="button"
                      className={`portal-nav-item${wsActive ? ' active' : ''}${workspaceNavMenuOpen ? ' is-menu-open' : ''}`}
                      title={item.label}
                      aria-label="Workspace"
                      aria-haspopup="menu"
                      aria-expanded={workspaceNavMenuOpen}
                      onClick={toggleWsMenu}
                    >
                      <span className="portal-nav-icon-wrap">
                        <SquaresFourIcon size={ICON} weight={PORTAL_ICON_WEIGHT} />
                      </span>
                    </button>
                  ) : (
                    <div
                      ref={wsNavTriggerRef}
                      className={`portal-nav-ws-row${wsActive ? ' is-active' : ''}${workspaceNavMenuOpen ? ' is-menu-open' : ''}`}
                    >
                      <button
                        type="button"
                        data-portal-nav-href="/workspace"
                        className={`portal-nav-item portal-nav-item--ws-main${wsActive ? ' active' : ''}${wsShortcutKeys ? ' has-shortcut' : ''}`}
                        title={wsShortcutTitle ? `${item.label} (${wsShortcutKeys?.join(' ')})` : item.label}
                        aria-label="Workspace"
                        aria-haspopup="menu"
                        aria-expanded={workspaceNavMenuOpen}
                        onClick={toggleWsMenu}
                        onMouseEnter={() => { if (wsShortcutKeys) navShortcutPointerEnter('/workspace') }}
                        onMouseLeave={() => { if (wsShortcutKeys) navShortcutPointerLeave('/workspace') }}
                      >
                        <span className="portal-nav-icon-wrap">
                          <SquaresFourIcon size={ICON} weight={PORTAL_ICON_WEIGHT} />
                        </span>
                        <span className="portal-nav-label">{item.label}</span>
                      </button>
                      <button
                        type="button"
                        className={`portal-nav-ws-more${workspaceNavMenuOpen ? ' is-menu-open' : ''}`}
                        aria-label="Workspace-Optionen"
                        aria-haspopup="menu"
                        aria-expanded={workspaceNavMenuOpen}
                        onClick={toggleWsMenu}
                      >
                        <DotsThree size={14} weight="bold" aria-hidden />
                      </button>
                    </div>
                  )}
                />
              )
            }

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
                pathname={pathname}
                tourTarget={welcomeTourTargetForHref(item.href)}
              />
            )
          })}
        </div>
      </div>

      <div className="portal-nav-middle">
        {!collapsed && (
          <button
            type="button"
            className="portal-nav-section-head"
            aria-expanded={recentExpanded}
            onClick={() => {
              setRecentExpanded(v => {
                const next = !v
                writeExpanded(RECENT_EXPAND_KEY, next)
                return next
              })
            }}
          >
            <span className="portal-nav-recent-label">{recentLabel}</span>
            <CaretDown
              size={10}
              weight="bold"
              className={`portal-nav-section-caret${recentExpanded ? ' open' : ''}`}
              aria-hidden
            />
          </button>
        )}
        <div className={`portal-nav-section-body${recentExpanded ? ' open' : ''}`}>
          <div className="portal-nav-recent" role="list">
          {displayRecent.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className={`portal-nav-recent-item${activeRecentId === item.id ? ' active' : ''}`}
              role="listitem"
              title={item.label}
              onClick={e => onPortalNavClick(pathname, item.href, e)}
            >
              <span className="portal-nav-recent-text">{item.label}</span>
              {item.age ? <span className="portal-nav-recent-age">{item.age}</span> : null}
            </Link>
          ))}
          </div>
        </div>
      </div>

      <div className="portal-nav-footer">
        <Link
          href="/settings"
          className="portal-nav-footer-link"
          title="Einstellungen"
          onClick={e => onPortalNavClick(pathname, '/settings', e)}
        >
          <GearSix size={ICON} weight={PORTAL_ICON_WEIGHT} />
          <span>Einstellungen</span>
        </Link>
        <PortalHelpMenu
          open={helpMenuOpen}
          onOpenChange={setHelpMenuOpen}
          anchorRef={helpTriggerRef}
          railCollapsed={collapsed}
          trigger={(
            <button
              ref={helpTriggerRef}
              type="button"
              className="portal-nav-footer-btn"
              data-tour="sidebar-help"
              aria-label="Hilfe und Einführung"
              title="Hilfe"
              aria-expanded={helpMenuOpen}
              onClick={() => setHelpMenuOpen(v => !v)}
            >
              {collapsed ? <Question size={ICON} weight={PORTAL_ICON_WEIGHT} /> : 'Hilfe'}
            </button>
          )}
        />
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
    color: var(--portal-nav-item-active, var(--portal-text, #1D1D1F));
    font-weight: 400;
    --portal-nav-size: 13.5px;
    --portal-nav-meta-size: 10.5px;
    --portal-nav-icon-size: 16px;
    --portal-nav-row-height: 32px;
    --portal-nav-item-gap: 1px;
    --portal-nav-tracking: 0.018em;
    letter-spacing: var(--portal-nav-tracking);
    overflow: hidden;
    box-sizing: border-box;
    background: transparent;
  }

  .portal-nav-top {
    display: flex; flex-direction: column; gap: 10px;
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
    display: flex; align-items: center; gap: 5px;
    min-width: 0;
    max-width: 100%;
    padding: 2px 8px;
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

  .portal-nav-ws-icon {
    flex-shrink: 0;
    color: var(--portal-nav-item-active, var(--portal-text, #1D1D1F));
  }

  .portal-nav-ws-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    line-height: 1.15;
    min-width: 0;
    flex: 0 1 auto;
    overflow: hidden;
    transition: opacity .18s ease, width .18s ease;
  }

  .portal-nav-ws-label {
    font-size: 9px;
    font-weight: 500;
    color: var(--portal-nav-section, var(--portal-muted, #86868B));
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    line-height: 1.2;
  }

  .portal-nav-ws-value {
    display: block;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--portal-nav-item-active, var(--portal-text, #1D1D1F));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    letter-spacing: var(--portal-nav-tracking);
    line-height: 1.2;
  }

  .portal-nav-ws-caret {
    color: var(--portal-nav-section, var(--portal-muted, #86868B));
    flex-shrink: 0;
    opacity: 0.7;
    transition: opacity .18s ease, transform .18s ease;
  }
  .portal-nav-ws.is-open .portal-nav-ws-caret {
    transform: rotate(180deg);
    opacity: 1;
  }

  .portal-nav-utilities {
    display: flex;
    align-items: center;
    align-self: center;
    gap: 0;
    flex-shrink: 0;
  }
  .portal-nav:not(.is-collapsed) .portal-nav-utilities {
    height: 24px;
  }
  .portal-nav-utilities .fui-icon-btn,
  .portal-nav-utilities .portal-nav-util-btn {
    background: transparent;
    border: none;
    box-shadow: none;
    transform: none;
    color: var(--portal-nav-util, var(--portal-muted, #6E6E73));
    border-radius: 50%;
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .portal-nav-utilities .nb-trigger.portal {
    width: 24px !important;
    min-width: 24px !important;
    height: 24px !important;
    min-height: 24px !important;
    padding: 0 !important;
    border-radius: 50% !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .portal-nav-utilities .fui-icon-btn:hover:not(:disabled) {
    background: var(--portal-row-hover, rgba(0,0,0,.035));
    border: none;
    box-shadow: none;
    transform: none;
    color: var(--portal-nav-util-hover, var(--portal-nav-item-active, #1D1D1F));
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
    display: flex; flex-direction: column; gap: var(--portal-nav-item-gap);
    min-width: 0;
    scrollbar-width: none;
  }
  .portal-nav-items::-webkit-scrollbar { display: none; }

  .portal-nav-item {
    display: flex; align-items: center;
    gap: 10px;
    padding: 0 12px;
    border-radius: 9px;
    border: none;
    background: transparent;
    color: var(--portal-nav-item, var(--nav-off-text, #6E6E73));
    font-family: inherit;
    font-size: var(--portal-nav-size);
    font-weight: 400;
    letter-spacing: var(--portal-nav-tracking);
    text-decoration: none;
    transition: color .12s ease, background .12s ease;
    white-space: nowrap;
    min-height: var(--portal-nav-row-height);
    box-sizing: border-box;
    width: 100%;
    cursor: pointer;
    text-align: left;
  }
  .portal-nav-item:hover:not(.active) {
    color: var(--portal-nav-item-hover, var(--nav-on-text, #1D1D1F));
    background: var(--portal-row-hover, rgba(0,0,0,.035));
    box-shadow: none;
  }
  .portal-nav-item.active {
    color: var(--portal-nav-item-active, var(--nav-on-text, #1D1D1F));
    background: var(--portal-nav-active-bg, transparent);
    box-shadow: none;
    font-weight: 500;
  }
  .portal-nav-item.is-menu-open {
    color: var(--portal-nav-item-active, var(--nav-on-text, #1D1D1F));
    background: var(--portal-row-hover, rgba(0, 0, 0, 0.06));
    box-shadow: none;
    font-weight: 600;
  }
  [data-theme="dark"] .portal-nav-item.is-menu-open,
  [data-theme="classic-dark"] .portal-nav-item.is-menu-open {
    background: rgba(255, 255, 255, 0.08);
  }

  .portal-nav-ws-row {
    display: flex;
    align-items: center;
    gap: 0;
    min-height: var(--portal-nav-row-height);
    width: 100%;
    min-width: 0;
    border-radius: 8px;
    transition: background .12s ease;
  }
  .portal-nav-ws-row:hover {
    background: var(--portal-row-hover, rgba(0, 0, 0, 0.035));
  }
  .portal-nav-ws-row.is-active {
    background: var(--portal-nav-active-bg, transparent);
  }
  .portal-nav-ws-row.is-menu-open {
    background: var(--portal-row-hover, rgba(0, 0, 0, 0.06));
  }
  [data-theme="dark"] .portal-nav-ws-row:hover,
  [data-theme="classic-dark"] .portal-nav-ws-row:hover {
    background: var(--portal-row-hover, rgba(255, 255, 255, 0.06));
  }
  [data-theme="dark"] .portal-nav-ws-row.is-menu-open,
  [data-theme="classic-dark"] .portal-nav-ws-row.is-menu-open {
    background: rgba(255, 255, 255, 0.08);
  }
  .portal-nav-item--ws-main {
    flex: 1;
    min-width: 0;
    width: auto;
    background: transparent !important;
    box-shadow: none !important;
  }
  .portal-nav-ws-row:hover .portal-nav-item--ws-main:not(.active) {
    background: transparent !important;
  }
  .portal-nav-ws-more {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    margin-right: 6px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--portal-nav-item, var(--nav-off-text, #6E6E73));
    cursor: pointer;
    transition: color .12s ease, background .12s ease;
  }
  .portal-nav-ws-more:hover {
    color: var(--portal-nav-item-hover, var(--nav-on-text, #1D1D1F));
    background: rgba(0, 0, 0, 0.05);
  }
  .portal-nav-ws-more.is-menu-open {
    color: var(--portal-nav-item-active, var(--nav-on-text, #1D1D1F));
    background: rgba(0, 0, 0, 0.08);
  }
  [data-theme="dark"] .portal-nav-ws-more:hover,
  [data-theme="classic-dark"] .portal-nav-ws-more:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  [data-theme="dark"] .portal-nav-ws-more.is-menu-open,
  [data-theme="classic-dark"] .portal-nav-ws-more.is-menu-open {
    background: rgba(255, 255, 255, 0.12);
  }
  .portal-nav-ws-more:focus { outline: none; }
  .portal-nav-ws-more:focus-visible {
    outline: 2px solid var(--portal-focus, #007AFF);
    outline-offset: 1px;
  }

  [data-theme="dark"] .portal-nav-item:hover:not(.active),
  [data-theme="classic-dark"] .portal-nav-item:hover:not(.active) {
    background: var(--portal-row-hover, rgba(255,255,255,.06));
  }
  [data-theme="dark"] .portal-nav-item.active,
  [data-theme="classic-dark"] .portal-nav-item.active {
    background: var(--portal-nav-active-bg, transparent);
    box-shadow: none;
  }

  .portal-nav-icon-wrap {
    position: relative;
    display: inline-flex; align-items: center; justify-content: center;
    width: var(--portal-nav-icon-size);
    height: var(--portal-nav-icon-size);
    flex-shrink: 0;
    color: inherit;
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
    font-size: var(--portal-nav-size);
    font-weight: inherit;
    letter-spacing: var(--portal-nav-tracking);
    overflow: hidden; text-overflow: ellipsis;
    transition: opacity .18s ease, width .18s ease;
    flex: 1 1 auto;
    min-width: 0;
    line-height: 1.2;
  }
  .portal-nav-branch-caret {
    flex-shrink: 0;
    color: var(--portal-nav-section, var(--portal-muted, #86868B));
    transition: transform .2s cubic-bezier(.16,1,.3,1);
  }
  .portal-nav-branch-caret.open {
    transform: rotate(180deg);
  }
  .portal-nav-ws-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .portal-nav-sub {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-left: 30px;
  }
  .portal-nav-sub-item {
    display: flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: var(--portal-nav-tracking);
    color: var(--portal-nav-item, var(--nav-off-text, #6E6E73));
    text-decoration: none;
    transition: color .12s ease, background .12s ease;
  }
  .portal-nav-sub-item:hover {
    color: var(--portal-nav-item-hover, var(--nav-on-text, #1D1D1F));
    background: var(--portal-row-hover, rgba(0,0,0,.035));
  }
  .portal-nav-sub-item.active {
    color: var(--portal-nav-item-active, var(--nav-on-text, #1D1D1F));
    background: var(--portal-nav-active-bg, transparent);
    font-weight: 500;
  }
  .portal-nav-count {
    margin-left: auto;
    flex-shrink: 0;
    min-width: 18px; height: 18px; padding: 0 5px;
    border-radius: 999px;
    background: rgba(255, 59, 48, 0.14);
    color: #ff453a;
    font-size: 11.5px; font-weight: 500;
    letter-spacing: var(--portal-nav-tracking);
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
    gap: 2px;
    margin-top: 14px;
    padding-top: 0;
    border-top: none;
    overflow: hidden;
    font-weight: 400;
  }

  .portal-nav-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    margin: 0;
    padding: 0 12px 2px;
    border: none;
    background: transparent;
    cursor: pointer;
    font: inherit;
    text-align: left;
    box-sizing: border-box;
  }
  .portal-nav-section-head:hover .portal-nav-recent-label {
    color: var(--portal-nav-item-hover, var(--nav-on-text, #1D1D1F));
  }
  .portal-nav-section-caret {
    flex-shrink: 0;
    color: var(--portal-nav-section, var(--portal-muted, #86868B));
    transition: transform .2s cubic-bezier(.16,1,.3,1);
  }
  .portal-nav-section-caret.open {
    transform: rotate(180deg);
  }
  .portal-nav-section-body {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows .22s cubic-bezier(.16,1,.3,1);
    min-height: 0;
    flex: 1 1 auto;
    overflow: hidden;
  }
  .portal-nav-section-body.open {
    grid-template-rows: 1fr;
  }
  .portal-nav-section-body > .portal-nav-recent {
    min-height: 0;
    overflow: hidden;
  }
  .portal-nav-section-body.open > .portal-nav-recent {
    overflow-y: auto;
  }

  .portal-nav-recent-label {
    margin: 0;
    font-size: var(--portal-nav-meta-size);
    font-weight: 400;
    color: var(--portal-nav-section, var(--portal-muted, #86868B));
    letter-spacing: var(--portal-nav-tracking);
    text-transform: none;
    line-height: 1.2;
  }

  .portal-nav-recent {
    display: flex; flex-direction: column; gap: var(--portal-nav-item-gap);
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
    min-height: var(--portal-nav-row-height);
    border-radius: 6px;
    font-size: var(--portal-nav-size);
    font-weight: 400;
    line-height: 1.2;
    color: var(--portal-nav-item, var(--nav-off-text, #6E6E73));
    text-decoration: none;
    letter-spacing: var(--portal-nav-tracking);
    transition: color .12s ease, background .12s ease;
    box-sizing: border-box;
  }
  .portal-nav-recent-item.active {
    background: var(--portal-nav-active-bg, transparent);
    color: var(--portal-nav-item-active, var(--nav-on-text, #1D1D1F));
    font-weight: 500;
  }
  [data-theme="dark"] .portal-nav-recent-item.active,
  [data-theme="classic-dark"] .portal-nav-recent-item.active {
    background: var(--portal-nav-active-bg, transparent);
  }
  .portal-nav-recent-text {
    min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-size: var(--portal-nav-size);
    font-weight: inherit;
    color: inherit;
    letter-spacing: var(--portal-nav-tracking);
    line-height: 1.2;
  }
  .portal-nav-recent-age {
    flex-shrink: 0;
    font-size: var(--portal-nav-size);
    font-weight: 400;
    color: var(--portal-nav-section, var(--portal-muted, #86868B));
    letter-spacing: var(--portal-nav-tracking);
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }
  .portal-nav-recent-item:hover {
    color: var(--portal-nav-item-hover, var(--nav-on-text, #1D1D1F));
    background: var(--portal-row-hover, rgba(0,0,0,.035));
  }
  [data-theme="dark"] .portal-nav-recent-item:hover,
  [data-theme="classic-dark"] .portal-nav-recent-item:hover {
    background: var(--portal-row-hover, rgba(255,255,255,.06));
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
    border-radius: 6px;
    font-size: var(--portal-nav-size);
    font-weight: 400;
    color: var(--portal-nav-item, var(--nav-off-text, #6E6E73));
    text-decoration: none;
    letter-spacing: var(--portal-nav-tracking);
    transition: color .12s ease, background .12s ease;
  }
  .portal-nav-footer-link:hover {
    color: var(--portal-nav-item-hover, var(--nav-on-text, #1D1D1F));
    background: var(--portal-row-hover, rgba(0,0,0,.035));
  }

  .portal-nav-footer-btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 6px 14px;
    border-radius: 999px;
    border: var(--portal-white-border, 1px solid rgba(0, 0, 0, 0.07));
    background: #FFFFFF;
    font-size: var(--portal-nav-size);
    font-weight: 500;
    letter-spacing: var(--portal-nav-tracking);
    color: var(--portal-nav-item-active, var(--nav-on-text, #1D1D1F));
    text-decoration: none;
    box-shadow: var(--portal-white-elev, var(--festag-elev-shadow, 0 1px 2px rgba(15, 23, 42, 0.05)));
    transition: background .12s ease, box-shadow .12s ease, border-color .12s ease;
  }
  .portal-nav-footer-btn:hover {
    background: #FFFFFF;
    box-shadow: var(--festag-elev-shadow-hover, 0 2px 3px rgba(15, 23, 42, 0.07));
  }
  .portal-nav-cmd-hint {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 32px; height: 28px; padding: 0 8px;
    border: 0; border-radius: 6px;
    background: rgba(0,0,0,.04);
    font-size: 12.5px; font-weight: 500;
    color: var(--portal-nav-section, var(--portal-muted, #86868B));
    cursor: pointer;
    letter-spacing: var(--portal-nav-tracking);
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
  }
  .portal-nav-cmd-hint:hover {
    background: rgba(0,0,0,.06);
    color: var(--portal-nav-item-hover, var(--nav-on-text, #1D1D1F));
  }
  [data-theme="dark"] .portal-nav-cmd-hint,
  [data-theme="classic-dark"] .portal-nav-cmd-hint {
    background: rgba(255,255,255,.08);
  }
  [data-theme="dark"] .portal-nav-footer-btn,
  [data-theme="classic-dark"] .portal-nav-footer-btn {
    background: rgba(255,255,255,.08);
    border: none;
    box-shadow: none;
    color: var(--portal-nav-item-active, #FFFFFF);
  }
  [data-theme="dark"] .portal-nav-footer-btn:hover,
  [data-theme="classic-dark"] .portal-nav-footer-btn:hover {
    background: rgba(255,255,255,.12);
    box-shadow: none;
  }

  /* ── Collapsed rail ── */
  .portal-nav.is-collapsed {
    padding: 8px 0 10px;
    align-items: center;
    width: 56px;
    max-width: 56px;
    min-width: 56px;
    overflow: hidden;
    box-sizing: border-box;
  }
  .portal-nav.is-collapsed .portal-nav-top {
    align-items: center;
    width: 100%;
    max-width: 56px;
    gap: 6px;
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
    gap: 4px;
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
    align-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: 8px;
  }
  .portal-nav.is-collapsed .portal-nav-footer-link span {
    display: none;
  }
  .portal-nav.is-collapsed .portal-nav-footer-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: 8px;
    font-size: 0;
  }
  .portal-nav.is-collapsed .portal-nav-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    width: 100%;
    max-width: 56px;
    padding: 0;
    margin: 0;
  }
  .portal-nav.is-collapsed .portal-nav-header .pwp-wrap {
    flex: 0 0 auto;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .portal-nav.is-collapsed .portal-nav-ws {
    order: -1;
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    max-width: 36px;
    margin: 0;
    gap: 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .portal-nav.is-collapsed .portal-nav-ws > :not(.portal-nav-ws-icon) {
    display: none !important;
  }
  .portal-nav.is-collapsed .portal-nav-ws-icon {
    width: var(--portal-nav-icon-size);
    height: var(--portal-nav-icon-size);
    margin: 0;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .portal-nav.is-collapsed .portal-nav-utilities {
    order: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 100%;
    max-width: 56px;
    height: auto;
    min-height: 0;
    margin: 0;
  }
  .portal-nav.is-collapsed .portal-nav-utilities .portal-nav-util-btn[aria-label="Suche"] {
    display: none;
  }
  .portal-nav.is-collapsed .portal-nav-utilities .fui-icon-btn,
  .portal-nav.is-collapsed .portal-nav-utilities .portal-nav-util-btn {
    margin: 0;
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    border-radius: 50%;
  }
  .portal-nav.is-collapsed .portal-nav-count {
    display: none;
  }
  .portal-nav.is-collapsed .portal-nav-bell {
    display: none;
  }
  .portal-nav.is-collapsed .portal-nav-briefing-btn {
    display: inline-flex;
  }
  .portal-nav.is-collapsed .portal-nav-label {
    display: none;
    opacity: 0;
    width: 0;
    pointer-events: none;
  }
  .portal-nav.is-collapsed .portal-nav-ws-group {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .portal-nav.is-collapsed .portal-nav-item {
    justify-content: center;
    align-items: center;
    gap: 0;
    width: 36px;
    height: 36px;
    min-height: 36px;
    max-height: 36px;
    padding: 0;
    flex-shrink: 0;
    border-radius: 8px;
    overflow: visible;
    margin: 0;
  }
  .portal-nav.is-collapsed .portal-nav-icon-wrap {
    width: var(--portal-nav-icon-size);
    height: var(--portal-nav-icon-size);
    overflow: visible;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .portal-nav.is-collapsed .portal-nav-items {
    align-items: center;
    gap: 2px;
    margin-top: 2px;
    width: 100%;
    max-width: 56px;
    padding: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .pns-tip { animation: none !important; }
  }

  /* ── Light mode — Codex: dark icons/labels, gray only for meta, white 3D footer pill ── */
  [data-theme="light"] .portal-nav-ws-label,
  [data-theme="read"] .portal-nav-ws-label,
  [data-theme="pure-light"] .portal-nav-ws-label,
  [data-theme="light"] .portal-nav-recent-label,
  [data-theme="read"] .portal-nav-recent-label,
  [data-theme="pure-light"] .portal-nav-recent-label,
  [data-theme="light"] .portal-nav-recent-age,
  [data-theme="read"] .portal-nav-recent-age,
  [data-theme="pure-light"] .portal-nav-recent-age {
    color: #86868B;
  }
  [data-theme="light"] .portal-nav-ws-caret,
  [data-theme="read"] .portal-nav-ws-caret,
  [data-theme="pure-light"] .portal-nav-ws-caret {
    color: #86868B;
    opacity: 0.72;
  }
  [data-theme="light"] .portal-nav-footer-btn,
  [data-theme="read"] .portal-nav-footer-btn,
  [data-theme="pure-light"] .portal-nav-footer-btn {
    background: #FFFFFF;
    border: 1px solid rgba(0, 0, 0, 0.07);
    color: #1D1D1F;
    box-shadow: var(--festag-elev-shadow, 0 1px 2px rgba(15, 23, 42, 0.05));
  }
  [data-theme="light"] .portal-nav-footer-btn:hover,
  [data-theme="read"] .portal-nav-footer-btn:hover,
  [data-theme="pure-light"] .portal-nav-footer-btn:hover {
    background: #FFFFFF;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 1),
      0 2px 0 rgba(0, 0, 0, 0.03),
      0 6px 16px rgba(144, 149, 159, 0.18);
  }
`

export const PORTAL_SIDEBAR_CSS = CSS
