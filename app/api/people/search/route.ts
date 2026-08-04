import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * GET /api/people/search?q=
 * Search Festag accounts by @username (dev_username) or name — for project invites.
 */
export async function GET(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const url = new URL(req.url)
  const raw = String(url.searchParams.get('q') || '').trim()
  const q = raw.replace(/^@+/, '').trim()
  if (q.length < 2) {
    return NextResponse.json({ people: [] })
  }

  const service = getServiceClient() || supabase
  const safe = q.replace(/[%_,]/g, '')
  const pattern = `%${safe}%`

  const { data: byUser } = await service
    .from('profiles')
    .select('id, full_name, first_name, last_name, email, dev_username, avatar_url, profile_photo_url')
    .ilike('dev_username', pattern)
    .neq('id', user.id)
    .limit(8)

  const { data: byName } = await service
    .from('profiles')
    .select('id, full_name, first_name, last_name, email, dev_username, avatar_url, profile_photo_url')
    .or(`full_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
    .neq('id', user.id)
    .limit(8)

  const merged = new Map<string, any>()
  for (const row of [...(byUser || []), ...(byName || [])]) {
    if (row?.id) merged.set(row.id, row)
  }

  const people = Array.from(merged.values()).slice(0, 8).map((row: any) => {
    const username = typeof row.dev_username === 'string' ? row.dev_username.trim() : ''
    const name =
      (typeof row.full_name === 'string' && row.full_name.trim()) ||
      [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
      username ||
      (typeof row.email === 'string' ? row.email.split('@')[0] : 'Nutzer')
    return {
      id: row.id as string,
      username: username || null,
      name,
      email: typeof row.email === 'string' ? row.email : null,
      avatarUrl: row.avatar_url || row.profile_photo_url || null,
    }
  })

  return NextResponse.json({ people })
}
