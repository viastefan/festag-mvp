'use client'

/**
 * "Zur Abnahme geben" — the last missing link in the loop.
 *
 * Two fields, because a review submission with neither is thin: what is done,
 * and the text of the document the change requests came from. Tagro turns that
 * text into the numbered list the reviewer ticks through, which is the whole
 * point of pasting it here rather than mailing the PDF around.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, X } from '@phosphor-icons/react'

type Props = {
  taskId: string
  taskTitle: string
  onClose: () => void
  onSubmitted: (info: { roundNumber: number; findings: number; analysis: string | null }) => void
}

export default function TaskReviewSubmitSheet({ taskId, taskTitle, onClose, onSubmitted }: Props) {
  const [summary, setSummary] = useState('')
  const [documentText, setDocumentText] = useState('')
  const [showDoc, setShowDoc] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const submit = useCallback(async () => {
    if (busy) return
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/review/rounds', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          summary: summary.trim() || undefined,
          document_text: documentText.trim() || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        // The API names its refusals; show those words rather than a generic one.
        setError(body?.message || 'Die Abnahme konnte nicht gestartet werden.')
        return
      }
      onSubmitted({
        roundNumber: body.round?.number ?? 1,
        findings: body.findings ?? 0,
        analysis: body.analysis ?? null,
      })
    } catch {
      setError('Keine Verbindung. Dein Text bleibt erhalten.')
    } finally {
      setBusy(false)
    }
  }, [taskId, summary, documentText, busy, onSubmitted])

  return (
    <div className="drs-overlay" role="presentation" onMouseDown={e => {
      if (e.target === e.currentTarget && !busy) onClose()
    }}>
      <div ref={panelRef} className="drs-panel" role="dialog" aria-modal="true"
        aria-label="Zur Abnahme geben" tabIndex={-1}>
        <button type="button" className="drs-close" onClick={onClose}
          aria-label="Schließen" disabled={busy}>
          <X size={15} />
        </button>

        <div className="drs-step">
          <h2 className="drs-title">
            Zur Abnahme geben
            <span className="drs-title-second"> „{taskTitle}" landet als Abnahme im Konto der anderen Seite.</span>
          </h2>

          <label className="dask-label" htmlFor="trs-summary">Was ist fertig?</label>
          <textarea
            id="trs-summary"
            className="drs-note"
            placeholder="z. B. Alle Punkte aus dem PDF vom Dienstag sind umgesetzt."
            value={summary}
            onChange={e => setSummary(e.target.value)}
            rows={2}
            autoFocus
          />

          {showDoc ? (
            <>
              <label className="dask-label" htmlFor="trs-doc">
                Text aus dem Dokument <span>Tagro macht eine Punkteliste daraus</span>
              </label>
              <textarea
                id="trs-doc"
                className="drs-note"
                placeholder="Inhalt der PDF hier einfügen — Tagro trennt daraus die einzelnen Änderungen."
                value={documentText}
                onChange={e => setDocumentText(e.target.value)}
                rows={6}
              />
            </>
          ) : (
            <button type="button" className="trs-add-doc" onClick={() => setShowDoc(true)}>
              Text aus einem Dokument einfügen
            </button>
          )}

          {busy && documentText.trim() && (
            <p className="dask-hint">Tagro liest das Dokument und trennt die Punkte…</p>
          )}

          {error && <p className="drs-error" role="alert">{error}</p>}

          <div className="drs-actions">
            <button type="button" className="drs-btn drs-btn--primary" onClick={() => void submit()}
              disabled={busy}>
              {busy ? 'Wird eingereicht…' : 'Zur Abnahme geben'}
              {!busy && <ArrowRight size={14} className="drs-btn-arrow" aria-hidden />}
            </button>
            <button type="button" className="drs-btn" onClick={onClose} disabled={busy}>
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
