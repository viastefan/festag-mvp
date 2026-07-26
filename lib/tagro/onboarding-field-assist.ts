/**
 * Tagro onboarding assist for name, position, and invite fields.
 * Shared by /api/onboarding/tagro-field — heuristic + LLM + short-lived cache.
 */

import { runOpenAIJson } from '@/lib/tagro/openai'

export type FieldVariant = 'name' | 'position' | 'invite'
export type AssistModel = '2.1' | '2.2'
export type AssistMode = 'preview' | 'apply'

const CACHE_MAX = 48
const CACHE_TTL_MS = 5 * 60 * 1000

const MAX_IN: Record<FieldVariant, number> = {
  name: 120,
  position: 120,
  invite: 2000,
}

const MAX_OUT: Record<FieldVariant, number> = {
  name: 80,
  position: 64,
  invite: 2000,
}

type CacheEntry = { description: string; tip: string; at: number; provider: string }

const cache = new Map<string, CacheEntry>()

const FILLER_START =
  /^(?:ähm+|öh+|also|ja\s+also|naja|hmm+|okay|ok|so|ähm\s+also|ich\s+(?:heiße|heisse|bin)\s+)/i

const PARTICLE = /^(von|van|de|der|den|zu|zur|und|la|le)$/i

function cacheKey(variant: FieldVariant, text: string, model: AssistModel, mode: AssistMode) {
  return `${variant}|${model}|${mode}|${text.toLowerCase()}`
}

function pruneCache() {
  if (cache.size <= CACHE_MAX) return
  const entries = Array.from(cache.entries()).sort((a, b) => a[1].at - b[1].at)
  const drop = entries.length - CACHE_MAX
  for (let i = 0; i < drop; i++) cache.delete(entries[i][0])
}

export function localNameTip(raw: string): string {
  const t = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!t) return 'Schreib unten deinen Namen — Tagro hilft bei klarer Schreibweise.'
  if (t.split(/\s+/).length < 2) return 'Tipp: Vor- und Nachname wirken klarer im Workspace.'
  if (/^(ich|mein|name)/i.test(t)) return 'Tipp: Nur den Namen, ohne „Ich heiße…“.'
  return 'Tagro schreibt mit — tippe die Vorschau an, um sie zu übernehmen.'
}

export function localPositionTip(raw: string): string {
  const t = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!t) return 'Schreib unten deine Rolle — Tagro hält den Titel kurz und klar.'
  if (t.length < 4) return 'Tipp: Kurz die Rolle, z. B. Gründer oder Product Lead.'
  if (/^(ich\s+bin|als)\b/i.test(t)) return 'Tipp: Nur den Titel, ohne „Ich bin…“.'
  return 'Tagro schreibt mit — tippe die Vorschau an, um sie zu übernehmen.'
}

export function localInviteTip(raw: string): string {
  const t = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!t) return 'Schreib E-Mails unten rein — Tagro sortiert und bereinigt die Liste live.'
  const parts = t.split(/[\s,;]+/).filter(Boolean)
  const withAt = parts.filter((p) => p.includes('@'))
  if (!withAt.length) return 'Tipp: Eine oder mehrere E-Mails, getrennt mit Komma.'
  if (withAt.length < parts.length) return 'Tipp: Ungültige Einträge werden beim Übernehmen entfernt.'
  return 'Tagro bereinigt die Liste — tippe die Vorschau an zum Übernehmen.'
}

export function localFieldTip(variant: FieldVariant, raw: string): string {
  if (variant === 'name') return localNameTip(raw)
  if (variant === 'position') return localPositionTip(raw)
  return localInviteTip(raw)
}

/** Title-case name, keep German particles lowercase. */
export function heuristicName(raw: string): string {
  let t = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''

  for (let i = 0; i < 2; i++) {
    const next = t.replace(FILLER_START, '').trim()
    if (next === t) break
    t = next
  }

  t = t.replace(/^[,.\-–—\s]+/, '').replace(/[,.\-–—\s]+$/, '').trim()

  return t
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (PARTICLE.test(w)) return w.toLowerCase()
      if (w.includes('-')) {
        return w
          .split('-')
          .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
          .join('-')
      }
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
    .slice(0, MAX_OUT.name)
}

export function heuristicPosition(raw: string): string {
  let t = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''

  t = t
    .replace(/^(?:ich\s+bin\s+|als\s+|mein\s+titel\s+(?:ist\s+)?)/i, '')
    .replace(/^[,.\-–—\s]+/, '')
    .replace(/[,.\-–—\s]+$/, '')
    .trim()

  if (!t) return ''
  return (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, MAX_OUT.position)
}

const EMAIL_RE = /[a-z0-9][a-z0-9._%+\-]*@[a-z0-9][a-z0-9.\-]*\.[a-z]{2,}/gi

/** Extract + dedupe emails; keep order. */
export function heuristicInvite(raw: string): string {
  const seen = new Set<string>()
  const out: string[] = []

  const fromRegex = String(raw || '').match(EMAIL_RE) || []
  for (const m of fromRegex) {
    const email = m.toLowerCase()
    if (seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }

  if (out.length) return out.join(', ').slice(0, MAX_OUT.invite)

  // Fallback: split tokens that look like emails
  for (const part of String(raw || '').split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase()
    if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) continue
    if (seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }

  return out.join(', ').slice(0, MAX_OUT.invite)
}

export function heuristicField(variant: FieldVariant, raw: string): string {
  if (variant === 'name') return heuristicName(raw)
  if (variant === 'position') return heuristicPosition(raw)
  return heuristicInvite(raw)
}

function buildPrompt(variant: FieldVariant, text: string, model: AssistModel, mode: AssistMode): string {
  const modeNote =
    mode === 'preview'
      ? '- Preview-Modus: schnell und klar'
      : '- Final-Modus: so übernehmen, dass es direkt im Feld stehen kann'

  if (variant === 'name') {
    return `Du bist Tagro ${model}, Formulierungshilfe für Festag-Onboarding (Profilname).
Antworte NUR als JSON: {"description":"string","tip":"string"}

Regeln:
- description: bereinigter Anzeigename (Vor- + Nachname oder Rufname), max ${MAX_OUT.name} Zeichen
- Deutsch übliche Großschreibung, Partikel wie „von“ klein
- Keine Anrede, kein „Ich heiße…“, kein Titel/Firma im Namen
- Nichts erfinden
- tip: kurzer Hinweis max 110 Zeichen, oder "" wenn klar
${modeNote}

Text: """${text}"""`
  }

  if (variant === 'position') {
    return `Du bist Tagro ${model}, Formulierungshilfe für Festag-Onboarding (Position/Rolle).
Antworte NUR als JSON: {"description":"string","tip":"string"}

Regeln:
- description: kurzer Jobtitel/Rolle, max ${MAX_OUT.position} Zeichen
- Kein „Ich bin…“, keine ganzen Sätze
- Deutsch oder gängige englische Titel (CEO, Product Lead) ok
- Nichts erfinden
- tip: kurzer Hinweis max 110 Zeichen, oder "" wenn klar
${modeNote}

Text: """${text}"""`
  }

  return `Du bist Tagro ${model}, Formulierungshilfe für Festag-Onboarding (Team-Einladungen).
Antworte NUR als JSON: {"description":"string","tip":"string"}

Regeln:
- description: nur gültige E-Mail-Adressen, kommagetrennt, lowercase, dedupliziert
- Aus Freitext/Sprache E-Mails extrahieren (z. B. „max at firma punkt de“ → max@firma.de wenn erkennbar)
- Keine Namen ohne E-Mail behalten
- Max ${MAX_OUT.invite} Zeichen
- tip: kurzer Hinweis max 110 Zeichen, oder "" wenn die Liste klar ist
${modeNote}

Text: """${text}"""`
}

export async function polishOnboardingField(opts: {
  text?: string
  variant?: string
  model?: string
  mode?: string
}): Promise<{
  ok: true
  description: string
  tip: string
  variant: FieldVariant
  model: string
  mode: AssistMode
  changed: boolean
  cached: boolean
  provider: string
} | {
  ok: false
  reason: string
}> {
  const variantRaw = String(opts.variant || '').trim()
  if (variantRaw !== 'name' && variantRaw !== 'position' && variantRaw !== 'invite') {
    return { ok: false, reason: 'variant_required' }
  }
  const variant: FieldVariant = variantRaw

  const raw = String(opts.text || '').trim().slice(0, MAX_IN[variant])
  if (!raw) return { ok: false, reason: 'text_required' }

  const model: AssistModel = opts.model === '2.2' ? '2.2' : '2.1'
  const mode: AssistMode = opts.mode === 'apply' ? 'apply' : 'preview'
  const cleaned = heuristicField(variant, raw)
  const tipFallback = localFieldTip(variant, raw)

  // Tiny / empty-after-clean previews: skip LLM.
  const skipLlm =
    mode === 'preview'
    && (
      (variant === 'invite' && cleaned.length < 5)
      || (variant !== 'invite' && cleaned.length < 3)
    )

  if (skipLlm) {
    return {
      ok: true,
      description: cleaned || raw.slice(0, MAX_OUT[variant]),
      tip: tipFallback,
      variant,
      model: `tagro ${model}`,
      mode,
      changed: cleaned !== raw,
      cached: false,
      provider: 'heuristic',
    }
  }

  const key = cacheKey(variant, cleaned || raw, model, mode)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return {
      ok: true,
      description: hit.description,
      tip: hit.tip || tipFallback,
      variant,
      model: `tagro ${model}`,
      mode,
      changed: hit.description !== raw,
      cached: true,
      provider: hit.provider,
    }
  }

  const { output, model: providerModel, status } = await runOpenAIJson({
    runType: `onboarding_${variant}_assist_${mode}`,
    prompt: buildPrompt(variant, cleaned || raw, model, mode),
    fallback: () => ({
      description: cleaned || raw.slice(0, MAX_OUT[variant]),
      tip: tipFallback,
    }),
  })

  let description = String((output as { description?: string })?.description || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_OUT[variant])

  if (!description) description = cleaned || raw.slice(0, MAX_OUT[variant])

  // Invite: re-run heuristic on LLM output so we never keep junk.
  if (variant === 'invite') {
    description = heuristicInvite(description) || heuristicInvite(raw) || description
  } else if (variant === 'name') {
    description = heuristicName(description) || description
  } else if (variant === 'position') {
    description = heuristicPosition(description) || description
  }

  if (/^(n\/a|keine angabe|\.{1,3}|—|–)$/i.test(description)) {
    description = cleaned || raw.slice(0, MAX_OUT[variant])
  }

  let tip = String((output as { tip?: string })?.tip || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  if (!tip) tip = tipFallback

  const provider = status === 'completed' ? String(providerModel || 'llm') : 'heuristic'
  cache.set(key, { description, tip, at: Date.now(), provider })
  if (mode === 'apply') {
    cache.set(cacheKey(variant, cleaned || raw, model, 'preview'), {
      description,
      tip,
      at: Date.now(),
      provider,
    })
  }
  pruneCache()

  return {
    ok: true,
    description,
    tip,
    variant,
    model: `tagro ${model}`,
    mode,
    changed: description !== raw,
    cached: false,
    provider,
  }
}
