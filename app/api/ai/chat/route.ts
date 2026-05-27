import { NextRequest, NextResponse } from 'next/server'
import { loadTagroMemoryContext, rememberTagroMemory } from '@/lib/tagro-memory'
import { hasGeminiKey, runGeminiText } from '@/lib/tagro/gemini'

/**
 * Festag AI proxy — leitet an Minimax weiter, behaelt aber das Anthropic-
 * Response-Format ({ content: [{ text, type:'text' }] }) damit alle
 * bestehenden Frontend-Calls (data.content?.[0]?.text) weiter funktionieren.
 *
 * MIGRATION: Anthropic -> Minimax (MiniMax-Text-01).
 * MINIMAX_API_KEY muss in Vercel-ENV gesetzt sein.
 */

const MINIMAX_ENDPOINT = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const MINIMAX_DEFAULT_MODEL = 'MiniMax-M2.7'

/** Strip the <think>...</think> reasoning block that MiniMax-M2.x prepends. */
function stripThink(s: string): string {
  return s.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
}

export async function POST(req: NextRequest) {
  try {
    const { messages, system, max_tokens = 500, model, userId, projectId, remember } = await req.json()
    const apiKey = process.env.MINIMAX_API_KEY || 'sk-cp-i7jkWRarSBe8qM82Zj2YXxHh7bXCCUAwciPjL5t-WrYRF3WHR4tgVXeJk-Y27k62RDsp7hrb1RJS2nr9rqXB-Q6GBMCKXU6-igQu2pPH6gerajhYbZySzHA'
    if (!apiKey) {
      return NextResponse.json({
        error: 'not configured',
        hint: 'MINIMAX_API_KEY missing in environment.',
      }, { status: 500 })
    }

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

    // Anthropic-Format -> OpenAI/Minimax-Format
    // System wird als erste Message mit role="system" gesendet.
    const mmMessages: Array<{ role: string; content: string }> = []
    if (enrichedSystem) {
      mmMessages.push({ role: 'system', content: enrichedSystem })
    }
    if (Array.isArray(messages)) {
      for (const m of messages) {
        const content = typeof m?.content === 'string'
          ? m.content
          : Array.isArray(m?.content)
            ? m.content.map((c: any) => c?.text ?? '').join('')
            : ''
        mmMessages.push({ role: m?.role ?? 'user', content })
      }
    }

    if (hasGeminiKey()) {
      const geminiMessages = mmMessages
        .filter(message => message.role !== 'system')
        .map(message => ({
          role: message.role === 'assistant' ? 'model' as const : 'user' as const,
          text: message.content,
        }))
      const gemini = await runGeminiText({
        system: enrichedSystem,
        messages: geminiMessages,
        maxTokens: max_tokens,
        temperature: 0.2,
      })
      if (gemini.ok) {
        return NextResponse.json({
          content: [{ type: 'text', text: gemini.text }],
          thinking: null,
          usage: gemini.usage ?? null,
          model: gemini.model,
        })
      }
    }

    const res = await fetch(MINIMAX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model ?? MINIMAX_DEFAULT_MODEL,
        max_tokens,
        reasoning_effort: 'none',  // minimiert <think>-Block fuer schnellere Antworten
        messages: mmMessages,
      }),
    })
    const data = await res.json()

    if (!res.ok || data?.base_resp?.status_code) {
      return NextResponse.json({
        error: data?.base_resp?.status_msg ?? data?.error?.message ?? 'upstream_error',
        message: data?.base_resp?.status_msg ?? 'Minimax API call failed',
        status: res.status,
      }, { status: res.status >= 400 ? res.status : 500 })
    }

    // Minimax-Format -> Anthropic-Format zurueckkonvertieren
    // <think>...</think> Reasoning-Block extrahieren UND aus Hauptantwort entfernen
    const raw = data?.choices?.[0]?.message?.content ?? ''
    const thinkMatch = raw.match(/<think>([\s\S]*?)<\/think>/)
    const thinking = thinkMatch?.[1]?.trim() || null
    const text = stripThink(raw)
    return NextResponse.json({
      content: [{ type: 'text', text }],
      thinking,
      usage: data?.usage ?? null,
      model: data?.model ?? model ?? MINIMAX_DEFAULT_MODEL,
    })
  } catch (e: any) {
    return NextResponse.json({
      error: 'AI request failed',
      message: e?.message ?? 'unknown',
    }, { status: 500 })
  }
}
