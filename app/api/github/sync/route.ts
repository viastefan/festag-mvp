import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncRepository } from '@/lib/github/sync'
import { enrichProjectIssues } from '@/lib/tagro/issue-intelligence'

/**
 * POST /api/github/sync
 * Body (optional): { repoId?: string }   // sync one repo, default = all of mine
 *
 * Token resolution (priority):
 *   1. `github_connections.access_token_encrypted` for the current developer
 *      (treated as plaintext until we add Supabase Vault — see migration note).
 *   2. `process.env.GITHUB_PAT` — falls back for the cron job and for devs
 *      who haven't completed the OAuth handshake yet.
 *
 * Returns a per-repo breakdown so the UI can show what was actually pulled.
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const repoId: string | null = body?.repoId ? String(body.repoId) : null

    // Load repos the user can sync (own + admin sees all)
    const { data: prof } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle()
    const isAdmin = ['admin', 'project_owner'].includes((prof as any)?.role)

    let q = supabase
      .from('github_repositories')
      .select('id,project_id,developer_id,owner,repo_name,repo_full_name,default_branch,last_synced_at,active')
      .eq('active', true)
    if (!isAdmin) q = q.eq('developer_id', user.id)
    if (repoId)   q = q.eq('id', repoId)
    const { data: repos } = await q
    const repoList = ((repos as any[] | null) ?? [])

    if (repoList.length === 0) {
      return NextResponse.json({ ok: true, repos: [], commits: 0, prs: 0, message: 'no_repos_linked' })
    }

    // Resolve token: per-user connection, then env fallback.
    const { data: conn } = await supabase
      .from('github_connections')
      .select('access_token_encrypted')
      .eq('developer_id', user.id).maybeSingle()
    const token = (conn as any)?.access_token_encrypted as string | undefined

    const results = await Promise.all(
      repoList.map((r) => syncRepository(supabase as any, r as any, { token, userId: user.id })),
    )
    const commits = results.reduce((s, r) => s + r.commits, 0)
    const prs     = results.reduce((s, r) => s + r.prs, 0)
    const linked  = results.reduce((s, r) => s + r.linked, 0)
    const issues  = results.reduce((s, r) => s + r.issues, 0)

    const enrich = body?.enrich !== false
    const projectIds = Array.from(new Set(repoList.map(r => r.project_id).filter(Boolean))) as string[]
    let enriched = 0
    if (enrich && projectIds.length > 0) {
      for (const projectId of projectIds) {
        try {
          const r = await enrichProjectIssues(supabase as any, projectId)
          enriched += r.updated
        } catch { /* best-effort */ }
      }
    }

    try {
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'github_sync_run',
        entity_type: 'github',
        metadata: { repo_count: repoList.length, commits, prs, linked, issues, enriched, errors: results.filter(r => r.error).length },
      })
    } catch { /* audit best-effort */ }

    return NextResponse.json({
      ok: true,
      repos: results,
      commits,
      prs,
      linked,
      issues,
      enriched,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
