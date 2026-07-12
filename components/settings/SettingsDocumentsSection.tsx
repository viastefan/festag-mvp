'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import {
  ArrowSquareOut,
  CheckCircle,
  FileText,
  Receipt,
  Scroll,
  WarningCircle,
} from '@phosphor-icons/react'
import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import { fetchIssuer, patchIssuer } from '@/lib/documents/issuer-api'
import {
  EMPTY_ISSUER,
  ISSUER_LEGAL_FORMS,
  isIssuerReady,
  issuerMissingLabels,
  type InvoiceIssuer,
} from '@/lib/documents/issuer'
import { settingsHref } from '@/components/settings/settings-config'

type Props = {
  setError: (msg: string) => void
  queueAutosave: (
    ref: MutableRefObject<ReturnType<typeof setTimeout> | null>,
    task: () => Promise<void>,
    delay?: number,
  ) => void
}

const DOC_TYPES = [
  { label: 'Rechnungen', hint: 'WYSIWYG-Editor, Tagro pro Feld, Zahlungsseite', Icon: Receipt },
  { label: 'Angebote', hint: 'Positionen, Gültigkeit, PDF und Versand', Icon: FileText },
  { label: 'Verträge', hint: 'Leistungsumfang, Konditionen, Unterschrift', Icon: Scroll },
]

function issuerKey(issuer: InvoiceIssuer) {
  return JSON.stringify(issuer)
}

export default function SettingsDocumentsSection({ setError, queueAutosave }: Props) {
  const [issuer, setIssuer] = useState<InvoiceIssuer>(EMPTY_ISSUER)
  const [issuerReady, setIssuerReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const snapshotRef = useRef('')
  const hydratedRef = useRef(false)
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadIssuer = useCallback(async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }, [setError])

  useEffect(() => {
    hydratedRef.current = false
    void loadIssuer()
    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current)
    }
  }, [loadIssuer])

  function patch<K extends keyof InvoiceIssuer>(key: K, value: InvoiceIssuer[K]) {
    setIssuer((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (!hydratedRef.current || loading) return
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
  }, [issuer, loading, queueAutosave])

  const missing = issuerMissingLabels(issuer)
  const formDisabled = loading

  if (loading) {
    return (
      <div className="set-loading" style={{ gap: 18 }}>
        <div className="set-load-block">
          <div className="set-load-line w55" />
          <div className="set-load-line w100" />
          <div className="set-load-line w78" />
        </div>
      </div>
    )
  }

  return (
    <>
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

      <p className="set-section-title">Tagro in Dokumenten</p>
      <div className="set-card">
        <div className="set-row set-row-stack">
          <div className="set-doc-feature">
            <span className="set-doc-feature-icon" aria-hidden>
              <TagroComposeIcon size={18} />
            </span>
            <div className="set-doc-feature-copy">
              <strong>Feldassistenz</strong>
              <p>Klarer, Professioneller, Kürzer — neben jedem Textfeld in Rechnung, Angebot und Vertrag.</p>
            </div>
          </div>
        </div>
        <div className="set-row set-row-stack">
          <div className="set-doc-feature">
            <span className="set-doc-feature-icon" aria-hidden>
              <TagroComposeIcon size={18} />
            </span>
            <div className="set-doc-feature-copy">
              <strong>Compose-Leiste</strong>
              <p>Briefing unten im Editor — Tagro füllt das Dokument aus.</p>
            </div>
          </div>
        </div>
        <div className="set-row">
          <div className="set-label">Tagro-Einstellungen</div>
          <Link href={settingsHref('intelligence')} className="set-btn">
            Tagro & Klarheit
          </Link>
        </div>
      </div>

      <p className="set-section-title">Dokumenttypen</p>
      <div className="set-card">
        {DOC_TYPES.map(({ label, hint, Icon }) => (
          <div key={label} className="set-row set-row-stack">
            <div className="set-doc-feature">
              <span className="set-doc-feature-icon set-doc-feature-icon--muted" aria-hidden>
                <Icon size={18} weight="regular" />
              </span>
              <div className="set-doc-feature-copy">
                <strong>{label}</strong>
                <p>{hint}</p>
              </div>
            </div>
          </div>
        ))}
        <div className="set-row">
          <div className="set-label">Dokumente</div>
          <Link href="/documents" className="set-btn set-btn-primary">
            <ArrowSquareOut size={15} weight="regular" aria-hidden />
            Dokumente öffnen
          </Link>
        </div>
      </div>

      <p className="set-section-title">Abrechnung & Steuer</p>
      <div className="set-card">
        <div className="set-row set-row-stack">
          <div>
            <div className="set-label">Festag-Konto</div>
            <div className="set-label-sub">
              USt-IdNr., IBAN und Rechnungsadresse für dein Festag-Konto pflegst du unter Abrechnung & Steuer.
              Der Rechnungssteller oben gilt für ausgehende Kundenrechnungen.
            </div>
          </div>
        </div>
        <div className="set-row">
          <div className="set-label">Abrechnung</div>
          <Link href={settingsHref('billing')} className="set-btn">
            Abrechnung & Steuer
          </Link>
        </div>
      </div>

      <datalist id="set-doc-legal-forms">
        {ISSUER_LEGAL_FORMS.map((form) => (
          <option key={form} value={form} />
        ))}
      </datalist>
    </>
  )
}