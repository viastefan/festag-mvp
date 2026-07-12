import { NextRequest, NextResponse } from 'next/server'
import {
  EMPTY_ISSUER,
  issuerAddressBlock,
  issuerFromBrandingRow,
  issuerFromProfileRow,
  isIssuerReady,
  type InvoiceIssuer,
} from '@/lib/documents/issuer'
import { createRouteHandlerClient, getRouteUser } from '@/lib/supabase/route-handler'

export const runtime = 'nodejs'

const PROFILE_BASE_SELECT =
  'full_name,email,phone,company_name,company_address,company_city,company_zip,company_country,vat_number,tax_number,legal_form,company_website'
const PROFILE_BANK_SELECT = `${PROFILE_BASE_SELECT},invoice_iban,invoice_bic`
const BRANDING_SELECT =
  'invoice_company_name,invoice_company_address,invoice_iban,invoice_bic,invoice_vat_id,mail_from,invoice_footer,invoice_managing_director,invoice_register_info,invoice_account_holder,invoice_default_tax_note,invoice_default_payment_terms'

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = String(error.message ?? '').toLowerCase()
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find')
  )
}

async function selectProfile(supa: ReturnType<typeof createRouteHandlerClient>, userId: string) {
  const withBank = await supa.from('profiles').select(PROFILE_BANK_SELECT).eq('id', userId).maybeSingle()
  if (!withBank.error) return withBank.data as Record<string, unknown> | null
  if (!isMissingColumnError(withBank.error)) return null
  const base = await supa.from('profiles').select(PROFILE_BASE_SELECT).eq('id', userId).maybeSingle()
  return base.data as Record<string, unknown> | null
}

async function selectBranding(supa: ReturnType<typeof createRouteHandlerClient>, wsId: string) {
  const full = await (supa as any).from('workspace_branding').select(BRANDING_SELECT).eq('workspace_id', wsId).maybeSingle()
  if (!full.error) return full.data as Record<string, unknown> | null
  if (!isMissingColumnError(full.error)) return null
  const base = await (supa as any).from('workspace_branding')
    .select('workspace_id,mail_from')
    .eq('workspace_id', wsId)
    .maybeSingle()
  return base.data as Record<string, unknown> | null
}

async function resolveWorkspaceId(
  supa: ReturnType<typeof createRouteHandlerClient>,
  userId: string,
): Promise<string | null> {
  const { data: personal } = await supa
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', userId)
    .eq('is_personal', true)
    .maybeSingle()
  if (personal?.id) return personal.id

  const { data: owned } = await supa
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return owned?.id ?? null
}

async function updateProfile(
  supa: ReturnType<typeof createRouteHandlerClient>,
  userId: string,
  patch: Record<string, unknown>,
) {
  let attempt = await supa.from('profiles').update(patch).eq('id', userId)
  if (!attempt.error || !isMissingColumnError(attempt.error)) return attempt

  const safe = { ...patch }
  delete safe.invoice_iban
  delete safe.invoice_bic
  attempt = await supa.from('profiles').update(safe).eq('id', userId)
  return attempt
}

async function upsertBranding(
  supa: ReturnType<typeof createRouteHandlerClient>,
  row: Record<string, unknown>,
) {
  let attempt = await (supa as any).from('workspace_branding').upsert(row, { onConflict: 'workspace_id' })
  if (!attempt.error || !isMissingColumnError(attempt.error)) return attempt

  const safe = { workspace_id: row.workspace_id, mail_from: row.mail_from ?? null }
  attempt = await (supa as any).from('workspace_branding').upsert(safe, { onConflict: 'workspace_id' })
  return attempt
}

export async function GET(req: NextRequest) {
  const supa = createRouteHandlerClient(req)
  const user = await getRouteUser(req)
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const wsId = await resolveWorkspaceId(supa, user.id)
  const profile = await selectProfile(supa, user.id)
  const branding = wsId ? await selectBranding(supa, wsId) : null

  const issuer = wsId
    ? issuerFromBrandingRow(branding, issuerFromProfileRow(profile, user.email ?? ''))
    : issuerFromProfileRow(profile, user.email ?? '')

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
  const supa = createRouteHandlerClient(req)
  const user = await getRouteUser(req)
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const body = await req.json().catch(() => ({} as Partial<InvoiceIssuer>))
  const issuer: InvoiceIssuer = { ...EMPTY_ISSUER, ...body }

  const wsId = await resolveWorkspaceId(supa, user.id)
  if (!wsId) return NextResponse.json({ error: 'Kein Workspace gefunden' }, { status: 400 })

  const addressBlock = issuerAddressBlock(issuer)

  const { error: profileError } = await updateProfile(supa, user.id, {
    company_name: issuer.name.trim() || null,
    company_address: issuer.addressLine.trim() || null,
    company_zip: issuer.zip.trim() || null,
    company_city: issuer.city.trim() || null,
    company_country: issuer.country.trim() || null,
    phone: issuer.phone.trim() || null,
    legal_form: issuer.legalForm.trim() || null,
    company_website: issuer.website.trim() || null,
    vat_number: issuer.vatId.trim() || null,
    tax_number: issuer.taxNumber.trim() || null,
    invoice_iban: issuer.iban.trim() || null,
    invoice_bic: issuer.bic.trim() || null,
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const { error: brandingError } = await upsertBranding(supa, {
    workspace_id: wsId,
    invoice_company_name: issuer.name.trim() || null,
    invoice_company_address: addressBlock || null,
    invoice_iban: issuer.iban.trim() || null,
    invoice_bic: issuer.bic.trim() || null,
    invoice_vat_id: issuer.vatId.trim() || issuer.taxNumber.trim() || null,
    mail_from: issuer.email.trim() || user.email || null,
    invoice_footer: issuer.bankName.trim() || null,
    invoice_managing_director: issuer.managingDirector.trim() || null,
    invoice_register_info: issuer.registerInfo.trim() || null,
    invoice_account_holder: issuer.accountHolder.trim() || null,
    invoice_default_tax_note: issuer.defaultTaxNote.trim() || null,
    invoice_default_payment_terms: issuer.defaultPaymentTerms.trim() || null,
  })

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
    invoice_managing_director: issuer.managingDirector.trim() || null,
    invoice_register_info: issuer.registerInfo.trim() || null,
    invoice_account_holder: issuer.accountHolder.trim() || null,
    invoice_default_tax_note: issuer.defaultTaxNote.trim() || null,
    invoice_default_payment_terms: issuer.defaultPaymentTerms.trim() || null,
  }, issuerFromProfileRow({
    company_name: issuer.name.trim() || null,
    company_address: issuer.addressLine.trim() || null,
    company_zip: issuer.zip.trim() || null,
    company_city: issuer.city.trim() || null,
    company_country: issuer.country.trim() || null,
    phone: issuer.phone.trim() || null,
    legal_form: issuer.legalForm.trim() || null,
    company_website: issuer.website.trim() || null,
    vat_number: issuer.vatId.trim() || null,
    tax_number: issuer.taxNumber.trim() || null,
    invoice_iban: issuer.iban.trim() || null,
    invoice_bic: issuer.bic.trim() || null,
  }, user.email ?? ''))

  return NextResponse.json({ issuer: savedIssuer, ready: isIssuerReady(savedIssuer) })
}
