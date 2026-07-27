'use client'

/**
 * DevTopBar — the one persistent header in the developer portal.
 *
 * Holds: where you are (crumbs + short place code), search, optional repo,
 * Tagro, inbox, and a quiet link into settings. Theme lives in Settings →
 * Erscheinung — not in this bar.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Bell, GitBranch, MagnifyingGlass, SidebarSimple, Sparkle } from '@phosphor-icons/react'

import { createClient } from '@/lib/supabase/client'
import { openTagro } from '@/components/TagroOverlay'
import { getDevRouteTagroContext } from '@/lib/dev-mobile-nav'
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
  '/dev/visibility': 'Sichtbarkeit',
  '/dev/briefing': 'Briefing',
  '/dev/decisions': 'Entscheidungen',
  '/dev/documents': 'Dokumente',
  '/dev/messages': 'Inbox',
  '/dev/captures': 'Aufnahmen',
  '/dev/team': 'Mitglieder',
  '/dev/plan': 'Tagesplan',
  '/dev/time': 'Zeit',
  '/dev/updates': 'Updates',
  '/dev/settings': 'Einstellungen',
  '/dev/settings/profile': 'Profil',
  '/dev/settings/appearance': 'Erscheinung',
  '/dev/settings/notifications': 'Benachrichtigungen',
  '/dev/settings/security': 'Sicherheit',
  '/dev/settings/github': 'GitHub',
  '/dev/settings/ai': 'KI & Tagro',
}

/** Short standort codes for the topbar place pill. */
const ROUTE_ABBREV: Record<string, string> = {
  '/dev': 'HEU',
  '/dev/tasks': 'AUF',
  '/dev/projects': 'PRJ',
  '/dev/activity': 'AKT',
  '/dev/github': 'GH',
  '/dev/review': 'REV',
  '/dev/issues': 'VOR',
  '/dev/deliverables': 'LIE',
  '/dev/visibility': 'SIC',
  '/dev/briefing': 'BRF',
  '/dev/decisions': 'ENT',
  '/dev/documents': 'DOK',
  '/dev/messages': 'INB',
  '/dev/captures': 'CAP',
  '/dev/team': 'TEM',
  '/dev/plan': 'PLN',
  '/dev/time': 'ZEI',
  '/dev/updates': 'UPD',
  '/dev/settings': 'SET',
  '/dev/settings/profile': 'PRF',
  '/dev/settings/appearance': 'ERS',
  '/dev/settings/notifications': 'BEN',
  '/dev/settings/security': 'SEC',
  '/dev/settings/github': 'GH',
  '/dev/settings/ai': 'KI',
}

type LinkedRepo = { repo_full_name: string; default_branch: string | null; repo_url: string | null }

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'DV'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function resolveRouteKey(pathname: string): string | null {
  if (ROUTE_LABEL[pathname]) return pathname
  const base = Object.keys(ROUTE_LABEL)
    .filter(k => k !== '/dev' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return base ?? null
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

  const displayName = identity.kind === 'supabase' ? identity.name : 'Developer'
  const avatarUrl = identity.kind === 'supabase' ? identity.avatarUrl : null

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

  const routeKey = useMemo(() => resolveRouteKey(pathname), [pathname])
  const sectionLabel = routeKey ? ROUTE_LABEL[routeKey] : 'Execution'
  const placeCode = useMemo(() => {
    if (projectId) return 'PRJ'
    if (routeKey && ROUTE_ABBREV[routeKey]) return ROUTE_ABBREV[routeKey]
    return 'EXE'
  }, [pathname, projectId, routeKey])

  const tagroContext = useMemo(() => getDevRouteTagroContext(pathname), [pathname])

  function handleOpenTagro() {
    openTagro({
      contextType: 'dev_item',
      id: `dev:${pathname}`,
      title: `Tagro — ${tagroContext.title}`,
      prefill: tagroContext.prefill,
    })
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
          title={`${repo.repo_full_name}, ${repo.default_branch || 'main'}`}
        >
          <GitBranch size={12} />
          <span>{repo.default_branch || 'main'}</span>
        </a>
      )}

      <button
        type="button"
        className="dv-icon-btn"
        onClick={handleOpenTagro}
        title={`Tagro — ${tagroContext.title}`}
        aria-label={`Tagro öffnen, Kontext ${tagroContext.title}`}
      >
        <Sparkle size={16} weight="regular" />
      </button>

      <Link
        href="/dev/messages"
        className="dv-icon-btn"
        title="Inbox"
        aria-label={inboxUnread > 0 ? `Inbox, ${inboxUnread} ungelesen` : 'Inbox'}
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

      <span
        className="dv-place"
        title={projectTitle ? `${sectionLabel}, ${projectTitle}` : sectionLabel}
        aria-label={`Standort ${sectionLabel}`}
      >
        {placeCode}
      </span>

      <Link
        href="/dev/settings/profile"
        className="dv-avatar"
        title={`${displayName}, Einstellungen`}
        aria-label="Profil und Einstellungen"
      >
        {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(displayName)}
      </Link>
    </header>
  )
}
