import { extractJsonObject, type JsonObject } from '@/lib/tagro/json'

type GeminiRole = 'user' | 'model'

type GeminiMessage = {
  role: GeminiRole
  text: string
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

export function getGeminiModel() {
  return process.env.TAGRO_GEMINI_MODEL || process.env.VEYRA_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.5-flash'
}

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY)
}

function textFromGeminiResponse(data: any) {
  return ((data?.candidates?.[0]?.content?.parts ?? []) as any[])
    .map(part => typeof part?.text === 'string' ? part.text : '')
    .join('')
    .trim()
}

function normalizeMessages(messages: Array<GeminiMessage | { role?: string; content?: string }> = []) {
  return messages
    .map(message => {
      const role: GeminiRole = message.role === 'model' || message.role === 'assistant' ? 'model' : 'user'
      const text = 'text' in message
        ? message.text
        : typeof message.content === 'string'
          ? message.content
          : ''
      return { role, parts: [{ text }] }
    })
    .filter(message => message.parts[0].text.trim())
}

export async function runGeminiText({
  system,
  prompt,
  messages,
  maxTokens = 1200,
  temperature = 0.2,
  responseMimeType,
}: {
  system?: string
  prompt?: string
  messages?: Array<GeminiMessage | { role?: string; content?: string }>
  maxTokens?: number
  temperature?: number
  responseMimeType?: 'application/json' | 'text/plain'
}) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { ok: false as const, text: '', model: 'gemini-not-configured', error: 'GEMINI_API_KEY missing' }
  }

  const model = getGeminiModel()
  const contents = normalizeMessages(messages)
  if (prompt?.trim()) contents.push({ role: 'user' as const, parts: [{ text: prompt.trim() }] })

  const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      ...(system?.trim() ? { systemInstruction: { parts: [{ text: system.trim() }] } } : {}),
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(responseMimeType ? { responseMimeType } : {}),
      },
    }),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    return {
      ok: false as const,
      text: '',
      model,
      error: data?.error?.message ?? `gemini_http_${response.status}`,
    }
  }

  return {
    ok: true as const,
    text: textFromGeminiResponse(data),
    model,
    usage: data?.usageMetadata ?? null,
  }
}

export async function runGeminiJson({
  system,
  prompt,
  runType,
  fallback,
  maxTokens = 1600,
}: {
  system?: string
  prompt: string
  runType: string
  fallback: () => JsonObject
  maxTokens?: number
}) {
  try {
    const result = await runGeminiText({
      system: system ?? `Du bist Tagro Backend Orchestration. Antworte fuer ${runType} strikt als valides JSON.`,
      prompt,
      maxTokens,
      temperature: 0.2,
      responseMimeType: 'application/json',
    })
    if (!result.ok) {
      return { output: fallback(), model: result.model, status: 'fallback' as const, error: result.error }
    }
    return {
      output: extractJsonObject(result.text),
      model: result.model,
      status: 'completed' as const,
    }
  } catch (error: any) {
    return {
      output: fallback(),
      model: getGeminiModel(),
      status: 'fallback' as const,
      error: error?.message ?? 'gemini_failed',
    }
  }
}
