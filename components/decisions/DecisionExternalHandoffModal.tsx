'use client'

import { useState } from 'react'
import { ArrowSquareOut, CheckCircle, X } from '@phosphor-icons/react'
import type { ExternalHandoff } from '@/lib/decisions/external-handoffs'

type Props = {
  handoff: ExternalHandoff
  decisionTitle: string
  projectTitle?: string | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

export default function DecisionExternalHandoffModal({
  handoff,
  decisionTitle,
  projectTitle,
  onClose,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [openedExternal, setOpenedExternal] = useState(false)

  function openExternal() {
    window.open(handoff.url, '_blank', 'noopener,noreferrer')
    setOpenedExternal(true)
  }

  async function confirm() {
    if (busy) return
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dec-handoff-overlay" role="presentation" onClick={onClose}>
      <div
        className="dec-handoff-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dec-handoff-title"
        onClick={e => e.stopPropagation()}
      >
        <header className="dec-handoff-head">
          <div className="dec-handoff-head-copy">
            <p className="dec-handoff-kicker">{handoff.providerLabel} · Schritt für Schritt</p>
            <h2 id="dec-handoff-title" className="dec-handoff-title">{decisionTitle}</h2>
            {projectTitle && <p className="dec-handoff-sub">{projectTitle}</p>}
          </div>
          <button type="button" className="dec-handoff-close" onClick={onClose} aria-label="Schließen">
            <X size={16} weight="bold" />
          </button>
        </header>

        <div className="dec-handoff-body">
          <p className="dec-handoff-lead">
            Festag führt dich durch die Einrichtung in {handoff.providerLabel}. Danach bestätigst du die Entscheidung — das Team setzt den Rest um.
          </p>
          <ol className="dec-handoff-steps">
            {handoff.steps.map((step, i) => (
              <li key={`${i}-${step.body.slice(0, 24)}`} className="dec-handoff-step">
                <span className="dec-handoff-step-num" aria-hidden>{i + 1}</span>
                <div className="dec-handoff-step-copy">
                  {step.title && <strong>{step.title}</strong>}
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          {handoff.note && <p className="dec-handoff-note">{handoff.note}</p>}
        </div>

        <footer className="dec-handoff-foot">
          <button type="button" className="dec-handoff-open" onClick={openExternal}>
            <ArrowSquareOut size={15} weight="regular" />
            {handoff.openLabel}
          </button>
          <button
            type="button"
            className="dec-handoff-confirm"
            onClick={() => void confirm()}
            disabled={busy}
          >
            <CheckCircle size={15} weight="bold" />
            {busy ? 'Speichere…' : handoff.confirmLabel}
          </button>
          {!openedExternal && (
            <p className="dec-handoff-hint">Tipp: Öffne {handoff.providerLabel} in einem neuen Tab und arbeite die Schritte ab.</p>
          )}
        </footer>
      </div>
    </div>
  )
}
