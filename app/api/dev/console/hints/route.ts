import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { buildHints } from '@/lib/dev-console'

export const runtime = 'nodejs'

/** GET /api/dev/console/hints?projectId= — composer suggestion chips. */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const projectId = new URL(req.url).searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const sb = (getServiceClient() ?? supa) as any
  const hints = await buildHints(sb, { projectId, developerId: user.id })
  return NextResponse.json({ hints })
}
