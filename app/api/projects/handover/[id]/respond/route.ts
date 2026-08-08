import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { respondToHandover } from '@/lib/projects/handover'

export const runtime = 'nodejs'

/**
 * POST /api/projects/handover/:id/respond
 *
 * The recipient answers. Accepting wires both accounts to the project and
 * notifies the sender, which is what drives the acceptance animation.
 *
 * Body: { accept: boolean, reason?: string }
 */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
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

  if (typeof body?.accept !== 'boolean') {
    return NextResponse.json({ error: 'accept must be boolean' }, { status: 400 })
  }

  const service = getServiceClient() || supa
  const result = await respondToHandover(service as any, {
    handoverId: ctx.params.id,
    userId: user.id,
    accept: body.accept,
    reason: typeof body?.reason === 'string' ? body.reason.slice(0, 500) : null,
  })

  if (!result.ok) {
    const status =
      result.error === 'not_found'
        ? 404
        : result.error === 'not_allowed'
          ? 403
          : 409
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json(result)
}
