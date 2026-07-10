import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createAgencyDocument } from '@/lib/documents/create-document'
import { userCanAccessProjectDocuments } from '@/lib/documents/project-access'
import { getDocTemplate, type DocKind } from '@/lib/documents/templates'

export const runtime = 'nodejs'

async function devUser(req: Request) {
  const supa = createClient()
  const { data: { user: cookieUser } } = await supa.auth.getUser()
  return cookieUser ?? getDevUserFromRequest(req)
}

async function devProjects(sb: any, userId: string) {
  const { data: assignments } = await sb
    .from('project_assignments')
    .select('project_id, projects(id,title,color,workspace_id,client_id)')
    .eq('user_id', userId)
    .eq('active', true)

  const fromAssignments = ((assignments as any[]) ?? [])
    .map((a) => a.projects)
    .filter(Boolean)

  const { data: assigned } = await sb
    .from('projects')
    .select('id,title,color,workspace_id,client_id')
    .eq('assigned_dev', userId)

  const map = new Map<string, any>()
  for (const p of [...fromAssignments, ...((assigned as any[]) ?? [])]) {
    if (p?.id) map.set(p.id, p)
  }
  return Array.from(map.values())
}

/** GET /api/dev/documents?projectId= — dev project documents */
export async function GET(req: Request) {
  const user = await devUser(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const supa = createClient()
  const projectId = new URL(req.url).searchParams.get('projectId')
  const projects = await devProjects(supa as any, user.id)
  const projectIds = projects.map((p: any) => p.id)

  if (!projectIds.length) {
    return NextResponse.json({ projects: [], documents: [] })
  }

  const filterIds = projectId ? [projectId] : projectIds
  const { data: docs } = await (supa as any).from('agency_documents')
    .select('id,kind,number_label,title,status,total_cents,currency,client_id,project_id,created_at,data,brand_snapshot,projects(title)')
    .in('project_id', filterIds)
    .order('created_at', { ascending: false })

  return NextResponse.json({ projects, documents: docs ?? [] })
}

/** POST /api/dev/documents — create document for an assigned project */
export async function POST(req: NextRequest) {
  const user = await devUser(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const kind = body?.kind as DocKind
  const projectId = body?.project_id as string
  if (!getDocTemplate(kind) || !projectId) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supa = createClient()
  const access = await userCanAccessProjectDocuments(supa as any, user.id, projectId)
  if (!access.ok || !access.workspaceId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const doc = await createAgencyDocument(supa as any, user.id, {
      kind,
      workspaceId: access.workspaceId,
      clientId: body?.client_id || null,
      projectId,
      title: body?.title || null,
      data: body?.data ?? {},
    })
    return NextResponse.json({ document: doc })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'create_failed' }, { status: 403 })
  }
}
