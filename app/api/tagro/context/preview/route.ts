import { NextRequest, NextResponse } from 'next/server'
import { tagroComplete } from '@/lib/tagro/complete'
import { extractJsonObject } from '@/lib/tagro/json'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/tagro/context/preview
 *
 * Tagro's object-aware preview step. The Tagro Context Sheet calls this with
 * the clicked object (project / task / decision / report / document / client /
 * …) plus the user's rough input. Tagro returns three calm blocks:
 *
 *   understanding — "Ich verstehe dich so: …"
 *   opinion       — "Meine Einschätzung: …"
 *   preview       — the clean text/draft ready to send or save.
 *
 * Plus a soft `suggestedAction` hint (handoff | task | decision | message |
 * note). The caller decides what to do with it. Output is structured JSON, not
 * raw chat text — the sheet renders the three sections directly. Owner
 * override / execution happen in a separate slice.
 */
const SYSTEM = `Du bist Tagro, die ruhige AI-Kontrollschicht von Festag. Du arbeitest objekt-bewusst: dir wird das aktuelle Objekt (Projekt/Aufgabe/Entscheidung/Bericht/Dokument/Kunde) mitgegeben und eine rohe Nutzereingabe. Übersetze die Eingabe in eine klare, freundliche, professionelle Aktion — keine Floskeln, keine Emojis, keine Erfindungen.

Antworte AUSSCHLIESSLICH als valides JSON in diesem Schema:
{
  "understanding": "Ich verstehe dich so: …",
  "opinion": "Meine Einschätzung: …",
  "preview": "der konkrete Text/Entwurf der versendet/erstellt werden würde",
  "suggestedAction": "handoff | task | decision | message | note | review",
  "warnings": []
}

Regeln:
- understanding/opinion in einem ruhigen Satz, max 2 Sätze.
- preview enthält den fertigen Text — kein Vorwort, kein Markdown-Schrott.
- suggestedAction MUSS aus der Liste sein.
- warnings: 0–3 kurze Hinweise wenn Scope/Privacy/Client-safety beachten ist; sonst leeres Array.
- Erfinde nichts. Wenn Daten fehlen, schreibe das ehrlich in understanding/opinion.`

/** What the overlay actually sends. The earlier shape only covered the
 *  base object; the overlay now also passes the subtitle (live metadata
 *  like counts/phase), an attached array of @-mentions added via the
 *  picker / @-trigger, and the full prior conversation so each turn
 *  has agent-level memory instead of single-shot Q&A. */
type AttachedRef = {
  type?: string
  id?: string
  title?: string
  label?: string
  kind?: 'object' | 'meta'
}
type HistoryTurn = {
  role: 'user' | 'tagro'
  content?: string
  understanding?: string
  opinion?: string
  preview?: string
}
type Body = {
  type?: string
  id?: string
  title?: string
  subtitle?: string
  status?: string | null
  clientVisible?: boolean | null
  input?: string
  attached?: AttachedRef[]
  history?: HistoryTurn[]
}

function fallback(input: string): { understanding: string; opinion: string; preview: string; suggestedAction: string; warnings: string[] } {
  const clean = (input || '').trim()
  return {
    understanding: clean ? `Ich verstehe dich so: ${clean.slice(0, 220)}` : 'Tagro hat keine Eingabe erhalten.',
    opinion: 'Tagro ist gerade nicht verbunden. Du kannst den Text bearbeiten und manuell senden.',
    preview: clean,
    suggestedAction: 'note',
    warnings: [],
  }
}

export async function POST(req: NextRequest) {
  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const input = (body.input || '').trim()
  if (!input) return NextResponse.json({ error: 'input_required' }, { status: 400 })

  const contextLine = [
    body.type ? `Objekttyp: ${body.type}` : '',
    body.title ? `Titel: ${body.title}` : '',
    body.subtitle ? `Kontext-Detail: ${body.subtitle}` : '',
    body.id ? `ID: ${body.id}` : '',
    body.status ? `Status: ${body.status}` : '',
    typeof body.clientVisible === 'boolean' ? `Client-sichtbar: ${body.clientVisible ? 'ja' : 'nein'}` : '',
  ].filter(Boolean).join('\n')

  // Attached @-mentions: the base object first, then any extra picks the
  // user added via the + picker or @ trigger. Tagro must treat these as
  // "in scope" — answers should reference them by name when relevant.
  const attachedList = Array.isArray(body.attached)
    ? body.attached
      .map(a => (a?.label || a?.title || a?.type || '').trim())
      .filter(Boolean)
    : []
  const attachedLine = attachedList.length
    ? `Angehängter Kontext (verbindlich):\n- ${attachedList.join('\n- ')}`
    : ''

  // Prior turns: trimmed to the last ~8 entries so the prompt stays
  // bounded but Tagro keeps short-term memory across the conversation.
  const history = Array.isArray(body.history) ? body.history.slice(-8) : []
  const historyLine = history.length
    ? `Bisheriger Chatverlauf:\n${history.map(t => {
        if (t.role === 'user') return `Nutzer: ${(t.content || '').slice(0, 600)}`
        const tagroBits = [
          t.understanding && `Verstehe: ${t.understanding}`,
          t.opinion && `Meinung: ${t.opinion}`,
          t.preview && `Entwurf: ${t.preview}`,
        ].filter(Boolean).join(' · ')
        return `Tagro: ${tagroBits.slice(0, 800) || (t.content || '').slice(0, 600)}`
      }).join('\n')}`
    : ''

  const userPrompt = [
    `Aktuelles Objekt:\n${contextLine || '(unbekannt)'}`,
    attachedLine,
    historyLine,
    `Neue Nutzereingabe:\n${input}`,
    `Antworte mit dem JSON-Schema.`,
  ].filter(Boolean).join('\n\n')

  const ai = await tagroComplete({
    system: SYSTEM,
    prompt: userPrompt,
    maxTokens: 700,
    temperature: 0.25,
    json: true,
  })

  if (!ai.ok || !ai.text.trim()) {
    return NextResponse.json({ ...fallback(input), model: ai.model, fellBack: true })
  }

  try {
    const parsed = extractJsonObject(ai.text) as any
    const allowed = ['handoff', 'task', 'decision', 'message', 'note', 'review']
    return NextResponse.json({
      understanding: String(parsed?.understanding ?? '').trim() || fallback(input).understanding,
      opinion: String(parsed?.opinion ?? '').trim() || '',
      preview: String(parsed?.preview ?? '').trim() || input,
      suggestedAction: allowed.includes(parsed?.suggestedAction) ? parsed.suggestedAction : 'note',
      warnings: Array.isArray(parsed?.warnings) ? parsed.warnings.filter((w: any) => typeof w === 'string').slice(0, 3) : [],
      model: ai.model,
    })
  } catch {
    return NextResponse.json({ ...fallback(input), model: ai.model, fellBack: true })
  }
}
