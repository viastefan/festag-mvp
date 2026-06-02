import { NextRequest, NextResponse } from 'next/server'
import { loadTagroMemoryContext, rememberTagroMemory } from '@/lib/tagro-memory'
import { tagroComplete } from '@/lib/tagro/complete'

/**
 * Festag AI proxy — Tagro runs on the Claude API (Anthropic) whenever
 * ANTHROPIC_API_KEY is set; falls back to Gemini, then MiniMax (env-only).
 * Keeps the Anthropic response shape ({ content: [{ text, type:'text' }] }) so
 * all existing frontend calls (data.content?.[0]?.text) keep working.
 */

export async function POST(req: NextRequest) {
  try {
    const { messages, system, max_tokens = 500, userId, projectId, remember } = await req.json()

    const memoryContext = await loadTagroMemoryContext({ userId, projectId })
    if (remember && typeof remember?.content === 'string' && typeof userId === 'string') {
      await rememberTagroMemory({
        userId,
        projectId: typeof projectId === 'string' ? projectId : null,
        scope: remember.scope ?? (projectId ? 'project' : 'account'),
        key: remember.key ?? null,
        content: remember.content,
        source: 'chat-api',
        confidence: typeof remember.confidence === 'number' ? remember.confidence : 1,
      })
    }

    const enrichedSystem = [
      typeof system === 'string' ? system.trim() : '',
      memoryContext ? `\nTagro Memory / Account-Kontext:\n${memoryContext}\n\nNutze diesen Kontext aktiv. Sage nicht, dass du keinen Zugriff auf Profil, Projekt oder bisherigen Kontext hast, wenn relevante Informationen oben stehen.` : '',
    ].filter(Boolean).join('\n\n')

    // Normalize incoming Anthropic-style messages to the provider-agnostic shape.
    const normalized = Array.isArray(messages)
      ? messages.map((m: any) => ({
          role: m?.role === 'assistant' || m?.role === 'model' ? 'assistant' : 'user',
          content: typeof m?.content === 'string'
            ? m.content
            : Array.isArray(m?.content)
              ? m.content.map((c: any) => c?.text ?? '').join('')
              : '',
        }))
      : []

    const result = await tagroComplete({
      system: enrichedSystem,
      messages: normalized,
      maxTokens: max_tokens,
      temperature: 0.2,
    })

    if (!result.ok) {
      return NextResponse.json({
        error: result.error ?? 'upstream_error',
        message: result.error ?? 'Tagro AI request failed',
      }, { status: 500 })
    }

    return NextResponse.json({
      content: [{ type: 'text', text: result.text }],
      thinking: null,
      usage: result.usage ?? null,
      model: result.model,
    })
  } catch (e: any) {
    return NextResponse.json({
      error: 'AI request failed',
      message: e?.message ?? 'unknown',
    }, { status: 500 })
  }
}
