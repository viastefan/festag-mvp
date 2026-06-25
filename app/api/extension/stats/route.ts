import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getExtensionStats } from '@/lib/extension/stats'

export const runtime = 'nodejs'

export async function GET() {
  const sb = createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const stats = await getExtensionStats(user.id)
  return NextResponse.json({ ok: true, stats })
}
