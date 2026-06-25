import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  WRITING_ACTIONS,
  parseWritingAction,
  recordWritingApply,
} from '@/lib/extension/writing-assistant'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/extension/improve-text/apply
 * Called when the user accepts a preview — stores the pair and distills style memory.
 */
export async function POST(req: NextRequest) {
  const sb = createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: {
    original?: string
    improved?: string
    action?: string
    pageUrl?: string
    pageTitle?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const original = (body.original || '').trim()
  const improved = (body.improved || '').trim()
  if (!original || !improved) {
    return NextResponse.json({ error: 'original_and_improved_required' }, { status: 400 })
  }

  const action = parseWritingAction(body.action)
  if (body.action && !WRITING_ACTIONS.includes(body.action as typeof action)) {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  const result = await recordWritingApply({
    userId: user.id,
    original,
    improved,
    action,
    pageUrl: body.pageUrl ?? null,
    pageTitle: body.pageTitle ?? null,
  })

  return NextResponse.json(result)
}
