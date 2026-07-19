import { NextRequest, NextResponse } from 'next/server'
import { runOpenAIJson } from '@/lib/tagro/openai'

export const runtime = 'nodejs'

type AssistModel = '2.1' | '2.2'

/**
 * POST /api/onboarding/tagro-project
 * Free-text / speech → polished project intent for hybrid onboarding.
 * model: tagro 2.1 (knapp) | tagro 2.2 (etwas ausführlicher).
 */
export async function POST(req: NextRequest) {
  try {
    let body: { text?: string; model?: string } = {}
    try { body = await req.json() } catch { /* empty */ }
    const text = String(body.text || '').trim().slice(0, 1200)
    if (!text) {
      return NextResponse.json({ ok: false, reason: 'text_required' }, { status: 400 })
    }

    const model: AssistModel = body.model === '2.2' ? '2.2' : '2.1'

    const heuristic = () => ({
      description: text.replace(/\s+/g, ' ').trim().slice(0, 500),
    })

    const style =
      model === '2.2'
        ? `- 2–3 Sätze, klar und etwas ausführlicher (Was, für wen, warum)
- Konkrete Details behalten, keine Floskeln`
        : `- 1–2 Sätze, sehr knapp und konkret
- Nur das Wesentliche (Was wird gebaut / für wen)`

    const { output } = await runOpenAIJson({
      runType: 'onboarding_project_assist',
      prompt: `Du bist Tagro ${model}. Formuliere aus dem deutschen Freitext eine kurze, klare Projektabsicht für Festag-Onboarding.
Antworte NUR als JSON: {"description":"string"}
Regeln:
${style}
- Keine Marketing-Floskeln, keine Aufzählungszeichen
- Max 500 Zeichen
- Sprache: Deutsch

Text: """${text}"""`,
      fallback: () => heuristic(),
    })

    const description = String((output as any)?.description || '').trim().slice(0, 500)
      || heuristic().description

    return NextResponse.json({ ok: true, description, model: `tagro ${model}` })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || 'failed' }, { status: 500 })
  }
}
