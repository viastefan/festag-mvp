// Agency document templates (Angebot / Vertrag / Rechnung) + print-HTML render.
import { renderInvoiceHtml } from '@/lib/documents/invoice-render'
// See docs/documents-and-clients-model.md. Slice 1: build + download (print) PDF.

export type DocKind = 'angebot' | 'vertrag' | 'rechnung'
export type DocFieldType = 'text' | 'longtext' | 'date' | 'positions'

export type DocFieldDef = {
  key: string
  label: string
  type: DocFieldType
  help?: string
  required?: boolean
}

export type DocTemplate = {
  kind: DocKind
  title: string
  numberPrefix: string
  hasTotal: boolean
  fields: DocFieldDef[]
}

export type DocPosition = { description: string; qty: number; unit_price: number }

const recipient: DocFieldDef[] = [
  { key: 'recipient_name', label: 'Empfänger (Name / Firma)', type: 'text' },
  { key: 'recipient_address', label: 'Adresse des Empfängers', type: 'longtext' },
]

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    kind: 'angebot',
    title: 'Angebot',
    numberPrefix: 'A',
    hasTotal: true,
    fields: [
      ...recipient,
      { key: 'date', label: 'Datum', type: 'date' },
      { key: 'intro', label: 'Einleitung', type: 'longtext', help: 'Kurzer Begleittext zum Angebot.' },
      { key: 'positions', label: 'Positionen', type: 'positions', required: true },
      { key: 'valid_until', label: 'Gültig bis', type: 'date' },
      { key: 'notes', label: 'Hinweise', type: 'longtext' },
    ],
  },
  {
    kind: 'rechnung',
    title: 'Rechnung',
    numberPrefix: 'RE',
    hasTotal: true,
    fields: [
      ...recipient,
      { key: 'recipient_email', label: 'E-Mail-Adresse', type: 'text', help: 'Für den Versand an den Kunden' },
      { key: 'date', label: 'Rechnungsdatum', type: 'date' },
      { key: 'due_terms', label: 'Fälligkeit', type: 'text', help: 'z. B. „Mit Vertragsunterzeichnung" oder „14 Tage nach Erhalt"' },
      { key: 'service_period', label: 'Leistungszeitraum', type: 'text' },
      { key: 'positions', label: 'Positionen', type: 'positions' },
      { key: 'payment_reference', label: 'Verwendungszweck', type: 'text' },
      { key: 'payment_terms', label: 'Zahlungsbedingungen', type: 'longtext' },
      { key: 'recipient_contact', label: 'Kontakt Empfänger (E-Mail, Telefon)', type: 'text' },
      { key: 'tax_note', label: 'Steuer-Hinweis', type: 'text', help: 'Optional, z. B. Gemäß § 19 UStG keine Umsatzsteuer' },
    ],
  },
  {
    kind: 'vertrag',
    title: 'Dienstleistungsvertrag',
    numberPrefix: 'V',
    hasTotal: false,
    fields: [
      ...recipient,
      { key: 'date', label: 'Datum', type: 'date' },
      { key: 'parties', label: 'Vertragsparteien', type: 'longtext', help: 'Auftraggeber und Auftragnehmer.' },
      { key: 'scope', label: 'Leistungsumfang', type: 'longtext', required: true },
      { key: 'terms', label: 'Konditionen / Vergütung', type: 'longtext', required: true },
      { key: 'duration', label: 'Laufzeit / Kündigung', type: 'longtext' },
      { key: 'misc', label: 'Sonstige Vereinbarungen', type: 'longtext' },
    ],
  },
]

export function getDocTemplate(kind: string | null | undefined): DocTemplate | null {
  return DOC_TEMPLATES.find(t => t.kind === kind) ?? null
}

export function positionsTotal(positions: DocPosition[] | undefined): number {
  return (positions ?? []).reduce((sum, p) => sum + (Number(p.qty) || 0) * (Number(p.unit_price) || 0), 0)
}

export function eur(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
}
function nl2br(s: unknown): string {
  return esc(s).replace(/\n/g, '<br>')
}
function fmtDate(s: unknown): string {
  if (!s) return ''
  try { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(String(s))) }
  catch { return String(s) }
}

export type DocBrand = {
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

/** Full, print-ready A4 HTML for a document. The print view triggers the
 *  browser's „Als PDF speichern". White-Label brand or Festag default. */
export function renderDocumentHtml(opts: {
  kind: DocKind
  numberLabel: string
  data: Record<string, any>
  brand: DocBrand
}): string {
  if (opts.kind === 'rechnung') {
    return renderInvoiceHtml({
      numberLabel: opts.numberLabel,
      data: opts.data,
      brand: opts.brand,
    })
  }

  const t = getDocTemplate(opts.kind)
  const title = t?.title ?? 'Dokument'
  const d = opts.data || {}
  const brand = opts.brand
  const accent = brand.color || '#5B647D'
  const positions: DocPosition[] = Array.isArray(d.positions) ? d.positions : []
  const total = positionsTotal(positions)

  const positionsTable = (t?.hasTotal && positions.length)
    ? `<table class="pos"><thead><tr>
         ${opts.kind === 'rechnung' ? '<th class="num">Pos.</th>' : ''}
         <th>Beschreibung</th><th class="num">Menge</th><th class="num">Einzelpreis</th><th class="num">Summe</th>
       </tr></thead><tbody>
       ${positions.map((p, i) => `<tr>
         ${opts.kind === 'rechnung' ? `<td class="num">${String(i + 1).padStart(2, '0')}</td>` : ''}
         <td>${nl2br(p.description)}</td>
         <td class="num">${esc(p.qty)}</td>
         <td class="num">${eur(Number(p.unit_price) || 0)}</td>
         <td class="num">${eur((Number(p.qty) || 0) * (Number(p.unit_price) || 0))}</td>
       </tr>`).join('')}
       </tbody><tfoot>
         ${opts.kind === 'rechnung' ? `<tr><td colspan="${opts.kind === 'rechnung' ? 4 : 3}" class="num">Zwischensumme netto</td><td class="num">${eur(total)}</td></tr>
         <tr><td colspan="4" class="num muted">Umsatzsteuer</td><td class="num muted">0,00 €</td></tr>` : ''}
         <tr><td colspan="${opts.kind === 'rechnung' ? 4 : 3}" class="num strong">Gesamt${opts.kind === 'rechnung' ? 'betrag' : ''}</td><td class="num strong">${eur(total)}</td></tr>
       </tfoot></table>`
    : ''

  const longBlock = (label: string, key: string) =>
    d[key] ? `<div class="block"><div class="block-label">${esc(label)}</div><div class="block-body">${nl2br(d[key])}</div></div>` : ''

  const issuerBlock = opts.kind === 'rechnung'
    ? `<div class="parties">
         <div class="party"><div class="party-label">Rechnungssteller</div>
           <div><strong>${esc(brand.name)}</strong></div>
           ${brand.address ? `<div>${nl2br(brand.address)}</div>` : ''}
           ${brand.email || brand.phone ? `<div class="muted">${[brand.email, brand.phone].filter(Boolean).map(esc).join(' · ')}</div>` : ''}
           ${brand.vat_id ? `<div class="muted">Steuernummer (USt-IdNr.): ${esc(brand.vat_id)}</div>` : ''}
         </div>
         <div class="party"><div class="party-label">Rechnungsempfänger</div>
           <div><strong>${esc(d.recipient_name)}</strong></div>
           <div>${nl2br(d.recipient_address)}</div>
         </div>
       </div>`
    : `<div class="recipient">
         <div class="to-label">An</div>
         <div><strong>${esc(d.recipient_name)}</strong></div>
         <div>${nl2br(d.recipient_address)}</div>
       </div>`

  const paymentBlock = opts.kind === 'rechnung'
    ? `<div class="payment page-break">
         <div class="section-kicker">Zahlung</div>
         <h2 class="section-title">Bankverbindung und Konditionen</h2>
         <div class="pay-grid">
           <div>
             ${brand.iban ? `<p><strong>IBAN</strong><br>${esc(brand.iban)}</p>` : ''}
             ${brand.bic ? `<p><strong>BIC</strong><br>${esc(brand.bic)}</p>` : ''}
             <p><strong>Verwendungszweck</strong><br>${esc(d.payment_reference || opts.numberLabel)}</p>
           </div>
           <div>
             ${d.due_date ? `<p><strong>Zahlbar bis</strong><br>${fmtDate(d.due_date)}</p>` : ''}
             ${d.payment_info ? `<p>${nl2br(d.payment_info)}</p>` : ''}
           </div>
         </div>
         ${d.tax_note ? `<p class="muted tax-note">${nl2br(d.tax_note)}</p>` : ''}
       </div>`
    : ''

  const bodyByKind =
    opts.kind === 'vertrag'
      ? [longBlock('Vertragsparteien', 'parties'), longBlock('Leistungsumfang', 'scope'),
         longBlock('Konditionen / Vergütung', 'terms'), longBlock('Laufzeit / Kündigung', 'duration'),
         longBlock('Sonstige Vereinbarungen', 'misc'),
         `<div class="sign"><div><div class="sign-line"></div>Ort, Datum</div><div><div class="sign-line"></div>Unterschrift</div></div>`].join('')
      : opts.kind === 'rechnung'
        ? [longBlock('', 'intro'), positionsTable, paymentBlock].join('')
        : [longBlock('', 'intro'), positionsTable,
           d.valid_until ? `<p><strong>Gültig bis:</strong> ${fmtDate(d.valid_until)}</p>` : '',
           longBlock('Hinweise', 'notes')].join('')

  const invoiceHeader = opts.kind === 'rechnung'
    ? `<div class="doc-kicker">${esc(brand.name).toUpperCase()}</div>
       <h1 class="invoice-title">Rechnung.</h1>
       <div class="invoice-number">${esc(opts.numberLabel)}</div>
       <div class="invoice-meta">
         ${d.date ? `<div><span>Rechnungsdatum</span><strong>${fmtDate(d.date)}</strong></div>` : ''}
         ${d.due_date ? `<div><span>Fälligkeit</span><strong>${fmtDate(d.due_date)}</strong></div>` : ''}
         ${d.service_period ? `<div><span>Leistungszeitraum</span><strong>${esc(d.service_period)}</strong></div>` : ''}
       </div>`
    : `<div class="doc-title">${esc(title)}</div>
       <div>Nr. ${esc(opts.numberLabel)}</div>
       ${d.date ? `<div>${fmtDate(d.date)}</div>` : ''}`

  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>${esc(title)} ${esc(opts.numberLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#14171f; margin:0; background:#fff; }
  .page { max-width: 760px; margin: 0 auto; padding: 48px 56px; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid ${accent}; padding-bottom:18px; margin-bottom:24px; }
  .brand { display:flex; align-items:center; gap:12px; }
  .brand img { height:40px; }
  .brand-name { font-size:18px; font-weight:700; color:${accent}; }
  .doc-meta { text-align:right; font-size:12.5px; color:#444; }
  .doc-kicker { font-size:10px; letter-spacing:.14em; color:#888; margin-bottom:8px; }
  .invoice-title { font-size:34px; font-weight:700; margin:0; letter-spacing:-.03em; }
  .invoice-number { font-size:15px; color:#444; margin-top:4px; }
  .invoice-meta { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:18px; text-align:left; }
  .invoice-meta span { display:block; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:#888; margin-bottom:4px; }
  .invoice-meta strong { font-size:13px; font-weight:600; color:#14171f; }
  .doc-title { font-size:22px; font-weight:700; margin:0 0 4px; color:#14171f; }
  .recipient { margin:28px 0 8px; font-size:13.5px; line-height:1.6; }
  .recipient .to-label { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:28px; margin:24px 0; font-size:13px; line-height:1.65; }
  .party-label { font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:#888; margin-bottom:8px; }
  .block { margin:18px 0; }
  .block-label { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:.06em; margin-bottom:5px; }
  .block-body { font-size:13.5px; line-height:1.6; white-space:normal; }
  p { font-size:13.5px; line-height:1.6; }
  .muted { color:#666; font-size:12.5px; }
  .tax-note { margin-top:16px; padding-top:12px; border-top:1px solid #eee; }
  table.pos { width:100%; border-collapse:collapse; margin:18px 0; font-size:13px; }
  table.pos th { text-align:left; border-bottom:1px solid #ddd; padding:8px 6px; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#777; }
  table.pos td { padding:9px 6px; border-bottom:1px solid #f0f0f0; vertical-align:top; }
  table.pos .num { text-align:right; white-space:nowrap; }
  table.pos tfoot td { border-bottom:none; border-top:1px solid #eee; padding-top:10px; }
  table.pos tfoot tr:last-child td { border-top:2px solid ${accent}; }
  .strong { font-weight:700; }
  .payment { margin-top:36px; padding-top:24px; border-top:1px solid #eee; }
  .section-kicker { font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:#888; }
  .section-title { font-size:20px; margin:6px 0 16px; font-weight:700; }
  .pay-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .sign { display:flex; gap:48px; margin-top:48px; }
  .sign > div { flex:1; font-size:12px; color:#666; }
  .sign-line { border-top:1px solid #333; margin-bottom:6px; height:40px; }
  .foot { margin-top:40px; padding-top:14px; border-top:1px solid #eee; font-size:11px; color:#999; }
  .page-break { page-break-before: always; }
  @media print { .page { padding:24px 32px; } @page { margin: 14mm; } }
</style></head>
<body><div class="page">
  <div class="top">
    <div class="brand">
      ${brand.logo_url ? `<img src="${esc(brand.logo_url)}" alt="">` : ''}
      ${opts.kind !== 'rechnung' ? `<span class="brand-name">${esc(brand.name)}</span>` : ''}
    </div>
    <div class="doc-meta">${invoiceHeader}</div>
  </div>
  ${issuerBlock}
  ${bodyByKind}
  <div class="foot">${brand.footer ? esc(brand.footer) : `${esc(brand.name)}${brand.address ? ', ' + esc(brand.address) : ''}`}, ${esc(opts.numberLabel)}</div>
</div></body></html>`
}
