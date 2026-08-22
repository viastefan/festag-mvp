import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isProjectRole, legacyProfileRoleToProjectRoles, type ProjectRole } from '@/lib/platform/roles'

export const runtime = 'nodejs'

type Person = {
  id: string
  name: string
  handle: string | null
  avatarUrl: string | null
  role: ProjectRole
  isYou: boolean
}

function displayName(p: any, fallback: string): string {
  const full = (p?.full_name || '').trim()
  if (full) return full
  const joined = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim()
  if (joined) return joined
  const email = (p?.email || '').trim()
  if (email) return email.split('@')[0]
  return fallback
}

/**
 * GET /api/projects/[id]/people
 *
 * Who is on this project, with the role they actually hold. project_members is
 * the source; profiles only supplies the name and face. Where a membership row
 * carries a legacy string, it is mapped through the roles SSOT rather than
 * guessed at the component — see lib/platform/roles.ts.
 *
 * Scoped to members of the project: a caller who is not on it gets 403 rather
 * than a directory of strangers.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: members, error } = await (supabase as any)
    .from('project_members')
    .select('user_id,role')
    .eq('project_id', projectId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows: { user_id: string; role: string | null }[] = members ?? []
  if (!rows.some(r => r.user_id === user.id)) {
    const { data: owned } = await (supabase as any)
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!owned) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const ids = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)))
  if (ids.length === 0) return NextResponse.json({ people: [] })

  const { data: profiles } = await (supabase as any)
    .from('profiles')
    .select('id,email,full_name,first_name,last_name,dev_username,avatar_url,role')
    .in('id', ids)

  const byId = new Map<string, any>(((profiles as any[]) ?? []).map(p => [p.id, p]))

  const people: Person[] = rows.map((r) => {
    const p = byId.get(r.user_id)
    const raw = (r.role || '').trim()
    const role: ProjectRole = isProjectRole(raw)
      ? raw
      : (legacyProfileRoleToProjectRoles(raw || p?.role)[0] ?? 'member')
    return {
      id: r.user_id,
      name: displayName(p, 'Unbekannt'),
      handle: p?.dev_username ? `@${p.dev_username}` : (p?.email ?? null),
      avatarUrl: p?.avatar_url ?? null,
      role,
      isYou: r.user_id === user.id,
    }
  })

  /* Counterparts first — the people you do not already are. */
  people.sort((a, b) => Number(a.isYou) - Number(b.isYou) || a.name.localeCompare(b.name))

  return NextResponse.json({ people })
}
