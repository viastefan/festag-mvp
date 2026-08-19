import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reachablePeopleIds } from '@/lib/platform/resolve-person'

export const runtime = 'nodejs'

/**
 * GET /api/people/reachable?q=
 *
 * The people you may hand work to — members of your workspaces, plus owners
 * and clients of your projects. Scoped on purpose: without it this would be a
 * searchable directory of every account in the system.
 *
 * Powers the person field when asking someone a question, so nobody has to
 * know a UUID or spell an email exactly.
 */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const q = (new URL(req.url).searchParams.get('q') || '').trim().toLowerCase().replace(/^@/, '')

  const ids = await reachablePeopleIds(supa as any, user.id)
  if (ids.length === 0) return NextResponse.json({ people: [] })

  const { data: rows } = await (supa as any)
    .from('profiles')
    .select('id, email, full_name, first_name, last_name, dev_username')
    .in('id', ids)

  const people = ((rows ?? []) as any[]).map(p => ({
    id: p.id,
    label: p.full_name?.trim()
      || [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
      || p.dev_username
      || p.email
      || 'Unbekannt',
    email: p.email ?? null,
    username: p.dev_username ?? null,
  }))

  const filtered = q
    ? people.filter(p =>
        p.label.toLowerCase().includes(q)
        || (p.username || '').toLowerCase().includes(q)
        || (p.email || '').toLowerCase().includes(q))
    : people

  // Two people can share a name — surface what tells them apart so the picker
  // never forces a coin flip. (Both test accounts are "Stefan Dirnberger".)
  const nameCounts = new Map<string, number>()
  for (const p of filtered) nameCounts.set(p.label, (nameCounts.get(p.label) ?? 0) + 1)

  return NextResponse.json({
    people: filtered.slice(0, 20).map(p => ({
      ...p,
      needsDisambiguation: (nameCounts.get(p.label) ?? 0) > 1,
    })),
  })
}
