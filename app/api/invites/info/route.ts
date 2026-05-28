import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * GET /api/invites/info?token=… — Safe Meta für die Beitritts-Landing.
 *
 * Liefert nur unkritische Felder, damit die Seite zeigen kann, wer wozu
 * einlädt. Kein Auth nötig (der Eingeladene hat ggf. noch kein Konto).
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token') || ''
  if (!token) return NextResponse.json({ ok: false, error: 'missing-token' }, { status: 400 })

  const svc = getServiceClient()
  if (!svc) return NextResponse.json({ ok: false, error: 'service-key-missing' }, { status: 500 })

  const { data: inv } = await svc
    .from('team_invites')
    .select('id,kind,role,email,status,expires_at,invited_by,invited_name,project_id')
    .eq('token', token)
    .maybeSingle()

  if (!inv) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 })

  const expired =
    inv.status !== 'pending' ||
    (inv.expires_at ? new Date(inv.expires_at).getTime() < Date.now() : false)

  // Inviter + project context — best-effort, never throws.
  let inviterName: string | null = null
  let workspaceName: string | null = null
  let projectTitle: string | null = null

  if (inv.invited_by) {
    const { data: prof } = await svc
      .from('profiles').select('full_name').eq('id', inv.invited_by).maybeSingle()
    inviterName = (prof as any)?.full_name ?? null
    const { data: ws } = await svc
      .from('workspaces').select('name')
      .eq('primary_owner_id', inv.invited_by).eq('is_personal', true).maybeSingle()
    workspaceName = (ws as any)?.name ?? null
  }
  if (inv.project_id) {
    const { data: proj } = await svc
      .from('projects').select('title').eq('id', inv.project_id).maybeSingle()
    projectTitle = (proj as any)?.title ?? null
  }

  const kind = (inv.kind as 'contributor' | 'client') || (inv.role === 'client' ? 'client' : 'contributor')

  return NextResponse.json({
    ok: true,
    status: inv.status,
    expired,
    kind,
    email: inv.email ?? null,
    invitedName: inv.invited_name ?? null,
    inviterName,
    workspaceName,
    projectTitle,
  })
}
