'use client'

/**
 * /projects — neue 1:1 Figma-Umsetzung (node 198:411).
 *
 * Layout: Portal-Shell mit Codex-Sidebar, zentrierter Content-Spalte,
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
import { openTagro } from '@/components/TagroOverlay'
import DeleteProjectModal from '@/components/DeleteProjectModal'
import InviteLinkModal from '@/components/InviteLinkModal'
import EmptyState from '@/components/EmptyState'
import {
  FunnelSimple, ArrowsDownUp, SlidersHorizontal, Plus, PencilSimple, DotsThree,
  User, UsersThree, Stack, MagnifyingGlass, DotsNine, Copy, Check, X, Folder, CaretRight, WaveSine,
} from '@phosphor-icons/react'
import TagroContentFab from '@/components/TagroContentFab'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobileProjectPickerSheet, { type ProjectPickerMode } from '@/components/mobile/MobileProjectPickerSheet'
import ProjectsStatusBriefingSheet from '@/components/mobile/ProjectsStatusBriefingSheet'
import { FESTAG_CONTENT_HEAD_CSS } from '@/components/mobile/mobile-codex-list-styles'
import MobilePageDock from '@/components/mobile/MobilePageDock'

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
const TASK_DONE_STATES = new Set(['done', 'completed', 'erledigt', 'closed', 'cancelled'])

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
type SortId = 'recent' | 'created' | 'created_asc' | 'name' | 'name_desc' | 'status'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',      label: 'Alle' },
  { id: 'arbeit',   label: 'In Arbeit' },
  { id: 'planung',  label: 'Planung' },
  { id: 'erledigt', label: 'Erledigt' },
]
const SORTS: { id: SortId; label: string }[] = [
  { id: 'recent',       label: 'Zuletzt aktualisiert' },
  { id: 'created',      label: 'Neueste zuerst' },
  { id: 'created_asc',  label: 'Älteste zuerst' },
  { id: 'name',         label: 'Name (A–Z)' },
  { id: 'name_desc',    label: 'Name (Z–A)' },
  { id: 'status',       label: 'Status' },
]

const FRESH_WINDOW_MS = 2 * 60 * 60 * 1000
function isFresh(createdAt?: string | null) {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < FRESH_WINDOW_MS
}
function subLabelFor(p: ProjectRow, tasks: TaskRow[]): string {
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [completeTarget, setCompleteTarget] = useState<ProjectRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null)
  const [shareTarget, setShareTarget] = useState<ProjectRow | null>(null)
  const [inviteTarget, setInviteTarget] = useState<ProjectRow | null>(null)
  const [supportTarget, setSupportTarget] = useState<ProjectRow | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [supportMsg, setSupportMsg] = useState('')
  const [supportUrgency, setSupportUrgency] = useState<'normal' | 'today' | 'now'>('normal')
  const [supportSending, setSupportSending] = useState(false)
  const [supportSent, setSupportSent] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [briefingOpen, setBriefingOpen] = useState(false)
  const [briefingStale, setBriefingStale] = useState(false)
  const [dockPicker, setDockPicker] = useState<ProjectPickerMode | null>(null)
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

  function handleMenuAction(project: ProjectRow, action: string) {
    setMenuOpenId(null)
    switch (action) {
      case 'complete':  setCompleteTarget(project); break
      case 'delete':    setDeleteTarget(project); break
      case 'share':     setShareTarget(project); break
      case 'invite':    setInviteTarget(project); break
      case 'support':   setSupportTarget(project); setSupportMsg(''); setSupportUrgency('normal'); setSupportSending(false); setSupportSent(false); break
    }
  }

  async function confirmComplete() {
    if (!completeTarget) return
    await (supabase as any).from('projects')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', completeTarget.id)
    setCompleteTarget(null)
    loadProjects()
  }

  async function copyShareLink() {
    if (!shareTarget) return
    try {
      await navigator.clipboard.writeText(`https://festag.app/c/${shareTarget.id}`)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {}
  }

  async function submitSupport() {
    if (!supportTarget || !supportMsg.trim() || supportSending) return
    setSupportSending(true)
    try {
      const urgencyLabel = supportUrgency === 'now' ? '[SOFORT] ' : supportUrgency === 'today' ? '[HEUTE] ' : ''
      await fetch('/api/support/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${urgencyLabel}Projekt: ${supportTarget.title}\n\n${supportMsg.trim()}`,
          page: `/projects (Projekt: ${supportTarget.id})`,
        }),
      })
      setSupportSent(true)
      setTimeout(() => { setSupportTarget(null); setSupportSent(false) }, 1800)
    } catch {}
    setSupportSending(false)
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
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 768px)').matches) return
    const el = document.querySelector('.pj2-scroll-body')
    if (el instanceof HTMLElement) el.scrollTop = 0
  }, [])

  useEffect(() => {
    if (!filterOpen && !sortOpen && !menuOpenId) return
    function onDown(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (!t?.closest?.('.pj2-tool-wrap')) { setFilterOpen(false); setSortOpen(false) }
      if (!t?.closest?.('.pj2-more-wrap')) setMenuOpenId(null)
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') { setFilterOpen(false); setSortOpen(false); setMenuOpenId(null) } }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onEsc) }
  }, [filterOpen, sortOpen, menuOpenId])

  useEffect(() => {
    if (!briefingOpen) return
    const markStale = () => setBriefingStale(true)
    const channel = supabase
      .channel('projects-briefing-signals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'developer_updates' }, markStale)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_updates' }, markStale)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status_reports' }, markStale)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [briefingOpen, supabase])

  function openBriefingSheet() {
    setBriefingStale(false)
    setBriefingOpen(true)
  }

  const visible = useMemo(() => {
    let list = projects
    if (filter !== 'all') list = list.filter(p => statusKeyOf(p) === filter)
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.title.localeCompare(b.title, 'de')
        case 'name_desc':
          return b.title.localeCompare(a.title, 'de')
        case 'created':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        case 'created_asc':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        case 'status': {
          const order: Record<StatusKey, number> = { arbeit: 0, planung: 1, erledigt: 2 }
          const byStatus = order[statusKeyOf(a)] - order[statusKeyOf(b)]
          if (byStatus !== 0) return byStatus
          return a.title.localeCompare(b.title, 'de')
        }
        case 'recent':
        default:
          return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
      }
    })
  }, [projects, filter, sort])

  const statusCounts = useMemo(() => ({
    arbeit: projects.filter(p => statusKeyOf(p) === 'arbeit').length,
    planung: projects.filter(p => statusKeyOf(p) === 'planung').length,
    erledigt: projects.filter(p => statusKeyOf(p) === 'erledigt').length,
  }), [projects])

  const tagroContext = {
    contextType: 'project' as const,
    id: 'list',
    title: 'Projekte · Übersicht',
    subtitle: `${visible.length} sichtbar · ${statusCounts.arbeit} in Arbeit`,
  }

  const tagroHandler = () => openTagro(tagroContext)

  function handlePickTagro(projectId: string | null, title: string) {
    setDockPicker(null)
    if (projectId) {
      openTagro({ contextType: 'project', id: projectId, title, projectId })
      return
    }
    openTagro({ contextType: 'empty', id: 'all', title: 'Alle Projekte', subtitle: 'Gesamtbericht' })
  }

  const pickerProjects = useMemo(
    () => projects.map(p => ({ id: p.id, title: p.title, color: p.color, status: p.status })),
    [projects],
  )

  return (
    <div className="pj2-page">
      <style>{CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="pj2-shell">
        <div className="pj2-static-top">
          <header className="pj2-page-head">
            <div className="pj2-page-head-copy">
              <h1 className="pj2-page-title">
                <span className="pj2-dt">Projekte</span>
                <span className="pjm-t">Was steht an?</span>
              </h1>
              <div className="pj2-page-lead pj2-dt">
                <p className="pj2-page-lead-line">Alle Projekte auf einem Blick. KI-gesteuert.</p>
              </div>
            </div>
            <div className="pjm-head-actions">
              <CodexMobileActionPill
                onMenu={() => setNavOpen(true)}
                onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              />
            </div>
            <div className="pj2-page-actions pj2-dt">
              <div className="pj2-page-actions-group">
                <div className="pj2-filter-wrap pj2-tool-wrap">
                  <button
                    type="button"
                    className={`pj2-head-tool${filterOpen || filter !== 'all' ? ' on' : ''}`}
                    aria-label="Filter"
                    aria-expanded={filterOpen}
                    onClick={() => { setFilterOpen(v => !v); setSortOpen(false) }}
                  >
                    <FunnelSimple size={15} weight="regular" />
                  </button>
                  {filterOpen && (
                    <div className="pj2-filter-menu" role="menu" aria-label="Filter">
                      <p className="pj2-filter-menu-label">Status</p>
                      {FILTERS.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          role="menuitem"
                          className={`pj2-filter-menu-item${filter === f.id ? ' on' : ''}`}
                          onClick={() => { setFilter(f.id); setFilterOpen(false) }}
                        >
                          <span>{f.label}</span>
                          {filter === f.id && <span className="pj2-filter-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="pj2-filter-wrap pj2-tool-wrap">
                  <button
                    type="button"
                    className={`pj2-head-tool${sortOpen || sort !== 'recent' ? ' on' : ''}`}
                    aria-label="Sortieren"
                    aria-expanded={sortOpen}
                    onClick={() => { setSortOpen(v => !v); setFilterOpen(false) }}
                  >
                    <ArrowsDownUp size={15} weight="regular" />
                  </button>
                  {sortOpen && (
                    <div className="pj2-filter-menu" role="menu" aria-label="Sortieren">
                      <p className="pj2-filter-menu-label">Sortierung</p>
                      {SORTS.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          role="menuitem"
                          className={`pj2-filter-menu-item${sort === s.id ? ' on' : ''}`}
                          onClick={() => { setSort(s.id); setSortOpen(false) }}
                        >
                          <span>{s.label}</span>
                          {sort === s.id && <span className="pj2-filter-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button type="button" className="pj2-head-new" onClick={() => setShowNewProject(true)}>
                Neues Projekt
              </button>
            </div>
          </header>

          {/* Mobile actions — primary +, filter | sort in split pill */}
          <div className="pjm-actions">
            <button type="button" className="pjm-add-btn" aria-label="Neues Projekt" onClick={() => setShowNewProject(true)}>
              <Plus size={18} weight="bold" />
            </button>
            <div className="pjm-actions-group">
              <button
                type="button"
                className={`pjm-ctl${briefingOpen ? ' on' : ''}`}
                aria-label="Statusbericht"
                onClick={openBriefingSheet}
              >
                <WaveSine size={17} weight="regular" />
              </button>
              <div className="pj2-tool-wrap">
                <button
                  type="button"
                  className={`pjm-ctl${filterOpen ? ' on' : ''}${filter !== 'all' ? ' has-active' : ''}`}
                  aria-label="Filter"
                  onClick={() => { setFilterOpen(v => !v); setSortOpen(false) }}
                >
                  <FunnelSimple size={17} weight="regular" />
                </button>
                {filterOpen && (
                  <div className="pj2-menu" role="menu">
                    <p className="pjm-sheet-title">Filtern</p>
                    {FILTERS.map(f => (
                      <button key={f.id} type="button" className={`pj2-menu-item${filter === f.id ? ' on' : ''}`} onClick={() => { setFilter(f.id); setFilterOpen(false) }}>
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
                  className={`pjm-ctl${sortOpen ? ' on' : ''}${sort !== 'recent' ? ' has-active' : ''}`}
                  aria-label="Sortieren"
                  onClick={() => { setSortOpen(v => !v); setFilterOpen(false) }}
                >
                  <SlidersHorizontal size={17} weight="regular" />
                </button>
                {sortOpen && (
                  <div className="pj2-menu" role="menu">
                    <p className="pjm-sheet-title">Sortieren</p>
                    {SORTS.map(s => (
                      <button key={s.id} type="button" className={`pj2-menu-item${sort === s.id ? ' on' : ''}`} onClick={() => { setSort(s.id); setSortOpen(false) }}>
                        <span>{s.label}</span>
                        {sort === s.id && <span className="check">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {(filterOpen || sortOpen) && (
            <button
              type="button"
              className="pjm-sheet-backdrop"
              aria-label="Schließen"
              onClick={() => { setFilterOpen(false); setSortOpen(false) }}
            />
          )}
        </div>

        <div className="pj2-scroll-body">
          <h2 className="pjm-section">Projekte</h2>

          <div className="pj2-table">
            <div className="pj2-row pj2-thead">
              <span>Projekt</span>
              <span>Status</span>
              <span>Dev'ler</span>
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
                return (
                  <Link
                    key={project.id}
                    href={`/project/${project.id}`}
                    className="pj2-row pj2-item"
                  >
                    {/* Left: name + status (desktop grid cells + mobile left block) */}
                    <span className="pj2-left">
                      <span className="pjm-folder" aria-hidden><Folder size={18} weight="regular" /></span>
                      <span className="pj2-name">
                        <span className="pj2-name-row">
                          <strong>{project.title}</strong>
                          {project.created_at && isFresh(project.created_at) && (
                            <span className="pj2-new">Neu</span>
                          )}
                        </span>
                        <small>{subLabelFor(project, tasks)}</small>
                      </span>
                      <span className="pj2-status-cell">
                        {st === 'erledigt' ? (
                          <span className="pj2-status-pill">{meta.label}</span>
                        ) : (
                          <span className="pj2-status">
                            <span className="pj2-status-dot" style={{ background: meta.color }} />
                            <span>{meta.label}</span>
                          </span>
                        )}
                      </span>
                    </span>
                    {/* Right: devs + date (desktop grid cells + mobile right block) */}
                    <span className="pj2-right">
                      <span className="pj2-devs">
                        {devs.length === 0 ? (
                          <>
                            <span className="pj2-dev-empty">—</span>
                            <span className="pj2-dev-stack pj2-dev-placeholder">
                              <span className="pj2-dev-av" style={{ zIndex: 2, background: '#D4D6DB' }} />
                              <span className="pj2-dev-av" style={{ zIndex: 1, background: '#E8E9EC' }} />
                            </span>
                          </>
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
                      <span className="pjm-chevron" aria-hidden><CaretRight size={14} weight="bold" /></span>
                    </span>
                    <span className="pj2-teams" aria-label={isTeam ? 'Teamprojekt' : 'Einzeldev'}>
                      {isTeam ? (
                        <UsersThree size={17} weight="regular" aria-hidden />
                      ) : (
                        <User size={17} weight="regular" aria-hidden />
                      )}
                    </span>
                    <div className="pj2-more-wrap">
                      <button
                        type="button"
                        className="pj2-more"
                        aria-label="Mehr"
                        onClick={(e) => {
                          e.preventDefault(); e.stopPropagation()
                          setMenuOpenId(prev => prev === project.id ? null : project.id)
                        }}
                      >
                        <DotsThree size={20} weight="bold" />
                      </button>
                      {menuOpenId === project.id && (
                        <div className="pj2-row-menu" role="menu">
                          {[
                            { label: 'Projekt als erledigt markieren', action: 'complete' },
                            { label: 'Projekt löschen', action: 'delete' },
                            { label: 'Projekt teilen', action: 'share' },
                            { label: 'Mitwirkende einladen', action: 'invite' },
                            { label: 'Support anfragen', action: 'support' },
                          ].map(item => (
                            <button
                              key={item.action}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault(); e.stopPropagation()
                                handleMenuAction(project, item.action)
                              }}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div className="pj2-fab-desktop">
        <TagroContentFab position="fixed" context={tagroContext} />
      </div>

      <MobilePageDock
        onDragUp={() => setShowNewProject(true)}
        primary={{
          id: 'new-project',
          label: 'Neues Projekt...',
          icon: <Plus size={14} weight="bold" />,
          onClick: () => setShowNewProject(true),
          ariaLabel: 'Neues Projekt',
        }}
        secondary={{
          id: 'tagro',
          icon: <PencilSimple size={20} weight="regular" />,
          onClick: () => setDockPicker('tagro'),
          ariaLabel: 'Mit Tagro bearbeiten',
        }}
      />

      <ProjectsStatusBriefingSheet
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
        projects={projects}
        tasks={tasks}
        stale={briefingStale}
      />

      <MobileProjectPickerSheet
        mode={dockPicker === 'tagro' ? 'tagro' : null}
        projects={pickerProjects}
        loading={loading}
        onClose={() => setDockPicker(null)}
        onPickStatus={() => {}}
        onPickTagro={handlePickTagro}
      />

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={() => { setShowNewProject(false); loadProjects() }}
        />
      )}

      {/* Complete confirm */}
      {completeTarget && (
        <div className="pj2-overlay" onClick={() => setCompleteTarget(null)}>
          <div className="pj2-confirm-card" onClick={e => e.stopPropagation()}>
            <h2 className="pj2-confirm-title">{completeTarget.title} als erledigt markieren?</h2>
            <p className="pj2-confirm-text">Tagro wird das Projekt aus deinen aktiven Übersichten ausblenden und einen Abschluss-Bericht für die Beteiligten anfragen.</p>
            <div className="pj2-confirm-actions">
              <button type="button" className="pj2-confirm-ghost" onClick={() => setCompleteTarget(null)}>Abbrechen</button>
              <button type="button" className="pj2-confirm-primary" onClick={confirmComplete}>Erledigt markieren</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      <DeleteProjectModal
        open={!!deleteTarget}
        projectId={deleteTarget?.id ?? null}
        projectTitle={deleteTarget?.title ?? ''}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); loadProjects() }}
      />

      {/* Share */}
      {shareTarget && (
        <div className="pj2-overlay" onClick={() => { setShareTarget(null); setShareCopied(false) }}>
          <div className="pj2-confirm-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 className="pj2-confirm-title" style={{ margin: 0 }}>Projekt teilen</h2>
              <button type="button" className="pj2-confirm-ghost" style={{ padding: '4px 8px' }} onClick={() => { setShareTarget(null); setShareCopied(false) }}>
                <X size={16} weight="regular" />
              </button>
            </div>
            <div className="pj2-share-link-row">
              <input
                className="pj2-share-link-input"
                readOnly
                value={`https://festag.app/c/${shareTarget.id}`}
                onFocus={e => e.currentTarget.select()}
              />
              <button type="button" className="pj2-share-copy-btn" onClick={copyShareLink}>
                {shareCopied ? <><Check size={14} weight="bold" /> Kopiert!</> : <><Copy size={14} /> Kopieren</>}
              </button>
            </div>
            <p className="pj2-confirm-text" style={{ marginTop: 14 }}>Teile diesen Link mit Personen, die einen ruhigen Überblick zum Projekt erhalten sollen. Du kannst den Zugriff jederzeit wieder schließen.</p>
          </div>
        </div>
      )}

      {/* Invite */}
      <InviteLinkModal
        open={!!inviteTarget}
        onClose={() => setInviteTarget(null)}
        defaultProjectId={inviteTarget?.id ?? null}
        projects={projects.map(p => ({ id: p.id, title: p.title, color: p.color }))}
      />

      {/* Support */}
      {supportTarget && (
        <div className="pj2-overlay" onClick={() => setSupportTarget(null)}>
          <div className="pj2-confirm-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 className="pj2-confirm-title" style={{ margin: 0 }}>Support für {supportTarget.title}</h2>
              <button type="button" className="pj2-confirm-ghost" style={{ padding: '4px 8px' }} onClick={() => setSupportTarget(null)}>
                <X size={16} weight="regular" />
              </button>
            </div>
            {supportSent ? (
              <p className="pj2-confirm-text" style={{ textAlign: 'center', padding: '20px 0' }}>Tagro hat deine Anfrage erhalten.</p>
            ) : (
              <>
                <textarea
                  className="pj2-support-textarea"
                  placeholder="Was beschäftigt dich? Tagro reicht das mit Projekt-Kontext an unser Team weiter."
                  value={supportMsg}
                  onChange={e => setSupportMsg(e.target.value)}
                  autoFocus
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <select
                    className="pj2-support-urgency"
                    value={supportUrgency}
                    onChange={e => setSupportUrgency(e.target.value as any)}
                  >
                    <option value="normal">Normal</option>
                    <option value="today">Heute</option>
                    <option value="now">Sofort</option>
                  </select>
                  <div style={{ flex: 1 }} />
                  <button type="button" className="pj2-confirm-ghost" onClick={() => setSupportTarget(null)}>Abbrechen</button>
                  <button type="button" className="pj2-confirm-primary" onClick={submitSupport} disabled={!supportMsg.trim() || supportSending}>
                    {supportSending ? 'Sende…' : 'Absenden'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

const CSS = `
${FESTAG_CONTENT_HEAD_CSS}
  .pj-fallback { padding: 48px; color: #6E717E; font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif); }

  /* ── Mobile-only / Desktop-only visibility ── */
  .pjm-t { display: none; }
  .pjm-header-icons { display: none; }
  .pjm-head-actions { display: none; }
  .pjm-section { display: none; }
  .pjm-folder { display: none; }
  .pjm-chevron { display: none; }
  .pjm-status-dot { display: none; }
  .pjm-actions { display: none; }
  .pjm-sheet-backdrop { display: none; }
  .pjm-icon-sep { display: none; }

    .pj2-page {
      --pj-soft: var(--portal-muted, #8f93a4);
      --pj-dark: var(--portal-text, #0f0f10);
      --pj-card-bg: var(--portal-card, #fff);
      width: 100%;
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: transparent;
      font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
      color: var(--pj-dark);
      color-scheme: light;
      overflow: hidden;
      letter-spacing: 0;
    }
    [data-theme="dark"] .pj2-page,
    [data-theme="classic-dark"] .pj2-page {
      --pj-soft: var(--portal-muted, #9aa0ac);
      --pj-dark: var(--portal-text, #f4f4f4);
      --pj-card-bg: transparent;
      --pj-row-hover-bg: rgba(255, 255, 255, 0.045);
      color-scheme: dark;
    }

  .pj2-shell {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
  }
  .pj2-static-top,
  .pj2-scroll-body { position: relative; z-index: 1; }

  .pj2-static-top {
    flex: 0 0 auto;
    position: sticky;
    top: 0;
    z-index: 8;
    background: transparent;
    width: 100%;
    max-width: var(--festag-content-max, 1080px);
    margin: 0 auto;
    padding: clamp(64px, 7vh, 88px) var(--festag-content-pad-x, 56px) 0;
    box-sizing: border-box;
  }
  .pj2-static-top::after {
    display: none;
  }

  .pj2-scroll-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    width: 100%;
    max-width: var(--festag-content-max, 1080px);
    margin: 0 auto;
    padding: 28px var(--festag-content-pad-x, 56px) var(--festag-content-pad-bottom, 88px);
    box-sizing: border-box;
    overscroll-behavior: contain;
    scrollbar-width: none;
  }
  .pj2-scroll-body::-webkit-scrollbar { display: none; }

  .pj2-page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 28px;
  }
  .pj2-page-head-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .pj2-page-title {
    color: var(--pj-dark);
  }
  .pj2-m-subline {
    margin: 0;
    display: none;
  }
  .pj2-page-lead {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 680px;
  }
  .pj2-page-lead-line {
    color: var(--pj-soft);
  }
  .pj2-page-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 6px;
  }
  .pj2-page-actions-group {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .pj2-filter-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .pj2-head-tool {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    padding: 0;
    flex-shrink: 0;
    box-sizing: border-box;
    border: 1px solid rgba(15,23,42,.09);
    border-radius: 50%;
    background: #fff;
    color: #6e717e;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,1),
      0 1px 0 rgba(15,23,42,.03),
      0 2px 5px -1px rgba(15,23,42,.11),
      0 5px 12px -4px rgba(15,23,42,.09);
    transition: background .12s, box-shadow .12s, color .12s, transform .1s, border-color .12s;
  }
  .pj2-head-tool svg { width: 15px; height: 15px; flex-shrink: 0; }
  .pj2-head-tool:hover {
    color: #2a3032;
    background: #fafafa;
    border-color: rgba(15,23,42,.11);
  }
  .pj2-head-tool:active { transform: translateY(1px); }
  .pj2-head-tool.on {
    color: var(--pj-dark);
    border-color: color-mix(in srgb, var(--portal-btn-primary, #5b647d) 35%, transparent);
    background: color-mix(in srgb, var(--portal-btn-primary, #5b647d) 8%, #fff);
  }
  [data-theme="dark"] .pj2-head-tool,
  [data-theme="classic-dark"] .pj2-head-tool {
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.10);
    color: #9aa0ac;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.07),
      0 2px 6px -2px rgba(0,0,0,.28),
      0 6px 14px -6px rgba(0,0,0,.24);
  }
  [data-theme="dark"] .pj2-head-tool:hover,
  [data-theme="classic-dark"] .pj2-head-tool:hover {
    background: rgba(255,255,255,.09);
    color: #f4f4f4;
    border-color: rgba(255,255,255,.14);
  }
  [data-theme="dark"] .pj2-head-tool.on,
  [data-theme="classic-dark"] .pj2-head-tool.on {
    color: #f4f4f4;
    background: rgba(255,255,255,.1);
    border-color: rgba(255,255,255,.16);
  }
  .pj2-head-new {
    height: 32px;
    padding: 0 14px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 999px;
    background: #fff;
    color: var(--pj-dark, #0f0f10);
    font: inherit;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: none;
    transition: background .12s, border-color .12s;
  }
  .pj2-head-new:hover {
    background: #fafafa;
    border-color: rgba(15, 23, 42, 0.16);
  }
  [data-theme="dark"] .pj2-head-new,
  [data-theme="classic-dark"] .pj2-head-new {
    background: #fff;
    color: #121214;
    border-color: transparent;
  }

  .pj2-filter-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 30;
    min-width: 220px;
    width: max-content;
    max-width: min(280px, 90vw);
    padding: 4px;
    border-radius: 10px;
    border: 1px solid rgba(15,23,42,.08);
    background: var(--portal-card, #fff);
    box-shadow:
      0 4px 14px rgba(15,23,42,.07),
      0 16px 36px -12px rgba(15,23,42,.14);
    display: flex;
    flex-direction: column;
    gap: 1px;
    animation: pj2MenuIn .16s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes pj2MenuIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: none; }
  }
  [data-theme="dark"] .pj2-filter-menu,
  [data-theme="classic-dark"] .pj2-filter-menu {
    background: var(--portal-card, #141416);
    border-color: rgba(255,255,255,.1);
    box-shadow: 0 16px 40px -12px rgba(0,0,0,.45);
  }
  .pj2-filter-menu-label {
    margin: 6px 10px 4px;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--pj-soft);
  }
  .pj2-filter-menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    min-height: 36px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px !important;
    background: transparent;
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    color: var(--pj-dark);
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
    transition: background .12s ease;
  }
  .pj2-filter-menu-item:hover { background: rgba(15,23,42,.04); }
  .pj2-filter-menu-item.on { background: rgba(15,23,42,.055); }
  .pj2-filter-check { font-size: 13px; color: var(--pj-soft); flex-shrink: 0; }
  [data-theme="dark"] .pj2-filter-menu-item:hover,
  [data-theme="classic-dark"] .pj2-filter-menu-item:hover {
    background: rgba(255,255,255,.06);
  }
  [data-theme="dark"] .pj2-filter-menu-item.on,
  [data-theme="classic-dark"] .pj2-filter-menu-item.on {
    background: rgba(255,255,255,.08);
  }

  .pj2-fab-desktop { display: block; }

  .pj2-tool-wrap { position: relative; }

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
  .pj2-menu button,
  .pj2-menu-item {
    width: 100%; height: 36px; padding: 0 12px;
    border: 0; background: transparent;
    border-radius: 6px !important;
    display: flex; align-items: center; justify-content: space-between;
    color: #0F0F10;
    font: inherit; font-size: 13px; font-weight: 400;
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .pj2-menu button:hover,
  .pj2-menu-item:hover { background: rgba(0,0,0,.04); color: #0F0F10; }
  .pj2-menu button.on,
  .pj2-menu-item.on { background: rgba(0,0,0,.055); color: #0F0F10; }
  .pj2-menu button:active,
  .pj2-menu-item:active { background: rgba(0,0,0,.07); }
  .pj2-menu button .check,
  .pj2-menu-item .check { color: #0F0F10; font-size: 13px; }

  .pj2-table {
    width: 100%;
    box-sizing: border-box;
    padding: 0;
    --pj-row-inset-x: 20px;
  }
  .pj2-left { display: contents; }
  .pj2-right { display: contents; }
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
    padding: 0 var(--pj-row-inset-x, 20px);
    border-radius: 12px;
  }
  .pj2-thead {
    color: var(--pj-soft, #5B647D);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 12px; font-weight: 500;
    letter-spacing: 0.32px;
    padding-bottom: 12px;
  }
  .pj2-divider {
    height: 0.5px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(233,239,246,0.45) 14%,
      rgb(227,232,239) 50%,
      rgba(233,239,246,0.45) 86%,
      transparent 100%
    );
    margin-bottom: 6px;
  }
  [data-theme="dark"] .pj2-divider,
  [data-theme="classic-dark"] .pj2-divider {
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.035) 14%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.035) 86%,
      transparent 100%
    );
  }

  .pj2-item {
    position: relative;
    height: 90px;
    color: inherit;
    text-decoration: none;
    border: 1px solid transparent;
    transition:
      background .18s ease,
      box-shadow .18s ease,
      border-color .18s ease,
      transform .18s ease,
      backdrop-filter .18s ease;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  @media (hover: hover) {
    .pj2-item:hover {
      background: rgba(15, 23, 42, 0.04);
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      border-color: transparent;
      border-radius: 12px;
      box-shadow: none;
      transform: none;
    }
  }
  .pj2-item:focus-visible {
    outline: 2px solid color-mix(in srgb, #5B647D 45%, transparent);
    outline-offset: 2px;
    border-radius: 16px;
  }
  [data-theme="dark"] .pj2-static-top,
  [data-theme="classic-dark"] .pj2-static-top {
    background: transparent;
  }
  @media (hover: hover) {
    [data-theme="dark"] .pj2-item:hover,
    [data-theme="classic-dark"] .pj2-item:hover {
      background: var(--pj-row-hover-bg);
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      border-color: transparent;
      border-radius: 12px;
      box-shadow: none;
      transform: none;
    }
  }
  [data-theme="dark"] .pj2-dev-av,
  [data-theme="classic-dark"] .pj2-dev-av {
    border-color: var(--portal-card, #141416);
    background: rgba(255, 255, 255, 0.08);
    color: var(--pj-soft);
  }
  [data-theme="dark"] .pj2-more,
  [data-theme="classic-dark"] .pj2-more {
    color: var(--pj-soft);
  }
  [data-theme="dark"] .pj2-more:hover,
  [data-theme="classic-dark"] .pj2-more:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--pj-dark);
  }
  [data-theme="dark"] .pj2-menu,
  [data-theme="classic-dark"] .pj2-menu,
  [data-theme="dark"] .pj2-row-menu,
  [data-theme="classic-dark"] .pj2-row-menu {
    background: var(--portal-card, #141416);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.45);
  }
  [data-theme="dark"] .pj2-menu button,
  [data-theme="classic-dark"] .pj2-menu button,
  [data-theme="dark"] .pj2-menu-item,
  [data-theme="classic-dark"] .pj2-menu-item,
  [data-theme="dark"] .pj2-row-menu button,
  [data-theme="classic-dark"] .pj2-row-menu button {
    color: var(--pj-dark);
  }
  [data-theme="dark"] .pj2-menu button:hover,
  [data-theme="classic-dark"] .pj2-menu button:hover,
  [data-theme="dark"] .pj2-menu-item:hover,
  [data-theme="classic-dark"] .pj2-menu-item:hover,
  [data-theme="dark"] .pj2-row-menu button:hover,
  [data-theme="classic-dark"] .pj2-row-menu button:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--pj-dark);
  }
  [data-theme="dark"] .pj2-menu button.on,
  [data-theme="classic-dark"] .pj2-menu button.on,
  [data-theme="dark"] .pj2-menu-item.on,
  [data-theme="classic-dark"] .pj2-menu-item.on {
    background: rgba(255, 255, 255, 0.08);
    color: var(--pj-dark);
  }
  [data-theme="dark"] .pj2-menu button .check,
  [data-theme="classic-dark"] .pj2-menu button .check,
  [data-theme="dark"] .pj2-menu-item .check,
  [data-theme="classic-dark"] .pj2-menu-item .check {
    color: var(--pj-soft);
  }

  .pj2-name {
    display: flex; flex-direction: column; gap: 4px;
    min-width: 0;
  }
  .pj2-name-row { display: inline-flex; align-items: center; gap: 10px; }
  .pj2-name strong {
    font-size: 18px; font-weight: 400; color: var(--pj-dark, #0F0F10);
    letter-spacing: 0.36px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    max-width: 360px;
  }
  .pj2-name small {
    font-size: 14px; font-weight: 400; color: var(--pj-soft, #6E717E);
    letter-spacing: 0.14px;
  }
  .pj2-new {
    display: inline-flex; align-items: center; justify-content: center;
    height: 22px; padding: 0 8px;
    background: #FCFCFC;
    border-radius: 12px;
    color: #000000;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 11px; font-weight: 500;
    letter-spacing: 0.11px;
    box-shadow: 0 2px 5px 1px rgba(46,47,51,0.1), inset 0 1px 1px rgba(0,0,0,0.05);
  }

  .pj2-status {
    display: inline-flex; align-items: center; gap: 12px;
    color: var(--pj-soft, #6E717E);
    font-size: 14px; font-weight: 400;
    letter-spacing: 0.28px;
  }
  .pj2-status-dot {
    width: 6px; height: 6px;
    border-radius: 32px;
    flex-shrink: 0;
    filter: blur(2px);
  }
  .pj2-status-pill {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.02em;
    color: var(--pj-soft, #6E717E);
    background: rgba(142, 142, 147, 0.14);
  }
  [data-theme="dark"] .pj2-status-pill,
  [data-theme="classic-dark"] .pj2-status-pill {
    background: rgba(255, 255, 255, 0.08);
    color: var(--pj-soft);
  }

  .pj2-devs { display: inline-flex; align-items: center; }
  .pj2-dev-empty { color: #C2C7D0; font-size: 14px; }
  .pj2-dev-placeholder { display: none; }
  .pj2-dev-stack { display: inline-flex; align-items: center; }
  .pj2-dev-av {
    width: 40px; height: 40px;
    border: 3px solid #FFFFFF;
    border-radius: 999px;
    margin-right: -12px;
    overflow: hidden;
    background: #F3F5F7;
    color: #5B647D;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 500;
    flex-shrink: 0;
  }
  .pj2-dev-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pj2-dev-more {
    background: #5B647D; color: #FFFFFF;
    font-size: 10px;
  }

  .pj2-date {
    color: var(--pj-soft, #6E717E);
    font-size: 14px; font-weight: 400;
    letter-spacing: 0.14px;
  }
  .pj2-teams {
    color: var(--pj-soft, #6E717E);
    display: inline-flex; align-items: center; justify-content: flex-start;
  }
  .pj2-teams svg {
    flex-shrink: 0;
  }
  .pj2-more-wrap { position: relative; }
  .pj2-more {
    width: 32px; height: 32px;
    border: 0; border-radius: 999px !important;
    background: transparent;
    color: #6E717E;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .pj2-more:hover { background: rgba(91,100,125,.08); color: #2A3032; }

  .pj2-row-menu {
    position: absolute; top: 36px; right: 0; z-index: 40;
    min-width: 240px;
    padding: 6px;
    background: #FFFFFF;
    border: 1px solid #ECEFF3;
    border-radius: 14px;
    box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 24px 60px -20px rgba(15,23,42,.24);
    animation: pj2In .18s cubic-bezier(.16,1,.3,1) both;
  }
  .pj2-row-menu button {
    width: 100%; height: 36px; padding: 0 12px;
    border: 0; background: transparent;
    border-radius: 8px;
    display: flex; align-items: center;
    color: #2A3032;
    font: inherit; font-size: 13px; font-weight: 400;
    cursor: pointer;
    transition: background .12s;
    text-align: left;
  }
  .pj2-row-menu button:hover { background: #F3F5F7; }

  .pj2-empty {
    text-align: center;
    padding: 48px 0;
    color: var(--pj-soft);
    font-size: 14px;
  }

  /* ── Confirm / Share / Support modals ── */
  .pj2-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(15,23,42,0.25);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    animation: pj2FadeIn .18s ease both;
  }
  @keyframes pj2FadeIn { from { opacity: 0; } to { opacity: 1; } }
  .pj2-confirm-card {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 28px 32px;
    max-width: 440px;
    width: 90%;
    box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    animation: pj2In .18s cubic-bezier(.16,1,.3,1) both;
  }
  .pj2-confirm-title {
    margin: 0 0 10px;
    font-size: 17px; font-weight: 500;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    letter-spacing: 0.01em;
    color: #0F0F10;
  }
  .pj2-confirm-text {
    margin: 0;
    font-size: 14px; font-weight: 400;
    color: #6E717E;
    line-height: 1.55;
    letter-spacing: 0.01em;
  }
  .pj2-confirm-actions {
    display: flex; align-items: center; justify-content: flex-end;
    gap: 10px;
    margin-top: 22px;
  }
  .pj2-confirm-ghost {
    height: 36px; padding: 0 16px;
    border: 0; border-radius: 8px;
    background: transparent;
    color: #6E717E;
    font: inherit; font-size: 14px; font-weight: 400;
    cursor: pointer;
    transition: background .12s;
  }
  .pj2-confirm-ghost:hover { background: #F3F5F7; }
  .pj2-confirm-primary {
    height: 36px; padding: 0 20px;
    border: 0; border-radius: 8px;
    background: #5B647D;
    color: #FFFFFF;
    font: inherit; font-size: 14px; font-weight: 500;
    cursor: pointer;
    transition: background .12s;
  }
  .pj2-confirm-primary:hover { background: #4E576E; }
  .pj2-confirm-primary:disabled { opacity: .5; cursor: not-allowed; }

  .pj2-share-link-row {
    display: flex; align-items: center; gap: 8px;
  }
  .pj2-share-link-input {
    flex: 1; min-width: 0;
    padding: 10px 12px;
    background: #F8F9FA;
    border: 1px solid #ECEFF3;
    border-radius: 8px;
    font: inherit; font-size: 13px;
    color: #6E717E;
    outline: none;
  }
  .pj2-share-copy-btn {
    flex-shrink: 0;
    display: inline-flex; align-items: center; gap: 6px;
    height: 38px; padding: 0 14px;
    border: 1px solid #ECEFF3;
    border-radius: 8px;
    background: #FFFFFF;
    color: #2A3032;
    font: inherit; font-size: 13px; font-weight: 500;
    cursor: pointer;
    transition: background .12s;
  }
  .pj2-share-copy-btn:hover { background: #F3F5F7; }

  .pj2-support-textarea {
    width: 100%; min-height: 100px;
    padding: 12px;
    background: #F8F9FA;
    border: 1px solid #ECEFF3;
    border-radius: 10px;
    font: inherit; font-size: 14px;
    color: #2A3032;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
    transition: border-color .14s;
  }
  .pj2-support-textarea:focus { border-color: #5B647D; }
  .pj2-support-textarea::placeholder { color: #ADB3BD; }
  .pj2-support-urgency {
    height: 34px; padding: 0 10px;
    border: 1px solid #ECEFF3;
    border-radius: 8px;
    background: #FFFFFF;
    font: inherit; font-size: 13px;
    color: #2A3032;
    cursor: pointer;
    outline: none;
  }

  @media (max-width: 1400px) {
    .pj2-static-top { padding-top: clamp(56px, 6.5vh, 72px); }
    .pj2-scroll-body { padding-bottom: 72px; }
  }
  @media (max-width: 1100px) {
    .pj2-static-top { padding-top: clamp(52px, 6vh, 64px); }
    .pj2-scroll-body { padding-bottom: 64px; }
  }
  @media (max-width: 1200px) {
    .pj2-page-lead-line { font-size: 15px; }
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

  /* ─────────────────────────────────────────────────
     MOBILE — 1:1 Figma node 252:58
     ───────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .pj2-dt { display: none !important; }
    .pjm-t { display: inline !important; }

    .pj2-page {
      --pjm-white-elev:
        inset 0 1px 0 rgba(255, 255, 255, 1),
        0 1px 0 rgba(0, 0, 0, 0.04),
        0 4px 10px rgba(144, 149, 159, 0.16);
      --pjm-white-border: 1px solid rgba(0, 0, 0, 0.07);
      background: #FCFCFC !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      overflow-x: hidden !important;
    }
    .pj2-sticky-head,
    .pj2-static-top {
      position: relative !important;
      padding: 0 !important;
      z-index: auto !important;
      background: transparent !important;
      max-width: none !important;
      margin: 0 !important;
    }
    .pj2-static-top::after { display: none !important; }

    .pj2-fab-desktop { display: none !important; }
    .pj2-page-actions { display: none !important; }
    .pj2-page-lead { display: none !important; }

    /* Hide global dock — projects has its own bottom bar */
    :global(.mcd) { display: none !important; }

    /* ── Mobile header icons: merged Codex action pill in header row ── */
    .pjm-header-icons { display: none !important; }
    .pjm-head-actions {
      display: flex !important;
      align-items: flex-start;
      flex-shrink: 0;
      padding-top: 2px;
    }

    .pjm-section { display: none !important; }

    .pjm-folder {
      display: none !important;
    }
    .pjm-chevron {
      display: none !important;
      color: #c7cdd6;
    }

    /* ── Main layout — header fixed, list scrolls ── */
    .pj2-shell {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      padding: calc(20px + env(safe-area-inset-top, 0px)) 20px 0 !important;
      box-sizing: border-box !important;
    }
    .pj2-static-top {
      flex: 0 0 auto !important;
      position: sticky !important;
      top: 0 !important;
      z-index: 12 !important;
      background: transparent !important;
      padding-bottom: 0 !important;
    }
    .pj2-scroll-body {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 0 calc(160px + env(safe-area-inset-bottom, 0px)) !important;
      -webkit-overflow-scrolling: touch;
    }

    /* ── Header: title links, action pill rechts, eine Schriftgröße ── */
    .pj2-page-head {
      display: flex !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      gap: 12px !important;
      margin-bottom: 28px !important;
      padding-bottom: 0 !important;
    }
    .pj2-page-head-copy {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-width: 0;
    }
    .pj2-page-title .pjm-t {
      display: block !important;
    }
    .pj2-m-subline { display: none !important; }

    /* ── Mobile action chips — primary +, filter/sort pill ── */
    .pjm-actions {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      margin-bottom: 32px !important;
    }
    .pjm-add-btn {
      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;
      min-height: 36px !important;
      border: 0 !important;
      border-radius: 999px !important;
      background: var(--portal-btn-primary, #5b647d) !important;
      color: #ffffff !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      padding: 0 !important;
      flex-shrink: 0 !important;
      box-shadow:
        0 2px 10px rgba(91, 100, 125, 0.32),
        0 1px 3px rgba(46, 47, 51, 0.14) !important;
      -webkit-tap-highlight-color: transparent;
      transition: transform .12s ease, background .12s ease, box-shadow .12s ease;
    }
    .pjm-add-btn:active {
      transform: scale(0.96);
      background: color-mix(in srgb, var(--portal-btn-primary, #5b647d) 88%, #000) !important;
      box-shadow:
        0 1px 4px rgba(91, 100, 125, 0.24),
        0 1px 2px rgba(46, 47, 51, 0.1) !important;
    }
    .pjm-actions-group {
      display: inline-flex !important;
      align-items: center !important;
      gap: 8px !important;
    }
    .pjm-ctl {
      position: relative !important;
      width: 36px !important;
      min-width: 36px !important;
      height: 36px !important;
      min-height: 36px !important;
      border: var(--pjm-white-border) !important;
      border-radius: 999px !important;
      background: #FFFFFF !important;
      color: #1C1C1E !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      cursor: pointer !important;
      flex-shrink: 0 !important;
      box-shadow: var(--pjm-white-elev) !important;
      -webkit-tap-highlight-color: transparent;
      transition: background .12s ease, transform .12s ease, box-shadow .12s ease, opacity .12s ease;
    }
    .pjm-ctl.on {
      background: #F8F8F8 !important;
    }
    .pjm-ctl.has-active::after {
      content: '' !important;
      position: absolute !important;
      top: 7px !important;
      right: 7px !important;
      width: 5px !important;
      height: 5px !important;
      border-radius: 50% !important;
      background: var(--portal-btn-primary, #5b647d) !important;
      box-shadow: 0 0 0 1.5px #ffffff !important;
    }
    .pjm-ctl:active {
      transform: scale(0.96);
      opacity: 0.96;
      background: #FAFAFA !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.95),
        0 1px 3px rgba(144, 149, 159, 0.12) !important;
    }
    .pj2-page .cx-action-pill {
      background: #FFFFFF !important;
      border: var(--pjm-white-border) !important;
      box-shadow: var(--pjm-white-elev) !important;
    }
    .pjm-sheet-title {
      margin: 0 0 4px !important;
      padding: 4px 16px 8px !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      letter-spacing: 0.02em !important;
      color: #90959F !important;
    }
    .pjm-sheet-backdrop {
      display: block !important;
      position: fixed !important;
      inset: 0 !important;
      z-index: 90 !important;
      border: 0 !important;
      padding: 0 !important;
      background: rgba(15, 15, 16, 0.28) !important;
      cursor: default !important;
      animation: pjmFadeIn .18s ease both !important;
    }
    @keyframes pjmFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* ── Filter/sort bottom sheets on mobile ── */
    .pj2-tool-wrap { position: relative !important; }
    .pjm-actions .pj2-menu {
      position: fixed !important;
      top: auto !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 100 !important;
      min-width: 0 !important;
      width: 100% !important;
      border-radius: 20px 20px 0 0 !important;
      padding: 8px 16px calc(8px + env(safe-area-inset-bottom, 0px)) !important;
      box-shadow: 0 -4px 24px rgba(15,23,42,0.12) !important;
      animation: pjmSlideUp .22s cubic-bezier(.16,1,.3,1) both !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
      background: #FFFFFF !important;
    }
    .pjm-actions .pj2-menu button,
    .pjm-actions .pj2-menu-item {
      height: 44px !important;
      font-size: 15px !important;
      font-weight: 400 !important;
      padding: 0 16px !important;
      border-radius: 6px !important;
      color: #0F0F10 !important;
    }
    .pjm-actions .pj2-menu button:hover,
    .pjm-actions .pj2-menu-item:hover {
      background: rgba(0,0,0,.04) !important;
      color: #0F0F10 !important;
    }
    .pjm-actions .pj2-menu button.on,
    .pjm-actions .pj2-menu-item.on {
      background: rgba(0,0,0,.055) !important;
      color: #0F0F10 !important;
    }
    .pjm-actions .pj2-menu button:active,
    .pjm-actions .pj2-menu-item:active {
      background: rgba(0,0,0,.07) !important;
    }
    .pjm-actions .pj2-menu-item .check {
      color: #0F0F10 !important;
      font-size: 14px !important;
    }
    @keyframes pjmSlideUp {
      from { opacity: 0; transform: translateY(100%); }
      to { opacity: 1; transform: none; }
    }

    /* ── Hide desktop table elements ── */
    .pj2-thead { display: none !important; }
    .pj2-divider { display: none !important; }
    .pj2-table {
      display: flex !important; flex-direction: column !important;
      gap: 12px !important;
      padding: 4px 0 0 !important;
    }

    /* ── Project rows — Figma 252:245 white cards with spacing ── */
    .pj2-row.pj2-item {
      display: flex !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      gap: 12px !important;
      width: 100% !important;
      box-sizing: border-box !important;
      padding: 16px !important;
      min-height: 66px !important;
      height: auto !important;
      border-radius: 12px !important;
      background: #FFFFFF !important;
      border: 1px solid rgba(255, 255, 255, 0.9) !important;
      box-shadow: 0 2px 4px rgba(144, 149, 159, 0.07) !important;
      margin: 0 !important;
      column-gap: 0 !important;
      border-bottom: 0 !important;
      transition:
        transform .18s ease,
        box-shadow .18s ease,
        background .18s ease,
        border-color .18s ease,
        backdrop-filter .18s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .pj2-row.pj2-item:last-child {
      border-bottom: 0 !important;
    }
    .pj2-row.pj2-item:active {
      transform: scale(0.995);
      background: rgba(255, 255, 255, 0.92) !important;
      box-shadow: 0 1px 3px rgba(144, 149, 159, 0.12) !important;
    }
    @media (hover: hover) {
      .pj2-row.pj2-item:hover {
        background: rgba(255, 255, 255, 0.72) !important;
        backdrop-filter: blur(18px) saturate(175%) !important;
        -webkit-backdrop-filter: blur(18px) saturate(175%) !important;
        border-color: rgba(255, 255, 255, 0.95) !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 1),
          0 12px 32px -12px rgba(15, 23, 42, 0.14),
          0 4px 10px rgba(144, 149, 159, 0.1) !important;
        transform: translateY(-1px);
      }
    }

    /* ── Left: title + subtitle + status (no folder icon) ── */
    .pj2-left {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      justify-content: flex-start !important;
      gap: 10px !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
      max-width: calc(100% - 88px) !important;
    }
    .pjm-folder { display: none !important; }
    .pj2-name {
      display: flex !important;
      flex-direction: column !important;
      gap: 5px !important;
      min-width: 0 !important;
      width: 100% !important;
    }
    .pj2-name-row { gap: 8px !important; }
    .pj2-name strong {
      font-size: 18px !important;
      font-weight: 500 !important;
      color: #0F0F10 !important;
      letter-spacing: 0.36px !important;
      line-height: 1.2 !important;
      max-width: 100% !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .pj2-name small {
      font-size: 14px !important;
      font-weight: 400 !important;
      color: #90959F !important;
      letter-spacing: 0.28px !important;
      line-height: 1.25 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .pj2-status {
      display: inline-flex !important;
      align-items: center !important;
      gap: 8px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      color: #90959F !important;
      letter-spacing: 0.24px !important;
      line-height: 1 !important;
    }
    .pj2-status-dot {
      width: 6px !important;
      height: 6px !important;
      border-radius: 32px !important;
      flex-shrink: 0 !important;
      filter: blur(2px) !important;
    }
    .pj2-new { display: none !important; }

    /* ── Right: avatars + date ── */
    .pj2-right {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
      justify-content: flex-start !important;
      gap: 12px !important;
      flex: 0 0 auto !important;
      width: auto !important;
      margin-left: 0 !important;
      padding-top: 2px !important;
    }
    .pjm-chevron { display: none !important; }
    .pj2-devs {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
    }
    .pj2-dev-stack { display: inline-flex !important; align-items: center !important; }
    .pj2-dev-av {
      width: 32px !important;
      height: 32px !important;
      border: 1.5px solid #FFFFFF !important;
      margin-right: -12px !important;
      font-size: 11px !important;
    }
    .pj2-dev-av:last-child { margin-right: 0 !important; }
    .pj2-dev-empty { display: none !important; }
    .pj2-dev-placeholder { display: inline-flex !important; }
    .pj2-date {
      font-size: 14px !important;
      font-weight: 400 !important;
      color: #90959F !important;
      letter-spacing: 0.14px !important;
      line-height: 1.2 !important;
      text-align: right !important;
      white-space: nowrap !important;
    }

    /* ── Hide desktop-only columns ── */
    .pj2-teams { display: none !important; }
    .pj2-more-wrap { display: none !important; }

    /* ── Dark mode — portal tokens + Codex glass surfaces ── */
    [data-theme="dark"] .pj2-page,
    [data-theme="classic-dark"] .pj2-page {
      --pjm-white-elev:
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.42);
      --pjm-white-border: 1px solid rgba(255, 255, 255, 0.14);
      background: transparent !important;
      color: var(--portal-text, #f4f4f4);
    }
    [data-theme="dark"] .pj2-page .pj2-page-title,
    [data-theme="classic-dark"] .pj2-page .pj2-page-title {
      color: var(--portal-text, #f4f4f4) !important;
    }
    [data-theme="dark"] .pj2-page .pj2-page-title .pjm-t,
    [data-theme="classic-dark"] .pj2-page .pj2-page-title .pjm-t {
      color: #9aa0ac !important;
    }
    [data-theme="dark"] .pj2-page .pjm-sheet-title,
    [data-theme="classic-dark"] .pj2-page .pjm-sheet-title {
      color: var(--portal-muted, #9aa0ac) !important;
    }
    [data-theme="dark"] .pj2-page .pjm-add-btn,
    [data-theme="classic-dark"] .pj2-page .pjm-add-btn {
      background: #ffffff !important;
      color: #121214 !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.92),
        0 2px 6px rgba(0, 0, 0, 0.36) !important;
    }
    [data-theme="dark"] .pj2-page .pjm-add-btn:active,
    [data-theme="classic-dark"] .pj2-page .pjm-add-btn:active {
      background: #f0f0f2 !important;
    }
    [data-theme="dark"] .pj2-page .pjm-ctl,
    [data-theme="classic-dark"] .pj2-page .pjm-ctl {
      background: rgba(255, 255, 255, 0.11) !important;
      border: var(--pjm-white-border) !important;
      color: rgba(255, 255, 255, 0.92) !important;
      box-shadow: var(--pjm-white-elev) !important;
    }
    [data-theme="dark"] .pj2-page .pjm-ctl.on,
    [data-theme="classic-dark"] .pj2-page .pjm-ctl.on {
      background: rgba(255, 255, 255, 0.12) !important;
    }
    [data-theme="dark"] .pj2-page .pjm-ctl.has-active::after,
    [data-theme="classic-dark"] .pj2-page .pjm-ctl.has-active::after {
      background: #ffffff !important;
      box-shadow: 0 0 0 1.5px #141416 !important;
    }
    [data-theme="dark"] .pj2-page .pjm-ctl:active,
    [data-theme="classic-dark"] .pj2-page .pjm-ctl:active {
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.06),
        0 1px 2px rgba(0, 0, 0, 0.28) !important;
    }
    [data-theme="dark"] .pj2-page .cx-action-pill,
    [data-theme="classic-dark"] .pj2-page .cx-action-pill {
      background: rgba(255, 255, 255, 0.11) !important;
      border: var(--pjm-white-border) !important;
      box-shadow: var(--pjm-white-elev) !important;
    }
    [data-theme="dark"] .pj2-page .pjm-actions .pj2-menu,
    [data-theme="classic-dark"] .pj2-page .pjm-actions .pj2-menu {
      background: #1c1c1e !important;
      box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.45) !important;
    }
    [data-theme="dark"] .pj2-page .pjm-actions .pj2-menu-item,
    [data-theme="classic-dark"] .pj2-page .pjm-actions .pj2-menu-item {
      color: #f4f4f4 !important;
    }
    [data-theme="dark"] .pj2-page .pjm-actions .pj2-menu-item:hover,
    [data-theme="classic-dark"] .pj2-page .pjm-actions .pj2-menu-item:hover {
      background: rgba(255, 255, 255, 0.06) !important;
      color: #f4f4f4 !important;
    }
    [data-theme="dark"] .pj2-page .pjm-actions .pj2-menu-item.on,
    [data-theme="classic-dark"] .pj2-page .pjm-actions .pj2-menu-item.on {
      background: rgba(255, 255, 255, 0.09) !important;
      color: #f4f4f4 !important;
    }
    [data-theme="dark"] .pj2-page .pjm-actions .pj2-menu-item .check,
    [data-theme="classic-dark"] .pj2-page .pjm-actions .pj2-menu-item .check {
      color: #f4f4f4 !important;
    }
    [data-theme="dark"] .pj2-page .pjm-sheet-backdrop,
    [data-theme="classic-dark"] .pj2-page .pjm-sheet-backdrop {
      background: rgba(0, 0, 0, 0.52) !important;
    }
    [data-theme="dark"] .pj2-page .pj2-row.pj2-item,
    [data-theme="classic-dark"] .pj2-page .pj2-row.pj2-item {
      background: rgba(255, 255, 255, 0.06) !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        0 2px 4px rgba(0, 0, 0, 0.28) !important;
    }
    [data-theme="dark"] .pj2-page .pj2-row.pj2-item:active,
    [data-theme="classic-dark"] .pj2-page .pj2-row.pj2-item:active {
      background: rgba(255, 255, 255, 0.09) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.04),
        0 1px 3px rgba(0, 0, 0, 0.32) !important;
    }
    @media (hover: hover) {
      [data-theme="dark"] .pj2-page .pj2-row.pj2-item:hover,
      [data-theme="classic-dark"] .pj2-page .pj2-row.pj2-item:hover {
        background: rgba(255, 255, 255, 0.09) !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        border-color: rgba(255, 255, 255, 0.14) !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          0 4px 10px rgba(0, 0, 0, 0.32) !important;
        transform: translateY(-1px);
      }
    }
    [data-theme="dark"] .pj2-page .pj2-name strong,
    [data-theme="classic-dark"] .pj2-page .pj2-name strong {
      color: #f4f4f4 !important;
    }
    [data-theme="dark"] .pj2-page .pj2-name small,
    [data-theme="classic-dark"] .pj2-page .pj2-name small,
    [data-theme="dark"] .pj2-page .pj2-status,
    [data-theme="classic-dark"] .pj2-page .pj2-status,
    [data-theme="dark"] .pj2-page .pj2-date,
    [data-theme="classic-dark"] .pj2-page .pj2-date {
      color: #9aa0ac !important;
    }
    [data-theme="dark"] .pj2-page .pj2-dev-av,
    [data-theme="classic-dark"] .pj2-page .pj2-dev-av {
      border-color: #141416 !important;
    }

    /* ── Tagro desktop hidden ── */
  }
`
