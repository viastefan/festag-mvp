import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type AssistModel = '2.1' | '2.2'
type AssistTone = 'formal' | 'conversational'

/**
 * POST /api/onboarding/tagro-project
 * Field text → polished project intent.
 * tone: formal (Formell) | conversational (Sprachlich)
 * model: tagro 2.1 (knapp) | tagro 2.2 (etwas ausführlicher)
 */
export async function POST(req: NextRequest) {
  try {
    const { runOpenAIJson } = await import('@/lib/tagro/openai')

    let body: { text?: string; model?: string; tone?: string } = {}
    try { body = await req.json() } catch { /* empty */ }
    const text = String(body.text || '').trim().slice(0, 1200)
    if (!text) {
      return NextResponse.json({ ok: false, reason: 'text_required' }, { status: 400 })
    }

    const model: AssistModel = body.model === '2.2' ? '2.2' : '2.1'
    const tone: AssistTone = body.tone === 'conversational' ? 'conversational' : 'formal'

    const heuristic = () => ({
      description: text.replace(/\s+/g, ' ').trim().slice(0, 500),
    })

    const lengthStyle =
      model === '2.2'
        ? `- 2–3 Sätze, klar und etwas ausführlicher (Was, für wen, warum)
- Konkrete Details behalten, keine Floskeln`
        : `- 1–2 Sätze, sehr knapp und konkret
- Nur das Wesentliche (Was wird gebaut / für wen)`

    const toneStyle =
      tone === 'conversational'
        ? `- Ton: sprachlich / natürlich, wie gesprochen — trotzdem klar und konkret
- Darf „wir/du“ nutzen, keine Marketing-Floskeln`
        : `- Ton: formell, geschäftlich, ruhig
- Siezen oder neutrale Formulierung, keine Umgangssprache`

    const { output } = await runOpenAIJson({
      runType: 'onboarding_project_assist',
      prompt: `Du bist Tagro ${model}. Formuliere aus dem deutschen Freitext eine kurze, klare Projektabsicht für Festag-Onboarding.
Antworte NUR als JSON: {"description":"string"}
Regeln:
${lengthStyle}
${toneStyle}
- Keine Aufzählungszeichen
- Max 500 Zeichen
- Sprache: Deutsch

Text: """${text}"""`,
      fallback: () => heuristic(),
    })

    const description = String((output as { description?: string } | null)?.description || '').trim().slice(0, 500)
      || heuristic().description

    return NextResponse.json({ ok: true, description, model: `tagro ${model}`, tone })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'failed'
    return NextResponse.json({ ok: false, reason: msg }, { status: 500 })
  }
}
