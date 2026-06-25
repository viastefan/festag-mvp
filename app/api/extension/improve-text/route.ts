import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { tagroComplete } from '@/lib/tagro/complete'
import { extractJsonObject } from '@/lib/tagro/json'

export const runtime = 'nodejs'
export const maxDuration = 30

const ACTIONS = ['clearer', 'professional', 'shorter'] as const
type Action = (typeof ACTIONS)[number]

const ACTION_PROMPTS: Record<Action, string> = {
  clearer: 'Formuliere den Text klarer und verständlicher. Gleiche Bedeutung, weniger Missverständnisse.',
  professional: 'Formuliere den Text professioneller und höflicher. Gleiche Bedeutung, besser für Business-Kommunikation.',
  shorter: 'Kürze den Text ohne die Kernaussage zu verlieren. Prägnant und direkt.',
}

const SYSTEM = `Du bist Tagro, die Schreibhilfe von Festag. Du verbesserst Nutzertexte für E-Mails, Nachrichten und Formulare.

Antworte AUSSCHLIESSLICH als valides JSON:
{ "improved": "der verbesserte Text" }

Regeln:
- Nur den verbesserten Text in "improved", kein Vorwort, kein Markdown.
- Gleiche Sprache wie der Originaltext (Deutsch bleibt Deutsch).
- Erfinde keine neuen Fakten.
- Wenn der Text schon gut ist, poliere leicht.`

function fallback(text: string): { improved: string; fellBack: boolean } {
  return { improved: text.trim(), fellBack: true }
}

export async function POST(req: NextRequest) {
  const sb = createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { text?: string; action?: string; pageUrl?: string; pageTitle?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const text = (body.text || '').trim()
  if (!text) return NextResponse.json({ error: 'text_required' }, { status: 400 })
  if (text.length > 8000) return NextResponse.json({ error: 'text_too_long' }, { status: 400 })

  const action = ACTIONS.includes(body.action as Action) ? (body.action as Action) : 'clearer'
  const pageHint = [body.pageTitle, body.pageUrl].filter(Boolean).join(' — ')

  const userPrompt = [
    pageHint ? `Seitenkontext: ${pageHint}` : '',
    `Aufgabe: ${ACTION_PROMPTS[action]}`,
    `Originaltext:\n${text}`,
    'Antworte mit dem JSON-Schema.',
  ].filter(Boolean).join('\n\n')

  const ai = await tagroComplete({
    system: SYSTEM,
    prompt: userPrompt,
    maxTokens: 1200,
    temperature: 0.2,
    json: true,
  })

  if (!ai.ok || !ai.text.trim()) {
    return NextResponse.json({ ...fallback(text), model: ai.model, fellBack: true })
  }

  try {
    const parsed = extractJsonObject(ai.text) as { improved?: string }
    const improved = String(parsed?.improved ?? '').trim()
    if (!improved) return NextResponse.json({ ...fallback(text), model: ai.model, fellBack: true })
    return NextResponse.json({ improved, model: ai.model, action })
  } catch {
    return NextResponse.json({ ...fallback(text), model: ai.model, fellBack: true })
  }
}
