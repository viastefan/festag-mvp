'use client'

/**
 * The focused surface behind "Entscheiden", "Andere Optionen" and "Ablehnen".
 *
 * Three steps in one spatial stack: the current step slides left as the next
 * one enters from the right, so moving through a decision feels like going
 * deeper into the project rather than opening unrelated dialogs.
 *
 *   confirm  — a short, deliberate check. Low-risk decisions get one line;
 *              a decision that blocks work or can't be reversed says so.
 *   options  — the real alternatives, with what each one changes.
 *   reject   — why the recommendation doesn't fit. Routed to the dev as a
 *              clarification so Tagro can re-frame instead of the decision
 *              simply dying.
 *
 * Every write goes through the existing endpoints (/decide, /discuss) — the
 * authority and audit rules live server-side and are not re-implemented here.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from '@phosphor-icons/react'
import type { AffectedWork } from '@/lib/decisions/affected'
import { resolveHandoffFromOption, type ExternalHandoff } from '@/lib/decisions/external-handoffs'
import { buildRationale } from '@/lib/decisions/rationale'
import DecisionBrandMark from '@/components/decisions/DecisionBrandMark'
import DecisionExternalHandoffModal from '@/components/decisions/DecisionExternalHandoffModal'
import {
  isDecisionDemoId,
  type DecOption,
  type Decision,
  type ProjectLite,
  type ResponseType,
  type ResponseValue,
} from '@/components/decisions/decisions-shared'

export type ResolveStep = 'confirm' | 'options' | 'reject' | 'why'

type Props = {
  decision: Decision
  project: ProjectLite | null
  affected?: AffectedWork
  options: DecOption[]
  recommended: DecOption | null
  initialStep: ResolveStep
  me: string
  onClose: () => void
  onResolved: (patch: Partial<Decision>) => void
  /** Falls back to the full drawer for guided external setup / free text. */
  onEscalateToDrawer: () => void
}

const REJECT_REASONS = [
  'Andere Präferenz',
  'Empfehlung passt nicht',
  'Weitere Informationen nötig',
  'Sonstiges',
]

export default function DecisionResolveSheet({
  decision, project, affected, options, recommended,
  initialStep, me, onClose, onResolved, onEscalateToDrawer,
}: Props) {
  const [step, setStep] = useState<ResolveStep>(initialStep)
  const [picked, setPicked] = useState<DecOption | null>(recommended)
  const [reason, setReason] = useState<string>('')
  const [reasonNote, setReasonNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [handoff, setHandoff] = useState<{ handoff: ExternalHandoff; option: DecOption } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const isMock = isDecisionDemoId(decision.id)
  const responseType: ResponseType = (decision.response_type as ResponseType) || 'single_choice'
  const blocked = affected?.blocks.length ?? 0
  const oneWay = decision.reversibility === 'one_way_door'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // "This changes 4 tasks and can't be undone" — shown only when true.
  const consequence = useMemo(() => {
    const parts: string[] = []
    if (blocked > 0) parts.push(`gibt ${blocked} ${blocked === 1 ? 'Aufgabe' : 'Aufgaben'} frei`)
    if (oneWay) parts.push('lässt sich später nur mit Aufwand ändern')
    if (parts.length === 0) return null
    return `Diese Entscheidung ${parts.join(' und ')}.`
  }, [blocked, oneWay])

  const write = useCallback(async (
    path: string,
    body: Record<string, unknown>,
    patch: Partial<Decision>,
  ) => {
    setBusy(true); setError('')
    try {
      if (isMock) { onResolved(patch); return true }
      const res = await fetch(`/api/decisions/${decision.id}/${path}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(
          res.status === 403
            ? 'Du kannst diese Entscheidung nicht freigeben.'
            : data?.error === 'not found'
              ? 'Diese Entscheidung existiert nicht mehr.'
              : 'Die Entscheidung konnte gerade nicht gespeichert werden.',
        )
        return false
      }
      const data = await res.json()
      onResolved(data.decision ?? patch)
      return true
    } catch {
      setError('Keine Verbindung. Deine Auswahl bleibt erhalten.')
      return false
    } finally {
      setBusy(false)
    }
  }, [decision.id, isMock, onResolved])

  const commit = useCallback(async (
    option: DecOption | null,
    binary?: 'yes' | 'no',
    /** Set once the user has confirmed the guided setup, so we don't re-prompt. */
    skipHandoff = false,
  ) => {
    // An option that needs setup in an external tool (Stripe dashboard, DNS,
    // …) shows those steps first — answering without doing them would record a
    // decision the project can't actually act on.
    if (option && binary !== 'no' && !skipHandoff) {
      const guided = resolveHandoffFromOption(option, decision.decision_type)
      if (guided) { setHandoff({ handoff: guided, option }); return }
    }

    let value: ResponseValue = null
    if (responseType === 'binary') {
      value = { binary_value: binary ?? 'yes' }
    } else if (responseType === 'multi_choice' && option) {
      value = { selected_option_ids: [String(option.external_id || option.id)] }
    } else if (option) {
      value = { selected_option_id: String(option.external_id || option.id) }
    }
    if (!value) { onEscalateToDrawer(); return }

    const legacy =
      'selected_option_id' in value ? value.selected_option_id
      : 'binary_value' in value ? value.binary_value
      : null

    const ok = await write('decide', { response_value: value, selected_option: legacy }, {
      status: 'decided',
      response_value: value,
      selected_option: legacy,
      decided_at: new Date().toISOString(),
      decided_by: me,
    })
    if (ok) onClose()
  }, [responseType, decision.decision_type, write, me, onClose, onEscalateToDrawer])

  const submitReject = useCallback(async () => {
    const label = reason || REJECT_REASONS[0]
    const note = reasonNote.trim()
    const question = note ? `${label} — ${note}` : label

    // Binary decisions have a real "no"; a rejected recommendation on a choice
    // decision is a question back to the team, not an answer.
    if (responseType === 'binary') {
      await commit(null, 'no')
      return
    }
    const ok = await write('discuss', { question: `Empfehlung abgelehnt: ${question}` }, {
      status: 'awaiting_clarification',
      decision_note: question,
    })
    if (ok) onClose()
  }, [reason, reasonNote, responseType, commit, write, onClose])

  const title = decision.client_title || decision.title
  const pickedLabel = picked ? (picked.client_label || picked.label) : null

  // The grounds behind the recommendation — built from what the engine stored,
  // never invented. Empty only when the decision carries no reasoning at all.
  const rationale = useMemo(
    () => buildRationale(decision, { work: affected, recommendationLabel: pickedLabel }),
    [decision, affected, pickedLabel],
  )

  return (
    <div className="drs-overlay" role="presentation" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div
        ref={panelRef}
        /* The guided-setup modal replaces this panel rather than stacking on
           top of it — two overlapping sheets read as a mistake. */
        className={`drs-panel is-${step}${handoff ? ' is-behind' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <button type="button" className="drs-close" onClick={onClose} aria-label="Schließen">
          <X size={15} />
        </button>

        {step === 'confirm' && (
          <div className="drs-step">
            {/* The headline carries the whole message — what is being chosen and
                what it changes. No kicker, no scattered small print. */}
            <h2 className="drs-title">
              {pickedLabel ? `${pickedLabel} für ${project?.title || title} auswählen?` : title}
              {consequence && <span className="drs-title-second"> {consequence}</span>}
            </h2>

            {(pickedLabel || picked?.description) && (
              <div className="drs-tagro">
                <p className="drs-tagro-head">Tagro empfiehlt {pickedLabel}</p>
                {(decision.tagro_recommendation_reason?.trim() || picked?.description) && (
                  <p className="drs-tagro-body">
                    {decision.tagro_recommendation_reason?.trim() || picked?.description}
                  </p>
                )}
                {rationale.length > 0 && (
                  <button type="button" className="drs-tagro-why" onClick={() => setStep('why')}>
                    Warum? <ArrowRight size={12} weight="regular" aria-hidden />
                  </button>
                )}
              </div>
            )}

            <div className="drs-actions">
              <button
                type="button"
                className="drs-btn drs-btn--primary"
                onClick={() => commit(picked, 'yes')}
                disabled={busy}
              >
                {busy ? 'Wird gespeichert…' : pickedLabel ? `${pickedLabel} auswählen` : 'Freigeben'}
                {!busy && <ArrowRight size={14} className="drs-btn-arrow" />}
              </button>
              {options.length > 1 && (
                <button type="button" className="drs-btn" onClick={() => setStep('options')} disabled={busy}>
                  Andere Optionen
                </button>
              )}
              <button type="button" className="drs-btn" onClick={() => setStep('reject')} disabled={busy}>
                Ablehnen
              </button>
            </div>
          </div>
        )}

        {step === 'options' && (
          <div className="drs-step">
            <button type="button" className="drs-back" onClick={() => setStep('confirm')}>
              <ArrowLeft size={13} /> Zurück
            </button>
            <h2 className="drs-title">{title}</h2>

            <ul className="drs-options">
              {options.map(opt => {
                const label = opt.client_label || opt.label
                const isRec = !!opt.recommended_by_tagro || opt.id === recommended?.id
                const isPicked = opt.id === picked?.id
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      className={`drs-option${isPicked ? ' is-picked' : ''}`}
                      onClick={() => { setPicked(opt); setStep('confirm') }}
                    >
                      <span className="drs-option-main">
                        <span className="drs-option-name">
                          <DecisionBrandMark label={label} />
                          {label}
                          {isRec && <span className="drs-option-rec">Tagro empfiehlt</span>}
                        </span>
                        {opt.description && <span className="drs-option-desc">{opt.description}</span>}
                      </span>
                      {isPicked && <Check size={14} className="drs-option-check" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {step === 'why' && (
          <div className="drs-step">
            <button type="button" className="drs-back" onClick={() => setStep('confirm')}>
              <ArrowLeft size={13} /> Zurück
            </button>
            <h2 className="drs-title">
              Warum Tagro das vorschlägt.
              <span className="drs-title-second"> {title}</span>
            </h2>

            <div className="drs-why">
              {rationale.map(block => (
                <section key={block.label} className="drs-why-block">
                  <p className="drs-why-label">{block.label}</p>
                  <p className="drs-why-body">{block.body}</p>
                  {block.detail && block.detail.length > 0 && (
                    <ul className="drs-why-detail">
                      {block.detail.map(line => <li key={line}>{line}</li>)}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            <p className="drs-why-foot">
              Tagro bereitet Entscheidungen auf und begründet sie — treffen tust du sie.
            </p>

            <div className="drs-actions">
              <button type="button" className="drs-btn drs-btn--primary" onClick={() => setStep('confirm')}>
                Verstanden
              </button>
            </div>
          </div>
        )}

        {step === 'reject' && (
          <div className="drs-step">
            <button type="button" className="drs-back" onClick={() => setStep('confirm')}>
              <ArrowLeft size={13} /> Zurück
            </button>
            <h2 className="drs-title">
              Warum passt das nicht?
              <span className="drs-title-second"> Tagro bereitet die Entscheidung damit neu auf,
              die bisherige Empfehlung bleibt im Verlauf.</span>
            </h2>

            <div className="drs-reasons">
              {REJECT_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  className={`drs-reason${reason === r ? ' is-on' : ''}`}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              className="drs-note"
              placeholder="Optional: kurz erklären (hilft Tagro)"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              rows={3}
            />

            <div className="drs-actions">
              <button
                type="button"
                className="drs-btn drs-btn--primary"
                onClick={submitReject}
                disabled={busy || !reason}
              >
                {busy ? 'Wird gesendet…' : 'Ablehnen'}
              </button>
              <button type="button" className="drs-btn" onClick={() => setStep('confirm')} disabled={busy}>
                Zurück
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="drs-error" role="alert">
            {error}
            <button type="button" onClick={() => setError('')}>Erneut versuchen</button>
          </p>
        )}
      </div>

      {/* Guided setup in an external tool — the answer is only recorded once
          the user confirms they have done it. */}
      {handoff && (
        <DecisionExternalHandoffModal
          handoff={handoff.handoff}
          decisionTitle={title}
          projectTitle={project?.title}
          onClose={() => setHandoff(null)}
          onConfirm={async () => {
            const option = handoff.option
            setHandoff(null)
            await commit(option, 'yes', true)
          }}
        />
      )}
    </div>
  )
}
