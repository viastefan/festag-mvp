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

export const URGENCY_LABEL: Record<string, string> = {
  low: 'Niedrig', normal: 'Normal', high: 'Hoch', critical: 'Kritisch',
}
export const URGENCY_TONE: Record<string, 'good' | 'amber' | 'red' | 'muted'> = {
  low: 'muted', normal: 'muted', high: 'amber', critical: 'red',
}

export const OPEN_STATES = new Set([
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
