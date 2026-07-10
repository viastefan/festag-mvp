'use client'

import { useEffect, useState } from 'react'
import Modal, { ModalButton } from '@/components/Modal'
import {
  EMPTY_ISSUER,
  issuerAddressBlock,
  issuerMissingLabels,
  isIssuerReady,
  type InvoiceIssuer,
} from '@/lib/documents/issuer'

type Props = {
  open: boolean
  onClose: () => void
  variant?: 'onboarding' | 'settings'
  onSaved?: (issuer: InvoiceIssuer, ready: boolean) => void
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hint?: string
}) {
  return (
    <label className="iim-field">
      <span className="iim-label">{label}</span>
      {hint ? <span className="iim-hint">{hint}</span> : null}
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

export default function InvoiceIssuerModal({
  open,
  onClose,
  variant = 'settings',
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
    fetch('/api/documents/issuer', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j?.issuer) setIssuer({ ...EMPTY_ISSUER, ...j.issuer })
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
      const res = await fetch('/api/documents/issuer', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issuer),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j?.error || 'Speichern fehlgeschlagen.')
        return
      }
      const saved = { ...EMPTY_ISSUER, ...j.issuer } as InvoiceIssuer
      setIssuer(saved)
      onSaved?.(saved, Boolean(j.ready))
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
  const preview = [
    issuer.name.trim(),
    issuer.city.trim(),
    iban.length >= 4 ? `IBAN ··· ${iban.slice(-4)}` : '',
  ].filter(Boolean).join(', ')

  return (
    <Modal
      open={open}
      onClose={variant === 'onboarding' ? dismissOnboarding : onClose}
      size="form"
      title={variant === 'onboarding' ? 'Deine Rechnungsdaten' : 'Rechnungssteller'}
      subtitle={variant === 'onboarding'
        ? 'Einmalig hinterlegen — Name, Adresse und Bankverbindung erscheinen automatisch auf jeder Rechnung.'
        : 'Diese Angaben werden auf allen Festag-Rechnungen als Rechnungssteller verwendet.'}
      footer={(
        <>
          {variant === 'onboarding' ? (
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
        <>
          <div className="iim-preview">
            <p className="iim-preview-title">{issuer.name.trim() || 'Noch kein Name'}</p>
            <p className="iim-preview-sub">
              {preview || issuerAddressBlock(issuer) || 'Vorschau der Rechnungskopfzeile'}
            </p>
            {!ready && missing.length > 0 && (
              <p className="iim-preview-note">
                Für eine vollständige Rechnung fehlen noch: {missing.join(', ')}.
                Du kannst trotzdem schon Rechnungen erstellen.
              </p>
            )}
          </div>

          <div className="iim-section">
            <h3 className="iim-section-title">Firma & Adresse</h3>
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
          </div>

          <div className="iim-section">
            <h3 className="iim-section-title">Kontakt & Steuer</h3>
            <div className="iim-grid">
              <Field label="E-Mail" value={issuer.email} onChange={(v) => patch('email', v)} placeholder="name@beispiel.de" type="email" />
              <Field label="Telefon" value={issuer.phone} onChange={(v) => patch('phone', v)} placeholder="+49 …" />
            </div>
            <div className="iim-grid">
              <Field label="USt-IdNr." value={issuer.vatId} onChange={(v) => patch('vatId', v)} placeholder="DE…" hint="Optional" />
              <Field label="Steuernummer" value={issuer.taxNumber} onChange={(v) => patch('taxNumber', v)} placeholder="z. B. 69343720183" hint="Optional" />
            </div>
          </div>

          <div className="iim-section">
            <h3 className="iim-section-title">Bankverbindung</h3>
            <div className="iim-grid iim-grid-1">
              <Field label="Bank" value={issuer.bankName} onChange={(v) => patch('bankName', v)} placeholder="z. B. Revolut" hint="Optional, erscheint auf Seite 2" />
            </div>
            <div className="iim-grid">
              <Field label="IBAN" value={issuer.iban} onChange={(v) => patch('iban', v)} placeholder="DE…" />
              <Field label="BIC" value={issuer.bic} onChange={(v) => patch('bic', v)} placeholder="REVODEB2" />
            </div>
          </div>

          {error && <p className="iim-error">{error}</p>}
        </>
      )}
    </Modal>
  )
}

const CSS = `
  .festag-modal-body .iim-preview,
  .festag-modal-body .iim-field,
  .festag-modal-body .iim-input { --text: var(--fp-text); --text-muted: var(--fp-muted); --text-secondary: var(--fp-soft); }

  .iim-loading { margin: 0; font-size: 13px; color: var(--fp-muted, var(--text-muted)); }

  .iim-preview {
    margin: 0 0 18px;
    padding: 14px 16px;
    border-radius: 12px;
    background: #f5f5f7;
    color: #1d1d1f;
  }
  html[data-theme="dark"] .iim-preview,
  html[data-theme="classic-dark"] .iim-preview {
    background: rgba(255,255,255,0.06);
    color: var(--fp-text, #f5f5f7);
  }
  .iim-preview-title { margin: 0 0 4px; font-size: 15px; font-weight: 500; }
  .iim-preview-sub { margin: 0; font-size: 12.5px; line-height: 1.45; color: var(--fp-soft, #6e6e73); }
  .iim-preview-note { margin: 8px 0 0; font-size: 12px; line-height: 1.45; color: var(--fp-muted, #86868b); }

  .iim-section { margin-bottom: 16px; }
  .iim-section-title {
    margin: 0 0 10px;
    font-size: 14px;
    font-weight: 500;
    color: var(--fp-text, var(--text));
  }
  .iim-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; }
  .iim-grid-1 { grid-template-columns: 1fr; }
  .iim-field { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
  .iim-label { font-size: 11px; font-weight: 500; letter-spacing: .02em; color: var(--fp-muted, var(--text-muted)); }
  .iim-hint { font-size: 10.5px; color: var(--fp-muted, var(--text-muted)); margin-top: -1px; }
  .iim-input {
    width: 100%;
    border: 0;
    border-bottom: 1px solid var(--fp-divider, var(--border));
    background: transparent;
    color: var(--fp-text, var(--text));
    font-family: inherit;
    font-size: 14.5px;
    padding: 5px 0;
    border-radius: 0;
  }
  .iim-input:focus {
    outline: none;
    border-bottom-color: color-mix(in srgb, var(--fp-text, var(--text)) 45%, var(--fp-divider, var(--border)));
  }
  .iim-input::placeholder { color: var(--fp-muted, var(--text-muted)); }
  .iim-error { margin: 4px 0 0; font-size: 12.5px; color: #c0362e; }
  @media (max-width: 560px) { .iim-grid { grid-template-columns: 1fr; gap: 0; } }
`
