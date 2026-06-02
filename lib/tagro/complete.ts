import { runTagroText } from '@/lib/tagro/text'

/**
 * tagroComplete — the single server-side text-completion entry point for Tagro.
 *
 * Provider priority: Claude (Anthropic) → Gemini → MiniMax (env-only fallback).
 * Tagro runs on the Claude API whenever ANTHROPIC_API_KEY is set; MiniMax is an
 * emergency fallback and is ONLY used when MINIMAX_API_KEY is present in the
 * environment — there are no hardcoded credentials.
 *
 * Returns a stable shape so every API route can rely on it without caring which
 * provider actually answered.
 */

const MINIMAX_ENDPOINT = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const MINIMAX_DEFAULT_MODEL = 'MiniMax-M2.7'

/** Strip the <think>...</think> reasoning block some models prepend. */
function stripThink(s: string): string {
  return (s || '').replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
}

export type TagroMessage = { role?: string; content?: string; text?: string }

export type TagroCompleteOpts = {
  system?: string
  prompt?: string
  messages?: TagroMessage[]
  maxTokens?: number
  temperature?: number
  /** Nudge providers toward strict JSON output. */
  json?: boolean
}

export type TagroCompleteResult = {
  ok: boolean
  text: string
  model: string
  usage?: any
  error?: string
}

export async function tagroComplete(opts: TagroCompleteOpts): Promise<TagroCompleteResult> {
  const { json, ...base } = opts

  // 1) Claude → Gemini, via the provider-agnostic text entry point.
  const primary = await runTagroText({
    ...base,
    responseMimeType: json ? 'application/json' : 'text/plain',
  })
  const primaryText = stripThink(primary.text)
  if (primary.ok && primaryText) {
    return { ok: true, text: primaryText, model: primary.model, usage: (primary as any).usage ?? null }
  }

  // 2) MiniMax — emergency fallback, only if a key is configured (no hardcoded secret).
  const mmKey = process.env.MINIMAX_API_KEY
  if (mmKey) {
    try {
      const mmMessages: Array<{ role: string; content: string }> = []
      if (base.system?.trim()) mmMessages.push({ role: 'system', content: base.system.trim() })
      for (const m of base.messages ?? []) {
        const content = typeof m.text === 'string' ? m.text : typeof m.content === 'string' ? m.content : ''
        if (content.trim()) mmMessages.push({ role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user', content })
      }
      if (base.prompt?.trim()) mmMessages.push({ role: 'user', content: base.prompt.trim() })
      if (!mmMessages.some(m => m.role !== 'system')) mmMessages.push({ role: 'user', content: ' ' })

      const res = await fetch(MINIMAX_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mmKey}` },
        body: JSON.stringify({
          model: process.env.MINIMAX_MODEL || MINIMAX_DEFAULT_MODEL,
          max_tokens: base.maxTokens ?? 800,
          reasoning_effort: 'none',
          messages: mmMessages,
        }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && !data?.base_resp?.status_code) {
        return {
          ok: true,
          text: stripThink(data?.choices?.[0]?.message?.content ?? ''),
          model: data?.model ?? MINIMAX_DEFAULT_MODEL,
          usage: data?.usage ?? null,
        }
      }
      return { ok: false, text: '', model: MINIMAX_DEFAULT_MODEL, error: data?.base_resp?.status_msg ?? `minimax_http_${res.status}` }
    } catch (e: any) {
      return { ok: false, text: '', model: MINIMAX_DEFAULT_MODEL, error: e?.message ?? 'minimax_failed' }
    }
  }

  return { ok: false, text: '', model: primary.model, error: primary.error ?? 'no_ai_configured' }
}

export type TagroProvider = 'claude' | 'gemini' | 'minimax' | 'none'

/** Which provider Tagro will actually use, for diagnostics/health checks. */
export function activeTagroProvider(): { provider: TagroProvider; model: string | null } {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'claude',
      model: process.env.TAGRO_CLAUDE_MODEL || process.env.VEYRA_CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    }
  }
  if (process.env.GEMINI_API_KEY) {
    return { provider: 'gemini', model: process.env.TAGRO_GEMINI_MODEL || process.env.VEYRA_GEMINI_MODEL || 'gemini' }
  }
  if (process.env.MINIMAX_API_KEY) {
    return { provider: 'minimax', model: process.env.MINIMAX_MODEL || MINIMAX_DEFAULT_MODEL }
  }
  return { provider: 'none', model: null }
}
