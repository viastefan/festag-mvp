import { NextRequest, NextResponse } from 'next/server'
import { tagroComplete } from '@/lib/tagro/complete'
import { extractJsonObject } from '@/lib/tagro/json'
import {
  articlePlainText,
  relatedHelpDocs,
  resolveFestagHelpDoc,
  searchFestagHelp,
} from '@/lib/help/festag-help-index'

export const runtime = 'nodejs'
export const maxDuration = 30

type HistoryTurn = {
  role: 'user' | 'tagro'
  content?: string
  understanding?: string
  preview?: string
}

type Body = {
  query?: string
  docSlug?: string
  history?: HistoryTurn[]
}

const SYSTEM = `Du bist Festag Help — Tagro im Hilfe-Modus für Kunden und Teams in Festag.

Festag ist eine Delivery Intelligence Platform: Projekte, Aufgaben, Entscheidungen, Statusberichte und Tagro als Project Interpreter — kein generisches Task-Tool oder Chat-Spielzeug.

Deine Aufgabe:
- Fragen zu Festag ruhig, konkret und auf Deutsch beantworten
- Schritt-für-Schritt-Anleitungen geben (max. 5 klare Schritte wenn sinnvoll)
- Am Ende den passenden Doc-Artikel nennen und verlinken: /docs/{slug}
- Wenn etwas unklar ist, ehrlich sagen — nichts erfinden
- Keine Emojis, keine Floskeln, kein Markdown mit Überschriften

Antworte AUSSCHLIESSLICH als valides JSON:
{
  "understanding": "Ich verstehe dich so: …",
  "opinion": "Kurze Einordnung oder nächster sinnvoller Schritt",
  "preview": "Die eigentliche Anleitung/Antwort — ruhig, client-ready, mit Doc-Link am Ende",
  "suggestedAction": "note",
  "warnings": [],
  "docSlug": "slug-des-empfohlenen-artikels",
  "docTitle": "Titel des Artikels"
}`

function fallback(query: string, docSlug?: string, docTitle?: string) {
  const link = docSlug ? `\n\nMehr dazu: /docs/${docSlug}` : ''
  const title = docTitle ? ` (${docTitle})` : ''
  return {
    understanding: query ? `Ich verstehe dich so: ${query.slice(0, 200)}` : 'Tagro hat keine Frage erhalten.',
    opinion: docTitle ? `Der passende Einstieg ist der Doc-Artikel${title}.` : 'Schau in den Festag Docs nach — oder schreib uns.',
    preview: `${query ? `Zu „${query.slice(0, 120)}": Öffne die Docs und suche nach dem Thema.` : 'Frag mich konkret, wobei du Hilfe brauchst.'}${link}`,
    suggestedAction: 'note',
    warnings: [] as string[],
    docSlug: docSlug || '',
    docTitle: docTitle || '',
    fellBack: true,
  }
}

export async function POST(req: NextRequest) {
  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const query = (body.query || '').trim()
  if (!query) return NextResponse.json({ error: 'query_required' }, { status: 400 })

  const primaryDoc = resolveFestagHelpDoc(query, body.docSlug)
  const searchHits = searchFestagHelp(query, 5)
  const related = primaryDoc ? relatedHelpDocs(primaryDoc.slug) : []

  const docContext = primaryDoc
    ? `Primärer Doc-Artikel:\nTitel: ${primaryDoc.title}\nSlug: ${primaryDoc.slug}\nKategorie: ${primaryDoc.category}\n\nInhalt:\n${articlePlainText(primaryDoc, 3200)}`
    : ''

  const searchContext = searchHits.length
    ? `Weitere Treffer:\n${searchHits.map(h => `- ${h.title} (/docs/${h.slug}) — ${h.description}`).join('\n')}`
    : ''

  const relatedContext = related.length
    ? `Verwandte Artikel:\n${related.map(r => `- ${r.title} (/docs/${r.slug})`).join('\n')}`
    : ''

  const history = Array.isArray(body.history) ? body.history.slice(-6) : []
  const historyLine = history.length
    ? `Bisheriger Hilfe-Chat:\n${history.map(t => {
        if (t.role === 'user') return `Nutzer: ${(t.content || '').slice(0, 500)}`
        return `Tagro: ${(t.preview || t.understanding || t.content || '').slice(0, 600)}`
      }).join('\n')}`
    : ''

  const userPrompt = [
    docContext,
    searchContext,
    relatedContext,
    historyLine,
    `Nutzerfrage:\n${query}`,
    primaryDoc
      ? `Empfiehl bevorzugt /docs/${primaryDoc.slug} wenn passend.`
      : 'Wähle aus den Treffern den besten Doc-Artikel.',
    'Antworte mit dem JSON-Schema.',
  ].filter(Boolean).join('\n\n')

  const ai = await tagroComplete({
    system: SYSTEM,
    prompt: userPrompt,
    maxTokens: 900,
    temperature: 0.2,
    json: true,
  })

  if (!ai.ok || !ai.text.trim()) {
    return NextResponse.json({
      ...fallback(query, primaryDoc?.slug, primaryDoc?.title),
      related: searchHits.slice(0, 3),
    })
  }

  try {
    const parsed = extractJsonObject(ai.text) as Record<string, unknown>
    const docSlug = String(parsed.docSlug || primaryDoc?.slug || searchHits[0]?.slug || '').trim()
    const docTitle = String(parsed.docTitle || primaryDoc?.title || searchHits[0]?.title || '').trim()
    return NextResponse.json({
      understanding: String(parsed.understanding ?? '').trim() || fallback(query, docSlug, docTitle).understanding,
      opinion: String(parsed.opinion ?? '').trim() || '',
      preview: String(parsed.preview ?? '').trim() || fallback(query, docSlug, docTitle).preview,
      suggestedAction: 'note',
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings.filter((w): w is string => typeof w === 'string').slice(0, 3)
        : [],
      docSlug,
      docTitle,
      docHref: docSlug ? `/docs/${docSlug}` : '',
      related: searchHits.slice(0, 3),
      model: ai.model,
    })
  } catch {
    return NextResponse.json({
      ...fallback(query, primaryDoc?.slug, primaryDoc?.title),
      related: searchHits.slice(0, 3),
    })
  }
}

/** GET /api/help/search?q=… — für Live-Suche im Help-Panel */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''
  const hits = searchFestagHelp(q, 8)
  return NextResponse.json({ hits })
}
