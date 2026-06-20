import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** GET /api/linear/links — active Linear team ↔ project links for the user. */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: links, error } = await (supa as any)
    .from('linear_project_links')
    .select('id,project_id,team_id,team_key,team_name,last_synced_at,last_sync_status,active,projects(title)')
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const normalized = ((links as any[]) ?? []).map(row => ({
    id: row.id,
    project_id: row.project_id,
    project_title: row.projects?.title ?? 'Projekt',
    team_id: row.team_id,
    team_key: row.team_key,
    team_name: row.team_name,
    last_synced_at: row.last_synced_at,
    last_sync_status: row.last_sync_status,
  }))

  return NextResponse.json({ links: normalized })
}
