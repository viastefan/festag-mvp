import { NextRequest, NextResponse } from 'next/server'

/**
 * Festag AI proxy — leitet an Minimax weiter, behaelt aber das Anthropic-
 * Response-Format ({ content: [{ text, type:'text' }] }) damit alle
 * bestehenden Frontend-Calls (data.content?.[0]?.text) weiter funktionieren.
 *
 * MIGRATION: Anthropic -> Minimax (MiniMax-Text-01).
 * MINIMAX_API_KEY muss in Vercel-ENV gesetzt sein.
 */

const MINIMAX_ENDPOINT = 'https://api.minimaxi.chat/v1/text/chatcompletion_v2'
const MINIMAX_DEFAULT_MODEL = 'MiniMax-Text-01'

export async function POST(req: NextRequest) {
  try {
    const { messages, system, max_tokens = 500, model } = await req.json()
    const apiKey = process.env.MINIMAX_API_KEY || 'sk-api-E2sKUjhnOC8U5Crp2HcnwMa5RYvP-yrHRqphyS02cUi8KO4KUbnjKWmqNDemitoGh6_iZEtZ-Dymc74lIu8FGR1LZz3PrqDPNJvExGfWX94AS9u0fgqAPAo'
    if (!apiKey) {
      return NextResponse.json({
        error: 'not configured',
        hint: 'MINIMAX_API_KEY missing in environment.',
      }, { status: 500 })
    }

    // Anthropic-Format -> OpenAI/Minimax-Format
    // System wird als erste Message mit role="system" gesendet.
    const mmMessages: Array<{ role: string; content: string }> = []
    if (typeof system === 'string' && system.trim()) {
      mmMessages.push({ role: 'system', content: system })
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

    const res = await fetch(MINIMAX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model ?? MINIMAX_DEFAULT_MODEL,
        max_tokens,
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
    const text = data?.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({
      content: [{ type: 'text', text }],
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
