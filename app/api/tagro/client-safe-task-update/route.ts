import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from '@/lib/supabase/server'
import { buildVeyraContext, contextToPromptText } from '@/lib/tagro/task-context-builder'
import { clientSafeTransformerPrompt } from '@/lib/tagro/task-prompts'
import { runOpenAIJson } from '@/lib/tagro/openai'
import { clientSafeTaskUpdate } from '@/lib/tagro/client-safe-transformer'
import { ensureProjectAccess, saveVeyraRun } from '@/lib/tagro/task-actions'

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
    const projectId = String(body.projectId || body.project_id || '').trim()
    const taskId = String(body.taskId || body.task_id || '').trim()
    const rawUpdate = String(body.rawUpdate || body.raw_update || body.update || '').trim()

    if (!projectId) return NextResponse.json({ ok: false, error: 'project_id_required' }, { status: 400 })
    if (!rawUpdate) return NextResponse.json({ ok: false, error: 'raw_update_required' }, { status: 400 })

    const cookieClient = createCookieClient()
    const { data: { user } } = await cookieClient.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    const sb = serviceClient(cookieClient)
    await ensureProjectAccess(sb as any, projectId, user.id)

    const context = await buildVeyraContext({ sb: sb as any, projectId, purpose: 'client_safe' })
    const prompt = clientSafeTransformerPrompt(rawUpdate, contextToPromptText(context))
    const result = await runOpenAIJson({
      prompt,
      runType: 'client_safe_transform',
      fallback: () => clientSafeTaskUpdate(rawUpdate),
    })

    await saveVeyraRun(sb as any, {
      projectId,
      runType: 'client_safe_transform',
      inputJson: { taskId, rawUpdate },
      outputJson: result.output as Record<string, unknown>,
      model: result.model,
      status: result.status,
      errorMessage: (result as any).error ?? null,
    })

    if (taskId) {
      await (sb as any).from('tasks').update({
        latest_client_update: (result.output as any).client_update || (result.output as any).what_changed || rawUpdate,
      }).eq('id', taskId)
    }

    return NextResponse.json({ ok: true, update: result.output })
  } catch (error: any) {
    const message = error?.message || 'client_safe_task_update_failed'
    const status = message === 'project_access_denied' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}

