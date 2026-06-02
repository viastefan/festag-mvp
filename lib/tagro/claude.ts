import { extractJsonObject, type JsonObject } from '@/lib/tagro/json'

/**
 * Claude (Anthropic) provider for Tagro.
 *
 * Tagro uses Claude as its AI backend whenever `ANTHROPIC_API_KEY` is set —
 * it takes priority over Gemini/OpenAI in the dispatcher (lib/tagro/openai.ts).
 *
 * The per-runType system prompt is sent with `cache_control: ephemeral` so the
 * (stable) system instruction is prompt-cached across calls — cheaper + faster
 * on repeat orchestration runs.
 */

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'

export function getClaudeModel() {
  return process.env.TAGRO_CLAUDE_MODEL || process.env.VEYRA_CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
}

export function hasClaudeKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

type ClaudeMessage = { role?: string; content?: string; text?: string }

function normalizeMessages(messages: ClaudeMessage[] = []) {
  return messages
    .map(m => {
      const role = m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user'
      const text = typeof m.text === 'string' ? m.text : typeof m.content === 'string' ? m.content : ''
      return { role: role as 'user' | 'assistant', content: text }
    })
    .filter(m => m.content.trim())
}

export async function runClaudeText({
  system,
  prompt,
  messages,
  maxTokens = 1600,
  temperature = 0.2,
}: {
  system?: string
  prompt?: string
  messages?: ClaudeMessage[]
  maxTokens?: number
  temperature?: number
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { ok: false as const, text: '', model: 'claude-not-configured', error: 'ANTHROPIC_API_KEY missing' }
  }

  const model = getClaudeModel()
  const content = normalizeMessages(messages)
  if (prompt?.trim()) content.push({ role: 'user', content: prompt.trim() })
  if (!content.length) content.push({ role: 'user', content: ' ' })

  try {
    const response = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        // Cache the stable system instruction across calls.
        ...(system?.trim()
          ? { system: [{ type: 'text', text: system.trim(), cache_control: { type: 'ephemeral' } }] }
          : {}),
        messages: content,
      }),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      return { ok: false as const, text: '', model, error: data?.error?.message ?? `claude_http_${response.status}` }
    }

    const text = ((data?.content ?? []) as any[])
      .map(part => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim()

    return { ok: true as const, text, model, usage: data?.usage ?? null }
  } catch (error: any) {
    return { ok: false as const, text: '', model, error: error?.message ?? 'claude_failed' }
  }
}

export async function runClaudeJson({
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
    const result = await runClaudeText({
      system:
        system ??
        `Du bist Tagro Backend Orchestration. Antworte für ${runType} ausschließlich als valides JSON-Objekt — kein Markdown, keine Code-Fences, kein Fließtext.`,
      prompt,
      maxTokens,
      temperature: 0.2,
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
      model: getClaudeModel(),
      status: 'fallback' as const,
      error: error?.message ?? 'claude_failed',
    }
  }
}
