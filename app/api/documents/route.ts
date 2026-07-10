import { NextRequest, NextResponse } from 'next/server'
import { createAgencyDocument } from '@/lib/documents/create-document'
import { getDocTemplate, type DocKind } from '@/lib/documents/templates'
import { createRouteHandlerClient, getRouteUser } from '@/lib/supabase/route-handler'

export const runtime = 'nodejs'

/**
 * Agency documents (Angebot / Vertrag / Rechnung).
 *   GET  → list documents the user can see (RLS-scoped to their workspace)
 *   POST { kind, workspace_id, client_id?, project_id?, title?, data }
 */

export async function GET(req: NextRequest) {
  const supa = createRouteHandlerClient(req)
  const user = await getRouteUser(req)
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet. Bitte Seite neu laden oder erneut anmelden.' }, { status: 401 })
  const { data } = await (supa as any).from('agency_documents')
    .select('id,kind,number_label,title,status,total_cents,currency,client_id,project_id,created_at,data,brand_snapshot,projects(title),agency_clients(name)')
    .order('created_at', { ascending: false })
  return NextResponse.json({ documents: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supa = createRouteHandlerClient(req)
  const user = await getRouteUser(req)
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet. Bitte Seite neu laden oder erneut anmelden.' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const kind = body?.kind as DocKind
  const workspaceId = body?.workspace_id as string
  if (!getDocTemplate(kind) || !workspaceId) {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  try {
    const doc = await createAgencyDocument(supa as any, user.id, {
      kind,
      workspaceId,
      clientId: body?.client_id || null,
      projectId: body?.project_id || null,
      title: body?.title || null,
      data: body?.data ?? {},
      status: body?.status === 'draft' ? 'draft' : 'final',
    })
    return NextResponse.json({ document: doc })
  } catch (e: any) {
    const msg = e?.message === 'forbidden'
      ? 'Keine Berechtigung für diesen Workspace.'
      : (e?.message || 'Dokument konnte nicht erstellt werden.')
    return NextResponse.json({ error: msg }, { status: 403 })
  }
}
