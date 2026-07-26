import type { SupabaseClient } from '@supabase/supabase-js'

export type BriefingDeliveryContent = {
  projectTitle: string
  body: string
  greeting: string
  ctaUrl: string
  spokenIntro: string
}

export async function buildBriefingDeliveryContent(
  sb: SupabaseClient,
  opts: {
    userId: string
    projectId?: string | null
    ownerName?: string
    appOrigin?: string
  },
): Promise<BriefingDeliveryContent> {
  const origin = opts.appOrigin ?? 'https://festag.app'
  const firstName = opts.ownerName?.trim().split(/\s+/)[0]
  const greeting = firstName ? `Hallo ${firstName},` : 'Hallo,'

  let projectTitle = 'Workspace-Briefing'
  let body = ''

  if (opts.projectId) {
    const { data: project } = await sb
      .from('projects')
      .select('id,title,status')
      .eq('id', opts.projectId)
      .maybeSingle()

    if (project) {
      projectTitle = (project as { title: string }).title

      const { data: latest } = await sb
        .from('ai_updates')
        .select('content,created_at')
        .eq('project_id', opts.projectId)
        .in('type', ['status_report', 'daily_summary'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      body = (latest as { content?: string } | null)?.content
        ?? `Für "${projectTitle}" liegt noch kein generierter Statusbericht vor. Sobald Tagro neue Signale erkennt, landet hier eine Zusammenfassung.`
    }
  } else {
    const { data: projs } = await sb
      .from('projects')
      .select('id,title,status')
      .eq('user_id', opts.userId)

    const list = (projs as Array<{ title: string; status?: string }> | null) ?? []
    if (list.length === 0) {
      body = 'In deinem Workspace ist aktuell kein Projekt aktiv.'
    } else {
      body = `Du hast ${list.length} Projekt${list.length === 1 ? '' : 'e'} im Workspace.\n\n`
        + list.slice(0, 8).map((p) => `• ${p.title} — Phase: ${p.status ?? 'unbekannt'}`).join('\n')
    }
  }

  const ctaUrl = opts.projectId
    ? `${origin}/reports?project=${opts.projectId}`
    : `${origin}/reports`

  const spokenIntro = `${greeting} hier ist dein heutiges Briefing zu ${projectTitle}.`

  return { projectTitle, body, greeting, ctaUrl, spokenIntro }
}

export function estimateBriefingDurationSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(45, Math.min(600, Math.round((words / 140) * 60)))
}
