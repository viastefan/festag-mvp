import { NextRequest, NextResponse } from 'next/server'
import { runOpenAIJson } from '@/lib/tagro/openai'

export const runtime = 'nodejs'

/**
 * POST /api/onboarding/tagro-project
 * Free-text / speech → polished project intent for hybrid onboarding.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { text?: string } = {}
    try { body = await req.json() } catch { /* empty */ }
    const text = String(body.text || '').trim().slice(0, 1200)
    if (!text) {
      return NextResponse.json({ ok: false, reason: 'text_required' }, { status: 400 })
    }

    const heuristic = () => ({
      description: text.replace(/\s+/g, ' ').trim().slice(0, 500),
    })

    const { output } = await runOpenAIJson({
      runType: 'onboarding_project_assist',
      prompt: `Formuliere aus dem deutschen Freitext eine kurze, klare Projektabsicht für Festag-Onboarding.
Antworte NUR als JSON: {"description":"string"}
Regeln:
- 1–3 Sätze, ruhig und konkret (Was wird gebaut / für wen / warum)
- Keine Marketing-Floskeln, keine Aufzählungszeichen
- Max 500 Zeichen
- Sprache: Deutsch

Text: """${text}"""`,
      fallback: () => heuristic(),
    })

    const description = String((output as any)?.description || '').trim().slice(0, 500)
      || heuristic().description

    return NextResponse.json({ ok: true, description })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || 'failed' }, { status: 500 })
  }
}
