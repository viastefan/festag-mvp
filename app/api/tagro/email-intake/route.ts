import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tagroComplete } from '@/lib/tagro/complete'
import {
  emailIntakeSystemPrompt,
  emailIntakeToNoteSuggestions,
  emailIntakeUserPrompt,
  emptyEmailIntake,
  looksLikeClientEmail,
  normalizeEmailIntake,
} from '@/lib/tagro/email-intake'

export const runtime = 'nodejs'

/**
 * POST /api/tagro/email-intake
 *
 * Draft-only: paste a client email → structured Freigaben / Entscheidungen /
 * Tasks / Klärungen. Does not create entities — confirm elsewhere
 * (notes spawn-tasks, delivery coordinate, decisions create).
 *
 * Body: { text: string, projectContext?: string }
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const {
    data: { user },
  } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const text = String(body.text || body.email || body.body || '').trim()
  const projectContext = String(body.projectContext || body.project_context || '').trim()

  if (text.length < 40) {
    return NextResponse.json({
      ok: true,
      intake: emptyEmailIntake(),
      suggestions: emailIntakeToNoteSuggestions(emptyEmailIntake()),
      reason: 'text_too_short',
    })
  }

  try {
    const ai = await tagroComplete({
      system: emailIntakeSystemPrompt(),
      prompt: emailIntakeUserPrompt(text, projectContext),
      maxTokens: 2200,
      temperature: 0.15,
      json: true,
    })

    if (!ai.ok || !ai.text) {
      return NextResponse.json({ ok: false, error: 'tagro_failed' }, { status: 502 })
    }

    const cleaned = ai.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .trim()

    let parsed: unknown = null
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 502 })
    }

    const intake = normalizeEmailIntake(parsed)
    return NextResponse.json({
      ok: true,
      intake,
      suggestions: emailIntakeToNoteSuggestions(intake),
      detected_as_email: looksLikeClientEmail(text),
    })
  } catch {
    return NextResponse.json({ ok: false, error: 'tagro_error' }, { status: 500 })
  }
}
