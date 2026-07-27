import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from '@/lib/supabase/server'
import { ensureProjectAccess } from '@/lib/tagro/task-actions'
import { getTagroRunDefinition } from '@/lib/tagro/model/runs'
import { runTagroModel } from '@/lib/tagro/run'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function serviceClient(fallback: any) {
  return SERVICE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    : fallback
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const runType = String(body.runType || body.run_type || '').trim()
    const projectId = String(body.projectId || body.project_id || '').trim()
    const input = body.input && typeof body.input === 'object' ? body.input : {}
    const definition = getTagroRunDefinition(runType)

    if (!definition) {
      return NextResponse.json({ ok: false, error: 'unknown_tagro_run_type' }, { status: 400 })
    }
    if (definition.purpose && !projectId) {
      return NextResponse.json({ ok: false, error: 'project_id_required' }, { status: 400 })
    }

    const cookieClient = createCookieClient()
    const { data: { user } } = await cookieClient.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    const sb = serviceClient(cookieClient)
    if (projectId) await ensureProjectAccess(sb as any, projectId, user.id)

    const result = await runTagroModel({
      sb: sb as any,
      definition: definition as any,
      input,
      projectId,
      actorId: user.id,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    const message = error?.message || 'tagro_run_failed'
    const status = message === 'project_access_denied' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
