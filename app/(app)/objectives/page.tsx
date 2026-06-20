'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowsClockwise, FunnelSimple, Plus, Target } from '@phosphor-icons/react'
import MobilePageHeader from '@/components/MobilePageHeader'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import { createClient } from '@/lib/supabase/client'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import ObjectiveCardRow, { type ProjectLite } from '@/components/objectives/ObjectiveCardRow'
import ObjectiveCreateModal from '@/components/objectives/ObjectiveCreateModal'
import { OBJECTIVES_CSS } from '@/components/objectives/objectives-styles'
import type { Objective } from '@/lib/objectives/types'

type FilterId = 'active' | 'all' | 'at_risk'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'active', label: 'Aktiv' },
  { id: 'at_risk', label: 'At risk' },
  { id: 'all', label: 'Alle' },
]

export default function ObjectivesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--text-muted)' }}>Objectives werden geladen…</div>}>
      <ObjectivesPageInner />
    </Suspense>
  )
}

function ObjectivesPageInner() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()

  const [navOpen, setNavOpen] = useState(false)
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterId>('active')
  const [projectScope, setProjectScope] = useState<string>(searchParams?.get('project') || 'all')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(searchParams?.get('new') === '1')
  const [atRiskCount, setAtRiskCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (filter === 'active') qs.set('active', '1')
      if (projectScope !== 'all') qs.set('project_id', projectScope)

      const res = await fetch(`/api/objectives?${qs.toString()}`, { credentials: 'include' })
      const data = res.ok ? await res.json().catch(() => null) : null
      const rows: Objective[] = data?.objectives ?? []
      setObjectives(rows)
      setAtRiskCount(data?.at_risk ?? rows.filter(o => o.at_risk).length)

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

  const filtered = useMemo(() => {
    if (filter === 'at_risk') return objectives.filter(o => o.at_risk)
    return objectives
  }, [objectives, filter])

  const filterLabel = FILTERS.find(f => f.id === filter)?.label ?? 'Aktiv'

  return (
    <div className="dec-os">
      <style>{DECISION_CSS}</style>
      <style>{OBJECTIVES_CSS}</style>

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <div className="dec-legacy-mph">
            <MobilePageHeader
              title="Objectives"
              primaryLabel="Neu"
              onPrimary={() => setCreateOpen(true)}
              menuItems={[
                { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
                { id: 'new', label: 'Objective anlegen', onClick: () => setCreateOpen(true) },
              ]}
            />
          </div>

          <header className="dec-page-head">
            <div className="dec-page-head-copy dec-m-title">
              <h1 className="dec-page-title">
                <span className="dec-dt">Objectives</span>
                <span className="dec-m-t">Objectives</span>
              </h1>
              <div className="dec-page-lead dec-dt">
                <p className="dec-page-lead-line">
                  {loading
                    ? 'Lade Ziele…'
                    : `${filtered.length} Objective${filtered.length === 1 ? '' : 's'}${atRiskCount > 0 ? ` · ${atRiskCount} at risk` : ''}`}
                </p>
                <p className="dec-page-lead-line">
                  Tagro versteht durch Objectives, warum gearbeitet wird.
                </p>
              </div>
            </div>
            <div className="dec-m-head-actions">
              <CodexMobileActionPill
                onMenu={() => setNavOpen(true)}
                onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              />
            </div>
            <div className="dec-page-actions dec-dt">
              <button
                type="button"
                className="dec-head-tool"
                title="Aktualisieren"
                aria-label="Aktualisieren"
                onClick={() => void load()}
              >
                <ArrowsClockwise size={15} weight="regular" />
              </button>
              <button
                type="button"
                className="dec-cta"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={14} weight="bold" />
                Objective
              </button>
            </div>
          </header>

          <div className="dec-toolbar">
            <div className="dec-filter-wrap">
              <button
                type="button"
                className={`dec-filter-btn${filter !== 'active' ? ' dec-filter-btn--active' : ''}`}
                onClick={() => setFilterMenuOpen(o => !o)}
              >
                <FunnelSimple size={14} />
                {filterLabel}
              </button>
              {filterMenuOpen && (
                <div className="dec-filter-menu" role="menu">
                  {FILTERS.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      role="menuitem"
                      className={filter === f.id ? 'is-active' : undefined}
                      onClick={() => { setFilter(f.id); setFilterMenuOpen(false) }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dec-scroll-body">
          {loading ? (
            <p className="dec-empty">Objectives werden geladen…</p>
          ) : filtered.length === 0 ? (
            <div className="dec-empty-state">
              <Target size={32} weight="regular" color="var(--dec-soft)" />
              <p>Noch keine Objectives — lege das erste Ziel an.</p>
              <button type="button" className="dec-cta" onClick={() => setCreateOpen(true)}>
                <Plus size={14} weight="bold" />
                Objective anlegen
              </button>
            </div>
          ) : (
            <div className="dec-card-list">
              {filtered.map((obj, i) => (
                <ObjectiveCardRow
                  key={obj.id}
                  objective={obj}
                  project={projects[obj.project_id] ?? null}
                  isLast={i === filtered.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{
            contextType: 'empty',
            id: 'objectives',
            title: 'Objectives · Übersicht',
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
