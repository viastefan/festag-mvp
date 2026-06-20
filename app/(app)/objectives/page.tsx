'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowsClockwise, Flag, FunnelSimple, Plus, WarningCircle } from '@phosphor-icons/react'
import MobilePageHeader from '@/components/MobilePageHeader'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import { openTagro } from '@/components/TagroOverlay'
import { createClient } from '@/lib/supabase/client'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import ObjectiveCardRow, { type ProjectLite } from '@/components/objectives/ObjectiveCardRow'
import ObjectiveCreateModal from '@/components/objectives/ObjectiveCreateModal'
import { OBJECTIVES_CSS } from '@/components/objectives/objectives-styles'
import { fetchJson } from '@/lib/portal/fetch-api'
import type { Objective } from '@/lib/objectives/types'

type FilterId = 'active' | 'all' | 'at_risk'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'active', label: 'Aktiv' },
  { id: 'at_risk', label: 'Gefährdet' },
  { id: 'all', label: 'Alle' },
]

export default function ObjectivesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--text-muted)' }}>Ziele werden geladen…</div>}>
      <ObjectivesPageInner />
    </Suspense>
  )
}

function ObjectivesPageInner() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const filterWrapRef = useRef<HTMLDivElement>(null)
  const mobileFilterWrapRef = useRef<HTMLDivElement>(null)

  const [navOpen, setNavOpen] = useState(false)
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterId>('active')
  const [projectScope, setProjectScope] = useState<string>(searchParams?.get('project') || 'all')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(searchParams?.get('new') === '1')
  const [atRiskCount, setAtRiskCount] = useState(0)
  const [tableReady, setTableReady] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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
        setObjectives([])
        setProjects({})
        setLoadError(res.error || 'Ziele konnten nicht geladen werden.')
        return
      }

      const rows = res.data?.objectives ?? []
      setObjectives(rows)
      setAtRiskCount(res.data?.at_risk ?? rows.filter(o => o.at_risk).length)
      setTableReady(res.data?.table_ready !== false)

      const projIds = Array.from(new Set(rows.map(o => o.project_id).filter(Boolean)))
      if (projIds.length) {
        const { data: projs } = await (supabase as any)
          .from('projects')
          .select('id,title,color')
          .in('id', projIds)
        const map: Record<string, ProjectLite> = {}
        for (const p of (projs as ProjectLite[]) ?? []) map[p.id] = p
        setProjects(map)
      } else {
        setProjects({})
      }
    } catch {
      setObjectives([])
      setProjects({})
      setLoadError('Ziele konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [filter, projectScope, supabase])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
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

  const filtered = useMemo(() => {
    if (filter === 'at_risk') return objectives.filter(o => o.at_risk)
    return objectives
  }, [objectives, filter])

  const filterActive = filter !== 'active'

  function renderFilterMenu() {
    if (!filterMenuOpen) return null
    return (
      <div className="dec-filter-menu" role="menu" aria-label="Filter">
        <p className="dec-filter-menu-label dec-dt">Ansicht</p>
        {FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            role="menuitem"
            className={`dec-filter-menu-item${filter === f.id ? ' on' : ''}`}
            onClick={() => { setFilter(f.id); setFilterMenuOpen(false) }}
          >
            {f.label}
            {filter === f.id && <span className="dec-filter-check">✓</span>}
          </button>
        ))}
      </div>
    )
  }

  const tagroHandler = () => openTagro({
    contextType: 'empty',
    id: 'objectives',
    title: 'Ziele · Übersicht',
    subtitle: `${filtered.length} Ziele${atRiskCount > 0 ? ` · ${atRiskCount} at risk` : ''}`,
  })

  return (
    <div className="dec-os">
      <style>{DECISION_CSS}</style>
      <style>{OBJECTIVES_CSS}</style>

      {filterMenuOpen && (
        <button type="button" className="dec-m-sheet-backdrop" aria-label="Schließen" onClick={() => setFilterMenuOpen(false)} />
      )}

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <div className="dec-legacy-mph">
            <MobilePageHeader
              title="Ziele"
              primaryLabel="Neu"
              onPrimary={() => setCreateOpen(true)}
              menuItems={[
                { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
                { id: 'new', label: 'Ziel anlegen', onClick: () => setCreateOpen(true) },
                { id: 'tagro', label: 'Mit Tagro besprechen', onClick: tagroHandler },
              ]}
            />
          </div>

          <header className="dec-page-head">
            <div className="dec-page-head-copy dec-m-title">
              <h1 className="dec-page-title">
                <span className="dec-dt">Ziele</span>
                <span className="dec-m-t">Ziele</span>
              </h1>
              <p className="dec-m-subline">
                <span className="dec-m-t dec-m-sub">
                  {loading ? 'Lade…' : `${filtered.length} Ziel${filtered.length === 1 ? '' : 'e'}${atRiskCount > 0 ? ` · ${atRiskCount} at risk` : ''}`}
                </span>
              </p>
              <div className="dec-page-lead dec-dt">
                <p className="dec-page-lead-line">Tagro versteht durch Ziele, warum gearbeitet wird.</p>
              </div>
            </div>

            <div className="dec-m-head-actions">
              <CodexMobileActionPill
                onMenu={() => setNavOpen(true)}
                onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              />
            </div>

            <div className="dec-page-actions dec-dt">
              <div className="dec-filter-wrap" ref={filterWrapRef}>
                <button
                  type="button"
                  className={`dec-head-tool${filterActive ? ' on' : ''}`}
                  aria-label="Filter"
                  aria-expanded={filterMenuOpen}
                  onClick={() => setFilterMenuOpen(v => !v)}
                >
                  <FunnelSimple size={15} weight="regular" />
                </button>
                {renderFilterMenu()}
              </div>
              <button type="button" className="dec-cta" onClick={() => setCreateOpen(true)}>
                <Plus size={14} weight="bold" />
                Ziel anlegen
              </button>
              <button type="button" className="dec-head-tool" title="Aktualisieren" onClick={() => void load()}>
                <ArrowsClockwise size={15} weight="regular" />
              </button>
            </div>
          </header>

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
              <p>{objectives.length === 0 ? 'Noch keine Ziele.' : 'Keine Ziele in dieser Ansicht.'}</p>
              <small>
                {objectives.length === 0
                  ? 'Lege das erste strategische Ziel an — Tasks können später verknüpft werden.'
                  : 'Passe den Filter an.'}
              </small>
              {objectives.length === 0 && tableReady && (
                <button type="button" className="dec-cta" style={{ marginTop: 16 }} onClick={() => setCreateOpen(true)}>
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
                project={projects[obj.project_id] ?? null}
                isLast={i === filtered.length - 1}
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
            title: 'Ziele · Übersicht',
            subtitle: `${filtered.length} Ziele${atRiskCount > 0 ? ` · ${atRiskCount} at risk` : ''}`,
          }}
        />
      </div>

      <ObjectiveCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(obj) => {
          setObjectives(prev => [obj, ...prev])
          void load()
        }}
        defaultProjectId={projectScope !== 'all' ? projectScope : null}
      />
    </div>
  )
}
