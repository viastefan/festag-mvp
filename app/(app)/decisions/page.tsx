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

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowsClockwise, ChatCircleText, Check, CheckCircle, Clock, FunnelSimple,
  Sparkle, Warning, WarningCircle, X, UserCircle, CaretDown, Lightning, List,
} from '@phosphor-icons/react'
import FestagIconButton from '@/components/ui/FestagIconButton'
import FestagPillButton from '@/components/ui/FestagPillButton'
import MobilePageHeader from '@/components/MobilePageHeader'
import ClampedTip from '@/components/decisions/ClampedTip'
import { openTagro } from '@/components/TagroOverlay'
import { createClient } from '@/lib/supabase/client'

type Option = { id: string; label: string; hint?: string }

type ResponseType = 'binary' | 'single_choice' | 'multi_choice' | 'free_text'

type DecOption = {
  id: string
  external_id?: string | null
  ordinal?: number
  label: string
  client_label?: string | null
  description?: string | null
  technical_notes?: string | null
  implications_json?: Record<string, unknown> | null
  recommended_by_tagro?: boolean
}

type ResponseValue =
  | { selected_option_id: string }
  | { binary_value: 'yes' | 'no' }
  | { selected_option_ids: string[] }
  | { free_text: string }
  | null

export type Decision = {
  id: string
  project_id: string | null
  // Legacy + v1 framing — UI prefers client_* and falls back to title/description.
  title: string
  description: string | null
  client_title?: string | null
  client_summary?: string | null
  internal_title?: string | null
  internal_description?: string | null
  // Legacy unstructured options. New code uses `decision_options` rows via expand.
  options_json: Option[]
  recommended_option: string | null
  // Tagro signals
  tagro_reasoning: string | null
  tagro_run_at: string | null
  tagro_recommendation_reason?: string | null
  tagro_confidence_in_framing?: number | null
  // v1 typology + response shape
  decision_type?: string | null
  response_type?: ResponseType | null
  authority?: string | null
  delegate_allowed?: boolean | null
  // State + answer
  status: string
  selected_option: string | null
  decision_note: string | null
  response_value?: ResponseValue
  rationale?: string | null
  // Tagro delegation
  tagro_delegation_reason?: string | null
  override_window_until?: string | null
  // Lifecycle
  applied_at?: string | null
  // v2 orchestration (engine-derived). Optional so legacy rows render fine.
  reversibility?: 'two_way_door' | 'one_way_door' | 'unknown' | null
  auto_resolve_strategy?: 'tagro_default' | 'escalate_only' | 'hold' | null
  effective_due_source?: 'deadline_hard' | 'blocking_horizon' | 'deliberation_floor' | 'type_default' | null
  urgency_score?: number | null
  escalation_level?: number | null
  due_at?: string | null
  // Meta
  urgency: 'low' | 'normal' | 'high' | 'critical'
  due_date: string | null
  source_task_id: string | null
  created_by: string | null
  requested_for: string | null
  decided_by?: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
}

export type ProjectLite = { id: string; title: string; color?: string | null; status?: string | null; workspace_id?: string | null }

function mockDec(id: string, title: string, rec: string, type: string): Decision {
  return {
    id, project_id: 'mock-proj-1', title, description: 'Designphase kann abgeschlossen werden.',
    client_title: title, client_summary: 'Designphase kann abgeschlossen werden.',
    options_json: [{ id: rec.toLowerCase(), label: rec }, { id: 'alt', label: 'Ablehnen' }],
    recommended_option: rec.toLowerCase(),
    tagro_reasoning: 'Die aktuelle Farbvariante passt zur Branche und verbessert die Lesbarkeit um 17% auf der gesamten Nutzeroberfläche und....',
    tagro_run_at: new Date().toISOString(), status: 'pending_client', selected_option: null, decision_note: null,
    urgency: 'high', due_date: null, source_task_id: null, created_by: null, requested_for: null,
    decided_at: null, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString(),
    decision_type: type, response_type: 'single_choice',
  }
}
export const MOCK_DECISIONS: Decision[] = [
  mockDec('mock-1', 'Logo Farbe freigeben', 'Freigeben', 'Designentscheidung'),
  mockDec('mock-2', 'Zahlungsanbieter wählen', 'Stripe', 'Designentscheidung'),
  mockDec('mock-3', 'Zahlungsanbieter wählen', 'Stripe', 'Designentscheidung'),
  mockDec('mock-4', 'Domain-Strategie festlegen', 'Freigeben', 'Technische Entscheidung'),
  mockDec('mock-5', 'SEO Keywords bestätigen', 'Freigeben', 'Marketing-Entscheidung'),
  mockDec('mock-6', 'Hosting-Provider wählen', 'Vercel', 'Technische Entscheidung'),
  mockDec('mock-7', 'Content-Sprache festlegen', 'Freigeben', 'Strategieentscheidung'),
]

export const MOCK_PROJECTS: Record<string, ProjectLite> = {
  'mock-proj-1': { id: 'mock-proj-1', title: 'Festag Website Relaunch', color: '#5B647D', status: 'active' },
}

type Filter = 'open' | 'all' | 'decided' | 'urgent'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'open',    label: 'Offen' },
  { id: 'urgent',  label: 'Dringend' },
  { id: 'decided', label: 'Entschieden' },
  { id: 'all',     label: 'Alle' },
]

const URGENCY_LABEL: Record<string, string> = {
  low: 'Niedrig', normal: 'Normal', high: 'Hoch', critical: 'Kritisch',
}
const URGENCY_TONE: Record<string, 'good' | 'amber' | 'red' | 'muted'> = {
  low: 'muted', normal: 'muted', high: 'amber', critical: 'red',
}

const OPEN_STATES = new Set([
  'drafted', 'pending_client', 'awaiting_clarification',
  'open', 'waiting_for_client', 'in_progress',
])

const STATUS_LABEL: Record<string, string> = {
  drafted: 'Entwurf',
  pending_client: 'Wartet auf Freigabe',
  awaiting_clarification: 'Rückfrage offen',
  open: 'Wartet auf Freigabe',
  waiting_for_client: 'Wartet auf Freigabe',
  in_progress: 'In Arbeit',
  decided: 'Entschieden',
  applied: 'Umgesetzt',
  archived: 'Archiviert',
  rejected: 'Abgelehnt',
  superseded: 'Ersetzt',
  expired: 'Abgelaufen',
  cancelled: 'Abgebrochen',
  closed: 'Geschlossen',
}

const STATUS_TONE: Record<string, 'good' | 'amber' | 'red' | 'muted'> = {
  drafted: 'muted',
  pending_client: 'amber',
  awaiting_clarification: 'amber',
  open: 'amber',
  waiting_for_client: 'amber',
  in_progress: 'amber',
  decided: 'good',
  applied: 'good',
  archived: 'muted',
  rejected: 'red',
  superseded: 'muted',
  expired: 'muted',
  cancelled: 'muted',
  closed: 'muted',
}

function impactLine(d: Decision): string {
  const raw = d.client_summary || d.description
  if (!raw?.trim()) return 'Wird nach Freigabe umgesetzt.'
  return raw.trim()
}

function tagroSummaryLine(d: Decision): string {
  if (d.tagro_recommendation_reason?.trim()) return d.tagro_recommendation_reason.trim()
  const raw = d.tagro_reasoning?.trim()
  if (!raw) return 'Tagro analysiert diese Entscheidung und bereitet eine Empfehlung vor.'
  const clean = raw.replace(/\.{2,}$/, '').trim()
  if (/^tagro empfiehlt/i.test(clean)) return clean.charAt(0).toUpperCase() + clean.slice(1)
  return `Tagro empfiehlt ${clean.charAt(0).toLowerCase()}${clean.slice(1)}.`
}

function listStatusLabel(d: Decision): string {
  if (d.status === 'decided' || d.status === 'applied') return STATUS_LABEL[d.status] || 'Entschieden'
  if (OPEN_STATES.has(d.status)) return 'Wartet auf Freigabe'
  return STATUS_LABEL[d.status] || d.status
}

function fmtAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d} Tag${d === 1 ? '' : 'en'}`
  return new Date(iso).toLocaleDateString('de-DE')
}

function fmtDueIn(due: string | null) {
  if (!due) return null
  const ms = new Date(due).getTime() - Date.now()
  const d = Math.round(ms / (24 * 3600 * 1000))
  if (d < 0) return `${Math.abs(d)} Tag${Math.abs(d) === 1 ? '' : 'e'} überfällig`
  if (d === 0) return 'heute'
  if (d === 1) return 'morgen'
  return `in ${d} Tagen`
}

// Short Std/Min countdown for the 24h owner-override window. `nowTs` is passed
// in so the caller can re-render on a tick and keep it live.
function fmtCountdown(iso: string, nowTs: number): string {
  const ms = new Date(iso).getTime() - nowTs
  if (ms <= 0) return 'abgelaufen'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `noch ${m} Min`
  return `noch ${h} Std ${m} Min`
}

// German label for how the engine derived the deadline — keeps urgency legible.
const DUE_SOURCE_LABEL: Record<string, string> = {
  deadline_hard: 'feste Frist',
  blocking_horizon: 'blockiert Arbeit',
  deliberation_floor: 'Bedenkzeit',
  type_default: 'Standardfrist',
}

export default function DecisionsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--text-muted)' }}>Entscheidungen werden geladen…</div>}>
      <DecisionsPageInner />
    </Suspense>
  )
}

function DecisionsPageInner() {
  const router = useRouter()
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
            { id: 'tagro', label: 'Mit Tagro bearbeiten', onClick: () => openTagro({ contextType: 'decision', id: 'list', title: 'Entscheidungen · Übersicht' }) },
          ]}
        />
        <div className="dec-hero">
          <div className="dec-hero-text">
            <h1 className="dec-hero-title">
              {displayCounts.open === 0
                ? 'Keine Entscheidungen offen.'
                : `Heute ${displayCounts.open === 1 ? 'ist' : 'sind'} ${displayCounts.open} Entscheidung${displayCounts.open === 1 ? '' : 'en'} offen.`}
            </h1>
            <div className="dec-hero-sub">
              <p>{executiveSummary.line1}</p>
              <p>{executiveSummary.line2}</p>
            </div>
          </div>
          <div className="dec-hero-actions">
            <div className="dec-hero-actions-group">
              <FestagIconButton onClick={() => setFilter(f => f === 'open' ? 'all' as Filter : 'open' as Filter)} title="Filter" aria-label="Filter">
                <List size={14} weight="regular" />
              </FestagIconButton>
              <FestagIconButton
                onClick={() => openTagro({
                  contextType: 'decision',
                  id: 'list',
                  title: 'Entscheidungen · Übersicht',
                  subtitle: `${displayCounts.open} offen · ${displayCounts.urgent} dringend`,
                })}
                title="Tagro"
                aria-label="Tagro"
              >
                <Lightning size={14} weight="fill" />
              </FestagIconButton>
            </div>
            <FestagIconButton title="Aktualisieren" aria-label="Aktualisieren" onClick={load}>
              <svg width="14" height="3" viewBox="0 0 14 3" fill="none" aria-hidden><circle cx="2" cy="1.5" r="1.5" fill="currentColor"/><circle cx="7" cy="1.5" r="1.5" fill="currentColor"/><circle cx="12" cy="1.5" r="1.5" fill="currentColor"/></svg>
            </FestagIconButton>
          </div>
        </div>
        <div className="dec-divider-gradient" />
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
        ) : displayList.map((d, i) => {
          const proj = d.project_id ? displayProjects[d.project_id] : null
          const displayTitle = d.client_title || d.title
          const isOpen = OPEN_STATES.has(d.status)
          const isAnswered = d.status === 'decided' || d.status === 'applied'
          const tagroText = tagroSummaryLine(d)
          const impactText = impactLine(d)
          const timeNeeded = d.response_type === 'multi_choice' || d.response_type === 'ranked_choice'
            ? '2 Minuten'
            : '30 Sekunden'
          const secondaryLabel = d.response_type === 'binary' ? 'Ablehnen' : 'Optionen'
          const primaryLabel = isAnswered
            ? (d.selected_option || 'Entschieden')
            : d.recommended_option && d.recommended_option !== 'freeform'
              ? d.recommended_option
              : 'Freigeben'
          return (
            <div key={d.id}>
              <div className="dec-card">
                <div className="dec-card-left">
                  <div className="dec-card-title-block">
                    <p className="dec-card-title">{displayTitle}</p>
                    <p className="dec-card-project">{proj?.title || '—'}</p>
                  </div>
                  <div className="dec-card-type-pill">
                    <span className="dec-card-dot" style={{ background: proj?.color || '#5B647D' }} />
                    {d.decision_type || listStatusLabel(d)}
                  </div>
                </div>

                <div className="dec-card-mid">
                  <div className="dec-card-section">
                    <p className="dec-card-label">Tagro empfiehlt..</p>
                    <ClampedTip text={tagroText} lines={2} />
                  </div>
                  <div className="dec-card-section">
                    <p className="dec-card-label">Auswirkung</p>
                    <ClampedTip text={impactText} lines={2} />
                  </div>
                </div>

                <div className="dec-card-meta">
                  <div className="dec-card-section">
                    <p className="dec-card-label">Benötigte Zeit</p>
                    <p className="dec-card-muted">{timeNeeded}</p>
                  </div>
                  <div className="dec-card-section">
                    <p className="dec-card-label">Priorität</p>
                    <span className="dec-card-prio-pill">
                      {(d.escalation_level ?? 0) >= 2 && OPEN_STATES.has(d.status) && (
                        <WarningCircle size={11} weight="fill" style={{ marginRight: 4, color: 'var(--danger, #C2503E)', verticalAlign: '-1px' }} />
                      )}
                      {URGENCY_LABEL[d.urgency] || 'Normal'}
                    </span>
                  </div>
                </div>

                <div className="dec-card-actions">
                  <button className="dec-card-dots" type="button" onClick={(e) => { e.stopPropagation(); router.push(`/decisions/${d.id}`) }}>
                    <svg width="3" height="14" viewBox="0 0 3 14" fill="none"><circle cx="1.5" cy="2" r="1.5" fill="currentColor"/><circle cx="1.5" cy="7" r="1.5" fill="currentColor"/><circle cx="1.5" cy="12" r="1.5" fill="currentColor"/></svg>
                  </button>
                  {isOpen && !isAnswered && (
                    <FestagPillButton
                      variant="primary"
                      onClick={(e) => { e.stopPropagation(); router.push(`/decisions/${d.id}`) }}
                    >
                      {primaryLabel}
                    </FestagPillButton>
                  )}
                  {isOpen && !isAnswered && (
                    <FestagPillButton
                      block
                      onClick={(e) => { e.stopPropagation(); router.push(`/decisions/${d.id}`) }}
                    >
                      {secondaryLabel}
                    </FestagPillButton>
                  )}
                  <Link className="fui-pill-btn fui-pill-btn--block" href={`/decisions/${d.id}`}>
                    Details
                  </Link>
                </div>
              </div>
              {i < displayList.length - 1 && <div className="dec-divider-gradient" />}
            </div>
          )
        })}
      </div>

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

/* ─────────────────────────────────────────────────────────────
 * Drawer
 * ─────────────────────────────────────────────────────────── */

type WorkspaceMember = { id: string; full_name: string | null; email: string | null; avatar_url: string | null; role?: string | null }

export function DecisionDrawer({
  decision, project, me, isDecider, onClose, onPatch, variant = 'drawer',
}: {
  decision: Decision
  project: ProjectLite | null
  me: string
  isDecider: boolean
  onClose: () => void
  onPatch: (p: Partial<Decision>) => void
  variant?: 'drawer' | 'page'
}) {
  // Response type drives the answer form. Default to single_choice for
  // back-compat with legacy decisions where the field is null.
  const responseType: ResponseType = (decision.response_type as ResponseType) || 'single_choice'

  // Structured options live in decision_options (loaded via expand);
  // legacy options_json acts as a fallback for older decisions.
  const [structuredOptions, setStructuredOptions] = useState<DecOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  // Form state, keyed by response_type.
  const [selected, setSelected] = useState<string>(decision.selected_option || '')
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set())
  const [binaryValue, setBinaryValue] = useState<'yes' | 'no' | ''>('')
  const [note, setNote] = useState<string>(decision.decision_note || '')
  const [rationale, setRationale] = useState<string>('')

  // Action state.
  const [suggesting, setSuggesting] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [delegating, setDelegating] = useState(false)
  const [discussing, setDiscussing] = useState(false)
  const [discussOpen, setDiscussOpen] = useState(false)
  const [discussQuestion, setDiscussQuestion] = useState('')
  const [error, setError] = useState<string>('')

  // Live clock for the override-window countdown. Ticks once a minute and only
  // while a window is actually open — no idle timers otherwise.
  const [nowTs, setNowTs] = useState(() => Date.now())
  useEffect(() => {
    if (!decision.override_window_until) return
    const id = setInterval(() => setNowTs(Date.now()), 30000)
    return () => clearInterval(id)
  }, [decision.override_window_until])

  // ── Delegation to a teammate (e.g. a co-founder once a team exists) ──
  const supabase = useMemo(() => createClient(), [])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)

  // Load the workspace members of this decision's project so the decider can
  // hand the decision to a specific teammate. RLS gates non-members.
  useEffect(() => {
    const wsId = project?.workspace_id
    if (!wsId) { setMembers([]); return }
    let cancelled = false
    ;(async () => {
      const { data: rows } = await (supabase as any)
        .from('workspace_members').select('user_id').eq('workspace_id', wsId)
      const ids = Array.from(new Set(((rows ?? []) as any[]).map(r => r.user_id))).filter(Boolean)
      if (!ids.length) { if (!cancelled) setMembers([]); return }
      const { data: profs } = await (supabase as any)
        .from('profiles').select('id,full_name,email,avatar_url,role').in('id', ids)
      if (!cancelled) setMembers(((profs ?? []) as WorkspaceMember[]))
    })()
    return () => { cancelled = true }
  }, [project?.workspace_id, supabase])

  async function assignTo(userId: string) {
    if (assigning) return
    setAssigning(true); setError('')
    try {
      const res = await fetch(`/api/decisions/${decision.id}/assign`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_id: userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data?.reason || 'Zuweisung gerade nicht möglich.'); return }
      onPatch(data.decision)
      setAssignOpen(false)
    } finally {
      setAssigning(false)
    }
  }

  // Pre-populate from existing response_value when re-opening a decided
  // decision.
  useEffect(() => {
    if (!decision.response_value) return
    const rv = decision.response_value as any
    if ('selected_option_id' in rv) setSelected(String(rv.selected_option_id))
    if ('binary_value' in rv) setBinaryValue(rv.binary_value === 'no' ? 'no' : 'yes')
    if ('selected_option_ids' in rv && Array.isArray(rv.selected_option_ids)) setMultiSelected(new Set(rv.selected_option_ids))
    if ('free_text' in rv && typeof rv.free_text === 'string') setNote(rv.free_text)
  }, [decision.response_value])

  useEffect(() => {
    if (variant === 'page') return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, variant])

  // Pull structured options when drawer opens.
  useEffect(() => {
    let abort = false
    setOptionsLoading(true)
    fetch(`/api/decisions/${decision.id}?expand=options`, { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (abort) return
        const rows = Array.isArray(data?.options) ? data.options as DecOption[] : []
        setStructuredOptions(rows)
      })
      .finally(() => { if (!abort) setOptionsLoading(false) })
    return () => { abort = true }
  }, [decision.id])

  async function runTagro() {
    if (suggesting) return
    setSuggesting(true); setError('')
    try {
      const res = await fetch(`/api/decisions/${decision.id}/suggest`, { method: 'POST', credentials: 'include' })
      if (!res.ok) { setError('Tagro konnte gerade nicht antworten.'); return }
      const data = await res.json()
      onPatch({
        recommended_option: data.recommended_option || null,
        tagro_reasoning: data.reasoning || '',
        tagro_run_at: new Date().toISOString(),
        urgency: data.urgency_hint || decision.urgency,
      } as Partial<Decision>)
    } finally {
      setSuggesting(false)
    }
  }

  async function applyTagro() {
    if (decision.recommended_option && decision.recommended_option !== 'freeform') {
      setSelected(decision.recommended_option)
    }
  }

  // Build response_value from the active form state.
  function buildResponseValue(): ResponseValue {
    switch (responseType) {
      case 'binary':
        if (binaryValue === 'yes' || binaryValue === 'no') return { binary_value: binaryValue }
        return null
      case 'single_choice':
        return selected ? { selected_option_id: selected } : null
      case 'multi_choice':
        return multiSelected.size > 0 ? { selected_option_ids: Array.from(multiSelected) } : null
      case 'free_text':
        return note.trim() ? { free_text: note.trim() } : null
      default:
        return null
    }
  }

  async function submitDecision() {
    if (deciding) return
    const responseValue = buildResponseValue()
    if (!responseValue) {
      setError(responseType === 'free_text' ? 'Schreibe eine Antwort.' : 'Wähle eine Option.')
      return
    }
    setDeciding(true); setError('')
    try {
      const res = await fetch(`/api/decisions/${decision.id}/decide`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_value: responseValue,
          rationale: rationale.trim() || undefined,
          // Legacy mirrors for older /decide expectations.
          selected_option:
            'selected_option_id' in responseValue ? responseValue.selected_option_id
            : 'binary_value' in responseValue ? responseValue.binary_value
            : null,
          decision_note:
            'free_text' in responseValue ? responseValue.free_text
            : rationale.trim() || null,
        }),
      })
      if (!res.ok) { setError('Konnte nicht speichern.'); return }
      const data = await res.json()
      onPatch(data.decision)
      onClose()
    } finally {
      setDeciding(false)
    }
  }

  async function delegateToTagro() {
    if (delegating) return
    setDelegating(true); setError('')
    try {
      const res = await fetch(`/api/decisions/${decision.id}/delegate`, {
        method: 'POST', credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.reason || 'Delegation gerade nicht möglich.')
        return
      }
      const data = await res.json()
      onPatch(data.decision)
      onClose()
    } finally {
      setDelegating(false)
    }
  }

  async function submitDiscuss() {
    if (discussing || !discussQuestion.trim()) return
    setDiscussing(true); setError('')
    try {
      const res = await fetch(`/api/decisions/${decision.id}/discuss`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: discussQuestion.trim() }),
      })
      if (!res.ok) { setError('Rückfrage konnte nicht gesendet werden.'); return }
      const data = await res.json()
      onPatch(data.decision)
      setDiscussOpen(false)
      setDiscussQuestion('')
    } finally {
      setDiscussing(false)
    }
  }

  // Use structured options when present, fall back to legacy.
  const renderOptions: DecOption[] = structuredOptions.length > 0
    ? structuredOptions
    : (decision.options_json || []).map((o) => ({ id: o.id, label: o.label, description: o.hint }))

  const tagroRec = decision.recommended_option
  const isAnswered = decision.status === 'decided' || decision.status === 'applied'
  const isDelegated = !!decision.tagro_delegation_reason && !decision.decided_by
  const isAwaitingClarification = decision.status === 'awaiting_clarification'
  // Delegation is offered only on a reversible (two-way door) decision — the
  // engine never auto-resolves a one-way door, so neither does the client.
  const canDelegate =
    !!decision.delegate_allowed &&
    decision.reversibility === 'two_way_door' &&
    responseType !== 'free_text' &&
    !isAnswered &&
    isDecider
  // Escalation badge: level 2 = raised to owner, level 3 = auto-resolved/locked.
  const escalationLevel = decision.escalation_level ?? 0
  const isEscalated = escalationLevel >= 2 && !isAnswered

  const panelBody = (
    <>
        <header className="dec-drawer-head">
          <div className="dec-drawer-meta">
            <span className="dec-kicker">Entscheidung</span>
            <span className="dec-saved">
              {project && <><span className="dec-row-dot" style={{ background: project.color || 'var(--text-muted)' }} /> {project.title} · </>}
              {fmtAgo(decision.updated_at)}
            </span>
          </div>
          <div className="dec-drawer-actions">
            {/* Per-decision Tagro entry — preloaded with this decision id+title. */}
            <button
              className="dec-tagro-cta"
              type="button"
              onClick={() => openTagro({
                contextType: 'decision',
                id: decision.id,
                title: decision.client_title || decision.title,
                subtitle: project?.title,
              })}
            >
              Mit Tagro bearbeiten
            </button>
            <button className="dec-icon-btn" onClick={onClose} title={variant === 'page' ? 'Zurück' : 'Schließen'} type="button">
              <X size={13} />
            </button>
          </div>
        </header>

        <div className="dec-drawer-body">
          <h2 className="dec-d-title">{decision.client_title || decision.title}</h2>
          {(decision.client_summary || decision.description) && (
            <p className="dec-d-desc">{decision.client_summary || decision.description}</p>
          )}

          <div className="dec-d-meta">
            <span className={`dec-pill tone-${URGENCY_TONE[decision.urgency] || 'muted'}`}>
              Dringlichkeit: {URGENCY_LABEL[decision.urgency] || 'Normal'}
              {typeof decision.urgency_score === 'number' && (
                <strong style={{ marginLeft: 5, fontWeight: 500, opacity: 0.7 }}>
                  {Math.round(decision.urgency_score)}
                </strong>
              )}
            </span>
            {isEscalated && (
              <span className="dec-pill tone-red">
                <WarningCircle size={10} weight="fill" />
                {escalationLevel >= 3 ? 'Frist abgelaufen' : 'An Owner eskaliert'}
              </span>
            )}
            {(decision.due_at || decision.due_date) && (
              <span className="dec-pill tone-muted">
                <Clock size={10} /> {fmtDueIn(decision.due_at || decision.due_date)}
                {decision.effective_due_source && DUE_SOURCE_LABEL[decision.effective_due_source] && (
                  <span style={{ opacity: 0.6 }}> · {DUE_SOURCE_LABEL[decision.effective_due_source]}</span>
                )}
              </span>
            )}
            {isAnswered && (
              <span className="dec-pill tone-good">
                <CheckCircle size={10} weight="fill" />
                {decision.status === 'applied' ? 'Umgesetzt' : 'Entschieden'}
              </span>
            )}
            {isDelegated && (
              <span className="dec-pill tone-muted">
                <Sparkle size={10} weight="fill" /> Von Tagro entschieden
              </span>
            )}
            {isAwaitingClarification && (
              <span className="dec-pill tone-amber">
                <ChatCircleText size={10} /> Rückfrage
              </span>
            )}
          </div>

          {isAwaitingClarification && (
            <div className="dec-clarification">
              Diese Entscheidung wartet aktuell auf eine Klärung. Tagro überarbeitet die Optionen, sobald die offene Frage beantwortet ist.
            </div>
          )}

          {/* Tagro suggestion panel */}
          <section className="dec-tagro">
            <header className="dec-tagro-head">
              <div>
                <span className="dec-tagro-kicker"><Sparkle size={11} weight="fill" /> Tagro-Empfehlung</span>
                {decision.tagro_run_at
                  ? <span className="dec-tagro-time">Zuletzt {fmtAgo(decision.tagro_run_at)}</span>
                  : <span className="dec-tagro-time">Noch nicht analysiert</span>}
              </div>
              <button className="dec-tagro-run" type="button" onClick={runTagro} disabled={suggesting}>
                <ArrowsClockwise size={11} className={suggesting ? 'dec-spin' : ''} />
                {suggesting ? 'Tagro liest…' : decision.tagro_run_at ? 'Neu analysieren' : 'Tagro analysieren'}
              </button>
            </header>

            {!decision.tagro_run_at && !suggesting && (
              <p className="dec-tagro-empty">Lass Tagro die Optionen einmal durchgehen — bekommt einen ruhigen Vorschlag mit Begründung.</p>
            )}

            {decision.tagro_reasoning && (
              <div className="dec-tagro-rec">
                {tagroRec && tagroRec !== 'freeform' && (
                  <div className="dec-tagro-pick">
                    <strong>Empfohlene Option:</strong> {renderOptions.find((o) => (o.external_id || o.id) === tagroRec)?.client_label
                      || renderOptions.find((o) => (o.external_id || o.id) === tagroRec)?.label
                      || tagroRec}
                  </div>
                )}
                <p className="dec-tagro-text">{decision.tagro_reasoning}</p>
                {tagroRec && tagroRec !== 'freeform' && !isAnswered && isDecider && (
                  <button type="button" className="dec-tagro-apply" onClick={applyTagro}>
                    Tagros Vorschlag übernehmen
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Answer form */}
          {isDecider && !isAnswered && (
            <section className="dec-answer">
              <p className="dec-answer-label">Deine Antwort</p>

              {responseType === 'binary' && (
                <div className="dec-binary">
                  <button
                    type="button"
                    className={`dec-binary-btn${binaryValue === 'yes' ? ' on' : ''}`}
                    onClick={() => setBinaryValue('yes')}
                  >Ja</button>
                  <button
                    type="button"
                    className={`dec-binary-btn${binaryValue === 'no' ? ' on' : ''}`}
                    onClick={() => setBinaryValue('no')}
                  >Nein</button>
                </div>
              )}

              {responseType === 'single_choice' && renderOptions.length > 0 && (
                <div className="dec-options">
                  {renderOptions.map((o) => {
                    const id = o.external_id || o.id
                    const isRec = o.recommended_by_tagro || tagroRec === id
                    return (
                      <label key={o.id} className={`dec-option${selected === id ? ' on' : ''}${isRec ? ' tagro' : ''}`}>
                        <input
                          type="radio"
                          name="dec-option"
                          value={id}
                          checked={selected === id}
                          onChange={() => setSelected(id)}
                        />
                        <span className="dec-option-body">
                          <strong>{o.client_label || o.label}</strong>
                          {(o.description || (o as any).hint) && <small>{o.description || (o as any).hint}</small>}
                        </span>
                        {isRec && <span className="dec-option-tagro"><Sparkle size={10} weight="fill" /> Tagro</span>}
                      </label>
                    )
                  })}
                </div>
              )}

              {responseType === 'multi_choice' && renderOptions.length > 0 && (
                <div className="dec-options">
                  {renderOptions.map((o) => {
                    const id = o.external_id || o.id
                    const checked = multiSelected.has(id)
                    const isRec = o.recommended_by_tagro || tagroRec === id
                    return (
                      <label key={o.id} className={`dec-option${checked ? ' on' : ''}${isRec ? ' tagro' : ''}`}>
                        <input
                          type="checkbox"
                          value={id}
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(multiSelected)
                            if (e.target.checked) next.add(id); else next.delete(id)
                            setMultiSelected(next)
                          }}
                        />
                        <span className="dec-option-body">
                          <strong>{o.client_label || o.label}</strong>
                          {(o.description || (o as any).hint) && <small>{o.description || (o as any).hint}</small>}
                        </span>
                        {isRec && <span className="dec-option-tagro"><Sparkle size={10} weight="fill" /> Tagro</span>}
                      </label>
                    )
                  })}
                </div>
              )}

              {responseType === 'free_text' && (
                <textarea
                  className="dec-note"
                  placeholder="Schreib hier deine Antwort…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              )}

              {responseType !== 'free_text' && (
                <textarea
                  className="dec-note dec-rationale"
                  placeholder="Optional: kurze Begründung…"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                />
              )}

              {error && <p className="dec-error"><Warning size={11} /> {error}</p>}

              <div className="dec-answer-actions">
                <button type="button" className="dec-primary" onClick={submitDecision} disabled={deciding}>
                  <CheckCircle size={12} weight="bold" />
                  {deciding ? 'Speichere…' : 'Entscheidung absenden'}
                </button>
                {canDelegate && (
                  <button type="button" className="dec-secondary" onClick={delegateToTagro} disabled={delegating}>
                    <Sparkle size={11} weight="fill" />
                    {delegating ? 'Tagro entscheidet…' : 'Tagro entscheiden lassen'}
                  </button>
                )}
                {!isAwaitingClarification && (
                  <button type="button" className="dec-secondary dec-secondary-quiet" onClick={() => setDiscussOpen((v) => !v)}>
                    <ChatCircleText size={11} />
                    Diskutieren
                  </button>
                )}
                {isDecider && members.length > 0 && (
                  <div className="dec-assign-wrap">
                    <button
                      type="button"
                      className="dec-secondary dec-secondary-quiet"
                      onClick={() => setAssignOpen((v) => !v)}
                      disabled={assigning}
                    >
                      <UserCircle size={12} />
                      {assigning ? 'Weise zu…' : 'Zuweisen'}
                      <CaretDown size={10} />
                    </button>
                    {assignOpen && (
                      <div className="dec-assign-menu" role="menu">
                        <p className="dec-assign-head">An Teammitglied übergeben</p>
                        {members.map((m) => {
                          const name = m.full_name || m.email || 'Teammitglied'
                          const isCurrent = decision.requested_for === m.id
                          return (
                            <button
                              key={m.id}
                              type="button"
                              className={`dec-assign-opt${isCurrent ? ' on' : ''}`}
                              onClick={() => assignTo(m.id)}
                              disabled={assigning || isCurrent}
                            >
                              <span className="dec-assign-av">
                                {m.avatar_url ? <img src={m.avatar_url} alt="" /> : (name[0] || '·').toUpperCase()}
                              </span>
                              <span className="dec-assign-name">
                                {name}{m.id === me ? ' (du)' : ''}
                                {m.role ? <small>{m.role}</small> : null}
                              </span>
                              {isCurrent && <Check size={12} weight="bold" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {discussOpen && (
                <div className="dec-discuss">
                  <textarea
                    className="dec-note"
                    placeholder="Worum geht es noch? Tagro nimmt die Frage auf und schärft das Framing."
                    value={discussQuestion}
                    onChange={(e) => setDiscussQuestion(e.target.value)}
                  />
                  <div className="dec-discuss-actions">
                    <button
                      type="button"
                      className="dec-secondary"
                      onClick={submitDiscuss}
                      disabled={discussing || !discussQuestion.trim()}
                    >
                      {discussing ? 'Sende…' : 'Rückfrage absenden'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {isAnswered && (
            <section className="dec-final">
              <p className="dec-answer-label">
                {isDelegated ? 'Von Tagro getroffene Entscheidung' : 'Getroffene Entscheidung'}
              </p>
              {renderResponseValue(decision, renderOptions)}
              {(decision.rationale || decision.decision_note) && (
                <p className="dec-final-note">{decision.rationale || decision.decision_note}</p>
              )}
              {isDelegated && decision.tagro_delegation_reason && (
                <p className="dec-final-note dec-delegation-reason">
                  <Sparkle size={11} weight="fill" /> {decision.tagro_delegation_reason}
                </p>
              )}
              {isDelegated && decision.override_window_until && (() => {
                const expired = new Date(decision.override_window_until).getTime() <= nowTs
                return (
                  <small className={`dec-final-meta dec-override-window${expired ? ' expired' : ''}`}>
                    <Clock size={10} />
                    {expired
                      ? 'Override-Fenster geschlossen — die Entscheidung steht.'
                      : <>Override offen ({fmtCountdown(decision.override_window_until, nowTs)}) — bis {new Date(decision.override_window_until).toLocaleString('de-DE')} überstimmbar.</>}
                  </small>
                )
              })()}
              <small className="dec-final-meta">
                {decision.decided_at && `Entschieden ${fmtAgo(decision.decided_at)}`}
                {decision.applied_at && ` · umgesetzt ${fmtAgo(decision.applied_at)}`}
              </small>
            </section>
          )}

          {!isDecider && !isAnswered && (
            <p className="dec-empty" style={{ marginTop: 18 }}>
              Warte auf Antwort des Entscheiders. Du kannst hier nichts beantworten —
              du hast die Entscheidung angefordert.
            </p>
          )}
        </div>
    </>
  )

  if (variant === 'page') {
    return (
      <div className="dec-detail-page">
        <aside className="dec-detail-panel">
          {panelBody}
        </aside>
      </div>
    )
  }

  return (
    <div className="dec-overlay" role="dialog" aria-modal="true">
      <div className="dec-backdrop" onClick={onClose} />
      <aside className="dec-panel">
        {panelBody}
      </aside>
    </div>
  )
}

function renderResponseValue(decision: Decision, options: DecOption[]) {
  const rv = decision.response_value as any
  if (!rv) {
    // Legacy fallback.
    if (decision.selected_option && decision.selected_option !== 'freeform') {
      const match = options.find((o) => (o.external_id || o.id) === decision.selected_option)
      return (
        <div className="dec-final-pick">
          <CheckCircle size={12} weight="fill" />
          {match?.client_label || match?.label || decision.selected_option}
        </div>
      )
    }
    return null
  }
  if ('binary_value' in rv) {
    return (
      <div className="dec-final-pick">
        <CheckCircle size={12} weight="fill" />
        {rv.binary_value === 'yes' ? 'Ja' : 'Nein'}
      </div>
    )
  }
  if ('selected_option_id' in rv) {
    const match = options.find((o) => (o.external_id || o.id) === rv.selected_option_id)
    return (
      <div className="dec-final-pick">
        <CheckCircle size={12} weight="fill" />
        {match?.client_label || match?.label || rv.selected_option_id}
      </div>
    )
  }
  if ('selected_option_ids' in rv && Array.isArray(rv.selected_option_ids)) {
    return (
      <div className="dec-final-multi">
        {rv.selected_option_ids.map((id: string) => {
          const match = options.find((o) => (o.external_id || o.id) === id)
          return (
            <span key={id} className="dec-final-pick">
              <CheckCircle size={12} weight="fill" />
              {match?.client_label || match?.label || id}
            </span>
          )
        })}
      </div>
    )
  }
  if ('free_text' in rv) {
    return <p className="dec-final-text">{rv.free_text}</p>
  }
  return null
}

export const DECISION_CSS = `
  .dec-os {
    --dec-soft: var(--portal-soft, #8f93a4);
    --dec-dark: var(--portal-text, #0f0f10);
    --dec-card-bg: var(--portal-card, #fff);
    width:100%; height:100%; min-height:0; color:var(--dec-dark);
    display:flex; flex-direction:column;     overflow:hidden;
    letter-spacing:0;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-weight:400;
    position:relative;
  }
  .dec-hero-bg {
    position:absolute; left:0; right:0; pointer-events:none; z-index:0;
    overflow:hidden;
  }
  .dec-hero-bg img { width:100%; height:100%; object-fit:cover; display:block; }
  .dec-hero-bg-top { top:0; height:255px; }
  .dec-hero-bg-bottom { bottom:0; height:129px; }
  .dec-static-top, .dec-scroll-body { position:relative; z-index:1; }

  .dec-static-top {
    flex:0 0 auto; position:sticky; top:0; z-index:8;
    background:var(--dec-card-bg); padding:64px 164px 0;
  }
  .dec-static-top::after {
    content:''; display:block; position:absolute;
    left:0; right:0; bottom:-48px; height:48px;
    background:linear-gradient(to bottom, var(--dec-card-bg) 0%, color-mix(in srgb, var(--dec-card-bg) 92%, transparent) 40%, transparent 100%);
    pointer-events:none;
  }

  .dec-hero { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; padding-bottom:24px; }
  .dec-hero-text { max-width:600px; flex:1; min-width:0; }
  .dec-hero-title {
    margin:0; font-size:30px; font-weight:500; color:var(--dec-dark);
    letter-spacing:-0.01em; line-height:1.2;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .dec-hero-sub { margin-top:16px; display:flex; flex-direction:column; gap:4px; }
  .dec-hero-sub p {
    margin:0; font-size:20px; font-weight:400; color:var(--dec-soft);
    line-height:1.3; letter-spacing:-0.01em;
  }
  .dec-hero-actions { display:flex; gap:8px; align-items:center; flex-shrink:0; }
  .dec-hero-actions-group { display:flex; gap:6px; align-items:center; }

  .dec-divider-gradient {
    height:.5px; width:100%;
    background:linear-gradient(90deg, rgba(233,239,246,.4) 0%, #e3e8ef 27%, #e9eff6 64%, rgba(233,239,246,.4) 100%);
  }
  [data-theme="dark"] .dec-divider-gradient,
  [data-theme="classic-dark"] .dec-divider-gradient {
    background:linear-gradient(90deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.1) 27%, rgba(255,255,255,.06) 64%, rgba(255,255,255,.04) 100%);
  }

  .dec-spin { animation:decSpin 1s linear infinite; }
  @keyframes decSpin { from { transform:rotate(0); } to { transform:rotate(360deg); } }

  .dec-scroll-body {
    flex:1 1 auto; min-height:0;
    overflow-y:auto; overflow-x:hidden;
    padding:32px 164px 64px;
    overscroll-behavior:contain;
    scrollbar-width:none;
  }
  .dec-scroll-body::-webkit-scrollbar { display:none; }

  /* ── Decision card rows (Figma) ── */
  .dec-card {
    display:flex; gap:56px; align-items:center;
    padding:16px 24px; width:100%;
    transition:background .12s, border-radius .12s;
    border-radius:12px;
    background:transparent;
  }
  .dec-card:hover {
    background:var(--portal-row-hover, rgba(241,243,245,.4));
  }

  .dec-clamp-wrap { position:relative; }
  .dec-clamp-text {
    display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden;
    text-overflow:ellipsis;
  }
  .dec-tip-popup {
    position:absolute; left:0; top:calc(100% + 8px); z-index:20;
    min-width:min(320px, 90vw); max-width:360px;
    padding:12px 14px; border-radius:10px;
    background:var(--dec-dark); color:#fff;
    font-size:13px; line-height:1.45; letter-spacing:0;
    box-shadow:0 12px 32px rgba(0,0,0,.18);
    pointer-events:none;
  }
  [data-theme="dark"] .dec-tip-popup,
  [data-theme="classic-dark"] .dec-tip-popup {
    background:#2a2c31; color:#f4f4f4;
  }

  .dec-card-left { width:179px; flex-shrink:0; display:flex; flex-direction:column; gap:32px; }
  .dec-card-title-block { display:flex; flex-direction:column; gap:8px; }
  .dec-card-title {
    margin:0; font-size:18px; font-weight:500; color:var(--dec-dark);
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    letter-spacing:0;
  }
  .dec-card-project {
    margin:0; font-size:14px; font-weight:400; color:var(--dec-soft);
    letter-spacing:0;
  }
  .dec-card-type-pill {
    display:inline-flex; align-items:center; gap:8px;
    padding:6px 12px; border-radius:999px;
    background:var(--portal-pill-bg); color:var(--dec-dark);
    font-size:12px; font-weight:500; letter-spacing:0;
    width:fit-content;
  }
  .dec-card-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

  .dec-card-mid { width:298px; flex-shrink:0; display:flex; flex-direction:column; gap:24px; }
  .dec-card-section { display:flex; flex-direction:column; gap:8px; }
  .dec-card-label {
    margin:0; font-size:14px; font-weight:500; color:var(--dec-dark);
    letter-spacing:0;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .dec-card-muted {
    margin:0; font-size:13px; font-weight:400; color:var(--dec-soft);
    line-height:1.45; letter-spacing:0;
  }

  .dec-card-meta { width:93px; flex-shrink:0; display:flex; flex-direction:column; gap:57px; }
  .dec-card-prio-pill {
    display:inline-flex; align-items:center;
    padding:6px 12px; border-radius:999px;
    background:var(--portal-pill-bg); color:var(--dec-dark);
    font-size:12px; font-weight:500; letter-spacing:0;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    width:fit-content;
  }

  .dec-card-actions {
    width:105px; flex-shrink:0; display:flex; flex-direction:column; gap:8px; align-items:flex-end;
  }
  .dec-card-dots {
    border:0; background:transparent; color:var(--dec-soft);
    cursor:pointer; padding:4px; transition:color .12s;
  }
  .dec-card-dots:hover { color:var(--dec-dark); }
  .dec-card-actions .fui-pill-btn {
    height:40px; min-height:40px; font-size:13px;
  }
  .dec-card-actions .fui-pill-btn--primary {
    border: none;
    background: var(--portal-btn-primary, #5b647d);
    background-image: none;
    box-shadow: none;
  }
  .dec-card-actions .fui-pill-btn--primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--portal-btn-primary, #5b647d) 88%, #000);
    background-image: none;
    border: none;
    box-shadow: none;
  }
  .dec-card-actions .fui-pill-btn--primary:active:not(:disabled) {
    background: color-mix(in srgb, var(--portal-btn-primary, #5b647d) 80%, #000);
    background-image: none;
    box-shadow: none;
  }

  .dec-empty {
    padding:48px 6px; color:var(--dec-soft);
    font-size:14px; text-align:center;
    display:flex; flex-direction:column; align-items:center; gap:8px;
  }
  .dec-empty svg { color:var(--dec-soft); }
  .dec-empty p { margin:0; }
  .dec-empty small { font-size:13px; opacity:.75; max-width:420px; line-height:1.5; }

  /* Shared elements used by Drawer */
  .dec-tagro-cta {
    display:inline-flex; align-items:center; gap:6px;
    height:28px; padding:0 13px; border-radius:32px;
    background:#5B647D; color:#fff; border:0;
    font:inherit; font-size:12px; font-weight:500; letter-spacing:.012em;
    cursor:pointer; transition:background .12s, transform .12s;
  }
  .dec-tagro-cta:hover { background:#4d566c; }
  .dec-tagro-cta:active { transform:scale(.985); }
  .dec-pill {
    display:inline-flex; align-items:center; gap:4px;
    height:18px; padding:0 8px; border-radius:999px;
    font-size:10px; letter-spacing:.04em; text-transform:uppercase;
    background:color-mix(in srgb, var(--surface-2, #f1f3f5) 70%, transparent);
    color:var(--dec-dark); white-space:nowrap;
  }
  .dec-pill.tone-red    { background:color-mix(in srgb, #ef4444 14%, transparent); color:#ef4444; }
  .dec-pill.tone-amber  { background:color-mix(in srgb, #f59e0b 14%, transparent); color:#f59e0b; }
  .dec-pill.tone-good   { background:color-mix(in srgb, #22c55e 14%, transparent); color:#22c55e; }
  .dec-pill.tone-muted  { background:color-mix(in srgb, var(--surface-2, #f1f3f5) 70%, transparent); color:var(--dec-soft); }
  .dec-row-dot { width:7px; height:7px; border-radius:50%; display:inline-block; }

  /* ── Drawer ─────────────────────────────────────────────── */
  .dec-overlay { position:fixed; inset:0; z-index:1200; display:flex; justify-content:flex-end; }
  .dec-backdrop { flex:1; background:rgba(8,10,14,.42); backdrop-filter:blur(4px); cursor:pointer; }
  .dec-panel {
    width:min(620px, 100vw); height:100%;
    background:var(--bg); color:var(--text);
    border-left:1px solid var(--border);
    display:flex; flex-direction:column;
    box-shadow:-24px 0 64px -20px rgba(0,0,0,.45);
    animation:decIn .22s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes decIn { from { transform:translateX(20px); opacity:0; } to { transform:none; opacity:1; } }

  /* ── Detail sub-page ─────────────────────────────────────── */
  .dec-os-detail {
    display:flex; flex-direction:column; overflow:hidden;
  }
  .dec-detail-topbar {
    flex:0 0 auto; padding:24px 164px 0;
    position:relative; z-index:2;
  }
  .dec-detail-back {
    display:inline-flex; align-items:center; gap:8px;
    font-size:14px; color:var(--dec-soft); text-decoration:none;
    transition:color .12s;
  }
  .dec-detail-back:hover { color:var(--dec-dark); }
  .dec-detail-page {
    flex:1; min-height:0; overflow-y:auto;
    padding:16px 164px 64px;
    overscroll-behavior:contain;
  }
  .dec-detail-panel {
    width:100%; max-width:720px; margin:0 auto;
    background:var(--dec-card-bg);
    border:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 80%, transparent);
    border-radius:16px;
    display:flex; flex-direction:column;
    box-shadow:var(--portal-shadow-card);
    overflow:hidden;
  }
  .dec-detail-panel .dec-drawer-head {
    border-bottom:1px solid color-mix(in srgb, var(--portal-btn-outline-border, #e7ebf0) 70%, transparent);
    padding:20px 24px 12px;
  }
  .dec-detail-panel .dec-drawer-body {
    padding:20px 24px 48px;
  }
  .dec-detail-empty {
    padding:64px 24px; text-align:center; color:var(--dec-soft);
    display:flex; flex-direction:column; align-items:center; gap:16px;
  }

  .dec-drawer-head {
    display:flex; justify-content:space-between; align-items:flex-start;
    padding:18px 22px 10px;
    border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .dec-drawer-meta { display:flex; flex-direction:column; gap:2px; min-width:0; }
  .dec-kicker { font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--dec-soft); }
  .dec-saved { font-size:11px; color:var(--dec-soft); display:inline-flex; align-items:center; gap:4px; }
  .dec-drawer-actions { display:flex; gap:2px; }
  .dec-icon-btn {
    width:28px; height:28px; border:0; background:transparent;
    color:var(--dec-soft); border-radius:7px; cursor:pointer;
    display:inline-flex; align-items:center; justify-content:center;
    transition:background .12s, color .12s;
  }
  .dec-icon-btn:hover { background:var(--surface-2); color:var(--text); }

  .dec-drawer-body {
    flex:1; min-height:0; overflow-y:auto;
    padding:18px 22px 50px;
    display:flex; flex-direction:column; gap:16px;
  }
  .dec-d-title { margin:0; font-size:20px; font-weight:500; color:var(--text); letter-spacing:-.012em; }
  .dec-d-desc { margin:0; font-size:13px; line-height:1.55; color:var(--text); font-weight:500; }
  .dec-d-meta { display:flex; flex-wrap:wrap; gap:6px; }

  .dec-tagro {
    border:1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
    border-radius:14px; padding:14px 16px;
    background:color-mix(in srgb, var(--accent) 4%, transparent);
    display:flex; flex-direction:column; gap:10px;
  }
  .dec-tagro-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
  .dec-tagro-kicker {
    display:inline-flex; align-items:center; gap:5px;
    font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--text);
  }
  .dec-tagro-time { display:block; margin-top:2px; font-size:10.5px; color:var(--dec-soft); }
  .dec-tagro-run {
    display:inline-flex; align-items:center; gap:5px;
    height:26px; padding:0 11px; border-radius:8px;
    background:var(--card); color:var(--text); border:1px solid var(--border);
    font:inherit; font-size:11.5px; font-weight:500; cursor:pointer;
    transition:background .12s; white-space:nowrap;
  }
  .dec-tagro-run:hover:not(:disabled) { background:var(--surface-2); }
  .dec-tagro-run:disabled { opacity:.5; cursor:not-allowed; }
  .dec-tagro-empty { margin:0; font-size:12.5px; color:var(--dec-soft); line-height:1.55; }

  .dec-tagro-rec { display:flex; flex-direction:column; gap:7px; }
  .dec-tagro-pick { font-size:12.5px; color:var(--text); }
  .dec-tagro-pick strong { font-weight:500; color:var(--text); }
  .dec-tagro-text { margin:0; font-size:13px; line-height:1.55; color:var(--text); }
  .dec-tagro-apply {
    align-self:flex-start;
    height:28px; padding:0 12px; border:0; border-radius:8px;
    background:var(--card); color:var(--text); border:1px solid var(--border);
    font:inherit; font-size:11.5px; font-weight:500; cursor:pointer;
  }
  .dec-tagro-apply:hover { background:var(--surface-2); }

  .dec-answer { display:flex; flex-direction:column; gap:9px; }
  .dec-answer-label {
    margin:0; font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--dec-soft);
  }
  /* Notebook-style options: no resting border; the selected state carries the
     affordance via a soft surface tint + an inset accent stripe. */
  .dec-options { display:flex; flex-direction:column; gap:2px; }
  .dec-option {
    display:flex; align-items:flex-start; gap:9px;
    padding:12px 10px; border:0; border-radius:10px;
    cursor:pointer; transition:background .12s, box-shadow .12s;
    position:relative; background:transparent;
  }
  .dec-option:hover { background:color-mix(in srgb, var(--surface-2) 38%, transparent); }
  .dec-option.on {
    background:color-mix(in srgb, var(--surface-2) 62%, transparent);
    box-shadow:inset 3px 0 0 var(--text);
  }
  .dec-option.tagro { box-shadow:inset 3px 0 0 var(--accent); }
  .dec-option input { margin-top:3px; flex-shrink:0; }
  .dec-option-body { display:flex; flex-direction:column; gap:2px; min-width:0; flex:1; }
  .dec-option-body strong { font-size:13px; color:var(--text); font-weight:500; }
  .dec-option-body small { font-size:11.5px; color:var(--dec-soft); }
  .dec-option-tagro {
    display:inline-flex; align-items:center; gap:3px;
    font-size:10px; letter-spacing:.08em; text-transform:uppercase;
    color:var(--accent); align-self:center;
  }

  /* Notepad-style — no box, no underline. */
  .dec-note {
    width:100%; min-height:90px; resize:vertical;
    background:transparent; border:0; border-radius:0;
    padding:6px 0;
    color:var(--text); font:inherit; font-size:13.5px; font-weight:500; line-height:1.6;
    letter-spacing:.017em; outline:0;
  }
  .dec-note::placeholder { color:var(--dec-soft); opacity:.6; }

  .dec-answer-actions { display:flex; gap:8px; align-items:center; }
  .dec-primary {
    display:inline-flex; align-items:center; gap:5px;
    height:32px; padding:0 14px; border-radius:999px;
    background:var(--btn-prim); color:var(--btn-prim-text); border:0;
    font:inherit; font-size:12px; font-weight:500; cursor:pointer;
    transition:opacity .12s, transform .12s;
  }
  .dec-primary:hover:not(:disabled) { opacity:.92; }
  .dec-primary:active:not(:disabled) { transform:scale(.97); }
  .dec-primary:disabled { opacity:.4; cursor:not-allowed; }
  .dec-error { margin:0; font-size:12px; color:#ef4444; display:inline-flex; align-items:center; gap:4px; }

  .dec-final {
    border-top:1px solid color-mix(in srgb, var(--border) 50%, transparent);
    padding-top:14px; display:flex; flex-direction:column; gap:6px;
  }
  .dec-final-pick { display:inline-flex; align-items:center; gap:6px; font-size:13.5px; color:var(--text); }
  .dec-final-pick svg { color:#22c55e; }
  .dec-final-note { margin:0; font-size:12.5px; color:var(--text); line-height:1.55; }
  .dec-final-meta { font-size:11px; color:var(--dec-soft); }
  .dec-override-window {
    display:inline-flex; align-items:center; gap:5px;
    color:color-mix(in srgb, #f59e0b 78%, var(--text));
  }
  .dec-override-window.expired { color:var(--dec-soft); }
  .dec-override-window svg { flex:none; }

  /* ── v1 additions: binary / multi / delegate / discuss / clarification ── */
  /* Notebook-style notice: no border, soft tint + left accent only. */
  .dec-clarification {
    border:0;
    background:color-mix(in srgb, #f59e0b 8%, transparent);
    box-shadow:inset 3px 0 0 color-mix(in srgb, #f59e0b 55%, transparent);
    border-radius:8px; padding:12px 14px;
    font-size:12.5px; line-height:1.55; color:var(--text); font-weight:500;
  }

  .dec-binary { display:flex; gap:8px; }
  .dec-binary-btn {
    flex:1; height:46px; padding:0 16px;
    border:1px solid var(--border); border-radius:12px;
    background:var(--card); color:var(--text);
    font:inherit; font-size:14px; font-weight:500;
    cursor:pointer; transition:border-color .12s, background .12s;
  }
  .dec-binary-btn:hover { border-color:color-mix(in srgb, var(--text) 25%, var(--border)); }
  .dec-binary-btn.on {
    border-color:var(--text);
    background:color-mix(in srgb, var(--surface-2) 50%, transparent);
  }

  .dec-rationale { min-height:60px; margin-top:2px; }

  .dec-secondary {
    display:inline-flex; align-items:center; gap:5px;
    height:32px; padding:0 14px; border-radius:999px;
    background:var(--card); color:var(--text);
    border:1px solid var(--border);
    font:inherit; font-size:12px; font-weight:500; cursor:pointer;
    transition:background .12s, border-color .12s;
  }
  .dec-secondary:hover:not(:disabled) {
    background:var(--surface-2);
    border-color:color-mix(in srgb, var(--text) 25%, var(--border));
  }
  .dec-secondary:disabled { opacity:.5; cursor:not-allowed; }
  .dec-secondary-quiet {
    background:transparent;
    color:var(--dec-soft);
    border-color:transparent;
  }
  .dec-secondary-quiet:hover:not(:disabled) {
    background:var(--surface-2);
    color:var(--text);
    border-color:var(--border);
  }

  /* Assign-to-teammate dropdown */
  .dec-assign-wrap { position:relative; display:inline-flex; }
  .dec-assign-menu {
    position:absolute; bottom:calc(100% + 8px); right:0; z-index:40;
    min-width:230px; max-height:280px; overflow-y:auto;
    padding:6px; border-radius:14px;
    background:var(--card); border:1px solid var(--border);
    box-shadow:0 18px 44px -18px rgba(0,0,0,.5);
    display:flex; flex-direction:column; gap:2px;
  }
  .dec-assign-head {
    margin:2px 6px 4px; font-size:10.5px; font-weight:500;
    letter-spacing:.08em; text-transform:uppercase; color:var(--dec-soft);
  }
  .dec-assign-opt {
    display:flex; align-items:center; gap:9px;
    padding:8px 9px; border:0; background:transparent; border-radius:10px;
    text-align:left; cursor:pointer; color:var(--text); font:inherit; font-size:12.5px;
  }
  .dec-assign-opt:hover:not(:disabled) { background:var(--surface-2); }
  .dec-assign-opt:disabled { cursor:default; }
  .dec-assign-opt.on { color:var(--text); }
  .dec-assign-av {
    width:24px; height:24px; border-radius:50%; flex:0 0 auto;
    display:inline-flex; align-items:center; justify-content:center; overflow:hidden;
    background:var(--surface-2); color:var(--text-secondary);
    font-size:10px; font-weight:600;
  }
  .dec-assign-av img { width:100%; height:100%; object-fit:cover; display:block; }
  .dec-assign-name { flex:1; min-width:0; display:flex; flex-direction:column; }
  .dec-assign-name small { color:var(--dec-soft); font-size:10.5px; margin-top:1px; }

  .dec-discuss {
    display:flex; flex-direction:column; gap:8px;
    padding-top:6px;
  }
  .dec-discuss-actions { display:flex; justify-content:flex-end; }

  .dec-final-multi { display:flex; flex-direction:column; gap:5px; }
  .dec-final-text {
    margin:0; padding:10px 12px;
    border:1px solid var(--border); border-radius:10px;
    background:color-mix(in srgb, var(--surface-2) 30%, transparent);
    font-size:13px; color:var(--text); line-height:1.55; font-weight:500;
    white-space:pre-wrap;
  }
  .dec-delegation-reason {
    display:flex; align-items:flex-start; gap:6px;
    color:var(--dec-soft); font-style:italic;
  }
  .dec-delegation-reason svg { margin-top:3px; flex-shrink:0; color:var(--accent); }

  @media (max-width: 1400px) {
    .dec-static-top { padding:48px 56px 16px; }
    .dec-scroll-body { padding:12px 56px 60px; }
  }
  @media (max-width: 1100px) {
    .dec-static-top { padding:40px 32px 16px; }
    .dec-scroll-body { padding:12px 32px 48px; }
  }
  @media (max-width: 900px) {
    .dec-static-top { padding:24px 20px 12px; }
    .dec-scroll-body { padding:8px 20px 40px; }
    .dec-card { flex-direction:column; gap:20px; padding:18px 12px; align-items:stretch; }
    .dec-card-left, .dec-card-mid, .dec-card-meta, .dec-card-actions { width:100%; }
    .dec-card-meta { gap:24px; flex-direction:row; }
    .dec-card-actions { flex-direction:row; flex-wrap:wrap; gap:8px; align-items:stretch; }
    .dec-card-actions > button, .dec-card-actions > a { width:auto; flex:1; min-width:80px; }
    .dec-detail-topbar { padding:16px 20px 0; }
    .dec-detail-page { padding:12px 20px 40px; }
    .dec-hero-title { font-size:30px; }
    .dec-hero-sub p { font-size:18px; }
    .dec-panel { width:100vw; }
    .dec-answer-actions { flex-direction:column; align-items:stretch; }
    .dec-answer-actions > button { width:100%; justify-content:center; }
    .dec-binary-btn { height:52px; font-size:15px; }
  }
  @media (max-width: 768px) {
    .dec-hero { display:none; }
  }
`
