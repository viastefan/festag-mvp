'use client'

/**
 * DevSidebar — schlanke, DEV-spezifische Sidebar.
 *
 * Nutzt dieselbe `.sidebar-inner` Container-Mechanik wie die Client-
 * Sidebar (siehe app/globals.css → 212px fixed, theme-aware background),
 * spiegelt also den ruhigen Look des Client Portals.
 *
 * Inhalte:
 *   • theme-aware Festag-Logo (Filter `--logo-filter` invertiert in Dark)
 *   • DEV-Identität (Avatar/Initialen, Name, Rolle, Github-Handle)
 *   • Live KPI-Strip: Tasks offen · Review · Blocker · Commits 7d
 *   • Aktive Work-Session: live Timer mit Stop-Button (sichtbar wenn offen)
 *   • Nav: Overview, My Tasks, Daily Plan, Job Board, GitHub, Updates, Team
 *   • Quick Actions: Sync GitHub
 *   • Logout
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Article, Briefcase, ChatsCircle, CheckSquare, Clock, Compass, FolderOpen, GearSix,
  GitBranch, GithubLogo, GitCommit, Kanban, Microphone, Pause, Play, Robot, SignOut,
  UsersThree, WarningCircle,
} from '@phosphor-icons/react'

import { createClient } from '@/lib/supabase/client'
import { devDisplayName } from '@/lib/dev-session'
import type { DevIdentity } from '@/components/DevAppShell'

type NavRow = { href: string; icon: React.ElementType; label: string }
const NAV_MAIN: NavRow[] = [
  { href: '/dev',           icon: Compass,     label: 'Overview' },
  { href: '/dev/projects',  icon: FolderOpen,  label: 'Projects' },
  { href: '/dev/captures',  icon: Microphone,  label: 'Client Captures' },
  { href: '/dev/tasks',     icon: CheckSquare, label: 'My Tasks' },
  { href: '/dev/review',    icon: Robot,       label: 'Tagro Review' },
  { href: '/dev/plan',      icon: Kanban,      label: 'Daily Plan' },
  { href: '/dev/time',      icon: Clock,       label: 'Zeiterfassung' },
  { href: '/dev/jobs',      icon: Briefcase,   label: 'Job Board' },
]
const NAV_INTEGRATIONS: NavRow[] = [
  { href: '/dev/github',   icon: GithubLogo,  label: 'GitHub' },
  { href: '/dev/updates',  icon: Article,     label: 'Updates' },
]
const NAV_ORG: NavRow[] = [
  { href: '/dev/team',     icon: UsersThree,  label: 'Team' },
  { href: '/dev/messages', icon: ChatsCircle, label: 'Messages' },
]

const ROLE_LABEL: Record<string, string> = {
  dev: 'Developer',
  admin: 'Admin',
  project_owner: 'Project Owner',
  pending_developer: 'Wartet auf Freigabe',
}

type LiveStats = {
  open: number
  review: number
  blocked: number
  commits7d: number
  loaded: boolean
}
type OpenSession = {
  id: string
  task_id: string | null
  task_title: string | null
  started_at: string
} | null

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`
  if (m > 0) return `${m}m ${String(sec).padStart(2,'0')}s`
  return `${sec}s`
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'DV'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function DevSidebar({
  identity,
  onCollapse,
  onLogout,
}: {
  identity: DevIdentity
  onCollapse: () => void
  onLogout: () => void
}) {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<LiveStats>({ open: 0, review: 0, blocked: 0, commits7d: 0, loaded: false })
  const [openSession, setOpenSession] = useState<OpenSession>(null)
  const [tick, setTick] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncToast, setSyncToast] = useState<string | null>(null)

  const userId = identity.kind === 'supabase' ? identity.userId : identity.session.user_id
  const displayName = identity.kind === 'supabase' ? identity.name : devDisplayName(identity.session)
  const roleLabel = identity.kind === 'supabase'
    ? (ROLE_LABEL[identity.role] ?? identity.role)
    : (identity.session.access_mode === 'pool' ? 'Pool Developer' : 'Workspace Developer')
  const avatarUrl = identity.kind === 'supabase' ? identity.avatarUrl : null
  const githubHandle = identity.kind === 'supabase' ? identity.githubUsername : null

  const loadStats = useCallback(async () => {
    if (!userId) return
    try {
      const { data: pa } = await supabase.from('project_assignments').select('project_id').eq('user_id', userId).eq('active', true)
      const projectIds = ((pa as any[]) ?? []).map(r => r.project_id).filter(Boolean) as string[]
      const filter = projectIds.length > 0
        ? `assigned_to.eq.${userId},project_id.in.(${projectIds.join(',')})`
        : `assigned_to.eq.${userId}`

      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      const [tasksRes, commitsRes] = await Promise.all([
        (supabase as any).from('tasks')
          .select('dev_status,status').or(filter).limit(500),
        (supabase as any).from('github_commits')
          .select('*', { count: 'exact', head: true }).gte('committed_at', since),
      ])
      const tlist = ((tasksRes?.data as any[]) ?? [])
      const status = (t: any) => String(t.dev_status || t.status || 'todo').toLowerCase()
      const open    = tlist.filter(t => !['done','completed','cancelled'].includes(status(t))).length
      const review  = tlist.filter(t => ['review','ready_review','ready_for_review','in_review'].includes(status(t))).length
      const blocked = tlist.filter(t => ['blocked','waiting'].includes(status(t))).length
      setStats({ open, review, blocked, commits7d: commitsRes?.count ?? 0, loaded: true })
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
  }, [loadStats, loadOpenSession, pathname])

  // global Sync trigger — invoked from the footer Sync GitHub button
  useEffect(() => {
    const handler = () => triggerSync()
    window.addEventListener('dev-trigger-github-sync', handler)
    return () => window.removeEventListener('dev-trigger-github-sync', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!openSession) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [openSession])
  void tick

  async function triggerSync() {
    if (syncing) return
    setSyncing(true); setSyncToast(null)
    try {
      const res = await fetch('/api/github/sync', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSyncToast(d?.error || 'Sync nicht möglich.')
      } else {
        setSyncToast(`Sync · ${d.commits ?? 0} commits · ${d.linked ?? 0} verknüpft`)
        loadStats()
      }
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncToast(null), 2500)
    }
  }

  async function stopTimer() {
    if (!openSession) return
    try {
      await fetch('/api/dev/work-sessions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: openSession.id, end: true }),
      })
      setOpenSession(null)
    } catch { /* noop */ }
  }

  const liveSeconds = openSession ? Math.floor((Date.now() - new Date(openSession.started_at).getTime()) / 1000) : 0

  const isActive = (href: string) => {
    if (href === '/dev') return pathname === '/dev'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="sidebar" style={{ pointerEvents: 'none' }}>
      <div className="sidebar-inner ds-inner" style={{ pointerEvents: 'all' }}>
        {/* Top bar: logo + DEV badge + collapse */}
        <div className="ds-topbar">
          <div className="ds-brand">
            <img
              src="/brand/logo.svg"
              alt="festag"
              className="ds-logo"
              style={{ filter: 'var(--logo-filter,none)' }}
            />
            <span className="ds-badge">DEV</span>
          </div>
          <button
            className="ds-icon-btn"
            type="button"
            onClick={onCollapse}
            title="Sidebar einklappen"
            aria-label="Sidebar einklappen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="5" width="16" height="14" rx="3" />
              <path d="M9 5v14" />
            </svg>
          </button>
        </div>

        {/* Identity */}
        <div className="ds-identity">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="ds-avatar img" />
          ) : (
            <span className="ds-avatar">{initials(displayName)}</span>
          )}
          <div className="ds-identity-text">
            <strong>{displayName}</strong>
            <span>{roleLabel}{githubHandle ? ` · @${githubHandle}` : ''}</span>
          </div>
        </div>

        {/* Live KPI strip */}
        <div className="ds-kpi-row">
          <div className="ds-kpi">
            <strong>{stats.open}</strong>
            <span>offen</span>
          </div>
          <div className="ds-kpi">
            <strong style={{ color: stats.review > 0 ? 'var(--amber)' : 'var(--text)' }}>{stats.review}</strong>
            <span>Review</span>
          </div>
          <div className="ds-kpi">
            <strong style={{ color: stats.blocked > 0 ? 'var(--red)' : 'var(--text)' }}>{stats.blocked}</strong>
            <span>Blocker</span>
          </div>
          <div className="ds-kpi">
            <strong>{stats.commits7d}</strong>
            <span>Commits</span>
          </div>
        </div>

        {/* Active session */}
        {openSession && (
          <Link href="/dev/time" className="ds-session">
            <span className="ds-session-pulse"><Play size={9} weight="fill" /></span>
            <div className="ds-session-text">
              <strong>{formatDuration(liveSeconds)}</strong>
              <span>{openSession.task_title || 'Aktive Session'}</span>
            </div>
            <button
              className="ds-session-stop"
              type="button"
              title="Timer stoppen"
              aria-label="Timer stoppen"
              onClick={e => { e.preventDefault(); stopTimer() }}
            >
              <Pause size={12} weight="fill" />
            </button>
          </Link>
        )}

        {/* Scrollable nav */}
        <div className="ds-scroll">
          <NavGroup label="Workspace" rows={NAV_MAIN} isActive={isActive} />
          <NavGroup label="Integrations" rows={NAV_INTEGRATIONS} isActive={isActive} />
          <NavGroup label="Team" rows={NAV_ORG} isActive={isActive} />

          <p className="ds-section-label">Quick</p>
          <button
            type="button"
            className="ds-nav-row"
            onClick={triggerSync}
            disabled={syncing}
          >
            <GitBranch size={15} weight="regular" />
            <span>{syncing ? 'Sync läuft…' : 'Sync GitHub'}</span>
          </button>
          {syncToast && <p className="ds-sync-toast">{syncToast}</p>}
        </div>

        {/* Footer */}
        <div className="ds-footer">
          <Link href="/dev/settings" className="ds-nav-row" style={{ flex: 1 }}>
            <GearSix size={15} weight="regular" />
            <span>Settings</span>
          </Link>
          <button className="ds-icon-btn" type="button" onClick={onLogout} title="Abmelden" aria-label="Abmelden">
            <SignOut size={14} />
          </button>
        </div>

        {stats.blocked > 0 && (
          <Link href="/dev/tasks" className="ds-banner">
            <WarningCircle size={13} weight="regular" />
            <span>{stats.blocked} Blocker — Tagro wartet auf deine Notiz.</span>
          </Link>
        )}
      </div>

      <style jsx>{`
        .ds-inner {
          padding: 14px 12px 12px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .ds-topbar {
          display: flex; align-items: center; gap: 6px;
          padding: 2px 4px 2px;
        }
        .ds-brand { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .ds-logo { height: 14px; display: block; }
        .ds-badge {
          font-size: 9px; letter-spacing: .02em; font-weight: 500;
          color: var(--text-muted);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 2px 7px;
          text-transform: uppercase;
        }
        .ds-icon-btn {
          width: 26px; height: 26px;
          border: 0; background: transparent; cursor: pointer;
          color: color-mix(in srgb, var(--text-secondary) 78%, var(--text));
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 8px;
          transition: background .12s ease, color .12s ease;
        }
        .ds-icon-btn:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text); }

        .ds-identity {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 8px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--surface-2) 60%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
        }
        .ds-avatar {
          width: 28px; height: 28px; border-radius: 8px;
          background: var(--accent); color: var(--accent-text);
          display: grid; place-items: center;
          font-size: 11px; font-weight: 500; letter-spacing: .02em;
          flex: 0 0 auto; overflow: hidden;
        }
        .ds-avatar.img { background: transparent; }
        .ds-identity-text { min-width: 0; flex: 1; }
        .ds-identity-text strong {
          display: block; font-size: 12.5px; line-height: 1.2; font-weight: 500;
          letter-spacing: .02em;
          color: var(--text);
          max-width: 138px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
        }
        .ds-identity-text span {
          display: block; font-size: 11px; color: var(--text-muted);
          margin-top: 2px;
          max-width: 138px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
        }

        .ds-kpi-row {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;
          padding: 0 2px;
        }
        .ds-kpi {
          display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
          padding: 6px 7px; border-radius: 7px;
          background: color-mix(in srgb, var(--surface-2) 35%, transparent);
        }
        .ds-kpi strong { font-size: 14px; font-weight: 500; letter-spacing: .02em; color: var(--text); line-height: 1.1; }
        .ds-kpi span { font-size: 9.5px; color: var(--text-muted); letter-spacing: .02em; }

        .ds-session {
          display: grid; grid-template-columns: 22px 1fr 24px; gap: 9px; align-items: center;
          padding: 8px 10px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--accent) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
          text-decoration: none; color: var(--text);
        }
        .ds-session-pulse {
          width: 22px; height: 22px; border-radius: 7px;
          display: grid; place-items: center;
          background: color-mix(in srgb, var(--accent) 25%, transparent);
          color: var(--accent);
        }
        .ds-session-text { min-width: 0; }
        .ds-session-text strong {
          display: block; font-size: 12px; font-weight: 500; letter-spacing: .02em;
          color: var(--text);
        }
        .ds-session-text span {
          display: block; font-size: 10.5px; color: var(--text-muted);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ds-session-stop {
          width: 24px; height: 24px; border-radius: 7px;
          border: 0; background: transparent; cursor: pointer;
          color: var(--text-secondary);
          display: inline-flex; align-items: center; justify-content: center;
        }
        .ds-session-stop:hover { color: var(--red); background: var(--surface-2); }

        .ds-scroll {
          flex: 1 1 auto; min-height: 0;
          overflow-y: auto; overflow-x: hidden;
          padding-top: 4px; padding-bottom: 6px;
          scrollbar-width: none;
          display: flex; flex-direction: column; gap: 8px;
        }
        .ds-scroll::-webkit-scrollbar { display: none; }

        .ds-section-label {
          margin: 6px 6px 2px;
          font-size: 9.5px; font-weight: 500; letter-spacing: .02em;
          text-transform: uppercase; color: var(--text-muted);
        }

        .ds-footer {
          display: flex; gap: 4px; align-items: center;
          padding-top: 6px;
          border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
        }
        .ds-banner {
          margin-top: 6px;
          display: flex; align-items: center; gap: 7px;
          padding: 7px 10px; border-radius: 8px;
          background: var(--red-bg);
          color: var(--red);
          text-decoration: none;
          font-size: 11px; line-height: 1.35;
          border: 1px solid color-mix(in srgb, var(--red) 35%, transparent);
        }
        .ds-sync-toast {
          margin: 4px 8px 0; font-size: 10.5px; color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .sidebar { display: none; }
        }
      `}</style>

      <style jsx global>{`
        .ds-nav-row {
          width: 100%;
          display: grid; grid-template-columns: 18px 1fr; gap: 9px; align-items: center;
          padding: 0 10px;
          min-height: 30px;
          border: 0; background: transparent; cursor: pointer;
          color: var(--text-secondary);
          border-radius: 8px;
          text-decoration: none;
          font: inherit; font-size: 12.5px; font-weight: 500; letter-spacing: .02em;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          transition: background .1s ease, color .1s ease;
        }
        .ds-nav-row svg { color: var(--text-muted); }
        .ds-nav-row:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text); }
        .ds-nav-row:hover svg { color: var(--text); }
        .ds-nav-row.active { background: var(--nav-on); color: var(--nav-on-text); }
        .ds-nav-row.active svg { color: var(--text); }
        .ds-nav-row:disabled { opacity: .55; cursor: default; }
      `}</style>
    </aside>
  )
}

function NavGroup({
  label, rows, isActive,
}: { label: string; rows: NavRow[]; isActive: (href: string) => boolean }) {
  return (
    <div>
      <p className="ds-section-label">{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {rows.map(r => {
          const Icon = r.icon
          const active = isActive(r.href)
          return (
            <Link key={r.href} href={r.href} className={`ds-nav-row${active ? ' active' : ''}`}>
              <Icon size={15} weight={active ? 'fill' : 'regular'} />
              <span>{r.label}</span>
            </Link>
          )
        })}
      </div>
      <style jsx>{`
        .ds-section-label {
          margin: 6px 6px 2px;
          font-size: 9.5px; font-weight: 500; letter-spacing: .02em;
          text-transform: uppercase; color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}
