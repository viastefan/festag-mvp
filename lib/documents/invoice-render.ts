import type { DocBrand } from '@/lib/documents/templates'
import { eur, positionsTotal, type DocPosition } from '@/lib/documents/templates'

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
}
function nl2br(s: unknown): string {
  return esc(s).replace(/\n/g, '<br>')
}
function fmtDateShort(s: unknown): string {
  if (!s) return ''
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(String(s)))
  } catch { return String(s) }
}
function fmtMonthYear(s: unknown): string {
  if (!s) return ''
  try {
    const raw = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(String(s)))
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  } catch { return '' }
}
function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/** Print/PDF HTML for invoices — matches InvoiceWysiwygEditor chrome (no kickers, no middle dots). */
export function renderInvoiceHtml(opts: {
  numberLabel: string
  data: Record<string, any>
  brand: DocBrand
}): string {
  const d = opts.data || {}
  const brand = opts.brand
  const positions: DocPosition[] = Array.isArray(d.positions) ? d.positions : []
  const total = positionsTotal(positions)
  const brandName = String(brand.name || 'Rechnungssteller').trim() || 'Rechnungssteller'
  const initials = brand.initials || monogram(brandName)
  const monthLabel = fmtMonthYear(d.date) || fmtMonthYear(new Date().toISOString())
  const dueLabel = String(d.due_terms || '').trim() || (d.due_date ? fmtDateShort(d.due_date) : '')
  const taxNote = String(d.tax_note || '').trim()
  const invoiceTitle = String(d.service_period || '').trim()
  const paymentRef = String(d.payment_reference || opts.numberLabel).trim()
  const paymentTerms = String(d.payment_terms || '').trim() || [
    `Bitte überweisen Sie den Gesamtbetrag von ${eur(total)}`,
    dueLabel ? `, fällig: ${dueLabel}` : '',
    'auf das nebenstehende Konto.',
  ].filter(Boolean).join(' ')
  const issuerContact = [brand.email, brand.phone].filter(Boolean).map(String).join(', ')
  const recipientName = String(d.recipient_name || '').trim()
  const recipientContact = String(d.recipient_contact || '').trim()
  const bankLabel = brand.bank_name ? `Bankverbindung, ${String(brand.bank_name)}` : 'Bankverbindung'
  const footerLeft = `Rechnung ${opts.numberLabel}, ${esc(brandName)}${brand.vat_id ? `, St.-Nr. ${esc(brand.vat_id)}` : ''}`
  const footerRightP2 = `Rechnung ${opts.numberLabel}, ${esc(brandName)}${brand.address ? `, ${esc(String(brand.address).replace(/\n/g, ', '))}` : ''}`

  const positionRows = positions.map((p, i) => {
    const lineTotal = (Number(p.qty) || 0) * (Number(p.unit_price) || 0)
    const lines = String(p.description || '').split('\n')
    const title = lines[0] || '—'
    const detail = lines.slice(1).join('\n')
    return `<tr>
      <td class="pos-no">${String(i + 1).padStart(2, '0')}</td>
      <td class="pos-desc">
        <div class="pos-title">${esc(title)}</div>
        ${detail ? `<div class="pos-detail">${nl2br(detail)}</div>` : ''}
      </td>
      <td class="pos-qty">${esc(p.qty)}</td>
      <td class="pos-price">${eur(Number(p.unit_price) || 0)}</td>
      <td class="pos-amt">${eur(lineTotal)}</td>
    </tr>`
  }).join('')

  return `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8">
<title>Rechnung ${esc(opts.numberLabel)}</title>
<style>
  @font-face {
    font-family: 'Aeonik';
    src: url('/fonts/Aeonik-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Aeonik';
    src: url('/fonts/Aeonik-Medium.ttf') format('truetype');
    font-weight: 500;
    font-style: normal;
  }
  @page { size: A4; margin: 16mm 18mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #111; }
  body {
    font-family: 'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 10.5pt;
    font-weight: 400;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { page-break-after: always; min-height: 257mm; position: relative; padding-bottom: 18mm; }
  .sheet:last-child { page-break-after: auto; }
  .runhead {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    font-size: 9pt; letter-spacing: -0.01em; color: #6e6e73;
    margin-bottom: 18mm;
  }
  .runhead .mark { font-weight: 500; max-width: 48%; color: #111; }
  .runhead .topic { text-align: right; max-width: 48%; }
  .hero-title {
    font-size: 38pt; font-weight: 400; letter-spacing: -0.04em;
    margin: 0 0 2mm; line-height: 0.95;
  }
  .hero-number { font-size: 11pt; margin-bottom: 10mm; color: #111; }
  .meta-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10mm 16mm;
    margin-bottom: 12mm; max-width: 120mm;
  }
  .meta-label {
    font-size: 9pt; font-weight: 500; letter-spacing: -0.01em;
    color: #6e6e73; margin-bottom: 2.5mm;
  }
  .meta-value { font-size: 10.5pt; }
  .party-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12mm;
    margin-bottom: 10mm;
  }
  .party-label {
    font-size: 9pt; font-weight: 500; letter-spacing: -0.01em;
    color: #6e6e73; margin-bottom: 3.5mm;
  }
  .party strong { font-weight: 600; }
  .party p { margin: 0 0 1.5mm; }
  .party .contact { color: #333; }
  .party .empty { color: #9a9aa0; font-weight: 400; }
  .invoice-title {
    margin: 0 0 8mm;
  }
  .invoice-title .meta-label { margin-bottom: 2mm; }
  .invoice-title .value {
    font-size: 14pt; font-weight: 500; letter-spacing: -0.02em;
  }
  table.items { width: 100%; border-collapse: collapse; margin-top: 4mm; }
  table.items thead th {
    font-size: 9pt; letter-spacing: -0.01em; color: #6e6e73;
    text-align: left; font-weight: 500; padding: 0 0 3mm;
    border-bottom: 1px solid #111;
  }
  table.items thead th.qty,
  table.items thead th.price,
  table.items thead th.amt { text-align: right; }
  table.items tbody td { padding: 4mm 0; vertical-align: top; border-bottom: 1px solid #e8e8e8; }
  .pos-no { width: 10mm; font-size: 10pt; }
  .pos-desc { width: auto; padding-right: 6mm; }
  .pos-title { font-weight: 500; margin-bottom: 1mm; }
  .pos-detail { font-size: 9.5pt; color: #333; line-height: 1.5; }
  .pos-qty { width: 16mm; text-align: right; white-space: nowrap; }
  .pos-price { width: 24mm; text-align: right; white-space: nowrap; }
  .pos-amt { width: 24mm; text-align: right; white-space: nowrap; }
  .totals { width: 100%; border-collapse: collapse; margin-top: 2mm; }
  .totals td { padding: 2.5mm 0; border: 0; }
  .totals .label { text-align: right; padding-right: 8mm; color: #111; }
  .totals .val { text-align: right; width: 24mm; white-space: nowrap; }
  .totals .sub { font-size: 9pt; color: #444; padding-right: 8mm; text-align: right; }
  .totals .grand td { padding-top: 4mm; font-weight: 600; border-top: 1px solid #111; }
  .page-foot {
    position: absolute; left: 0; right: 0; bottom: 0;
    display: flex; justify-content: space-between; align-items: flex-end; gap: 12px;
    font-size: 8pt; letter-spacing: -0.01em; color: #6e6e73;
    border-top: 1px solid #111; padding-top: 3mm;
  }
  .page-foot .pagenum { letter-spacing: 0; white-space: nowrap; }
  .pay-hero { margin-bottom: 8mm; }
  .pay-hero h2 {
    font-size: 28pt; font-weight: 400; letter-spacing: -0.03em; margin: 0 0 2mm;
  }
  .pay-hero p { margin: 0; font-size: 11pt; }
  .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; }
  .pay-section-label {
    font-size: 9pt; font-weight: 500; letter-spacing: -0.01em;
    color: #6e6e73; margin-bottom: 4mm;
  }
  .kv { width: 100%; border-collapse: collapse; }
  .kv td { padding: 1.5mm 0; vertical-align: top; font-size: 10pt; }
  .kv td:first-child { width: 34mm; color: #333; }
  .pay-ref-box {
    margin-top: 3mm;
    padding: 4mm 5mm;
    background: #f5f5f7;
    border-left: 3px solid #111;
  }
  .pay-ref-box .ref-label {
    font-size: 9pt; font-weight: 500; letter-spacing: -0.01em;
    color: #6e6e73; margin-bottom: 2mm;
  }
  .pay-ref-box .ref-value { font-size: 11pt; font-weight: 500; margin: 0; }
  .pay-terms { font-size: 10.5pt; line-height: 1.5; }
  .legal {
    margin-top: 12mm; padding-top: 4mm; border-top: 1px solid #e5e5e5;
    font-size: 8.5pt; color: #444; line-height: 1.55;
  }
  @media screen {
    body { background: #ececee; padding: 28px 16px; }
    .sheet {
      width: 210mm; max-width: 100%; min-height: 297mm; margin: 0 auto 24px; background: #fff;
      padding: 16mm 18mm 18mm; box-shadow: 0 8px 32px rgba(0,0,0,.08);
      border-radius: 2px;
    }
    .page-foot { position: static; margin-top: 18mm; }
  }
</style>
</head>
<body>

<section class="sheet">
  <div class="runhead">
    <div class="mark">${esc(initials)}, ${esc(brandName)}</div>
    <div class="topic">Rechnung, ${esc(monthLabel)}</div>
  </div>

  <h1 class="hero-title">Rechnung.</h1>
  <div class="hero-number">${esc(opts.numberLabel)}</div>

  <div class="meta-grid">
    <div>
      <div class="meta-label">Rechnungsdatum</div>
      <div class="meta-value">${d.date ? fmtDateShort(d.date) : '—'}</div>
    </div>
    <div>
      <div class="meta-label">Fälligkeit</div>
      <div class="meta-value">${dueLabel ? esc(dueLabel) : '—'}</div>
    </div>
  </div>

  <div class="party-grid">
    <div class="party">
      <div class="party-label">Rechnungssteller</div>
      <p><strong>${esc(brandName)}</strong></p>
      ${brand.address ? `<p>${nl2br(brand.address)}</p>` : ''}
      ${issuerContact ? `<p class="contact">${esc(issuerContact)}</p>` : ''}
      ${brand.vat_id ? `<p class="contact">Steuernummer (USt-IdNr.): ${esc(brand.vat_id)}</p>` : ''}
    </div>
    <div class="party">
      <div class="party-label">Rechnungsempfänger</div>
      <p><strong class="${recipientName ? '' : 'empty'}">${esc(recipientName || '—')}</strong></p>
      ${d.recipient_address ? `<p>${nl2br(d.recipient_address)}</p>` : ''}
      ${recipientContact ? `<p class="contact">${esc(recipientContact)}</p>` : ''}
      ${d.recipient_email && !recipientContact.includes(String(d.recipient_email))
        ? `<p class="contact">${esc(d.recipient_email)}</p>`
        : ''}
    </div>
  </div>

  ${invoiceTitle ? `<div class="invoice-title">
    <div class="meta-label">Rechnungstitel</div>
    <div class="value">${esc(invoiceTitle)}</div>
  </div>` : ''}

  <table class="items">
    <thead>
      <tr>
        <th>Pos.</th>
        <th>Leistung</th>
        <th class="qty">Menge</th>
        <th class="price">Einzelpreis</th>
        <th class="amt">Betrag netto</th>
      </tr>
    </thead>
    <tbody>${positionRows || `<tr><td colspan="5" style="color:#9a9aa0;padding:6mm 0;">Noch keine Positionen.</td></tr>`}</tbody>
  </table>

  <table class="totals">
    <tr>
      <td class="label">Zwischensumme netto</td>
      <td class="val">${eur(total)}</td>
    </tr>
    <tr>
      <td class="label">Umsatzsteuer</td>
      <td class="val">0,00 €</td>
    </tr>
    ${taxNote ? `<tr>
      <td class="sub" colspan="1">${esc(taxNote)}</td>
      <td></td>
    </tr>` : ''}
    <tr class="grand">
      <td class="label">Gesamtbetrag</td>
      <td class="val">${eur(total)}</td>
    </tr>
  </table>

  <footer class="page-foot">
    <span>${footerLeft}</span>
    <span class="pagenum">01 / 02</span>
  </footer>
</section>

<section class="sheet">
  <div class="runhead">
    <div class="mark">${esc(initials)}, ${esc(brandName)}</div>
    <div class="topic">Zahlung, Bankverbindung</div>
  </div>

  <div class="pay-hero">
    <h2>Bankverbindung und Konditionen.</h2>
    <p>Rechnung ${esc(opts.numberLabel)}, Gesamtbetrag ${eur(total)}${dueLabel ? `, fällig ${esc(dueLabel)}` : ''}.</p>
  </div>

  <div class="pay-grid">
    <div>
      <div class="pay-section-label">${esc(bankLabel)}</div>
      <table class="kv">
        <tr><td>Kontoinhaber</td><td>${esc(brandName)}</td></tr>
        ${brand.iban ? `<tr><td>IBAN</td><td>${nl2br(brand.iban)}</td></tr>` : ''}
        ${brand.bic ? `<tr><td>BIC</td><td>${esc(brand.bic)}</td></tr>` : ''}
      </table>
      <div class="pay-ref-box">
        <div class="ref-label">Verwendungszweck</div>
        <p class="ref-value">${esc(paymentRef)}</p>
      </div>
    </div>
    <div>
      <div class="pay-section-label">Zahlungsbedingungen</div>
      <div class="pay-terms">${nl2br(paymentTerms)}</div>
    </div>
  </div>

  ${taxNote ? `<div class="legal">${esc(taxNote)}</div>` : ''}

  <footer class="page-foot">
    <span>${footerRightP2}</span>
    <span class="pagenum">02 / 02</span>
  </footer>
</section>

</body></html>`
}
