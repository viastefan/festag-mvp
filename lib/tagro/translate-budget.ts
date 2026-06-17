import { runOpenAIJson } from '@/lib/tagro/openai'

export type TranslatedBudgetNote = {
  translatedNote: string
  confidence: number
  model: string
}

function heuristicFallback(rawNote: string): Record<string, unknown> {
  const clean = rawNote.trim()
  const sentence = clean.length > 300 ? clean.slice(0, 297) + '…' : clean
  return {
    translated_note: sentence,
    confidence: 0.4,
  }
}

export async function translateBudgetNote(input: {
  rawNote: string
  projectTitle: string | null
  budgetMin?: number | null
  budgetMax?: number | null
  currency?: string
}): Promise<TranslatedBudgetNote> {
  const { rawNote, projectTitle, budgetMin, budgetMax, currency = 'EUR' } = input

  const budgetRange = budgetMin && budgetMax
    ? `Budget-Rahmen: ${budgetMin}–${budgetMax} ${currency}`
    : budgetMax
      ? `Budget bis ${budgetMax} ${currency}`
      : ''

  const prompt = `Ein Auftraggeber hat folgende Budget-Notiz geschrieben${projectTitle ? ` zum Projekt "${projectTitle}"` : ''}:

"""${rawNote.trim()}"""

${budgetRange ? `\n${budgetRange}\n` : ''}
Übersetze das in eine klare, strukturierte Anforderungsbeschreibung für den Entwickler.

Regeln:
- Sachlich und präzise, keine Emotionen.
- Technische Begriffe des Clients beibehalten, aber vage Formulierungen konkretisieren.
- 2-4 Sätze.
- Deutsch.

Antworte als JSON:
{
  "translated_note": string,
  "confidence": number
}`

  const result = await runOpenAIJson({
    prompt,
    runType: 'budget_translation',
    fallback: () => heuristicFallback(rawNote),
  })

  const out = result.output as Record<string, unknown>
  return {
    translatedNote: String(out.translated_note ?? rawNote),
    confidence: Number(out.confidence ?? 0.5),
    model: result.model ?? 'heuristic',
  }
}
