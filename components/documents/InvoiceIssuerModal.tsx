'use client'

import { useEffect, useState } from 'react'
import { Buildings, CreditCard, EnvelopeSimple } from '@phosphor-icons/react'
import Modal, { ModalButton } from '@/components/Modal'
import {
  EMPTY_ISSUER,
  issuerAddressBlock,
  issuerMissingLabels,
  isIssuerReady,
  type InvoiceIssuer,
} from '@/lib/documents/issuer'
import { fetchIssuer, patchIssuer } from '@/lib/documents/issuer-api'

type Props = {
  open: boolean
  onClose: () => void
  variant?: 'onboarding' | 'settings'
  /** Override modal title (e.g. Absender / Auftragnehmer). */
  title?: string
  subtitle?: string
  onSaved?: (issuer: InvoiceIssuer, ready: boolean) => void
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  optional,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  optional?: boolean
}) {
  return (
    <label className="iim-field">
      <span className="iim-label">
        {label}
        {optional ? <span className="iim-optional">Optional</span> : null}
      </span>
      <input
        className="iim-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Buildings
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="iim-section">
      <div className="iim-section-head">
        <span className="iim-section-icon" aria-hidden>
          <Icon size={16} weight="regular" />
        </span>
        <h3 className="iim-section-title">{title}</h3>
      </div>
      <div className="iim-section-body">{children}</div>
    </section>
  )
}

export default function InvoiceIssuerModal({
  open,
  onClose,
  variant = 'settings',
  title,
  subtitle,
  onSaved,
}: Props) {
  const [issuer, setIssuer] = useState<InvoiceIssuer>(EMPTY_ISSUER)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    let cancelled = false
    setLoading(true)
    fetchIssuer()
      .then(({ res, json }) => {
        if (cancelled) return
        if (!res.ok) {
          setError(json?.error || 'Daten konnten nicht geladen werden.')
          return
        }
        if (json?.issuer) setIssuer({ ...EMPTY_ISSUER, ...json.issuer })
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open])

  function patch<K extends keyof InvoiceIssuer>(key: K, value: InvoiceIssuer[K]) {
    setIssuer((prev) => ({ ...prev, [key]: value }))
  }

  async function save() {
    setError('')
    setSaving(true)
    try {
      const { res, json } = await patchIssuer(issuer)
      if (!res.ok) {
        setError(json?.error || 'Speichern fehlgeschlagen.')
        return
      }
      const saved = { ...EMPTY_ISSUER, ...json.issuer } as InvoiceIssuer
      setIssuer(saved)
      onSaved?.(saved, Boolean(json.ready))
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function dismissOnboarding() {
    try { sessionStorage.setItem('festag-issuer-onboard-dismissed', '1') } catch {}
    onClose()
  }

  const missing = issuerMissingLabels(issuer)
  const ready = isIssuerReady(issuer)
  const iban = issuer.iban.replace(/\s/g, '')
  const previewLines = [
    issuerAddressBlock(issuer),
    [issuer.email, issuer.phone].filter(Boolean).join(', '),
    iban.length >= 4 ? `IBAN endet auf ${iban.slice(-4)}` : '',
  ].filter(Boolean)

  const isOnboarding = variant === 'onboarding'

  return (
    <Modal
      open={open}
      onClose={isOnboarding ? dismissOnboarding : onClose}
      size="form"
      dragHandle={isOnboarding}
      title={title || (isOnboarding ? 'Deine Rechnungsdaten' : 'Rechnungssteller')}
      subtitle={subtitle || (isOnboarding
        ? 'Einmalig hinterlegen. Name, Adresse und Bankverbindung erscheinen automatisch auf jeder Rechnung.'
        : 'Diese Angaben werden auf allen Festag-Rechnungen als Rechnungssteller verwendet.')}
      footer={(
        <>
          {isOnboarding ? (
            <ModalButton variant="secondary" onClick={dismissOnboarding}>Später</ModalButton>
          ) : (
            <ModalButton variant="secondary" onClick={onClose}>Abbrechen</ModalButton>
          )}
          <ModalButton variant="primary" onClick={save} loading={saving}>
            Speichern
          </ModalButton>
        </>
      )}
    >
      <style>{CSS}</style>

      {loading ? (
        <p className="iim-loading">Lade deine Daten…</p>
      ) : (
        <div className="iim-shell">
          {error ? <p className="iim-error-banner" role="alert">{error}</p> : null}

          <div className="iim-preview" aria-live="polite">
            <div className="iim-preview-top">
              <div className="iim-preview-copy">
                <p className="iim-preview-title">{issuer.name.trim() || 'Name oder Firma'}</p>
              </div>
              <span className={`iim-status ${ready ? 'is-ready' : ''}`}>
                {ready ? 'Bereit' : 'Unvollständig'}
              </span>
            </div>
            <p className="iim-preview-sub">
              {previewLines.join('\n') || 'Trage deine Angaben ein, um die Vorschau zu sehen.'}
            </p>
            {!ready && missing.length > 0 && (
              <p className="iim-preview-note">
                Für eine vollständige Rechnung fehlen noch: {missing.join(', ')}.
                Du kannst trotzdem schon Rechnungen erstellen.
              </p>
            )}
          </div>

          <div className="iim-form">
          <Section icon={Buildings} title="Firma und Adresse">
            <div className="iim-grid iim-grid-1">
              <Field label="Name oder Firma" value={issuer.name} onChange={(v) => patch('name', v)} placeholder="z. B. Stefan Dirnberger" />
            </div>
            <div className="iim-grid iim-grid-1">
              <Field label="Straße und Hausnummer" value={issuer.addressLine} onChange={(v) => patch('addressLine', v)} placeholder="Lindenstraße 15" />
            </div>
            <div className="iim-grid">
              <Field label="PLZ" value={issuer.zip} onChange={(v) => patch('zip', v)} placeholder="84036" />
              <Field label="Stadt" value={issuer.city} onChange={(v) => patch('city', v)} placeholder="Kumhausen" />
            </div>
            <div className="iim-grid iim-grid-1">
              <Field label="Land" value={issuer.country} onChange={(v) => patch('country', v)} placeholder="Deutschland" />
            </div>
          </Section>

          <Section icon={EnvelopeSimple} title="Kontakt und Steuer">
            <div className="iim-grid">
              <Field label="E-Mail" value={issuer.email} onChange={(v) => patch('email', v)} placeholder="name@beispiel.de" type="email" />
              <Field label="Telefon" value={issuer.phone} onChange={(v) => patch('phone', v)} placeholder="+49 …" />
            </div>
            <div className="iim-grid">
              <Field label="USt-IdNr." value={issuer.vatId} onChange={(v) => patch('vatId', v)} placeholder="DE…" optional />
              <Field label="Steuernummer" value={issuer.taxNumber} onChange={(v) => patch('taxNumber', v)} placeholder="z. B. 69343720183" optional />
            </div>
          </Section>

          <Section icon={CreditCard} title="Bankverbindung">
            <div className="iim-grid iim-grid-1">
              <Field label="Bank" value={issuer.bankName} onChange={(v) => patch('bankName', v)} placeholder="z. B. Revolut" optional />
            </div>
            <div className="iim-grid">
              <Field label="IBAN" value={issuer.iban} onChange={(v) => patch('iban', v)} placeholder="DE…" />
              <Field label="BIC" value={issuer.bic} onChange={(v) => patch('bic', v)} placeholder="REVODEB2" />
            </div>
          </Section>
          </div>
        </div>
      )}
    </Modal>
  )
}

const CSS = `
  .iim-shell {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .iim-loading {
    margin: 0;
    font-size: 13px;
    color: var(--fp-muted);
  }

  .iim-error-banner {
    margin: 0;
    padding: 10px 12px;
    border-radius: 8px;
    background: color-mix(in srgb, #c0362e 10%, transparent);
    border: 1px solid color-mix(in srgb, #c0362e 24%, transparent);
    color: #c0362e;
    font-size: 13px;
    line-height: 1.4;
  }

  .iim-preview {
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid var(--fp-border);
    background: color-mix(in srgb, var(--fp-pill) 38%, transparent);
    color: var(--fp-text);
  }
  .iim-preview-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }
  .iim-preview-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .iim-preview-title {
    margin: 0;
    font-size: 17px;
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 1.25;
    color: var(--fp-text);
  }
  .iim-status {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid var(--fp-border);
    background: var(--fp-bg);
    color: var(--fp-soft);
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .iim-status.is-ready {
    border-color: color-mix(in srgb, #1f7a45 28%, transparent);
    background: color-mix(in srgb, #1f7a45 12%, transparent);
    color: #1f7a45;
  }
  html[data-theme="dark"] .iim-status.is-ready,
  html[data-theme="classic-dark"] .iim-status.is-ready {
    color: #4ade80;
    border-color: color-mix(in srgb, #4ade80 24%, transparent);
    background: color-mix(in srgb, #4ade80 10%, transparent);
  }
  .iim-preview-sub {
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
    white-space: pre-line;
    color: var(--fp-soft);
  }
  .iim-preview-note {
    margin: 10px 0 0;
    padding-top: 10px;
    border-top: 1px solid var(--fp-divider);
    font-size: 12px;
    line-height: 1.45;
    color: var(--fp-muted);
  }

  .iim-form {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--fp-divider);
  }

  .iim-section + .iim-section {
    border-top: 1px solid var(--fp-divider);
  }
  .iim-section-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 0 0;
  }
  .iim-section-icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--fp-pill);
    color: var(--fp-soft);
    flex-shrink: 0;
  }
  .iim-section-title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--fp-text);
  }
  .iim-section-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 0 18px;
  }

  .iim-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .iim-grid-1 { grid-template-columns: 1fr; }
  .iim-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .iim-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--fp-muted);
  }
  .iim-optional {
    font-size: 11px;
    font-weight: 400;
    color: var(--fp-soft);
  }
  .iim-input {
    width: 100%;
    box-sizing: border-box;
    border: 0;
    border-radius: 8px;
    background: var(--fp-inp);
    color: var(--fp-text);
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.45;
    padding: 10px 12px;
    outline: none;
    transition: background .12s ease, box-shadow .12s ease;
    -webkit-appearance: none;
    appearance: none;
  }
  .iim-input::placeholder {
    color: var(--fp-muted);
    opacity: 0.9;
  }
  .iim-input:hover:not(:focus) {
    background: color-mix(in srgb, var(--fp-inp) 82%, var(--fp-text) 18%);
  }
  .iim-input:focus {
    background: var(--fp-inp-focus);
    box-shadow: 0 0 0 3px var(--fp-glow);
  }
  .iim-input:-webkit-autofill,
  .iim-input:-webkit-autofill:hover,
  .iim-input:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--fp-text);
    -webkit-box-shadow: 0 0 0 1000px var(--fp-inp-focus) inset;
    transition: background-color 9999s ease-out 0s;
  }

  @media (max-width: 560px) {
    .iim-grid { grid-template-columns: 1fr; }
    .iim-preview-title { font-size: 16px; }
    .iim-section-body { padding-bottom: 14px; }
  }
`
