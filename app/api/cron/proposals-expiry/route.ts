import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  const sb = service as any

  const { data: expired, error } = await sb
    .from('project_proposals')
    .update({ status: 'expired' })
    .in('status', ['proposed', 'budget_clarification'])
    .lt('expires_at', new Date().toISOString())
    .not('expires_at', 'is', null)
    .select('id,project_id,dev_id')

  const { data: expiredInvites } = await sb
    .from('dev_invitations')
    .update({ status: 'expired' })
    .eq('status', 'awaiting_confirmation')
    .lt('expires_at', new Date().toISOString())
    .select('id')

  return NextResponse.json({
    ok: true,
    expired_proposals: expired?.length ?? 0,
    expired_invitations: expiredInvites?.length ?? 0,
  })
}
