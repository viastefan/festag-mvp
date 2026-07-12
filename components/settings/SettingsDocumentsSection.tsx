'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { fetchIssuer, patchIssuer } from '@/lib/documents/issuer-api'
import {
  EMPTY_ISSUER,
  ISSUER_LEGAL_FORMS,
  isIssuerReady,
  issuerMissingLabels,
  type InvoiceIssuer,
} from '@/lib/documents/issuer'

type Props = {
  setError: (msg: string) => void
  queueAutosave: (
    ref: MutableRefObject<ReturnType<typeof setTimeout> | null>,
    task: () => Promise<void>,
    delay?: number,
  ) => void
}

function issuerKey(issuer: InvoiceIssuer) {
  return JSON.stringify(issuer)
}

export default function SettingsDocumentsSection({ setError, queueAutosave }: Props) {
  const [issuer, setIssuer] = useState<InvoiceIssuer>(EMPTY_ISSUER)
  const [issuerReady, setIssuerReady] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const snapshotRef = useRef('')
  const hydratedRef = useRef(false)
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadIssuer = useCallback(async () => {
    setError('')
    try {
      const { res, json } = await fetchIssuer()
      if (!res.ok) {
        setError(json?.error || 'Rechnungssteller konnte nicht geladen werden.')
        setIssuer(EMPTY_ISSUER)
        setIssuerReady(false)
        snapshotRef.current = issuerKey(EMPTY_ISSUER)
        return
      }
      const next = { ...EMPTY_ISSUER, ...(json?.issuer ?? {}) } as InvoiceIssuer
      setIssuer(next)
      setIssuerReady(Boolean(json?.ready ?? isIssuerReady(next)))
      snapshotRef.current = issuerKey(next)
    } finally {
      hydratedRef.current = true
      setHydrated(true)
    }
  }, [setError])

  useEffect(() => {
    hydratedRef.current = false
    setHydrated(false)
    void loadIssuer()
    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current)
    }
  }, [loadIssuer])

  function patch<K extends keyof InvoiceIssuer>(key: K, value: InvoiceIssuer[K]) {
    setIssuer((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (!hydratedRef.current || !hydrated) return
    const key = issuerKey(issuer)
    if (key === snapshotRef.current) return

    queueAutosave(autosaveRef, async () => {
      const { res, json } = await patchIssuer(issuer)
      if (!res.ok) throw new Error(json?.error || 'Rechnungssteller konnte nicht gespeichert werden.')
      const saved = { ...EMPTY_ISSUER, ...(json?.issuer ?? {}) } as InvoiceIssuer
      setIssuer(saved)
      setIssuerReady(Boolean(json?.ready ?? isIssuerReady(saved)))
      snapshotRef.current = issuerKey(saved)
    })
  }, [issuer, hydrated, queueAutosave])

  const missing = issuerMissingLabels(issuer)
  const formDisabled = !hydrated

  return (
    <div className="set-doc-form" aria-busy={!hydrated}>
      <p className="set-section-title">Rechnungssteller</p>
      <div className="set-card">
        <div className="set-row">
          <div>
            <div className="set-label">Status</div>
            <div className="set-label-sub">Pflicht: Name, Straße und Stadt — erscheinen auf Angeboten, Rechnungen und Verträgen.</div>
          </div>
          <span className={`set-doc-status${issuerReady ? ' is-ready' : ''}`}>
            {issuerReady ? (
              <>
                <CheckCircle size={14} weight="fill" aria-hidden />
                Bereit
              </>
            ) : (
              <>
                <WarningCircle size={14} weight="fill" aria-hidden />
                Unvollständig
              </>
            )}
          </span>
        </div>

        {!issuerReady && missing.length > 0 ? (
          <div className="set-row set-row-stack">
            <div className="set-label">Noch offen</div>
            <ul className="set-doc-missing">
              {missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="set-row">
          <div className="set-label">Name oder Firma</div>
          <input
            className="set-input"
            type="text"
            value={issuer.name}
            disabled={formDisabled}
            onChange={(e) => patch('name', e.target.value)}
            placeholder="Muster Consulting"
          />
        </div>

        <div className="set-row">
          <div>
            <div className="set-label">Rechtsform</div>
            <div className="set-label-sub">Optional, z. B. GmbH oder Einzelunternehmen.</div>
          </div>
          <input
            className="set-input"
            type="text"
            list="set-doc-legal-forms"
            value={issuer.legalForm}
            disabled={formDisabled}
            onChange={(e) => patch('legalForm', e.target.value)}
            placeholder="GmbH, e.K., Einzelunternehmen"
          />
        </div>

        <div className="set-row">
          <div className="set-label">Straße und Hausnummer</div>
          <input
            className="set-input"
            type="text"
            value={issuer.addressLine}
            disabled={formDisabled}
            onChange={(e) => patch('addressLine', e.target.value)}
            placeholder="Lindenstraße 15"
          />
        </div>

        <div className="set-row">
          <div className="set-label">PLZ</div>
          <input
            className="set-input"
            type="text"
            value={issuer.zip}
            disabled={formDisabled}
            onChange={(e) => patch('zip', e.target.value)}
            placeholder="84036"
          />
        </div>

        <div className="set-row">
          <div className="set-label">Stadt</div>
          <input
            className="set-input"
            type="text"
            value={issuer.city}
            disabled={formDisabled}
            onChange={(e) => patch('city', e.target.value)}
            placeholder="Kumhausen"
          />
        </div>

        <div className="set-row">
          <div className="set-label">Land</div>
          <input
            className="set-input"
            type="text"
            value={issuer.country}
            disabled={formDisabled}
            onChange={(e) => patch('country', e.target.value)}
            placeholder="Deutschland"
          />
        </div>
      </div>

      <p className="set-section-title">Kontakt</p>
      <div className="set-card">
        <div className="set-row">
          <div>
            <div className="set-label">E-Mail</div>
            <div className="set-label-sub">Für Rückfragen zur Rechnung.</div>
          </div>
          <input
            className="set-input"
            type="email"
            value={issuer.email}
            disabled={formDisabled}
            onChange={(e) => patch('email', e.target.value)}
            placeholder="rechnung@beispiel.de"
          />
        </div>
        <div className="set-row">
          <div className="set-label">Telefon</div>
          <input
            className="set-input"
            type="tel"
            value={issuer.phone}
            disabled={formDisabled}
            onChange={(e) => patch('phone', e.target.value)}
            placeholder="+49 …"
          />
        </div>
        <div className="set-row">
          <div className="set-label">Website</div>
          <input
            className="set-input"
            type="url"
            value={issuer.website}
            disabled={formDisabled}
            onChange={(e) => patch('website', e.target.value)}
            placeholder="www.beispiel.de"
          />
        </div>
      </div>

      <p className="set-section-title">Bankverbindung</p>
      <div className="set-card">
        <div className="set-row">
          <div className="set-label">Kontoinhaber</div>
          <input
            className="set-input"
            type="text"
            value={issuer.accountHolder}
            disabled={formDisabled}
            onChange={(e) => patch('accountHolder', e.target.value)}
            placeholder={issuer.name.trim() || 'Wie Firmenname'}
          />
        </div>
        <div className="set-row">
          <div className="set-label">Bank</div>
          <input
            className="set-input"
            type="text"
            value={issuer.bankName}
            disabled={formDisabled}
            onChange={(e) => patch('bankName', e.target.value)}
            placeholder="Revolut"
          />
        </div>
        <div className="set-row">
          <div className="set-label">IBAN</div>
          <input
            className="set-input"
            type="text"
            value={issuer.iban}
            disabled={formDisabled}
            onChange={(e) => patch('iban', e.target.value)}
            placeholder="DE…"
          />
        </div>
        <div className="set-row">
          <div className="set-label">BIC</div>
          <input
            className="set-input"
            type="text"
            value={issuer.bic}
            disabled={formDisabled}
            onChange={(e) => patch('bic', e.target.value)}
            placeholder="REVODEB2"
          />
        </div>
      </div>

      <p className="set-section-title">Steuer und Register</p>
      <div className="set-card">
        <div className="set-row">
          <div className="set-label">USt-IdNr.</div>
          <input
            className="set-input"
            type="text"
            value={issuer.vatId}
            disabled={formDisabled}
            onChange={(e) => patch('vatId', e.target.value)}
            placeholder="DE123456789"
          />
        </div>
        <div className="set-row">
          <div className="set-label">Steuernummer</div>
          <input
            className="set-input"
            type="text"
            value={issuer.taxNumber}
            disabled={formDisabled}
            onChange={(e) => patch('taxNumber', e.target.value)}
            placeholder="143/123/45678"
          />
        </div>
        <div className="set-row">
          <div className="set-label">Geschäftsführer oder Inhaber</div>
          <input
            className="set-input"
            type="text"
            value={issuer.managingDirector}
            disabled={formDisabled}
            onChange={(e) => patch('managingDirector', e.target.value)}
            placeholder="Max Mustermann"
          />
        </div>
        <div className="set-row set-row-stack">
          <div className="set-label">Handelsregister</div>
          <textarea
            className="set-input"
            rows={2}
            value={issuer.registerInfo}
            disabled={formDisabled}
            onChange={(e) => patch('registerInfo', e.target.value)}
            placeholder="Amtsgericht München, HRB 123456"
            style={{ resize: 'vertical', minHeight: 56, lineHeight: 1.5 }}
          />
        </div>
      </div>

      <p className="set-section-title">Standardtexte</p>
      <div className="set-card">
        <div className="set-row set-row-stack">
          <div>
            <div className="set-label">Umsatzsteuer-Hinweis</div>
            <div className="set-label-sub">Vorausgefüllt bei neuen Rechnungen.</div>
          </div>
          <textarea
            className="set-input"
            rows={2}
            value={issuer.defaultTaxNote}
            disabled={formDisabled}
            onChange={(e) => patch('defaultTaxNote', e.target.value)}
            placeholder="Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
            style={{ resize: 'vertical', minHeight: 56, lineHeight: 1.5 }}
          />
        </div>
        <div className="set-row set-row-stack">
          <div>
            <div className="set-label">Zahlungsbedingungen</div>
            <div className="set-label-sub">Standardtext für Fälligkeit und Zahlungsweise.</div>
          </div>
          <textarea
            className="set-input"
            rows={2}
            value={issuer.defaultPaymentTerms}
            disabled={formDisabled}
            onChange={(e) => patch('defaultPaymentTerms', e.target.value)}
            placeholder="Zahlbar innerhalb von 14 Tagen ohne Abzug."
            style={{ resize: 'vertical', minHeight: 56, lineHeight: 1.5 }}
          />
        </div>
      </div>

      <datalist id="set-doc-legal-forms">
        {ISSUER_LEGAL_FORMS.map((form) => (
          <option key={form} value={form} />
        ))}
      </datalist>
    </div>
  )
}
