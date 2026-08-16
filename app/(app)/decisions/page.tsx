'use client'

/**
 * /decisions — the FESTAG decision board.
 *
 * One editorial list of the few things that genuinely need a human. Everything
 * the v2 orchestration engine knows (urgency_score, escalation_level, due_at +
 * effective_due_source, reversibility, queued, auto-resolution) drives the
 * order and the words, but only the parts that help someone decide are on
 * screen — the rest lives one level deeper, in the resolve sheet and the
 * detail route.
 *
 * Writes go through the existing endpoints (/decide, /delegate, /discuss), so
 * authority, propagation to tasks, and the audit trail stay server-side.
 */

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Check, FunnelSimple, SlidersHorizontal } from '@phosphor-icons/react'
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
import DecisionBoardRow, { type RowAction } from '@/components/decisions/DecisionBoardRow'
import DecisionResolveSheet, { type ResolveStep } from '@/components/decisions/DecisionResolveSheet'
import DecisionFilterPopover, {
  EMPTY_FILTERS, applyDecisionFilters, countActiveFilters, type DecisionFilters,
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
      {children}
    </div>
  )
}

function BoardSkeleton() {
  return (
    <>
      <div className="dcb-top">
        <div style={{ width: 'min(520px, 100%)' }}>
          <div className="dcb-skeleton-bar" style={{ height: 26, width: '92%' }} />
          <div className="dcb-skeleton-bar" style={{ height: 26, width: '58%' }} />
        </div>
      </div>
      <p className="dcb-label">Offen</p>
      <div className="dcb-rule" />
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
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ title: string; sub?: string } | null>(null)

  // The focused resolve surface, and the full drawer it can escalate to.
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
        // 401 on a preview route is the signed-out case, not a failure.
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

  // Realtime — another user or the engine's tick can resolve a decision while
  // this list is open; the row updates rather than going stale.
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

  const { open, auto } = useMemo(() => {
    const openRows: Decision[] = []
    const autoRows: Decision[] = []
    for (const d of data.decisions) {
      if (isOpenDecisionStatus(d.status)) openRows.push(d)
      else if (d.tagro_delegation_reason) autoRows.push(d)
    }
    return { open: sortByAttention(openRows), auto: autoRows }
  }, [data.decisions])

  const visible = useMemo(
    () => applyDecisionFilters(open, filters, blockedCount),
    [open, filters, blockedCount],
  )

  const headline = useMemo(() => buildDecisionHeadline({
    decisions: data.decisions,
    projects: data.projects,
    actionable: open.filter(canAct).length,
  }), [data.decisions, data.projects, open, canAct])

  const activeFilters = countActiveFilters(filters)
  const projectFor = useCallback(
    (d: Decision) => (d.project_id ? data.projects[d.project_id] ?? null : null),
    [data.projects],
  )
  /**
   * The recommended option. The API resolves it for real rows; legacy rows and
   * the demo bundle still carry it as `recommended_option` + `options_json`.
   */
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

  // Opening the alternatives needs the real option rows; the list only carries
  // the recommended one.
  const loadOptions = useCallback(async (d: Decision) => {
    const fallback = (d.options_json || []).map(o => ({ id: o.id, label: o.label, description: o.hint }))
    const rec = recFor(d)
    if (d.id.startsWith('mock-')) {
      setSheetOptions(fallback)
      return
    }
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
    if (action === 'details') {
      router.push(`/decisions/${d.id}`)
      return
    }
    void loadOptions(d)
    setSheet({ id: d.id, step: action === 'options' ? 'options' : 'confirm' })
  }, [router, loadOptions])

  /**
   * A resolved decision leaves the board: confirm quietly, animate the row out,
   * then drop it from the open list. The headline count follows automatically.
   */
  const handleResolved = useCallback((id: string, patch: Partial<Decision>) => {
    const stillOpen = patch.status ? isOpenDecisionStatus(patch.status) : true
    patchLocal(id, patch)
    setSheet(null)

    if (stillOpen) {
      setToast({ title: 'An Tagro zurückgegeben.', sub: 'Die Entscheidung wird neu aufbereitet.' })
      return
    }

    setResolvingId(id)
    setToast({ title: 'Entscheidung freigegeben.', sub: 'Tagro bereitet die nächsten Schritte vor.' })
    window.setTimeout(() => setResolvingId(null), 460)
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

        <div className="dcb-tools">
          <button
            ref={filterBtnRef}
            type="button"
            className={`dcb-tool${activeFilters > 0 ? ' is-on' : ''}`}
            onClick={() => setFilterAnchor(filterBtnRef.current?.getBoundingClientRect() ?? null)}
            aria-haspopup="dialog"
            aria-expanded={!!filterAnchor}
          >
            <FunnelSimple size={15} weight="regular" aria-hidden />
            Filter
            {activeFilters > 0 && <span className="dcb-tool-count">{activeFilters}</span>}
          </button>
          <button
            type="button"
            className="dcb-tool dcb-tool--icon"
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            aria-label="Ansicht und Befehle"
          >
            <SlidersHorizontal size={15} weight="regular" aria-hidden />
          </button>
        </div>
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

      {visible.length > 0 ? (
        <>
          <p className="dcb-label">Offen</p>
          <div className="dcb-rule" />
          {visible.map((d, i) => (
            <DecisionBoardRow
              key={d.id}
              decision={d}
              project={projectFor(d)}
              affected={data.affected[d.id]}
              recommended={recFor(d)}
              index={i}
              resolving={resolvingId === d.id}
              canAct={canAct(d)}
              onAction={(action) => handleAction(d, action)}
            />
          ))}
        </>
      ) : (
        <div className="dcb-empty">
          <p className="dcb-empty-title">
            {open.length > 0 ? 'Keine Entscheidung passt zum Filter.' : 'Alles entschieden.'}
          </p>
          <p className="dcb-empty-copy">
            {open.length > 0
              ? 'Setze den Filter zurück, um alle offenen Entscheidungen zu sehen.'
              : 'Tagro hat aktuell nichts, das deine Aufmerksamkeit benötigt. Wir beobachten das Projekt weiter.'}
          </p>
        </div>
      )}

      {auto.length > 0 && (
        <section className="dcb-auto">
          <p className="dcb-label">Automatisch entschieden</p>
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
          decisions={open}
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
