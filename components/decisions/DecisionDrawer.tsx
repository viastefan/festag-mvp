'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChatCircleText, Check, CheckCircle, Clock, Sparkle, Warning, WarningCircle, X, UserCircle, CaretDown,
} from '@phosphor-icons/react'
import FestagPillButton from '@/components/ui/FestagPillButton'
import ClampedTip from '@/components/decisions/ClampedTip'
import { openTagro } from '@/components/TagroOverlay'
import { createClient } from '@/lib/supabase/client'
import {
  type Decision, type ProjectLite, type ResponseType, type DecOption, type ResponseValue,
  URGENCY_LABEL, URGENCY_TONE, fmtDueIn, fmtCountdown, DUE_SOURCE_LABEL,
} from '@/components/decisions/decisions-shared'

type WorkspaceMember = { id: string; full_name: string | null; email: string | null; avatar_url: string | null; role?: string | null }

export function DecisionDrawer({
  decision, project, me, isDecider, onClose, onPatch, variant = 'drawer',
  initialDiscussOpen = false,
}: {
  decision: Decision
  project: ProjectLite | null
  me: string
  isDecider: boolean
  onClose: () => void
  onPatch: (p: Partial<Decision>) => void
  variant?: 'drawer' | 'page'
  initialDiscussOpen?: boolean
}) {
  // Response type drives the answer form. Default to single_choice for
  // back-compat with legacy decisions where the field is null.
  const responseType: ResponseType = (decision.response_type as ResponseType) || 'single_choice'

  // Structured options live in decision_options (loaded via expand);
  // legacy options_json acts as a fallback for older decisions.
  const [structuredOptions, setStructuredOptions] = useState<DecOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  // Form state, keyed by response_type.
  const [selected, setSelected] = useState<string>(decision.selected_option || '')
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set())
  const [binaryValue, setBinaryValue] = useState<'yes' | 'no' | ''>('')
  const [note, setNote] = useState<string>(decision.decision_note || '')
  const [rationale, setRationale] = useState<string>('')

  // Action state.
  const [suggesting, setSuggesting] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [delegating, setDelegating] = useState(false)
  const [discussing, setDiscussing] = useState(false)
  const [discussOpen, setDiscussOpen] = useState(initialDiscussOpen)
  const [discussQuestion, setDiscussQuestion] = useState('')
  const [error, setError] = useState<string>('')

  // Live clock for the override-window countdown. Ticks once a minute and only
  // while a window is actually open — no idle timers otherwise.
  const [nowTs, setNowTs] = useState(() => Date.now())
  useEffect(() => {
    if (!decision.override_window_until) return
    const id = setInterval(() => setNowTs(Date.now()), 30000)
    return () => clearInterval(id)
  }, [decision.override_window_until])

  // ── Delegation to a teammate (e.g. a co-founder once a team exists) ──
  const supabase = useMemo(() => createClient(), [])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)

  // Load the workspace members of this decision's project so the decider can
  // hand the decision to a specific teammate. RLS gates non-members.
  useEffect(() => {
    const wsId = project?.workspace_id
    if (!wsId) { setMembers([]); return }
    let cancelled = false
    ;(async () => {
      const { data: rows } = await (supabase as any)
        .from('workspace_members').select('user_id').eq('workspace_id', wsId)
      const ids = Array.from(new Set(((rows ?? []) as any[]).map(r => r.user_id))).filter(Boolean)
      if (!ids.length) { if (!cancelled) setMembers([]); return }
      const { data: profs } = await (supabase as any)
        .from('profiles').select('id,full_name,email,avatar_url,role').in('id', ids)
      if (!cancelled) setMembers(((profs ?? []) as WorkspaceMember[]))
    })()
    return () => { cancelled = true }
  }, [project?.workspace_id, supabase])

  async function assignTo(userId: string) {
    if (assigning) return
    setAssigning(true); setError('')
    try {
      const res = await fetch(`/api/decisions/${decision.id}/assign`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_id: userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data?.reason || 'Zuweisung gerade nicht möglich.'); return }
      onPatch(data.decision)
      setAssignOpen(false)
    } finally {
      setAssigning(false)
    }
  }

  // Pre-populate from existing response_value when re-opening a decided
  // decision.
  useEffect(() => {
    if (!decision.response_value) return
    const rv = decision.response_value as any
    if ('selected_option_id' in rv) setSelected(String(rv.selected_option_id))
    if ('binary_value' in rv) setBinaryValue(rv.binary_value === 'no' ? 'no' : 'yes')
    if ('selected_option_ids' in rv && Array.isArray(rv.selected_option_ids)) setMultiSelected(new Set(rv.selected_option_ids))
    if ('free_text' in rv && typeof rv.free_text === 'string') setNote(rv.free_text)
  }, [decision.response_value])

  useEffect(() => {
    if (variant === 'page') return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, variant])

  // Pull structured options when drawer opens.
  useEffect(() => {
    let abort = false
    setOptionsLoading(true)
    fetch(`/api/decisions/${decision.id}?expand=options`, { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (abort) return
        const rows = Array.isArray(data?.options) ? data.options as DecOption[] : []
        setStructuredOptions(rows)
      })
      .finally(() => { if (!abort) setOptionsLoading(false) })
    return () => { abort = true }
  }, [decision.id])

  async function runTagro() {
    if (suggesting) return
    setSuggesting(true); setError('')
    try {
      const res = await fetch(`/api/decisions/${decision.id}/suggest`, { method: 'POST', credentials: 'include' })
      if (!res.ok) { setError('Tagro konnte gerade nicht antworten.'); return }
      const data = await res.json()
      onPatch({
        recommended_option: data.recommended_option || null,
        tagro_reasoning: data.reasoning || '',
        tagro_run_at: new Date().toISOString(),
        urgency: data.urgency_hint || decision.urgency,
      } as Partial<Decision>)
    } finally {
      setSuggesting(false)
    }
  }

  async function applyTagro() {
    if (decision.recommended_option && decision.recommended_option !== 'freeform') {
      setSelected(decision.recommended_option)
    }
  }

  // Build response_value from the active form state.
  function buildResponseValue(): ResponseValue {
    switch (responseType) {
      case 'binary':
        if (binaryValue === 'yes' || binaryValue === 'no') return { binary_value: binaryValue }
        return null
      case 'single_choice':
        return selected ? { selected_option_id: selected } : null
      case 'multi_choice':
        return multiSelected.size > 0 ? { selected_option_ids: Array.from(multiSelected) } : null
      case 'free_text':
        return note.trim() ? { free_text: note.trim() } : null
      default:
        return null
    }
  }

  async function submitDecision() {
    if (deciding) return
    const responseValue = buildResponseValue()
    if (!responseValue) {
      setError(responseType === 'free_text' ? 'Schreibe eine Antwort.' : 'Wähle eine Option.')
      return
    }
    setDeciding(true); setError('')
    try {
      const res = await fetch(`/api/decisions/${decision.id}/decide`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_value: responseValue,
          rationale: rationale.trim() || undefined,
          // Legacy mirrors for older /decide expectations.
          selected_option:
            'selected_option_id' in responseValue ? responseValue.selected_option_id
            : 'binary_value' in responseValue ? responseValue.binary_value
            : null,
          decision_note:
            'free_text' in responseValue ? responseValue.free_text
            : rationale.trim() || null,
        }),
      })
      if (!res.ok) { setError('Konnte nicht speichern.'); return }
      const data = await res.json()
      onPatch(data.decision)
      onClose()
    } finally {
      setDeciding(false)
    }
  }

  async function delegateToTagro() {
    if (delegating) return
    setDelegating(true); setError('')
    try {
      const res = await fetch(`/api/decisions/${decision.id}/delegate`, {
        method: 'POST', credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.reason || 'Delegation gerade nicht möglich.')
        return
      }
      const data = await res.json()
      onPatch(data.decision)
      onClose()
    } finally {
      setDelegating(false)
    }
  }

  async function submitDiscuss() {
    if (discussing || !discussQuestion.trim()) return
    setDiscussing(true); setError('')
    try {
      const res = await fetch(`/api/decisions/${decision.id}/discuss`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: discussQuestion.trim() }),
      })
      if (!res.ok) { setError('Rückfrage konnte nicht gesendet werden.'); return }
      const data = await res.json()
      onPatch(data.decision)
      setDiscussOpen(false)
      setDiscussQuestion('')
    } finally {
      setDiscussing(false)
    }
  }

  // Use structured options when present, fall back to legacy.
  const renderOptions: DecOption[] = structuredOptions.length > 0
    ? structuredOptions
    : (decision.options_json || []).map((o) => ({ id: o.id, label: o.label, description: o.hint }))

  const tagroRec = decision.recommended_option
  const isAnswered = decision.status === 'decided' || decision.status === 'applied'
  const isDelegated = !!decision.tagro_delegation_reason && !decision.decided_by
  const isAwaitingClarification = decision.status === 'awaiting_clarification'
  // Delegation is offered only on a reversible (two-way door) decision — the
  // engine never auto-resolves a one-way door, so neither does the client.
  const canDelegate =
    !!decision.delegate_allowed &&
    decision.reversibility === 'two_way_door' &&
    responseType !== 'free_text' &&
    !isAnswered &&
    isDecider
  // Escalation badge: level 2 = raised to owner, level 3 = auto-resolved/locked.
  const escalationLevel = decision.escalation_level ?? 0
  const isEscalated = escalationLevel >= 2 && !isAnswered

  const panelBody = (
    <>
        {variant !== 'page' && (
          <header className="dec-drawer-head">
            <div className="dec-drawer-meta">
              <span className="dec-kicker">Entscheidung</span>
              <span className="dec-saved">
                {project && <><span className="dec-row-dot" style={{ background: project.color || 'var(--text-muted)' }} /> {project.title} · </>}
                {fmtAgo(decision.updated_at)}
              </span>
            </div>
            <div className="dec-drawer-actions">
              <button
                className="dec-tagro-cta"
                type="button"
                onClick={() => openTagro({
                  contextType: 'decision',
                  id: decision.id,
                  title: decision.client_title || decision.title,
                  subtitle: project?.title,
                })}
              >
                Mit Tagro bearbeiten
              </button>
              <button className="dec-icon-btn" onClick={onClose} title="Schließen" type="button">
                <X size={13} />
              </button>
            </div>
          </header>
        )}

        <div className={`dec-drawer-body${variant === 'page' ? ' dec-page-body' : ''}`}>
          {variant !== 'page' && (
            <>
              <h2 className="dec-d-title">{decision.client_title || decision.title}</h2>
              {(decision.client_summary || decision.description) && (
                <p className="dec-d-desc">{decision.client_summary || decision.description}</p>
              )}
            </>
          )}

          {variant !== 'page' && (
          <div className="dec-d-meta">
            <span className={`dec-pill tone-${URGENCY_TONE[decision.urgency] || 'muted'}`}>
              Dringlichkeit: {URGENCY_LABEL[decision.urgency] || 'Normal'}
              {typeof decision.urgency_score === 'number' && (
                <strong style={{ marginLeft: 5, fontWeight: 500, opacity: 0.7 }}>
                  {Math.round(decision.urgency_score)}
                </strong>
              )}
            </span>
            {isEscalated && (
              <span className="dec-pill tone-red">
                <WarningCircle size={10} weight="fill" />
                {escalationLevel >= 3 ? 'Frist abgelaufen' : 'An Owner eskaliert'}
              </span>
            )}
            {(decision.due_at || decision.due_date) && (
              <span className="dec-pill tone-muted">
                <Clock size={10} /> {fmtDueIn(decision.due_at || decision.due_date)}
                {decision.effective_due_source && DUE_SOURCE_LABEL[decision.effective_due_source] && (
                  <span style={{ opacity: 0.6 }}> · {DUE_SOURCE_LABEL[decision.effective_due_source]}</span>
                )}
              </span>
            )}
            {isAnswered && (
              <span className="dec-pill tone-good">
                <CheckCircle size={10} weight="fill" />
                {decision.status === 'applied' ? 'Umgesetzt' : 'Entschieden'}
              </span>
            )}
            {isDelegated && (
              <span className="dec-pill tone-muted">
                <Sparkle size={10} weight="fill" /> Von Tagro entschieden
              </span>
            )}
            {isAwaitingClarification && (
              <span className="dec-pill tone-amber">
                <ChatCircleText size={10} /> Rückfrage
              </span>
            )}
          </div>
          )}

          {isAwaitingClarification && (
            <div className="dec-clarification">
              Diese Entscheidung wartet aktuell auf eine Klärung. Tagro überarbeitet die Optionen, sobald die offene Frage beantwortet ist.
            </div>
          )}

          {/* Tagro suggestion panel */}
          <section className="dec-tagro">
            <header className="dec-tagro-head">
              <div>
                <span className="dec-tagro-kicker"><Sparkle size={11} weight="fill" /> Tagro-Empfehlung</span>
                {decision.tagro_run_at
                  ? <span className="dec-tagro-time">Zuletzt {fmtAgo(decision.tagro_run_at)}</span>
                  : <span className="dec-tagro-time">Noch nicht analysiert</span>}
              </div>
              <button className="dec-tagro-run" type="button" onClick={runTagro} disabled={suggesting}>
                <ArrowsClockwise size={11} className={suggesting ? 'dec-spin' : ''} />
                {suggesting ? 'Tagro liest…' : decision.tagro_run_at ? 'Neu analysieren' : 'Tagro analysieren'}
              </button>
            </header>

            {!decision.tagro_run_at && !suggesting && (
              <p className="dec-tagro-empty">Lass Tagro die Optionen einmal durchgehen — bekommt einen ruhigen Vorschlag mit Begründung.</p>
            )}

            {decision.tagro_reasoning && (
              <div className="dec-tagro-rec">
                {tagroRec && tagroRec !== 'freeform' && (
                  <div className="dec-tagro-pick">
                    <strong>Empfohlene Option:</strong> {renderOptions.find((o) => (o.external_id || o.id) === tagroRec)?.client_label
                      || renderOptions.find((o) => (o.external_id || o.id) === tagroRec)?.label
                      || tagroRec}
                  </div>
                )}
                <p className="dec-tagro-text">{decision.tagro_reasoning}</p>
                {tagroRec && tagroRec !== 'freeform' && !isAnswered && isDecider && (
                  <button type="button" className="dec-tagro-apply" onClick={applyTagro}>
                    Tagros Vorschlag übernehmen
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Answer form */}
          {isDecider && !isAnswered && (
            <section className="dec-answer">
              <p className="dec-answer-label">Deine Antwort</p>

              {responseType === 'binary' && (
                <div className="dec-binary">
                  <button
                    type="button"
                    className={`dec-binary-btn${binaryValue === 'yes' ? ' on' : ''}`}
                    onClick={() => setBinaryValue('yes')}
                  >Ja</button>
                  <button
                    type="button"
                    className={`dec-binary-btn${binaryValue === 'no' ? ' on' : ''}`}
                    onClick={() => setBinaryValue('no')}
                  >Nein</button>
                </div>
              )}

              {responseType === 'single_choice' && renderOptions.length > 0 && (
                <div className="dec-options">
                  {renderOptions.map((o) => {
                    const id = o.external_id || o.id
                    const isRec = o.recommended_by_tagro || tagroRec === id
                    return (
                      <label key={o.id} className={`dec-option${selected === id ? ' on' : ''}${isRec ? ' tagro' : ''}`}>
                        <input
                          type="radio"
                          name="dec-option"
                          value={id}
                          checked={selected === id}
                          onChange={() => setSelected(id)}
                        />
                        <span className="dec-option-body">
                          <strong>{o.client_label || o.label}</strong>
                          {(o.description || (o as any).hint) && <small>{o.description || (o as any).hint}</small>}
                        </span>
                        {isRec && <span className="dec-option-tagro"><Sparkle size={10} weight="fill" /> Tagro</span>}
                      </label>
                    )
                  })}
                </div>
              )}

              {responseType === 'multi_choice' && renderOptions.length > 0 && (
                <div className="dec-options">
                  {renderOptions.map((o) => {
                    const id = o.external_id || o.id
                    const checked = multiSelected.has(id)
                    const isRec = o.recommended_by_tagro || tagroRec === id
                    return (
                      <label key={o.id} className={`dec-option${checked ? ' on' : ''}${isRec ? ' tagro' : ''}`}>
                        <input
                          type="checkbox"
                          value={id}
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(multiSelected)
                            if (e.target.checked) next.add(id); else next.delete(id)
                            setMultiSelected(next)
                          }}
                        />
                        <span className="dec-option-body">
                          <strong>{o.client_label || o.label}</strong>
                          {(o.description || (o as any).hint) && <small>{o.description || (o as any).hint}</small>}
                        </span>
                        {isRec && <span className="dec-option-tagro"><Sparkle size={10} weight="fill" /> Tagro</span>}
                      </label>
                    )
                  })}
                </div>
              )}

              {responseType === 'free_text' && (
                <textarea
                  className="dec-note"
                  placeholder="Schreib hier deine Antwort…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              )}

              {responseType !== 'free_text' && (
                <textarea
                  className="dec-note dec-rationale"
                  placeholder="Optional: kurze Begründung…"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                />
              )}

              {error && <p className="dec-error"><Warning size={11} /> {error}</p>}

              <div className="dec-answer-actions">
                <button type="button" className="dec-primary" onClick={submitDecision} disabled={deciding}>
                  <CheckCircle size={12} weight="bold" />
                  {deciding ? 'Speichere…' : 'Entscheidung absenden'}
                </button>
                {canDelegate && (
                  <button type="button" className="dec-secondary" onClick={delegateToTagro} disabled={delegating}>
                    <Sparkle size={11} weight="fill" />
                    {delegating ? 'Tagro entscheidet…' : 'Tagro entscheiden lassen'}
                  </button>
                )}
                {!isAwaitingClarification && (
                  <button type="button" className="dec-secondary dec-secondary-quiet" onClick={() => setDiscussOpen((v) => !v)}>
                    <ChatCircleText size={11} />
                    Diskutieren
                  </button>
                )}
                {isDecider && members.length > 0 && (
                  <div className="dec-assign-wrap">
                    <button
                      type="button"
                      className="dec-secondary dec-secondary-quiet"
                      onClick={() => setAssignOpen((v) => !v)}
                      disabled={assigning}
                    >
                      <UserCircle size={12} />
                      {assigning ? 'Weise zu…' : 'Zuweisen'}
                      <CaretDown size={10} />
                    </button>
                    {assignOpen && (
                      <div className="dec-assign-menu" role="menu">
                        <p className="dec-assign-head">An Teammitglied übergeben</p>
                        {members.map((m) => {
                          const name = m.full_name || m.email || 'Teammitglied'
                          const isCurrent = decision.requested_for === m.id
                          return (
                            <button
                              key={m.id}
                              type="button"
                              className={`dec-assign-opt${isCurrent ? ' on' : ''}`}
                              onClick={() => assignTo(m.id)}
                              disabled={assigning || isCurrent}
                            >
                              <span className="dec-assign-av">
                                {m.avatar_url ? <img src={m.avatar_url} alt="" /> : (name[0] || '·').toUpperCase()}
                              </span>
                              <span className="dec-assign-name">
                                {name}{m.id === me ? ' (du)' : ''}
                                {m.role ? <small>{m.role}</small> : null}
                              </span>
                              {isCurrent && <Check size={12} weight="bold" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {discussOpen && (
                <div className="dec-discuss">
                  <textarea
                    className="dec-note"
                    placeholder="Worum geht es noch? Tagro nimmt die Frage auf und schärft das Framing."
                    value={discussQuestion}
                    onChange={(e) => setDiscussQuestion(e.target.value)}
                  />
                  <div className="dec-discuss-actions">
                    <button
                      type="button"
                      className="dec-secondary"
                      onClick={submitDiscuss}
                      disabled={discussing || !discussQuestion.trim()}
                    >
                      {discussing ? 'Sende…' : 'Rückfrage absenden'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {isAnswered && (
            <section className="dec-final">
              <p className="dec-answer-label">
                {isDelegated ? 'Von Tagro getroffene Entscheidung' : 'Getroffene Entscheidung'}
              </p>
              {renderResponseValue(decision, renderOptions)}
              {(decision.rationale || decision.decision_note) && (
                <p className="dec-final-note">{decision.rationale || decision.decision_note}</p>
              )}
              {isDelegated && decision.tagro_delegation_reason && (
                <p className="dec-final-note dec-delegation-reason">
                  <Sparkle size={11} weight="fill" /> {decision.tagro_delegation_reason}
                </p>
              )}
              {isDelegated && decision.override_window_until && (() => {
                const expired = new Date(decision.override_window_until).getTime() <= nowTs
                return (
                  <small className={`dec-final-meta dec-override-window${expired ? ' expired' : ''}`}>
                    <Clock size={10} />
                    {expired
                      ? 'Override-Fenster geschlossen — die Entscheidung steht.'
                      : <>Override offen ({fmtCountdown(decision.override_window_until, nowTs)}) — bis {new Date(decision.override_window_until).toLocaleString('de-DE')} überstimmbar.</>}
                  </small>
                )
              })()}
              <small className="dec-final-meta">
                {decision.decided_at && `Entschieden ${fmtAgo(decision.decided_at)}`}
                {decision.applied_at && ` · umgesetzt ${fmtAgo(decision.applied_at)}`}
              </small>
            </section>
          )}

          {!isDecider && !isAnswered && (
            <p className="dec-empty" style={{ marginTop: 18 }}>
              Warte auf Antwort des Entscheiders. Du kannst hier nichts beantworten —
              du hast die Entscheidung angefordert.
            </p>
          )}
        </div>
    </>
  )

  if (variant === 'page') {
    return (
      <div className="dec-detail-page">
        <article className="dec-detail-article">
          {panelBody}
        </article>
      </div>
    )
  }

  return (
    <div className="dec-overlay" role="dialog" aria-modal="true">
      <div className="dec-backdrop" onClick={onClose} />
      <aside className="dec-panel">
        {panelBody}
      </aside>
    </div>
  )
}

function renderResponseValue(decision: Decision, options: DecOption[]) {
  const rv = decision.response_value as any
  if (!rv) {
    // Legacy fallback.
    if (decision.selected_option && decision.selected_option !== 'freeform') {
      const match = options.find((o) => (o.external_id || o.id) === decision.selected_option)
      return (
        <div className="dec-final-pick">
          <CheckCircle size={12} weight="fill" />
          {match?.client_label || match?.label || decision.selected_option}
        </div>
      )
    }
    return null
  }
  if ('binary_value' in rv) {
    return (
      <div className="dec-final-pick">
        <CheckCircle size={12} weight="fill" />
        {rv.binary_value === 'yes' ? 'Ja' : 'Nein'}
      </div>
    )
  }
  if ('selected_option_id' in rv) {
    const match = options.find((o) => (o.external_id || o.id) === rv.selected_option_id)
    return (
      <div className="dec-final-pick">
        <CheckCircle size={12} weight="fill" />
        {match?.client_label || match?.label || rv.selected_option_id}
      </div>
    )
  }
  if ('selected_option_ids' in rv && Array.isArray(rv.selected_option_ids)) {
    return (
      <div className="dec-final-multi">
        {rv.selected_option_ids.map((id: string) => {
          const match = options.find((o) => (o.external_id || o.id) === id)
          return (
            <span key={id} className="dec-final-pick">
              <CheckCircle size={12} weight="fill" />
              {match?.client_label || match?.label || id}
            </span>
          )
        })}
      </div>
    )
  }
  if ('free_text' in rv) {
    return <p className="dec-final-text">{rv.free_text}</p>
  }
  return null
}
