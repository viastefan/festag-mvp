'use client'

/**
 * The verdict surface for a review round.
 *
 * A review is not a two-option decision, so it does not borrow the ordinary
 * answer form. It has three real outcomes and a list of concrete points, and
 * the reviewer needs to see the points before choosing between them.
 *
 *   Abnehmen           the work is accepted and the task closes
 *   Änderungen         round N+1 opens carrying what is still wrong
 *   Rückfrage          nothing is judged yet; the submitter has to answer first
 *
 * Ticking a point is not the verdict — it is how the reviewer keeps track while
 * reading. The verdict is the one deliberate act at the end.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from '@phosphor-icons/react'

export type ReviewFinding = {
  id: string
  ordinal: number
  title: string
  detail: string | null
  status: 'open' | 'fixed' | 'wont_fix' | 'deferred'
  source: 'document' | 'reviewer' | 'tagro' | 'submitter'
  location_hint: string | null
}

export type ReviewRound = {
  id: string
  round_number: number
  status: string
  summary: string | null
  submitted_at: string
  findings: ReviewFinding[]
}

type Step = 'read' | 'changes' | 'question'

type Props = {
  decisionId: string
  title: string
  onClose: () => void
  onResolved: (result: { verdict: 'accepted' | 'changes_requested' | 'question'; note?: string }) => void
}

const SOURCE_LABEL: Record<ReviewFinding['source'], string> = {
  document: 'aus dem Dokument',
  reviewer: 'von dir',
  tagro: 'von Tagro markiert',
  submitter: 'vom Team',
}

export default function DecisionReviewSheet({ decisionId, title, onClose, onResolved }: Props) {
  const [round, setRound] = useState<ReviewRound | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [step, setStep] = useState<Step>('read')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let alive = true
    setLoading(true); setLoadError(false)
    fetch(`/api/review/rounds?decision_id=${decisionId}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive) return
        const first = d?.rounds?.[0] ?? null
        if (!first) { setLoadError(true); return }
        setRound(first)
      })
      .catch(() => { if (alive) setLoadError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [decisionId])

  const send = useCallback(async (
    verdict: 'accepted' | 'changes_requested' | 'question',
  ) => {
    if (!round || busy) return
    if (verdict === 'question' && !note.trim()) {
      setError('Schreib die Rückfrage auf, sonst weiß niemand, was fehlt.')
      return
    }
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/review/rounds/${round.id}/verdict`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verdict,
          note: note.trim() || undefined,
          // Points still open are what round N+1 has to carry.
          findings: verdict === 'changes_requested'
            ? round.findings.filter(f => f.status === 'open')
                .map(f => ({ title: f.title, detail: f.detail, source: 'reviewer' as const }))
            : undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.message || 'Das Urteil konnte nicht gespeichert werden.')
        return
      }
      onResolved({ verdict, note: note.trim() || undefined })
    } catch {
      setError('Keine Verbindung. Deine Notiz bleibt erhalten.')
    } finally {
      setBusy(false)
    }
  }, [round, note, busy, onResolved])

  const openCount = round?.findings.filter(f => f.status === 'open').length ?? 0

  return (
    <div className="drs-overlay" role="presentation" onMouseDown={e => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div ref={panelRef} className="drs-panel" role="dialog" aria-modal="true"
        aria-label={title} tabIndex={-1}>
        <button type="button" className="drs-close" onClick={onClose} aria-label="Schließen">
          <X size={15} />
        </button>

        {loading ? (
          <div className="drs-step">
            <h2 className="drs-title">Abnahme wird geladen…</h2>
            <p className="drs-lead">Tagro holt die Punkte aus dieser Runde.</p>
          </div>
        ) : loadError || !round ? (
          <div className="drs-step">
            <h2 className="drs-title">
              Diese Abnahme gibt es nicht mehr.
              <span className="drs-title-second"> Sie wurde zurückgezogen oder bereits entschieden.</span>
            </h2>
            <div className="drs-actions">
              <button type="button" className="drs-btn drs-btn--primary" onClick={onClose}>
                Schließen
              </button>
            </div>
          </div>
        ) : step === 'read' ? (
          <div className="drs-step">
            <h2 className="drs-title">
              {title}
              <span className="drs-title-second">
                {' '}Runde {round.round_number}
                {openCount > 0 ? ` · ${openCount} ${openCount === 1 ? 'Punkt' : 'Punkte'}` : ''}.
              </span>
            </h2>

            {round.summary && <p className="drs-lead">{round.summary}</p>}

            {round.findings.length > 0 ? (
              <ul className="drv-findings">
                {round.findings.map(f => (
                  <li key={f.id} className={`drv-finding is-${f.status}`}>
                    <span className="drv-finding-mark" aria-hidden>
                      {f.status !== 'open' && <Check size={11} weight="bold" />}
                    </span>
                    <span className="drv-finding-copy">
                      <span className="drv-finding-title">{f.title}</span>
                      {f.detail && <span className="drv-finding-detail">{f.detail}</span>}
                      <span className="drv-finding-meta">
                        {[SOURCE_LABEL[f.source], f.location_hint].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="drs-body">
                Für diese Runde sind keine einzelnen Punkte hinterlegt — beurteile
                die Arbeit als Ganzes.
              </p>
            )}

            <div className="drs-actions">
              <button type="button" className="drs-btn drs-btn--primary"
                onClick={() => void send('accepted')} disabled={busy}>
                {busy ? 'Wird gespeichert…' : 'Abnehmen'}
                {!busy && <ArrowRight size={14} className="drs-btn-arrow" aria-hidden />}
              </button>
              <button type="button" className="drs-btn" onClick={() => setStep('changes')} disabled={busy}>
                Änderungen anfordern
              </button>
              <button type="button" className="drs-btn" onClick={() => setStep('question')} disabled={busy}>
                Erst nachfragen
              </button>
            </div>
            {error && <p className="drs-error" role="alert">{error}</p>}
          </div>
        ) : (
          <div className="drs-step">
            <button type="button" className="drs-back" onClick={() => { setStep('read'); setError('') }}>
              <ArrowLeft size={13} /> Zurück
            </button>
            <h2 className="drs-title">
              {step === 'changes' ? 'Was passt noch nicht?' : 'Was ist unklar?'}
              <span className="drs-title-second">
                {step === 'changes'
                  ? ` Runde ${round.round_number + 1} startet mit deinen Punkten${openCount > 0 ? ` und den ${openCount} offenen aus dieser Runde` : ''}.`
                  : ' Die Runde bleibt offen — du kannst danach immer noch abnehmen.'}
              </span>
            </h2>

            <textarea
              className="drs-note"
              placeholder={step === 'changes'
                ? 'z. B. Der Footer zeigt noch die alte Telefonnummer.'
                : 'z. B. Welche der beiden Varianten ist jetzt live?'}
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              autoFocus
            />

            {error && <p className="drs-error" role="alert">{error}</p>}

            <div className="drs-actions">
              <button type="button" className="drs-btn drs-btn--primary"
                onClick={() => void send(step === 'changes' ? 'changes_requested' : 'question')}
                disabled={busy || (step === 'question' && !note.trim())}>
                {busy ? 'Wird gesendet…' : step === 'changes' ? 'Änderungen anfordern' : 'Rückfrage senden'}
              </button>
              <button type="button" className="drs-btn" onClick={() => { setStep('read'); setError('') }}
                disabled={busy}>
                Zurück
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
