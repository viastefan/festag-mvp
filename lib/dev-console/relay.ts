// ─────────────────────────────────────────────────────────────────────────────
// Dev Console Relay — WP2: decomposition
//
// A developer writes to Tagro freely ("Login fertig, Avatar läuft; für die
// Zahlung muss der Kunde Stripe oder PayPal wählen; brauche noch das Logo als
// SVG"). decomposeDevMessage() splits that into discrete, typed RelayItems and
// translates each into client-safe language — ready to route to the right
// client surface (WP5 dispatch).
//
// This module is decomposition only (LLM + heuristic fallback + tagro_runs
// audit). Persisting the dev message as an inbox_item and dispatching are the
// API route's (WP6) and dispatch.ts's (WP5) jobs respectively.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { runOpenAIJson } from '@/lib/tagro/openai'

export type RelayKind =
  | 'status_update'
  | 'decision'
  | 'client_task'
  | 'client_message'
  | 'internal_note'

export type RelayItem = {
  relay_kind: RelayKind
  internal_text: string
  client_text: string | null
  // only for relay_kind === 'decision'
  decision?: { question: string; options?: string[]; decision_type?: string; urgency?: string }
  // only for relay_kind === 'client_task'
  task?: { title: string; client_description: string; action_component?: string }
  // ids of the passed-in attachments that belong to this item
  attach_asset_ids?: string[]
  confidence: number
}

export type RelayPlan = { items: RelayItem[]; summary: string; model: string }

export type RelayAttachment = {
  id: string
  title: string | null
  kind?: string | null
  category?: string | null
  client_visible?: boolean
}

export type DecomposeInput = {
  projectId: string
  developerId: string
  text: string
  attachments?: RelayAttachment[]
  history?: Array<{ role: 'dev' | 'tagro'; text: string }>
}

const RELAY_KINDS: ReadonlySet<RelayKind> = new Set<RelayKind>([
  'status_update', 'decision', 'client_task', 'client_message', 'internal_note',
])

const SYSTEM = `Du bist Tagro, die Orchestrierungs-Intelligenz von Festag. Ein Entwickler
schreibt dir frei, was er gerade getan hat oder vom Kunden braucht. Zerlege die
Nachricht in einzelne, sauber getrennte Punkte und ordne jedem GENAU EINEN Typ zu:
- status_update : erledigte/laufende Arbeit, die der Kunde nur erfahren soll.
- decision      : eine Wahl, die der KUNDE treffen muss (mehrere Optionen / offene Frage).
- client_task   : eine konkrete Handlung, die der KUNDE ausführen muss.
- client_message: eine reine Mitteilung an den Kunden (Frage/Info ohne Wahl).
- internal_note : nur für den Dev relevant, NICHT an den Kunden.

Für jeden Punkt:
- internal_text: präzise, technisch, für den Dev.
- client_text : jargonfrei, freundlich, ergebnisorientiert, max 2 Sätze. KEINE
  Library-/Tool-Namen, keine internen IDs. (null bei internal_note.)
- Bei decision: question als klare Einzeiler-Frage + options nur wenn im Text genannt.
- Bei client_task: title + client_description (Schritt für Schritt verständlich).
- attach_asset_ids: ordne angehängte Assets (nach id) dem passenden Punkt zu.

Erfinde nichts dazu. Wenn unklar, ob etwas an den Kunden soll → internal_note.
Antworte NUR als JSON: { "summary": string, "items": RelayItem[] }. Kein Markdown.`

export async function decomposeDevMessage(
  supa: SupabaseClient<any>,
  input: DecomposeInput,
): Promise<RelayPlan> {
  const prompt = buildPrompt(input)

  const res = await runOpenAIJson({
    runType: 'dev_relay_decompose',
    prompt: SYSTEM + '\n\n' + prompt,
    fallback: () => heuristic(input),
  })
  const { output, model, status } = res
  const errorMessage = 'error' in res ? (res.error ?? null) : null

  const plan = normalizePlan(output, input, model)

  // Best-effort audit; never let logging break the turn.
  try {
    await supa.from('tagro_runs').insert({
      project_id: input.projectId,
      run_type: 'dev_relay_decompose',
      input_json: { text: input.text, attachments: input.attachments ?? [] },
      output_json: plan as unknown as Record<string, unknown>,
      model,
      status: status ?? 'completed',
      error_message: errorMessage,
    })
  } catch {
    /* audit is best-effort */
  }

  return plan
}

function buildPrompt(input: DecomposeInput): string {
  const lines: string[] = []
  if (input.history && input.history.length > 0) {
    lines.push('Bisheriger Verlauf:')
    for (const h of input.history.slice(-6)) {
      lines.push(`  ${h.role === 'dev' ? 'Dev' : 'Tagro'}: ${h.text}`)
    }
    lines.push('')
  }
  lines.push('Nachricht des Entwicklers:')
  lines.push(input.text)
  if (input.attachments && input.attachments.length > 0) {
    lines.push('')
    lines.push('Angehängte Assets (id — Titel — Art):')
    for (const a of input.attachments) {
      lines.push(`  ${a.id} — ${a.title ?? 'ohne Titel'} — ${a.kind ?? 'datei'}`)
    }
  }
  lines.push('')
  lines.push('Antworte NUR als JSON: { "summary": string, "items": RelayItem[] }.')
  return lines.join('\n')
}

// Coerce arbitrary LLM output into a safe RelayPlan, enforcing the contract.
function normalizePlan(
  raw: unknown,
  input: DecomposeInput,
  model: string,
): RelayPlan {
  const obj = (raw ?? {}) as Record<string, unknown>
  const rawItems = Array.isArray(obj.items) ? obj.items : []
  const validAssetIds = new Set((input.attachments ?? []).map((a) => a.id))

  const items: RelayItem[] = rawItems
    .map((r) => normalizeItem(r, validAssetIds))
    .filter((x): x is RelayItem => x !== null)

  // Never emit an empty plan: fall back to the heuristic split so the dev
  // always sees something rather than a silent drop.
  if (items.length === 0) {
    return heuristic(input, model)
  }

  const summary = typeof obj.summary === 'string' && obj.summary.trim()
    ? obj.summary.trim()
    : `${items.length} Punkt${items.length === 1 ? '' : 'e'} erkannt`

  return { items, summary, model }
}

function normalizeItem(raw: unknown, validAssetIds: Set<string>): RelayItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const kind = r.relay_kind
  if (typeof kind !== 'string' || !RELAY_KINDS.has(kind as RelayKind)) return null
  const relay_kind = kind as RelayKind

  const internal_text = typeof r.internal_text === 'string' ? r.internal_text.trim() : ''
  if (!internal_text) return null

  // internal_note never leaks a client_text.
  const rawClient = typeof r.client_text === 'string' ? r.client_text.trim() : ''
  const client_text = relay_kind === 'internal_note' ? null : (rawClient || null)

  const item: RelayItem = {
    relay_kind,
    internal_text: internal_text.slice(0, 4000),
    client_text: client_text ? client_text.slice(0, 800) : null,
    confidence: clamp01(typeof r.confidence === 'number' ? r.confidence : 0.6),
  }

  if (relay_kind === 'decision' && r.decision && typeof r.decision === 'object') {
    const d = r.decision as Record<string, unknown>
    const question = typeof d.question === 'string' ? d.question.trim() : item.client_text || internal_text
    item.decision = {
      question: question.slice(0, 400),
      options: Array.isArray(d.options)
        ? d.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0).slice(0, 6)
        : undefined,
      decision_type: typeof d.decision_type === 'string' ? d.decision_type : undefined,
      urgency: typeof d.urgency === 'string' ? d.urgency : undefined,
    }
  }

  if (relay_kind === 'client_task' && r.task && typeof r.task === 'object') {
    const t = r.task as Record<string, unknown>
    item.task = {
      title: (typeof t.title === 'string' ? t.title.trim() : item.client_text || 'Aufgabe').slice(0, 200),
      client_description: (typeof t.client_description === 'string' ? t.client_description.trim() : item.client_text || '').slice(0, 2000),
      action_component: typeof t.action_component === 'string' ? t.action_component : undefined,
    }
  }

  const attach = Array.isArray(r.attach_asset_ids)
    ? r.attach_asset_ids.filter((id): id is string => typeof id === 'string' && validAssetIds.has(id))
    : []
  if (attach.length > 0) item.attach_asset_ids = attach

  return item
}

// Deterministic offline fallback: split into sentences, attach everything to a
// single status update so the dev still gets a usable, honest preview.
function heuristic(input: DecomposeInput, model = 'heuristic'): RelayPlan {
  const text = input.text.trim()
  const item: RelayItem = {
    relay_kind: 'status_update',
    internal_text: text || 'Leere Nachricht',
    client_text: text ? text.slice(0, 280) : null,
    confidence: 0.3,
  }
  if (input.attachments && input.attachments.length > 0) {
    item.attach_asset_ids = input.attachments.map((a) => a.id)
  }
  return { items: [item], summary: 'Heuristische Zerlegung (kein LLM verfügbar)', model }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, Number(value.toFixed(2))))
}
