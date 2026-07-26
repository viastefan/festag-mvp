'use client'

/**
 * DevSidebar — the developer portal rail.
 *
 * Design language lives in app/dev/dev-portal.css (`.dv-rail`, `.dv-nav`).
 * Deliberately quiet: one fill for hover and active, muted icons, no cards
 * and no KPI grid. Live numbers ride inline on the nav rows they belong to,
 * so a glance down the rail already answers "what needs me".
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Article, Broadcast, CalendarBlank, CaretUpDown, ChatsCircle, CheckSquare, Clock, Eye, FileText,
  FolderOpen, GearSix, GithubLogo, House, Microphone, Package, Robot, Scales, SidebarSimple,
  SignOut, UsersThree, UserSwitch, WarningOctagon,
} from '@phosphor-icons/react'

import { createClient } from '@/lib/supabase/client'
import { devDisplayName } from '@/lib/dev-session'
import type { DevIdentity } from '@/components/DevAppShell'

type NavRow = {
  href: string
  icon: React.ElementType
  label: string
  /** Which live counter, if any, renders on the right of this row. */
  count?: 'open' | 'review' | 'blocked' | 'inbox'
  tone?: 'warning' | 'error'
}
type NavGroupDef = { label?: string; rows: NavRow[] }

/** Grouped so the rail stays scannable — every entry is a real route. */
const NAV: NavGroupDef[] = [
  {
    rows: [
      { href: '/dev', icon: House, label: 'Heute' },
      { href: '/dev/tasks', icon: CheckSquare, label: 'Aufgaben', count: 'open' },
      { href: '/dev/projects', icon: FolderOpen, label: 'Projekte' },
      { href: '/dev/activity', icon: Broadcast, label: 'Aktivität' },
    ],
  },
  {
    label: 'Code',
    rows: [
      { href: '/dev/github', icon: GithubLogo, label: 'GitHub' },
      { href: '/dev/review', icon: Robot, label: 'Tagro Review', count: 'review', tone: 'warning' },
      { href: '/dev/issues', icon: WarningOctagon, label: 'Vorfälle', count: 'blocked', tone: 'error' },
    ],
  },
  {
    label: 'Lieferung',
    rows: [
      { href: '/dev/deliverables', icon: Package, label: 'Lieferungen' },
      { href: '/dev/visibility', icon: Eye, label: 'Kunden-Sicht' },
      { href: '/dev/briefing', icon: Article, label: 'Tagesbriefing' },
      { href: '/dev/decisions', icon: Scales, label: 'Entscheidungen' },
      { href: '/dev/documents', icon: FileText, label: 'Dokumente' },
    ],
  },
  {
    label: 'Team',
    rows: [
      { href: '/dev/messages', icon: ChatsCircle, label: 'Execution Inbox', count: 'inbox' },
      { href: '/dev/captures', icon: Microphone, label: 'Client-Aufnahmen' },
      { href: '/dev/team', icon: UsersThree, label: 'Team' },
    ],
  },
  {
    label: 'Persönlich',
    rows: [
      { href: '/dev/plan', icon: CalendarBlank, label: 'Tagesplan' },
      { href: '/dev/time', icon: Clock, label: 'Zeiterfassung' },
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
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<DevLiveStats>(EMPTY_STATS)
  const [openSession, setOpenSession] = useState<OpenSession>(null)
  const [tick, setTick] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const userId = identity.kind === 'supabase' ? identity.userId : identity.session.user_id
  const displayName = identity.kind === 'supabase' ? identity.name : devDisplayName(identity.session)
  const roleLabel = identity.kind === 'supabase'
    ? (ROLE_LABEL[identity.role] ?? identity.role)
    : (identity.session.access_mode === 'pool' ? 'Pool Developer' : 'Workspace Developer')

  const onStatsRef = useRef(onStats)
  useEffect(() => { onStatsRef.current = onStats }, [onStats])

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
        review: list.filter(t => ['review', 'ready_review', 'ready_for_review', 'in_review'].includes(statusOf(t))).length,
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
        {NAV.map((group, gi) => (
          <div className="dv-group" key={group.label ?? `g${gi}`}>
            {group.label && <p className="dv-group-label">{group.label}</p>}
            {group.rows.map(row => {
              const Icon = row.icon
              const count = countFor(row)
              return (
                <Link
                  key={row.href}
                  href={row.href}
                  className={`dv-nav${isActive(row.href) ? ' is-active' : ''}`}
                >
                  <Icon size={15} weight="regular" />
                  <span className="dv-nav-label">{row.label}</span>
                  {count !== null && (
                    <span className={`dv-nav-count${row.tone ? ` is-${row.tone}` : ''}`}>{count}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      <div className="dv-rail-foot">
        <Link href="/dev/settings" className="dv-nav" style={{ flex: 1 }}>
          <GearSix size={15} weight="regular" />
          <span className="dv-nav-label">Einstellungen</span>
        </Link>
      </div>
    </aside>
  )
}
