import { extractJsonObject, type JsonObject } from '@/lib/tagro/json'

export type { JsonObject }

export async function runOpenAIJson({
  prompt,
  runType,
  fallback,
}: {
  prompt: string
  runType: string
  fallback: () => JsonObject
}) {
  // Provider priority: Claude (Anthropic) → Gemini → OpenAI → heuristic.
  // Veyra runs on Claude whenever ANTHROPIC_API_KEY is set.
  if (process.env.ANTHROPIC_API_KEY) {
    const { runClaudeJson } = await import('@/lib/tagro/claude')
    return runClaudeJson({ prompt, runType, fallback })
  }

  if (process.env.GEMINI_API_KEY) {
    const { runGeminiJson } = await import('@/lib/tagro/gemini')
    return runGeminiJson({ prompt, runType, fallback })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { output: fallback(), model: 'heuristic', status: 'completed' as const }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.VEYRA_OPENAI_MODEL || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          { role: 'system', content: `Du bist Veyra Backend Orchestration. Antworte fuer ${runType} strikt als valides JSON.` },
          { role: 'user', content: prompt },
        ],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return {
        output: fallback(),
        model: process.env.VEYRA_OPENAI_MODEL || 'gpt-4o-mini',
        status: 'fallback' as const,
        error: data?.error?.message ?? 'openai_request_failed',
      }
    }

    const text = data?.choices?.[0]?.message?.content ?? '{}'
    return {
      output: extractJsonObject(text),
      model: data?.model ?? process.env.VEYRA_OPENAI_MODEL ?? 'gpt-4o-mini',
      status: 'completed' as const,
    }
  } catch (error: any) {
    return {
      output: fallback(),
      model: process.env.VEYRA_OPENAI_MODEL || 'gpt-4o-mini',
      status: 'fallback' as const,
      error: error?.message ?? 'openai_failed',
    }
  }
}
