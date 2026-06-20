import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import {
  isClientDeliveryModel,
  publishAssignExistingDev,
  publishFestagPool,
} from '@/lib/projects/delivery-bridge'

export const runtime = 'nodejs'

/**
 * POST /api/projects/publish
 *
 * Single entry point after „Neues Projekt" — wires the chosen delivery model
 * to the correct Dev Panel surface.
 *
 * Body:
 *   projectId (required)
 *   delivery: festag_delivery | assign_existing_dev | invite_new_dev | team_internal
 *
 * festag_delivery:     { budget?, desiredStartDate? }
 * assign_existing_dev: { devHandle?, devEmail?, budgetNote? }
 * invite_new_dev:      → use /api/projects/invite-dev (same session)
 * team_internal:       → use /api/projects/assign-team (same session)
 */
export async function POST(req: NextRequest) {
  try {
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
    const sb = service as any

    const body = await req.json().catch(() => ({}))
    const projectId: string | undefined = body?.projectId
    const delivery = isClientDeliveryModel(body?.delivery) ? body.delivery : null

    if (!projectId) return NextResponse.json({ error: 'missing_projectId' }, { status: 400 })
    if (!delivery) return NextResponse.json({ error: 'missing_or_invalid_delivery' }, { status: 400 })

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

    switch (delivery) {
      case 'festag_delivery': {
        const result = await publishFestagPool(sb, {
          projectId,
          actorId: user.id,
          budget: body?.budget,
          desiredStartDate: body?.desiredStartDate ?? null,
        })
        return NextResponse.json({ ...result, devPanel: 'pool_available' })
      }

      case 'assign_existing_dev': {
        const result = await publishAssignExistingDev(sb, {
          projectId,
          actorId: user.id,
          devHandle: body?.devHandle,
          devEmail: body?.devEmail,
          budgetNote: body?.budgetNote,
          appBaseUrl,
        })
        return NextResponse.json({ ...result, devPanel: 'proposal' })
      }

      case 'invite_new_dev':
        return NextResponse.json({
          error: 'use_invite_dev_route',
          route: '/api/projects/invite-dev',
        }, { status: 400 })

      case 'team_internal':
        return NextResponse.json({
          error: 'use_assign_team_route',
          route: '/api/projects/assign-team',
        }, { status: 400 })

      default:
        return NextResponse.json({ error: 'unsupported_delivery' }, { status: 400 })
    }
  } catch (e: any) {
    const msg = e?.message || 'publish_failed'
    const status = msg === 'forbidden' ? 403
      : msg === 'project_not_found' || msg === 'dev_not_found' ? 404
      : msg === 'missing_dev_identifier' ? 400
      : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
