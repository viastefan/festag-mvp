import { hasClaudeKey, runClaudeText } from '@/lib/tagro/claude'
import { hasGeminiKey, runGeminiText } from '@/lib/tagro/gemini'

/**
 * Provider-agnostic Tagro text entry point.
 *
 * Priority: Claude (Anthropic) → Gemini. Returns the same shape as
 * runGeminiText so existing routes can swap to it via an import alias:
 *
 *   import { hasTagroAI as hasGeminiKey, runTagroText as runGeminiText }
 *     from '@/lib/tagro/text'
 */

export function hasTagroAI() {
  return hasClaudeKey() || hasGeminiKey()
}

type TagroTextOpts = {
  system?: string
  prompt?: string
  messages?: Array<{ role?: string; content?: string; text?: string }>
  maxTokens?: number
  temperature?: number
  responseMimeType?: 'application/json' | 'text/plain'
}

export async function runTagroText(opts: TagroTextOpts) {
  const { responseMimeType, ...base } = opts

  if (hasClaudeKey()) {
    // Nudge JSON-only output when the caller expects JSON (Claude has no
    // native response-format flag).
    const system =
      responseMimeType === 'application/json' && base.system
        ? `${base.system}\n\nAntworte ausschließlich als valides JSON — kein Markdown, keine Code-Fences.`
        : base.system
    const r = await runClaudeText({ ...base, system })
    if (r.ok) return r
    if (hasGeminiKey()) return runGeminiText(opts)
    return r
  }

  if (hasGeminiKey()) return runGeminiText(opts)

  return { ok: false as const, text: '', model: 'no-ai-configured', error: 'no_ai_configured' }
}
