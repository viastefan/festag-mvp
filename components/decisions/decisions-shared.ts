/**
 * Shared decisions UI types, mocks, and helpers.
 * Extracted from page.tsx so Next.js page exports stay valid.
 */

export type Option = { id: string; label: string; hint?: string }

export type ResponseType = 'binary' | 'single_choice' | 'multi_choice' | 'free_text'

export type DecOption = {
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

export type ResponseValue =
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

function mockDec(opts: {
  id: string
  title: string
  rec: string
  type: string
  urgency?: Decision['urgency']
  hoursAgo?: number
  escalation?: number
  urgencyScore?: number
  dueDays?: number | null
  tagro?: string
  impact?: string
  status?: string
  altOption?: string
  responseType?: ResponseType
  reversibility?: Decision['reversibility']
}): Decision {
  const recId = opts.rec.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'opt-1'
  const created = new Date(Date.now() - (opts.hoursAgo ?? 2) * 3600000)
  const due = opts.dueDays != null
    ? new Date(Date.now() + opts.dueDays * 86400000).toISOString()
    : null
  const impact = opts.impact ?? 'Wird nach Freigabe umgesetzt.'
  const tagro = opts.tagro ?? `Tagro empfiehlt ${opts.rec} — schnellste Route zum Projektziel.`
  return {
    id: opts.id,
    project_id: 'mock-proj-1',
    title: opts.title,
    description: impact,
    client_title: opts.title,
    client_summary: impact,
    options_json: [
      { id: recId, label: opts.rec, hint: opts.rec === 'Stripe' ? 'Zahlungsintegration im Dashboard einrichten' : undefined },
      { id: 'ablehnen', label: opts.altOption ?? 'Ablehnen' },
    ],
    recommended_option: recId,
    tagro_reasoning: tagro,
    tagro_recommendation_reason: tagro,
    tagro_run_at: new Date().toISOString(),
    tagro_confidence_in_framing: 0.82,
    status: opts.status ?? 'pending_client',
    selected_option: null,
    decision_note: null,
    urgency: opts.urgency ?? 'high',
    due_date: due,
    due_at: due,
    escalation_level: opts.escalation ?? 0,
    urgency_score: opts.urgencyScore ?? 62,
    effective_due_source: due ? 'deadline_hard' : 'type_default',
    reversibility: opts.reversibility ?? (opts.type === 'payment' ? 'one_way_door' : 'two_way_door'),
    delegate_allowed: true,
    response_type: opts.responseType ?? 'binary',
    decision_type: opts.type,
    source_task_id: null,
    created_by: 'mock-dev',
    requested_for: 'mock-client',
    decided_at: null,
    created_at: created.toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/** Provisional UI preview rows — used when the API returns no decisions. */
export const MOCK_DECISIONS: Decision[] = [
  mockDec({
    id: 'mock-1',
    title: 'Logo Farbe freigeben',
    rec: 'Freigeben',
    type: 'direction',
    urgency: 'high',
    hoursAgo: 1,
    urgencyScore: 68,
    tagro: 'Tagro empfiehlt Freigeben — die Variante verbessert die Lesbarkeit und passt zur Zielgruppe.',
    impact: 'Die Designphase kann abgeschlossen werden. Entwicklung wartet auf die Freigabe für UI-Assets.',
    responseType: 'binary',
  }),
  mockDec({
    id: 'mock-2',
    title: 'Zahlungsanbieter wählen',
    rec: 'Stripe',
    type: 'payment',
    urgency: 'critical',
    hoursAgo: 6,
    escalation: 2,
    urgencyScore: 88,
    dueDays: -1,
    tagro: 'Tagro empfiehlt Stripe — schnellste Integration für Karten und SEPA im deutschen Markt.',
    impact: 'Ohne Zahlungsanbieter blockiert der Checkout. Eine Wahl heute hält den Launch im Plan.',
    responseType: 'binary',
    reversibility: 'one_way_door',
  }),
  mockDec({
    id: 'mock-3',
    title: 'Hosting-Provider wählen',
    rec: 'Vercel',
    type: 'scope',
    urgency: 'high',
    hoursAgo: 18,
    escalation: 1,
    urgencyScore: 74,
    dueDays: 3,
    tagro: 'Tagro empfiehlt Vercel — passt zum Next.js-Stack und beschleunigt Preview-Deployments.',
    impact: 'Staging-URL und Produktions-Deploy hängen an dieser Entscheidung.',
    responseType: 'binary',
  }),
  mockDec({
    id: 'mock-4',
    title: 'Domain-Strategie festlegen',
    rec: 'Freigeben',
    type: 'tradeoff',
    urgency: 'normal',
    hoursAgo: 48,
    urgencyScore: 48,
    tagro: 'Tagro empfiehlt die vorgeschlagene Domain-Strategie für SEO und Markenklarheit.',
    impact: 'DNS und E-Mail-Setup können danach parallel starten.',
  }),
  mockDec({
    id: 'mock-5',
    title: 'SEO Keywords bestätigen',
    rec: 'Freigeben',
    type: 'tradeoff',
    urgency: 'normal',
    hoursAgo: 72,
    urgencyScore: 42,
    tagro: 'Tagro empfiehlt die Keyword-Liste für die ersten Landingpages.',
    impact: 'Content-Team kann Briefings finalisieren.',
  }),
  {
    ...mockDec({
      id: 'mock-6',
      title: 'Analytics-Tool freigeben',
      rec: 'Freigeben',
      type: 'approval',
      urgency: 'low',
      hoursAgo: 120,
      urgencyScore: 28,
      status: 'decided',
      tagro: 'Tagro empfiehlt Plausible — datenschutzfreundlich und schnell eingebunden.',
      impact: 'Tracking war Voraussetzung für den Soft-Launch.',
    }),
    status: 'decided',
    selected_option: 'freigeben',
    decided_at: new Date(Date.now() - 86400000).toISOString(),
    decided_by: 'mock-client',
  },
]

export const MOCK_PROJECTS: Record<string, ProjectLite> = {
  'mock-proj-1': { id: 'mock-proj-1', title: 'Festag Website Relaunch', color: '#5B647D', status: 'active' },
}

export function isDecisionDemoId(id: string) {
  return id.startsWith('mock-')
}

export function getDecisionDemoBundle() {
  return { decisions: MOCK_DECISIONS, projects: MOCK_PROJECTS }
}

export const URGENCY_LABEL: Record<string, string> = {
  low: 'Niedrig', normal: 'Normal', high: 'Hoch', critical: 'Kritisch',
}
export const URGENCY_TONE: Record<string, 'good' | 'amber' | 'red' | 'muted'> = {
  low: 'muted', normal: 'muted', high: 'amber', critical: 'red',
}

/** Apple system colors for urgency / status dots (light + dark readable). */
export const URGENCY_DOT_COLOR: Record<string, string> = {
  low: '#AEAEB2',
  normal: '#8E8E93',
  high: '#FF9500',
  critical: '#FF3B30',
}

export function urgencyDotColor(urgency?: string | null): string {
  return URGENCY_DOT_COLOR[urgency || 'normal'] || URGENCY_DOT_COLOR.normal
}

import { DECISION_OPEN_STATES } from '@/lib/decisions/types'

export const OPEN_STATES = DECISION_OPEN_STATES

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

export function impactLine(d: Decision): string {
  const raw = d.client_summary || d.description
  if (!raw?.trim()) return 'Wird nach Freigabe umgesetzt.'
  return raw.trim()
}

export function tagroSummaryLine(d: Decision): string {
  if (d.tagro_recommendation_reason?.trim()) return d.tagro_recommendation_reason.trim()
  const raw = d.tagro_reasoning?.trim()
  if (!raw) return 'Tagro analysiert diese Entscheidung und bereitet eine Empfehlung vor.'
  const clean = raw.replace(/\.{2,}$/, '').trim()
  if (/^tagro empfiehlt/i.test(clean)) return clean.charAt(0).toUpperCase() + clean.slice(1)
  return `Tagro empfiehlt ${clean.charAt(0).toLowerCase()}${clean.slice(1)}.`
}

export function listStatusLabel(d: Decision): string {
  if (d.status === 'decided' || d.status === 'applied') return STATUS_LABEL[d.status] || 'Entschieden'
  if (OPEN_STATES.has(d.status)) return 'Wartet auf Freigabe'
  return STATUS_LABEL[d.status] || d.status
}

export function fmtAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d} Tag${d === 1 ? '' : 'en'}`
  return new Date(iso).toLocaleDateString('de-DE')
}

// German label for how the engine derived the deadline — keeps urgency legible.
export function fmtDueIn(due: string | null) {
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
export function fmtCountdown(iso: string, nowTs: number): string {
  const ms = new Date(iso).getTime() - nowTs
  if (ms <= 0) return 'abgelaufen'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `noch ${m} Min`
  return `noch ${h} Std ${m} Min`
}

// German label for how the engine derived the deadline — keeps urgency legible.
export const DUE_SOURCE_LABEL: Record<string, string> = {
  deadline_hard: 'feste Frist',
  blocking_horizon: 'blockiert Arbeit',
  deliberation_floor: 'Bedenkzeit',
  type_default: 'Standardfrist',
}

type DecisionTypeMeta = { label: string; color: string }

const CANONICAL_DECISION_TYPES: Record<string, DecisionTypeMeta> = {
  direction: { label: 'Designentscheidung', color: '#AF52DE' },
  scope: { label: 'Technische Entscheidung', color: '#007AFF' },
  budget: { label: 'Budgetentscheidung', color: '#FF9500' },
  approval: { label: 'Freigabe', color: '#34C759' },
  payment: { label: 'Zahlungsentscheidung', color: '#32ADE6' },
  legal: { label: 'Rechtsentscheidung', color: '#8E8E93' },
  contract: { label: 'Vertragsentscheidung', color: '#636366' },
  data_protection: { label: 'Datenschutz', color: '#5856D6' },
  risk_response: { label: 'Risikoentscheidung', color: '#FF3B30' },
  tradeoff: { label: 'Strategieentscheidung', color: '#30B0C7' },
  clarification: { label: 'Klärung', color: '#AEAEB2' },
  escalation: { label: 'Eskalation', color: '#FF453A' },
}

function matchGermanDecisionType(raw: string): DecisionTypeMeta | null {
  const t = raw.trim().toLowerCase()
  if (t.includes('design')) return CANONICAL_DECISION_TYPES.direction
  if (t.includes('techn')) return CANONICAL_DECISION_TYPES.scope
  if (t.includes('marketing')) return { label: raw.trim(), color: '#FF9500' }
  if (t.includes('strateg')) return CANONICAL_DECISION_TYPES.tradeoff
  if (t.includes('zahlung') || t.includes('payment') || t.includes('stripe')) {
    return CANONICAL_DECISION_TYPES.payment
  }
  if (t.includes('budget')) return CANONICAL_DECISION_TYPES.budget
  if (t.includes('freigab') || t.includes('approval')) return CANONICAL_DECISION_TYPES.approval
  if (t.includes('risiko')) return CANONICAL_DECISION_TYPES.risk_response
  if (t.includes('recht') || t.includes('legal')) return CANONICAL_DECISION_TYPES.legal
  if (t.includes('vertrag') || t.includes('contract')) return CANONICAL_DECISION_TYPES.contract
  if (t.includes('datenschutz')) return CANONICAL_DECISION_TYPES.data_protection
  if (t.includes('klär') || t.includes('klaer')) return CANONICAL_DECISION_TYPES.clarification
  if (t.includes('eskal')) return CANONICAL_DECISION_TYPES.escalation
  return null
}

/** Client-facing label + dot color derived from engine type or legacy German strings. */
export function resolveDecisionType(raw?: string | null): DecisionTypeMeta {
  if (!raw?.trim()) {
    return { label: 'Entscheidung', color: '#8E8E93' }
  }
  const key = raw.trim().toLowerCase()
  if (CANONICAL_DECISION_TYPES[key]) return CANONICAL_DECISION_TYPES[key]
  const german = matchGermanDecisionType(raw)
  if (german) {
    return german.label === raw.trim()
      ? german
      : { label: raw.trim(), color: german.color }
  }
  return { label: raw.trim(), color: '#8E8E93' }
}
