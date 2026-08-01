import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  analyzeIntent,
  blueprintMetadataPatch,
  type TagroBlueprint,
} from '@/lib/tagro/workspace-blueprint'

export const runtime = 'nodejs'

/**
 * POST /api/onboarding/analyze-intent
 * Intent text → Tagro Workspace Blueprint (heuristic OKM seed).
 * Optionally persists onto the caller's primary workspace metadata.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { text?: string; clarify?: string; persist?: boolean } = {}
    try {
      body = await req.json()
    } catch {
      /* empty */
    }
    const text = String(body.text || '').trim().slice(0, 2000)
    const clarify = String(body.clarify || '').trim().slice(0, 64)
    if (!text && !clarify) {
      return NextResponse.json({ ok: false, error: 'text_required' }, { status: 400 })
    }

    const blueprint: TagroBlueprint = analyzeIntent(text, clarify)

    let persisted = false
    if (body.persist) {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: owned } = await supabase
          .from('workspaces')
          .select('id, metadata')
          .eq('primary_owner_id', user.id)
          .order('is_personal', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (owned?.id) {
          const nextMeta = blueprintMetadataPatch(
            (owned.metadata as Record<string, unknown>) ?? {},
            blueprint,
          )
          const { error } = await supabase
            .from('workspaces')
            .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
            .eq('id', owned.id)
          persisted = !error
        }
      }
    }

    return NextResponse.json({ ok: true, blueprint, persisted })
  } catch (e) {
    console.error('[analyze-intent]', e)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
