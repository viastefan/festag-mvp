import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from '@/lib/supabase/server'
import { ensureProjectAccess } from '@/lib/tagro/task-actions'
import {
  buildFeatureProposal,
  expandFeatureProposalFromDecision,
  looksLikeFeatureIdea,
  offerFeatureProposal,
  resolvePrimaryProjectId,
} from '@/lib/tagro/feature-proposal'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function serviceClient(fallback: any) {
  return SERVICE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : fallback
}

/**
 * POST /api/tagro/feature-proposal
 *
 * Scenario 1 — Client idea → Feature proposal → Action Card → Tasks.
 *
 * body.action:
 *   - "propose"  → heuristic proposal only (no writes)
 *   - "offer"    → create/refresh scope decision + store work items (default)
 *   - "confirm"  → expand decision into developer tasks
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || 'offer').trim() as 'propose' | 'offer' | 'confirm'
    const clientText = String(body.text || body.description || body.clientText || '').trim()
    const decisionId = String(body.decisionId || body.decision_id || '').trim()

    const cookieClient = createCookieClient()
    const {
      data: { user },
    } = await cookieClient.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    const sb = serviceClient(cookieClient)

    let projectId = String(body.projectId || body.project_id || '').trim()
    if (!projectId) {
      projectId = (await resolvePrimaryProjectId(sb as any, user.id)) || ''
    }
    if (!projectId) {
      return NextResponse.json({ ok: false, error: 'project_id_required' }, { status: 400 })
    }

    await ensureProjectAccess(sb as any, projectId, user.id)

    if (action === 'propose') {
      if (!clientText) {
        return NextResponse.json({ ok: false, error: 'text_required' }, { status: 400 })
      }
      const proposal = buildFeatureProposal(clientText)
      return NextResponse.json({
        ok: true,
        action: 'propose',
        isFeatureIdea: looksLikeFeatureIdea(clientText),
        proposal,
        projectId,
      })
    }

    if (action === 'confirm') {
      if (!decisionId) {
        return NextResponse.json({ ok: false, error: 'decision_id_required' }, { status: 400 })
      }
      const created = await expandFeatureProposalFromDecision({
        sb: sb as any,
        actorId: user.id,
        decisionId,
        projectId,
      })
      return NextResponse.json({
        ok: true,
        action: 'confirm',
        projectId,
        decisionId,
        created,
      })
    }

    // offer
    if (!clientText) {
      return NextResponse.json({ ok: false, error: 'text_required' }, { status: 400 })
    }
    if (!looksLikeFeatureIdea(clientText) && body.force !== true) {
      return NextResponse.json({
        ok: false,
        error: 'not_a_feature_idea',
        isFeatureIdea: false,
      }, { status: 422 })
    }

    const offered = await offerFeatureProposal({
      sb: sb as any,
      actorId: user.id,
      projectId,
      clientText,
    })

    return NextResponse.json({
      ok: true,
      action: 'offer',
      projectId,
      proposal: offered.proposal,
      decisionId: offered.decisionId,
      decisionTitle: offered.decisionTitle,
      created: offered.created,
      card: {
        id: offered.decisionId,
        title: offered.proposal.action_label,
        hint: offered.proposal.action_hint,
        primaryLabel: offered.proposal.action_label,
        secondaryLabel: 'Mehr erfahren',
        laterLabel: 'Später',
        responseType: 'binary',
        variant: 'feature',
      },
    })
  } catch (error: any) {
    const message = error?.message || 'feature_proposal_failed'
    const status =
      message === 'project_access_denied'
        ? 403
        : message.startsWith('feature_offer_skipped')
          ? 409
          : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
