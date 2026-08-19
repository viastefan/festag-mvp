// ─────────────────────────────────────────────────────────────────────────────
// Turning a client's PDF into work
//
// A client sends a document full of change requests written for a human. What
// the developer needs is a numbered list of concrete, separable items they can
// work through and tick off — that is what Stefan meant by "Tagro should write
// it out as a prompt".
//
// Tagro extracts; it never invents. If the document says nothing actionable the
// result is an empty list and the person is told so, rather than being handed
// three plausible-sounding items nobody asked for.
// ─────────────────────────────────────────────────────────────────────────────

import { tagroComplete } from '@/lib/tagro/complete'
import type { FindingInput } from '@/lib/review/rounds'

export type AnalyzeOutcome =
  | { status: 'extracted'; findings: FindingInput[]; summary: string }
  | { status: 'nothing_actionable'; summary: string }
  | { status: 'unavailable'; reason: string }

const SYSTEM = `Du bist Tagro, die Orchestrierungsintelligenz von Festag.

Du bekommst den Text eines Kundendokuments — meist Änderungswünsche an einer
Website oder einem Produkt. Deine Aufgabe: daraus eine Arbeitsliste machen, die
ein Entwickler direkt abarbeiten kann.

Regeln:
• Jeder Punkt ist EINE abgeschlossene Änderung. Trenne, was getrennt umsetzbar ist.
• "title" ist ein kurzer Imperativ (max. 90 Zeichen): "Footer-Telefonnummer korrigieren".
• "detail" nennt konkret, was gilt — Zielzustand, Ort, Wortlaut, Werte.
• "location_hint" nennt Seite/Abschnitt, wenn das Dokument es hergibt, sonst null.
• Erfinde NICHTS. Steht es nicht im Dokument, kommt es nicht in die Liste.
• Vage Wünsche ohne umsetzbaren Kern gehören NICHT in die Liste, sondern in "open_questions".
• Deutsch. Keine Floskeln.

Antworte AUSSCHLIESSLICH mit JSON:
{"summary":"1 Satz, worum es im Dokument geht",
 "findings":[{"title":"…","detail":"…","location_hint":"Seite 2 / Footer"}],
 "open_questions":["…"]}`

/**
 * @param text  Extracted document text. Extraction itself belongs to the
 *              upload path — this function only reasons about text it is given.
 */
export async function analyzeDocumentText(
  text: string,
  opts: { assetId?: string | null; projectTitle?: string | null } = {},
): Promise<AnalyzeOutcome> {
  const body = text?.trim()
  if (!body) return { status: 'unavailable', reason: 'Kein lesbarer Text im Dokument.' }

  const prompt = [
    opts.projectTitle ? `Projekt: ${opts.projectTitle}` : null,
    'Dokumenttext:',
    body.slice(0, 24_000),
  ].filter(Boolean).join('\n\n')

  const res = await tagroComplete({
    system: SYSTEM,
    prompt,
    json: true,
    purpose: 'review_document_analysis',
  } as any)

  if (!res.ok || !res.text) {
    // The document is still attached and readable by a human — say what is
    // missing rather than pretending the analysis produced nothing.
    return { status: 'unavailable', reason: 'Tagro konnte das Dokument gerade nicht auswerten.' }
  }

  let parsed: any
  try {
    parsed = JSON.parse(res.text)
  } catch {
    return { status: 'unavailable', reason: 'Die Auswertung war nicht lesbar.' }
  }

  const summary = typeof parsed?.summary === 'string' && parsed.summary.trim()
    ? parsed.summary.trim().slice(0, 400)
    : 'Dokument ausgewertet.'

  const raw = Array.isArray(parsed?.findings) ? parsed.findings : []
  const findings: FindingInput[] = raw
    .filter((f: any) => typeof f?.title === 'string' && f.title.trim())
    .slice(0, 60)
    .map((f: any) => ({
      title: String(f.title).trim().slice(0, 300),
      detail: typeof f.detail === 'string' ? f.detail.trim().slice(0, 4000) : null,
      source: 'document' as const,
      assetId: opts.assetId ?? null,
      locationHint: typeof f.location_hint === 'string' ? f.location_hint.slice(0, 200) : null,
    }))

  // Unanswerable wishes are not work — they are the next question to the client.
  const openQuestions: string[] = Array.isArray(parsed?.open_questions)
    ? parsed.open_questions.filter((q: any) => typeof q === 'string' && q.trim()).slice(0, 10)
    : []

  if (findings.length === 0) {
    return {
      status: 'nothing_actionable',
      summary: openQuestions.length
        ? `${summary} Offen: ${openQuestions.join(' · ')}`
        : summary,
    }
  }

  // Open questions ride along as findings so they are visible and tickable
  // rather than buried in a summary nobody re-reads.
  for (const q of openQuestions) {
    findings.push({
      title: q.slice(0, 300),
      detail: 'Aus dem Dokument nicht eindeutig — vor der Umsetzung klären.',
      source: 'tagro',
      assetId: opts.assetId ?? null,
      locationHint: null,
    })
  }

  return { status: 'extracted', findings, summary }
}
