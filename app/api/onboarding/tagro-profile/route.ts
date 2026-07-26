import { NextRequest, NextResponse } from 'next/server'
import { runOpenAIJson } from '@/lib/tagro/openai'

export const runtime = 'nodejs'

/**
 * POST /api/onboarding/tagro-profile
 * Free-text / speech → { fullName, position } for hybrid onboarding profile step.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { text?: string } = {}
    try { body = await req.json() } catch { /* empty */ }
    const text = String(body.text || '').trim().slice(0, 500)
    if (!text) {
      return NextResponse.json({ ok: false, reason: 'text_required' }, { status: 400 })
    }

    const heuristic = () => {
      const cleaned = text.replace(/\s+/g, ' ').trim()
      // "Name, Titel" or "Name — Titel"
      const parts = cleaned.split(/\s*[,—–-]\s*/).map(s => s.trim()).filter(Boolean)
      if (parts.length >= 2 && parts[0].length <= 64) {
        return { fullName: parts[0].slice(0, 64), position: parts.slice(1).join(', ').slice(0, 64) }
      }
      // "Ich bin X" / "Ich heiße X"
      const m = cleaned.match(/(?:ich\s+(?:bin|heiße|heisse)\s+)([^,.]+)/i)
      if (m?.[1]) {
        return { fullName: m[1].trim().slice(0, 64), position: null as string | null }
      }
      return { fullName: cleaned.slice(0, 64), position: null as string | null }
    }

    const { output } = await runOpenAIJson({
      runType: 'onboarding_profile_assist',
      prompt: `Extrahiere aus dem deutschen Freitext eines Nutzers den Anzeigenamen und optional den Jobtitel für ein Festag-Profil.
Antworte NUR als JSON: {"fullName":"string","position":"string|null"}
Regeln:
- fullName: Vor- und Nachname oder Rufname, max 64 Zeichen, keine Anrede-Phrasen
- position: Titel/Rolle wenn genannt, sonst null
- Keine Erklärungen

Text: """${text}"""`,
      fallback: () => heuristic(),
    })

    const fullName = String((output as any)?.fullName || '').trim().slice(0, 64)
      || heuristic().fullName
    const positionRaw = (output as any)?.position
    const position = positionRaw == null || positionRaw === ''
      ? null
      : String(positionRaw).trim().slice(0, 64)

    return NextResponse.json({ ok: true, fullName, position })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || 'failed' }, { status: 500 })
  }
}
