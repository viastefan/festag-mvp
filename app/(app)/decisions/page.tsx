'use client'

/**
 * /decisions — the FESTAG decision board.
 *
 * One editorial list of the few things that genuinely need a human, threaded on
 * a single running path. Everything the v2 orchestration engine knows drives
 * the order and the words; only what helps someone decide is on screen, and the
 * grounds behind every recommendation are one click away rather than absent.
 *
 * Writes go through the existing endpoints (/decide, /delegate, /discuss), so
 * authority, propagation to tasks, and the audit trail stay server-side.
 */

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Check, FunnelSimple } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import {
  fmtAgo,
  getDecisionDemoBundle,
  isOpenDecisionStatus,
  type DecOption,
  type Decision,
  type ProjectLite,
} from '@/components/decisions/decisions-shared'
import { DecisionDrawer } from '@/components/decisions/DecisionDrawer'
import DecisionBoardRow, { type PathPosition, type RowAction } from '@/components/decisions/DecisionBoardRow'
import DecisionResolveSheet, { type ResolveStep } from '@/components/decisions/DecisionResolveSheet'
import DecisionFilterPopover, {
  EMPTY_FILTERS, VIEWS, applyDecisionFilters, countActiveFilters, matchesView,
  type DecisionFilters, type DecisionView,
} from '@/components/decisions/DecisionFilterPopover'
import { DECISION_BOARD_CSS, DECISION_SHEET_CSS } from '@/components/decisions/decision-board-styles'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { sortByAttention, tagroAnswerLine } from '@/lib/decisions/center'
import { buildDecisionHeadline } from '@/lib/decisions/headline'
import type { AffectedWork } from '@/lib/decisions/affected'

type Payload = {
  decisions: Decision[]
  projects: Record<string, ProjectLite>
  affected: Record<string, AffectedWork>
  recommendations: Record<string, DecOption>
}

const EMPTY_PAYLOAD: Payload = { decisions: [], projects: {}, affected: {}, recommendations: {} }

/** How long a completed decision holds its check before the row retracts. */
const COMPLETION_HOLD_MS = 5000

export default function DecisionsPage() {
  return (
    <Suspense fallback={<BoardShell><BoardSkeleton /></BoardShell>}>
      <DecisionsBoard />
    </Suspense>
  )
}

function BoardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dcb">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DECISION_BOARD_CSS }} />
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DECISION_SHEET_CSS }} />
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DECISION_CSS }} />
      <div className="dcb-inner">{children}</div>
    </div>
  )
}

function BoardSkeleton() {
  return (
    <>
      <div className="dcb-top">
        <div style={{ width: 'min(560px, 100%)' }}>
          <div className="dcb-skeleton-bar" style={{ height: 26, width: '92%' }} />
          <div className="dcb-skeleton-bar" style={{ height: 26, width: '58%' }} />
        </div>
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="dcb-skeleton">
          <div className="dcb-skeleton-bar" style={{ width: '38%' }} />
          <div className="dcb-skeleton-bar" style={{ width: '64%' }} />
          <div className="dcb-skeleton-bar" style={{ width: '22%' }} />
        </div>
      ))}
    </>
  )
}

function DecisionsBoard() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [data, setData] = useState<Payload>(EMPTY_PAYLOAD)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [usingDemo, setUsingDemo] = useState(false)
  const [me, setMe] = useState('')

  const [filters, setFilters] = useState<DecisionFilters>(EMPTY_FILTERS)
  const [filterAnchor, setFilterAnchor] = useState<DOMRect | null>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)

  const [autoOpen, setAutoOpen] = useState(false)
  /** Answered just now — the check is drawn and held before the row retracts. */
  const [completing, setCompleting] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ title: string; sub?: string } | null>(null)

  const [sheet, setSheet] = useState<{ id: string; step: ResolveStep } | null>(null)
  const [sheetOptions, setSheetOptions] = useState<DecOption[]>([])
  const [drawerId, setDrawerId] = useState<string | null>(searchParams?.get('open') || null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  useLayoutEffect(() => { setDrawerId(null); setSheet(null) }, [pathname])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    const forceDemo = searchParams?.get('demo') === '1'
    const blockDemo = searchParams?.get('demo') === '0'

    const demo = () => {
      const bundle = getDecisionDemoBundle()
      setUsingDemo(true)
      setData({
        decisions: bundle.decisions,
        projects: bundle.projects,
        affected: bundle.affected as Record<string, AffectedWork>,
        recommendations: {},
      })
    }

    if (forceDemo) { demo(); setLoading(false); return }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12_000)
      let res: Response
      try {
        res = await fetch('/api/decisions', { credentials: 'include', signal: controller.signal })
      } finally {
        clearTimeout(timeout)
      }

      if (!res.ok) {
        if (res.status !== 401) setLoadError(true)
        if (!blockDemo) demo()
        return
      }

      const body = await res.json().catch(() => null)
      const rows: Decision[] = body?.decisions ?? []

      if (!body) { setLoadError(true); if (!blockDemo) demo(); return }
      if (rows.length === 0 && !blockDemo) { demo(); return }

      setUsingDemo(false)
      setData({
        decisions: rows,
        projects: (body.projects ?? {}) as Record<string, ProjectLite>,
        affected: (body.affected ?? {}) as Record<string, AffectedWork>,
        recommendations: (body.recommendations ?? {}) as Record<string, DecOption>,
      })
    } catch {
      setLoadError(true)
      if (!blockDemo) demo()
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => { void load() }, [load])
  useEffect(() => { setDrawerId(searchParams?.get('open') || null) }, [searchParams])

  useEffect(() => {
    if (!me || usingDemo) return
    const ch = (supabase as any)
      .channel(`decisions-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'decisions' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.requested_for === me || payload.new.created_by === me) {
            setData(curr => curr.decisions.some(d => d.id === payload.new.id)
              ? curr
              : { ...curr, decisions: [payload.new, ...curr.decisions] })
          }
        } else if (payload.eventType === 'UPDATE') {
          setData(curr => ({
            ...curr,
            decisions: curr.decisions.map(d => d.id === payload.new.id ? { ...d, ...payload.new } : d),
          }))
        }
      })
      .subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [supabase, me, usingDemo])

  const canAct = useCallback((d: Decision) => {
    if (usingDemo || !me) return true
    return d.requested_for === me || (!d.requested_for && d.created_by !== me)
  }, [me, usingDemo])

  const blockedCount = useCallback(
    (id: string) => data.affected[id]?.blocks.length ?? 0,
    [data.affected],
  )

  /**
   * The visible set. A just-answered decision no longer matches the "Offen"
   * view, but it stays in its ranked slot for the completion beat so the check
   * is seen where the decision was — then it retracts.
   */
  const visible = useMemo(() => {
    const filtered = applyDecisionFilters(data.decisions, filters, blockedCount)
    const shown = new Set(filtered.map(d => d.id))
    const held = data.decisions.filter(d => completing.has(d.id) && !shown.has(d.id))
    return sortByAttention([...filtered, ...held])
  }, [data.decisions, filters, blockedCount, completing])

  const open = useMemo(
    () => data.decisions.filter(d => isOpenDecisionStatus(d.status)),
    [data.decisions],
  )

  const auto = useMemo(
    () => data.decisions.filter(d => !isOpenDecisionStatus(d.status) && d.tagro_delegation_reason),
    [data.decisions],
  )

  const headline = useMemo(() => buildDecisionHeadline({
    decisions: data.decisions,
    projects: data.projects,
    actionable: open.filter(canAct).length,
  }), [data.decisions, data.projects, open, canAct])

  /** Counts per tab, so the lifecycle is legible before clicking. */
  const viewCounts = useMemo(() => {
    const counts: Record<DecisionView, number> = {
      offen: 0, kritisch: 0, abgeschlossen: 0, archiviert: 0, alle: data.decisions.length,
    }
    for (const d of data.decisions) {
      for (const v of VIEWS) {
        if (v.id !== 'alle' && matchesView(d, v.id)) counts[v.id] += 1
      }
    }
    return counts
  }, [data.decisions])

  const activeFilters = countActiveFilters(filters)
  const projectFor = useCallback(
    (d: Decision) => (d.project_id ? data.projects[d.project_id] ?? null : null),
    [data.projects],
  )

  const recFor = useCallback((d: Decision): DecOption | null => {
    const fromApi = data.recommendations[d.id]
    if (fromApi) return fromApi
    const key = d.recommended_option
    if (!key || key === 'freeform') return null
    const needle = key.toLowerCase()
    const legacy = (d.options_json || []).find(
      o => o.id.toLowerCase() === needle || o.label.toLowerCase() === needle,
    )
    return legacy
      ? { id: legacy.id, external_id: legacy.id, label: legacy.label, client_label: legacy.label, description: legacy.hint ?? null, recommended_by_tagro: true }
      : null
  }, [data.recommendations])

  function patchLocal(id: string, patch: Partial<Decision>) {
    setData(curr => ({
      ...curr,
      decisions: curr.decisions.map(d => d.id === id ? { ...d, ...patch } : d),
    }))
  }

  const loadOptions = useCallback(async (d: Decision) => {
    const fallback = (d.options_json || []).map(o => ({ id: o.id, label: o.label, description: o.hint }))
    const rec = recFor(d)
    if (d.id.startsWith('mock-')) { setSheetOptions(fallback); return }
    setSheetOptions(rec ? [rec] : fallback)
    try {
      const res = await fetch(`/api/decisions/${d.id}?expand=options`, { credentials: 'include' })
      if (!res.ok) return
      const body = await res.json()
      const rows = Array.isArray(body?.options) ? (body.options as DecOption[]) : []
      if (rows.length > 0) setSheetOptions(rows)
      else if (fallback.length > 0) setSheetOptions(fallback)
    } catch {
      /* keep the fallback — the sheet stays usable offline */
    }
  }, [recFor])

  const handleAction = useCallback((d: Decision, action: RowAction) => {
    if (action === 'details') { router.push(`/decisions/${d.id}`); return }
    void loadOptions(d)
    setSheet({
      id: d.id,
      step: action === 'options' ? 'options' : action === 'why' ? 'why' : 'confirm',
    })
  }, [router, loadOptions])

  /**
   * A resolved decision confirms, holds its check for a beat, then retracts
   * into the closed view. The headline count follows immediately — the number
   * is the truth, the animation is the courtesy.
   */
  const handleResolved = useCallback((id: string, patch: Partial<Decision>) => {
    const stillOpen = patch.status ? isOpenDecisionStatus(patch.status) : true
    patchLocal(id, patch)
    setSheet(null)

    if (stillOpen) {
      setToast({ title: 'An Tagro zurückgegeben.', sub: 'Die Entscheidung wird neu aufbereitet.' })
      return
    }

    setCompleting(curr => new Set(curr).add(id))
    setToast({ title: 'Entscheidung getroffen.', sub: 'Tagro bereitet die nächsten Schritte vor.' })
    window.setTimeout(() => {
      setCompleting(curr => {
        const next = new Set(curr)
        next.delete(id)
        return next
      })
    }, COMPLETION_HOLD_MS)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(t)
  }, [toast])

  const sheetDecision = sheet ? data.decisions.find(d => d.id === sheet.id) ?? null : null
  const drawerDecision = drawerId ? data.decisions.find(d => d.id === drawerId) ?? null : null

  function closeDrawer() {
    setDrawerId(null)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('open')
    const qs = params.toString()
    router.replace(qs ? `/decisions?${qs}` : '/decisions', { scroll: false })
  }

  function pathPosition(i: number, total: number): PathPosition {
    if (total === 1) return 'single'
    if (i === 0) return 'first'
    if (i === total - 1) return 'last'
    return 'middle'
  }

  if (loading && data.decisions.length === 0) {
    return <BoardShell><BoardSkeleton /></BoardShell>
  }

  return (
    <BoardShell>
      <div className="dcb-top">
        <h1 className="dcb-h1">
          <span className="dcb-h1-line">
            {headline.primary.ink}{' '}
            <span className="dcb-h1-muted">{headline.primary.muted}</span>
          </span>
          {headline.secondary && (
            <span className="dcb-h1-line">
              {headline.secondary.ink}{' '}
              <span className="dcb-h1-muted">{headline.secondary.muted}</span>
            </span>
          )}
        </h1>
      </div>

      {usingDemo && (
        <DemoPreviewBanner note="Vorschau mit Beispieldaten — echte Entscheidungen kommen aus dem Execution Panel." />
      )}

      {loadError && (
        <p className="dcb-error" role="alert">
          Die Entscheidungen konnten nicht geladen werden.
          <button type="button" onClick={() => void load()}>Erneut versuchen</button>
        </p>
      )}

      {/* Lifecycle tabs left, filter as plain text right — no button chrome. */}
      <div className="dcb-bar">
        <div className="dcb-views" role="tablist" aria-label="Ansicht">
          {/* Every state stays visible even at zero — the lifecycle is part of
              understanding the system, not a list that hides when empty. */}
          {VIEWS.map(v => {
            const count = viewCounts[v.id]
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={filters.view === v.id}
                className={`dcb-view${filters.view === v.id ? ' is-on' : ''}${count === 0 ? ' is-empty' : ''}`}
                onClick={() => setFilters(f => ({ ...f, view: v.id }))}
              >
                {v.label}
                <span className="dcb-view-count">{count}</span>
              </button>
            )
          })}
        </div>

        <button
          ref={filterBtnRef}
          type="button"
          className={`dcb-filter${activeFilters > 0 ? ' is-on' : ''}`}
          onClick={() => setFilterAnchor(filterBtnRef.current?.getBoundingClientRect() ?? null)}
          aria-haspopup="dialog"
          aria-expanded={!!filterAnchor}
        >
          <FunnelSimple size={14} weight="regular" aria-hidden />
          Filter
          {activeFilters > 0 && <span className="dcb-filter-count">{activeFilters}</span>}
        </button>
      </div>

      {visible.length > 0 ? (
        <div className="dcb-list">
          {visible.map((d, i) => (
            <DecisionBoardRow
              key={d.id}
              decision={d}
              project={projectFor(d)}
              affected={data.affected[d.id]}
              recommended={recFor(d)}
              position={pathPosition(i, visible.length)}
              completing={completing.has(d.id)}
              canAct={canAct(d)}
              onAction={(action) => handleAction(d, action)}
            />
          ))}
        </div>
      ) : (
        <div className="dcb-empty">
          <p className="dcb-empty-title">
            {activeFilters > 0
              ? 'Keine Entscheidung passt zum Filter.'
              : filters.view === 'offen'
                ? 'Alles entschieden.'
                : 'Hier ist noch nichts.'}
          </p>
          <p className="dcb-empty-copy">
            {activeFilters > 0
              ? 'Setze den Filter zurück, um wieder alle zu sehen.'
              : filters.view === 'offen'
                ? 'Tagro hat aktuell nichts, das deine Aufmerksamkeit benötigt. Wir beobachten das Projekt weiter.'
                : 'Sobald Entscheidungen diesen Zustand erreichen, erscheinen sie hier.'}
          </p>
        </div>
      )}

      {auto.length > 0 && filters.view === 'offen' && (
        <section className="dcb-auto">
          <div className="dcb-auto-row">
            <span className="dcb-auto-check" aria-hidden><Check size={12} weight="bold" /></span>
            <span>
              {auto.length} {auto.length === 1 ? 'Entscheidung wurde' : 'Entscheidungen wurden'} von
              Tagro automatisch getroffen.
            </span>
            <button
              type="button"
              className="dcb-auto-link"
              onClick={() => setAutoOpen(o => !o)}
              aria-expanded={autoOpen}
            >
              {autoOpen ? 'Ausblenden' : 'Anzeigen'}
              <ArrowRight size={13} weight="regular" aria-hidden />
            </button>
          </div>

          {autoOpen && (
            <ul className="dcb-auto-list">
              {auto.map(d => (
                <li key={d.id} className="dcb-auto-item">
                  <button type="button" onClick={() => router.push(`/decisions/${d.id}`)}>
                    <span className="dcb-auto-item-title">{d.client_title || d.title}</span>
                    {' — '}
                    {tagroAnswerLine(d) || 'Von Tagro entschieden'}
                    {d.decided_at ? ` · ${fmtAgo(d.decided_at)}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {filterAnchor && (
        <DecisionFilterPopover
          decisions={data.decisions}
          projects={data.projects}
          value={filters}
          anchor={filterAnchor}
          onChange={setFilters}
          onClose={() => setFilterAnchor(null)}
        />
      )}

      {sheetDecision && sheet && (
        <DecisionResolveSheet
          decision={sheetDecision}
          project={projectFor(sheetDecision)}
          affected={data.affected[sheetDecision.id]}
          options={sheetOptions}
          recommended={recFor(sheetDecision) ?? sheetOptions.find(o => o.recommended_by_tagro) ?? null}
          initialStep={sheet.step}
          me={me}
          onClose={() => setSheet(null)}
          onResolved={(patch) => handleResolved(sheetDecision.id, patch)}
          onEscalateToDrawer={() => { setSheet(null); setDrawerId(sheetDecision.id) }}
        />
      )}

      {drawerDecision && (
        <DecisionDrawer
          decision={drawerDecision}
          project={projectFor(drawerDecision)}
          me={me}
          isDecider={canAct(drawerDecision)}
          onClose={closeDrawer}
          onPatch={(patch) => patchLocal(drawerDecision.id, patch)}
        />
      )}

      {toast && (
        <div className="dcb-toast" role="status" aria-live="polite">
          <Check size={14} weight="bold" aria-hidden />
          {toast.title}
          {toast.sub && <span className="dcb-toast-sub">{toast.sub}</span>}
        </div>
      )}
    </BoardShell>
  )
}
