import { getDocTemplate, positionsTotal, type DocKind } from '@/lib/documents/templates'
import { normalizeDocumentData } from '@/lib/documents/document-defaults'
import { issuerDisplayName, issuerFromBrandingRow, issuerFromProfileRow } from '@/lib/documents/issuer'

export type DocBrandSnapshot = {
  name: string
  color: string
  logo_url?: string | null
  address?: string | null
  footer?: string | null
  iban?: string | null
  bic?: string | null
  vat_id?: string | null
  tax_number?: string | null
  email?: string | null
  phone?: string | null
  bank_name?: string | null
  initials?: string | null
  legal_form?: string | null
  website?: string | null
  managing_director?: string | null
  register_info?: string | null
  account_holder?: string | null
  default_tax_note?: string | null
  default_payment_terms?: string | null
}

/** Neutral fallback when no issuer data is configured yet. */
export const FESTAG_BRAND: DocBrandSnapshot = {
  name: 'Rechnungssteller',
  color: '#111111',
  logo_url: null,
  address: null,
  footer: null,
  iban: null,
  bic: null,
  vat_id: null,
  email: null,
  phone: null,
  bank_name: null,
  initials: 'R',
}

function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || 'R'
}

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === '42703' || Boolean(error?.message?.includes('does not exist'))
}

export function formatNumberLabel(kind: DocKind, n: number): string {
  if (kind === 'rechnung') return `#${String(n).padStart(7, '0')}`
  const template = getDocTemplate(kind)
  return `${template?.numberPrefix ?? 'D'}-${String(n).padStart(4, '0')}`
}

async function selectBrandingSafe(sb: any, workspaceId: string) {
  const full = await sb.from('workspace_branding')
    .select('plan,brand_name,brand_color,logo_url,mail_from,invoice_company_name,invoice_company_address,invoice_iban,invoice_bic,invoice_vat_id,invoice_footer,invoice_managing_director,invoice_register_info,invoice_account_holder,invoice_default_tax_note,invoice_default_payment_terms')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!full.error) return full.data
  if (!isMissingColumnError(full.error)) return null
  const base = await sb.from('workspace_branding')
    .select('plan,brand_name,brand_color,logo_url,mail_from')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  return base.data
}

async function selectProfileSafe(sb: any, ownerId: string) {
  const full = await sb.from('profiles')
    .select('full_name,email,phone,company_name,company_address,company_city,company_zip,company_country,vat_number,tax_number,legal_form,company_website,invoice_iban,invoice_bic')
    .eq('id', ownerId)
    .maybeSingle()
  if (!full.error) return full.data
  if (!isMissingColumnError(full.error)) return null
  const base = await sb.from('profiles')
    .select('full_name,email,phone,company_name,company_address,company_city,company_zip,company_country,vat_number,tax_number,legal_form,company_website')
    .eq('id', ownerId)
    .maybeSingle()
  return base.data
}

export async function resolveDocBrand(sb: any, workspaceId: string): Promise<DocBrandSnapshot> {
  const { data: ws } = await sb.from('workspaces')
    .select('primary_owner_id')
    .eq('id', workspaceId)
    .maybeSingle()

  const ownerId = (ws as any)?.primary_owner_id as string | undefined

  const [branding, profile] = await Promise.all([
    selectBrandingSafe(sb, workspaceId),
    ownerId ? selectProfileSafe(sb, ownerId) : Promise.resolve(null),
  ])

  const profileIssuer = issuerFromProfileRow(profile, profile?.email || '')
  const issuer = branding
    ? issuerFromBrandingRow(branding, profileIssuer)
    : profileIssuer

  const name = issuerDisplayName(issuer) || FESTAG_BRAND.name
  const address = String(branding?.invoice_company_address || '').trim()
    || [
      profile?.company_address,
      profile?.company_zip && profile?.company_city
        ? `${profile.company_zip} ${profile.company_city}`.trim()
        : null,
      profile?.company_country,
    ].filter(Boolean).join('\n')
    || null

  return {
    name,
    color: branding?.brand_color || '#111111',
    logo_url: branding?.logo_url || null,
    address,
    footer: branding?.invoice_footer || null,
    iban: issuer.iban || null,
    bic: issuer.bic || null,
    vat_id: issuer.vatId || null,
    tax_number: issuer.taxNumber || null,
    email: issuer.email || null,
    phone: issuer.phone || null,
    bank_name: issuer.bankName || null,
    initials: monogram(name),
    legal_form: issuer.legalForm || null,
    website: issuer.website || null,
    managing_director: issuer.managingDirector || null,
    register_info: issuer.registerInfo || null,
    account_holder: issuer.accountHolder || null,
    default_tax_note: issuer.defaultTaxNote || null,
    default_payment_terms: issuer.defaultPaymentTerms || null,
  }
}

export type CreateAgencyDocumentInput = {
  kind: DocKind
  workspaceId: string
  clientId?: string | null
  projectId?: string | null
  title?: string | null
  data?: Record<string, unknown>
  status?: 'draft' | 'final'
}

export async function createAgencyDocument(
  sb: any,
  userId: string,
  input: CreateAgencyDocumentInput,
) {
  const template = getDocTemplate(input.kind)
  if (!template) throw new Error('bad_kind')

  const brand = await resolveDocBrand(sb, input.workspaceId)
  const data = normalizeDocumentData(input.kind, { ...(input.data ?? {}) })

  const { data: num, error: numErr } = await sb.rpc('next_agency_doc_number', {
    p_workspace: input.workspaceId,
    p_kind: input.kind,
  })
  if (numErr) throw new Error(numErr.message)

  const n: number = typeof num === 'number' ? num : 1
  const numberLabel = formatNumberLabel(input.kind, n)

  if (input.kind === 'rechnung' && !String(data.payment_reference ?? '').trim()) {
    data.payment_reference = String(data.recipient_name || 'Projekt').split('\n')[0]
  }

  if (input.kind === 'rechnung') {
    if (!String(data.tax_note ?? '').trim() && brand.default_tax_note) {
      data.tax_note = brand.default_tax_note
    }
    if (!String(data.payment_terms ?? '').trim() && brand.default_payment_terms) {
      data.payment_terms = brand.default_payment_terms
    }
  }

  const totalCents = template.hasTotal
    ? Math.round(positionsTotal(data.positions as any) * 100)
    : null

  const { data: doc, error } = await sb.from('agency_documents').insert({
    workspace_id: input.workspaceId,
    client_id: input.clientId || null,
    project_id: input.projectId || null,
    kind: input.kind,
    number: n,
    number_label: numberLabel,
    title: input.title || template.title,
    data,
    brand_snapshot: brand,
    status: input.status ?? 'final',
    total_cents: totalCents,
    currency: 'EUR',
    created_by: userId,
  }).select('*').single()

  if (error) throw new Error(error.message)
  return doc
}
