'use client'

/**
 * /projects — neue 1:1 Figma-Umsetzung (node 198:411).
 *
 * Layout: Off-white Page-BG, weiße Card mit 24px radius, schmale Rail-
 * Sidebar links, Tagro-Round-Button unten rechts. Tabellen-Reihen mit
 * Hover-Pill, "Neu"-Badge für frische Projekte, Status-Dot mit Blur,
 * Dev-Avatar-Stack, "In Teams"-Indikator, ... Menü.
 *
 * Datenlogik (loadProjects, loadDevs, filter, sort) unverändert.
 */

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NewProjectModal from '@/components/NewProjectModal'
import RailSidebar from '@/components/RailSidebar'
import { openTagro } from '@/components/TagroOverlay'
import EmptyState from '@/components/EmptyState'
import {
  FunnelSimple, SlidersHorizontal, Plus, PencilSimple, DotsThree,
  User, UsersThree, Stack,
} from '@phosphor-icons/react'

type ProjectRow = {
  id: string
  title: string
  description?: string | null
  status?: string | null
  color?: string | null
  delivery_model?: string | null
  created_at?: string | null
  updated_at?: string | null
}
type TaskRow = {
  id: string
  project_id?: string | null
  status?: string | null
  updated_at?: string | null
}
type DevProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  github_avatar_url: string | null
  github_username: string | null
  email: string | null
}

function devInitials(d: DevProfile): string {
  return (d.full_name || d.github_username || d.email || '·')
    .replace(/^@/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2)
    .map(s => s[0]?.toUpperCase()).join('') || '·'
}
function devLabel(d: DevProfile): string {
  return d.full_name || (d.github_username ? `@${d.github_username}` : null) || d.email || 'Developer'
}

const DONE_STATES = new Set(['done', 'completed', 'erledigt', 'delivered'])
const ACTIVE_STATES = new Set(['doing', 'active', 'in_progress', 'review'])

type StatusKey = 'arbeit' | 'planung' | 'erledigt'
const STATUS_META: Record<StatusKey, { label: string; color: string }> = {
  arbeit:   { label: 'In Arbeit',  color: 'rgba(52,199,89,.9)' },   // #34C759
  planung:  { label: 'In Planung', color: 'rgba(0,122,255,.9)' },   // #007AFF
  erledigt: { label: 'Erledigt',   color: 'rgba(142,142,147,.9)' }, // #8E8E93
}
function statusKeyOf(p: ProjectRow): StatusKey {
  const raw = (p.status || 'intake').toLowerCase()
  if (DONE_STATES.has(raw)) return 'erledigt'
  if (ACTIVE_STATES.has(raw) || raw === 'testing') return 'arbeit'
  return 'planung'
}

type FilterId = 'all' | 'arbeit' | 'planung' | 'erledigt'
type SortId = 'recent' | 'name'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',      label: 'Alle' },
  { id: 'arbeit',   label: 'In Arbeit' },
  { id: 'planung',  label: 'Planung' },
  { id: 'erledigt', label: 'Erledigt' },
]
const SORTS: { id: SortId; label: string }[] = [
  { id: 'recent', label: 'Zuletzt aktualisiert' },
  { id: 'name',   label: 'Name' },
]

const FRESH_WINDOW_MS = 2 * 60 * 60 * 1000
function isFresh(createdAt?: string | null) {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < FRESH_WINDOW_MS
}
function subLabelFor(p: ProjectRow): string {
  // Aus delivery_model oder description ein kurzes Subtitel ableiten —
  // Figma zeigt "App Entwicklung" als ruhigen Untertitel.
  const map: Record<string, string> = {
    festag_delivery: 'App Entwicklung',
    assign_existing_dev: 'App Entwicklung',
    invite_new_dev: 'App Entwicklung',
    team_internal: 'Team-Projekt',
  }
  if (p.delivery_model && map[p.delivery_model]) return map[p.delivery_model]
  return p.description?.split(/[.!?\n]/)[0]?.slice(0, 32) || 'Projekt'
}
function relTime(value?: string | null): string {
  if (!value) return '—'
  try {
    const d = new Date(value)
    const today = new Date()
    const sameDay = d.toDateString() === today.toDateString()
    if (sameDay) return `Heute, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return `Gestern, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(d)
  } catch { return '—' }
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="pj-fallback">Projekte werden geladen…</div>}>
      <ProjectsPageInner />
    </Suspense>
  )
}

function ProjectsPageInner() {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [devsByProject, setDevsByProject] = useState<Record<string, DevProfile[]>>({})
  const [loading, setLoading] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const [filter, setFilter] = useState<FilterId>('all')
  const [sort, setSort] = useState<SortId>('recent')
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [activeRow, setActiveRow] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  async function loadProjects() {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) { window.location.href = '/login'; return }
    const [{ data: projectData }, { data: taskData }] = await Promise.all([
      (supabase as any).from('projects').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('tasks').select('id,project_id,status,updated_at'),
    ])
    const projs = (projectData as ProjectRow[]) ?? []
    if (projs.length === 1 && searchParams?.get('new') !== '1') {
      window.location.href = `/project/${projs[0].id}`
      return
    }
    setProjects(projs)
    setTasks((taskData as TaskRow[]) ?? [])
    setLoading(false)
    loadDevs(projs.map(p => p.id))
  }

  async function loadDevs(projectIds: string[]) {
    if (!projectIds.length) { setDevsByProject({}); return }
    const { data: assigns } = await (supabase as any)
      .from('project_assignments')
      .select('project_id,user_id,created_at')
      .in('project_id', projectIds).eq('active', true)
      .order('created_at', { ascending: true })
    const rows = (assigns ?? []) as { project_id: string; user_id: string }[]
    const userIds = Array.from(new Set(rows.map(r => r.user_id))).filter(Boolean)
    if (!userIds.length) { setDevsByProject({}); return }
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id,full_name,avatar_url,github_avatar_url,github_username,email')
      .in('id', userIds)
    const byId = new Map<string, DevProfile>(((profiles ?? []) as DevProfile[]).map(p => [p.id, p]))
    const map: Record<string, DevProfile[]> = {}
    for (const r of rows) {
      const prof = byId.get(r.user_id)
      if (!prof) continue
      ;(map[r.project_id] ||= []).push(prof)
    }
    setDevsByProject(map)
  }

  useEffect(() => {
    loadProjects()
    const channel = supabase
      .channel('client-projects-overview-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_assignments' }, () => loadProjects())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (searchParams?.get('new') === '1') setShowNewProject(true)
  }, [searchParams])

  useEffect(() => {
    if (!filterOpen && !sortOpen) return
    function onDown(e: MouseEvent) {
      if (!(e.target as HTMLElement)?.closest?.('.pj2-tool-wrap')) {
        setFilterOpen(false); setSortOpen(false)
      }
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') { setFilterOpen(false); setSortOpen(false) } }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onEsc) }
  }, [filterOpen, sortOpen])

  const visible = useMemo(() => {
    let list = projects
    if (filter !== 'all') list = list.filter(p => statusKeyOf(p) === filter)
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.title.localeCompare(b.title)
      return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
    })
  }, [projects, filter, sort])

  return (
    <div className="pj2-page">
      <style>{CSS}</style>

      <RailSidebar />

      <main className="pj2-main">
        <div className="pj2-card">
          <header className="pj2-head">
            <div className="pj2-title">
              <h1>Aktuelle Projekte.</h1>
              <p>Auf einem Blick. KI-gesteuert.</p>
            </div>
            <div className="pj2-actions">
              <div className="pj2-tool-wrap">
                <button
                  type="button"
                  className={`pj2-tool${filterOpen ? ' on' : ''}`}
                  aria-label="Filter"
                  onClick={() => { setFilterOpen(v => !v); setSortOpen(false) }}
                >
                  <FunnelSimple size={16} weight="regular" />
                </button>
                {filterOpen && (
                  <div className="pj2-menu" role="menu">
                    {FILTERS.map(f => (
                      <button key={f.id} type="button" className={filter === f.id ? 'on' : ''} onClick={() => { setFilter(f.id); setFilterOpen(false) }}>
                        <span>{f.label}</span>
                        {filter === f.id && <span className="check">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="pj2-tool-wrap">
                <button
                  type="button"
                  className={`pj2-tool${sortOpen ? ' on' : ''}`}
                  aria-label="Sortieren"
                  onClick={() => { setSortOpen(v => !v); setFilterOpen(false) }}
                >
                  <SlidersHorizontal size={16} weight="regular" />
                </button>
                {sortOpen && (
                  <div className="pj2-menu" role="menu">
                    {SORTS.map(s => (
                      <button key={s.id} type="button" className={sort === s.id ? 'on' : ''} onClick={() => { setSort(s.id); setSortOpen(false) }}>
                        <span>{s.label}</span>
                        {sort === s.id && <span className="check">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" className="pj2-cta" onClick={() => setShowNewProject(true)}>
                Neues Projekt
              </button>
            </div>
          </header>

          <div className="pj2-table">
            <div className="pj2-row pj2-thead">
              <span>Projekt</span>
              <span>Status</span>
              <span>Dev’ler</span>
              <span>Aktualisiert</span>
              <span>In Teams</span>
              <span />
            </div>
            <div className="pj2-divider" aria-hidden />

            {loading ? (
              <div className="pj2-empty">Projekte werden geladen…</div>
            ) : visible.length === 0 ? (
              filter === 'all' ? (
                <div style={{ padding: '40px 0' }}>
                  <EmptyState
                    icon={Stack}
                    kicker="Projekte"
                    title="Noch kein Projekt"
                    description="Erstelle ein Projekt, damit Tagro Roadmap und Aufgaben vorbereiten kann."
                    actions={[
                      { label: 'Projekt anlegen', icon: Plus, primary: true, onClick: () => setShowNewProject(true) },
                    ]}
                  />
                </div>
              ) : (
                <div className="pj2-empty">Keine Projekte in dieser Sicht.</div>
              )
            ) : (
              visible.map(project => {
                const st = statusKeyOf(project)
                const meta = STATUS_META[st]
                const devs = devsByProject[project.id] || []
                const isTeam = project.delivery_model === 'team_internal' || devs.length >= 2
                const isActive = activeRow === project.id
                return (
                  <Link
                    key={project.id}
                    href={`/project/${project.id}`}
                    className={`pj2-row pj2-item${isActive ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveRow(project.id)}
                    onMouseLeave={() => setActiveRow(prev => prev === project.id ? null : prev)}
                  >
                    <span className="pj2-name">
                      <span className="pj2-name-row">
                        <strong>{project.title}</strong>
                        {project.created_at && isFresh(project.created_at) && (
                          <span className="pj2-new">Neu</span>
                        )}
                      </span>
                      <small>{subLabelFor(project)}</small>
                    </span>
                    <span className="pj2-status">
                      <span className="pj2-status-dot" style={{ background: meta.color }} />
                      <span>{meta.label}</span>
                    </span>
                    <span className="pj2-devs">
                      {devs.length === 0 ? (
                        <span className="pj2-dev-empty">—</span>
                      ) : (
                        <span className="pj2-dev-stack">
                          {devs.slice(0, 3).map((d, i) => {
                            const src = d.avatar_url || d.github_avatar_url
                            return (
                              <span key={d.id} className="pj2-dev-av" style={{ zIndex: 3 - i }} title={devLabel(d)}>
                                {src ? <img src={src} alt="" /> : <span>{devInitials(d)}</span>}
                              </span>
                            )
                          })}
                          {devs.length > 3 && <span className="pj2-dev-av pj2-dev-more">+{devs.length - 3}</span>}
                        </span>
                      )}
                    </span>
                    <span className="pj2-date">{relTime(project.updated_at || project.created_at)}</span>
                    <span className="pj2-teams" aria-label={isTeam ? 'Teamprojekt' : 'Einzeldev'}>
                      {isTeam ? <UsersThree size={22} weight="thin" /> : <User size={22} weight="thin" />}
                    </span>
                    <button
                      type="button"
                      className="pj2-more"
                      aria-label="Mehr"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                    >
                      <DotsThree size={20} weight="bold" />
                    </button>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </main>

      {/* Tagro-Round-Button unten rechts — context-aware */}
      <button
        type="button"
        className="pj2-tagro"
        aria-label="Tagro öffnen"
        onClick={() => openTagro({
          contextType: 'project',
          title: 'Projekte',
          subtitle: `${visible.length} Projekt${visible.length === 1 ? '' : 'e'}`,
        })}
      >
        <PencilSimple size={20} weight="regular" />
      </button>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={() => { setShowNewProject(false); loadProjects() }}
        />
      )}
    </div>
  )
}

const CSS = `
  .pj-fallback { padding: 48px; color: #6E717E; font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif); }

  /* Page-Container ist fixiert — kein Body-Scroll. Codex-Style:
     White-on-white mit zarter Trennung Sidebar↔Content. */
  html, body { overflow: hidden !important; height: 100% !important; }

  .pj2-page {
    position: fixed; inset: 0;
    background: #FCFCFC;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    color: #0F0F10;
    color-scheme: light;
    overflow: hidden;
  }
  .pj2-page * { letter-spacing: 0; }

  .pj2-main {
    margin-left: 60px;
    height: 100%;
    padding: 18px 18px 18px 0;
    box-sizing: border-box;
    display: flex; flex-direction: column;
  }

  .pj2-card {
    flex: 1; min-height: 0;
    background: #FFFFFF;
    border-radius: 22px;
    padding: 64px 88px 48px;
    box-shadow: 0 1px 2px rgba(15,23,42,.03);
    box-sizing: border-box;
    position: relative;
    /* Nur INNEN scrollen — Page-Scroll bleibt aus */
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }
  .pj2-card::-webkit-scrollbar { display: none; }

  .pj2-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 32px;
    margin-bottom: 44px;
  }
  .pj2-title h1 {
    margin: 0;
    font-size: 28px; font-weight: 500;
    letter-spacing: -.005em;
    color: #0F0F10;
    line-height: 1.2;
  }
  .pj2-title p {
    margin: 4px 0 0;
    font-size: 16px; font-weight: 400;
    color: #9197A3;
    letter-spacing: 0;
    line-height: 1.4;
  }
  .pj2-actions {
    display: inline-flex; align-items: center; gap: 10px;
    margin-top: 6px;
  }
  .pj2-tool-wrap { position: relative; }
  .pj2-tool {
    width: 36px; height: 36px;
    border: 1px solid #ECEFF3;
    border-radius: 999px;
    background: #FFFFFF;
    color: #6E717E;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(15,23,42,.03);
    transition: background .12s, color .14s;
  }
  .pj2-tool:hover, .pj2-tool.on {
    background: #F7F8FB;
    color: #2A3032;
  }
  .pj2-cta {
    height: 36px; padding: 0 18px;
    border: 1px solid #ECEFF3;
    border-radius: 999px;
    background: #FFFFFF; color: #2A3032;
    font: inherit; font-size: 13px; font-weight: 400;
    letter-spacing: .01em;
    box-shadow: 0 1px 2px rgba(15,23,42,.03);
    cursor: pointer;
    transition: background .12s;
  }
  .pj2-cta:hover { background: #F7F8FB; }

  .pj2-menu {
    position: absolute; top: 48px; right: 0; z-index: 30;
    min-width: 220px;
    padding: 6px;
    background: #FFFFFF;
    border: 1px solid #ECEFF3;
    border-radius: 14px;
    box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 24px 60px -20px rgba(15,23,42,.24);
    animation: pj2In .18s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes pj2In { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
  .pj2-menu button {
    width: 100%; height: 36px; padding: 0 12px;
    border: 0; background: transparent;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: space-between;
    color: #2A3032;
    font: inherit; font-size: 13px; font-weight: 500;
    cursor: pointer;
    transition: background .12s;
  }
  .pj2-menu button:hover { background: #F3F5F7; }
  .pj2-menu button.on { background: #F0F2F7; color: #5B647D; }
  .pj2-menu button .check { color: #5B647D; font-size: 12px; }

  /* ===== Table ===== */
  .pj2-table { width: 100%; }
  .pj2-row {
    display: grid;
    grid-template-columns:
      minmax(220px, 1.6fr)
      minmax(140px, 1fr)
      minmax(150px, 1fr)
      minmax(120px, .9fr)
      minmax(80px, .5fr)
      48px;
    align-items: center;
    column-gap: 24px;
    padding: 0 24px;
    border-radius: 16px;
  }
  .pj2-thead {
    color: #6E717E;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 12px; font-weight: 500;
    padding-bottom: 8px;
  }
  .pj2-divider {
    height: 1px;
    background: linear-gradient(90deg,
      rgba(233,239,246,.4) 0%,
      rgb(227,232,239) 27%,
      rgb(233,239,246) 64%,
      rgba(233,239,246,.4) 100%
    );
    margin-bottom: 8px;
  }

  .pj2-item {
    position: relative;
    height: 76px;
    color: inherit;
    text-decoration: none;
    transition: background .14s;
    cursor: pointer;
  }
  .pj2-item:hover,
  .pj2-item.is-active {
    background: rgba(245,248,251,.7);
  }

  .pj2-name {
    display: flex; flex-direction: column; gap: 2px;
    min-width: 0;
  }
  .pj2-name-row { display: inline-flex; align-items: center; gap: 10px; }
  .pj2-name strong {
    font-size: 16px; font-weight: 500; color: #0F0F10;
    letter-spacing: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    max-width: 360px;
  }
  .pj2-name small {
    font-size: 13px; font-weight: 400; color: #9197A3;
    letter-spacing: 0;
  }
  .pj2-new {
    display: inline-flex; align-items: center; justify-content: center;
    height: 22px; padding: 0 8px;
    background: #FCFCFC;
    border-radius: 12px;
    color: #0F0F10;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 11px; font-weight: 500;
    letter-spacing: .01em;
    box-shadow: 0 2px 5px rgba(46,47,51,.1), inset 0 1px 1px rgba(0,0,0,.05);
  }

  .pj2-status {
    display: inline-flex; align-items: center; gap: 10px;
    color: #9197A3;
    font-size: 13px; font-weight: 400;
    letter-spacing: 0;
  }
  .pj2-status-dot {
    width: 7px; height: 7px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .pj2-devs { display: inline-flex; align-items: center; }
  .pj2-dev-empty { color: #C2C7D0; font-size: 13px; }
  .pj2-dev-stack { display: inline-flex; align-items: center; }
  .pj2-dev-av {
    width: 30px; height: 30px;
    border: 2.5px solid #FFFFFF;
    border-radius: 999px;
    margin-right: -8px;
    overflow: hidden;
    background: #F3F5F7;
    color: #5B647D;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 500;
    flex-shrink: 0;
  }
  .pj2-dev-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pj2-dev-more {
    background: #5B647D; color: #FFFFFF;
    font-size: 10px;
  }

  .pj2-date {
    color: #9197A3;
    font-size: 13px; font-weight: 400;
    letter-spacing: 0;
  }
  .pj2-teams {
    color: #2A3032;
    display: inline-flex; align-items: center; justify-content: flex-start;
  }
  .pj2-more {
    width: 32px; height: 32px;
    border: 0; border-radius: 999px;
    background: transparent;
    color: #6E717E;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .pj2-more:hover { background: rgba(91,100,125,.08); color: #2A3032; }

  .pj2-empty {
    text-align: center;
    padding: 48px 0;
    color: #90959F;
    font-size: 14px;
  }

  /* Tagro Round-Button — fix unten rechts an der Card */
  .pj2-tagro {
    position: fixed; right: 44px; bottom: 36px; z-index: 60;
    width: 52px; height: 52px;
    border: 0; border-radius: 999px;
    background: #5B647D;
    color: #FFFFFF;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
    box-shadow:
      0 1px 2px rgba(15,23,42,.1),
      0 12px 28px -10px rgba(91,100,125,.5);
    transition: transform .14s cubic-bezier(.16,1,.3,1), box-shadow .18s;
  }
  .pj2-tagro:hover {
    transform: translateY(-2px);
    background: #4E576E;
    box-shadow:
      0 1px 2px rgba(15,23,42,.1),
      0 18px 36px -10px rgba(91,100,125,.6);
  }
  .pj2-tagro:active { transform: translateY(0); }

  /* ===== Tablet / Small Desktop ===== */
  @media (max-width: 1200px) {
    .pj2-card { padding: 40px 40px 36px; }
    .pj2-head { margin-bottom: 28px; }
    .pj2-row {
      grid-template-columns:
        minmax(180px, 1.6fr)
        minmax(120px, 1fr)
        minmax(130px, .9fr)
        minmax(110px, .8fr)
        minmax(70px, .4fr)
        40px;
      column-gap: 16px;
      padding: 0 16px;
    }
  }

  /* ===== Mobile ===== */
  @media (max-width: 720px) {
    .pj2-main { margin-left: 0; padding: 12px 12px 88px 12px; }
    .pj2-card { padding: 22px 16px 28px; border-radius: 18px; }
    .pj2-head { flex-direction: column; align-items: stretch; gap: 16px; margin-bottom: 22px; }
    .pj2-title h1 { font-size: 24px; }
    .pj2-title p { font-size: 14px; }
    .pj2-actions { justify-content: flex-end; }
    .pj2-cta { font-size: 13px; padding: 0 14px; height: 34px; }
    .pj2-tool { width: 34px; height: 34px; }

    .pj2-thead { display: none; }
    .pj2-divider { display: none; }
    .pj2-row {
      grid-template-columns: 1fr auto;
      grid-template-areas:
        'name    teams'
        'status  date';
      row-gap: 6px; column-gap: 12px;
      padding: 14px 12px;
      height: auto; min-height: 78px;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(15,23,42,.04);
      margin-bottom: 10px;
    }
    .pj2-item { background: #FFFFFF; }
    .pj2-name { grid-area: name; }
    .pj2-name strong { font-size: 16px; max-width: none; }
    .pj2-status { grid-area: status; font-size: 13px; }
    .pj2-devs { display: none; }
    .pj2-date { grid-area: date; text-align: right; font-size: 13px; }
    .pj2-teams { grid-area: teams; align-self: start; }
    .pj2-more { display: none; }

    .pj2-tagro { right: 16px; bottom: 16px; width: 56px; height: 56px; }
  }
`
