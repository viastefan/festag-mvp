import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listJiraProjectsForAuth } from '@/lib/connectors/jira'
import type { JiraAuth } from '@/lib/jira/api'

export const runtime = 'nodejs'

async function resolveJiraAuth(supa: any, userId: string): Promise<JiraAuth | null> {
  const { data: conn } = await supa
    .from('user_connectors')
    .select('config,status')
    .eq('user_id', userId)
    .eq('connector_id', 'jira')
    .maybeSingle()

  if ((conn as any)?.status !== 'connected') {
    if (process.env.JIRA_SITE && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN) {
      return {
        site: process.env.JIRA_SITE,
        email: process.env.JIRA_EMAIL,
        token: process.env.JIRA_API_TOKEN,
      }
    }
    return null
  }

  const cfg = (conn as any)?.config ?? {}
  if (!cfg.site || !cfg.email || !cfg.token) return null
  return { site: cfg.site, email: cfg.email, token: cfg.token }
}

/** GET /api/jira/projects */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const auth = await resolveJiraAuth(supa, user.id)
  if (!auth) return NextResponse.json({ error: 'jira_not_connected' }, { status: 400 })

  try {
    const projects = await listJiraProjectsForAuth(auth)
    return NextResponse.json({ projects, site: auth.site })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'jira_projects_failed' }, { status: 502 })
  }
}
