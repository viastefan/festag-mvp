import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { deliverAgencyDocument } from '@/lib/documents/deliver'
import { resolveDocBrand } from '@/lib/documents/create-document'
import { buildDocumentPatch } from '@/lib/documents/update-document'
import { loadDocumentEditorContext } from '@/lib/documents/editor-context'
import { createRouteHandlerClient, getRouteUser } from '@/lib/supabase/route-handler'

export const runtime = 'nodejs'

/** GET one document + PATCH content or status. */

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createRouteHandlerClient(req)
  const user = await getRouteUser(req)
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  const { data } = await (supa as any).from('agency_documents')
    .select('*, projects(title), agency_clients(name, primary_contact_name, primary_contact_email, primary_contact_phone)')
    .eq('id', ctx.params.id)
    .maybeSingle()
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const context = await loadDocumentEditorContext(
    supa,
    user.id,
    user.email ?? '',
    (data as { workspace_id?: string }).workspace_id,
  )

  return NextResponse.json({
    document: data,
    issuer: context.issuer,
    clients: context.clients,
    projects: context.projects,
  })
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createRouteHandlerClient(req)
  const user = await getRouteUser(req)
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  const body = await req.json().catch(() => ({} as any))

  const { data: existing } = await (supa as any).from('agency_documents')
    .select('id,kind,data,status,project_id,number_label,workspace_id')
    .eq('id', ctx.params.id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  let patch: Record<string, unknown>
  try {
    patch = buildDocumentPatch(existing, {
      data: body?.data,
      clientId: body?.client_id,
      projectId: body?.project_id,
      title: body?.title,
      numberLabel: body?.number_label,
      status: body?.status,
      markSigned: body?.mark_signed === true,
      markAccepted: body?.mark_accepted === true,
    })
  } catch (e: any) {
    const code = e?.message
    if (code === 'document_locked') {
      return NextResponse.json({ error: 'Gesendete oder bezahlte Dokumente können nicht mehr bearbeitet werden.' }, { status: 400 })
    }
    if (code === 'not_a_contract') {
      return NextResponse.json({ error: 'Nur Verträge können unterschrieben werden.' }, { status: 400 })
    }
    if (code === 'not_an_offer') {
      return NextResponse.json({ error: 'Nur Angebote können als angenommen markiert werden.' }, { status: 400 })
    }
    if (code === 'not_sent') {
      return NextResponse.json({ error: 'Dokument muss zuerst gesendet sein.' }, { status: 400 })
    }
    if (code === 'already_signed') {
      return NextResponse.json({ error: 'Vertrag ist bereits als unterschrieben markiert.' }, { status: 400 })
    }
    if (code === 'already_accepted') {
      return NextResponse.json({ error: 'Angebot ist bereits als angenommen markiert.' }, { status: 400 })
    }
    if (code === 'bad_status' || code === 'bad_request') {
      return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
    }
    throw e
  }

  // Keep PDF brand in sync with live issuer data whenever content is saved.
  if (patch.data && existing.workspace_id) {
    try {
      patch.brand_snapshot = await resolveDocBrand(supa, existing.workspace_id)
    } catch {
      /* keep previous snapshot if brand resolve fails */
    }
  }

  const wasSent = existing.status === 'sent'

  const { data, error } = await (supa as any).from('agency_documents')
    .update(patch).eq('id', ctx.params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })

  if (patch.status === 'sent' && !wasSent) {
    const service = getServiceClient()
    if (service) {
      await deliverAgencyDocument(service as any, data, user.id).catch(() => {})
    }
  }

  return NextResponse.json({ document: data })
}
