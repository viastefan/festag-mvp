'use client'

import { Plus } from '@phosphor-icons/react'
import TagroFieldAssist from '@/components/tagro/TagroFieldAssist'
import { INVOICE_WYSIWYG_CSS } from '@/components/documents/invoice-wysiwyg-styles'
import { issuerAddressBlock, issuerDisplayName, issuerLegalLines, EMPTY_ISSUER, type InvoiceIssuer } from '@/lib/documents/issuer'
import { fmtDateShort, fmtMonthYear, monogram } from '@/lib/documents/invoice-format'
import { eur, type DocPosition } from '@/lib/documents/templates'

type ClientStub = {
  id: string
  name: string
  primary_contact_name?: string | null
  primary_contact_email?: string | null
  primary_contact_phone?: string | null
}
type ProjectStub = { id: string; title: string; client_id?: string | null }

type Props = {
  numberLabel: string
  data: Record<string, unknown>
  positions: DocPosition[]
  total: number
  locked: boolean
  issuer: InvoiceIssuer | null
  brandName: string
  clients: ClientStub[]
  projects: ProjectStub[]
  clientId: string
  projectId: string
  tagroFilledFields?: Set<string>
  onClientChange: (id: string) => void
  onProjectChange: (id: string) => void
  onField: (key: string, val: unknown) => void
  onPos: (i: number, key: keyof DocPosition, val: unknown) => void
  onAddPos: () => void
  onRemovePos: (i: number) => void
  onEditIssuer: () => void
}

export default function InvoiceWysiwygEditor({
  numberLabel,
  data,
  positions,
  total,
  locked,
  issuer,
  brandName,
  clients,
  projects,
  clientId,
  projectId,
  tagroFilledFields,
  onClientChange,
  onProjectChange,
  onField,
  onPos,
  onAddPos,
  onRemovePos,
  onEditIssuer,
}: Props) {
  const name = issuerDisplayName(issuer || EMPTY_ISSUER) || brandName || 'Rechnungssteller'
  const initials = monogram(name)
  const monthLabel = fmtMonthYear(data.date) || fmtMonthYear(new Date().toISOString())
  const dueLabel = String(data.due_terms || '').trim() || (data.due_date ? fmtDateShort(data.due_date) : '')
  const issuerContact = [issuer?.email, issuer?.phone].filter(Boolean).join(', ')
  const issuerAddress = issuerAddressBlock(issuer || EMPTY_ISSUER)
  const legalLines = issuer ? issuerLegalLines(issuer) : []
  const taxNote = String(data.tax_note || '').trim() || String(issuer?.defaultTaxNote || '').trim()
  const paymentRef = String(data.payment_reference || numberLabel).trim()
  const bankLabel = issuer?.bankName ? `Bankverbindung, ${issuer.bankName}` : 'Bankverbindung'
  const accountHolder = issuer?.accountHolder?.trim() || name
  const footerLeft = `Rechnung ${numberLabel}, ${name}${issuer?.vatId ? `, USt-IdNr. ${issuer.vatId}` : ''}`

  const defaultPaymentTerms = String(data.payment_terms || '').trim()
    || issuer?.defaultPaymentTerms
    || [
      `Bitte überweisen Sie den Gesamtbetrag von ${eur(total)}`,
      dueLabel ? `, fällig: ${dueLabel}` : '',
      'auf das nebenstehende Konto.',
    ].filter(Boolean).join(' ')

  return (
    <div className="iwy-stage">
      <style>{INVOICE_WYSIWYG_CSS}</style>
      <div className="iwy-canvas">
        <article className="iwy-sheet" aria-label="Rechnung Seite 1">
          <div className="iwy-runhead">
            <div className="mark">{initials}, {name}</div>
            <div className="topic">Rechnung, {monthLabel}</div>
          </div>

          <h1 className="iwy-hero-title">Rechnung.</h1>
          <div className="iwy-hero-number">{numberLabel}</div>

          <div className="iwy-meta-grid">
            <label className="iwy-field">
              <span className="iwy-meta-label">Rechnungsdatum</span>
              <input
                className="iwy-meta-value"
                type="date"
                disabled={locked}
                value={String(data.date ?? '')}
                onChange={(e) => onField('date', e.target.value)}
              />
            </label>
            <label className="iwy-field">
              <span className="iwy-meta-label">Fälligkeit</span>
              <input
                className="iwy-meta-value"
                disabled={locked}
                value={String(data.due_terms ?? '')}
                placeholder="z. B. Mit Vertragsunterzeichnung"
                onChange={(e) => onField('due_terms', e.target.value)}
              />
            </label>
          </div>

          <div className="iwy-client-bar">
            <label>
              Kunde
              <select disabled={locked} value={clientId} onChange={(e) => onClientChange(e.target.value)}>
                <option value="">Kontakt auswählen</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>
              Projekt
              <select disabled={locked} value={projectId} onChange={(e) => onProjectChange(e.target.value)}>
                <option value="">Projekt auswählen</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
          </div>

          <div className="iwy-party-grid">
            <div className="iwy-party">
              <div className="iwy-party-label">Rechnungssteller</div>
              <p><strong>{name}</strong></p>
              {issuerAddress ? <p>{issuerAddress}</p> : null}
              {issuerContact ? <p className="contact">{issuerContact}</p> : null}
              {legalLines.map((line) => <p key={line} className="contact">{line}</p>)}
              {!locked && (
                <button type="button" className="iwy-party-edit" onClick={onEditIssuer}>
                  Rechnungssteller bearbeiten
                </button>
              )}
            </div>
            <div className="iwy-party">
              <div className="iwy-party-label">Rechnungsempfänger</div>
              <div className="iwy-field">
                <input
                  disabled={locked}
                  value={String(data.recipient_name ?? '')}
                  placeholder="Name oder Firma"
                  onChange={(e) => onField('recipient_name', e.target.value)}
                />
              </div>
              <div className="iwy-field">
                <textarea
                  disabled={locked}
                  value={String(data.recipient_address ?? '')}
                  placeholder="Straße, PLZ Ort"
                  onChange={(e) => onField('recipient_address', e.target.value)}
                />
              </div>
              <div className="iwy-field">
                <input
                  disabled={locked}
                  value={String(data.recipient_contact ?? '')}
                  placeholder="E-Mail, Telefon"
                  onChange={(e) => onField('recipient_contact', e.target.value)}
                />
              </div>
              <div className="iwy-field">
                <input
                  disabled={locked}
                  type="email"
                  value={String(data.recipient_email ?? '')}
                  placeholder="E-Mail für Versand"
                  onChange={(e) => onField('recipient_email', e.target.value)}
                />
              </div>
            </div>
          </div>

          <label className="iwy-field" style={{ display: 'block', marginBottom: '8mm' }}>
            <span className="iwy-meta-label">Rechnungstitel</span>
            <input
              disabled={locked}
              value={String(data.service_period ?? '')}
              placeholder="z. B. Website-Redesign"
              onChange={(e) => onField('service_period', e.target.value)}
            />
          </label>

          <table className="iwy-items">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Leistung</th>
                <th className="qty">Menge</th>
                <th className="price">Einzelpreis</th>
                <th className="amt">Betrag netto</th>
                <th aria-hidden />
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => {
                const lineTotal = (Number(p.qty) || 0) * (Number(p.unit_price) || 0)
                return (
                  <tr key={i}>
                    <td className="pos-no">{String(i + 1).padStart(2, '0')}</td>
                    <td className="pos-desc">
                      {locked ? (
                        <textarea
                          readOnly
                          className="iwy-pos-input"
                          value={p.description}
                          rows={2}
                        />
                      ) : (
                        <TagroFieldAssist
                          hideLabel
                          label="Leistung"
                          fieldLabel="Positionsbeschreibung"
                          documentKind="Rechnung"
                          projectId={projectId}
                          multiline
                          value={p.description}
                          onChange={(v) => onPos(i, 'description', v)}
                          placeholder="Produkt oder Service beschreiben"
                          inputClassName="iwy-pos-input"
                          tagroFilled={tagroFilledFields?.has('positions')}
                        />
                      )}
                    </td>
                    <td className="pos-qty">
                      <input
                        type="number"
                        min={0}
                        disabled={locked}
                        value={p.qty}
                        onChange={(e) => onPos(i, 'qty', Number(e.target.value))}
                      />
                    </td>
                    <td className="pos-price">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={locked}
                        value={p.unit_price}
                        onChange={(e) => onPos(i, 'unit_price', Number(e.target.value))}
                      />
                    </td>
                    <td className="pos-amt">{eur(lineTotal)}</td>
                    <td>
                      {!locked && positions.length > 1 && (
                        <button type="button" className="pos-del" onClick={() => onRemovePos(i)} aria-label="Position entfernen">×</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!locked && (
            <button type="button" className="iwy-add-row" onClick={onAddPos}>
              <Plus size={13} weight="bold" />
              Position hinzufügen
            </button>
          )}

          <table className="iwy-totals">
            <tbody>
              <tr>
                <td className="label">Zwischensumme netto</td>
                <td className="val">{eur(total)}</td>
              </tr>
              <tr>
                <td className="label">Umsatzsteuer</td>
                <td className="val">0,00 €</td>
              </tr>
              {taxNote ? (
                <tr className="sub">
                  <td className="label">{taxNote}</td>
                  <td />
                </tr>
              ) : null}
              <tr className="grand">
                <td className="label">Gesamtbetrag</td>
                <td className="val">{eur(total)}</td>
              </tr>
            </tbody>
          </table>

          <footer className="iwy-page-foot">
            <span>{footerLeft}</span>
            <span className="pagenum">01 / 02</span>
          </footer>
        </article>

        <article className="iwy-sheet" aria-label="Rechnung Seite 2">
          <div className="iwy-runhead">
            <div className="mark">{initials}, {name}</div>
            <div className="topic">Zahlung, Bankverbindung</div>
          </div>

          <div className="iwy-pay-hero">
            <h2>Bankverbindung und Konditionen.</h2>
            <p>
              Rechnung {numberLabel}, Gesamtbetrag {eur(total)}
              {dueLabel ? `, fällig ${dueLabel}` : ''}.
            </p>
          </div>

          <div className="iwy-pay-grid">
            <div>
              <div className="iwy-pay-section-label">{bankLabel}</div>
              <table className="iwy-kv">
                <tbody>
                  <tr><td>Kontoinhaber</td><td>{accountHolder}</td></tr>
                  {issuer?.iban ? <tr><td>IBAN</td><td>{issuer.iban}</td></tr> : null}
                  {issuer?.bic ? <tr><td>BIC</td><td>{issuer.bic}</td></tr> : null}
                </tbody>
              </table>
              <div className="iwy-ref-box">
                <div className="ref-label">Verwendungszweck</div>
                <div className="iwy-field">
                  <input
                    disabled={locked}
                    value={paymentRef}
                    onChange={(e) => onField('payment_reference', e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="iwy-pay-section-label">Zahlungsbedingungen</div>
              <div className="iwy-field">
                <textarea
                  disabled={locked}
                  value={String(data.payment_terms ?? '')}
                  placeholder={defaultPaymentTerms}
                  onChange={(e) => onField('payment_terms', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="iwy-field iwy-legal">
            <span className="iwy-pay-section-label">Geschäftsbedingungen</span>
            <textarea
              disabled={locked}
              value={taxNote}
              placeholder="Optional, z. B. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
              onChange={(e) => onField('tax_note', e.target.value)}
            />
          </div>

          <footer className="iwy-page-foot">
            <span>{footerLeft}</span>
            <span className="pagenum">02 / 02</span>
          </footer>
        </article>
      </div>
    </div>
  )
}
