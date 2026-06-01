import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import {
  sendProjectAcceptedEmail,
  sendProjectNextStepsEmail,
  sendFestagGuaranteeEmail,
} from '@/lib/email/send'

export const runtime = 'nodejs'

function appBaseUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin ?? 'https://festag.io'
}

/**
 * POST /api/dev/projects/join  { projectId }
 *
 * Auto-accept self-enrollment. The dev clicks "Eintragen" and is
 * immediately on the project — no admin in the loop. We mirror the
 * single-dev `projects.assigned_dev` field when it was still empty so
 * legacy queries that read that column keep working.
 *
 * Failure modes are conservative: missing project, not-a-dev, or
 * already-active assignment all return the existing assignment so the
 * client can render the same animation either way.
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const projectId: string | undefined = body?.projectId
  if (!projectId) return NextResponse.json({ error: 'missing projectId' }, { status: 400 })

  const { data: profile } = await (service as any)
    .from('profiles')
    .select('role,approval_status,full_name,avatar_url,github_avatar_url,github_username,email')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role
  if (role !== 'dev' && role !== 'admin' && role !== 'project_owner') {
    return NextResponse.json({ error: 'not a developer' }, { status: 403 })
  }

  const { data: project } = await (service as any)
    .from('projects')
    .select('id,title,user_id,assigned_dev,color')
    .eq('id', projectId)
    .maybeSingle()
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 })

  const { data: assignment, error: aErr } = await (service as any)
    .from('project_assignments')
    .upsert({
      project_id: projectId,
      user_id: user.id,
      role_on_project: 'developer',
      assigned_by: user.id,
      active: true,
    }, { onConflict: 'project_id,user_id' })
    .select('id,project_id,user_id,role_on_project,active,created_at')
    .single()
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

  // Keep the legacy single-dev column populated when no one's owned it yet.
  if (!project.assigned_dev) {
    await (service as any).from('projects').update({ assigned_dev: user.id }).eq('id', projectId)
  }

  // Audit log + notification to the project owner — calm, non-technical.
  const displayName = profile?.full_name
    || (profile?.github_username ? `@${profile.github_username}` : null)
    || profile?.email
    || 'Ein Developer'

  await (service as any).from('audit_logs').insert({
    actor_id: user.id,
    action: 'project_assignment.self_enroll',
    entity_type: 'project',
    entity_id: projectId,
    metadata: { role_on_project: 'developer' },
  })

  // ── Client fan-out: only on the FIRST acceptance of a Festag-directed
  //    project. We guard on the legacy single-dev column having just been
  //    claimed above, so re-joins or multi-dev pools don't re-celebrate.
  const isFirstAccept = !project.assigned_dev
  const clientId: string | null = project.user_id && project.user_id !== user.id ? project.user_id : null
  const devAvatar = profile?.avatar_url || profile?.github_avatar_url || null
  const projectTitle: string = project.title || 'Dein Projekt'

  if (clientId) {
    // Celebration trigger — the client's dashboard reads the newest unread
    // notification of this kind and plays the dev-photo + Tagro animation.
    await (service as any).from('notifications').insert({
      user_id: clientId,
      project_id: projectId,
      audience: 'client',
      kind: 'dev_accepted',
      type: 'dev_accepted',
      title: 'Dein Projekt hat einen Entwickler',
      body: `${displayName} übernimmt „${projectTitle}".`,
      message: `${displayName} übernimmt „${projectTitle}".`,
      read: false,
      payload: {
        dev_id: user.id,
        dev_name: displayName,
        dev_avatar: devAvatar,
        project_id: projectId,
        project_title: projectTitle,
        project_color: project.color || '#5B647D',
        celebrate: true,
      },
    })

    if (isFirstAccept) {
      const base = appBaseUrl(req)
      const projectUrl = `${base}/project/${projectId}`
      const guaranteeUrl = `${base}/docs/festag-garantie`

      // Three structured inbox items — accepted, next steps, Tagro intro —
      // mirrored by three emails, plus the Festag-Garantie note. All
      // best-effort; the assignment itself already succeeded.
      const mkItem = (sourceId: string, category: string, type: string, title: string, body: string, extra: Record<string, unknown> = {}) =>
        (service as any).rpc('create_inbox_item', {
          p_user_id: clientId,
          p_project_id: projectId,
          p_category: category,
          p_type: type,
          p_title: title,
          p_body: body,
          p_actor_id: user.id,
          p_source_table: 'dev_accepted',
          p_source_id: `${projectId}:${sourceId}`,
          p_metadata: { thread_title: projectTitle, source_label: 'Festag', ...extra },
        })

      // Client display name for the emails.
      const { data: clientProfile } = await (service as any)
        .from('profiles')
        .select('email,first_name,full_name')
        .eq('id', clientId)
        .maybeSingle()
      const clientEmail: string | null = clientProfile?.email ?? null
      const clientName: string | null =
        (clientProfile?.first_name as string | null)?.trim() ||
        ((clientProfile?.full_name as string | null)?.trim().split(/\s+/)[0] ?? null)

      await Promise.allSettled([
        mkItem('accepted', 'project', 'project_event',
          'Dein Projekt ist startklar',
          `${displayName} hat „${projectTitle}" angenommen und beginnt mit der Umsetzung. Tagro begleitet jeden Schritt für dich — verständlich, ohne Fachjargon.`,
          { cta_label: 'Projekt öffnen', cta_url: projectUrl }),
        mkItem('next-steps', 'project', 'project_event',
          'So geht es jetzt weiter',
          `Tagro strukturiert das Briefing in klare Schritte. Du musst nichts Technisches lesen — du bekommst ruhige Statusberichte, sobald es etwas Neues gibt.`,
          { cta_label: 'Projekt öffnen', cta_url: projectUrl }),
        mkItem('tagro-intro', 'system', 'system_event',
          'Tagro ist für dich da',
          `Fragen zum Projekt? Stell sie jederzeit im Tagro-Chat des Projekts. Tagro übersetzt zwischen dir und dem Entwickler und hält dich ruhig auf dem Laufenden.`),
        mkItem('guarantee', 'system', 'system_event',
          'Die Festag-Garantie',
          `Jedes Festag-Projekt ist durch die Festag-Garantie abgesichert: geprüfte Arbeit, klare Verantwortlichkeit und ein verlässlicher Ablauf. Die Details findest du im verlinkten Artikel.`,
          { cta_label: 'Garantie ansehen', cta_url: guaranteeUrl }),
      ])

      if (clientEmail) {
        await Promise.allSettled([
          sendProjectAcceptedEmail({ to: clientEmail, clientName, projectTitle, devName: displayName, projectUrl }),
          sendProjectNextStepsEmail({ to: clientEmail, clientName, projectTitle, projectUrl }),
          sendFestagGuaranteeEmail({ to: clientEmail, clientName, projectTitle, docUrl: guaranteeUrl }),
        ])
      }
    }
  }

  return NextResponse.json({
    ok: true,
    assignment,
    project: { id: project.id, title: project.title },
    dev: {
      id: user.id,
      name: displayName,
      avatar: profile?.avatar_url || profile?.github_avatar_url || null,
    },
  })
}
