/**
 * Tagro email intake — turn messy client mail into decisions, tasks, approvals.
 *
 * Draft-only: never auto-creates entities. Callers show a preview for confirm.
 * Few-shot in the system prompt is EXAMPLE ONLY (Visitenkarten fixture) —
 * pattern teaching, not a live client case.
 */

import {
  VISITENKARTEN_EMAIL_GOLD,
  visitenkartenEmailAsPaste,
} from '@/lib/tagro/fixtures/visitenkarten-email'

export type EmailIntakeIntent =
  | 'update'
  | 'change_request'
  | 'question'
  | 'decision'
  | 'approval'
  | 'noise'

export type EmailIntakeTask = {
  title: string
  why: string
  priority: 'high' | 'medium' | 'low'
}

export type EmailIntakeDecision = {
  title: string
  reason: string
  options: string[]
}

export type EmailIntakeApproval = {
  title: string
  detail: string
}

export type EmailIntakeResult = {
  intent: EmailIntakeIntent
  client_summary: string
  themes: string[]
  approvals: EmailIntakeApproval[]
  decisions: EmailIntakeDecision[]
  tasks: EmailIntakeTask[]
  followups: string[]
  risks: string[]
  tags: string[]
}

const INTENT_SET = new Set<EmailIntakeIntent>([
  'update',
  'change_request',
  'question',
  'decision',
  'approval',
  'noise',
])

/** Heuristic: pasted mail / thread vs free-form note. */
export function looksLikeClientEmail(text: string): boolean {
  const t = text.trim()
  if (t.length < 40) return false
  const signals = [
    /^(von|from|betreff|subject|an|to|datum|date)\s*:/im,
    /^(lieber?|liebe|hallo|hi|guten\s+(tag|morgen|abend)|dear)\b/im,
    /\b(viele\s+grüße|freundliche\s+grüße|best\s+regards|kind\s+regards|lg|mfg)\b/i,
    /^re:\s+/im,
    /\b(anhang|attachment|weitergeleitet|forwarded message)\b/i,
  ]
  let hits = 0
  for (const re of signals) if (re.test(t)) hits += 1
  return hits >= 2
}

export function emptyEmailIntake(): EmailIntakeResult {
  return {
    intent: 'noise',
    client_summary: '',
    themes: [],
    approvals: [],
    decisions: [],
    tasks: [],
    followups: [],
    risks: [],
    tags: [],
  }
}

/** Map intake → notes.suggest shape (same UI / spawn-tasks path). */
export function emailIntakeToNoteSuggestions(intake: EmailIntakeResult) {
  return {
    summary: intake.client_summary,
    themes: intake.themes,
    tasks: intake.tasks.map((t) => ({
      title: t.title,
      why: t.why,
      priority: t.priority,
    })),
    decisions: [
      ...intake.approvals.map((a) => ({
        title: a.title,
        reason: `Freigabe aus Kundenmail: ${a.detail}`,
        options: ['Freigabe umsetzen'] as string[],
      })),
      ...intake.decisions.map((d) => ({
        title: d.title,
        reason: d.reason,
        options: d.options,
      })),
    ].slice(0, 3),
    followups: intake.followups,
    risks: intake.risks,
    tags: intake.tags,
  }
}

function fewShotBlock(): string {
  const gold = VISITENKARTEN_EMAIL_GOLD
  return `Beispiel — Eingabe (Kundenmail):
"""
${visitenkartenEmailAsPaste()}
"""

Beispiel — erwartete Ausgabe:
${JSON.stringify(gold, null, 2)}`
}

export function emailIntakeSystemPrompt(): string {
  return `Du bist Tagro, die Delivery-Intelligence-Schicht von Festag.

Aufgabe: Eine rohe Kunden-E-Mail (oder Mail-Thread) in ruhige, konkrete Delivery-Struktur übersetzen.
Ziel: Der Nutzer muss nicht mehr im Mailverkehr klären — Freigaben, offene Entscheidungen, Tasks und Klärungen landen strukturiert in Festag.

Ausgabe (nur JSON):
{
  "intent": "update | change_request | question | decision | approval | noise",
  "client_summary": "2–3 Sätze, was der Kunde will / sagt",
  "themes": ["…"],
  "approvals": [{ "title": "…", "detail": "…" }],
  "decisions": [{ "title": "…", "reason": "…", "options": ["A","B"] }],
  "tasks": [{ "title": "…", "why": "…", "priority": "high|medium|low" }],
  "followups": ["Klärungsfrage…"],
  "risks": ["…"],
  "tags": ["…"]
}

Spielregeln:
- Nichts erfinden. Nur was in der Mail steht oder klar daraus folgt.
- approvals = bereits erteilte Freigaben / „passt / wähle X“.
- decisions = noch offene Wahl (2–4 kurze Optionen). Nicht jede Frage ist eine Entscheidung.
- tasks = konkrete Umsetzungsschritte für Agency/Dev (max 5).
- followups = ruhige Klärungsfragen an den Kunden (max 3).
- risks = Lücken oder Zielkonflikte, die die Lieferung gefährden (max 3).
- intent: change_request wenn Änderungswünsche, approval wenn nur Freigabe, decision wenn eine Richtungsfrage dominiert, question wenn vor allem Rückfragen, noise wenn irrelevant.
- Auf Deutsch, ruhig, professionell. Keine Emojis. Keine Floskeln.
- Eine Mail kann gleichzeitig Freigabe + Tasks + offene Entscheidung enthalten — alles extrahieren.

${fewShotBlock()}

Antworte AUSSCHLIESSLICH mit validem JSON, kein Markdown.`
}

export function emailIntakeUserPrompt(rawEmail: string, projectContext = ''): string {
  const ctx = projectContext.trim()
    ? `Projektkontext:\n${projectContext.trim()}\n\n`
    : ''
  return `${ctx}Kundenmail:\n${rawEmail.trim()}`
}

export function normalizeEmailIntake(parsed: unknown): EmailIntakeResult {
  const empty = emptyEmailIntake()
  if (!parsed || typeof parsed !== 'object') return empty
  const p = parsed as Record<string, unknown>

  const intentRaw = String(p.intent || '').trim() as EmailIntakeIntent
  const intent = INTENT_SET.has(intentRaw) ? intentRaw : 'change_request'

  const tasks = Array.isArray(p.tasks)
    ? p.tasks
        .map((t) => {
          const row = t as Record<string, unknown>
          const title = String(row?.title || '').trim().slice(0, 140)
          const why = String(row?.why || row?.description || '').trim().slice(0, 280)
          const priority = ['high', 'medium', 'low'].includes(String(row?.priority))
            ? (String(row.priority) as EmailIntakeTask['priority'])
            : 'medium'
          return title ? { title, why, priority } : null
        })
        .filter(Boolean)
        .slice(0, 5) as EmailIntakeTask[]
    : []

  const decisions = Array.isArray(p.decisions)
    ? p.decisions
        .map((d) => {
          const row = d as Record<string, unknown>
          const title = String(row?.title || '').trim().slice(0, 140)
          const reason = String(row?.reason || row?.why || '').trim().slice(0, 400)
          const options = Array.isArray(row?.options)
            ? row.options.map((o) => String(o).trim()).filter(Boolean).slice(0, 4)
            : []
          return title ? { title, reason, options } : null
        })
        .filter(Boolean)
        .slice(0, 3) as EmailIntakeDecision[]
    : []

  const approvals = Array.isArray(p.approvals)
    ? p.approvals
        .map((a) => {
          const row = a as Record<string, unknown>
          const title = String(row?.title || '').trim().slice(0, 140)
          const detail = String(row?.detail || row?.reason || '').trim().slice(0, 400)
          return title ? { title, detail } : null
        })
        .filter(Boolean)
        .slice(0, 3) as EmailIntakeApproval[]
    : []

  return {
    intent,
    client_summary: typeof p.client_summary === 'string' ? p.client_summary.trim() : '',
    themes: Array.isArray(p.themes) ? p.themes.slice(0, 4).map(String) : [],
    approvals,
    decisions,
    tasks,
    followups: Array.isArray(p.followups) ? p.followups.slice(0, 3).map(String) : [],
    risks: Array.isArray(p.risks) ? p.risks.slice(0, 3).map(String) : [],
    tags: Array.isArray(p.tags)
      ? p.tags.slice(0, 6).map((t) => String(t).toLowerCase().replace(/^#/, ''))
      : [],
  }
}
