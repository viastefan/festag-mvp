import { runOpenAIJson } from '@/lib/tagro/openai'

export type TranslatedClarification = {
  translatedText: string
  confidence: number
  model: string
}

function heuristicFallback(rawText: string, direction: string): Record<string, unknown> {
  const clean = rawText.trim()
  const sentence = clean.length > 400 ? clean.slice(0, 397) + '…' : clean
  return {
    translated_text: sentence,
    confidence: 0.35,
  }
}

export async function translateBudgetClarification(input: {
  rawText: string
  direction: 'dev_to_client' | 'client_to_dev'
  context: {
    projectTitle: string | null
    scopeSummary?: string | null
    budgetMin?: number | null
    budgetMax?: number | null
    devProposedPrice?: number | null
  }
}): Promise<TranslatedClarification> {
  const { rawText, direction, context } = input

  const contextBlock = [
    context.projectTitle ? `Projekt: "${context.projectTitle}"` : '',
    context.scopeSummary ? `Umfang: ${context.scopeSummary}` : '',
    context.budgetMin && context.budgetMax
      ? `Budget-Rahmen: ${context.budgetMin}–${context.budgetMax} EUR`
      : context.budgetMax
        ? `Budget bis ${context.budgetMax} EUR`
        : '',
    context.devProposedPrice ? `Dev-Vorschlag: ${context.devProposedPrice} EUR` : '',
  ].filter(Boolean).join('\n')

  const systemInstructions = direction === 'dev_to_client'
    ? `Du übersetzt eine technische Preis-Klarstellung eines Entwicklers in ruhige, sachliche Sprache für einen nicht-technischen Auftraggeber. Erkläre, warum der ursprüngliche Rahmen den Umfang nicht abdeckt, ohne anklagend zu wirken. Schlage höchstens leise vor, den Umfang zu reduzieren als Alternative. 2-4 Sätze. Keine Fachbegriffe. Kein Druck.`
    : `Du übersetzt eine Antwort des Auftraggebers in klare Anforderungen für den Entwickler. Markiere, ob der Client den Vorschlag annimmt, anpasst oder den Umfang reduzieren will. 2-3 Sätze. Sachlich.`

  const prompt = `${systemInstructions}

Kontext:
${contextBlock}

Original-Text:
"""${rawText.trim()}"""

Antworte als JSON:
{
  "translated_text": string,
  "confidence": number
}`

  const result = await runOpenAIJson({
    prompt,
    runType: 'budget_clarification_translation',
    fallback: () => heuristicFallback(rawText, direction),
  })

  const out = result.output as Record<string, unknown>
  return {
    translatedText: String(out.translated_text ?? rawText),
    confidence: Number(out.confidence ?? 0.5),
    model: result.model ?? 'heuristic',
  }
}
