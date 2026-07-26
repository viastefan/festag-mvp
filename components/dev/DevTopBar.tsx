'use client'

/**
 * DevTopBar — the one persistent header in the developer portal.
 *
 * Holds exactly four things: where you are, search, what repo/branch the
 * current context points at, and you. Anything route-specific belongs in
 * the page header below it, not up here.
 *
 * The repo pill is only rendered when a repository is actually linked —
 * we never render a decorative branch or environment label.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Check, GitBranch, MagnifyingGlass, SidebarSimple } from '@phosphor-icons/react'

import { createClient } from '@/lib/supabase/client'
import { getTheme, setTheme, type PanelThemeMode, type ThemeMode } from '@/lib/theme'
import type { DevIdentity } from '@/components/DevAppShell'

const ROUTE_LABEL: Record<string, string> = {
  '/dev': 'Heute',
  '/dev/tasks': 'Aufgaben',
  '/dev/projects': 'Projekte',
  '/dev/activity': 'Aktivität',
  '/dev/github': 'GitHub',
  '/dev/review': 'Tagro Review',
  '/dev/issues': 'Vorfälle',
  '/dev/deliverables': 'Lieferungen',
  '/dev/visibility': 'Kunden-Sicht',
  '/dev/briefing': 'Tagesbriefing',
  '/dev/decisions': 'Entscheidungen',
  '/dev/documents': 'Dokumente',
  '/dev/messages': 'Execution Inbox',
  '/dev/captures': 'Client-Aufnahmen',
  '/dev/team': 'Team',
  '/dev/plan': 'Tagesplan',
  '/dev/time': 'Zeiterfassung',
  '/dev/updates': 'Updates',
  '/dev/settings': 'Einstellungen',
}

const THEME_OPTIONS: Array<{ id: ThemeMode; label: string }> = [
  { id: 'dark', label: 'Dunkel' },
  { id: 'light', label: 'Hell' },
  { id: 'read', label: 'Read' },
]

type LinkedRepo = { repo_full_name: string; default_branch: string | null; repo_url: string | null }

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'DV'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function DevTopBar({
  identity,
  sidebarCollapsed,
  onExpandSidebar,
  inboxUnread,
}: {
  identity: DevIdentity
  sidebarCollapsed: boolean
  onExpandSidebar: () => void
  inboxUnread: number
}) {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [repo, setRepo] = useState<LinkedRepo | null>(null)
  const [projectTitle, setProjectTitle] = useState<string | null>(null)
  const [themeMode, setThemeMode] = useState<PanelThemeMode>('dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const displayName = identity.kind === 'supabase' ? identity.name : 'Developer'
  const avatarUrl = identity.kind === 'supabase' ? identity.avatarUrl : null

  useEffect(() => { try { setThemeMode(getTheme('dev')) } catch { /* noop */ } }, [])

  useEffect(() => {
    const onTheme = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail && typeof detail === 'object' && 'surface' in detail && detail.surface !== 'dev') return
      const mode = typeof detail === 'object' && detail && 'mode' in detail ? detail.mode : detail
      if (mode === 'light' || mode === 'dark' || mode === 'read') setThemeMode(mode)
    }
    window.addEventListener('festag-theme', onTheme)
    return () => window.removeEventListener('festag-theme', onTheme)
  }, [])

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

  // Current project context — only on /dev/projects/[id].
  const projectId = useMemo(() => {
    const match = pathname.match(/^\/dev\/projects\/([^/]+)/)
    return match ? match[1] : null
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    if (!projectId) { setProjectTitle(null); return }
    ;(async () => {
      const { data } = await supabase.from('projects').select('title').eq('id', projectId).maybeSingle()
      if (!cancelled) setProjectTitle((data as any)?.title ?? null)
    })()
    return () => { cancelled = true }
  }, [projectId, supabase])

  // Linked repository for the current context, falling back to the most
  // recently linked one so the pill still tells you which codebase is live.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let query = (supabase as any)
          .from('github_repositories')
          .select('repo_full_name,default_branch,repo_url,project_id,created_at')
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1)
        if (projectId) query = query.eq('project_id', projectId)
        const { data } = await query
        const row = ((data as any[]) ?? [])[0] ?? null
        if (!cancelled) setRepo(row)
      } catch {
        if (!cancelled) setRepo(null)
      }
    })()
    return () => { cancelled = true }
  }, [projectId, supabase])

  const sectionLabel = useMemo(() => {
    if (ROUTE_LABEL[pathname]) return ROUTE_LABEL[pathname]
    const base = Object.keys(ROUTE_LABEL)
      .filter(k => k !== '/dev' && pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0]
    return base ? ROUTE_LABEL[base] : 'Dev'
  }, [pathname])

  function applyTheme(next: ThemeMode) {
    setTheme(next, 'dev')
    setThemeMode(getTheme('dev'))
    setMenuOpen(false)
  }

  return (
    <header className="dv-topbar">
      {sidebarCollapsed && (
        <button
          type="button"
          className="dv-icon-btn"
          onClick={onExpandSidebar}
          title="Sidebar ausklappen"
          aria-label="Sidebar ausklappen"
        >
          <SidebarSimple size={16} />
        </button>
      )}

      <nav className="dv-crumbs" aria-label="Pfad">
        <Link href="/dev" className="dv-crumb" style={{ color: 'var(--dv-text-3)' }}>Dev</Link>
        <span className="dv-crumb-sep" aria-hidden="true">/</span>
        <span className="dv-crumb">{projectTitle ?? sectionLabel}</span>
      </nav>

      <div className="dv-topbar-spacer" />

      <button
        type="button"
        className="dv-search"
        onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
        title="Suchen und Aktionen"
      >
        <MagnifyingGlass size={14} />
        <span className="dv-search-label">Suchen…</span>
        <span className="dv-kbd" aria-hidden="true">⌘K</span>
      </button>

      {repo && (
        <a
          className="dv-meta-pill is-desktop-only"
          href={repo.repo_url ?? '#'}
          target="_blank"
          rel="noreferrer"
          title={`${repo.repo_full_name} · ${repo.default_branch || 'main'}`}
        >
          <GitBranch size={12} />
          <span>{repo.default_branch || 'main'}</span>
        </a>
      )}

      <Link
        href="/dev/messages"
        className="dv-icon-btn"
        title="Execution Inbox"
        aria-label={inboxUnread > 0 ? `Execution Inbox, ${inboxUnread} ungelesen` : 'Execution Inbox'}
        style={{ position: 'relative' }}
      >
        <Bell size={16} />
        {inboxUnread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: 5, right: 5, width: 6, height: 6,
              borderRadius: '50%', background: 'var(--dv-blue)',
            }}
          />
        )}
      </Link>

      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          className="dv-avatar"
          onClick={() => setMenuOpen(o => !o)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          title={displayName}
        >
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(displayName)}
        </button>
        {menuOpen && (
          <div className="dv-menu" role="menu" style={{ top: 'calc(100% + 8px)', right: 0 }}>
            <p className="dv-menu-label">Darstellung</p>
            {THEME_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={themeMode === option.id}
                className="dv-menu-item"
                onClick={() => applyTheme(option.id)}
              >
                <span>{option.label}</span>
                {themeMode === option.id && <Check size={14} />}
              </button>
            ))}
            <div className="dv-menu-sep" />
            <Link href="/dev/settings" className="dv-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
              <span>Einstellungen</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
