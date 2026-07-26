import type { DocKind } from '@/lib/documents/templates'
import { eur, renderDocumentHtml } from '@/lib/documents/templates'

export type DocTab = 'all' | 'angebot' | 'rechnung' | 'vertrag' | 'uploads'

export type AgencyDocRow = {
  id: string
  kind: DocKind | string
  number_label: string
  title: string
  status: string
  total_cents: number | null
  currency: string
  client_id?: string | null
  project_id?: string | null
  created_at: string
  data?: Record<string, unknown> | null
  brand_snapshot?: Record<string, unknown> | null
  projects?: { title?: string } | null
  agency_clients?: { name?: string } | null
}

export type UploadDocRow = {
  id: string
  type: string
  title: string
  url?: string | null
  created_at: string
  status?: string | null
  amount?: number | null
  file_url?: string | null
  pdf_url?: string | null
  projects?: { title?: string } | null
}

export type DocumentListItem = {
  id: string
  source: 'agency' | 'upload' | 'invoice'
  kind: string
  title: string
  numberLabel?: string
  recipient?: string
  projectTitle?: string
  amountCents?: number | null
  status: string
  createdAt: string
  downloadUrl?: string | null
  signedAt?: string | null
  acceptedAt?: string | null
  raw: AgencyDocRow | UploadDocRow
}

export const DOC_TABS: { id: DocTab; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'angebot', label: 'Angebote' },
  { id: 'rechnung', label: 'Rechnungen' },
  { id: 'vertrag', label: 'Verträge' },
  { id: 'uploads', label: 'Uploads' },
]

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Entwurf',
  final: 'Erstellt',
  sent: 'Gesendet',
  paid: 'Bezahlt',
  signed: 'Unterschrieben',
  accepted: 'Angenommen',
  pending: 'Offen',
}

export const KIND_LABEL: Record<string, string> = {
  angebot: 'Angebot',
  rechnung: 'Rechnung',
  vertrag: 'Vertrag',
  invoice: 'Rechnung',
  contract: 'Vertrag',
  briefing: 'Briefing',
  deliverable: 'Lieferung',
  other: 'Dokument',
}

export function statusDotColor(status: string, kind?: string): string {
  if (status === 'paid' || status === 'signed' || status === 'accepted') return '#16a34a'
  if (status === 'sent') return '#6366f1'
  if (status === 'final') return '#64748b'
  if (kind === 'rechnung' && status === 'pending') return '#d97706'
  return '#64748b'
}

export function formatAmount(cents?: number | null, amount?: number | null): string | null {
  if (typeof cents === 'number') return eur(cents / 100)
  if (typeof amount === 'number') return eur(amount)
  return null
}

export function dateLabel(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  } catch {
    return '—'
  }
}

export function buildDocumentsLead(counts: {
  total: number
  openInvoices: number
  pendingContracts: number
  openOffers: number
}): string {
  const parts = [
    `${counts.total} Dokument${counts.total === 1 ? '' : 'e'}`,
    `${counts.openOffers} offene${counts.openOffers === 1 ? 's' : ''} Angebot${counts.openOffers === 1 ? '' : 'e'}`,
    `${counts.openInvoices} offene Rechnung${counts.openInvoices === 1 ? '' : 'en'}`,
    `${counts.pendingContracts} Vertrag${counts.pendingContracts === 1 ? '' : 'e'} in Klärung`,
  ]
  return parts.join(', ')
}

export function mergeDocumentItems(
  agencyDocs: AgencyDocRow[],
  uploads: UploadDocRow[],
  legacyInvoices: UploadDocRow[],
): DocumentListItem[] {
  const agencyItems: DocumentListItem[] = agencyDocs.map((doc) => {
    const data = (doc.data || {}) as Record<string, unknown>
    return {
      id: doc.id,
      source: 'agency',
      kind: doc.kind,
      title: doc.title || KIND_LABEL[doc.kind] || 'Dokument',
      numberLabel: doc.number_label,
      recipient: typeof data.recipient_name === 'string' ? data.recipient_name : undefined,
      projectTitle: doc.projects?.title,
      amountCents: doc.total_cents,
      status: doc.status,
      createdAt: doc.created_at,
      signedAt: typeof data.signed_at === 'string' ? data.signed_at : null,
      acceptedAt: typeof data.accepted_at === 'string' ? data.accepted_at : null,
      raw: doc,
    }
  })

  const uploadItems: DocumentListItem[] = uploads.map((doc) => ({
    id: doc.id,
    source: 'upload',
    kind: doc.type || 'other',
    title: doc.title || 'Dokument',
    projectTitle: doc.projects?.title,
    amountCents: null,
    status: doc.status || 'final',
    createdAt: doc.created_at,
    downloadUrl: doc.url || doc.file_url || doc.pdf_url || null,
    raw: doc,
  }))

  const invoiceItems: DocumentListItem[] = legacyInvoices.map((doc) => ({
    id: doc.id,
    source: 'invoice',
    kind: 'invoice',
    title: (doc as any).invoice_no || doc.title || 'Rechnung',
    projectTitle: doc.projects?.title,
    amountCents: doc.amount ? Math.round(Number(doc.amount) * 100) : null,
    status: doc.status || 'pending',
    createdAt: doc.created_at,
    downloadUrl: doc.file_url || doc.pdf_url || null,
    raw: doc,
  }))

  return [...agencyItems, ...uploadItems, ...invoiceItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function printAgencyDocument(doc: {
  kind: string
  number_label: string
  data?: Record<string, unknown> | null
  brand_snapshot?: Record<string, unknown> | null
}) {
  const html = renderDocumentHtml({
    kind: doc.kind as DocKind,
    numberLabel: doc.number_label,
    data: doc.data || {},
    brand: (doc.brand_snapshot as any) || { name: 'Festag', color: '#5B647D' },
  })
  const printHtml = typeof window !== 'undefined'
    ? html.replace(/url\('\/fonts\//g, `url('${window.location.origin}/fonts/`)
    : html
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(printHtml)
  w.document.close()
  setTimeout(() => { try { w.focus(); w.print() } catch {} }, 350)
}

export function filterDocumentItems(items: DocumentListItem[], tab: DocTab): DocumentListItem[] {
  if (tab === 'all') return items
  if (tab === 'uploads') return items.filter((i) => i.source === 'upload' || i.source === 'invoice')
  return items.filter((i) => i.kind === tab)
}
