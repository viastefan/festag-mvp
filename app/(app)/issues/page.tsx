'use client'

/**
 * /issues — Festag Issue Management.
 *
 * Operational issues (bugs, blockers, security) distinct from tasks.
 * Manual creation now; connector imports attach via source/source_id.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowsClockwise, FunnelSimple, LinkSimple, Plus, WarningCircle, WarningOctagon } from '@phosphor-icons/react'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import { openTagro } from '@/components/TagroOverlay'
import { createClient } from '@/lib/supabase/client'
import { usePortalNavItems } from '@/hooks/usePortalNavItems'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import IssueCardRow from '@/components/issues/IssueCardRow'
import IssueCreateModal from '@/components/issues/IssueCreateModal'
import IssueDrawer from '@/components/issues/IssueDrawer'
import {
  type Issue,
  type IssueFilter,
  type ProjectLite,
  ISSUE_FILTERS,
  isOpenIssue,
} from '@/components/issues/issues-shared'
import { ISSUE_EXTRA_CSS } from '@/components/issues/issues-styles'
import { isOpenIssueStatus } from '@/lib/issues/types'

export default function IssuesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--text-muted)' }}>Vorfälle werden geladen…</div>}>
      <IssuesPageInner />
    </Suspense>
  )
}

function IssuesPageInner() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const { wsMode, loaded: navLoaded } = usePortalNavItems()
  const filterWrapRef = useRef<HTMLDivElement>(null)
  const mobileFilterWrapRef = useRef<HTMLDivElement>(null)

  const [navOpen, setNavOpen] = useState(false)
  const [issues, setIssues] = useState<Issue[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<IssueFilter>('open')
  const [projectScope, setProjectScope] = useState<string>(searchParams?.get('project') || 'all')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(searchParams?.get('new') === '1')
  const [openId, setOpenId] = useState<string | null>(searchParams?.get('open') || null)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)
  const [tableReady, setTableReady] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [me, setMe] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  useEffect(() => {
    if (navLoaded && wsMode === 'delivery') {
      router.replace('/activity')
    }
  }, [navLoaded, wsMode, router])

  if (navLoaded && wsMode === 'delivery') {
    return null
  }

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12_000)
      let res: Response
      try {
        res = await fetch('/api/issues', { credentials: 'include', signal: controller.signal })
      } finally {
        clearTimeout(timeout)
      }
      const data = res.ok ? await res.json().catch(() => null) : null
      if (!res.ok) {
        setIssues([])
        setProjects({})
        setLoadError((data as any)?.error || 'Vorfälle konnten nicht geladen werden.')
        return
      }
      const rows: Issue[] = data?.issues ?? []
      setIssues(rows)
      setTableReady(data?.table_ready !== false)

      const projIds = Array.from(new Set(rows.map(i => i.project_id).filter(Boolean)))
      if (projIds.length) {
        const { data: projs } = await (supabase as any)
          .from('projects')
          .select('id,title,color,status,workspace_id')
          .in('id', projIds)
        const map: Record<string, ProjectLite> = {}
        for (const p of (projs as ProjectLite[]) ?? []) map[p.id] = p
        setProjects(map)
      } else {
        setProjects({})
      }
    } catch {
      setIssues([])
      setProjects({})
      setLoadError('Vorfälle konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    setOpenId(searchParams?.get('open') || null)
    setCreateOpen(searchParams?.get('new') === '1')
    const project = searchParams?.get('project')
    if (project) setProjectScope(project)
  }, [searchParams])

  useEffect(() => {
    if (!filterMenuOpen) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      const inside =
        filterWrapRef.current?.contains(t) ||
        mobileFilterWrapRef.current?.contains(t)
      if (!inside) setFilterMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFilterMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [filterMenuOpen])

  useEffect(() => {
    if (!me) return
    const ch = (supabase as any)
      .channel(`issues-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => { void load() })
      .subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [supabase, me, load])

  const projectList = useMemo(
    () => Object.values(projects).sort((a, b) => a.title.localeCompare(b.title, 'de')),
    [projects],
  )

  const scopedIssues = useMemo(() => {
    if (projectScope === 'all') return issues
    return issues.filter(i => i.project_id === projectScope)
  }, [issues, projectScope])

  const filtered = useMemo(() => {
    let xs = scopedIssues
    if (filter === 'open') xs = xs.filter(i => isOpenIssue(i))
    if (filter === 'critical') xs = xs.filter(i => isOpenIssue(i) && (i.severity === 'critical' || i.severity === 'high'))
    if (filter === 'resolved') xs = xs.filter(i => !isOpenIssueStatus(i.status))
    return [...xs].sort((a, b) => {
      const sev = (s: Issue) => ({ critical: 0, high: 1, medium: 2, low: 3 }[s.severity] ?? 9)
      const ord = sev(a) - sev(b)
      if (ord !== 0) return ord
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [filter, scopedIssues])

  const counts = useMemo(() => ({
    open: scopedIssues.filter(i => isOpenIssue(i)).length,
    critical: scopedIssues.filter(i => isOpenIssue(i) && (i.severity === 'critical' || i.severity === 'high')).length,
    resolved: scopedIssues.filter(i => !isOpenIssueStatus(i.status)).length,
  }), [scopedIssues])

  const openIssue = openId ? issues.find(i => i.id === openId) ?? null : null
  const filterActive = filter !== 'open' || projectScope !== 'all'

  function closeDrawer() {
    setOpenId(null)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('open')
    const qs = params.toString()
    router.replace(qs ? `/issues?${qs}` : '/issues', { scroll: false })
  }

  function closeCreate() {
    setCreateOpen(false)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('new')
    const qs = params.toString()
    router.replace(qs ? `/issues?${qs}` : '/issues', { scroll: false })
  }

  function openIssueDrawer(id: string) {
    setOpenId(id)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('open', id)
    router.replace(`/issues?${params.toString()}`, { scroll: false })
  }

  function applyProjectScope(next: string) {
    setProjectScope(next)
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (next === 'all') params.delete('project')
    else params.set('project', next)
    const qs = params.toString()
    router.replace(qs ? `/issues?${qs}` : '/issues', { scroll: false })
  }

  function patchLocal(id: string, patch: Partial<Issue>) {
    setIssues(curr => curr.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  function onCreated(issue: Issue) {
    setIssues(curr => [issue, ...curr.filter(i => i.id !== issue.id)])
    if (issue.project_id && !projects[issue.project_id]) {
      void (async () => {
        const { data: p } = await (supabase as any)
          .from('projects')
          .select('id,title,color,status,workspace_id')
          .eq('id', issue.project_id)
          .maybeSingle()
        if (p) setProjects(prev => ({ ...prev, [p.id]: p }))
      })()
    }
    openIssueDrawer(issue.id)
  }

  const tagroBrief = useMemo(() => {
    const ranked = scopedIssues
      .filter(i => isOpenIssue(i) && i.tagro_summary?.trim())
      .sort((a, b) => {
        const sev = (s: Issue) => ({ critical: 0, high: 1, medium: 2, low: 3 }[s.severity] ?? 9)
        return sev(a) - sev(b)
      })
    return ranked[0]?.tagro_summary?.trim() || null
  }, [scopedIssues])

  const pageLeadLine = counts.open === 0
    ? 'Tagro interpretiert Vorfälle aus Anbindungen, sobald sie synchronisiert sind.'
    : tagroBrief
      || (counts.critical > 0
        ? 'Kritische Vorfälle können Liefer- und Launch-Termine direkt beeinflussen.'
        : 'Vorfälle sind getrennt von Aufgaben — für Bugs, Blocker und technische Risiken.')

  async function syncFromConnectors() {
    setSyncBusy(true)
    setSyncNote(null)
    try {
      const res = await fetch('/api/issues/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: projectScope !== 'all' ? projectScope : undefined,
          source: 'all',
          enrich: true,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Sync fehlgeschlagen')

      const rows = data?.synced ?? []
      const imported = rows.reduce(
        (s: number, row: any) => s + (row.issuesImported ?? 0) + (row.issuesUpdated ?? 0),
        0,
      )
      const enriched = rows.reduce((s: number, row: any) => s + (row.enriched ?? 0), 0)
      const sources = Array.from(new Set(rows.map((r: any) => r.source).filter(Boolean)))
      const sourceLabel = sources.length > 0 ? sources.join(' + ') : 'Anbindungen'

      if (rows.every((r: any) => r.message === 'no_links')) {
        setSyncNote('Keine verbundenen Quellen — GitHub, Linear oder Jira unter /connectors verknüpfen.')
      } else {
        setSyncNote(
          imported > 0
            ? `${imported} Vorfall${imported === 1 ? '' : 'e'} aus ${sourceLabel}${enriched > 0 ? ` · Tagro hat ${enriched} interpretiert` : ''}.`
            : enriched > 0
              ? `Tagro hat ${enriched} Vorfall${enriched === 1 ? '' : 'e'} interpretiert.`
              : `${sourceLabel}-Sync abgeschlossen — keine neuen Vorfälle.`,
        )
      }
      await load()
    } catch (e: any) {
      setSyncNote(e?.message || 'Connector-Sync fehlgeschlagen')
    } finally {
      setSyncBusy(false)
    }
  }

  const tagroHandler = () => openTagro({
    contextType: 'empty',
    id: 'issues',
    projectId: projectScope !== 'all' ? projectScope : projectList[0]?.id,
    title: 'Vorfälle · Übersicht',
    subtitle: `${counts.open} offen · ${counts.critical} kritisch`,
  })

  function renderFilterMenu() {
    if (!filterMenuOpen) return null
    return (
      <div className="dec-filter-menu" role="menu" aria-label="Filter">
        <p className="dec-m-sheet-title">Filtern</p>
        <p className="dec-filter-menu-label dec-dt">Status</p>
        {ISSUE_FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            role="menuitem"
            className={`dec-filter-menu-item${filter === f.id ? ' on' : ''}`}
            onClick={() => { setFilter(f.id); setFilterMenuOpen(false) }}
          >
            <span>{f.label}</span>
            {filter === f.id && <span className="dec-filter-check">✓</span>}
          </button>
        ))}
        {projectList.length > 0 && (
          <>
            <p className="dec-filter-menu-label dec-dt">Projekt</p>
            <button
              type="button"
              role="menuitem"
              className={`dec-filter-menu-item${projectScope === 'all' ? ' on' : ''}`}
              onClick={() => { applyProjectScope('all'); setFilterMenuOpen(false) }}
            >
              <span>Alle Projekte</span>
              {projectScope === 'all' && <span className="dec-filter-check">✓</span>}
            </button>
            {projectList.map(p => (
              <button
                key={p.id}
                type="button"
                role="menuitem"
                className={`dec-filter-menu-item${projectScope === p.id ? ' on' : ''}`}
                onClick={() => { applyProjectScope(p.id); setFilterMenuOpen(false) }}
              >
                <span>{p.title}</span>
                {projectScope === p.id && <span className="dec-filter-check">✓</span>}
              </button>
            ))}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="dec-os">
      <style>{DECISION_CSS}</style>
      <style>{ISSUE_EXTRA_CSS}</style>

      {filterMenuOpen && (
        <button type="button" className="dec-m-sheet-backdrop" aria-label="Schließen" onClick={() => setFilterMenuOpen(false)} />
      )}

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title="Vorfälle"
            lead={pageLeadLine}
            onMenu={() => setNavOpen(true)}
            mobileMenuItems={[
              { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
              { id: 'new', label: 'Neuen Vorfall anlegen', onClick: () => setCreateOpen(true) },
              { id: 'tagro', label: 'Mit Tagro besprechen', onClick: tagroHandler },
            ]}
            actions={(
              <>
                <div className="dec-page-actions-group">
                  <div className="dec-filter-wrap" ref={filterWrapRef}>
                    <button
                      type="button"
                      className={`dec-head-tool${filterMenuOpen || filterActive ? ' on' : ''}`}
                      title="Filter"
                      aria-label="Filter"
                      aria-expanded={filterMenuOpen}
                      onClick={() => setFilterMenuOpen(v => !v)}
                    >
                      <FunnelSimple size={15} weight="regular" />
                    </button>
                    {renderFilterMenu()}
                  </div>
                  {counts.critical > 0 && (
                    <button type="button" className="dec-head-tool dec-head-tool--risks on" title="Kritische Vorfälle" aria-label={`${counts.critical} kritische Vorfälle`}>
                      <span className="dec-head-tool-ico">
                        <WarningCircle size={15} weight="fill" />
                        <span className="dec-risks-badge" aria-hidden>{counts.critical > 9 ? '9+' : counts.critical}</span>
                      </span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="dec-head-tool"
                  title="Aus Anbindungen synchronisieren (GitHub, Linear, Jira)"
                  aria-label="Aus Anbindungen synchronisieren"
                  disabled={syncBusy}
                  onClick={() => void syncFromConnectors()}
                >
                  <LinkSimple size={15} weight="regular" />
                </button>
                <button type="button" className="iss-create-btn" onClick={() => setCreateOpen(true)}>
                  <Plus size={14} weight="bold" />
                  Neuer Vorfall
                </button>
                <button type="button" className="dec-head-tool" title="Aktualisieren" aria-label="Aktualisieren" onClick={() => void load()}>
                  <ArrowsClockwise size={15} weight="regular" />
                </button>
              </>
            )}
          />

          <div className="dec-m-actions">
            <div className="dec-m-actions-group">
              <div className="dec-filter-wrap" ref={mobileFilterWrapRef}>
                <button
                  type="button"
                  className={`dec-m-ctl${filterMenuOpen ? ' on' : ''}${filterActive ? ' has-active' : ''}`}
                  aria-label="Filter"
                  aria-expanded={filterMenuOpen}
                  onClick={() => setFilterMenuOpen(v => !v)}
                >
                  <FunnelSimple size={17} weight="regular" />
                </button>
                {renderFilterMenu()}
              </div>
              <button type="button" className="dec-m-ctl" aria-label="Aktualisieren" onClick={() => void load()}>
                <ArrowsClockwise size={17} weight="regular" />
              </button>
            </div>
          </div>
        </div>

        <div className="dec-scroll-body">
          {!tableReady && (
            <div className="dec-demo-banner" role="status">
              <span>Vorfälle-Datenbank noch nicht aktiv — einmalig <code>supabase db push</code> ausführen.</span>
            </div>
          )}
          {syncNote && (
            <div className="dec-demo-banner" role="status">
              <span>{syncNote}</span>
            </div>
          )}
          {loadError ? (
            <div className="dec-empty">
              <WarningCircle size={16} />
              <p>{loadError}</p>
              <button type="button" className="dec-cta" style={{ marginTop: 16 }} onClick={() => void load()}>
                Erneut laden
              </button>
            </div>
          ) : loading && filtered.length === 0 ? (
            <p className="dec-empty">Lade Vorfälle…</p>
          ) : filtered.length === 0 ? (
            <div className="dec-empty">
              <WarningOctagon size={14} />
              <p>{issues.length === 0 ? 'Noch keine Vorfälle.' : 'Keine Vorfälle in dieser Ansicht.'}</p>
              <small>
                {issues.length === 0
                  ? 'Lege manuell einen Vorfall an oder importiere später aus GitHub, Jira oder Linear.'
                  : 'Passe den Filter an oder wähle ein anderes Projekt.'}
              </small>
              {issues.length === 0 && (
                <button type="button" className="iss-create-btn" style={{ marginTop: 16 }} onClick={() => setCreateOpen(true)}>
                  <Plus size={14} weight="bold" />
                  Ersten Vorfall anlegen
                </button>
              )}
            </div>
          ) : filtered.map((issue, i) => (
            <IssueCardRow
              key={issue.id}
              issue={issue}
              project={issue.project_id ? projects[issue.project_id] : null}
              isLast={i === filtered.length - 1}
              onOpen={openIssueDrawer}
            />
          ))}
        </div>
      </div>

      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{
            contextType: 'empty',
            id: 'issues',
            projectId: projectScope !== 'all' ? projectScope : projectList[0]?.id,
            title: 'Vorfälle · Übersicht',
            subtitle: `${counts.open} offen · ${counts.critical} kritisch`,
          }}
        />
      </div>

      {openIssue && (
        <IssueDrawer
          issue={openIssue}
          project={openIssue.project_id ? projects[openIssue.project_id] : null}
          onClose={closeDrawer}
          onPatch={patchLocal}
        />
      )}

      <IssueCreateModal
        open={createOpen}
        onClose={closeCreate}
        onCreated={onCreated}
        defaultProjectId={projectScope !== 'all' ? projectScope : projectList[0]?.id}
      />
    </div>
  )
}
