import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { createHandover } from '@/lib/projects/handover'

export const runtime = 'nodejs'

/**
 * POST /api/projects/handover
 *
 * Offer a project to someone. The relationship (dev↔client vs. dev↔dev) is
 * derived from both profiles, so the caller never has to declare it.
 *
 * Body: { projectId, toUserId, message?, offerAmount?, offerCurrency?, offerNote? }
 * Leaving offerAmount out means the price stays open and can be agreed later.
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const {
    data: { user },
  } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const projectId = String(body?.projectId || '')
  const toUserId = String(body?.toUserId || '')
  if (!projectId || !toUserId) {
    return NextResponse.json({ error: 'projectId and toUserId required' }, { status: 400 })
  }

  /* Only someone who owns the project may hand it on. */
  const { data: project } = await (supa as any)
    .from('projects')
    .select('id, user_id, workspace_id')
    .eq('id', projectId)
    .maybeSingle()
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (project.user_id !== user.id) {
    const { data: member } = await (supa as any)
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!member) return NextResponse.json({ error: 'not allowed' }, { status: 403 })
  }

  const rawAmount = body?.offerAmount
  const offerAmount =
    rawAmount === null || rawAmount === undefined || rawAmount === ''
      ? null
      : Number(rawAmount)
  if (offerAmount !== null && (!Number.isFinite(offerAmount) || offerAmount < 0)) {
    return NextResponse.json({ error: 'invalid_offer' }, { status: 400 })
  }

  const service = getServiceClient() || supa
  const result = await createHandover(service as any, {
    projectId,
    fromUserId: user.id,
    toUserId,
    message: typeof body?.message === 'string' ? body.message.slice(0, 2000) : null,
    offerAmount,
    offerCurrency: typeof body?.offerCurrency === 'string' ? body.offerCurrency : 'EUR',
    offerNote: typeof body?.offerNote === 'string' ? body.offerNote.slice(0, 500) : null,
  })

  if (!result.ok) {
    const status = result.error === 'handover_exists' ? 409 : 400
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json(result)
}
