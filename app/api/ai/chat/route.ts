import { NextRequest, NextResponse } from 'next/server'

/**
 * Festag AI proxy — calls the Anthropic Messages API.
 *
 * Improvements:
 *   - Prompt caching on long system prompts (cuts cost + latency by ~80%
 *     on repeated calls within 5min)
 *   - Detailed error pass-through with status codes + provider message
 *   - Returns clean shape even when upstream fails (so client never
 *     sees raw Anthropic error JSON)
 */
export async function POST(req: NextRequest) {
  try {
    const { messages, system, max_tokens = 500, model } = await req.json()
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'not configured',
        hint: 'ANTHROPIC_API_KEY missing in environment.',
      }, { status: 500 })
    }

    // Cache long system prompts (>1024 chars) — Anthropic uses ephemeral 5-min cache
    const sysCacheable = typeof system === 'string' && system.length > 1024
    const sysPayload = sysCacheable
      ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
      : (system ? [{ type: 'text', text: system }] : undefined)

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model ?? 'claude-sonnet-4-20250514',
        max_tokens,
        ...(sysPayload ? { system: sysPayload } : {}),
        messages,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({
        error: data?.error?.type ?? 'upstream_error',
        message: data?.error?.message ?? 'Anthropic API call failed',
        status: res.status,
      }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({
      error: 'AI request failed',
      message: e?.message ?? 'unknown',
    }, { status: 500 })
  }
}
