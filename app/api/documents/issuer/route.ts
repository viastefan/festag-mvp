import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  EMPTY_ISSUER,
  issuerAddressBlock,
  issuerFromBrandingRow,
  issuerFromProfileRow,
  isIssuerReady,
  type InvoiceIssuer,
} from '@/lib/documents/issuer'

export const runtime = 'nodejs'

async function getUser(supa: ReturnType<typeof createClient>) {
  const { data: { session } } = await supa.auth.getSession()
  if (session?.user) return session.user
  const { data: { user } } = await supa.auth.getUser()
  return user
}

export async function GET() {
  const supa = createClient()
  const user = await getUser(supa)
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { data: ws } = await supa
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', user.id)
    .eq('is_personal', true)
    .maybeSingle()

  const wsId = (ws as { id?: string } | null)?.id ?? null

  const { data: profile } = await supa
    .from('profiles')
    .select('full_name,email,phone,company_name,company_address,company_city,company_zip,company_country,vat_number,tax_number,invoice_iban,invoice_bic')
    .eq('id', user.id)
    .maybeSingle()

  let branding: Record<string, unknown> | null = null
  if (wsId) {
    const { data } = await (supa as any).from('workspace_branding')
      .select('invoice_company_name,invoice_company_address,invoice_iban,invoice_bic,invoice_vat_id,mail_from,invoice_footer')
      .eq('workspace_id', wsId)
      .maybeSingle()
    branding = data as Record<string, unknown> | null
  }

  const issuer = wsId
    ? issuerFromBrandingRow(branding, issuerFromProfileRow(profile as Record<string, unknown>, user.email ?? ''))
    : issuerFromProfileRow(profile as Record<string, unknown>, user.email ?? '')

  let countQuery = (supa as any).from('agency_documents')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'rechnung')
  if (wsId) countQuery = countQuery.eq('workspace_id', wsId)
  const { count } = await countQuery

  return NextResponse.json({
    issuer,
    workspaceId: wsId,
    ready: isIssuerReady(issuer),
    invoiceCount: count ?? 0,
  })
}

export async function PATCH(req: NextRequest) {
  const supa = createClient()
  const user = await getUser(supa)
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const body = await req.json().catch(() => ({} as Partial<InvoiceIssuer>))
  const issuer: InvoiceIssuer = { ...EMPTY_ISSUER, ...body }

  const { data: ws } = await supa
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', user.id)
    .eq('is_personal', true)
    .maybeSingle()

  const wsId = (ws as { id?: string } | null)?.id
  if (!wsId) return NextResponse.json({ error: 'Kein Workspace gefunden' }, { status: 400 })

  const addressBlock = issuerAddressBlock(issuer)

  const { error: profileError } = await supa.from('profiles').update({
    company_name: issuer.name.trim() || null,
    company_address: issuer.addressLine.trim() || null,
    company_zip: issuer.zip.trim() || null,
    company_city: issuer.city.trim() || null,
    company_country: issuer.country.trim() || null,
    phone: issuer.phone.trim() || null,
    vat_number: issuer.vatId.trim() || null,
    tax_number: issuer.taxNumber.trim() || null,
    invoice_iban: issuer.iban.trim() || null,
    invoice_bic: issuer.bic.trim() || null,
  }).eq('id', user.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const { error: brandingError } = await (supa as any).from('workspace_branding').upsert({
    workspace_id: wsId,
    invoice_company_name: issuer.name.trim() || null,
    invoice_company_address: addressBlock || null,
    invoice_iban: issuer.iban.trim() || null,
    invoice_bic: issuer.bic.trim() || null,
    invoice_vat_id: issuer.vatId.trim() || issuer.taxNumber.trim() || null,
    mail_from: issuer.email.trim() || user.email || null,
    invoice_footer: issuer.bankName.trim() || null,
  }, { onConflict: 'workspace_id' })

  if (brandingError) {
    return NextResponse.json({ error: brandingError.message }, { status: 500 })
  }

  const savedIssuer = issuerFromBrandingRow({
    invoice_company_name: issuer.name.trim() || null,
    invoice_company_address: addressBlock || null,
    invoice_iban: issuer.iban.trim() || null,
    invoice_bic: issuer.bic.trim() || null,
    invoice_vat_id: issuer.vatId.trim() || issuer.taxNumber.trim() || null,
    mail_from: issuer.email.trim() || user.email || null,
    invoice_footer: issuer.bankName.trim() || null,
  }, issuerFromProfileRow({
    company_name: issuer.name.trim() || null,
    company_address: issuer.addressLine.trim() || null,
    company_zip: issuer.zip.trim() || null,
    company_city: issuer.city.trim() || null,
    company_country: issuer.country.trim() || null,
    phone: issuer.phone.trim() || null,
    vat_number: issuer.vatId.trim() || null,
    tax_number: issuer.taxNumber.trim() || null,
    invoice_iban: issuer.iban.trim() || null,
    invoice_bic: issuer.bic.trim() || null,
  }, user.email ?? ''))

  return NextResponse.json({ issuer: savedIssuer, ready: isIssuerReady(savedIssuer) })
}
