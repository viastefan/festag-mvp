// ─────────────────────────────────────────────────────────────────────────────
// Resolving a person by what you would actually type
//
// Assigning work should not require a UUID. People know each other by username,
// by email, or by name — so that is what the resolver accepts.
//
// It is deliberately scoped: you can only resolve people you already share a
// workspace or a project with. Without that scope this endpoint would be a
// directory of every account in the system, searchable by anyone with a login.
// ─────────────────────────────────────────────────────────────────────────────

export type ResolvedPerson = {
  id: string
  label: string
  email: string | null
  username: string | null
  /** How the match was made — shown when several people match. */
  matchedOn: 'username' | 'email' | 'name'
}

export type ResolveOutcome =
  | { status: 'found'; person: ResolvedPerson }
  | { status: 'ambiguous'; candidates: ResolvedPerson[] }
  | { status: 'not_found' }

function labelFor(p: any): string {
  return p.full_name?.trim()
    || [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
    || p.dev_username
    || p.email
    || 'Unbekannt'
}

/**
 * Everyone the caller may legitimately hand work to: members of their
 * workspaces, plus owners and clients of projects they belong to.
 */
export async function reachablePeopleIds(supa: any, meId: string): Promise<string[]> {
  const ids = new Set<string>()

  const { data: myWorkspaces } = await supa
    .from('workspace_members').select('workspace_id').eq('user_id', meId)
  const wsIds = (myWorkspaces ?? []).map((w: any) => w.workspace_id).filter(Boolean)

  if (wsIds.length) {
    const { data: peers } = await supa
      .from('workspace_members').select('user_id').in('workspace_id', wsIds)
    for (const p of peers ?? []) if (p.user_id) ids.add(p.user_id)
  }

  // Projects reach further than workspaces: a client often has no workspace
  // membership but is very much someone you hand work to.
  const { data: myProjects } = await supa
    .from('projects').select('id,user_id,client_id')
    .or(`user_id.eq.${meId},client_id.eq.${meId}`)
  for (const p of myProjects ?? []) {
    if (p.user_id) ids.add(p.user_id)
    if (p.client_id) ids.add(p.client_id)
  }

  const { data: memberships } = await supa
    .from('project_members').select('project_id').eq('user_id', meId)
  const projIds = (memberships ?? []).map((m: any) => m.project_id).filter(Boolean)
  if (projIds.length) {
    const { data: mates } = await supa
      .from('project_members').select('user_id').in('project_id', projIds)
    for (const m of mates ?? []) if (m.user_id) ids.add(m.user_id)
    const { data: owners } = await supa
      .from('projects').select('user_id,client_id').in('id', projIds)
    for (const o of owners ?? []) {
      if (o.user_id) ids.add(o.user_id)
      if (o.client_id) ids.add(o.client_id)
    }
  }

  ids.delete(meId)
  return Array.from(ids)
}

/** Find one person by username, email or name — within reach only. */
export async function resolvePerson(
  supa: any,
  meId: string,
  query: string,
): Promise<ResolveOutcome> {
  const q = query.trim()
  if (!q) return { status: 'not_found' }

  const reachable = await reachablePeopleIds(supa, meId)
  if (reachable.length === 0) return { status: 'not_found' }

  const { data: rows } = await supa
    .from('profiles')
    .select('id, email, full_name, first_name, last_name, dev_username')
    .in('id', reachable)

  const people = (rows ?? []) as any[]
  const needle = q.toLowerCase().replace(/^@/, '')

  const exactUsername = people.filter(p => (p.dev_username || '').toLowerCase() === needle)
  const exactEmail = people.filter(p => (p.email || '').toLowerCase() === needle)
  if (exactUsername.length === 1) {
    return { status: 'found', person: toPerson(exactUsername[0], 'username') }
  }
  if (exactEmail.length === 1) {
    return { status: 'found', person: toPerson(exactEmail[0], 'email') }
  }

  // Fall back to a contains match on name — several hits stay ambiguous rather
  // than picking one, because sending work to the wrong person is expensive.
  const byName = people.filter(p => labelFor(p).toLowerCase().includes(needle))
  if (byName.length === 1) return { status: 'found', person: toPerson(byName[0], 'name') }
  if (byName.length > 1) {
    return { status: 'ambiguous', candidates: byName.slice(0, 8).map(p => toPerson(p, 'name')) }
  }
  return { status: 'not_found' }
}

function toPerson(p: any, matchedOn: ResolvedPerson['matchedOn']): ResolvedPerson {
  return {
    id: p.id,
    label: labelFor(p),
    email: p.email ?? null,
    username: p.dev_username ?? null,
    matchedOn,
  }
}
