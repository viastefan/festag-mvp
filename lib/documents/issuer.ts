export type InvoiceIssuer = {
  name: string
  addressLine: string
  zip: string
  city: string
  country: string
  email: string
  phone: string
  vatId: string
  taxNumber: string
  iban: string
  bic: string
  bankName: string
}

export const EMPTY_ISSUER: InvoiceIssuer = {
  name: '',
  addressLine: '',
  zip: '',
  city: '',
  country: 'Deutschland',
  email: '',
  phone: '',
  vatId: '',
  taxNumber: '',
  iban: '',
  bic: '',
  bankName: '',
}

export function issuerAddressBlock(issuer: Pick<InvoiceIssuer, 'addressLine' | 'zip' | 'city' | 'country'>): string {
  return [issuer.addressLine.trim(), `${issuer.zip.trim()} ${issuer.city.trim()}`.trim(), issuer.country.trim()]
    .filter(Boolean)
    .join('\n')
}

/** Minimum to show a credible Rechnungssteller block — IBAN optional for first draft. */
export function isIssuerReady(issuer: Partial<InvoiceIssuer>): boolean {
  return Boolean(
    issuer.name?.trim()
    && issuer.addressLine?.trim()
    && issuer.city?.trim(),
  )
}

export function issuerMissingLabels(issuer: Partial<InvoiceIssuer>): string[] {
  const missing: string[] = []
  if (!issuer.name?.trim()) missing.push('Name oder Firma')
  if (!issuer.addressLine?.trim()) missing.push('Straße')
  if (!issuer.city?.trim()) missing.push('Stadt')
  return missing
}

/** One-line preview for cards (city + masked IBAN, no duplicate name). */
export function issuerSummaryLine(issuer: Partial<InvoiceIssuer> | null | undefined): string {
  if (!issuer) return ''
  const iban = String(issuer.iban || '').replace(/\s/g, '')
  return [
    issuer.city?.trim(),
    iban.length >= 4 ? `IBAN endet auf ${iban.slice(-4)}` : '',
  ].filter(Boolean).join(', ')
}

export function issuerFromProfileRow(row: Record<string, unknown> | null | undefined, emailFallback = ''): InvoiceIssuer {
  const r = row ?? {}
  return {
    name: String(r.company_name || r.full_name || '').trim(),
    addressLine: String(r.company_address || '').trim(),
    zip: String(r.company_zip || '').trim(),
    city: String(r.company_city || '').trim(),
    country: String(r.company_country || 'Deutschland').trim() || 'Deutschland',
    email: String(r.email || emailFallback || '').trim(),
    phone: String(r.phone || '').trim(),
    vatId: String(r.vat_number || '').trim(),
    taxNumber: String(r.tax_number || '').trim(),
    iban: String(r.invoice_iban || '').trim(),
    bic: String(r.invoice_bic || '').trim(),
    bankName: String(r.invoice_bank_name || '').trim(),
  }
}

export function issuerFromBrandingRow(
  branding: Record<string, unknown> | null | undefined,
  profile: InvoiceIssuer,
): InvoiceIssuer {
  const b = branding ?? {}
  const address = String(b.invoice_company_address || '').trim()
  const lines = address.split('\n').map((l) => l.trim()).filter(Boolean)
  return {
    ...profile,
    name: String(b.invoice_company_name || profile.name).trim() || profile.name,
    addressLine: lines[0] || profile.addressLine,
    zip: profile.zip || (lines[1]?.match(/^(\d{4,5})\s/)?.[1] ?? ''),
    city: profile.city || (lines[1]?.replace(/^\d{4,5}\s*/, '') ?? lines[1] ?? ''),
    country: lines[2] || profile.country,
    iban: String(b.invoice_iban || profile.iban).trim(),
    bic: String(b.invoice_bic || profile.bic).trim(),
    vatId: String(b.invoice_vat_id || profile.vatId).trim(),
    email: String(b.mail_from || profile.email).trim(),
    bankName: String(b.invoice_footer || profile.bankName).trim(),
  }
}
