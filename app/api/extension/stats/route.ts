import { NextRequest, NextResponse } from 'next/server'
import { getExtensionUser } from '@/lib/extension/session'
import { getExtensionStats } from '@/lib/extension/stats'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const stats = await getExtensionStats(user.id)
  return NextResponse.json({ ok: true, stats })
}
