import type { SupabaseClient } from '@supabase/supabase-js'
import {
  sendProjectAcceptedEmail,
  sendProjectNextStepsEmail,
  sendFestagGuaranteeEmail,
} from '@/lib/email/send'

export async function fanOutProposalAccepted(opts: {
  sb: SupabaseClient<any>
  projectId: string
  projectTitle: string
  devId: string
  devDisplayName: string
  devAvatar: string | null
  clientId: string
  projectColor?: string
  baseUrl: string
}) {
  const { sb, projectId, projectTitle, devId, devDisplayName, devAvatar, clientId, projectColor, baseUrl } = opts
  const writer = sb as any

  const projectUrl = `${baseUrl}/project/${projectId}`
  const guaranteeUrl = `${baseUrl}/docs/festag-garantie`

  await writer.from('notifications').insert({
    user_id: clientId,
    project_id: projectId,
    audience: 'client',
    kind: 'dev_accepted',
    type: 'dev_accepted',
    title: 'Dein Projekt hat einen Entwickler',
    body: `${devDisplayName} übernimmt „${projectTitle}".`,
    message: `${devDisplayName} übernimmt „${projectTitle}".`,
    read: false,
    payload: {
      dev_id: devId,
      dev_name: devDisplayName,
      dev_avatar: devAvatar,
      project_id: projectId,
      project_title: projectTitle,
      project_color: projectColor || '#5B647D',
      celebrate: true,
    },
  })

  const mkItem = (sourceId: string, category: string, type: string, title: string, body: string, extra: Record<string, unknown> = {}) =>
    writer.rpc('create_inbox_item', {
      p_user_id: clientId,
      p_project_id: projectId,
      p_category: category,
      p_type: type,
      p_title: title,
      p_body: body,
      p_actor_id: devId,
      p_source_table: 'dev_accepted',
      p_source_id: `${projectId}:${sourceId}`,
      p_metadata: { thread_title: projectTitle, source_label: 'Festag', ...extra },
    })

  const { data: clientProfile } = await writer
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
      `${devDisplayName} hat „${projectTitle}" angenommen und beginnt mit der Umsetzung. Tagro begleitet jeden Schritt für dich — verständlich, ohne Fachjargon.`,
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
      `Jedes Festag-Projekt ist durch die Festag-Garantie abgesichert: geprüfte Arbeit, klare Verantwortlichkeit und ein verlässlicher Ablauf.`,
      { cta_label: 'Garantie ansehen', cta_url: guaranteeUrl }),
  ])

  if (clientEmail) {
    await Promise.allSettled([
      sendProjectAcceptedEmail({ to: clientEmail, clientName, projectTitle, devName: devDisplayName, projectUrl }),
      sendProjectNextStepsEmail({ to: clientEmail, clientName, projectTitle, projectUrl }),
      sendFestagGuaranteeEmail({ to: clientEmail, clientName, projectTitle, docUrl: guaranteeUrl }),
    ])
  }
}
