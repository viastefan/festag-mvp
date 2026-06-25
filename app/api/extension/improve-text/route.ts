import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  WRITING_ACTIONS,
  improveExtensionText,
  parseWritingAction,
} from '@/lib/extension/writing-assistant'
import { checkExtensionImproveRateLimit, recordExtensionImproveUsage } from '@/lib/extension/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const sb = createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { text?: string; action?: string; pageUrl?: string; pageTitle?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const text = (body.text || '').trim()
  if (!text) return NextResponse.json({ error: 'text_required' }, { status: 400 })
  if (text.length > 8000) return NextResponse.json({ error: 'text_too_long' }, { status: 400 })

  const action = parseWritingAction(body.action)
  if (body.action && !WRITING_ACTIONS.includes(body.action as typeof action)) {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  const rate = await checkExtensionImproveRateLimit(user.id)
  if (!rate.ok) {
    return NextResponse.json({ error: 'rate_limit', remaining: 0 }, { status: 429 })
  }

  const result = await improveExtensionText({
    userId: user.id,
    text,
    action,
    pageUrl: body.pageUrl ?? null,
    pageTitle: body.pageTitle ?? null,
  })

  void recordExtensionImproveUsage({
    userId: user.id,
    action,
    pageUrl: body.pageUrl ?? null,
    applied: false,
  })

  return NextResponse.json(result)
}
