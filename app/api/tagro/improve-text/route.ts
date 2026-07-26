import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  WRITING_ACTIONS,
  improveExtensionText,
  parseWritingAction,
} from '@/lib/extension/writing-assistant'

export const runtime = 'nodejs'
export const maxDuration = 30

/** Portal text polish — same engine as the Chrome writing assistant. */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: {
    text?: string
    action?: string
    pageTitle?: string
    fieldLabel?: string
    documentKind?: string
    placeholder?: string
    draftField?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const text = (body.text || '').trim()
  const draftField = body.draftField === true
  if (!text && !draftField) return NextResponse.json({ error: 'text_required' }, { status: 400 })
  if (text.length > 8000) return NextResponse.json({ error: 'text_too_long' }, { status: 400 })

  const action = parseWritingAction(body.action)
  if (body.action && !WRITING_ACTIONS.includes(body.action as typeof action)) {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  const result = await improveExtensionText({
    userId: user.id,
    text,
    action,
    pageTitle: body.pageTitle ?? null,
    fieldLabel: body.fieldLabel ?? null,
    documentKind: body.documentKind ?? null,
    placeholder: body.placeholder ?? null,
    draftField,
  })

  if (result.fellBack) {
    return NextResponse.json(
      { error: 'ai_unavailable', action: result.action, model: result.model },
      { status: 503 },
    )
  }

  return NextResponse.json({ improved: result.improved, action: result.action, model: result.model })
}
