import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { deliverAgencyDocument } from '@/lib/documents/deliver'
import { buildDocumentPatch } from '@/lib/documents/update-document'
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
  return NextResponse.json({ document: data })
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createRouteHandlerClient(req)
  const user = await getRouteUser(req)
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  const body = await req.json().catch(() => ({} as any))

  const { data: existing } = await (supa as any).from('agency_documents')
    .select('id,kind,data,status,project_id,number_label')
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
      status: body?.status,
      markSigned: body?.mark_signed === true,
    })
  } catch (e: any) {
    const code = e?.message
    if (code === 'document_locked') {
      return NextResponse.json({ error: 'Gesendete oder bezahlte Dokumente können nicht mehr bearbeitet werden.' }, { status: 400 })
    }
    if (code === 'not_a_contract') {
      return NextResponse.json({ error: 'Nur Verträge können unterschrieben werden.' }, { status: 400 })
    }
    if (code === 'bad_status' || code === 'bad_request') {
      return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
    }
    throw e
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
