'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowSquareOut,
  CheckCircle,
  FileText,
  PencilSimple,
  Receipt,
  Scroll,
  WarningCircle,
} from '@phosphor-icons/react'
import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import InvoiceIssuerModal from '@/components/documents/InvoiceIssuerModal'
import { fetchIssuer } from '@/lib/documents/issuer-api'
import {
  EMPTY_ISSUER,
  isIssuerReady,
  issuerAddressBlock,
  issuerDisplayName,
  issuerMissingLabels,
  issuerSummaryLine,
  type InvoiceIssuer,
} from '@/lib/documents/issuer'
import { settingsHref } from '@/components/settings/settings-config'

type Props = {
  setError: (msg: string) => void
  flashSaved: (label: string) => void
}

const DOC_TYPES = [
  { kind: 'rechnung' as const, label: 'Rechnungen', hint: 'WYSIWYG-Editor, Tagro pro Feld, Zahlungsseite', Icon: Receipt },
  { kind: 'angebot' as const, label: 'Angebote', hint: 'Positionen, Gültigkeit, PDF und Versand', Icon: FileText },
  { kind: 'vertrag' as const, label: 'Verträge', hint: 'Leistungsumfang, Konditionen, Unterschrift', Icon: Scroll },
]

export default function SettingsDocumentsSection({ setError, flashSaved }: Props) {
  const [issuer, setIssuer] = useState<InvoiceIssuer | null>(null)
  const [issuerReady, setIssuerReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [issuerOpen, setIssuerOpen] = useState(false)

  const loadIssuer = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { res, json } = await fetchIssuer()
      if (!res.ok) {
        setError(json?.error || 'Rechnungssteller konnte nicht geladen werden.')
        setIssuer(null)
        setIssuerReady(false)
        return
      }
      const next = (json?.issuer ?? EMPTY_ISSUER) as InvoiceIssuer
      setIssuer(next)
      setIssuerReady(Boolean(json?.ready ?? isIssuerReady(next)))
    } finally {
      setLoading(false)
    }
  }, [setError])

  useEffect(() => {
    void loadIssuer()
  }, [loadIssuer])

  const displayName = issuer ? issuerDisplayName(issuer) : ''
  const address = issuer ? issuerAddressBlock(issuer) : ''
  const summary = issuerSummaryLine(issuer)
  const missing = issuer ? issuerMissingLabels(issuer) : []

  return (
    <>
      <section className="set-doc-block" aria-labelledby="set-doc-issuer-title">
        <div className="set-doc-block-head">
          <h2 id="set-doc-issuer-title" className="set-doc-block-title">Rechnungssteller</h2>
          <p className="set-doc-block-lead">
            Name, Adresse und Bank — erscheinen auf Angeboten, Rechnungen und Verträgen.
          </p>
        </div>

        <div className="set-doc-panel">
          {loading ? (
            <div className="set-loading" style={{ gap: 10 }}>
              <div className="set-load-line w55" />
              <div className="set-load-line w100" />
            </div>
          ) : (
            <>
              <div className="set-doc-panel-row">
                <span className="set-doc-panel-label">Status</span>
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

              <div className="set-doc-preview">
                <strong>{displayName || 'Noch kein Name hinterlegt'}</strong>
                {address ? <span>{address.replace(/\n/g, ', ')}</span> : null}
                {summary ? <span className="set-doc-preview-meta">{summary}</span> : null}
              </div>

              {!issuerReady && missing.length > 0 ? (
                <ul className="set-doc-missing">
                  {missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}

              <div className="set-doc-panel-actions">
                <button type="button" className="set-btn set-btn-primary" onClick={() => setIssuerOpen(true)}>
                  <PencilSimple size={15} weight="regular" aria-hidden />
                  {issuerReady ? 'Rechnungssteller bearbeiten' : 'Angaben ergänzen'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="set-doc-block" aria-labelledby="set-doc-tagro-title">
        <div className="set-doc-block-head">
          <h2 id="set-doc-tagro-title" className="set-doc-block-title">Tagro in Dokumenten</h2>
          <p className="set-doc-block-lead">
            Feldassistenz und Compose-Leiste direkt im Editor — ohne Chat-Popup.
          </p>
        </div>

        <div className="set-doc-panel">
          <div className="set-doc-feature">
            <span className="set-doc-feature-icon" aria-hidden>
              <TagroComposeIcon size={18} />
            </span>
            <div className="set-doc-feature-copy">
              <strong>Feldassistenz</strong>
              <p>Klarer, Professioneller, Kürzer — neben jedem Textfeld in Rechnung, Angebot und Vertrag.</p>
            </div>
          </div>
          <div className="set-doc-feature">
            <span className="set-doc-feature-icon" aria-hidden>
              <TagroComposeIcon size={18} />
            </span>
            <div className="set-doc-feature-copy">
              <strong>Compose-Leiste</strong>
              <p>Briefing unten im Editor — Tagro füllt das Dokument aus.</p>
            </div>
          </div>
          <div className="set-doc-panel-actions">
            <Link href={settingsHref('intelligence')} className="set-btn">
              Tagro & Klarheit
            </Link>
          </div>
        </div>
      </section>

      <section className="set-doc-block" aria-labelledby="set-doc-types-title">
        <div className="set-doc-block-head">
          <h2 id="set-doc-types-title" className="set-doc-block-title">Dokumenttypen</h2>
          <p className="set-doc-block-lead">Angebote, Rechnungen und Verträge aus einem Rechnungssteller.</p>
        </div>

        <div className="set-doc-panel">
          {DOC_TYPES.map(({ label, hint, Icon }) => (
            <div key={label} className="set-doc-feature">
              <span className="set-doc-feature-icon set-doc-feature-icon--muted" aria-hidden>
                <Icon size={18} weight="regular" />
              </span>
              <div className="set-doc-feature-copy">
                <strong>{label}</strong>
                <p>{hint}</p>
              </div>
            </div>
          ))}
          <div className="set-doc-panel-actions">
            <Link href="/documents" className="set-btn set-btn-primary">
              <ArrowSquareOut size={15} weight="regular" aria-hidden />
              Dokumente öffnen
            </Link>
          </div>
        </div>
      </section>

      <section className="set-doc-block" aria-labelledby="set-doc-billing-title">
        <div className="set-doc-block-head">
          <h2 id="set-doc-billing-title" className="set-doc-block-title">Abrechnung & Steuer</h2>
          <p className="set-doc-block-lead">
            Steuerdaten und Festag-Plan — getrennt vom Rechnungssteller für Kundendokumente.
          </p>
        </div>

        <div className="set-doc-panel set-doc-panel--flat">
          <p className="set-doc-note">
            USt-IdNr., IBAN und Rechnungsadresse für dein Festag-Konto pflegst du unter Abrechnung & Steuer.
            Der Rechnungssteller oben gilt für ausgehende Kundenrechnungen.
          </p>
          <div className="set-doc-panel-actions">
            <Link href={settingsHref('billing')} className="set-btn">
              Abrechnung & Steuer
            </Link>
          </div>
        </div>
      </section>

      <InvoiceIssuerModal
        open={issuerOpen}
        onClose={() => setIssuerOpen(false)}
        variant="settings"
        title="Rechnungssteller"
        subtitle="Diese Angaben erscheinen auf Angeboten, Rechnungen und Verträgen."
        initialIssuer={issuer}
        initialReady={issuerReady}
        onSaved={(next, ready) => {
          setIssuer(next)
          setIssuerReady(ready)
          flashSaved('Rechnungssteller gespeichert')
        }}
      />
    </>
  )
}
