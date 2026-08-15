// ─────────────────────────────────────────────────────────────────────────────
// Tagro schreibt die Sprache, nicht die Zahlen.
//
// Die Erkennung (lib/risks/detect.ts) entscheidet, *ob* ein Risiko existiert,
// und lib/risks/severity.ts, *wie schwer* es wiegt. Beides bleibt
// deterministisch. Tagro formuliert daraus die Kundenfassung und die
// Empfehlung — und jedes Feld wird geprüft, bevor es in die Datenbank geht.
//
// Fällt das Modell aus oder liefert es Unbrauchbares, bleibt die heuristische
// Fassung stehen. Nie ein leeres Feld, nie erfundene Zahlen.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { runOpenAIJson } from '@/lib/tagro/openai'
import { writeEvent } from '@/lib/risks/engine'
import { containsTechnicalLanguage, delayLabel } from '@/lib/risks/present'
import type { Risk, RiskSignal } from '@/lib/risks/types'

export type RiskFraming = {
  client_title: string
  client_summary: string
  recommendation: string
  recommendation_reason: string
}

const MAX = {
  client_title: 90,
  client_summary: 320,
  recommendation: 120,
  recommendation_reason: 240,
}

const SYSTEM = `Du bist Tagro, die Intelligenzschicht von Festag.

Du bewertest nichts neu. Wahrscheinlichkeit, Auswirkung und Schweregrad stehen
bereits fest — du formulierst nur.

Zwei Sprachen, eine Sache:
- Der Kunde liest Konsequenz, nie Technik. Keine Begriffe wie PR, CI, Branch,
  Commit, Deployment, Middleware, Endpoint.
- Die Empfehlung ist eine Handlung, kein Hinweis. Ein Satz, konkret.

Ruhig, präzise, ohne Alarmton. Kein Marketing, keine Ausrufezeichen.
Antworte ausschließlich als valides JSON-Objekt.`

function buildPrompt(risk: Risk, signals: RiskSignal[], ctx: { projectTitle?: string | null; targetDate?: string | null }) {
  const evidence = signals.length
    ? signals.map(s => `- ${s.label}${s.detail ? ` (${s.detail})` : ''}`).join('\n')
    : '- (keine strukturierten Belege)'
  const consequence = delayLabel(risk.potential_delay_days)

  return `PROJEKT: ${ctx.projectTitle ?? 'unbenannt'}
ZIELTERMIN: ${ctx.targetDate ?? 'nicht gesetzt'}

RISIKO (intern formuliert)
Titel: ${risk.title}
Beschreibung: ${risk.description ?? '—'}
Kategorie: ${risk.category}
Wahrscheinlichkeit: ${Math.round((risk.probability ?? 0.5) * 100)}%
Auswirkung: ${risk.impact}
Schweregrad: ${risk.severity}
Mögliche Folge: ${consequence ?? 'nicht beziffert'}

BELEGE
${evidence}

BISHERIGE FASSUNG (heuristisch, darf ersetzt werden)
client_title: ${risk.client_title ?? '—'}
client_summary: ${risk.client_summary ?? '—'}
recommendation: ${risk.recommendation ?? '—'}
recommendation_reason: ${risk.recommendation_reason ?? '—'}

Antworte als JSON:
{
  "client_title": "kurze Überschrift für den Kunden, max 90 Zeichen, benennt die Auswirkung aufs Projekt",
  "client_summary": "zwei bis drei Sätze, was das für Termin/Ergebnis bedeutet, ohne Technik",
  "recommendation": "eine konkrete Handlung, max 120 Zeichen",
  "recommendation_reason": "ein Satz, warum genau das jetzt hilft"
}`
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/\s+/g, ' ')
  if (text.length < 8) return null
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

/**
 * Fragt Tagro nach der Formulierung. Gibt nur Felder zurück, die die Prüfung
 * bestanden haben — Kundentext mit Entwicklervokabular wird verworfen, nicht
 * repariert.
 */
export async function generateRiskFraming(
  risk: Risk,
  signals: RiskSignal[],
  ctx: { projectTitle?: string | null; targetDate?: string | null } = {},
): Promise<{ framing: Partial<RiskFraming>; model: string; rejected: string[] }> {
  const result = await runOpenAIJson({
    prompt: `${SYSTEM}\n\n${buildPrompt(risk, signals, ctx)}`,
    runType: 'risk_framing',
    // Ohne Modell bleibt alles, wie es ist.
    fallback: () => ({}),
  })

  const raw = (result.output ?? {}) as Record<string, unknown>
  const framing: Partial<RiskFraming> = {}
  const rejected: string[] = []

  const clientTitle = clean(raw.client_title, MAX.client_title)
  const clientSummary = clean(raw.client_summary, MAX.client_summary)
  const recommendation = clean(raw.recommendation, MAX.recommendation)
  const reason = clean(raw.recommendation_reason, MAX.recommendation_reason)

  // Die Kundenfassung ist der einzige Text, der das Haus verlässt, ohne dass
  // ihn jemand aus dem Team gelesen hat — deshalb hier die harte Grenze.
  if (clientTitle && containsTechnicalLanguage(clientTitle)) rejected.push('client_title')
  else if (clientTitle) framing.client_title = clientTitle

  if (clientSummary && containsTechnicalLanguage(clientSummary)) rejected.push('client_summary')
  else if (clientSummary) framing.client_summary = clientSummary

  if (recommendation) framing.recommendation = recommendation
  if (reason) framing.recommendation_reason = reason

  return { framing, model: result.model ?? 'heuristic', rejected }
}

/** Schreibt die geprüfte Fassung und hält im Verlauf fest, dass Tagro sie verfasst hat. */
export async function enrichRisk(
  supa: SupabaseClient<any, any, any>,
  risk: Risk,
  signals: RiskSignal[],
  ctx: { projectTitle?: string | null; targetDate?: string | null } = {},
): Promise<Partial<RiskFraming> | null> {
  const { framing, model, rejected } = await generateRiskFraming(risk, signals, ctx)
  if (!Object.keys(framing).length) return null

  const { error } = await (supa as any).from('risks').update(framing).eq('id', risk.id)
  if (error) return null

  await writeEvent(supa, risk.id, {
    event_type: 'framed',
    actor_kind: 'tagro',
    summary: 'Tagro hat die Kundenfassung und die Empfehlung formuliert.',
    payload: { model, fields: Object.keys(framing), rejected },
  })

  return framing
}
