export type InvoiceIssuer = {
  name: string
  legalForm: string
  addressLine: string
  zip: string
  city: string
  country: string
  email: string
  phone: string
  website: string
  vatId: string
  taxNumber: string
  managingDirector: string
  registerInfo: string
  accountHolder: string
  iban: string
  bic: string
  bankName: string
  defaultTaxNote: string
  defaultPaymentTerms: string
}

export const EMPTY_ISSUER: InvoiceIssuer = {
  name: '',
  legalForm: '',
  addressLine: '',
  zip: '',
  city: '',
  country: 'Deutschland',
  email: '',
  phone: '',
  website: '',
  vatId: '',
  taxNumber: '',
  managingDirector: '',
  registerInfo: '',
  accountHolder: '',
  iban: '',
  bic: '',
  bankName: '',
  defaultTaxNote: '',
  defaultPaymentTerms: '',
}

export const ISSUER_LEGAL_FORMS = [
  'Einzelunternehmen',
  'e.K.',
  'GbR',
  'UG (haftungsbeschränkt)',
  'GmbH',
  'AG',
  'Freiberufler',
] as const

export function issuerAddressBlock(issuer: Pick<InvoiceIssuer, 'addressLine' | 'zip' | 'city' | 'country'>): string {
  return [issuer.addressLine.trim(), `${issuer.zip.trim()} ${issuer.city.trim()}`.trim(), issuer.country.trim()]
    .filter(Boolean)
    .join('\n')
}

/** Display name with legal form when set (e.g. „Muster GmbH“). */
export function issuerDisplayName(issuer: Pick<InvoiceIssuer, 'name' | 'legalForm'>): string {
  const name = issuer.name.trim()
  const form = issuer.legalForm.trim()
  if (!name) return ''
  if (!form) return name
  const lower = name.toLowerCase()
  if (lower.endsWith(form.toLowerCase()) || lower.includes(form.toLowerCase())) return name
  return `${name} ${form}`
}

/** Tax / register lines for invoice party block and footer. */
export function issuerLegalLines(issuer: Partial<InvoiceIssuer>): string[] {
  const lines: string[] = []
  const director = issuer.managingDirector?.trim()
  const register = issuer.registerInfo?.trim()
  const vat = issuer.vatId?.trim()
  const tax = issuer.taxNumber?.trim()
  const website = issuer.website?.trim()

  if (director) lines.push(`Geschäftsführer: ${director}`)
  if (register) lines.push(register)
  if (vat) lines.push(`USt-IdNr.: ${vat}`)
  if (tax && tax !== vat) lines.push(`Steuernummer: ${tax}`)
  if (website) lines.push(website.replace(/^https?:\/\//i, ''))
  return lines
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
    legalForm: String(r.legal_form || '').trim(),
    addressLine: String(r.company_address || '').trim(),
    zip: String(r.company_zip || '').trim(),
    city: String(r.company_city || '').trim(),
    country: String(r.company_country || 'Deutschland').trim() || 'Deutschland',
    email: String(r.email || emailFallback || '').trim(),
    phone: String(r.phone || '').trim(),
    website: String(r.company_website || '').trim(),
    vatId: String(r.vat_number || '').trim(),
    taxNumber: String(r.tax_number || '').trim(),
    managingDirector: '',
    registerInfo: '',
    accountHolder: '',
    iban: String(r.invoice_iban || '').trim(),
    bic: String(r.invoice_bic || '').trim(),
    bankName: String(r.invoice_bank_name || '').trim(),
    defaultTaxNote: '',
    defaultPaymentTerms: '',
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
    vatId: String(b.invoice_vat_id || profile.vatId).trim() || profile.vatId,
    email: String(b.mail_from || profile.email).trim(),
    bankName: String(b.invoice_footer || profile.bankName).trim(),
    managingDirector: String(b.invoice_managing_director || profile.managingDirector).trim(),
    registerInfo: String(b.invoice_register_info || profile.registerInfo).trim(),
    accountHolder: String(b.invoice_account_holder || profile.accountHolder).trim(),
    defaultTaxNote: String(b.invoice_default_tax_note || profile.defaultTaxNote).trim(),
    defaultPaymentTerms: String(b.invoice_default_payment_terms || profile.defaultPaymentTerms).trim(),
  }
}

/** Map issuer into document brand snapshot fields. */
export function issuerToBrandExtras(issuer: Partial<InvoiceIssuer>) {
  return {
    name: issuerDisplayName(issuer as InvoiceIssuer) || issuer.name?.trim() || '',
    legal_form: issuer.legalForm?.trim() || null,
    website: issuer.website?.trim() || null,
    managing_director: issuer.managingDirector?.trim() || null,
    register_info: issuer.registerInfo?.trim() || null,
    account_holder: issuer.accountHolder?.trim() || null,
    tax_number: issuer.taxNumber?.trim() || null,
    default_tax_note: issuer.defaultTaxNote?.trim() || null,
    default_payment_terms: issuer.defaultPaymentTerms?.trim() || null,
  }
}
