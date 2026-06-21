'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowsClockwise, Flag, FunnelSimple, Lightning, Plus, WarningCircle } from '@phosphor-icons/react'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import PortalMobileNavSheet from '@/components/portal/PortalMobileNavSheet'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import TagroContentFab from '@/components/TagroContentFab'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import { openTagro } from '@/components/TagroOverlay'
import { createClient } from '@/lib/supabase/client'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import ObjectiveCardRow from '@/components/objectives/ObjectiveCardRow'
import ObjectiveCreateModal from '@/components/objectives/ObjectiveCreateModal'
import ObjectiveDrawer from '@/components/objectives/ObjectiveDrawer'
import { OBJECTIVES_CSS } from '@/components/objectives/objectives-styles'
import {
  OBJECTIVE_FILTERS,
  isDemoObjectiveId,
  type ObjectiveFilter,
  type ProjectLite,
} from '@/components/objectives/objectives-shared'
import { fetchJson } from '@/lib/portal/fetch-api'
import {
  DEMO_OBJECTIVE_PROJECTS,
  DEMO_OBJECTIVES,
  shouldUseDemoFallback,
} from '@/lib/demo/portal-preview'
import { isObjectiveAtRisk } from '@/lib/objectives/types'
import type { Objective } from '@/lib/objectives/types'

export default function ObjectivesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--text-muted)' }}>Ziele werden geladen…</div>}>
      <ObjectivesPageInner />
    </Suspense>
  )
}

function ObjectivesPageInner() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterWrapRef = useRef<HTMLDivElement>(null)
  const mobileFilterWrapRef = useRef<HTMLDivElement>(null)

  const [navOpen, setNavOpen] = useState(false)
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ObjectiveFilter>('active')
  const [projectScope, setProjectScope] = useState<string>(searchParams?.get('project') || 'all')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(searchParams?.get('new') === '1')
  const [openId, setOpenId] = useState<string | null>(searchParams?.get('open') || null)
  const [atRiskCount, setAtRiskCount] = useState(0)
  const [tableReady, setTableReady] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [me, setMe] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const qs = new URLSearchParams()
      if (filter === 'active') qs.set('active', '1')
      if (projectScope !== 'all') qs.set('project_id', projectScope)

      const res = await fetchJson<{
        objectives: Objective[]
        at_risk?: number
        table_ready?: boolean
        hint?: string
      }>(`/api/objectives?${qs.toString()}`)

      if (!res.ok) {
        if (shouldUseDemoFallback(res.status)) {
          setObjectives(DEMO_OBJECTIVES)
          setProjects(DEMO_OBJECTIVE_PROJECTS)
          setAtRiskCount(DEMO_OBJECTIVES.filter(o => o.at_risk).length)
          setTableReady(true)
          setIsDemo(true)
          setLoadError(null)
          return
        }
        setObjectives([])
        setProjects({})
        setIsDemo(false)
        setLoadError(res.error || 'Ziele konnten nicht geladen werden.')
        return
      }

      const rows = res.data?.objectives ?? []
      setObjectives(rows)
      setAtRiskCount(res.data?.at_risk ?? rows.filter(o => o.at_risk).length)
      setTableReady(res.data?.table_ready !== false)
      setIsDemo(false)

      const projIds = Array.from(new Set(rows.map(o => o.project_id).filter(Boolean)))
      if (projIds.length) {
        const { data: projs } = await (supabase as any)
          .from('projects')
          .select('id,title,color')
          .in('id', projIds)
        setProjects(prev => {
          const map = { ...prev }
          for (const p of (projs as ProjectLite[]) ?? []) map[p.id] = p
          return map
        })
      }
    } catch {
      if (shouldUseDemoFallback(0)) {
        setObjectives(DEMO_OBJECTIVES)
        setProjects(DEMO_OBJECTIVE_PROJECTS)
        setAtRiskCount(DEMO_OBJECTIVES.filter(o => o.at_risk).length)
        setIsDemo(true)
        setLoadError(null)
      } else {
        setObjectives([])
        setProjects({})
        setIsDemo(false)
        setLoadError('Ziele konnten nicht geladen werden.')
      }
    } finally {
      setLoading(false)
    }
  }, [filter, projectScope, supabase])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!me || isDemo) return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await (supabase as any)
        .from('projects')
        .select('id,title,color')
        .or(`user_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .limit(100)
      if (!data?.length) return
      setProjects(prev => {
        const map = { ...prev }
        for (const p of data as ProjectLite[]) map[p.id] = p
        return map
      })
    })()
  }, [me, supabase, isDemo])

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
      if (!filterWrapRef.current?.contains(t) && !mobileFilterWrapRef.current?.contains(t)) {
        setFilterMenuOpen(false)
      }
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
    if (!me || isDemo) return
    const ch = (supabase as any)
      .channel(`objectives-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'objectives' }, () => { void load() })
      .subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [supabase, me, isDemo, load])

  const projectList = useMemo(
    () => Object.values(projects).sort((a, b) => a.title.localeCompare(b.title, 'de')),
    [projects],
  )

  const scopedObjectives = useMemo(() => {
    if (projectScope === 'all') return objectives
    return objectives.filter(o => o.project_id === projectScope)
  }, [objectives, projectScope])

  const filtered = useMemo(() => {
    if (filter === 'at_risk') return scopedObjectives.filter(o => o.at_risk)
    return scopedObjectives
  }, [scopedObjectives, filter])

  const counts = useMemo(() => ({
    active: scopedObjectives.filter(o => o.status === 'active').length,
    at_risk: scopedObjectives.filter(o => o.at_risk).length,
    all: scopedObjectives.length,
  }), [scopedObjectives])

  const openObjective = openId ? objectives.find(o => o.id === openId) ?? null : null
  const filterActive = filter !== 'active' || projectScope !== 'all'

  const pageLeadLine = useMemo(() => {
    if (loading) return 'Ziele werden geladen…'
    if (scopedObjectives.length === 0) {
      return 'Tagro versteht durch Ziele, warum gearbeitet wird — lege das erste strategische Ziel an.'
    }
    if (counts.at_risk > 0) {
      return `${counts.at_risk} Ziel${counts.at_risk === 1 ? '' : 'e'} ${counts.at_risk === 1 ? 'ist' : 'sind'} gefährdet — Fortschritt und Zieldatum prüfen.`
    }
    return 'Tagro versteht durch Ziele, warum gearbeitet wird.'
  }, [loading, scopedObjectives.length, counts.at_risk])

  const tagroSubtitle = useMemo(() => {
    if (loading) return 'Ziele'
    const base = `${filtered.length} Ziel${filtered.length === 1 ? '' : 'e'}`
    return counts.at_risk > 0 ? `${base} · ${counts.at_risk} gefährdet` : base
  }, [loading, filtered.length, counts.at_risk])

  function closeDrawer() {
    setOpenId(null)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('open')
    const qs = params.toString()
    router.replace(qs ? `/objectives?${qs}` : '/objectives', { scroll: false })
  }

  function closeCreate() {
    setCreateOpen(false)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('new')
    const qs = params.toString()
    router.replace(qs ? `/objectives?${qs}` : '/objectives', { scroll: false })
  }

  function openObjectiveDrawer(id: string) {
    setOpenId(id)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('open', id)
    router.replace(`/objectives?${params.toString()}`, { scroll: false })
  }

  function applyProjectScope(next: string) {
    setProjectScope(next)
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (next === 'all') params.delete('project')
    else params.set('project', next)
    const qs = params.toString()
    router.replace(qs ? `/objectives?${qs}` : '/objectives', { scroll: false })
  }

  function patchLocal(id: string, patch: Partial<Objective>) {
    setObjectives(curr => {
      const next = curr.map(o => {
        if (o.id !== id) return o
        const merged = { ...o, ...patch }
        return { ...merged, at_risk: isObjectiveAtRisk(merged) }
      })
      setAtRiskCount(next.filter(o => o.at_risk).length)
      return next
    })
  }

  function removeLocal(id: string) {
    setObjectives(curr => {
      const next = curr.filter(o => o.id !== id)
      setAtRiskCount(next.filter(o => o.at_risk).length)
      return next
    })
  }

  function onCreated(obj: Objective) {
    setObjectives(prev => [obj, ...prev.filter(o => o.id !== obj.id)])
    if (obj.project_id && !projects[obj.project_id]) {
      void (async () => {
        const { data: p } = await (supabase as any)
          .from('projects')
          .select('id,title,color')
          .eq('id', obj.project_id)
          .maybeSingle()
        if (p) setProjects(prev => ({ ...prev, [p.id]: p }))
      })()
    }
    closeCreate()
    openObjectiveDrawer(obj.id)
  }

  const tagroHandler = () => openTagro({
    contextType: 'empty',
    id: 'objectives',
    projectId: projectScope !== 'all' ? projectScope : projectList[0]?.id,
    title: 'Ziele · Übersicht',
    subtitle: tagroSubtitle,
  })

  function renderFilterMenu() {
    if (!filterMenuOpen) return null
    return (
      <div className="dec-filter-menu" role="menu" aria-label="Filter">
        <p className="dec-m-sheet-title">Filtern</p>
        <p className="dec-filter-menu-label dec-dt">Ansicht</p>
        {OBJECTIVE_FILTERS.map(f => (
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
      <style>{OBJECTIVES_CSS}</style>

      {filterMenuOpen && (
        <button type="button" className="dec-m-sheet-backdrop" aria-label="Schließen" onClick={() => setFilterMenuOpen(false)} />
      )}

      <PortalMobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title="Ziele"
            lead={pageLeadLine}
            onMenu={() => setNavOpen(true)}
            mobileMenuItems={[
              { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
              { id: 'new', label: 'Ziel anlegen', onClick: () => setCreateOpen(true) },
              { id: 'tagro', label: 'Mit Tagro besprechen', onClick: tagroHandler },
            ]}
            actions={(
              <>
                <div className="dec-page-actions-group">
                  <div className="dec-filter-wrap" ref={filterWrapRef}>
                    <button
                      type="button"
                      className={`dec-head-tool${filterMenuOpen || filterActive ? ' on' : ''}`}
                      aria-label="Filter"
                      aria-expanded={filterMenuOpen}
                      onClick={() => setFilterMenuOpen(v => !v)}
                    >
                      <FunnelSimple size={15} weight="regular" />
                    </button>
                    {renderFilterMenu()}
                  </div>
                  {counts.at_risk > 0 && (
                    <button
                      type="button"
                      className="dec-head-tool dec-head-tool--risks on"
                      title="Gefährdete Ziele"
                      aria-label={`${counts.at_risk} gefährdete Ziele`}
                      onClick={() => setFilter('at_risk')}
                    >
                      <span className="dec-head-tool-ico">
                        <WarningCircle size={15} weight="fill" />
                        <span className="dec-risks-badge" aria-hidden>{counts.at_risk > 9 ? '9+' : counts.at_risk}</span>
                      </span>
                    </button>
                  )}
                </div>
                <button type="button" className="obj-create-btn" onClick={() => setCreateOpen(true)}>
                  <Plus size={14} weight="bold" />
                  Ziel anlegen
                </button>
                <button type="button" className="dec-head-tool" title="Aktualisieren" aria-label="Aktualisieren" onClick={() => void load()}>
                  <ArrowsClockwise size={15} weight="regular" />
                </button>
              </>
            )}
          />

          <div className="obj-filters dec-dt">
            {OBJECTIVE_FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                className={`obj-filter${filter === f.id ? ' on' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.id === 'active' ? `Aktiv (${counts.active})` : f.id === 'at_risk' ? `Gefährdet (${counts.at_risk})` : `Alle (${counts.all})`}
              </button>
            ))}
          </div>

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
          {isDemo && <DemoPreviewBanner />}

          {!tableReady && !isDemo && (
            <div className="dec-demo-banner" role="status">
              <span>Ziele-Datenbank noch nicht aktiv — einmalig <code>supabase db push</code> ausführen.</span>
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
            <p className="dec-empty">Lade Ziele…</p>
          ) : filtered.length === 0 ? (
            <div className="dec-empty">
              <Flag size={16} />
              <p>{scopedObjectives.length === 0 ? 'Noch keine Ziele.' : 'Keine Ziele in dieser Ansicht.'}</p>
              <small>
                {scopedObjectives.length === 0
                  ? 'Lege das erste strategische Ziel an — Tasks können später verknüpft werden.'
                  : 'Passe den Filter an oder wähle ein anderes Projekt.'}
              </small>
              {scopedObjectives.length === 0 && (tableReady || isDemo) && (
                <button type="button" className="obj-create-btn" style={{ marginTop: 16 }} onClick={() => setCreateOpen(true)}>
                  <Plus size={14} weight="bold" />
                  Erstes Ziel anlegen
                </button>
              )}
            </div>
          ) : (
            filtered.map((obj, i) => (
              <ObjectiveCardRow
                key={obj.id}
                objective={obj}
                project={projects[obj.project_id] ?? DEMO_OBJECTIVE_PROJECTS[obj.project_id] ?? null}
                isLast={i === filtered.length - 1}
                onOpen={openObjectiveDrawer}
              />
            ))
          )}
        </div>
      </div>

      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{
            contextType: 'empty',
            id: 'objectives',
            projectId: projectScope !== 'all' ? projectScope : projectList[0]?.id,
            title: 'Ziele · Übersicht',
            subtitle: tagroSubtitle,
          }}
        />
      </div>

      <MobilePageDock
        onDragUp={() => setCreateOpen(true)}
        primary={{
          id: 'discuss',
          label: counts.at_risk > 0 ? 'Gefährdete Ziele besprechen…' : 'Ziele mit Tagro besprechen…',
          icon: <Lightning size={14} weight="regular" />,
          onClick: tagroHandler,
          ariaLabel: 'Mit Tagro besprechen',
        }}
        secondary={{
          id: 'new',
          icon: <Plus size={20} weight="bold" />,
          onClick: () => setCreateOpen(true),
          ariaLabel: 'Ziel anlegen',
        }}
      />

      {openObjective && (
        <ObjectiveDrawer
          objective={openObjective}
          project={openObjective.project_id ? (projects[openObjective.project_id] ?? DEMO_OBJECTIVE_PROJECTS[openObjective.project_id] ?? null) : null}
          isDemo={isDemo || isDemoObjectiveId(openObjective.id)}
          onClose={closeDrawer}
          onPatch={patchLocal}
          onRemove={removeLocal}
        />
      )}

      <ObjectiveCreateModal
        open={createOpen}
        onClose={closeCreate}
        onCreated={onCreated}
        defaultProjectId={projectScope !== 'all' ? projectScope : projectList[0]?.id ?? null}
      />
    </div>
  )
}
