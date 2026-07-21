/**
 * Tagro onboarding project-intent polish.
 * Shared by /api/onboarding/tagro-project — heuristic + LLM + short-lived cache.
 */

import { runOpenAIJson } from '@/lib/tagro/openai'

export type AssistModel = '2.1' | '2.2'
export type AssistMode = 'preview' | 'apply'

const MAX_IN = 1200
const MAX_OUT = 500
const CACHE_MAX = 48
const CACHE_TTL_MS = 5 * 60 * 1000

type CacheEntry = { description: string; tip: string; at: number; provider: string }

const cache = new Map<string, CacheEntry>()

const FILLER_START =
  /^(?:ähm+|öh+|also|ja\s+also|naja|hmm+|okay|ok|so|ähm\s+also|wir\s+(?:wollen|würden|möchten)\s+(?:gerne\s+)?|ich\s+(?:würde|möchte|will)\s+(?:gerne\s+)?|eigentlich\s+)/i

function cacheKey(text: string, model: AssistModel, mode: AssistMode) {
  return `${model}|${mode}|${text.toLowerCase()}`
}

function pruneCache() {
  if (cache.size <= CACHE_MAX) return
  const entries = Array.from(cache.entries()).sort((a, b) => a[1].at - b[1].at)
  const drop = entries.length - CACHE_MAX
  for (let i = 0; i < drop; i++) cache.delete(entries[i][0])
}

/** Instant coaching tip — no LLM. */
export function localProjectTip(raw: string): string {
  const t = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!t) {
    return 'Schreib im Feld — Tagro formuliert Formell oder Sprachlich auf Knopfdruck.'
  }
  if (t.length < 16) {
    return 'Tipp: Noch ein paar Wörter — Was baust du, und für wen?'
  }
  if (!/\b(für|fuer|kunde|kunden|team|intern|nutzer|user|startup|firma|hotel|mitarbeiter)\b/i.test(t)) {
    return 'Tipp: Ergänze kurz die Zielgruppe (Kunden, Team, intern…).'
  }
  if (t.split(/\s+/).length < 5) {
    return 'Tipp: Ein halber Satz mehr — dann wird die Formulierung präziser.'
  }
  if (/^(app|tool|software|website|plattform)\b/i.test(t) && t.length < 40) {
    return 'Tipp: Nenn den konkreten Nutzen (z. B. Buchung, Verwaltung, Reporting).'
  }
  return 'Tagro schreibt mit — tippe die Vorschau an, um sie zu übernehmen.'
}

/** Cheap local cleanup — used as LLM fallback and for very short drafts. */
export function heuristicProjectDescription(raw: string): string {
  let t = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!t) return ''

  // Strip speech / hesitation openers once or twice.
  for (let i = 0; i < 2; i++) {
    const next = t.replace(FILLER_START, '').trim()
    if (next === t) break
    t = next
  }

  // Drop trailing filler crumbs.
  t = t.replace(/[,\s]+(?:ähm+|öh+|ja|also)\s*$/i, '').trim()

  if (t.length) {
    t = t.charAt(0).toUpperCase() + t.slice(1)
  }

  // Sentence-ish texts get a period; fragments stay as-is.
  if (t.length >= 28 && !/[.!?…]$/.test(t) && /\s/.test(t)) {
    t = `${t}.`
  }

  return t.slice(0, MAX_OUT)
}

function buildPrompt(text: string, model: AssistModel, mode: AssistMode): string {
  const style =
    model === '2.2'
      ? `- 2–3 kurze Sätze: Was wird gebaut, für wen, warum es zählt
- Konkrete Domäne und Produktnamen behalten`
      : `- 1–2 Sätze, sehr knapp
- Nur Was + für wen (keine Ausschmückung)`

  const modeNote =
    mode === 'preview'
      ? `- Preview-Modus: schnell und klar, keine Ausschweifung`
      : `- Final-Modus: so formulieren, dass es direkt als Projektabsicht im Portal stehen kann`

  return `Du bist Tagro ${model}, der Formulierungshilfe für Festag-Onboarding.
Festag ist Delivery Intelligence — die Absicht soll einem Kunden/CEO sofort klar machen, woran gearbeitet wird.
Antworte NUR als JSON: {"description":"string","tip":"string"}

Regeln:
${style}
${modeNote}
- Deutsch
- Keine Marketing-Floskeln (innovativ, revolutionär, next-gen, ganzheitlich, synerg…)
- Nichts erfinden, was nicht im Text steckt
- Keine Aufzählungszeichen, keine Anrede, kein „Wir bei …“
- Max ${MAX_OUT} Zeichen für description
- tip: ein kurzer, ruhiger Hinweis (max 110 Zeichen), der dem Nutzer hilft, den Entwurf zu verbessern — oder leer "", wenn die Formulierung schon klar ist

Beispiele:
Eingabe: "app für hotelzimmer buchen intern"
Ausgabe: {"description":"Interne Software zur Buchung von Hotelzimmern.","tip":""}
Eingabe: "tool"
Ausgabe: {"description":"Tool.","tip":"Sag kurz, was das Tool tut und für wen."}

Text: """${text}"""`
}

export async function polishOnboardingProject(opts: {
  text?: string
  model?: string
  mode?: string
}): Promise<{
  ok: true
  description: string
  tip: string
  model: string
  mode: AssistMode
  changed: boolean
  cached: boolean
  provider: string
} | {
  ok: false
  reason: string
}> {
  const raw = String(opts.text || '').trim().slice(0, MAX_IN)
  if (!raw) return { ok: false, reason: 'text_required' }

  const model: AssistModel = opts.model === '2.2' ? '2.2' : '2.1'
  const mode: AssistMode = opts.mode === 'apply' ? 'apply' : 'preview'
  const cleaned = heuristicProjectDescription(raw)
  const tipFallback = localProjectTip(raw)

  // Tiny drafts: no LLM round-trip for live preview.
  if (mode === 'preview' && cleaned.length < 12) {
    return {
      ok: true,
      description: cleaned,
      tip: tipFallback,
      model: `tagro ${model}`,
      mode,
      changed: cleaned !== raw,
      cached: false,
      provider: 'heuristic',
    }
  }

  const key = cacheKey(cleaned, model, mode)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return {
      ok: true,
      description: hit.description,
      tip: hit.tip || tipFallback,
      model: `tagro ${model}`,
      mode,
      changed: hit.description !== raw,
      cached: true,
      provider: hit.provider,
    }
  }

  const { output, model: providerModel, status } = await runOpenAIJson({
    runType: mode === 'apply' ? 'onboarding_project_assist_apply' : 'onboarding_project_assist_preview',
    prompt: buildPrompt(cleaned, model, mode),
    fallback: () => ({ description: cleaned, tip: tipFallback }),
  })

  let description = String((output as { description?: string })?.description || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_OUT)

  if (!description) description = cleaned

  if (/^(n\/a|keine angabe|\.{1,3}|—|–)$/i.test(description)) {
    description = cleaned
  }

  let tip = String((output as { tip?: string })?.tip || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  if (!tip) tip = tipFallback

  const provider = status === 'completed' ? String(providerModel || 'llm') : 'heuristic'
  cache.set(key, { description, tip, at: Date.now(), provider })
  if (mode === 'apply') {
    cache.set(cacheKey(cleaned, model, 'preview'), { description, tip, at: Date.now(), provider })
  }
  pruneCache()

  return {
    ok: true,
    description,
    tip,
    model: `tagro ${model}`,
    mode,
    changed: description !== raw,
    cached: false,
    provider,
  }
}
