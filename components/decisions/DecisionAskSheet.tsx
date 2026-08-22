'use client'

/**
 * "Frage stellen" — the entry point the product was missing.
 *
 * The real situation: a document arrives, something in it is unclear, and a
 * named person has to answer before work continues. Everything on this sheet
 * exists to make that one sentence possible in under a minute.
 *
 * It deliberately does not ask for a project. Tagro routes it, and only asks
 * when the projects are genuinely tied — filing a question against the wrong
 * project is worse than one extra question.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Paperclip, X } from '@phosphor-icons/react'

type Person = {
  id: string
  label: string
  email: string | null
  username: string | null
  needsDisambiguation?: boolean
}

type ProjectChoice = { id: string; title: string; reason: string }

type Props = {
  onClose: () => void
  onCreated: (info: { decisionId: string; personLabel: string; projectTitle: string }) => void
  /** Opened from a person card: the person and project are already known, so
      the sheet starts on the question instead of asking who and where again. */
  initialPerson?: Person | null
  initialProjectId?: string | null
}

type Phase = 'compose' | 'pick_project' | 'sending'

export default function DecisionAskSheet({ onClose, onCreated, initialPerson, initialProjectId }: Props) {
  const [phase, setPhase] = useState<Phase>('compose')
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [respondBy, setRespondBy] = useState('')

  const [personQuery, setPersonQuery] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [person, setPerson] = useState<Person | null>(initialPerson ?? null)
  const [peopleLoading, setPeopleLoading] = useState(false)

  const [projectChoices, setProjectChoices] = useState<ProjectChoice[]>([])
  const [projectId, setProjectId] = useState<string | null>(initialProjectId ?? null)

  const [error, setError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // The list loads once and filters as you type — these are colleagues, not a
  // search index, so there are never enough of them to need a debounce dance.
  useEffect(() => {
    let alive = true
    setPeopleLoading(true)
    fetch(`/api/people/reachable?q=${encodeURIComponent(personQuery)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { people: [] }))
      .then(d => { if (alive) setPeople(d.people ?? []) })
      .catch(() => { if (alive) setPeople([]) })
      .finally(() => { if (alive) setPeopleLoading(false) })
    return () => { alive = false }
  }, [personQuery])

  const submit = useCallback(async (chosenProject?: string | null) => {
    if (!person || !question.trim()) return
    setPhase('sending'); setError('')
    try {
      const res = await fetch('/api/decisions/ask', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignee: person.username || person.email || person.label,
          question: question.trim(),
          context: context.trim() || undefined,
          project_id: chosenProject ?? projectId ?? undefined,
          respond_by: respondBy || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))

      if (res.status === 409 && body?.error === 'project_ambiguous') {
        setProjectChoices(body.candidates ?? [])
        setPhase('pick_project')
        return
      }
      if (!res.ok) {
        setError(body?.message || 'Die Frage konnte nicht gesendet werden.')
        setPhase('compose')
        return
      }

      onCreated({
        decisionId: body.decision?.id,
        personLabel: body.person?.label || person.label,
        projectTitle: body.project?.title || 'Projekt',
      })
    } catch {
      setError('Keine Verbindung. Dein Text bleibt erhalten.')
      setPhase('compose')
    }
  }, [person, question, context, projectId, respondBy, onCreated])

  const canSend = !!person && question.trim().length > 2

  return (
    <div className="drs-overlay" role="presentation" onMouseDown={e => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div ref={panelRef} className="drs-panel" role="dialog" aria-modal="true"
        aria-label="Frage stellen" tabIndex={-1}>
        <button type="button" className="drs-close" onClick={onClose} aria-label="Schließen">
          <X size={15} />
        </button>

        {phase === 'pick_project' ? (
          <div className="drs-step">
            <h2 className="drs-title">
              Zu welchem Projekt gehört das?
              <span className="drs-title-second"> Tagro kann es hier nicht eindeutig zuordnen.</span>
            </h2>
            <ul className="drs-options">
              {projectChoices.map(p => (
                <li key={p.id}>
                  <button type="button" className="drs-option"
                    onClick={() => { setProjectId(p.id); void submit(p.id) }}>
                    <span className="drs-option-main">
                      <span className="drs-option-name">{p.title}</span>
                      <span className="drs-option-desc">{p.reason}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="drs-actions">
              <button type="button" className="drs-btn" onClick={() => setPhase('compose')}>
                Zurück
              </button>
            </div>
          </div>
        ) : (
          <div className="drs-step">
            <h2 className="drs-title">
              Was brauchst du beantwortet?
              <span className="drs-title-second"> Es landet als Entscheidung im Konto der Person.</span>
            </h2>

            <label className="dask-label" htmlFor="dask-q">Frage</label>
            <textarea
              id="dask-q"
              className="drs-note dask-question"
              placeholder="z. B. Welche Telefonnummer soll in den Footer?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={2}
              autoFocus
            />

            <label className="dask-label" htmlFor="dask-who">An wen</label>
            {person ? (
              <div className="dask-person-picked">
                <span className="dask-person-name">{person.label}</span>
                {(person.username || person.email) && (
                  <span className="dask-person-sub">
                    {person.username ? `@${person.username}` : person.email}
                  </span>
                )}
                <button type="button" className="dask-person-clear"
                  onClick={() => { setPerson(null); setPersonQuery('') }}>
                  Ändern
                </button>
              </div>
            ) : (
              <>
                <input
                  id="dask-who"
                  className="drs-note dask-input"
                  placeholder="Name, @Benutzername oder E-Mail"
                  value={personQuery}
                  onChange={e => setPersonQuery(e.target.value)}
                  autoComplete="off"
                />
                <div className="dask-people">
                  {peopleLoading && people.length === 0 && (
                    <p className="dask-hint">Suche Personen…</p>
                  )}
                  {!peopleLoading && people.length === 0 && (
                    <p className="dask-hint">
                      Niemand gefunden. Du kannst nur Personen fragen, mit denen du
                      ein Projekt teilst.
                    </p>
                  )}
                  {people.map(p => (
                    <button key={p.id} type="button" className="dask-person"
                      onClick={() => setPerson(p)}>
                      <span className="dask-person-name">{p.label}</span>
                      {/* Two colleagues can share a name — show what separates them. */}
                      <span className="dask-person-sub">
                        {p.needsDisambiguation && p.email
                          ? p.email
                          : p.username ? `@${p.username}` : p.email}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <label className="dask-label" htmlFor="dask-ctx">Zusatz <span>optional</span></label>
            <textarea
              id="dask-ctx"
              className="drs-note"
              placeholder="Worum es geht, damit die Antwort direkt passt."
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={2}
            />

            <div className="dask-row">
              <label className="dask-label" htmlFor="dask-by">Antwort bis <span>optional</span></label>
              <input id="dask-by" type="date" className="drs-note dask-date"
                value={respondBy} onChange={e => setRespondBy(e.target.value)} />
            </div>

            {/* Attachments hang off the project's asset library, which needs an
                uploaded file first — stated plainly instead of a dead control. */}
            <p className="dask-attach">
              <Paperclip size={14} aria-hidden />
              Dokumente hängst du im Projekt an und verknüpfst sie mit dieser Frage.
            </p>

            {error && <p className="drs-error" role="alert">{error}</p>}

            <div className="drs-actions">
              <button type="button" className="drs-btn drs-btn--primary"
                onClick={() => void submit()} disabled={!canSend || phase === 'sending'}>
                {phase === 'sending' ? 'Wird gesendet…' : 'Frage senden'}
                {phase !== 'sending' && <ArrowRight size={14} className="drs-btn-arrow" aria-hidden />}
              </button>
              <button type="button" className="drs-btn" onClick={onClose}>Abbrechen</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
