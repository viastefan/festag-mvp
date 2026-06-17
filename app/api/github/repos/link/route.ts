import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/github/repos/link
 * Body: { repoFullName: "owner/name", repoUrl?: string, projectId?: string|null }
 *
 * Verknüpft ein GitHub-Repo mit der aktuellen Dev-User (und optional
 * einem Projekt). Echte Validierung gegen die GitHub-API (existiert
 * das Repo? hat der User Zugriff?) folgt mit dem späteren OAuth-Sync.
 * Diese Route legt nur die Stamm-Verknüpfung an.
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const repoFullName = String(body?.repoFullName || '').trim()
    const repoUrl      = String(body?.repoUrl || '').trim() || `https://github.com/${repoFullName}`
    const projectId    = body?.projectId ? String(body.projectId) : null

    if (!/^[\w.-]+\/[\w.-]+$/.test(repoFullName)) {
      return NextResponse.json({ error: 'invalid_repo_format' }, { status: 400 })
    }
    const [owner, repoName] = repoFullName.split('/')

    // Wenn projectId gesetzt: prüfen, dass der User assigned ist (oder admin).
    if (projectId) {
      const { data: prof } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle()
      const isAdmin = ['admin','project_owner'].includes((prof as any)?.role)
      if (!isAdmin) {
        const { data: assign } = await supabase
          .from('project_assignments')
          .select('id').eq('project_id', projectId).eq('user_id', user.id).eq('active', true).maybeSingle()
        if (!assign) {
          return NextResponse.json({ error: 'not_assigned_to_project' }, { status: 403 })
        }
      }
    }

    const { data, error } = await supabase
      .from('github_repositories')
      .insert({
        project_id: projectId,
        developer_id: user.id,
        owner,
        repo_name: repoName,
        repo_full_name: repoFullName,
        repo_url: repoUrl,
      })
      .select('*').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, repo: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
