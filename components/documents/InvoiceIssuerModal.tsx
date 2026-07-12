'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Buildings, Check, CreditCard, EnvelopeSimple, NotePencil, Scales } from '@phosphor-icons/react'
import Modal, { ModalButton } from '@/components/Modal'
import IssuerSyncAnimation from '@/components/documents/IssuerSyncAnimation'
import {
  EMPTY_ISSUER,
  ISSUER_LEGAL_FORMS,
  issuerAddressBlock,
  issuerDisplayName,
  issuerLegalLines,
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
  /** Cached issuer from page — skips fetch when provided. */
  initialIssuer?: InvoiceIssuer | null
  initialReady?: boolean
  onSaved?: (issuer: InvoiceIssuer, ready: boolean) => void
}

type Phase = 'loading' | 'form' | 'saving' | 'success'
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
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  optional?: boolean
  disabled?: boolean
  hint?: string
}) {
  return (
    <label className="iim-field">
      <span className="iim-label">
        <span className="iim-label-main">{label}</span>
        {optional ? <span className="iim-optional">Optional</span> : null}
      </span>
      {hint ? <span className="iim-hint">{hint}</span> : null}
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
  hint,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  optional?: boolean
  disabled?: boolean
  hint?: string
  rows?: number
}) {
  return (
    <label className="iim-field">
      <span className="iim-label">
        <span className="iim-label-main">{label}</span>
        {optional ? <span className="iim-optional">Optional</span> : null}
      </span>
      {hint ? <span className="iim-hint">{hint}</span> : null}
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
  lead,
  children,
  compact,
}: {
  icon: typeof Buildings
  title: string
  lead?: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <section className={`iim-section${compact ? ' iim-section--compact' : ''}`}>
      <div className="iim-section-head">
        <Icon className="iim-section-glyph" size={18} weight="regular" aria-hidden />
        <div className="iim-section-copy">
          <h3 className="iim-section-title">{title}</h3>
          {lead ? <p className="iim-section-lead">{lead}</p> : null}
        </div>
      </div>
      <div className="iim-section-body">{children}</div>
    </section>
  )
}

function CollapsibleSection({
  icon: Icon,
  title,
  lead,
  open,
  onToggle,
  filled,
  children,
}: {
  icon: typeof Buildings
  title: string
  lead?: string
  open: boolean
  onToggle: () => void
  filled?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={`iim-section iim-section--collapsible${open ? ' is-open' : ''}`}>
      <button type="button" className="iim-section-toggle" onClick={onToggle} aria-expanded={open}>
        <Icon className="iim-section-glyph" size={18} weight="regular" aria-hidden />
        <div className="iim-section-copy">
          <span className="iim-section-title">{title}</span>
          {lead ? <span className="iim-section-lead">{lead}</span> : null}
        </div>
        {filled ? <span className="iim-section-badge">Ausgefüllt</span> : null}
        <span className="iim-section-chevron" aria-hidden />
      </button>
      {open ? <div className="iim-section-body">{children}</div> : null}
    </section>
  )
}

function issuerProgress(issuer: InvoiceIssuer) {
  const areas = [
    Boolean(issuer.name.trim() && issuer.addressLine.trim() && issuer.city.trim()),
    Boolean(issuer.email.trim()),
    Boolean(issuer.iban.trim()),
    Boolean(issuer.vatId.trim() || issuer.taxNumber.trim() || issuer.managingDirector.trim() || issuer.registerInfo.trim()),
    Boolean(issuer.defaultTaxNote.trim() || issuer.defaultPaymentTerms.trim()),
  ]
  const done = areas.filter(Boolean).length
  return { done, total: areas.length, pct: Math.round((done / areas.length) * 100) }
}

export default function InvoiceIssuerModal({
  open,
  onClose,
  variant = 'settings',
  title,
  subtitle,
  initialIssuer,
  initialReady,
  onSaved,
}: Props) {
  const [issuer, setIssuer] = useState<InvoiceIssuer>(EMPTY_ISSUER)
  const [phase, setPhase] = useState<Phase>('loading')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')
  const [legalOpen, setLegalOpen] = useState(false)
  const [defaultsOpen, setDefaultsOpen] = useState(false)

  const snapshotRef = useRef('')
  const hydratedRef = useRef(false)
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOnboarding = variant === 'onboarding'
  const isBusy = phase === 'loading' || phase === 'saving' || phase === 'success'
  const formDisabled = isBusy

  const clearTimers = useCallback(() => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current)
    if (savedFlashRef.current) clearTimeout(savedFlashRef.current)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    autosaveRef.current = null
    savedFlashRef.current = null
    closeTimerRef.current = null
  }, [])

  useEffect(() => {
    if (!open) {
      clearTimers()
      hydratedRef.current = false
      snapshotRef.current = ''
      setPhase('loading')
      setSaveStatus('idle')
      setError('')
      setLegalOpen(false)
      setDefaultsOpen(false)
      return
    }

    setError('')
    setSaveStatus('idle')
    hydratedRef.current = false
    let cancelled = false

    if (initialIssuer) {
      const cached = { ...EMPTY_ISSUER, ...initialIssuer } as InvoiceIssuer
      setIssuer(cached)
      snapshotRef.current = issuerKey(cached)
      hydratedRef.current = true
      const hasLegal = Boolean(
        cached.vatId.trim() || cached.taxNumber.trim() || cached.managingDirector.trim() || cached.registerInfo.trim(),
      )
      const hasDefaults = Boolean(cached.defaultTaxNote.trim() || cached.defaultPaymentTerms.trim())
      setLegalOpen(hasLegal)
      setDefaultsOpen(hasDefaults)
      setPhase('form')
    } else {
      setPhase('loading')
    }

    fetchIssuer()
      .then(({ res, json }) => {
        if (cancelled) return
        if (!res.ok) {
          setError(json?.error || 'Daten konnten nicht geladen werden.')
          setPhase('form')
          return
        }
        const next = { ...EMPTY_ISSUER, ...(json?.issuer ?? {}) } as InvoiceIssuer
        setIssuer(next)
        snapshotRef.current = issuerKey(next)
        hydratedRef.current = true
        const hasLegal = Boolean(
          next.vatId.trim() || next.taxNumber.trim() || next.managingDirector.trim() || next.registerInfo.trim(),
        )
        const hasDefaults = Boolean(next.defaultTaxNote.trim() || next.defaultPaymentTerms.trim())
        setLegalOpen(hasLegal)
        setDefaultsOpen(hasDefaults)
        setPhase('form')
      })
      .catch(() => {
        if (!cancelled) {
          setError('Daten konnten nicht geladen werden.')
          setPhase('form')
        }
      })

    return () => { cancelled = true }
  }, [open, clearTimers, initialIssuer, variant])

  const onCloseRef = useRef(onClose)
  const dismissOnboardingRef = useRef(() => {
    try { sessionStorage.setItem('festag-issuer-onboard-dismissed', '1') } catch {}
    onClose()
  })

  useEffect(() => {
    onCloseRef.current = onClose
    dismissOnboardingRef.current = () => {
      try { sessionStorage.setItem('festag-issuer-onboard-dismissed', '1') } catch {}
      onClose()
    }
  }, [onClose])

  const persistIssuer = useCallback(async (next: InvoiceIssuer, opts?: { celebrate?: boolean }) => {
    const { res, json } = await patchIssuer(next)
    if (!res.ok) {
      throw new Error(json?.error || 'Speichern fehlgeschlagen.')
    }
    const saved = { ...EMPTY_ISSUER, ...json.issuer } as InvoiceIssuer
    setIssuer(saved)
    snapshotRef.current = issuerKey(saved)
    onSaved?.(saved, Boolean(json.ready))

    if (opts?.celebrate) {
      setPhase('success')
      closeTimerRef.current = setTimeout(() => {
        if (isOnboarding) dismissOnboardingRef.current()
        else onCloseRef.current()
      }, 1600)
    }

    return saved
  }, [onSaved, isOnboarding])

  function flushPendingSave() {
    if (isOnboarding || !hydratedRef.current) return
    if (autosaveRef.current) {
      clearTimeout(autosaveRef.current)
      autosaveRef.current = null
    }
    const key = issuerKey(issuer)
    if (key !== snapshotRef.current) {
      void persistIssuer(issuer).catch(() => {})
    }
  }

  function handleClose() {
    flushPendingSave()
    onClose()
  }

  function dismissOnboarding() {
    dismissOnboardingRef.current()
  }

  useEffect(() => {
    if (!open || !hydratedRef.current || isOnboarding || phase !== 'form') return

    const key = issuerKey(issuer)
    if (key === snapshotRef.current) return

    setSaveStatus('pending')
    if (autosaveRef.current) clearTimeout(autosaveRef.current)

    autosaveRef.current = setTimeout(() => {
      autosaveRef.current = null
      setSaveStatus('saving')
      persistIssuer(issuer)
        .then(() => {
          setSaveStatus('saved')
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
  }, [issuer, open, isOnboarding, phase, persistIssuer])

  function patch<K extends keyof InvoiceIssuer>(key: K, value: InvoiceIssuer[K]) {
    setIssuer((prev) => ({ ...prev, [key]: value }))
    if (saveStatus === 'error') setSaveStatus('idle')
  }

  async function saveOnboarding() {
    setError('')
    setPhase('saving')
    try {
      await persistIssuer(issuer, { celebrate: true })
    } catch (err) {
      setPhase('form')
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    }
  }

  const missing = issuerMissingLabels(issuer)
  const ready = isIssuerReady(issuer)
  const displayName = issuerDisplayName(issuer)
  const iban = issuer.iban.replace(/\s/g, '')
  const previewLines = [
    issuerAddressBlock(issuer),
    [issuer.email, issuer.phone, issuer.website?.replace(/^https?:\/\//i, '')].filter(Boolean).join(', '),
    ...issuerLegalLines(issuer),
    iban.length >= 4 ? `IBAN endet auf ${iban.slice(-4)}` : '',
  ].filter(Boolean)

  const progress = issuerProgress(issuer)

  const modalTitle = title || (isOnboarding ? 'Deine Rechnungsdaten.' : 'Rechnungssteller.')
  const modalSubtitle = subtitle || (isOnboarding
    ? 'Einmalig hinterlegen. Name, Adresse und Bankverbindung erscheinen automatisch auf jeder Rechnung.'
    : 'Diese Angaben werden auf allen Festag-Rechnungen als Rechnungssteller verwendet.')

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
      onClose={isOnboarding ? dismissOnboarding : handleClose}
      size="form"
      dragHandle={isOnboarding}
      surfaceClassName="festag-modal-surface--issuer"
      leadHeadline={!isBusy}
      bare={phase === 'saving' || phase === 'success'}
      autoFocus={phase === 'form'}
      noBackdropClose={isBusy}
      title={modalTitle}
      subtitle={modalSubtitle}
      footer={phase === 'form' ? (
        <>
          {isOnboarding ? (
            <ModalButton variant="secondary" onClick={dismissOnboarding}>Später</ModalButton>
          ) : (
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
          {isOnboarding ? (
            <ModalButton variant="primary" onClick={saveOnboarding}>
              Speichern
            </ModalButton>
          ) : null}
        </>
      ) : null}
    >
      <style>{CSS}</style>

      <AnimatePresence mode="wait" initial={false}>
        {phase === 'loading' && (
          <motion.div
            key="loading"
            className="iim-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <IssuerSyncAnimation phase="gather" />
          </motion.div>
        )}

        {phase === 'saving' && (
          <motion.div
            key="saving"
            className="iim-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <IssuerSyncAnimation
              phase="gather"
              title="Wird gespeichert…"
              subtitle="Deine Angaben werden zusammengeführt."
            />
          </motion.div>
        )}

        {phase === 'success' && (
          <motion.div
            key="success"
            className="iim-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <IssuerSyncAnimation phase="success" />
          </motion.div>
        )}

        {phase === 'form' && (
          <motion.div
            key="form"
            className="iim-shell"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            {error ? <p className="iim-error-banner" role="alert">{error}</p> : null}

            <div className="iim-progress" aria-label={`${progress.done} von ${progress.total} Bereichen ausgefüllt`}>
              <div className="iim-progress-copy">
                <span className="iim-progress-label">Fortschritt</span>
                <span className="iim-progress-value">{progress.done} von {progress.total}</span>
              </div>
              <div className="iim-progress-track">
                <span className="iim-progress-fill" style={{ width: `${progress.pct}%` }} />
              </div>
            </div>

            <div className="iim-layout">
              <aside className="iim-preview-col">
                <div className="iim-preview" aria-live="polite">
                  <div className="iim-preview-top">
                    <div className="iim-preview-copy">
                      <p className="iim-preview-title">{displayName || 'Name oder Firma'}</p>
                    </div>
                    <span className={`iim-status ${ready ? 'is-ready' : ''}`}>
                      {ready ? 'Bereit' : 'Offen'}
                    </span>
                  </div>
                  <p className="iim-preview-sub">
                    {previewLines.join('\n') || 'Vorschau aktualisiert sich live mit deinen Eingaben.'}
                  </p>
                  {!ready && missing.length > 0 && (
                    <p className="iim-preview-note">
                      Noch offen: {missing.join(', ')}. Rechnungen kannst du trotzdem erstellen.
                    </p>
                  )}
                </div>
              </aside>

              <div className="iim-form">
              <Section
                icon={Buildings}
                title="Firma und Anschrift"
                lead="Pflichtangaben für den Rechnungskopf."
                compact
              >
                <div className="iim-grid iim-grid-1">
                  <Field label="Name oder Firma" value={issuer.name} onChange={(v) => patch('name', v)} placeholder="Muster Consulting" disabled={formDisabled} />
                </div>
                <div className="iim-grid iim-grid-1">
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
                </div>
                <div className="iim-grid iim-grid-1">
                  <Field label="Straße und Hausnummer" value={issuer.addressLine} onChange={(v) => patch('addressLine', v)} placeholder="Lindenstraße 15" disabled={formDisabled} />
                </div>
                <div className="iim-grid">
                  <Field label="PLZ" value={issuer.zip} onChange={(v) => patch('zip', v)} placeholder="84036" disabled={formDisabled} />
                  <Field label="Stadt" value={issuer.city} onChange={(v) => patch('city', v)} placeholder="Kumhausen" disabled={formDisabled} />
                </div>
                <div className="iim-grid iim-grid-1">
                  <Field label="Land" value={issuer.country} onChange={(v) => patch('country', v)} placeholder="Deutschland" disabled={formDisabled} />
                </div>
              </Section>

              <Section icon={EnvelopeSimple} title="Kontakt" lead="Für Rückfragen zur Rechnung." compact>
                <div className="iim-grid">
                  <Field label="E-Mail" value={issuer.email} onChange={(v) => patch('email', v)} placeholder="rechnung@beispiel.de" type="email" disabled={formDisabled} />
                  <Field label="Telefon" value={issuer.phone} onChange={(v) => patch('phone', v)} placeholder="+49 …" optional disabled={formDisabled} />
                </div>
                <div className="iim-grid iim-grid-1">
                  <Field label="Website" value={issuer.website} onChange={(v) => patch('website', v)} placeholder="www.beispiel.de" optional disabled={formDisabled} />
                </div>
              </Section>

              <Section icon={CreditCard} title="Bankverbindung" lead="Für die Zahlungsseite der Rechnung." compact>
                <div className="iim-grid iim-grid-1">
                  <Field label="Kontoinhaber" value={issuer.accountHolder} onChange={(v) => patch('accountHolder', v)} placeholder={issuer.name.trim() || 'Wie Firmenname'} optional disabled={formDisabled} />
                </div>
                <div className="iim-grid iim-grid-1">
                  <Field label="Bank" value={issuer.bankName} onChange={(v) => patch('bankName', v)} placeholder="Revolut" optional disabled={formDisabled} />
                </div>
                <div className="iim-grid">
                  <Field label="IBAN" value={issuer.iban} onChange={(v) => patch('iban', v)} placeholder="DE…" disabled={formDisabled} />
                  <Field label="BIC" value={issuer.bic} onChange={(v) => patch('bic', v)} placeholder="REVODEB2" optional disabled={formDisabled} />
                </div>
              </Section>

              <CollapsibleSection
                icon={Scales}
                title="Steuer und Register"
                lead="USt-IdNr., Steuernummer, Handelsregister"
                open={legalOpen}
                onToggle={() => setLegalOpen((v) => !v)}
                filled={Boolean(issuer.vatId || issuer.taxNumber || issuer.managingDirector || issuer.registerInfo)}
              >
                <div className="iim-grid">
                  <Field label="USt-IdNr." value={issuer.vatId} onChange={(v) => patch('vatId', v)} placeholder="DE123456789" optional disabled={formDisabled} />
                  <Field label="Steuernummer" value={issuer.taxNumber} onChange={(v) => patch('taxNumber', v)} placeholder="143/123/45678" optional disabled={formDisabled} />
                </div>
                <div className="iim-grid iim-grid-1">
                  <Field label="Geschäftsführer oder Inhaber" value={issuer.managingDirector} onChange={(v) => patch('managingDirector', v)} placeholder="Max Mustermann" optional disabled={formDisabled} />
                </div>
                <div className="iim-grid iim-grid-1">
                  <TextAreaField
                    label="Handelsregister"
                    value={issuer.registerInfo}
                    onChange={(v) => patch('registerInfo', v)}
                    placeholder="Amtsgericht München, HRB 123456"
                    optional
                    disabled={formDisabled}
                    rows={2}
                  />
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                icon={NotePencil}
                title="Standardtexte"
                lead="Vorausgefüllt bei neuen Rechnungen"
                open={defaultsOpen}
                onToggle={() => setDefaultsOpen((v) => !v)}
                filled={Boolean(issuer.defaultTaxNote || issuer.defaultPaymentTerms)}
              >
                <div className="iim-grid iim-grid-1">
                  <TextAreaField
                    label="Umsatzsteuer-Hinweis"
                    value={issuer.defaultTaxNote}
                    onChange={(v) => patch('defaultTaxNote', v)}
                    placeholder="Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
                    optional
                    disabled={formDisabled}
                    rows={2}
                  />
                </div>
                <div className="iim-grid iim-grid-1">
                  <TextAreaField
                    label="Zahlungsbedingungen"
                    value={issuer.defaultPaymentTerms}
                    onChange={(v) => patch('defaultPaymentTerms', v)}
                    placeholder="Zahlbar innerhalb von 14 Tagen ohne Abzug."
                    optional
                    disabled={formDisabled}
                    rows={3}
                  />
                </div>
              </CollapsibleSection>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}

const CSS = `
  .iim-stage {
    min-height: 240px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .iim-shell {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .iim-progress {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .iim-progress-copy {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  .iim-progress-label,
  .iim-progress-value {
    font-size: 12px;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: var(--fp-muted);
  }
  .iim-progress-value { color: var(--fp-soft); }
  .iim-progress-track {
    height: 3px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--fp-pill) 55%, transparent);
    overflow: hidden;
  }
  .iim-progress-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, color-mix(in srgb, var(--fp-text) 72%, transparent), var(--fp-text));
    transition: width .42s cubic-bezier(.16,1,.3,1);
  }

  .iim-layout {
    display: grid;
    grid-template-columns: minmax(220px, 272px) minmax(0, 1fr);
    gap: 28px;
    align-items: start;
  }
  .iim-preview-col {
    position: sticky;
    top: 0;
  }
  .iim-form {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .iim-save-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: -0.01em;
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
    border-radius: 12px;
    background: color-mix(in srgb, #c0362e 8%, transparent);
    border: 1px solid color-mix(in srgb, #c0362e 18%, transparent);
    color: #c0362e;
    font-size: 13px;
    line-height: 1.45;
  }

  .iim-preview {
    padding: 20px 18px;
    border-radius: 18px;
    border: 1px solid var(--festag-glass-border, rgba(255, 255, 255, 0.62));
    background: var(--festag-glass-bg-soft, rgba(255, 255, 255, 0.42));
    box-shadow: var(--festag-glass-shadow-soft, inset 0 1px 0 rgba(255,255,255,.55), 0 10px 28px rgba(15,23,42,.05));
    backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
    -webkit-backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
    color: var(--fp-text);
  }
  html[data-theme="dark"] .iim-preview,
  html[data-theme="classic-dark"] .iim-preview {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .iim-preview-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  .iim-preview-copy { flex: 1; min-width: 0; }
  .iim-preview-title {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 18px;
    font-weight: 400;
    letter-spacing: -0.03em;
    line-height: 1.2;
    color: var(--fp-text);
  }
  .iim-status {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 9px;
    border-radius: 999px;
    border: 1px solid var(--fp-border);
    background: transparent;
    color: var(--fp-muted);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.01em;
    white-space: nowrap;
    flex-shrink: 0;
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
  .iim-preview-sub {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.6;
    white-space: pre-line;
    color: var(--fp-muted);
  }
  .iim-preview-note {
    margin: 14px 0 0;
    padding-top: 14px;
    border-top: 1px solid color-mix(in srgb, var(--fp-divider) 80%, transparent);
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--fp-soft);
  }

  .iim-section {
    padding: 18px 0;
    border-top: 1px solid color-mix(in srgb, var(--fp-divider) 72%, transparent);
  }
  .iim-section:first-child { border-top: 0; padding-top: 4px; }
  .iim-section--compact .iim-section-body { padding-top: 14px; }

  .iim-section-head,
  .iim-section-toggle {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    text-align: left;
    font: inherit;
    color: inherit;
    cursor: default;
  }
  .iim-section-toggle {
    cursor: pointer;
    border-radius: 12px;
    transition: background .14s ease;
  }
  .iim-section-toggle:hover {
    background: color-mix(in srgb, var(--fp-hover) 65%, transparent);
  }
  .iim-section-glyph {
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--fp-soft);
  }
  .iim-section-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .iim-section-title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 1.25;
    color: var(--fp-text);
  }
  .iim-section-lead {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: var(--fp-muted);
  }
  .iim-section-badge {
    align-self: center;
    height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 500;
    color: var(--fp-muted);
    border: 1px solid var(--fp-border);
    white-space: nowrap;
  }
  .iim-section-chevron {
    align-self: center;
    width: 8px;
    height: 8px;
    border-right: 1.5px solid var(--fp-muted);
    border-bottom: 1.5px solid var(--fp-muted);
    transform: rotate(45deg);
    transition: transform .22s cubic-bezier(.16,1,.3,1);
    flex-shrink: 0;
    margin-right: 4px;
  }
  .iim-section--collapsible.is-open .iim-section-chevron {
    transform: rotate(225deg);
  }
  .iim-section-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 0 2px 30px;
  }
  .iim-section--collapsible .iim-section-body {
    padding-top: 14px;
  }

  .iim-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .iim-grid-1 { grid-template-columns: 1fr; }
  .iim-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
  }
  .iim-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 11.5px;
    font-weight: 500;
    letter-spacing: 0.01em;
    color: var(--fp-soft);
  }
  .iim-label-main { color: var(--fp-text); font-weight: 400; }
  .iim-hint {
    display: block;
    font-size: 11px;
    line-height: 1.4;
    color: var(--fp-muted);
  }
  .iim-optional {
    font-size: 10px;
    font-weight: 400;
    color: var(--fp-muted);
  }

  .iim-input,
  .iim-textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid color-mix(in srgb, var(--fp-border) 90%, transparent);
    border-radius: 11px;
    background: transparent;
    color: var(--fp-text);
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.45;
    padding: 11px 13px;
    outline: none;
    transition: border-color .14s ease, box-shadow .14s ease, background .14s ease;
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
  .iim-input:hover:not(:focus):not(:disabled),
  .iim-textarea:hover:not(:focus):not(:disabled) {
    border-color: color-mix(in srgb, var(--fp-text) 12%, var(--fp-border));
    background: color-mix(in srgb, var(--fp-inp) 28%, transparent);
  }
  .iim-input:focus,
  .iim-textarea:focus {
    border-color: color-mix(in srgb, var(--fp-text) 20%, var(--fp-border));
    background: color-mix(in srgb, var(--fp-inp) 42%, transparent);
    box-shadow: 0 0 0 4px var(--fp-glow);
  }
  .iim-input:-webkit-autofill,
  .iim-input:-webkit-autofill:hover,
  .iim-input:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--fp-text);
    -webkit-box-shadow: 0 0 0 1000px var(--fp-bg) inset;
    transition: background-color 9999s ease-out 0s;
  }

  @media (max-width: 768px) {
    .iim-layout {
      grid-template-columns: 1fr;
      gap: 18px;
    }
    .iim-preview-col { position: static; }
    .iim-section-body { padding-left: 0; }
  }
  @media (max-width: 560px) {
    .iim-grid { grid-template-columns: 1fr; }
    .iim-preview-title { font-size: 17px; }
  }
`
