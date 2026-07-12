'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Buildings, Check, CreditCard, EnvelopeSimple, NotePencil, Scales } from '@phosphor-icons/react'
import Modal, { ModalButton } from '@/components/Modal'
import {
  EMPTY_ISSUER,
  ISSUER_LEGAL_FORMS,
  issuerMissingLabels,
  isIssuerReady,
  type InvoiceIssuer,
} from '@/lib/documents/issuer'
import { fetchIssuer, patchIssuer } from '@/lib/documents/issuer-api'
import { broadcastIssuerSync } from '@/lib/documents/issuer-sync'

type Props = {
  open: boolean
  onClose: () => void
  variant?: 'onboarding' | 'settings'
  title?: string
  subtitle?: string
  initialIssuer?: InvoiceIssuer | null
  initialReady?: boolean
  onSaved?: (issuer: InvoiceIssuer, ready: boolean) => void
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

function issuerKey(issuer: InvoiceIssuer) {
  return JSON.stringify(issuer)
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  optional,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  optional?: boolean
  disabled?: boolean
}) {
  return (
    <label className="iim-field">
      <span className="iim-label">
        <span className="iim-label-main">{label}</span>
        {optional ? <span className="iim-optional">Optional</span> : null}
      </span>
      <input
        className="iim-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  optional,
  disabled,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  optional?: boolean
  disabled?: boolean
  rows?: number
}) {
  return (
    <label className="iim-field">
      <span className="iim-label">
        <span className="iim-label-main">{label}</span>
        {optional ? <span className="iim-optional">Optional</span> : null}
      </span>
      <textarea
        className="iim-textarea"
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
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
        <Icon className="iim-section-glyph" size={18} weight="regular" aria-hidden />
        <h3 className="iim-section-title">{title}</h3>
      </div>
      <div className="iim-section-body">{children}</div>
    </section>
  )
}

export default function InvoiceIssuerModal({
  open,
  onClose,
  title,
  initialIssuer,
  onSaved,
}: Props) {
  const [issuer, setIssuer] = useState<InvoiceIssuer>(EMPTY_ISSUER)
  const [hydrated, setHydrated] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')

  const snapshotRef = useRef('')
  const hydratedRef = useRef(false)
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const issuerRef = useRef(issuer)

  issuerRef.current = issuer

  const clearTimers = useCallback(() => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current)
    if (savedFlashRef.current) clearTimeout(savedFlashRef.current)
    autosaveRef.current = null
    savedFlashRef.current = null
  }, [])

  useEffect(() => {
    if (!open) {
      clearTimers()
      hydratedRef.current = false
      snapshotRef.current = ''
      setHydrated(false)
      setSaveStatus('idle')
      setError('')
      return
    }

    setError('')
    setSaveStatus('idle')
    hydratedRef.current = false
    setHydrated(false)
    let cancelled = false

    if (initialIssuer) {
      const cached = { ...EMPTY_ISSUER, ...initialIssuer } as InvoiceIssuer
      setIssuer(cached)
      snapshotRef.current = issuerKey(cached)
      hydratedRef.current = true
      setHydrated(true)
    }

    fetchIssuer()
      .then(({ res, json }) => {
        if (cancelled) return
        if (!res.ok) {
          setError(json?.error || 'Daten konnten nicht geladen werden.')
          hydratedRef.current = true
          setHydrated(true)
          return
        }
        const next = { ...EMPTY_ISSUER, ...(json?.issuer ?? {}) } as InvoiceIssuer
        setIssuer(next)
        snapshotRef.current = issuerKey(next)
        hydratedRef.current = true
        setHydrated(true)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Daten konnten nicht geladen werden.')
          hydratedRef.current = true
          setHydrated(true)
        }
      })

    return () => { cancelled = true }
  }, [open, clearTimers, initialIssuer])

  const persistIssuer = useCallback(async (next: InvoiceIssuer) => {
    const { res, json } = await patchIssuer(next)
    if (!res.ok) {
      throw new Error(json?.error || 'Speichern fehlgeschlagen.')
    }
    const saved = { ...EMPTY_ISSUER, ...json.issuer } as InvoiceIssuer
    const ready = Boolean(json.ready)
    setIssuer(saved)
    snapshotRef.current = issuerKey(saved)
    onSaved?.(saved, ready)
    broadcastIssuerSync({ issuer: saved, ready })
    return saved
  }, [onSaved])

  function flushPendingSave() {
    if (!hydratedRef.current) return
    if (autosaveRef.current) {
      clearTimeout(autosaveRef.current)
      autosaveRef.current = null
    }
    if (issuerKey(issuerRef.current) !== snapshotRef.current) {
      void persistIssuer(issuerRef.current).catch(() => {})
    }
  }

  function handleClose() {
    flushPendingSave()
    onClose()
  }

  useEffect(() => {
    if (!open || !hydratedRef.current || !hydrated) return

    const key = issuerKey(issuer)
    if (key === snapshotRef.current) return

    setSaveStatus('pending')
    if (autosaveRef.current) clearTimeout(autosaveRef.current)

    autosaveRef.current = setTimeout(() => {
      autosaveRef.current = null
      setSaveStatus('saving')
      persistIssuer(issuerRef.current)
        .then(() => {
          setSaveStatus('saved')
          setError('')
          if (savedFlashRef.current) clearTimeout(savedFlashRef.current)
          savedFlashRef.current = setTimeout(() => setSaveStatus('idle'), 2400)
        })
        .catch((err: Error) => {
          setSaveStatus('error')
          setError(err.message || 'Speichern fehlgeschlagen.')
        })
    }, 650)

    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current)
    }
  }, [issuer, open, hydrated, persistIssuer])

  useEffect(() => () => clearTimers(), [clearTimers])

  function patch<K extends keyof InvoiceIssuer>(key: K, value: InvoiceIssuer[K]) {
    setIssuer((prev) => ({ ...prev, [key]: value }))
    if (saveStatus === 'error') setSaveStatus('idle')
  }

  const ready = isIssuerReady(issuer)
  const missing = issuerMissingLabels(issuer)
  const formDisabled = !hydrated

  const savePillLabel = saveStatus === 'pending' || saveStatus === 'saving'
    ? 'Speichert…'
    : saveStatus === 'saved'
      ? 'Gespeichert'
      : saveStatus === 'error'
        ? 'Fehler beim Speichern'
        : ''

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="form"
      dragHandle
      surfaceClassName="festag-modal-surface--issuer"
      autoFocus={hydrated}
      title={title || 'Rechnungssteller'}
      footer={(
        <>
          <ModalButton variant="secondary" onClick={handleClose}>Schließen</ModalButton>
          {savePillLabel ? (
            <span className={`iim-save-pill${saveStatus === 'saved' ? ' is-saved' : ''}${saveStatus === 'error' ? ' is-error' : ''}`}>
              {saveStatus === 'saved' ? <Check size={12} weight="bold" aria-hidden /> : null}
              {savePillLabel}
            </span>
          ) : null}
        </>
      )}
    >
      <style>{CSS}</style>

      <div className="iim-shell">
        {error ? <p className="iim-error-banner" role="alert">{error}</p> : null}

        {!hydrated ? (
          <p className="iim-loading">Lädt…</p>
        ) : (
          <>
            <div className="iim-status-row">
              <span className={`iim-status ${ready ? 'is-ready' : ''}`}>
                {ready ? 'Bereit für Rechnungen' : 'Noch unvollständig'}
              </span>
              {!ready && missing.length > 0 ? (
                <span className="iim-status-note">Offen: {missing.join(', ')}</span>
              ) : null}
            </div>

            <div className="iim-form">
              <Section icon={Buildings} title="Firma und Anschrift">
                <Field label="Name oder Firma" value={issuer.name} onChange={(v) => patch('name', v)} placeholder="Muster Consulting" disabled={formDisabled} />
                <label className="iim-field">
                  <span className="iim-label">
                    <span className="iim-label-main">Rechtsform</span>
                    <span className="iim-optional">Optional</span>
                  </span>
                  <input
                    className="iim-input"
                    list="iim-legal-forms"
                    value={issuer.legalForm}
                    placeholder="GmbH, e.K., Einzelunternehmen"
                    onChange={(e) => patch('legalForm', e.target.value)}
                    disabled={formDisabled}
                  />
                  <datalist id="iim-legal-forms">
                    {ISSUER_LEGAL_FORMS.map((form) => <option key={form} value={form} />)}
                  </datalist>
                </label>
                <Field label="Straße und Hausnummer" value={issuer.addressLine} onChange={(v) => patch('addressLine', v)} placeholder="Lindenstraße 15" disabled={formDisabled} />
                <Field label="PLZ" value={issuer.zip} onChange={(v) => patch('zip', v)} placeholder="84036" disabled={formDisabled} />
                <Field label="Stadt" value={issuer.city} onChange={(v) => patch('city', v)} placeholder="Kumhausen" disabled={formDisabled} />
                <Field label="Land" value={issuer.country} onChange={(v) => patch('country', v)} placeholder="Deutschland" disabled={formDisabled} />
              </Section>

              <Section icon={EnvelopeSimple} title="Kontakt">
                <Field label="E-Mail" value={issuer.email} onChange={(v) => patch('email', v)} placeholder="rechnung@beispiel.de" type="email" disabled={formDisabled} />
                <Field label="Telefon" value={issuer.phone} onChange={(v) => patch('phone', v)} placeholder="+49 …" optional disabled={formDisabled} />
                <Field label="Website" value={issuer.website} onChange={(v) => patch('website', v)} placeholder="www.beispiel.de" optional disabled={formDisabled} />
              </Section>

              <Section icon={CreditCard} title="Bankverbindung">
                <Field label="Kontoinhaber" value={issuer.accountHolder} onChange={(v) => patch('accountHolder', v)} placeholder={issuer.name.trim() || 'Wie Firmenname'} optional disabled={formDisabled} />
                <Field label="Bank" value={issuer.bankName} onChange={(v) => patch('bankName', v)} placeholder="Revolut" optional disabled={formDisabled} />
                <Field label="IBAN" value={issuer.iban} onChange={(v) => patch('iban', v)} placeholder="DE…" disabled={formDisabled} />
                <Field label="BIC" value={issuer.bic} onChange={(v) => patch('bic', v)} placeholder="REVODEB2" optional disabled={formDisabled} />
              </Section>

              <Section icon={Scales} title="Steuer und Register">
                <Field label="USt-IdNr." value={issuer.vatId} onChange={(v) => patch('vatId', v)} placeholder="DE123456789" optional disabled={formDisabled} />
                <Field label="Steuernummer" value={issuer.taxNumber} onChange={(v) => patch('taxNumber', v)} placeholder="143/123/45678" optional disabled={formDisabled} />
                <Field label="Geschäftsführer oder Inhaber" value={issuer.managingDirector} onChange={(v) => patch('managingDirector', v)} placeholder="Max Mustermann" optional disabled={formDisabled} />
                <TextAreaField
                  label="Handelsregister"
                  value={issuer.registerInfo}
                  onChange={(v) => patch('registerInfo', v)}
                  placeholder="Amtsgericht München, HRB 123456"
                  optional
                  disabled={formDisabled}
                  rows={2}
                />
              </Section>

              <Section icon={NotePencil} title="Standardtexte">
                <TextAreaField
                  label="Umsatzsteuer-Hinweis"
                  value={issuer.defaultTaxNote}
                  onChange={(v) => patch('defaultTaxNote', v)}
                  placeholder="Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
                  optional
                  disabled={formDisabled}
                  rows={2}
                />
                <TextAreaField
                  label="Zahlungsbedingungen"
                  value={issuer.defaultPaymentTerms}
                  onChange={(v) => patch('defaultPaymentTerms', v)}
                  placeholder="Zahlbar innerhalb von 14 Tagen ohne Abzug."
                  optional
                  disabled={formDisabled}
                  rows={3}
                />
              </Section>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

const CSS = `
  .iim-shell {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }

  .iim-loading {
    margin: 0;
    padding: 24px 0;
    font-size: 13px;
    color: var(--fp-muted);
  }

  .iim-status-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
  }

  .iim-save-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--fp-muted);
    background: transparent;
    border: 1px solid var(--fp-border);
    pointer-events: none;
    user-select: none;
  }
  .iim-save-pill.is-saved {
    color: #1f7a45;
    border-color: color-mix(in srgb, #1f7a45 22%, transparent);
    background: color-mix(in srgb, #1f7a45 8%, transparent);
  }
  html[data-theme="dark"] .iim-save-pill.is-saved,
  html[data-theme="classic-dark"] .iim-save-pill.is-saved {
    color: #4ade80;
    border-color: color-mix(in srgb, #4ade80 20%, transparent);
    background: color-mix(in srgb, #4ade80 8%, transparent);
  }
  .iim-save-pill.is-error {
    color: #c0362e;
    border-color: color-mix(in srgb, #c0362e 22%, transparent);
  }

  .iim-error-banner {
    margin: 0;
    padding: 12px 14px;
    border-radius: 6px;
    background: color-mix(in srgb, #c0362e 8%, transparent);
    border: 1px solid color-mix(in srgb, #c0362e 18%, transparent);
    color: #c0362e;
    font-size: 13px;
    line-height: 1.45;
  }

  .iim-status {
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--fp-border);
    background: transparent;
    color: var(--fp-muted);
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
  .iim-status.is-ready {
    border-color: color-mix(in srgb, #1f7a45 24%, transparent);
    color: #1f7a45;
  }
  html[data-theme="dark"] .iim-status.is-ready,
  html[data-theme="classic-dark"] .iim-status.is-ready {
    color: #4ade80;
    border-color: color-mix(in srgb, #4ade80 22%, transparent);
  }
  .iim-status-note {
    font-size: 12px;
    line-height: 1.45;
    color: var(--fp-muted);
  }

  .iim-form {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    min-width: 0;
  }

  .iim-section {
    padding: 20px 0;
    border-top: 1px solid color-mix(in srgb, var(--fp-divider) 72%, transparent);
  }
  .iim-section:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .iim-section-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .iim-section-glyph {
    flex-shrink: 0;
    color: var(--fp-soft);
  }
  .iim-section-title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 1.25;
    color: var(--fp-text);
  }
  .iim-section-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .iim-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
    width: 100%;
  }
  .iim-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--fp-soft);
  }
  .iim-label-main { color: var(--fp-text); font-weight: 400; }
  .iim-optional {
    font-size: 11px;
    font-weight: 400;
    color: var(--fp-muted);
  }

  .iim-input,
  .iim-textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid color-mix(in srgb, var(--fp-border) 90%, transparent);
    border-radius: 6px;
    background: var(--fp-inp, transparent);
    color: var(--fp-text);
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.45;
    padding: 10px 12px;
    outline: none;
    transition: border-color 0.14s ease, box-shadow 0.14s ease;
    -webkit-appearance: none;
    appearance: none;
  }
  .iim-textarea {
    resize: vertical;
    min-height: 76px;
    line-height: 1.5;
  }
  .iim-input:disabled,
  .iim-textarea:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .iim-input::placeholder,
  .iim-textarea::placeholder {
    color: var(--fp-muted);
    opacity: 0.75;
  }
  .iim-input:focus,
  .iim-textarea:focus {
    border-color: color-mix(in srgb, var(--fp-text) 20%, var(--fp-border));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--fp-text) 20%, var(--fp-border));
  }
`
