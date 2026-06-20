import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listLinearTeamsForToken } from '@/lib/connectors/linear'

export const runtime = 'nodejs'

async function resolveLinearToken(supa: any, userId: string): Promise<string | undefined> {
  const { data: conn } = await supa
    .from('user_connectors')
    .select('config,status')
    .eq('user_id', userId)
    .eq('connector_id', 'linear')
    .maybeSingle()
  if ((conn as any)?.status !== 'connected') return process.env.LINEAR_API_KEY
  return (conn as any)?.config?.token || process.env.LINEAR_API_KEY
}

/** GET /api/linear/teams */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const token = await resolveLinearToken(supa, user.id)
    const teams = await listLinearTeamsForToken(token)
    return NextResponse.json({ teams })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'linear_teams_failed' }, { status: 502 })
  }
}
