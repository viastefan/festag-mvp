'use client'

/**
 * ProjectsMobileHome — Vercel-inspired mobile Projects surface.
 *
 * Layout: centered app selector · search + filter + add · Recents card ·
 * project cards · floating Find | Menü bar.
 *
 * Festag content only (no GitHub/deploy noise on the client portal).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CaretDown,
  CheckCircle,
  DotsNine,
  DotsThree,
  Eye,
  FunnelSimple,
  GitBranch,
  List,
  MagnifyingGlass,
  Plus,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { canAccessExecutionPanel } from '@/lib/execution-panel/access'
import PortalWorkspacePopover from '@/components/PortalWorkspacePopover'
import { PROJECTS_MOBILE_HOME_CSS } from '@/components/projects/projects-mobile-home-styles'
import { getRememberedWorkspaceName } from '@/lib/pending-workspace'

export type PmhProject = {
  id: string
  title: string
  description?: string | null
  status?: string | null
  color?: string | null
  delivery_model?: string | null
  staging_url?: string | null
  live_url?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type PmhTask = {
  id: string
  project_id?: string | null
  status?: string | null
  updated_at?: string | null
}

export type PmhDev = {
  id: string
  full_name: string | null
  avatar_url: string | null
  github_avatar_url: string | null
  github_username: string | null
  email: string | null
}

type StatusKey = 'arbeit' | 'planung' | 'erledigt'
type FilterId = 'all' | 'arbeit' | 'planung' | 'erledigt'
type SortId = 'recent' | 'created' | 'created_asc' | 'name' | 'name_desc' | 'status'
type RecentsTab = 'recents' | 'status' | 'hints'

const DONE_STATES = new Set(['done', 'completed', 'erledigt', 'delivered'])
const ACTIVE_STATES = new Set(['doing', 'active', 'in_progress', 'review'])
const TASK_DONE_STATES = new Set(['done', 'completed', 'erledigt', 'closed', 'cancelled'])

const STATUS_META: Record<StatusKey, { label: string; color: string }> = {
  arbeit: { label: 'In Arbeit', color: 'rgba(52,199,89,.9)' },
  planung: { label: 'In Planung', color: 'rgba(0,122,255,.9)' },
  erledigt: { label: 'Erledigt', color: 'rgba(142,142,147,.9)' },
}

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'arbeit', label: 'In Arbeit' },
  { id: 'planung', label: 'Planung' },
  { id: 'erledigt', label: 'Erledigt' },
]

const SORTS: { id: SortId; label: string }[] = [
  { id: 'recent', label: 'Zuletzt aktualisiert' },
  { id: 'created', label: 'Neueste zuerst' },
  { id: 'created_asc', label: 'Älteste zuerst' },
  { id: 'name', label: 'Name (A–Z)' },
  { id: 'name_desc', label: 'Name (Z–A)' },
  { id: 'status', label: 'Status' },
]

function statusKeyOf(p: PmhProject): StatusKey {
  const raw = (p.status || 'intake').toLowerCase()
  if (DONE_STATES.has(raw)) return 'erledigt'
  if (ACTIVE_STATES.has(raw) || raw === 'testing') return 'arbeit'
  return 'planung'
}

function subLabelFor(p: PmhProject, tasks: PmhTask[]): string {
  const map: Record<string, string> = {
    festag_delivery: 'App Entwicklung',
    assign_existing_dev: 'App Entwicklung',
    invite_new_dev: 'App Entwicklung',
    team_internal: 'Team-Projekt',
  }
  if (p.delivery_model && map[p.delivery_model]) return map[p.delivery_model]
  const projectTasks = tasks.filter(t => t.project_id === p.id)
  if (projectTasks.length > 0) {
    const open = projectTasks.filter(t => !TASK_DONE_STATES.has((t.status || '').toLowerCase())).length
    if (open > 0) return `${open} offene Aufgabe${open === 1 ? '' : 'n'}`
    return 'Alle Aufgaben erledigt'
  }
  return p.description?.split(/[.!?\n]/)[0]?.slice(0, 40) || 'Projekt'
}

function projectHost(p: PmhProject): string {
  const raw = (p.live_url || p.staging_url || '').trim()
  if (raw) {
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
      return u.hostname.replace(/^www\./, '')
    } catch {
      return raw.replace(/^https?:\/\//, '').split('/')[0] || raw
    }
  }
  return subLabelFor(p, [])
}

function relTimeShort(value?: string | null): string {
  if (!value) return '—'
  try {
    const d = new Date(value).getTime()
    if (Number.isNaN(d)) return '—'
    const diff = Math.max(0, Date.now() - d)
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'gerade eben'
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    const days = Math.floor(h / 24)
    if (days < 7) return `${days}d`
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(d))
  } catch {
    return '—'
  }
}

function devInitials(d: PmhDev): string {
  return (d.full_name || d.github_username || d.email || '·')
    .replace(/^@/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('') || '·'
}

function logoLetter(title: string): string {
  return (title.trim()[0] || 'F').toUpperCase()
}

function logoColor(p: PmhProject): string {
  if (p.color && /^#|rgb|hsl/.test(p.color)) return p.color
  const palette = ['#0070f3', '#00c389', '#f5a623', '#7c3aed', '#e11d48', '#0ea5e9']
  let h = 0
  for (let i = 0; i < p.title.length; i++) h = (h + p.title.charCodeAt(i) * (i + 1)) % palette.length
  return palette[h]
}

type TeamMember = { id: string; name: string }

type Props = {
  projects: PmhProject[]
  tasks: PmhTask[]
  visible: PmhProject[]
  loading: boolean
  filter: FilterId
  sort: SortId
  onFilterChange: (id: FilterId) => void
  onSortChange: (id: SortId) => void
  onNewProject: () => void
  onOpenNav: () => void
  menuOpenId: string | null
  onMenuOpenId: (id: string | null) => void
  onMenuAction: (project: PmhProject, action: string) => void
  canOpenDevPanel: boolean
  devsByProject: Record<string, PmhDev[]>
}

export default function ProjectsMobileHome({
  projects,
  tasks,
  visible,
  loading,
  filter,
  sort,
  onFilterChange,
  onSortChange,
  onNewProject,
  onOpenNav,
  menuOpenId,
  onMenuOpenId,
  onMenuAction,
  canOpenDevPanel,
  devsByProject,
}: Props) {
  const [query, setQuery] = useState('')
  const [recentsTab, setRecentsTab] = useState<RecentsTab>('recents')
  const [recentsExpanded, setRecentsExpanded] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<'filter' | 'sort'>('filter')
  const [appLabel, setAppLabel] = useState('Festag')
  const [displayName, setDisplayName] = useState('Festag')
  const [email, setEmail] = useState('')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [showExecutionPanel, setShowExecutionPanel] = useState(false)
  const [wsMenuOpen, setWsMenuOpen] = useState(false)
  const wsTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let alive = true
    const cached = getRememberedWorkspaceName()
    if (cached) setAppLabel(cached)
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const u = sessionData.session?.user
        if (!u || !alive) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, first_name, email, role, approval_status')
          .eq('id', u.id)
          .maybeSingle()
        if (!alive) return
        const p = profile as {
          full_name?: string | null
          first_name?: string | null
          email?: string | null
          role?: string | null
          approval_status?: string | null
        } | null
        const userEmail = p?.email || u.email || ''
        const name =
          (p?.full_name || '').trim() ||
          (p?.first_name || '').trim() ||
          userEmail.split('@')[0] ||
          'Festag'
        setDisplayName(name)
        setEmail(userEmail)
        setShowExecutionPanel(
          canAccessExecutionPanel({
            role: p?.role,
            approval_status: p?.approval_status,
          }),
        )

        const { data: ws } = await supabase
          .from('workspaces')
          .select('id, name, mode')
          .eq('primary_owner_id', u.id)
          .eq('is_personal', true)
          .maybeSingle()
        if (!alive) return
        const wn = typeof (ws as { name?: string } | null)?.name === 'string'
          ? (ws as { name: string }).name.trim()
          : ''
        if (wn) setAppLabel(wn)

        const wsId = (ws as { id?: string } | null)?.id
        if (wsId) {
          try {
            const { data: mem } = await supabase
              .from('workspace_members')
              .select('user_id')
              .eq('workspace_id', wsId)
            const memRows = (mem as { user_id: string }[] | null) ?? []
            const ids = Array.from(new Set([u.id, ...memRows.map(r => r.user_id)].filter(Boolean)))
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, full_name, first_name, email')
              .in('id', ids)
            const pById = new Map(
              (
                (profs ?? []) as Array<{
                  id: string
                  full_name?: string | null
                  first_name?: string | null
                  email?: string | null
                }>
              ).map(row => [row.id, row]),
            )
            const toMember = (uid: string): TeamMember => {
              const pr = pById.get(uid)
              const nm =
                (pr?.full_name || '').trim() ||
                (pr?.first_name || '').trim() ||
                (pr?.email || '').split('@')[0] ||
                'Mitglied'
              return { id: uid, name: nm }
            }
            const ordered = [u.id, ...memRows.map(r => r.user_id).filter(x => x !== u.id)]
            setMembers(Array.from(new Set(ordered)).map(toMember))
          } catch {
            /* noop */
          }
        }
      } catch {
        /* noop */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return visible
    return visible.filter(p => {
      const host = projectHost(p).toLowerCase()
      return (
        p.title.toLowerCase().includes(q) ||
        host.includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      )
    })
  }, [visible, query])

  const recentItems = useMemo(() => {
    const byUpdated = [...projects].sort((a, b) => {
      const ta = new Date(a.updated_at || a.created_at || 0).getTime()
      const tb = new Date(b.updated_at || b.created_at || 0).getTime()
      return tb - ta
    })
    if (recentsTab === 'status') {
      return byUpdated.filter(p => statusKeyOf(p) === 'arbeit')
    }
    if (recentsTab === 'hints') {
      return byUpdated.filter(p => {
        const st = statusKeyOf(p)
        if (st === 'planung') return true
        const open = tasks.filter(
          t => t.project_id === p.id && !TASK_DONE_STATES.has((t.status || '').toLowerCase()),
        ).length
        return open === 0 && st !== 'erledigt'
      })
    }
    return byUpdated
  }, [projects, tasks, recentsTab])

  const recentVisible = recentItems.slice(0, recentsExpanded ? 6 : 3)

  async function logout() {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  function openFind() {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  function openToolsSheet(mode: 'filter' | 'sort') {
    setSheetMode(mode)
    setFilterOpen(true)
  }

  return (
    <div className="pmh">
      <style>{PROJECTS_MOBILE_HOME_CSS}</style>

      <div className="pmh-scroll">
        <header className="pmh-top">
          <span className="pmh-top-spacer" aria-hidden />
          <PortalWorkspacePopover
            open={wsMenuOpen}
            onOpenChange={setWsMenuOpen}
            anchorRef={wsTriggerRef}
            displayName={displayName}
            email={email}
            members={members}
            onLogout={logout}
            showExecutionPanel={showExecutionPanel}
            trigger={(
              <button
                ref={wsTriggerRef}
                type="button"
                className="pmh-app"
                aria-label="Workspace"
                aria-haspopup="menu"
                aria-expanded={wsMenuOpen}
                onClick={() => setWsMenuOpen(v => !v)}
              >
                <span className="pmh-app-mark" aria-hidden />
                <span className="pmh-app-name">{appLabel || 'Festag'}</span>
                <CaretDown size={12} weight="bold" className="pmh-app-caret" aria-hidden />
              </button>
            )}
          />
          <button
            type="button"
            className="pmh-grid"
            aria-label="Menü"
            onClick={onOpenNav}
          >
            <DotsNine size={20} weight="bold" />
          </button>
        </header>

        <div className="pmh-tools">
          <label className="pmh-search">
            <MagnifyingGlass size={16} weight="regular" className="pmh-search-icon" aria-hidden />
            <input
              className="pmh-search-input"
              type="search"
              enterKeyHint="search"
              placeholder="Projekte suchen"
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Projekte suchen"
            />
          </label>
          <button
            type="button"
            className={`pmh-icon-btn${filter !== 'all' || sort !== 'recent' ? ' has-active' : ''}${filterOpen ? ' on' : ''}`}
            aria-label="Filter"
            onClick={() => openToolsSheet('filter')}
          >
            <FunnelSimple size={17} weight="regular" />
          </button>
          <button
            type="button"
            className="pmh-icon-btn pmh-icon-btn--add"
            aria-label="Neues Projekt"
            onClick={onNewProject}
          >
            <Plus size={18} weight="bold" />
          </button>
        </div>

        <section className="pmh-recents" aria-label="Zuletzt">
          <div className="pmh-tabs" role="tablist">
            {(
              [
                { id: 'recents', label: 'Zuletzt' },
                { id: 'status', label: 'Status' },
                { id: 'hints', label: 'Hinweise' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={recentsTab === tab.id}
                className={`pmh-tab${recentsTab === tab.id ? ' on' : ''}`}
                onClick={() => {
                  setRecentsTab(tab.id)
                  setRecentsExpanded(false)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pmh-recent-list">
            {loading ? (
              <p className="pmh-recent-empty">Wird geladen…</p>
            ) : recentVisible.length === 0 ? (
              <p className="pmh-recent-empty">
                {recentsTab === 'status'
                  ? 'Keine Projekte in Arbeit.'
                  : recentsTab === 'hints'
                    ? 'Keine Hinweise.'
                    : 'Noch keine Aktivität.'}
              </p>
            ) : (
              recentVisible.map(project => {
                const st = statusKeyOf(project)
                const meta = STATUS_META[st]
                const devs = devsByProject[project.id] || []
                const avatars = devs.slice(0, 2)
                return (
                  <Link
                    key={`recent-${project.id}`}
                    href={`/project/${project.id}`}
                    className="pmh-recent-row"
                  >
                    <span className="pmh-recent-avatars" aria-hidden>
                      {avatars.length === 0 ? (
                        <span
                          className="pmh-recent-av"
                          style={{ background: logoColor(project), color: '#fff', border: 'none' }}
                        >
                          {logoLetter(project.title)}
                        </span>
                      ) : (
                        avatars.map((d, i) => {
                          const src = d.avatar_url || d.github_avatar_url
                          return (
                            <span key={d.id || i} className="pmh-recent-av">
                              {src ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={src} alt="" />
                              ) : (
                                devInitials(d)
                              )}
                            </span>
                          )
                        })
                      )}
                    </span>
                    <span className="pmh-recent-body">
                      <span className="pmh-recent-title-row">
                        <span className="pmh-recent-title">{project.title}</span>
                      </span>
                      <span className="pmh-recent-meta">
                        <span className="pmh-chip">
                          <Eye size={11} weight="regular" aria-hidden />
                          {st === 'arbeit' ? 'Aktiv' : st === 'erledigt' ? 'Fertig' : 'Planung'}
                        </span>
                        <span className="pmh-chip">
                          <span className="pmh-chip-dot" style={{ background: meta.color }} />
                          {meta.label}
                        </span>
                        <span className="pmh-chip">{relTimeShort(project.updated_at || project.created_at)}</span>
                      </span>
                    </span>
                  </Link>
                )
              })
            )}
          </div>

          {recentItems.length > 3 ? (
            <button
              type="button"
              className="pmh-expand"
              aria-label={recentsExpanded ? 'Weniger' : 'Mehr anzeigen'}
              onClick={() => setRecentsExpanded(v => !v)}
            >
              <CaretDown
                size={14}
                weight="bold"
                style={{ transform: recentsExpanded ? 'rotate(180deg)' : undefined }}
              />
            </button>
          ) : null}
        </section>

        <h2 className="pmh-section-title">Projekte</h2>

        <div className="pmh-cards">
          {loading ? (
            <p className="pmh-empty">Projekte werden geladen…</p>
          ) : searched.length === 0 ? (
            <p className="pmh-empty">
              {query.trim()
                ? 'Keine Treffer.'
                : filter === 'all'
                  ? 'Noch kein Projekt.'
                  : 'Keine Projekte in dieser Sicht.'}
            </p>
          ) : (
            searched.map(project => {
              const st = statusKeyOf(project)
              const meta = STATUS_META[st]
              const host = projectHost(project)
              const line = subLabelFor(project, tasks)
              return (
                <div key={project.id} className="pmh-card-wrap">
                  <Link href={`/project/${project.id}`} className="pmh-card">
                    <div className="pmh-card-top">
                      <span
                        className="pmh-card-logo"
                        style={{ background: logoColor(project) }}
                        aria-hidden
                      >
                        {logoLetter(project.title)}
                      </span>
                      <span className="pmh-card-identity">
                        <strong className="pmh-card-name">{project.title}</strong>
                        <span className="pmh-card-host">{host}</span>
                      </span>
                      <span className="pmh-card-aside">
                        {st !== 'erledigt' ? (
                          <span className="pmh-status-ring" title={meta.label} aria-label={meta.label}>
                            <CheckCircle size={18} weight="fill" />
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="pmh-card-more"
                          aria-label="Mehr"
                          onClick={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            onMenuOpenId(menuOpenId === `card-${project.id}` ? null : `card-${project.id}`)
                          }}
                        >
                          <DotsThree size={18} weight="bold" />
                        </button>
                      </span>
                    </div>

                    <div className="pmh-card-commit">
                      <GitBranch size={14} weight="regular" className="pmh-card-commit-icon" aria-hidden />
                      <span className="pmh-card-commit-text">{line}</span>
                    </div>

                    <div className="pmh-card-foot">
                      <span className="pmh-card-foot-left">
                        <span
                          className="pmh-chip-dot"
                          style={{ background: meta.color, width: 7, height: 7 }}
                          aria-hidden
                        />
                        <span>{meta.label}</span>
                      </span>
                      <span className="pmh-card-time">
                        {relTimeShort(project.updated_at || project.created_at)}
                      </span>
                    </div>
                  </Link>

                  {menuOpenId === `card-${project.id}` || menuOpenId === project.id ? (
                    <div className="pmh-row-menu" role="menu">
                      {[
                        ...(canOpenDevPanel
                          ? [{ label: 'Im Execution Panel öffnen', action: 'devpanel' }]
                          : []),
                        { label: 'Projekt als erledigt markieren', action: 'complete' },
                        { label: 'Projekt löschen', action: 'delete' },
                        { label: 'Projekt teilen', action: 'share' },
                        { label: 'Mitwirkende einladen', action: 'invite' },
                        { label: 'Support anfragen', action: 'support' },
                      ].map(item => (
                        <button
                          key={item.action}
                          type="button"
                          role="menuitem"
                          onClick={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            onMenuAction(project, item.action)
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="pmh-findbar" role="toolbar" aria-label="Suche und Menü">
        <button type="button" className="pmh-find-btn" onClick={openFind}>
          <MagnifyingGlass size={16} weight="regular" aria-hidden />
          Finden
        </button>
        <span className="pmh-find-sep" aria-hidden />
        <button
          type="button"
          className="pmh-find-menu"
          aria-label="Menü"
          onClick={onOpenNav}
        >
          <List size={18} weight="bold" />
        </button>
      </div>

      {filterOpen ? (
        <>
          <button
            type="button"
            className="pmh-sheet-backdrop"
            aria-label="Schließen"
            onClick={() => setFilterOpen(false)}
          />
          <div className="pmh-sheet" role="dialog" aria-label={sheetMode === 'filter' ? 'Filter' : 'Sortieren'}>
            <div className="pmh-sheet-grip" aria-hidden />
            <div className="pmh-tabs" style={{ padding: '0 0 8px' }}>
              <button
                type="button"
                className={`pmh-tab${sheetMode === 'filter' ? ' on' : ''}`}
                onClick={() => setSheetMode('filter')}
              >
                Filter
              </button>
              <button
                type="button"
                className={`pmh-tab${sheetMode === 'sort' ? ' on' : ''}`}
                onClick={() => setSheetMode('sort')}
              >
                Sortieren
              </button>
            </div>
            {sheetMode === 'filter' ? (
              <>
                <p className="pmh-sheet-title">Status</p>
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    className={`pmh-sheet-item${filter === f.id ? ' on' : ''}`}
                    onClick={() => {
                      onFilterChange(f.id)
                      setFilterOpen(false)
                    }}
                  >
                    <span>{f.label}</span>
                    {filter === f.id ? <span className="pmh-sheet-check">✓</span> : null}
                  </button>
                ))}
              </>
            ) : (
              <>
                <p className="pmh-sheet-title">Sortierung</p>
                {SORTS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={`pmh-sheet-item${sort === s.id ? ' on' : ''}`}
                    onClick={() => {
                      onSortChange(s.id)
                      setFilterOpen(false)
                    }}
                  >
                    <span>{s.label}</span>
                    {sort === s.id ? <span className="pmh-sheet-check">✓</span> : null}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
