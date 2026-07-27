'use client'

/**
 * DevSidebar — the developer portal rail.
 *
 * Design language lives in app/dev/dev-portal.css (`.dv-rail`, `.dv-nav`).
 * Collapsible groups keep the rail scannable. Group state persists in
 * localStorage so developers don't have to re-collapse every session.
 *
 * Tagro lives in the rail foot (and the top bar) — never as a floating
 * orb competing with the page content.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Article, Broadcast, CalendarBlank, CaretDown, CaretUpDown, ChatsCircle,
  CheckSquare, Clock, Eye, FileText, FolderOpen, GearSix,
  GithubLogo, House, Microphone, Package, Robot, Scales, SidebarSimple,
  SignOut, Sparkle, UsersThree, UserSwitch, WarningOctagon,
} from '@phosphor-icons/react'

import { createClient } from '@/lib/supabase/client'
import { devDisplayName } from '@/lib/dev-session'
import { openTagro } from '@/components/TagroOverlay'
import { getDevRouteTagroContext } from '@/lib/dev-mobile-nav'
import type { DevIdentity } from '@/components/DevAppShell'

type NavRow = {
  href: string
  icon: React.ElementType
  label: string
  count?: 'open' | 'review' | 'blocked' | 'inbox'
  tone?: 'warning' | 'error'
}
type NavGroupDef = {
  id: string
  label?: string
  collapsible?: boolean
  /** When true and the user has never toggled this group, start collapsed. */
  defaultCollapsed?: boolean
  rows: NavRow[]
}

/**
 * Primary destinations stay ungrouped and always visible.
 * Secondary areas collapse so the rail reads as a short queue, not a sitemap.
 */
const NAV: NavGroupDef[] = [
  {
    id: 'primary',
    rows: [
      { href: '/dev', icon: House, label: 'Heute' },
      { href: '/dev/tasks', icon: CheckSquare, label: 'Aufgaben', count: 'open' },
      { href: '/dev/projects', icon: FolderOpen, label: 'Projekte' },
    ],
  },
  {
    id: 'work',
    label: 'Arbeit',
    collapsible: true,
    rows: [
      { href: '/dev/github', icon: GithubLogo, label: 'GitHub' },
      { href: '/dev/review', icon: Robot, label: 'Tagro Review', count: 'review', tone: 'warning' },
      { href: '/dev/issues', icon: WarningOctagon, label: 'Vorfälle', count: 'blocked', tone: 'error' },
      { href: '/dev/decisions', icon: Scales, label: 'Entscheidungen' },
    ],
  },
  {
    id: 'client',
    label: 'Kunde',
    collapsible: true,
    rows: [
      { href: '/dev/visibility', icon: Eye, label: 'Kunden-Sicht' },
      { href: '/dev/briefing', icon: Article, label: 'Tagesbriefing' },
      { href: '/dev/deliverables', icon: Package, label: 'Lieferungen' },
      { href: '/dev/documents', icon: FileText, label: 'Dokumente' },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    collapsible: true,
    defaultCollapsed: true,
    rows: [
      { href: '/dev/messages', icon: ChatsCircle, label: 'Inbox', count: 'inbox' },
      { href: '/dev/team', icon: UsersThree, label: 'Mitglieder' },
      { href: '/dev/captures', icon: Microphone, label: 'Aufnahmen' },
    ],
  },
  {
    id: 'focus',
    label: 'Fokus',
    collapsible: true,
    defaultCollapsed: true,
    rows: [
      { href: '/dev/plan', icon: CalendarBlank, label: 'Tagesplan' },
      { href: '/dev/time', icon: Clock, label: 'Zeiterfassung' },
      { href: '/dev/activity', icon: Broadcast, label: 'Aktivität' },
    ],
  },
]

const ROLE_LABEL: Record<string, string> = {
  dev: 'Developer',
  admin: 'Admin',
  project_owner: 'Project Owner',
  pending_developer: 'Wartet auf Freigabe',
}

export type DevLiveStats = {
  open: number
  review: number
  blocked: number
  inbox: number
  commits7d: number
  loaded: boolean
}

const EMPTY_STATS: DevLiveStats = { open: 0, review: 0, blocked: 0, inbox: 0, commits7d: 0, loaded: false }

type OpenSession = { id: string; task_id: string | null; task_title: string | null; started_at: string } | null

const STORAGE_KEY = 'festag-dev-nav-collapsed-v2'

function loadCollapsedGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveCollapsedGroups(state: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
}

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}`
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export default function DevSidebar({
  identity,
  onCollapse,
  onLogout,
  onStats,
}: {
  identity: DevIdentity
  onCollapse: () => void
  onLogout: () => void
  onStats?: (stats: DevLiveStats) => void
}) {
  const pathname = usePathname() || ''
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<DevLiveStats>(EMPTY_STATS)
  const [openSession, setOpenSession] = useState<OpenSession>(null)
  const [tick, setTick] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const menuRef = useRef<HTMLDivElement | null>(null)

  const userId = identity.kind === 'supabase' ? identity.userId : identity.session.user_id
  const displayName = identity.kind === 'supabase' ? identity.name : devDisplayName(identity.session)
  const roleLabel = identity.kind === 'supabase'
    ? (ROLE_LABEL[identity.role] ?? identity.role)
    : (identity.session.access_mode === 'pool' ? 'Pool Developer' : 'Workspace Developer')

  const tagroContext = useMemo(() => getDevRouteTagroContext(pathname), [pathname])
  const tagroNeedsAttention = stats.loaded && (stats.review > 0 || stats.blocked > 0)

  const onStatsRef = useRef(onStats)
  useEffect(() => { onStatsRef.current = onStats }, [onStats])

  useEffect(() => {
    setCollapsed(loadCollapsedGroups())
  }, [])

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsed(prev => {
      const group = NAV.find(g => g.id === groupId)
      const currentlyCollapsed = groupId in prev
        ? !!prev[groupId]
        : !!group?.defaultCollapsed
      const next = { ...prev, [groupId]: !currentlyCollapsed }
      saveCollapsedGroups(next)
      return next
    })
  }, [])

  const loadStats = useCallback(async () => {
    if (!userId) return
    try {
      const { data: pa } = await supabase
        .from('project_assignments').select('project_id').eq('user_id', userId).eq('active', true)
      const projectIds = ((pa as any[]) ?? []).map(r => r.project_id).filter(Boolean) as string[]
      const filter = projectIds.length > 0
        ? `assigned_to.eq.${userId},project_id.in.(${projectIds.join(',')})`
        : `assigned_to.eq.${userId}`

      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      const [tasksRes, commitsRes, inboxRes] = await Promise.all([
        (supabase as any).from('tasks').select('dev_status,status').or(filter).limit(500),
        (supabase as any).from('github_commits').select('*', { count: 'exact', head: true }).gte('committed_at', since),
        fetch('/api/dev/execution-inbox?unread=1&limit=1', { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null)).catch(() => null),
      ])
      const list = ((tasksRes?.data as any[]) ?? [])
      const statusOf = (t: any) => String(t.dev_status || t.status || 'todo').toLowerCase()
      const next: DevLiveStats = {
        open: list.filter(t => !['done', 'completed', 'cancelled'].includes(statusOf(t))).length,
        review: list.filter(t => [
          'review', 'ready_review', 'ready_for_review', 'in_review',
          'needs_review', 'finished_by_dev', 'verified_by_tagro',
        ].includes(statusOf(t))).length,
        blocked: list.filter(t => ['blocked', 'waiting'].includes(statusOf(t))).length,
        inbox: Number(inboxRes?.unread ?? 0),
        commits7d: commitsRes?.count ?? 0,
        loaded: true,
      }
      setStats(next)
      onStatsRef.current?.(next)
    } catch {
      setStats(prev => ({ ...prev, loaded: true }))
    }
  }, [supabase, userId])

  const loadOpenSession = useCallback(async () => {
    if (identity.kind !== 'supabase') { setOpenSession(null); return }
    try {
      const res = await fetch('/api/dev/work-sessions?open=1&limit=1')
      const d = await res.json().catch(() => ({}))
      const s = d?.sessions?.[0] ?? null
      if (!s) { setOpenSession(null); return }
      let taskTitle: string | null = null
      if (s.task_id) {
        const { data: t } = await supabase.from('tasks').select('title').eq('id', s.task_id).maybeSingle()
        taskTitle = (t as any)?.title ?? null
      }
      setOpenSession({ id: s.id, task_id: s.task_id, task_title: taskTitle, started_at: s.started_at })
    } catch {
      setOpenSession(null)
    }
  }, [supabase, identity])

  useEffect(() => {
    loadStats()
    loadOpenSession()
    if (identity.kind !== 'supabase' || !userId) return
    const channel = supabase
      .channel(`dev-rail-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}`,
      }, () => { loadStats() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadStats, loadOpenSession, pathname, supabase, userId, identity.kind])

  useEffect(() => {
    if (!openSession) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [openSession])
  void tick

  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (menuRef.current && e.target instanceof Node && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onEsc)
    }
  }, [menuOpen])

  const liveSeconds = openSession
    ? Math.floor((Date.now() - new Date(openSession.started_at).getTime()) / 1000)
    : 0

  const isActive = (href: string) =>
    href === '/dev' ? pathname === '/dev' : pathname === href || pathname.startsWith(href + '/')

  const countFor = (row: NavRow) => {
    if (!row.count || !stats.loaded) return null
    const value = stats[row.count]
    return value > 0 ? value : null
  }

  const hasActiveChild = (group: NavGroupDef) =>
    group.rows.some(row => isActive(row.href))

  function groupIsCollapsed(group: NavGroupDef) {
    if (!group.collapsible) return false
    if (hasActiveChild(group)) return false
    if (group.id in collapsed) return !!collapsed[group.id]
    return !!group.defaultCollapsed
  }

  function handleOpenTagro() {
    openTagro({
      contextType: 'dev_item',
      id: `dev:${pathname}`,
      title: `Tagro — ${tagroContext.title}`,
      prefill: tagroContext.prefill,
    })
  }

  return (
    <aside className="dv-rail" aria-label="Navigation">
      <div className="dv-rail-head">
        <div ref={menuRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <button
            type="button"
            className="dv-brand"
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <img src="/brand/logo-mark.png?v=20260724-split-mark" alt="" />
            <span className="dv-brand-text">{displayName}</span>
            <CaretUpDown size={13} className="dv-brand-caret" />
          </button>
          {menuOpen && (
            <div className="dv-menu" role="menu" style={{ top: 'calc(100% + 6px)', left: 0, right: 0 }}>
              <p className="dv-menu-label">{roleLabel}</p>
              <Link href="/dev/settings" className="dv-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                <GearSix size={15} /><span>Einstellungen</span>
              </Link>
              <Link href="/dashboard" className="dv-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                <UserSwitch size={15} /><span>Zum Client-Portal</span>
              </Link>
              <div className="dv-menu-sep" />
              <button type="button" className="dv-menu-item" role="menuitem" onClick={onLogout}>
                <SignOut size={15} /><span>Abmelden</span>
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className="dv-icon-btn"
          onClick={onCollapse}
          title="Sidebar einklappen"
          aria-label="Sidebar einklappen"
        >
          <SidebarSimple size={16} />
        </button>
      </div>

      {openSession && (
        <Link href="/dev/time" className="dv-session">
          <span className="dv-session-dot" aria-hidden="true" />
          <span className="dv-session-text">
            <span className="dv-session-time">{formatDuration(liveSeconds)}</span>
            <span className="dv-session-task">{openSession.task_title || 'Aktive Session'}</span>
          </span>
        </Link>
      )}

      <div className="dv-rail-scroll">
        {NAV.map((group) => {
          const isCollapsed = groupIsCollapsed(group)
          return (
            <div className="dv-group" key={group.id} data-collapsed={isCollapsed || undefined}>
              {group.label && (
                <button
                  type="button"
                  className={`dv-group-toggle${group.collapsible ? '' : ' is-static'}`}
                  onClick={group.collapsible ? () => toggleGroup(group.id) : undefined}
                  aria-expanded={group.collapsible ? !isCollapsed : undefined}
                >
                  <span className="dv-group-label">{group.label}</span>
                  {group.collapsible && (
                    <CaretDown
                      size={11}
                      weight="bold"
                      className={`dv-group-caret${isCollapsed ? ' is-collapsed' : ''}`}
                    />
                  )}
                </button>
              )}
              <div className={`dv-group-rows${isCollapsed ? ' is-hidden' : ''}`}>
                {group.rows.map(row => {
                  const Icon = row.icon
                  const count = countFor(row)
                  const active = isActive(row.href)
                  return (
                    <Link
                      key={row.href}
                      href={row.href}
                      className={`dv-nav${active ? ' is-active' : ''}`}
                    >
                      <Icon size={15} weight={active ? 'fill' : 'regular'} />
                      <span className="dv-nav-label">{row.label}</span>
                      {count !== null && (
                        <span className={`dv-nav-count${row.tone ? ` is-${row.tone}` : ''}`}>{count}</span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="dv-rail-foot">
        <button
          type="button"
          className={`dv-nav dv-nav-tagro${tagroNeedsAttention ? ' has-signal' : ''}`}
          onClick={handleOpenTagro}
          title={`Tagro — ${tagroContext.title}`}
          aria-label={`Tagro öffnen, Kontext ${tagroContext.title}`}
        >
          <Sparkle size={15} weight="regular" />
          <span className="dv-nav-label">Tagro</span>
          <span className="dv-nav-tagro-meta">{tagroContext.title}</span>
        </button>
        <Link href="/dev/settings" className={`dv-nav${isActive('/dev/settings') ? ' is-active' : ''}`}>
          <GearSix size={15} weight={isActive('/dev/settings') ? 'fill' : 'regular'} />
          <span className="dv-nav-label">Einstellungen</span>
        </Link>
      </div>
    </aside>
  )
}
