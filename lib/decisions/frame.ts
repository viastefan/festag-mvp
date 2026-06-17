// ─────────────────────────────────────────────────────────────────────────────
// Decision Engine — Framer
//
// Takes a DecisionIntent (dev-language) and produces a FramedDecision with:
//   - internal_title / internal_description (tech-language, dev sees)
//   - client_title / client_summary         (calm prose, client sees)
//   - 0–4 structured options + implications + Tagro recommendation
//   - tagro_reasoning                       (audit, "why this decision now")
//   - tagro_confidence_in_framing           (honest 0..1)
//
// Two paths:
//   1. LLM (runOpenAIJson) — preferred when an API key is configured.
//   2. Heuristic fallback — deterministic, never lies, but plain text.
//      Sufficient to keep the system functional offline.
//
// The framer never sets `decided_by` or `response_value` — those come from
// the user / delegation later. It only produces the framing payload.
// ─────────────────────────────────────────────────────────────────────────────

import { runOpenAIJson } from '@/lib/tagro/openai'
import type {
  DecisionIntent,
  FramedDecision,
  FramedDecisionOption,
} from './intents'
import {
  defaultAuthorityFor,
  defaultAutoResolveStrategyFor,
  defaultReversibilityFor,
  delegateAllowedFor,
  isAutoResolveStrategy,
  isReversibility,
  type AutoResolveStrategy,
  type DecisionOptionImplications,
  type DecisionReversibility,
  type ResponseType,
} from './types'

const FRAMER_SYSTEM = [
  'Du bist Tagro, der operative Übersetzer zwischen Entwickler-Team (Dev) und Auftraggeber (Client) in einem Festag-Softwareprojekt.',
  'Deine Aufgabe: Eine Entscheidungsfrage so rahmen, dass beide Seiten sie verstehen, ohne Tech-Jargon für den Client und ohne Marketing-Floskeln für den Dev.',
  '',
  'Sprache: Aeonik-tonal, ruhig, präzise, deutsch. Niemals "Hey", "Lass uns", keine Emojis, keine Ausrufezeichen.',
  '',
  'Regeln:',
  '- internal_* sind technisch genau, in Dev-Sprache.',
  '- client_summary ist 2–4 Sätze in normaler Geschäftssprache, ohne Code-Begriffe.',
  '- Optionen nur, wenn sie aus dem Eingabekontext oder den Seeds gestützt sind. Erfinde keine.',
  '- Für response_type "free_text" gibst du ein leeres options-Array zurück.',
  '- Pro Option strukturierte implications: time_delta_days als Zahl oder "unknown", cost_delta als Zahl/Skala oder "unknown", risk_delta in {low,medium,high,unknown}, scope_delta in {narrows,unchanged,broadens}.',
  '- Wenn eine Option eine Einrichtung in einem externen Tool erfordert (z. B. Stripe, Vercel, GitHub, Supabase), setze implications.external_handoff mit provider, provider_label, url, steps (Array aus {title, body}), open_label, confirm_label, note.',
  '- Maximal eine Option mit recommended_by_tagro=true. Wenn keine sichere Empfehlung möglich → alle false und recommendation_reason=null.',
  '- tagro_reasoning erklärt in 1–2 Sätzen, warum diese Entscheidung jetzt ansteht.',
  '- tagro_confidence_in_framing zwischen 0 und 1: hoch nur wenn der Kontext eindeutig ist.',
  '- reversibility klassifizieren: "two_way_door" (leicht umkehrbar) oder "one_way_door" (teuer/irreversibel: legal, contract, payment, data_protection, scope-brechend). Im Zweifel "one_way_door".',
  '- auto_resolve_strategy: "tagro_default" nur bei two_way_door direction/tradeoff mit Empfehlung; sonst "escalate_only"; bei legal/contract/payment/data_protection immer "hold".',
  '- deadline_hard nur bei echter externer Wand (Vertragsdatum, Launch, Frist) als ISO-Datum, sonst null. lead_time_days = Vorlauf nach Entscheid bis Arbeit starten kann (meist 0).',
  '- Du entscheidest niemals selbst. Du rahmst nur.',
].join('\n')

type FramerOutput = {
  internal_title?: string
  internal_description?: string
  client_title?: string
  client_summary?: string
  tagro_reasoning?: string
  tagro_recommendation_reason?: string | null
  tagro_confidence_in_framing?: number
  response_type?: ResponseType
  reversibility?: string
  auto_resolve_strategy?: string
  deadline_hard?: string | null
  lead_time_days?: number
  deliberation_hours?: number | null
  cost_of_delay_per_day?: number | null
  options?: Array<{
    label?: string
    client_label?: string
    description?: string
    technical_notes?: string
    implications?: Partial<DecisionOptionImplications>
    recommended_by_tagro?: boolean
  }>
}

export type FrameOptions = {
  // When the project owner wants to review every Tagro framing before
  // publishing, set this to true. The persisted decision will land in
  // 'drafted' instead of 'pending_client'.
  ownerReviewBeforePublish?: boolean
}

export async function frameDecision(
  intent: DecisionIntent,
  options: FrameOptions = {},
): Promise<FramedDecision> {
  const responseTypeHint = intent.hints?.responseType
  const authority = intent.hints?.authority || defaultAuthorityFor(intent.decisionType)

  const prompt = buildFramerPrompt(intent, responseTypeHint)
  const { output, model, status } = await runOpenAIJson({
    runType: 'decision_frame',
    prompt: FRAMER_SYSTEM + '\n\n' + prompt,
    fallback: () => heuristicFraming(intent, responseTypeHint),
  })

  const framedRaw = (output ?? {}) as FramerOutput
  const responseType = pickResponseType(framedRaw.response_type, responseTypeHint, intent.rawOptionSeeds)

  const opts = sanitizeOptions(framedRaw.options, responseType, intent.rawOptionSeeds)

  const confidence = clamp01(
    typeof framedRaw.tagro_confidence_in_framing === 'number'
      ? framedRaw.tagro_confidence_in_framing
      : status === 'fallback' ? 0.4 : 0.7,
  )

  // ── v2 classification (door + auto-resolve), with safety clamps ────────────
  const reversibility = resolveReversibility(intent.decisionType, framedRaw.reversibility, opts)
  const autoResolveStrategy = resolveAutoResolveStrategy(
    intent.decisionType,
    reversibility,
    framedRaw.auto_resolve_strategy,
  )
  // Delegation requires a reversible, non-compliance decision that actually
  // carries a recommendation (docs §8).
  const delegateAllowed =
    delegateAllowedFor(intent.decisionType) &&
    reversibility === 'two_way_door' &&
    opts.some((o) => o.recommendedByTagro)

  return {
    intent,
    internalTitle: nonEmpty(framedRaw.internal_title) ?? intent.rawTitle,
    internalDescription: nonEmpty(framedRaw.internal_description) ?? intent.rawQuestion,
    clientTitle: nonEmpty(framedRaw.client_title) ?? toClientTitle(intent.rawTitle),
    clientSummary: nonEmpty(framedRaw.client_summary) ?? toClientSummary(intent.rawQuestion),
    tagroReasoning: nonEmpty(framedRaw.tagro_reasoning) ?? intent.origin.reason,
    tagroRecommendationReason:
      typeof framedRaw.tagro_recommendation_reason === 'string' && framedRaw.tagro_recommendation_reason.trim().length > 0
        ? framedRaw.tagro_recommendation_reason.trim()
        : null,
    tagroConfidenceInFraming: confidence,
    decisionType: intent.decisionType,
    responseType,
    authority,
    delegateAllowed,
    urgency: intent.urgency,
    reversibility,
    autoResolveStrategy,
    deadlineHard: nonEmpty(framedRaw.deadline_hard ?? null),
    leadTimeDays: clampInt(framedRaw.lead_time_days, 0, 0, 365),
    deliberationHours:
      typeof framedRaw.deliberation_hours === 'number' && framedRaw.deliberation_hours > 0
        ? framedRaw.deliberation_hours
        : null,
    costOfDelayPerDay:
      typeof framedRaw.cost_of_delay_per_day === 'number' && framedRaw.cost_of_delay_per_day > 0
        ? framedRaw.cost_of_delay_per_day
        : null,
    options: opts,
    model: status === 'fallback' ? 'heuristic' : (model || 'openai'),
    initialStatus: options.ownerReviewBeforePublish ? 'drafted' : 'pending_client',
  }
}


// ── v2 classification resolvers ──────────────────────────────────────────────

// Resolve the Bezos door. Honour an explicit model choice; otherwise apply the
// matrix default. For the `depends` types (scope, risk_response) inspect option
// implications. `unknown` always collapses to the safe default (one_way_door).
function resolveReversibility(
  type: Parameters<typeof defaultReversibilityFor>[0],
  modelChoice: string | undefined,
  options: FramedDecisionOption[],
): DecisionReversibility {
  if (isReversibility(modelChoice) && modelChoice !== 'unknown') return modelChoice

  if (type === 'scope' || type === 'risk_response') {
    const heavy = options.some((o) => {
      const i = o.implications
      const broadens = i.scope_delta === 'broadens'
      const costly = i.cost_delta === 'high' || i.cost_delta === 'medium' ||
        (typeof i.cost_delta === 'number' && i.cost_delta > 0)
      const slow = (typeof i.time_delta_days === 'number' && i.time_delta_days > 2) ||
        i.time_delta_days === 'high'
      const risky = i.risk_delta === 'high'
      return risky || (broadens && (costly || slow))
    })
    return heavy ? 'one_way_door' : 'two_way_door'
  }

  return defaultReversibilityFor(type)
}

// Resolve the auto-resolve strategy, then clamp for safety: a one-way door or a
// compliance type may NEVER be tagro_default (docs §6).
function resolveAutoResolveStrategy(
  type: Parameters<typeof defaultAutoResolveStrategyFor>[0],
  reversibility: DecisionReversibility,
  modelChoice: string | undefined,
): AutoResolveStrategy {
  let strategy: AutoResolveStrategy = isAutoResolveStrategy(modelChoice)
    ? modelChoice
    : defaultAutoResolveStrategyFor(type)

  const compliance = type === 'legal' || type === 'contract' || type === 'payment' || type === 'data_protection'
  if (strategy === 'tagro_default' && (reversibility !== 'two_way_door' || compliance)) {
    strategy = compliance ? 'hold' : 'escalate_only'
  }
  return strategy
}


// ── Prompt builder ──────────────────────────────────────────────────────────

function buildFramerPrompt(intent: DecisionIntent, responseTypeHint: ResponseType | undefined): string {
  const lines: string[] = [
    'Eingang:',
    `decision_type: ${intent.decisionType}`,
    `urgency: ${intent.urgency}`,
    `origin: ${intent.origin.kind} — ${intent.origin.reason}`,
    `raw_title: ${intent.rawTitle}`,
    `raw_question: ${intent.rawQuestion}`,
  ]
  if (responseTypeHint) lines.push(`response_type_hint: ${responseTypeHint}`)
  if (intent.rawOptionSeeds && intent.rawOptionSeeds.length > 0) {
    lines.push(`option_seeds:`)
    intent.rawOptionSeeds.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`))
  }
  lines.push('')
  lines.push('Antworte als JSON mit Feldern: internal_title, internal_description, client_title, client_summary, tagro_reasoning, tagro_recommendation_reason, tagro_confidence_in_framing, response_type, reversibility, auto_resolve_strategy, deadline_hard, lead_time_days, deliberation_hours, cost_of_delay_per_day, options.')
  lines.push('options[i]: { label, client_label, description, technical_notes, implications {cost_delta, time_delta_days, risk_delta, scope_delta}, recommended_by_tagro }.')
  return lines.join('\n')
}


// ── Response-type resolver ──────────────────────────────────────────────────

function pickResponseType(
  modelChoice: unknown,
  hint: ResponseType | undefined,
  seeds: string[] | undefined,
): ResponseType {
  if (isResponseType(modelChoice)) return modelChoice
  if (hint) return hint
  const seedCount = seeds?.filter((s) => s && s.trim().length > 0).length ?? 0
  if (seedCount === 2) return 'binary'
  if (seedCount >= 3) return 'single_choice'
  return 'free_text'
}

function isResponseType(value: unknown): value is ResponseType {
  return value === 'binary' || value === 'single_choice' || value === 'multi_choice' || value === 'free_text'
}


// ── Option sanitizer ────────────────────────────────────────────────────────

function sanitizeOptions(
  raw: FramerOutput['options'] | undefined,
  responseType: ResponseType,
  seeds: string[] | undefined,
): FramedDecisionOption[] {
  if (responseType === 'free_text') return []

  let source: Array<{ label: string; client_label?: string; description?: string; technical_notes?: string; implications?: Partial<DecisionOptionImplications>; recommended_by_tagro?: boolean }> = []

  if (Array.isArray(raw) && raw.length > 0) {
    source = raw
      .filter((o): o is NonNullable<typeof o> => !!o && typeof o === 'object')
      .map((o) => ({
        label: String(o.label || '').trim(),
        client_label: typeof o.client_label === 'string' ? o.client_label.trim() : undefined,
        description: typeof o.description === 'string' ? o.description.trim() : undefined,
        technical_notes: typeof o.technical_notes === 'string' ? o.technical_notes.trim() : undefined,
        implications: o.implications && typeof o.implications === 'object' ? o.implications : {},
        recommended_by_tagro: !!o.recommended_by_tagro,
      }))
      .filter((o) => o.label.length > 0)
  }

  // Fallback: use seeds.
  if (source.length === 0 && seeds && seeds.length > 0) {
    source = seeds
      .filter((s) => s && s.trim().length > 0)
      .slice(0, 4)
      .map((s) => ({ label: s.trim(), implications: {}, recommended_by_tagro: false }))
  }

  // Binary fallback: yes / no.
  if (source.length === 0 && responseType === 'binary') {
    source = [
      { label: 'Ja', implications: { scope_delta: 'unchanged' }, recommended_by_tagro: false },
      { label: 'Nein', implications: { scope_delta: 'unchanged' }, recommended_by_tagro: false },
    ]
  }

  // Enforce at most 6 options and exactly one recommendation.
  source = source.slice(0, 6)
  let recommendedSeen = false
  for (const o of source) {
    if (o.recommended_by_tagro) {
      if (recommendedSeen) o.recommended_by_tagro = false
      else recommendedSeen = true
    }
  }

  return source.map((o) => ({
    label: o.label,
    clientLabel: o.client_label || o.label,
    description: o.description,
    technicalNotes: o.technical_notes,
    implications: normalizeImplications(o.implications),
    recommendedByTagro: !!o.recommended_by_tagro,
  }))
}

function normalizeImplications(raw: Partial<DecisionOptionImplications> | undefined): DecisionOptionImplications {
  if (!raw) return {}
  const allowedScalar = new Set(['unknown', 'low', 'medium', 'high'])
  const allowedScope = new Set(['narrows', 'unchanged', 'broadens'])
  const out: DecisionOptionImplications = {}
  if (typeof raw.cost_delta === 'number' || (typeof raw.cost_delta === 'string' && allowedScalar.has(raw.cost_delta))) {
    out.cost_delta = raw.cost_delta as DecisionOptionImplications['cost_delta']
  }
  if (typeof raw.time_delta_days === 'number' || (typeof raw.time_delta_days === 'string' && allowedScalar.has(raw.time_delta_days))) {
    out.time_delta_days = raw.time_delta_days as DecisionOptionImplications['time_delta_days']
  }
  if (typeof raw.risk_delta === 'string' && allowedScalar.has(raw.risk_delta)) {
    out.risk_delta = raw.risk_delta as DecisionOptionImplications['risk_delta']
  }
  if (typeof raw.scope_delta === 'string' && allowedScope.has(raw.scope_delta)) {
    out.scope_delta = raw.scope_delta as DecisionOptionImplications['scope_delta']
  }
  return out
}


// ── Heuristic fallback ──────────────────────────────────────────────────────

function heuristicFraming(intent: DecisionIntent, hint: ResponseType | undefined): FramerOutput {
  const responseType = pickResponseType(undefined, hint, intent.rawOptionSeeds)
  return {
    internal_title: intent.rawTitle,
    internal_description: intent.rawQuestion,
    client_title: toClientTitle(intent.rawTitle),
    client_summary: toClientSummary(intent.rawQuestion),
    tagro_reasoning: intent.origin.reason,
    tagro_recommendation_reason: null,
    tagro_confidence_in_framing: 0.4,
    response_type: responseType,
    options:
      responseType === 'free_text'
        ? []
        : (intent.rawOptionSeeds?.slice(0, 4).map((label) => ({
            label,
            client_label: label,
            implications: {},
            recommended_by_tagro: false,
          })) ?? (responseType === 'binary'
            ? [
                { label: 'Ja', implications: {}, recommended_by_tagro: false },
                { label: 'Nein', implications: {}, recommended_by_tagro: false },
              ]
            : [])),
  }
}


// ── Small text utilities ────────────────────────────────────────────────────

function toClientTitle(devText: string): string {
  const t = devText.trim()
  // Strip leading verbs that sound technical to clients.
  return t.replace(/^(implement|fix|setup|configure|deploy|umsetzen?:?)\s+/i, '').slice(0, 80)
}

function toClientSummary(devText: string): string {
  const t = devText.trim()
  if (t.length <= 160) return t
  return t.slice(0, 158) + '…'
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return Number(value.toFixed(2))
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? Math.round(value) : fallback
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
