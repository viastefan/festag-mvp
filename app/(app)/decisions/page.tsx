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

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowsClockwise, ChatCircleText, Check, CheckCircle, Clock, FunnelSimple,
  Sparkle, Warning, WarningCircle, X, UserCircle, CaretDown, Lightning, List,
} from '@phosphor-icons/react'
import MobilePageHeader from '@/components/MobilePageHeader'
import DecisionCardRow from '@/components/decisions/DecisionCardRow'
import TagroContentFab from '@/components/TagroContentFab'
import { openTagro } from '@/components/TagroOverlay'
import { createClient } from '@/lib/supabase/client'
import {
  type Decision, type ProjectLite, OPEN_STATES, URGENCY_LABEL, URGENCY_TONE,
  MOCK_DECISIONS, MOCK_PROJECTS,
} from '@/components/decisions/decisions-shared'
import { DecisionDrawer } from '@/components/decisions/DecisionDrawer'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'

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
  const searchParams = useSearchParams()

  const [decisions, setDecisions] = useState<Decision[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('open')
  const [projectScope, setProjectScope] = useState<string>(searchParams?.get('project') || 'all')
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(searchParams?.get('open') || null)
  const [me, setMe] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/decisions', { credentials: 'include' })
      if (!res.ok) return
      // Guard the JSON parse: if the session expired mid-session, fetch
      // may have followed a /login redirect and returned HTML — parsing
      // that as JSON used to throw and crash the whole (app) shell.
      const data = await res.json().catch(() => null)
      if (!data) return
      setDecisions(data.decisions ?? [])

      // Pull projects in one round-trip
      const projIds = Array.from(new Set((data.decisions ?? []).map((d: Decision) => d.project_id).filter(Boolean)))
      if (projIds.length) {
        const { data: projs } = await (supabase as any).from('projects').select('id,title,color,status,workspace_id').in('id', projIds)
        const map: Record<string, ProjectLite> = {}
        for (const p of (projs as ProjectLite[]) ?? []) map[p.id] = p
        setProjects(map)
      } else {
        setProjects({})
      }
    } catch {
      // Never let a transient fetch/parse error take down the page —
      // the empty state is a safe fallback.
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Realtime — pick up new decisions live
  useEffect(() => {
    if (!me) return
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
  }, [supabase, me])

  const projectList = useMemo(
    () => Object.values(projects).sort((a, b) => a.title.localeCompare(b.title, 'de')),
    [projects]
  )
  const scopedProject = projectScope === 'all' ? null : projects[projectScope] ?? null
  const scopeLabel = scopedProject?.title ?? 'Alle Projekte'
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
    if (filter === 'open')    xs = xs.filter(d => OPEN_STATES.has(d.status))
    if (filter === 'urgent')  xs = xs.filter(d => OPEN_STATES.has(d.status) && (d.urgency === 'high' || d.urgency === 'critical'))
    if (filter === 'decided') xs = xs.filter(d => d.status === 'decided')
    // Sort: open first by urgency, then due_date, then created_at
    const order = (d: Decision) => {
      if (!OPEN_STATES.has(d.status)) return 100
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
    open: scopedDecisions.filter(d => OPEN_STATES.has(d.status)).length,
    urgent: scopedDecisions.filter(d => OPEN_STATES.has(d.status) && (d.urgency === 'high' || d.urgency === 'critical')).length,
    decided: scopedDecisions.filter(d => d.status === 'decided').length,
  }), [scopedDecisions])

  const openDecision = openId ? decisions.find(d => d.id === openId) ?? null : null

  const useMock = !loading && decisions.length === 0
  const displayList = useMock ? MOCK_DECISIONS : filtered
  const displayProjects = useMock ? MOCK_PROJECTS : projects
  const displayCounts = useMock
    ? { open: MOCK_DECISIONS.length, urgent: MOCK_DECISIONS.filter(d => d.urgency === 'high' || d.urgency === 'critical').length, decided: 0 }
    : counts

  function removeLocal(id: string) {
    setDecisions(curr => curr.filter(d => d.id !== id))
  }

  function patchLocal(id: string, patch: Partial<Decision>) {
    setDecisions(curr => curr.map(d => d.id === id ? { ...d, ...patch } : d))
  }

  const executiveSummary = useMemo(() => {
    const open = displayCounts.open
    if (open === 0) {
      return {
        line1: 'Keine offenen Entscheidungen.',
        line2: 'Tagro überwacht deine Projekte und meldet sich bei Bedarf.',
      }
    }

    const openItems = displayList.filter(d => OPEN_STATES.has(d.status))
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
  }, [displayCounts.open, displayList])

  return (
    <div className="dec-os">
      <style>{DECISION_CSS}</style>

      <div className="dec-hero-bg dec-hero-bg-top" aria-hidden>
        <img src="/decisions/hero-top.png" alt="" />
      </div>
      <div className="dec-hero-bg dec-hero-bg-bottom" aria-hidden>
        <img src="/decisions/hero-bottom.png" alt="" />
      </div>

      <div className="dec-static-top">
        <MobilePageHeader
          title="Entscheidungen"
          menuItems={[
            { id: 'refresh', label: 'Aktualisieren', onClick: load },
            { id: 'tagro', label: 'Mit Tagro bearbeiten', onClick: () => openTagro({ contextType: 'decision', id: 'list', title: 'Entscheidungen · Übersicht', workspace: true }) },
          ]}
        />
        <header className="dec-page-head">
          <div className="dec-page-head-copy">
            <h1 className="dec-page-title">Entscheidungen</h1>
            <div className="dec-page-lead">
              <p>
                {displayCounts.open === 0
                  ? 'Keine Entscheidungen offen.'
                  : `Heute ${displayCounts.open === 1 ? 'ist' : 'sind'} ${displayCounts.open} Entscheidung${displayCounts.open === 1 ? '' : 'en'} offen.`}
              </p>
              {(executiveSummary.line1 || executiveSummary.line2) && (
                <p>{[executiveSummary.line1, executiveSummary.line2].filter(Boolean).join(' ')}</p>
              )}
            </div>
          </div>
          <div className="dec-page-actions">
            <div className="dec-page-actions-group">
              <button
                type="button"
                className="dec-head-tool"
                title="Filter"
                aria-label="Filter"
                onClick={() => setFilter(f => f === 'open' ? 'all' as Filter : 'open' as Filter)}
              >
                <List size={18} weight="regular" />
              </button>
              <button
                type="button"
                className="dec-head-tool"
                title="Tagro"
                aria-label="Tagro"
                onClick={() => openTagro({
                  contextType: 'decision',
                  id: 'list',
                  title: 'Entscheidungen · Übersicht',
                  subtitle: `${displayCounts.open} offen · ${displayCounts.urgent} dringend`,
                  workspace: true,
                })}
              >
                <Lightning size={18} weight="regular" />
              </button>
            </div>
            <button
              type="button"
              className="dec-head-tool"
              title="Aktualisieren"
              aria-label="Aktualisieren"
              onClick={load}
            >
              <svg width="14" height="3" viewBox="0 0 14 3" fill="none" aria-hidden><circle cx="2" cy="1.5" r="1.5" fill="currentColor"/><circle cx="7" cy="1.5" r="1.5" fill="currentColor"/><circle cx="12" cy="1.5" r="1.5" fill="currentColor"/></svg>
            </button>
          </div>
        </header>
      </div>

      <div className="dec-scroll-body">
        {loading && displayList.length === 0 ? (
          <p className="dec-empty">Lade Entscheidungen…</p>
        ) : displayList.length === 0 ? (
          <div className="dec-empty">
            <FunnelSimple size={14} />
            <p>Keine Entscheidungen in dieser Ansicht.</p>
            <small>Wenn ein Developer eine Entscheidung anfordert, landet sie hier.</small>
          </div>
        ) : displayList.map((d, i) => (
          <DecisionCardRow
            key={d.id}
            decision={d}
            project={d.project_id ? displayProjects[d.project_id] : null}
            isLast={i === displayList.length - 1}
            onPatch={patchLocal}
            onRemove={removeLocal}
          />
        ))}
      </div>

      <TagroContentFab
        context={{
          contextType: 'decision',
          id: 'list',
          title: 'Entscheidungen · Übersicht',
          subtitle: `${displayCounts.open} offen · ${displayCounts.urgent} dringend`,
          workspace: true,
        }}
      />

      {openDecision && (
        <DecisionDrawer
          decision={openDecision}
          project={openDecision.project_id ? projects[openDecision.project_id] : null}
          me={me}
          isDecider={openDecision.requested_for === me || (!openDecision.requested_for && openDecision.created_by !== me)}
          onClose={() => setOpenId(null)}
          onPatch={patch => patchLocal(openDecision.id, patch)}
        />
      )}
    </div>
  )
}
