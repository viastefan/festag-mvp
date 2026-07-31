import { NextRequest, NextResponse } from 'next/server'
import { assistModelLabel, resolveAssistModel } from '@/lib/tagro/assist-model'

export const runtime = 'nodejs'

type AssistTone = 'formal' | 'conversational'
type AssistSurface = 'project' | 'profile_facts'

/**
 * POST /api/onboarding/tagro-project
 * Field text → polished copy for project intent or profile facts.
 * tone: formal | conversational
 * model: auto | 2.1 | 2.2
 * surface: project (default) | profile_facts (Über dich)
 */
export async function POST(req: NextRequest) {
  try {
    const { runOpenAIJson } = await import('@/lib/tagro/openai')

    let body: { text?: string; model?: string; tone?: string; surface?: string } = {}
    try { body = await req.json() } catch { /* empty */ }
    const text = String(body.text || '').trim().slice(0, 2000)
    if (!text) {
      return NextResponse.json({ ok: false, reason: 'text_required' }, { status: 400 })
    }

    const requested = body.model
    const model = resolveAssistModel(requested, text)
    const tone: AssistTone = body.tone === 'conversational' ? 'conversational' : 'formal'
    const surface: AssistSurface =
      body.surface === 'profile_facts' ? 'profile_facts' : 'project'

    const heuristic = () => ({
      description: text.replace(/\s+/g, ' ').trim().slice(0, surface === 'profile_facts' ? 1200 : 500),
    })

    const lengthStyle =
      model === '2.2'
        ? surface === 'profile_facts'
          ? `- 3–6 kurze Sätze oder klare Absätze
- Position, Stack, Arbeitsweise und Stärken behalten`
          : `- 2–3 Sätze, klar und etwas ausführlicher (Was, für wen, warum)
- Konkrete Details behalten, keine Floskeln`
        : surface === 'profile_facts'
          ? `- 2–4 kurze Sätze, sehr knapp und konkret
- Nur das Wesentliche zu Rolle, Stack und Art zu arbeiten`
          : `- 1–2 Sätze, sehr knapp und konkret
- Nur das Wesentliche (Was wird gebaut / für wen)`

    const toneStyle =
      tone === 'conversational'
        ? `- Ton: sprachlich / natürlich, wie gesprochen — trotzdem klar und konkret
- Darf „wir/du“ nutzen, keine Marketing-Floskeln`
        : `- Ton: formell, geschäftlich, ruhig
- Neutrale Formulierung, keine Umgangssprache`

    const rolePrompt =
      surface === 'profile_facts'
        ? `Du bist Tagro ${model}. Formuliere aus dem deutschen Freitext eine ruhige Entwickler-Selbstbeschreibung für Festag Dev-Onboarding (Über dich).
Antworte NUR als JSON: {"description":"string"}
Regeln:
${lengthStyle}
${toneStyle}
- Keine Aufzählungszeichen
- Max 1200 Zeichen
- Sprache: Deutsch
- Keine erfundenen Skills

Text: """${text}"""`
        : `Du bist Tagro ${model}. Formuliere aus dem deutschen Freitext eine kurze, klare Projektabsicht für Festag-Onboarding.
Antworte NUR als JSON: {"description":"string"}
Regeln:
${lengthStyle}
${toneStyle}
- Keine Aufzählungszeichen
- Max 500 Zeichen
- Sprache: Deutsch

Text: """${text}"""`

    const { output } = await runOpenAIJson({
      runType: surface === 'profile_facts' ? 'onboarding_profile_facts_assist' : 'onboarding_project_assist',
      prompt: rolePrompt,
      fallback: () => heuristic(),
    })

    const maxLen = surface === 'profile_facts' ? 1200 : 500
    const description = String((output as { description?: string } | null)?.description || '').trim().slice(0, maxLen)
      || heuristic().description

    return NextResponse.json({
      ok: true,
      description,
      model: assistModelLabel(model, requested),
      tone,
      surface,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'failed'
    return NextResponse.json({ ok: false, reason: msg }, { status: 500 })
  }
}
