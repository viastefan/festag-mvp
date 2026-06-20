'use client'

/**
 * /decisions — Festag Entscheidungen.
 *
 * Linear-style flat table (mirrors .task-os DNA) where the client sees
 * every open + recently-decided decision they own. Clicking opens a
 * right-side drawer with the dev's context, Tagro's recommendation
 * (on-demand), and the answer form (option select + free-text note).
 *
 * Data flow: devs POST /api/decisions from their dev panel → DB trigger
 * fans an inbox notification + populates the sidebar badge → client
 * lands here, clicks Tagro, picks an answer → /decide route notifies
 * the dev back.
 */

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowsClockwise, FunnelSimple, Lightning, PencilSimple,
} from '@phosphor-icons/react'
import MobilePageHeader from '@/components/MobilePageHeader'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import DecisionCardRow from '@/components/decisions/DecisionCardRow'
import TagroContentFab from '@/components/TagroContentFab'
import { openTagro } from '@/components/TagroOverlay'
import { createClient } from '@/lib/supabase/client'
import {
  type Decision, type ProjectLite,
  getDecisionDemoBundle, isDecisionDemoId, isOpenDecisionStatus,
} from '@/components/decisions/decisions-shared'
import { DecisionDrawer } from '@/components/decisions/DecisionDrawer'
import DecisionRisksPopover from '@/components/decisions/DecisionRisksPopover'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { deriveDecisionRisks } from '@/lib/decisions/risks'

type Filter = 'open' | 'all' | 'decided' | 'urgent'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'open',    label: 'Offen' },
  { id: 'urgent',  label: 'Dringend' },
  { id: 'decided', label: 'Entschieden' },
  { id: 'all',     label: 'Alle' },
]
export default function DecisionsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--text-muted)' }}>Entscheidungen werden geladen…</div>}>
      <DecisionsPageInner />
    </Suspense>
  )
}

function DecisionsPageInner() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filterWrapRef = useRef<HTMLDivElement>(null)
  const risksWrapRef = useRef<HTMLDivElement>(null)
  const mobileFilterWrapRef = useRef<HTMLDivElement>(null)
  const mobileRisksWrapRef = useRef<HTMLDivElement>(null)

  const [navOpen, setNavOpen] = useState(false)

  const [decisions, setDecisions] = useState<Decision[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('open')
  const [projectScope, setProjectScope] = useState<string>(searchParams?.get('project') || 'all')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [risksOpen, setRisksOpen] = useState(false)
  const [usingDemo, setUsingDemo] = useState(false)
  const [openId, setOpenId] = useState<string | null>(searchParams?.get('open') || null)
  const [me, setMe] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  // Router cache can restore filter/risks sheets as "open" after returning from
  // a detail page — the invisible backdrop then blocks all taps on the list.
  const dismissSheets = useCallback(() => {
    setFilterMenuOpen(false)
    setRisksOpen(false)
    setNavOpen(false)
    setOpenId(null)
  }, [])

  useLayoutEffect(() => {
    dismissSheets()
  }, [pathname, dismissSheets])

  useEffect(() => {
    dismissSheets()
    function onDismiss() { dismissSheets() }
    window.addEventListener('festag:decisions-dismiss-overlays', onDismiss)
    return () => window.removeEventListener('festag:decisions-dismiss-overlays', onDismiss)
  }, [pathname, dismissSheets])

  useEffect(() => {
    function onPageShow() { dismissSheets() }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [dismissSheets])

  const load = useCallback(async () => {
    setLoading(true)
    const forceDemo = searchParams?.get('demo') === '1'
    const blockDemo = searchParams?.get('demo') === '0'

    if (forceDemo) {
      const demo = getDecisionDemoBundle()
      setUsingDemo(true)
      setDecisions(demo.decisions)
      setProjects(demo.projects)
      setLoading(false)
      return
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12_000)
      let res: Response
      try {
        res = await fetch('/api/decisions', { credentials: 'include', signal: controller.signal })
      } finally {
        clearTimeout(timeout)
      }
      const data = res.ok ? await res.json().catch(() => null) : null
      const apiRows: Decision[] = data?.decisions ?? []
      const showDemo = !blockDemo && apiRows.length === 0

      if (!res.ok || !data || showDemo) {
        if (!blockDemo) {
          const demo = getDecisionDemoBundle()
          setUsingDemo(true)
          setDecisions(demo.decisions)
          setProjects(demo.projects)
        } else {
          setUsingDemo(false)
          setDecisions(apiRows)
          setProjects({})
        }
        return
      }

      setUsingDemo(false)
      setDecisions(apiRows)

      const projIds = Array.from(new Set(apiRows.map((d: Decision) => d.project_id).filter(Boolean)))
      if (projIds.length) {
        const { data: projs } = await (supabase as any).from('projects').select('id,title,color,status,workspace_id').in('id', projIds)
        const map: Record<string, ProjectLite> = {}
        for (const p of (projs as ProjectLite[]) ?? []) map[p.id] = p
        setProjects(map)
      } else {
        setProjects({})
      }
    } catch {
      if (!blockDemo) {
        const demo = getDecisionDemoBundle()
        setUsingDemo(true)
        setDecisions(demo.decisions)
        setProjects(demo.projects)
      }
    } finally {
      setLoading(false)
    }
  }, [supabase, searchParams])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const open = searchParams?.get('open')
    setOpenId(open || null)
    const project = searchParams?.get('project')
    if (project) setProjectScope(project)
    if (searchParams?.get('tone') === 'risk') {
      setFilter('urgent')
      setRisksOpen(true)
    }
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
    if (!risksOpen) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      const inside =
        risksWrapRef.current?.contains(t) ||
        mobileRisksWrapRef.current?.contains(t)
      if (!inside) setRisksOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setRisksOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [risksOpen])

  function closeDrawer() {
    setOpenId(null)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('open')
    const qs = params.toString()
    router.replace(qs ? `/decisions?${qs}` : '/decisions', { scroll: false })
  }

  function applyProjectScope(next: string) {
    setProjectScope(next)
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (next === 'all') params.delete('project')
    else params.set('project', next)
    const qs = params.toString()
    router.replace(qs ? `/decisions?${qs}` : '/decisions', { scroll: false })
  }

  // Realtime — pick up new decisions live (skip while demo preview is active)
  useEffect(() => {
    if (!me || usingDemo) return
    const ch = (supabase as any)
      .channel(`decisions-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'decisions' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.requested_for === me || payload.new.created_by === me) {
            setDecisions(curr => curr.some(d => d.id === payload.new.id) ? curr : [payload.new, ...curr])
          }
        } else if (payload.eventType === 'UPDATE') {
          setDecisions(curr => curr.map(d => d.id === payload.new.id ? { ...d, ...payload.new } : d))
        }
      })
      .subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [supabase, me, usingDemo])

  const projectList = useMemo(
    () => Object.values(projects).sort((a, b) => a.title.localeCompare(b.title, 'de')),
    [projects]
  )
  const hasProjects = projectList.length > 0

  useEffect(() => {
    if (projectScope === 'all') return
    if (!projects[projectScope]) setProjectScope('all')
  }, [projectScope, projects])

  const scopedDecisions = useMemo(() => {
    if (projectScope === 'all') return decisions
    return decisions.filter(d => d.project_id === projectScope)
  }, [decisions, projectScope])

  const filtered = useMemo(() => {
    let xs = scopedDecisions
    if (filter === 'open')    xs = xs.filter(d => isOpenDecisionStatus(d.status))
    if (filter === 'urgent')  xs = xs.filter(d => isOpenDecisionStatus(d.status) && (d.urgency === 'high' || d.urgency === 'critical'))
    if (filter === 'decided') xs = xs.filter(d => d.status === 'decided')
    // Sort: open first by urgency, then due_date, then created_at
    const order = (d: Decision) => {
      if (!isOpenDecisionStatus(d.status)) return 100
      if (d.urgency === 'critical') return 0
      if (d.urgency === 'high')     return 1
      if (d.urgency === 'normal')   return 2
      return 3
    }
    return [...xs].sort((a, b) => {
      const ord = order(a) - order(b)
      if (ord !== 0) return ord
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity
      if (aDue !== bDue) return aDue - bDue
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [filter, scopedDecisions])

  const counts = useMemo(() => ({
    open: scopedDecisions.filter(d => isOpenDecisionStatus(d.status)).length,
    urgent: scopedDecisions.filter(d => isOpenDecisionStatus(d.status) && (d.urgency === 'high' || d.urgency === 'critical')).length,
    decided: scopedDecisions.filter(d => d.status === 'decided').length,
  }), [scopedDecisions])

  const risks = useMemo(
    () => deriveDecisionRisks(scopedDecisions, projects),
    [scopedDecisions, projects],
  )
  const hasCriticalRisks = risks.some(r => r.severity === 'critical')

  const openDecision = openId ? decisions.find(d => d.id === openId) ?? null : null

  function patchLocal(id: string, patch: Partial<Decision>) {
    if (isDecisionDemoId(id)) {
      setDecisions(curr => curr.map(d => d.id === id ? { ...d, ...patch } : d))
      return
    }
    setDecisions(curr => curr.map(d => d.id === id ? { ...d, ...patch } : d))
  }

  function removeLocal(id: string) {
    if (isDecisionDemoId(id)) {
      setDecisions(curr => curr.filter(d => d.id !== id))
      return
    }
    setDecisions(curr => curr.filter(d => d.id !== id))
  }

  const executiveSummary = useMemo(() => {
    const open = counts.open
    if (open === 0) {
      return {
        line1: 'Keine offenen Entscheidungen.',
        line2: 'Tagro überwacht deine Projekte und meldet sich bei Bedarf.',
      }
    }

    const openItems = filtered.filter(d => isOpenDecisionStatus(d.status))
    const urgentItems = openItems.filter(d => d.urgency === 'high' || d.urgency === 'critical')
    const top = urgentItems[0] || openItems[0]
    const topTitle = (top?.client_title || top?.title || '').toLowerCase()

    let line1 = 'Die wichtigste Entscheidung wartet auf deine Freigabe.'
    if (topTitle.includes('zahlung') || topTitle.includes('stripe') || topTitle.includes('payment')) {
      line1 = 'Die wichtigste Entscheidung betrifft die Zahlungsintegration der Festag Plattform.'
    } else if (top) {
      line1 = `Die wichtigste Entscheidung betrifft „${top.client_title || top.title}".`
    }

    const accelerators = openItems.filter(d => d.urgency !== 'low').length
    const hasCritical = openItems.some(d => d.urgency === 'critical' || (d.escalation_level ?? 0) >= 2)
    const line2 = hasCritical
      ? 'Mindestens eine Entscheidung sollte heute entschieden werden.'
      : accelerators >= 2
        ? 'Eine Freigabe würde den Projektfortschritt um etwa 4 Tage beschleunigen.'
        : 'Keine kritischen Risiken erkannt.'

    return { line1, line2 }
  }, [counts.open, filtered])

  const filterActive = filter !== 'open' || projectScope !== 'all'

  const mobileSubtitle = counts.open === 0
    ? executiveSummary.line2
    : executiveSummary.line1

  const tagroListHandler = () => openTagro({
    contextType: 'decision',
    id: 'list',
    projectId: projectScope !== 'all' ? projectScope : projectList[0]?.id,
    title: 'Entscheidungen · Übersicht',
    subtitle: `${counts.open} offen · ${counts.urgent} dringend`,
  })

  function renderFilterMenu() {
    if (!filterMenuOpen) return null
    return (
      <div className="dec-filter-menu" role="menu" aria-label="Filter">
        <p className="dec-m-sheet-title">Filtern</p>
        <p className="dec-filter-menu-label dec-dt">Status</p>
        {FILTERS.map(f => (
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
        {hasProjects && (
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
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DECISION_CSS }} />

      {(filterMenuOpen || risksOpen) && (
        <button
          type="button"
          className="dec-m-sheet-backdrop"
          aria-label="Schließen"
          onClick={dismissSheets}
        />
      )}

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-hero-bg dec-hero-bg-top" aria-hidden>
        <img src="/decisions/hero-top.png" alt="" />
      </div>
      <div className="dec-hero-bg dec-hero-bg-bottom" aria-hidden>
        <img src="/decisions/hero-bottom.png" alt="" />
      </div>

      <div className="dec-m-shell">
        <div className="dec-static-top">
        <div className="dec-legacy-mph">
          <MobilePageHeader
            title="Entscheidungen"
            menuItems={[
              { id: 'refresh', label: 'Aktualisieren', onClick: load },
              { id: 'tagro', label: 'Mit Tagro bearbeiten', onClick: tagroListHandler },
            ]}
          />
        </div>
        <header className="dec-page-head">
          <div className="dec-page-head-copy dec-m-title">
            <h1 className="dec-page-title">
              <span className="dec-dt">Entscheidungen</span>
              <span className="dec-m-t dec-m-sub">{mobileSubtitle}</span>
            </h1>
            <div className="dec-page-lead dec-dt">
              {counts.open === 0 ? (
                <>
                  <p className="dec-page-lead-line">{executiveSummary.line1}</p>
                  <p className="dec-page-lead-line">{executiveSummary.line2}</p>
                </>
              ) : (
                <>
                  <p className="dec-page-lead-line">{executiveSummary.line1}</p>
                  {executiveSummary.line2 ? (
                    <p className="dec-page-lead-line">{executiveSummary.line2}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>
          <div className="dec-m-head-actions">
            <CodexMobileActionPill
              onMenu={() => setNavOpen(true)}
              onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            />
          </div>
          <div className="dec-page-actions dec-dt">
            <div className="dec-page-actions-group">
              <div className="dec-filter-wrap" ref={filterWrapRef}>
                <button
                  type="button"
                  className={`dec-head-tool${filterMenuOpen || filterActive ? ' on' : ''}`}
                  title="Filter"
                  aria-label="Filter"
                  aria-expanded={filterMenuOpen}
                  onClick={() => {
                    setRisksOpen(false)
                    setFilterMenuOpen(v => !v)
                  }}
                >
                  <FunnelSimple size={15} weight="regular" />
                </button>
                {renderFilterMenu()}
              </div>
              <div className="dec-risks-wrap" ref={risksWrapRef}>
                <button
                  type="button"
                  className={`dec-head-tool dec-head-tool--risks${risksOpen ? ' on' : ''}`}
                  title="Risiken"
                  aria-label={risks.length ? `${risks.length} Risiken` : 'Risiken'}
                  aria-expanded={risksOpen}
                  onClick={() => {
                    setFilterMenuOpen(false)
                    setRisksOpen(v => !v)
                  }}
                >
                  <span className="dec-head-tool-ico">
                    <Lightning size={15} weight={risks.length ? 'fill' : 'regular'} />
                    {risks.length > 0 && (
                      <span
                        className={`dec-risks-badge${hasCriticalRisks ? ' dec-risks-badge--pulse' : ''}`}
                        aria-hidden
                      >
                        {risks.length > 9 ? '9+' : risks.length}
                      </span>
                    )}
                  </span>
                </button>
                {risksOpen && (
                  <DecisionRisksPopover
                    risks={risks}
                    openCount={counts.open}
                    onClose={() => setRisksOpen(false)}
                  />
                )}
              </div>
            </div>
            <button
              type="button"
              className="dec-head-tool"
              title="Aktualisieren"
              aria-label="Aktualisieren"
              onClick={load}
            >
              <ArrowsClockwise size={15} weight="regular" />
            </button>
          </div>
        </header>

        <div className="dec-m-actions">
          <div className="dec-m-risks-wrap" ref={mobileRisksWrapRef}>
            <button
              type="button"
              className={`dec-m-risks-btn${risksOpen ? ' on' : ''}${risks.length > 0 ? ' has-count' : ''}`}
              aria-label={risks.length ? `${risks.length} Risiken` : 'Risiken'}
              aria-expanded={risksOpen}
              onClick={() => {
                setFilterMenuOpen(false)
                setRisksOpen(v => !v)
              }}
            >
              <Lightning size={17} weight={risks.length ? 'fill' : 'regular'} />
              {risks.length > 0 && (
                <span
                  className={`dec-m-risks-count${hasCriticalRisks ? ' dec-m-risks-count--pulse' : ''}`}
                  aria-hidden
                >
                  {risks.length > 9 ? '9+' : risks.length}
                </span>
              )}
            </button>
            {risksOpen && (
              <DecisionRisksPopover
                risks={risks}
                openCount={counts.open}
                onClose={() => setRisksOpen(false)}
              />
            )}
          </div>
          <div className="dec-m-actions-group">
            <div className="dec-filter-wrap" ref={mobileFilterWrapRef}>
              <button
                type="button"
                className={`dec-m-ctl${filterMenuOpen ? ' on' : ''}${filterActive ? ' has-active' : ''}`}
                aria-label="Filter"
                aria-expanded={filterMenuOpen}
                onClick={() => {
                  setRisksOpen(false)
                  setFilterMenuOpen(v => !v)
                }}
              >
                <FunnelSimple size={17} weight="regular" />
              </button>
              {renderFilterMenu()}
            </div>
            <button
              type="button"
              className="dec-m-ctl"
              aria-label="Aktualisieren"
              onClick={load}
            >
              <ArrowsClockwise size={17} weight="regular" />
            </button>
          </div>
        </div>
      </div>

      <div className="dec-scroll-body">
        {usingDemo && (
          <div className="dec-demo-banner" role="status">
            <span>Vorschau mit Beispieldaten</span>
            <small>Leere Datenbank — echte Entscheidungen kommen aus dem Dev Panel. <code>?demo=0</code> blendet die Demo aus.</small>
          </div>
        )}
        {loading && filtered.length === 0 ? (
          <p className="dec-empty">Lade Entscheidungen…</p>
        ) : filtered.length === 0 ? (
          <div className="dec-empty">
            <FunnelSimple size={14} />
            <p>{decisions.length === 0 ? 'Noch keine Entscheidungen.' : 'Keine Entscheidungen in dieser Ansicht.'}</p>
            <small>
              {decisions.length === 0
                ? 'Wenn ein Developer eine Entscheidung anfordert, landet sie hier.'
                : 'Passe den Filter an oder wähle ein anderes Projekt.'}
            </small>
          </div>
        ) : filtered.map((d, i) => (
          <DecisionCardRow
            key={d.id}
            decision={d}
            project={d.project_id ? projects[d.project_id] : null}
            isLast={i === filtered.length - 1}
            onPatch={patchLocal}
            onRemove={removeLocal}
          />
        ))}
      </div>
      </div>

      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{
            contextType: 'decision',
            id: 'list',
            projectId: projectScope !== 'all' ? projectScope : projectList[0]?.id,
            title: 'Entscheidungen · Übersicht',
            subtitle: `${counts.open} offen · ${counts.urgent} dringend`,
          }}
        />
      </div>

      <MobilePageDock
        onDragUp={tagroListHandler}
        primary={{
          id: 'discuss',
          label: counts.open === 0 ? 'Mit Tagro besprechen...' : 'Entscheidungen besprechen...',
          icon: <Lightning size={14} weight="regular" />,
          onClick: tagroListHandler,
          ariaLabel: 'Mit Tagro besprechen',
        }}
        secondary={{
          id: 'tagro',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: tagroListHandler,
          ariaLabel: 'Mit Tagro bearbeiten',
        }}
      />

      {openDecision && (
        <DecisionDrawer
          decision={openDecision}
          project={openDecision.project_id ? projects[openDecision.project_id] : null}
          me={me}
          isDecider={openDecision.requested_for === me || (!openDecision.requested_for && openDecision.created_by !== me)}
          onClose={closeDrawer}
          onPatch={patch => patchLocal(openDecision.id, patch)}
        />
      )}
    </div>
  )
}
