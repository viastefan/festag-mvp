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

function TagroTextField({
  label,
  fieldLabel,
  value,
  onChange,
  locked,
  placeholder,
  multiline = false,
  rows = 2,
  projectId,
  tagroFilled,
  tagro = true,
  inputClassName = '',
  hideLabel = false,
  className = '',
  inputType = 'text',
}: {
  label: string
  fieldLabel?: string
  value: string
  onChange: (val: string) => void
  locked: boolean
  placeholder?: string
  multiline?: boolean
  rows?: number
  projectId: string
  tagroFilled?: boolean
  tagro?: boolean
  inputClassName?: string
  hideLabel?: boolean
  className?: string
  inputType?: 'text' | 'email'
}) {
  const useTagro = tagro && !locked && inputType === 'text'

  if (!useTagro) {
    if (multiline) {
      return (
        <label className={`iwy-field${className ? ` ${className}` : ''}`}>
          {!hideLabel && <span className="iwy-meta-label">{label}</span>}
          <textarea
            className={inputClassName}
            disabled={locked}
            readOnly={locked}
            value={value}
            placeholder={placeholder}
            rows={rows}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      )
    }
    return (
      <label className={`iwy-party-field${className ? ` ${className}` : ''}`}>
        {!hideLabel && <span className="iwy-party-field-label">{label}</span>}
        <input
          className={inputClassName || 'iwy-party-input'}
          type={inputType}
          disabled={locked}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    )
  }

  return (
    <TagroFieldAssist
      inlineOnly
      hideLabel={hideLabel}
      label={label}
      fieldLabel={fieldLabel || label}
      documentKind="Rechnung"
      projectId={projectId}
      multiline={multiline}
      rows={rows}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      inputClassName={inputClassName || undefined}
      tagroFilled={tagroFilled}
      className={`iwy-tagro-field${hideLabel ? ' tfa-pos' : ''}${className ? ` ${className}` : ''}`}
    />
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

          {locked ? (
            <input
              className="iwy-hero-title iwy-hero-input"
              disabled
              value={invoiceHeading}
              aria-label="Dokumenttitel"
              readOnly
            />
          ) : (
            <TagroTextField
              hideLabel
              label="Dokumenttitel"
              fieldLabel="Dokumenttitel"
              value={invoiceHeading}
              onChange={(v) => onField('invoice_heading', v)}
              locked={false}
              projectId={projectId}
              tagroFilled={tagroFilledFields?.has('invoice_heading')}
              inputClassName="iwy-hero-input iwy-hero-title"
              className="iwy-tagro-field--hero"
            />
          )}
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
            <div className="iwy-field">
              <TagroTextField
                label="Fälligkeit"
                fieldLabel="Fälligkeit"
                value={String(data.due_terms ?? '')}
                onChange={(v) => onField('due_terms', v)}
                locked={locked}
                placeholder="z. B. 14 Tage nach Erhalt"
                projectId={projectId}
                tagroFilled={tagroFilledFields?.has('due_terms')}
                inputClassName="iwy-meta-value"
                className="iwy-tagro-field--meta"
              />
            </div>
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
              <TagroTextField label="Name oder Firma" value={iss.name} locked={locked} placeholder="Festag GmbH" projectId={projectId} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('name', v)} />
              <TagroTextField label="Rechtsform" value={iss.legalForm} locked={locked} placeholder="GmbH" projectId={projectId} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('legalForm', v)} />
              <TagroTextField label="Straße" value={iss.addressLine} locked={locked} placeholder="Musterstraße 1" projectId={projectId} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('addressLine', v)} />
              <div className="iwy-party-row">
                <TagroTextField label="PLZ" value={iss.zip} locked={locked} placeholder="10115" projectId={projectId} tagro={false} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('zip', v)} />
                <TagroTextField label="Ort" value={iss.city} locked={locked} placeholder="Berlin" projectId={projectId} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('city', v)} />
              </div>
              <TagroTextField label="Land" value={iss.country} locked={locked} placeholder="Deutschland" projectId={projectId} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('country', v)} />
              <TagroTextField label="E-Mail" value={iss.email} locked={locked} inputType="email" tagro={false} placeholder="rechnung@firma.de" projectId={projectId} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('email', v)} />
              <TagroTextField label="Telefon" value={iss.phone} locked={locked} tagro={false} placeholder="+49 …" projectId={projectId} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('phone', v)} />
              <TagroTextField label="Website" value={iss.website} locked={locked} placeholder="festag.app" projectId={projectId} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('website', v)} />
              <TagroTextField label="USt-IdNr." value={iss.vatId} locked={locked} tagro={false} placeholder="DE123456789" projectId={projectId} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('vatId', v)} />
              <TagroTextField label="Steuernummer" value={iss.taxNumber} locked={locked} tagro={false} projectId={projectId} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('taxNumber', v)} />
              <TagroTextField label="Geschäftsführer" value={iss.managingDirector} locked={locked} projectId={projectId} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('managingDirector', v)} />
              <TagroTextField label="Handelsregister" value={iss.registerInfo} locked={locked} placeholder="HRB …" projectId={projectId} className="iwy-tagro-field--party" onChange={(v) => onIssuerField('registerInfo', v)} />
              {!locked && onEditIssuer && (
                <button type="button" className="iwy-party-edit" onClick={onEditIssuer}>
                  Alle Felder im Dialog
                </button>
              )}
            </div>
            <div className="iwy-party">
              <div className="iwy-party-label">Rechnungsempfänger</div>
              <TagroTextField
                label="Name oder Firma"
                fieldLabel="Empfänger Name"
                value={String(data.recipient_name ?? '')}
                onChange={(v) => onField('recipient_name', v)}
                locked={locked}
                placeholder="Name oder Firma"
                projectId={projectId}
                tagroFilled={tagroFilledFields?.has('recipient_name')}
                className="iwy-tagro-field--party"
              />
              <TagroTextField
                label="Adresse"
                fieldLabel="Empfänger Adresse"
                value={String(data.recipient_address ?? '')}
                onChange={(v) => onField('recipient_address', v)}
                locked={locked}
                multiline
                placeholder="Straße, PLZ Ort"
                projectId={projectId}
                tagroFilled={tagroFilledFields?.has('recipient_address')}
                className="iwy-tagro-field--party"
              />
              <TagroTextField
                label="Kontakt"
                fieldLabel="Empfänger Kontakt"
                value={String(data.recipient_contact ?? '')}
                onChange={(v) => onField('recipient_contact', v)}
                locked={locked}
                placeholder="Ansprechpartner, Telefon"
                projectId={projectId}
                tagroFilled={tagroFilledFields?.has('recipient_contact')}
                className="iwy-tagro-field--party"
              />
              <TagroTextField
                label="E-Mail für Versand"
                value={String(data.recipient_email ?? '')}
                onChange={(v) => onField('recipient_email', v)}
                locked={locked}
                inputType="email"
                tagro={false}
                placeholder="E-Mail für Versand"
                projectId={projectId}
                className="iwy-tagro-field--party"
              />
            </div>
          </div>

          <div style={{ marginBottom: '8mm' }}>
            <TagroTextField
              label="Rechnungstitel"
              fieldLabel="Rechnungstitel"
              value={String(data.service_period ?? '')}
              onChange={(v) => onField('service_period', v)}
              locked={locked}
              placeholder="z. B. Website-Redesign"
              projectId={projectId}
              tagroFilled={tagroFilledFields?.has('service_period')}
              className="iwy-tagro-field--title"
            />
          </div>

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
                <TagroTextField label="Bank" value={iss.bankName} locked={locked} placeholder="Commerzbank" projectId={projectId} onChange={(v) => onIssuerField('bankName', v)} />
                <TagroTextField label="Kontoinhaber" value={iss.accountHolder} locked={locked} projectId={projectId} onChange={(v) => onIssuerField('accountHolder', v)} />
                <TagroTextField label="IBAN" value={iss.iban} locked={locked} tagro={false} placeholder="DE89 …" projectId={projectId} onChange={(v) => onIssuerField('iban', v)} />
                <TagroTextField label="BIC" value={iss.bic} locked={locked} tagro={false} placeholder="COBADEFFXXX" projectId={projectId} onChange={(v) => onIssuerField('bic', v)} />
              </div>
              <div className="iwy-ref-box">
                <TagroTextField
                  label="Verwendungszweck"
                  fieldLabel="Verwendungszweck"
                  value={paymentRef}
                  onChange={(v) => onField('payment_reference', v)}
                  locked={locked}
                  projectId={projectId}
                  tagroFilled={tagroFilledFields?.has('payment_reference')}
                  className="iwy-tagro-field--ref"
                />
              </div>
            </div>
            <div>
              <TagroTextField
                label="Zahlungsbedingungen"
                fieldLabel="Zahlungsbedingungen"
                value={String(data.payment_terms ?? '')}
                onChange={(v) => onField('payment_terms', v)}
                locked={locked}
                multiline
                rows={4}
                placeholder={defaultPaymentTerms}
                projectId={projectId}
                tagroFilled={tagroFilledFields?.has('payment_terms')}
                className="iwy-tagro-field--pay"
              />
            </div>
          </div>

          <TagroTextField
            label="Geschäftsbedingungen"
            fieldLabel="Geschäftsbedingungen"
            value={taxNoteDraft}
            onChange={(v) => onField('tax_note', v)}
            locked={locked}
            multiline
            rows={4}
            placeholder={iss.defaultTaxNote || 'Optional, z. B. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'}
            projectId={projectId}
            tagroFilled={tagroFilledFields?.has('tax_note')}
            className="iwy-tagro-field--legal iwy-legal"
          />

          <footer className="iwy-page-foot">
            <span>{footerLeft}</span>
            <span className="pagenum">02 / 02</span>
          </footer>
        </article>
      </div>
    </div>
  )
}
