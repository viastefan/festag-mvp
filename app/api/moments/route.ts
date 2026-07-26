import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createClientMoment,
  listClientMoments,
  revokeClientMoment,
} from '@/lib/moments/store'

export const runtime = 'nodejs'

/**
 * GET  /api/moments?agencyClientId=… — list Moments for a client.
 * POST /api/moments — create a Client Moment share snapshot.
 * DELETE /api/moments?token=… — revoke.
 */
export async function GET(req: NextRequest) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const agencyClientId = req.nextUrl.searchParams.get('agencyClientId')?.trim()
  if (!agencyClientId) {
    return NextResponse.json({ error: 'agency_client_id_required' }, { status: 400 })
  }

  const moments = await listClientMoments(sb as any, {
    agencyClientId,
    limit: Number(req.nextUrl.searchParams.get('limit') || 20) || 20,
  })
  return NextResponse.json({ moments })
}

export async function POST(req: NextRequest) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: {
    agencyClientId?: string
    scope?: 'overall' | 'project'
    projectId?: string | null
    title?: string
    expiresInDays?: number
    acknowledgeWarnings?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.agencyClientId) {
    return NextResponse.json({ error: 'agency_client_id_required' }, { status: 400 })
  }

  const result = await createClientMoment(sb as any, {
    userId: user.id,
    agencyClientId: body.agencyClientId,
    scope: body.scope,
    projectId: body.projectId,
    title: body.title,
    expiresInDays: body.expiresInDays,
    acknowledgeWarnings: body.acknowledgeWarnings,
  })

  if ('error' in result) {
    return NextResponse.json(
      { error: result.error, readiness: 'readiness' in result ? result.readiness : undefined },
      { status: result.status },
    )
  }

  const origin = req.nextUrl.origin
  return NextResponse.json({
    token: result.token,
    path: result.urlPath,
    url: `${origin}${result.urlPath}`,
    expiresAt: result.expiresAt,
  })
}

export async function DELETE(req: NextRequest) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const token = req.nextUrl.searchParams.get('token')?.trim()
  if (!token) return NextResponse.json({ error: 'token_required' }, { status: 400 })

  const ok = await revokeClientMoment(sb as any, token)
  if (!ok) return NextResponse.json({ error: 'revoke_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
