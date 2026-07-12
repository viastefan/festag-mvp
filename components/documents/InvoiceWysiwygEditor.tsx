'use client'

import { Plus } from '@phosphor-icons/react'
import TagroFieldAssist from '@/components/tagro/TagroFieldAssist'
import { INVOICE_WYSIWYG_CSS } from '@/components/documents/invoice-wysiwyg-styles'
import { issuerDisplayName, EMPTY_ISSUER, type InvoiceIssuer } from '@/lib/documents/issuer'
import { fmtDateShort, fmtMonthYear, monogram } from '@/lib/documents/invoice-format'
import { eur, invoiceTotals, type DocPosition } from '@/lib/documents/templates'

type ClientStub = {
  id: string
  name: string
  primary_contact_name?: string | null
  primary_contact_email?: string | null
  primary_contact_phone?: string | null
}
type ProjectStub = { id: string; title: string; client_id?: string | null }

type Props = {
  numberDraft: string
  sheetClass?: string
  data: Record<string, unknown>
  positions: DocPosition[]
  locked: boolean
  issuer: InvoiceIssuer | null
  brandName: string
  clients: ClientStub[]
  projects: ProjectStub[]
  clientId: string
  projectId: string
  tagroFilledFields?: Set<string>
  onNumberChange: (value: string) => void
  onNumberCommit: () => void
  onClientChange: (id: string) => void
  onProjectChange: (id: string) => void
  onField: (key: string, val: unknown) => void
  onPos: (i: number, key: keyof DocPosition, val: unknown) => void
  onAddPos: () => void
  onRemovePos: (i: number) => void
  onIssuerField: (key: keyof InvoiceIssuer, val: string) => void
  onEditIssuer?: () => void
}

function PartyField({
  label,
  value,
  locked,
  placeholder,
  type = 'text',
  onChange,
}: {
  label: string
  value: string
  locked: boolean
  placeholder?: string
  type?: string
  onChange: (val: string) => void
}) {
  return (
    <label className="iwy-party-field">
      <span className="iwy-party-field-label">{label}</span>
      <input
        className="iwy-party-input"
        type={type}
        disabled={locked}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export default function InvoiceWysiwygEditor({
  numberDraft,
  sheetClass = 'doc-sheet--light',
  data,
  positions,
  locked,
  issuer,
  brandName,
  clients,
  projects,
  clientId,
  projectId,
  tagroFilledFields,
  onNumberChange,
  onNumberCommit,
  onClientChange,
  onProjectChange,
  onField,
  onPos,
  onAddPos,
  onRemovePos,
  onIssuerField,
  onEditIssuer,
}: Props) {
  const iss = issuer || EMPTY_ISSUER
  const name = issuerDisplayName(iss) || brandName || 'Rechnungssteller'
  const initials = monogram(name)
  const monthLabel = fmtMonthYear(data.date) || fmtMonthYear(new Date().toISOString())
  const dueLabel = String(data.due_terms || '').trim() || (data.due_date ? fmtDateShort(data.due_date) : '')
  const taxNoteDisplay = String(data.tax_note || '').trim() || String(iss.defaultTaxNote || '').trim()
  const taxNoteDraft = String(data.tax_note ?? '')
  const paymentRef = String(data.payment_reference || numberDraft).trim()
  const { net: total, vat: vatAmount, gross: grandTotal, rate: vatRate } = invoiceTotals(positions, data.vat_rate)
  const invoiceHeading = String(data.invoice_heading ?? '').trim() || 'Rechnung.'
  const footerLeft = `Rechnung ${numberDraft || '—'}, ${name}${iss.vatId ? `, USt-IdNr. ${iss.vatId}` : ''}`

  const defaultPaymentTerms = String(data.payment_terms || '').trim()
    || iss.defaultPaymentTerms
    || [
      `Bitte überweisen Sie den Gesamtbetrag von ${eur(grandTotal)}`,
      dueLabel ? `, fällig: ${dueLabel}` : '',
      'auf das nebenstehende Konto.',
    ].filter(Boolean).join(' ')

  return (
    <div className="iwy-stage">
      <style>{INVOICE_WYSIWYG_CSS}</style>
      <div className="iwy-canvas">
        <article className={`iwy-sheet ${sheetClass}`} aria-label="Rechnung Seite 1">
          <div className="iwy-runhead">
            <div className="mark">{initials}, {name}</div>
            <div className="topic">Rechnung, {monthLabel}</div>
          </div>

          <input
            className="iwy-hero-title iwy-hero-input"
            disabled={locked}
            value={invoiceHeading}
            aria-label="Dokumenttitel"
            onChange={(e) => onField('invoice_heading', e.target.value)}
          />
          <input
            className="iwy-hero-number iwy-hero-input"
            disabled={locked}
            value={numberDraft}
            aria-label="Rechnungsnummer"
            onChange={(e) => onNumberChange(e.target.value)}
            onBlur={() => onNumberCommit()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onNumberCommit()
              }
            }}
          />

          <div className="iwy-meta-grid iwy-meta-grid--3">
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
                placeholder="z. B. 14 Tage nach Erhalt"
                onChange={(e) => onField('due_terms', e.target.value)}
              />
            </label>
            <label className="iwy-field">
              <span className="iwy-meta-label">Fällig am</span>
              <input
                className="iwy-meta-value"
                type="date"
                disabled={locked}
                value={String(data.due_date ?? '')}
                onChange={(e) => onField('due_date', e.target.value)}
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
              <PartyField label="Name oder Firma" value={iss.name} locked={locked} placeholder="Festag GmbH" onChange={(v) => onIssuerField('name', v)} />
              <PartyField label="Rechtsform" value={iss.legalForm} locked={locked} placeholder="GmbH" onChange={(v) => onIssuerField('legalForm', v)} />
              <PartyField label="Straße" value={iss.addressLine} locked={locked} placeholder="Musterstraße 1" onChange={(v) => onIssuerField('addressLine', v)} />
              <div className="iwy-party-row">
                <PartyField label="PLZ" value={iss.zip} locked={locked} placeholder="10115" onChange={(v) => onIssuerField('zip', v)} />
                <PartyField label="Ort" value={iss.city} locked={locked} placeholder="Berlin" onChange={(v) => onIssuerField('city', v)} />
              </div>
              <PartyField label="Land" value={iss.country} locked={locked} placeholder="Deutschland" onChange={(v) => onIssuerField('country', v)} />
              <PartyField label="E-Mail" value={iss.email} locked={locked} type="email" placeholder="rechnung@firma.de" onChange={(v) => onIssuerField('email', v)} />
              <PartyField label="Telefon" value={iss.phone} locked={locked} placeholder="+49 …" onChange={(v) => onIssuerField('phone', v)} />
              <PartyField label="Website" value={iss.website} locked={locked} placeholder="festag.app" onChange={(v) => onIssuerField('website', v)} />
              <PartyField label="USt-IdNr." value={iss.vatId} locked={locked} placeholder="DE123456789" onChange={(v) => onIssuerField('vatId', v)} />
              <PartyField label="Steuernummer" value={iss.taxNumber} locked={locked} onChange={(v) => onIssuerField('taxNumber', v)} />
              <PartyField label="Geschäftsführer" value={iss.managingDirector} locked={locked} onChange={(v) => onIssuerField('managingDirector', v)} />
              <PartyField label="Handelsregister" value={iss.registerInfo} locked={locked} placeholder="HRB …" onChange={(v) => onIssuerField('registerInfo', v)} />
              {!locked && onEditIssuer && (
                <button type="button" className="iwy-party-edit" onClick={onEditIssuer}>
                  Alle Felder im Dialog
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
                  placeholder="Ansprechpartner, Telefon"
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
                          inlineOnly
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
                <td className="label iwy-vat-label">
                  <span>Umsatzsteuer</span>
                  {!locked ? (
                    <label className="iwy-vat-rate">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        disabled={locked}
                        value={String(data.vat_rate ?? '')}
                        placeholder="0"
                        onChange={(e) => onField('vat_rate', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                      <span>%</span>
                    </label>
                  ) : vatRate > 0 ? (
                    <span className="iwy-vat-rate-read">{vatRate} %</span>
                  ) : null}
                </td>
                <td className="val">{eur(vatAmount)}</td>
              </tr>
              {taxNoteDisplay ? (
                <tr className="sub">
                  <td className="label">{taxNoteDisplay}</td>
                  <td />
                </tr>
              ) : null}
              <tr className="grand">
                <td className="label">Gesamtbetrag</td>
                <td className="val">{eur(grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          <footer className="iwy-page-foot">
            <span>{footerLeft}</span>
            <span className="pagenum">01 / 02</span>
          </footer>
        </article>

        <article className={`iwy-sheet ${sheetClass}`} aria-label="Rechnung Seite 2">
          <div className="iwy-runhead">
            <div className="mark">{initials}, {name}</div>
            <div className="topic">Zahlung, Bankverbindung</div>
          </div>

          <div className="iwy-pay-hero">
            <h2>Bankverbindung und Konditionen.</h2>
            <p>
              Rechnung {numberDraft || '—'}, Gesamtbetrag {eur(grandTotal)}
              {dueLabel ? `, fällig ${dueLabel}` : ''}.
            </p>
          </div>

          <div className="iwy-pay-grid">
            <div>
              <div className="iwy-pay-section-label">Bankverbindung</div>
              <div className="iwy-kv-fields">
                <PartyField label="Bank" value={iss.bankName} locked={locked} placeholder="Commerzbank" onChange={(v) => onIssuerField('bankName', v)} />
                <PartyField label="Kontoinhaber" value={iss.accountHolder} locked={locked} onChange={(v) => onIssuerField('accountHolder', v)} />
                <PartyField label="IBAN" value={iss.iban} locked={locked} placeholder="DE89 …" onChange={(v) => onIssuerField('iban', v)} />
                <PartyField label="BIC" value={iss.bic} locked={locked} placeholder="COBADEFFXXX" onChange={(v) => onIssuerField('bic', v)} />
              </div>
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
              value={taxNoteDraft}
              placeholder={iss.defaultTaxNote || 'Optional, z. B. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'}
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
