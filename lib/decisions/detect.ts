// ─────────────────────────────────────────────────────────────────────────────
// Decision Engine — Detector
//
// Six detection paths feed the same pipeline. Each takes a typed Signal and
// either returns a DecisionIntent or null. The intent is dev-language; the
// framer downstream produces both internal and client framing.
//
// The detector is deterministic where it can be (vague titles, blocker
// keywords, dev_request always fires) and only escalates to an LLM when
// nuance is required (scope drift narrative, risk classification). Keeping
// the hot path heuristic protects against false positives that would spam
// the client.
//
// Detection NEVER writes to the DB. Persistence is a separate step.
// ─────────────────────────────────────────────────────────────────────────────

import { runOpenAIJson } from '@/lib/tagro/openai'
import type {
  DecisionIntent,
  DecisionSignal,
} from './intents'
import type {
  DecisionType,
  DecisionUrgency,
  ResponseType,
} from './types'

// ── Vague task ──────────────────────────────────────────────────────────────

const VAGUE_TITLE_PATTERNS = [
  /\b(improve|verbessern|optimieren|fixen?|fix)\b/i,
  /\b(stuff|things|kram|sachen|zeug)\b/i,
  /\b(später|todo|tbd|tba)\b/i,
  /^(.{1,12})$/, // very short titles
]

function looksVague(title: string, description: string | null, acceptance: string[]): boolean {
  const t = (title || '').trim()
  if (!t) return true
  const hasShortVague = VAGUE_TITLE_PATTERNS.some((re) => re.test(t))
  const emptyAcceptance = !acceptance || acceptance.length === 0
  const shallowDesc = !description || description.trim().length < 24
  // Two of three signals → vague.
  let score = 0
  if (hasShortVague) score += 1
  if (emptyAcceptance) score += 1
  if (shallowDesc) score += 1
  return score >= 2
}

function detectVagueTask(signal: Extract<DecisionSignal, { kind: 'vague_task' }>): DecisionIntent | null {
  if (!looksVague(signal.title, signal.description, signal.acceptanceCriteria)) return null
  return {
    projectId: signal.projectId,
    decisionType: 'clarification',
    urgency: 'normal',
    origin: { kind: 'vague_task', id: signal.taskId, reason: 'Task fehlt klare Akzeptanzkriterien' },
    rawTitle: `Was genau ist Umfang von „${signal.title}"?`,
    rawQuestion: `Der Task „${signal.title}" hat keine klaren Akzeptanzkriterien. Welche Anforderungen gelten konkret?`,
    rawOptionSeeds: [],
    hints: { responseType: 'free_text' },
    blocks: [{ kind: 'task', id: signal.taskId }],
    signal,
  }
}


// ── Blocker ──────────────────────────────────────────────────────────────────

const BLOCKER_CHOICE_KEYWORDS = [
  /\b(welche[rs]?|which|what)\b/i,
  /\b(option[a-z]*|variante[a-z]*)\b/i,
  /\b(soll[ten]?|sollen|should)\b/i,
  /\b(entscheid|decide|decision)/i,
  /\b(brauchen?|need)\b.*\b(input|feedback|info)/i,
]

function detectBlocker(signal: Extract<DecisionSignal, { kind: 'blocker' }>): DecisionIntent | null {
  const reason = (signal.blockerReason || '').trim()
  if (!reason) return null
  const looksLikeChoice = BLOCKER_CHOICE_KEYWORDS.some((re) => re.test(reason))
  if (!looksLikeChoice) return null

  return {
    projectId: signal.projectId,
    decisionType: 'direction',
    urgency: 'high', // blocker → likely blocking work
    origin: { kind: 'blocker', id: signal.taskId, reason: 'Blocker erfordert externe Entscheidung' },
    rawTitle: signal.taskTitle ? `Blocker bei „${signal.taskTitle}"` : 'Blocker erfordert Entscheidung',
    rawQuestion: reason,
    rawOptionSeeds: extractInlineOptions(reason),
    hints: {},
    blocks: [{ kind: 'task', id: signal.taskId }],
    signal,
  }
}

// "Option A: ... Option B: ..." or "Variante 1: ..." → seed list.
function extractInlineOptions(text: string): string[] {
  const optionRe = /(?:^|\n|\s)(?:option[a-z]*|variante[a-z]*)\s*[a-z0-9]+[:.\-)\s]+([^\n]+)/gi
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = optionRe.exec(text)) && out.length < 4) {
    const cleaned = m[1].trim().replace(/[.,;]+$/, '')
    if (cleaned.length > 2) out.push(cleaned)
  }
  return out
}


// ── Dev request (explicit) ───────────────────────────────────────────────────

function detectDevRequest(signal: Extract<DecisionSignal, { kind: 'dev_request' }>): DecisionIntent | null {
  const question = (signal.question || '').trim()
  if (!question) return null
  return {
    projectId: signal.projectId,
    decisionType: signal.suggestedDecisionType || 'direction',
    urgency: signal.urgency || 'normal',
    origin: { kind: 'dev_request', id: signal.taskId ?? null, reason: 'Entwickler hat eine Entscheidung angefordert' },
    rawTitle: question.length > 80 ? question.slice(0, 78) + '…' : question,
    rawQuestion: question,
    rawOptionSeeds: signal.suggestedOptions?.filter((o) => o && o.trim().length > 0) ?? [],
    hints: {
      responseType: signal.suggestedResponseType,
    },
    blocks: signal.taskId ? [{ kind: 'task', id: signal.taskId }] : [],
    signal,
  }
}


// ── Scope drift ──────────────────────────────────────────────────────────────

function detectScopeDrift(signal: Extract<DecisionSignal, { kind: 'scope_drift' }>): DecisionIntent | null {
  if (!signal.observation || signal.observation.trim().length < 12) return null
  const urgency: DecisionUrgency = signal.severity === 'critical' ? 'critical' : signal.severity === 'high' ? 'high' : 'normal'
  return {
    projectId: signal.projectId,
    decisionType: 'scope',
    urgency,
    origin: { kind: 'scope_drift', id: null, reason: signal.observation.slice(0, 200) },
    rawTitle: 'Scope-Veränderung bestätigen',
    rawQuestion: `Im Projektverlauf hat sich der Umfang verschoben: ${signal.observation}. Sollen wir den neuen Umfang annehmen oder zurück zum ursprünglichen Auftrag?`,
    rawOptionSeeds: ['Neuen Umfang annehmen', 'Zurück zum ursprünglichen Umfang', 'Teilweise — Details klären'],
    hints: { responseType: 'single_choice' },
    affects: signal.affectedTaskIds.map((id) => ({ kind: 'task' as const, id })),
    signal,
  }
}


// ── Risk threshold ───────────────────────────────────────────────────────────

function detectRiskThreshold(signal: Extract<DecisionSignal, { kind: 'risk_threshold' }>): DecisionIntent | null {
  if (!signal.riskDescription || signal.riskDescription.trim().length < 12) return null
  const urgency: DecisionUrgency = signal.severity === 'critical' ? 'critical' : signal.severity === 'high' ? 'high' : 'normal'
  return {
    projectId: signal.projectId,
    decisionType: 'risk_response',
    urgency,
    origin: { kind: 'risk_threshold', id: null, reason: signal.riskDescription.slice(0, 200) },
    rawTitle: 'Risiko-Reaktion abstimmen',
    rawQuestion: `Es besteht ein Risiko für das Projekt: ${signal.riskDescription}. Wie wollen wir damit umgehen?`,
    rawOptionSeeds: ['Risiko akzeptieren', 'Gegenmaßnahme einleiten', 'Projekt-Rahmen anpassen'],
    hints: { responseType: 'single_choice' },
    signal,
  }
}


// ── Status report open question ─────────────────────────────────────────────

function detectStatusReportQuestion(signal: Extract<DecisionSignal, { kind: 'status_report' }>): DecisionIntent | null {
  const q = (signal.openQuestion || '').trim()
  if (!q || q.length < 8) return null
  return {
    projectId: signal.projectId,
    decisionType: 'clarification',
    urgency: 'normal',
    origin: { kind: 'status_report', id: signal.reportId, reason: 'Offene Frage aus Statusbericht' },
    rawTitle: q.length > 80 ? q.slice(0, 78) + '…' : q,
    rawQuestion: q,
    rawOptionSeeds: [],
    hints: { responseType: 'free_text' },
    signal,
  }
}


// ── Dispatcher ───────────────────────────────────────────────────────────────

export function detectFromSignal(signal: DecisionSignal): DecisionIntent | null {
  switch (signal.kind) {
    case 'vague_task':
      return detectVagueTask(signal)
    case 'blocker':
      return detectBlocker(signal)
    case 'dev_request':
      return detectDevRequest(signal)
    case 'scope_drift':
      return detectScopeDrift(signal)
    case 'risk_threshold':
      return detectRiskThreshold(signal)
    case 'status_report':
      return detectStatusReportQuestion(signal)
    default:
      return null
  }
}


// ── Optional LLM-augmented intent classifier ────────────────────────────────
//
// Used by upstream code that has a free-form text blob (a chat message, a
// status-report paragraph) and isn't sure whether it implies a decision.
// Returns a synthesised dev_request signal when the LLM says yes.
//
// Stays optional. Without an API key, returns null. With an API key, runs a
// small JSON-only classifier prompt.

export type ClassifyInput = {
  projectId: string
  text: string
  taskId?: string
  authorUserId?: string | null
}

export async function classifyDecisionNeed(input: ClassifyInput): Promise<DecisionSignal | null> {
  const text = input.text?.trim()
  if (!text || text.length < 12) return null

  // Cheap pre-filter so we don't call the LLM on every message.
  if (!/[?]|welche|which|sollen|should|brauche?n?|need|entscheid|decision|option|variant/i.test(text)) {
    return null
  }

  const { output, status } = await runOpenAIJson({
    runType: 'decision_classify',
    prompt: [
      'Klassifiziere folgenden Text. Frage: enthält er eine Entscheidung, die ein Auftraggeber treffen muss?',
      '',
      'Text:',
      text,
      '',
      'Antworte als JSON: { "is_decision": boolean, "question": string|null, "decision_type": string|null, "response_type": "binary"|"single_choice"|"multi_choice"|"free_text"|null, "options": string[] }',
      '',
      'Regeln:',
      '- Nur wenn der Text klar etwas zur Wahl stellt, das vom Auftraggeber beantwortet werden muss → is_decision=true.',
      '- Reine Statusupdates, technische Notizen, fertige Arbeit → false.',
      '- options nur, wenn sie explizit im Text genannt werden, sonst leeres Array.',
      '- question umformulieren als klare, einzeilige Frage.',
    ].join('\n'),
    fallback: () => ({ is_decision: false }),
  })

  if (status === 'fallback' || !output) return null
  if (!output.is_decision) return null

  const question = typeof output.question === 'string' ? output.question.trim() : ''
  if (!question) return null

  const responseType = isResponseType(output.response_type) ? output.response_type : undefined
  const decisionType = isDecisionType(output.decision_type) ? output.decision_type : undefined
  const options = Array.isArray(output.options)
    ? output.options.filter((o: unknown): o is string => typeof o === 'string' && o.trim().length > 0).slice(0, 4)
    : []

  return {
    kind: 'dev_request',
    projectId: input.projectId,
    taskId: input.taskId,
    authorUserId: input.authorUserId ?? null,
    question,
    suggestedOptions: options,
    suggestedResponseType: responseType,
    suggestedDecisionType: decisionType,
  }
}

function isResponseType(value: unknown): value is ResponseType {
  return value === 'binary' || value === 'single_choice' || value === 'multi_choice' || value === 'free_text'
}

function isDecisionType(value: unknown): value is DecisionType {
  return typeof value === 'string' && [
    'scope', 'budget', 'direction', 'approval', 'risk_response', 'tradeoff',
    'clarification', 'escalation', 'legal', 'payment', 'contract', 'data_protection',
  ].includes(value)
}
