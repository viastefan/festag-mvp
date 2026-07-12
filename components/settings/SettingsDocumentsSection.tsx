'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowSquareOut,
  CheckCircle,
  FileText,
  PencilSimple,
  Receipt,
  Sparkle,
  WarningCircle,
} from '@phosphor-icons/react'
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
  { label: 'Angebote', hint: 'Positionen, Gültigkeit, PDF und Versand' },
  { label: 'Rechnungen', hint: 'WYSIWYG-Editor, Tagro pro Feld, Zahlungsseite' },
  { label: 'Verträge', hint: 'Leistungsumfang, Konditionen, Unterschrift' },
] as const

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
      <div className="set-insight-card" style={{ marginBottom: 18 }}>
        <strong>Dokumente für deine Delivery</strong>
        <p>
          Angebote, Rechnungen und Verträge teilen sich einen Rechnungssteller.
          Tagro hilft beim Ausfüllen und Formulieren — Feld für Feld, direkt auf dem Dokument.
        </p>
      </div>

      <p className="set-section-title">Rechnungssteller</p>
      <div className="set-card set-doc-issuer-card">
        {loading ? (
          <div className="set-loading" style={{ gap: 10 }}>
            <div className="set-load-line w55" />
            <div className="set-load-line w100" />
          </div>
        ) : (
          <>
            <div className="set-row">
              <div>
                <div className="set-label">Status</div>
                <div className="set-label-sub">
                  {issuerReady
                    ? 'Bereit für Rechnungen und PDF.'
                    : 'Pflichtangaben fehlen noch für den Versand.'}
                </div>
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

            <div className="set-row set-row-stack">
              <div className="set-label">Angaben</div>
              <div className="set-doc-preview">
                <strong>{displayName || 'Noch kein Name hinterlegt'}</strong>
                {address ? <span>{address.replace(/\n/g, ', ')}</span> : null}
                {summary ? <span className="set-doc-preview-meta">{summary}</span> : null}
              </div>
            </div>

            {!issuerReady && missing.length > 0 && (
              <div className="set-row set-row-stack">
                <div className="set-label">Fehlt noch</div>
                <ul className="set-doc-missing">
                  {missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="set-row set-doc-actions">
              <button type="button" className="set-btn set-btn-primary" onClick={() => setIssuerOpen(true)}>
                <PencilSimple size={15} weight="regular" aria-hidden />
                {issuerReady ? 'Rechnungssteller bearbeiten' : 'Angaben ergänzen'}
              </button>
            </div>
          </>
        )}
      </div>

      <p className="set-section-title">Tagro in Dokumenten</p>
      <div className="set-card">
        <div className="set-row">
          <div>
            <div className="set-label">Feldassistenz</div>
            <div className="set-label-sub">
              In Rechnung, Angebot und Vertrag findest du neben Textfeldern den Tagro-Button —
              Klarer, Professioneller, Kürzer, inline ohne Chat.
            </div>
          </div>
          <Sparkle size={20} weight="regular" className="set-doc-icon" aria-hidden />
        </div>
        <div className="set-row">
          <div>
            <div className="set-label">Compose-Leiste</div>
            <div className="set-label-sub">
              Unten im Editor: Briefing eingeben, Tagro füllt das Dokument aus.
            </div>
          </div>
        </div>
        <div className="set-row set-doc-actions">
          <Link href={settingsHref('intelligence')} className="set-btn">
            Tagro & Klarheit
          </Link>
        </div>
      </div>

      <p className="set-section-title">Dokumenttypen</p>
      <div className="set-card">
        {DOC_TYPES.map((item) => (
          <div key={item.label} className="set-row">
            <div>
              <div className="set-label">{item.label}</div>
              <div className="set-label-sub">{item.hint}</div>
            </div>
            {item.label === 'Rechnungen' ? (
              <Receipt size={18} weight="regular" className="set-doc-icon" aria-hidden />
            ) : (
              <FileText size={18} weight="regular" className="set-doc-icon" aria-hidden />
            )}
          </div>
        ))}
        <div className="set-row set-doc-actions">
          <Link href="/documents" className="set-btn set-btn-primary">
            <ArrowSquareOut size={15} weight="regular" aria-hidden />
            Dokumente öffnen
          </Link>
        </div>
      </div>

      <p className="set-section-title">Abrechnung & Steuer</p>
      <div className="set-card">
        <div className="set-row">
          <div>
            <div className="set-label">Steuerdaten und Adresse</div>
            <div className="set-label-sub">
              USt-IdNr., IBAN und Rechnungsadresse kannst du unter Abrechnung & Steuer pflegen —
              der Rechnungssteller oben ist die Quelle für ausgehende Kundenrechnungen.
            </div>
          </div>
        </div>
        <div className="set-row set-doc-actions">
          <Link href={settingsHref('billing')} className="set-btn">
            Abrechnung & Steuer
          </Link>
        </div>
      </div>

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

      <style jsx global>{`
        .set-doc-issuer-card { overflow: hidden; }
        .set-doc-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: -0.01em;
          color: #9a6700;
          background: rgba(154, 103, 0, 0.1);
          white-space: nowrap;
        }
        .set-doc-status.is-ready {
          color: #1f7a45;
          background: rgba(31, 122, 69, 0.1);
        }
        html[data-theme="dark"] .set-doc-status,
        html[data-theme="classic-dark"] .set-doc-status {
          color: #f5d565;
          background: rgba(245, 213, 101, 0.12);
        }
        html[data-theme="dark"] .set-doc-status.is-ready,
        html[data-theme="classic-dark"] .set-doc-status.is-ready {
          color: #86efac;
          background: rgba(134, 239, 172, 0.12);
        }
        .set-doc-preview {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 14px;
          line-height: 1.45;
          color: var(--text-secondary);
        }
        .set-doc-preview strong {
          font-size: 15px;
          font-weight: 500;
          color: var(--text);
        }
        .set-doc-preview-meta {
          font-size: 13px;
          color: var(--text-muted);
        }
        .set-doc-missing {
          margin: 0;
          padding-left: 18px;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.5;
        }
        .set-doc-actions {
          justify-content: flex-start;
          gap: 10px;
          padding-top: 4px;
        }
        .set-doc-actions .set-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .set-doc-icon {
          flex-shrink: 0;
          color: var(--text-muted);
          opacity: 0.85;
        }
      `}</style>
    </>
  )
}
