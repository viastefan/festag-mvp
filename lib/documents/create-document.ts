import { getDocTemplate, positionsTotal, type DocKind } from '@/lib/documents/templates'

export type DocBrandSnapshot = {
  name: string
  color: string
  logo_url?: string | null
  address?: string | null
  footer?: string | null
  iban?: string | null
  bic?: string | null
  vat_id?: string | null
  email?: string | null
  phone?: string | null
  bank_name?: string | null
  initials?: string | null
}

/** Fallback when workspace branding / profile has no invoice data yet. */
export const INVOICE_FALLBACK_BRAND: DocBrandSnapshot = {
  name: 'Stefan Dirnberger',
  color: '#111111',
  logo_url: null,
  address: 'Lindenstraße 15\n84036 Kumhausen\nDeutschland',
  footer: null,
  iban: 'DE40 1001 0178 9282 2239 49',
  bic: 'REVODEB2',
  vat_id: '69343720183',
  email: 'stefandirnberger@viawen.com',
  phone: '+49 163 7044 875',
  bank_name: 'Revolut',
  initials: 'SD',
}

export const FESTAG_BRAND: DocBrandSnapshot = { ...INVOICE_FALLBACK_BRAND, name: 'Festag', color: '#5B647D', initials: 'F' }

function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function formatNumberLabel(kind: DocKind, n: number): string {
  if (kind === 'rechnung') return `#${String(n).padStart(7, '0')}`
  const template = getDocTemplate(kind)
  return `${template?.numberPrefix ?? 'D'}-${String(n).padStart(4, '0')}`
}

export async function resolveDocBrand(sb: any, workspaceId: string): Promise<DocBrandSnapshot> {
  const { data: ws } = await sb.from('workspaces')
    .select('primary_owner_id')
    .eq('id', workspaceId)
    .maybeSingle()

  const ownerId = (ws as any)?.primary_owner_id as string | undefined

  const [{ data: branding }, { data: profile }] = await Promise.all([
    sb.from('workspace_branding')
      .select('plan,brand_name,brand_color,logo_url,mail_from,invoice_company_name,invoice_company_address,invoice_iban,invoice_bic,invoice_vat_id,invoice_footer')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
    ownerId
      ? sb.from('profiles')
        .select('full_name,email,phone,company_name,company_address,vat_number,tax_number')
        .eq('id', ownerId)
        .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const whiteLabel = branding?.plan && branding.plan !== 'powered_by_festag' && branding.brand_name
  const profileName = profile?.company_name || profile?.full_name
  const name =
    branding?.invoice_company_name
    || (whiteLabel ? branding.brand_name : null)
    || profileName
    || INVOICE_FALLBACK_BRAND.name

  const address =
    branding?.invoice_company_address
    || profile?.company_address
    || INVOICE_FALLBACK_BRAND.address

  const merged: DocBrandSnapshot = {
    name,
    color: branding?.brand_color || INVOICE_FALLBACK_BRAND.color,
    logo_url: branding?.logo_url || null,
    address: address || null,
    footer: branding?.invoice_footer || branding?.mail_from || null,
    iban: branding?.invoice_iban || INVOICE_FALLBACK_BRAND.iban,
    bic: branding?.invoice_bic || INVOICE_FALLBACK_BRAND.bic,
    vat_id: branding?.invoice_vat_id || profile?.vat_number || profile?.tax_number || INVOICE_FALLBACK_BRAND.vat_id,
    email: branding?.mail_from || profile?.email || INVOICE_FALLBACK_BRAND.email,
    phone: profile?.phone || INVOICE_FALLBACK_BRAND.phone,
    bank_name: branding?.invoice_bic === 'REVODEB2' ? 'Revolut' : INVOICE_FALLBACK_BRAND.bank_name,
    initials: monogram(name),
  }

  return merged
}

export type CreateAgencyDocumentInput = {
  kind: DocKind
  workspaceId: string
  clientId?: string | null
  projectId?: string | null
  title?: string | null
  data?: Record<string, unknown>
}

export async function createAgencyDocument(
  sb: any,
  userId: string,
  input: CreateAgencyDocumentInput,
) {
  const template = getDocTemplate(input.kind)
  if (!template) throw new Error('bad_kind')

  const brand = await resolveDocBrand(sb, input.workspaceId)
  const data = { ...(input.data ?? {}) } as Record<string, unknown>

  if (!data.date) data.date = new Date().toISOString().slice(0, 10)
  if (input.kind === 'rechnung' && !String(data.tax_note ?? '').trim()) {
    data.tax_note = 'Gemäß § 19 UStG keine Umsatzsteuer'
  }

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
    status: 'final',
    total_cents: totalCents,
    currency: 'EUR',
    created_by: userId,
  }).select('*').single()

  if (error) throw new Error(error.message)
  return doc
}
