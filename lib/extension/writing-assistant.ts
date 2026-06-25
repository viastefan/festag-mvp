import { createClient as createServiceClient } from '@supabase/supabase-js'
import { tagroComplete } from '@/lib/tagro/complete'
import { extractJsonObject } from '@/lib/tagro/json'
import { loadTagroMemoryContext, rememberTagroMemory } from '@/lib/tagro-memory'
import { getSupabaseUrl } from '@/lib/supabase/env'

export const WRITING_ACTIONS = ['clearer', 'professional', 'shorter', 'casual', 'explain', 'translate', 'feedback'] as const
export type WritingAction = (typeof WRITING_ACTIONS)[number]

const ACTION_PROMPTS: Record<WritingAction, string> = {
  clearer: 'Formuliere den Text klarer und verständlicher. Gleiche Bedeutung, weniger Missverständnisse.',
  professional: 'Formuliere den Text professioneller und höflicher. Gleiche Bedeutung, besser für Business-Kommunikation.',
  shorter: 'Kürze den Text ohne die Kernaussage zu verlieren. Prägnant und direkt.',
  casual: 'Formuliere den Text lockerer und natürlicher. Gleiche Bedeutung, weniger steif.',
  explain: 'Erkläre den Text in einfachen, verständlichen Worten — kurz und klar, ohne den Inhalt zu verändern.',
  translate: 'Übersetze den Text ins Englische. Wenn der Text bereits Englisch ist, ins Deutsche. Gleiche Bedeutung, natürliche Sprache.',
  feedback: 'Gib kurzes gesprochenes Live-Feedback in 1–2 Sätzen zum markierten Text: Ton, Klarheit, Wirkung — ohne den Text zu wiederholen.',
}

const STYLE_MEMORY_KEY = 'extension_writing_style'

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createServiceClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function pageDomain(url?: string | null) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

type WritingEvent = {
  original_text: string
  improved_text: string
  action: string
  page_domain: string | null
}

export async function loadRecentWritingExamples(userId: string, limit = 6): Promise<WritingEvent[]> {
  const sb = serviceClient()
  if (!sb) return []
  const { data } = await sb
    .from('extension_writing_events')
    .select('original_text,improved_text,action,page_domain')
    .eq('user_id', userId)
    .eq('applied', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as WritingEvent[] | null) ?? []
}

async function loadStyleMemoryContent(userId: string): Promise<string> {
  const sb = serviceClient()
  if (!sb) return ''
  const { data } = await sb
    .from('tagro_memories')
    .select('content')
    .eq('user_id', userId)
    .eq('scope', 'preference')
    .eq('key', STYLE_MEMORY_KEY)
    .is('project_id', null)
    .maybeSingle()
  return String((data as { content?: string } | null)?.content ?? '').trim()
}

function examplesBlock(examples: WritingEvent[]): string {
  if (!examples.length) return ''
  const lines = examples.map((e, i) => {
    const domain = e.page_domain ? ` (${e.page_domain})` : ''
    return [
      `Beispiel ${i + 1}${domain} [${e.action}]:`,
      `Original: ${e.original_text.slice(0, 280)}`,
      `Verbessert: ${e.improved_text.slice(0, 280)}`,
    ].join('\n')
  })
  return `Dein Schreibstil aus früheren Übernahmen — halte dich daran:\n${lines.join('\n\n')}`
}

const IMPROVE_SYSTEM = `Du bist Tagro, die Schreibhilfe von Festag. Du verbesserst Nutzertexte für E-Mails, Nachrichten und Formulare.

Antworte AUSSCHLIESSLICH als valides JSON:
{ "improved": "der verbesserte Text" }

Regeln:
- Nur den verbesserten Text in "improved", kein Vorwort, kein Markdown.
- Gleiche Sprache wie der Originaltext (Deutsch bleibt Deutsch).
- Erfinde keine neuen Fakten.
- Wenn der Text schon gut ist, poliere leicht.
- Lerne aus dem Nutzerprofil und früheren Übernahmen: Ton, Satzlänge, Höflichkeit.`

const FEEDBACK_SYSTEM = `Du bist Tagro, die Stimme von Festag. Der Nutzer hat Text im Browser markiert.

Antworte AUSSCHLIESSLICH als valides JSON:
{ "improved": "dein gesprochenes Feedback" }

Regeln:
- Genau 1–2 kurze Sätze, gesprochen und direkt (für Text-to-Speech).
- Bewerte Ton, Klarheit und Wirkung — kein Wiederholen des markierten Texts.
- Freundlich, präzise, auf Deutsch (wenn der Text deutsch ist).
- Kein Markdown, keine Anführungszeichen um den ganzen Satz.`

export type ImproveTextInput = {
  userId: string
  text: string
  action: WritingAction
  pageUrl?: string | null
  pageTitle?: string | null
}

export type ImproveTextResult = {
  improved: string
  model: string
  action: WritingAction
  fellBack?: boolean
}

export async function improveExtensionText(input: ImproveTextInput): Promise<ImproveTextResult> {
  const { userId, text, action, pageUrl, pageTitle } = input
  const pageHint = [pageTitle, pageUrl].filter(Boolean).join(' — ')
  const domain = pageDomain(pageUrl)

  const [accountContext, styleMemory, examples] = await Promise.all([
    loadTagroMemoryContext({ userId, limit: 8 }),
    loadStyleMemoryContent(userId),
    loadRecentWritingExamples(userId, 6),
  ])

  const domainExamples = domain
    ? examples.filter((e) => e.page_domain === domain)
    : []
  const fewShot = domainExamples.length >= 2 ? domainExamples.slice(0, 4) : examples.slice(0, 4)

  const userPrompt = [
    accountContext ? `Nutzer- und Account-Kontext:\n${accountContext}` : '',
    styleMemory ? `Gelernte Schreibpräferenz:\n${styleMemory}` : '',
    examplesBlock(fewShot),
    domain ? `Aktuelle Seite: ${domain}` : '',
    pageHint ? `Seitenkontext: ${pageHint}` : '',
    `Aufgabe: ${ACTION_PROMPTS[action]}`,
    `Originaltext:\n${text}`,
    'Antworte mit dem JSON-Schema.',
  ].filter(Boolean).join('\n\n')

  const ai = await tagroComplete({
    system: action === 'feedback' ? FEEDBACK_SYSTEM : IMPROVE_SYSTEM,
    prompt: userPrompt,
    maxTokens: action === 'feedback' ? 220 : 1200,
    temperature: action === 'feedback' ? 0.35 : 0.2,
    json: true,
  })

  if (!ai.ok || !ai.text.trim()) {
    return { improved: text, model: ai.model || 'fallback', action, fellBack: true }
  }

  try {
    const parsed = extractJsonObject(ai.text) as { improved?: string }
    const improved = String(parsed?.improved ?? '').trim()
    if (!improved) {
      return { improved: text, model: ai.model, action, fellBack: true }
    }
    return { improved, model: ai.model, action }
  } catch {
    return { improved: text, model: ai.model, action, fellBack: true }
  }
}

export type RecordApplyInput = {
  userId: string
  original: string
  improved: string
  action: WritingAction
  pageUrl?: string | null
  pageTitle?: string | null
}

export async function recordWritingApply(input: RecordApplyInput): Promise<{ ok: boolean }> {
  const sb = serviceClient()
  if (!sb) return { ok: false }

  const original = input.original.trim().slice(0, 4000)
  const improved = input.improved.trim().slice(0, 4000)
  if (!original || !improved || original === improved) return { ok: false }

  const { error } = await sb.from('extension_writing_events').insert({
    user_id: input.userId,
    original_text: original,
    improved_text: improved,
    action: input.action,
    page_domain: pageDomain(input.pageUrl),
    page_title: input.pageTitle?.slice(0, 200) ?? null,
    applied: true,
  })

  if (error) {
    console.error('[extension/writing] insert failed', error.message)
    return { ok: false }
  }

  try {
    await distillWritingStyle(input.userId)
  } catch (e) {
    console.error('[extension/writing] distill failed', e)
  }

  return { ok: true }
}

async function distillWritingStyle(userId: string) {
  const examples = await loadRecentWritingExamples(userId, 12)
  if (examples.length < 2) return

  const prompt = [
    'Analysiere diese echten Vorher/Nachher-Paare eines Nutzers (Chrome-Schreibhilfe).',
    'Erstelle eine kurze Schreibpräferenz (max 6 Sätze) für zukünftige Verbesserungen:',
    '- bevorzugter Ton (du/Sie, locker/formell)',
    '- typische Satzlänge',
    '- Wörter die der Nutzer meidet oder bevorzugt',
    '- keine Floskeln die der Nutzer streicht',
    '',
    ...examples.map((e, i) => (
      `${i + 1}. [${e.action}] Original: ${e.original_text.slice(0, 200)}\n   Verbessert: ${e.improved_text.slice(0, 200)}`
    )),
    '',
    'Antworte nur mit der Schreibpräferenz als Fließtext, kein JSON.',
  ].join('\n')

  const ai = await tagroComplete({
    system: 'Du bist Tagro. Du destillierst Schreibstil aus Nutzerbeispielen — knapp und konkret.',
    prompt,
    maxTokens: 400,
    temperature: 0.15,
  })

  const content = ai.text?.trim()
  if (!content) return

  await rememberTagroMemory({
    userId,
    scope: 'preference',
    key: STYLE_MEMORY_KEY,
    content: content.slice(0, 1200),
    source: 'chrome-extension',
    confidence: Math.min(0.95, 0.5 + examples.length * 0.04),
    metadata: { example_count: examples.length, updated_from: 'distill' },
  })
}

export function parseWritingAction(raw?: string): WritingAction {
  if (raw === 'feedback') return 'feedback'
  if (raw === 'casual') return 'casual'
  if (raw === 'explain') return 'explain'
  if (raw === 'translate') return 'translate'
  return WRITING_ACTIONS.includes(raw as WritingAction) ? (raw as WritingAction) : 'clearer'
}
