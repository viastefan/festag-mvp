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
      size={isOnboarding ? 'lg' : 'form'}
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

          <div className="iim-preview">
            <div className="iim-preview-top">
              <p className="iim-preview-title">{issuer.name.trim() || 'Name oder Firma'}</p>
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
      )}
    </Modal>
  )
}

const CSS = `
  .festag-modal-body .iim-shell,
  .festag-modal-body .iim-field,
  .festag-modal-body .iim-input {
    --text: var(--fp-text);
    --text-muted: var(--fp-muted);
    --text-secondary: var(--fp-soft);
    --iim-surface: #f5f5f7;
    --iim-surface-hover: #ebebed;
    --iim-ink: #1d1d1f;
    --iim-input-bg: #ffffff;
  }
  html[data-theme="dark"] .festag-modal-body .iim-shell,
  html[data-theme="classic-dark"] .festag-modal-body .iim-shell {
    --iim-surface: rgba(255,255,255,0.06);
    --iim-surface-hover: rgba(255,255,255,0.09);
    --iim-ink: var(--fp-text, #f5f5f7);
    --iim-input-bg: rgba(255,255,255,0.04);
  }

  .iim-shell { display: flex; flex-direction: column; gap: 12px; }
  .iim-loading { margin: 0; font-size: 13px; color: var(--fp-muted, var(--text-muted)); }

  .iim-error-banner {
    margin: 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: color-mix(in srgb, #c0362e 10%, transparent);
    border: 1px solid color-mix(in srgb, #c0362e 24%, transparent);
    color: #c0362e;
    font-size: 13px;
    line-height: 1.4;
  }

  .iim-preview {
    padding: 16px 18px;
    border-radius: 14px;
    background: var(--iim-surface);
    color: var(--iim-ink);
  }
  .iim-preview-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }
  .iim-preview-title {
    margin: 0;
    flex: 1;
    min-width: 0;
    font-size: 18px;
    font-weight: 500;
    letter-spacing: -0.02em;
  }
  .iim-status {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(0,0,0,0.06);
    color: var(--fp-soft, #6e6e73);
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
  }
  html[data-theme="dark"] .iim-status,
  html[data-theme="classic-dark"] .iim-status {
    background: rgba(255,255,255,0.08);
  }
  .iim-status.is-ready {
    background: color-mix(in srgb, #1f7a45 14%, transparent);
    color: #1f7a45;
  }
  .iim-preview-sub {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-line;
    color: var(--fp-soft, #6e6e73);
  }
  .iim-preview-note {
    margin: 10px 0 0;
    padding-top: 10px;
    border-top: 1px solid color-mix(in srgb, var(--iim-ink) 8%, transparent);
    font-size: 12px;
    line-height: 1.45;
    color: var(--fp-muted, #86868b);
  }

  .iim-section {
    border-radius: 14px;
    background: var(--iim-surface);
    overflow: hidden;
  }
  .iim-section-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px 0;
  }
  .iim-section-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--iim-input-bg);
    color: var(--fp-soft, #6e6e73);
    flex-shrink: 0;
  }
  .iim-section-title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--fp-text, var(--text));
  }
  .iim-section-body {
    padding: 12px 16px 16px;
  }

  .iim-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
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
    color: var(--fp-muted, var(--text-muted));
  }
  .iim-optional {
    font-size: 11px;
    font-weight: 400;
    color: var(--fp-soft, #86868b);
  }
  .iim-input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid color-mix(in srgb, var(--iim-ink) 8%, transparent);
    border-radius: 10px;
    background: var(--iim-input-bg);
    color: var(--fp-text, var(--text));
    font-family: inherit;
    font-size: 14.5px;
    padding: 10px 12px;
    transition: border-color .14s ease, background .14s ease;
  }
  .iim-input:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--fp-text, var(--text)) 22%, transparent);
    background: var(--iim-input-bg);
  }
  .iim-input::placeholder { color: var(--fp-muted, var(--text-muted)); }

  @media (max-width: 560px) {
    .iim-grid { grid-template-columns: 1fr; }
    .iim-preview-title { font-size: 17px; }
  }
`
