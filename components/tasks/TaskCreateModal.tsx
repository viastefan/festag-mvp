'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowClockwise, Check, CircleNotch, Plus, Sparkle, X } from '@phosphor-icons/react'
import Modal, { ModalButton } from '@/components/Modal'
import { PRIORITY_DE, TASK_PRIORITIES } from '@/lib/tasks/lifecycle'
import { WORK_TYPES } from '@/lib/tasks/work-types'
import { TaskApiError, createTask, type AccessRecord, type PersonRecord, type ProjectRecord, type TaskRecord } from '@/lib/tasks/client-api'
import { autoAvatarColor, avatarInitials } from '@/lib/avatar'

type Props = {
  open: boolean
  onClose: () => void
  projects: ProjectRecord[]
  people: PersonRecord[]
  access: Record<string, AccessRecord>
  defaultProjectId?: string
  onCreated: (task: TaskRecord) => void
}

type Proposal = {
  suggested_title?: string
  suggested_description?: string
  client_summary?: string
  possible_dev_interpretation?: string
  possible_dev_tasks?: string[]
  priority?: string
  risks?: string[]
  open_questions?: string[]
  recommended_next_step?: string
  confidence_score?: number
  used_operational_dna?: boolean
}

/**
 * Creating a task is the moment Festag decides whether the work will be
 * understandable later. So the composer asks for the four things that make a
 * task executable — what, why, who, and what "done" means — and nothing else.
 *
 * Tagro mode structures a rough sentence into that shape first; the person
 * always sees the result before anything is written.
 */
export default function TaskCreateModal({
  open, onClose, projects, people, access, defaultProjectId, onCreated,
}: Props) {
  const creatable = useMemo(
    () => projects.filter((project) => access[project.id]?.canCreate !== false),
    [projects, access],
  )

  const [mode, setMode] = useState<'manual' | 'tagro'>('manual')
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<string>('medium')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [workType, setWorkType] = useState('')
  const [definitionOfDone, setDefinitionOfDone] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [labelDraft, setLabelDraft] = useState('')
  const [checklist, setChecklist] = useState<string[]>([])
  const [checklistDraft, setChecklistDraft] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)

  const [busy, setBusy] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const grant = projectId ? access[projectId] : null
  const canAssign = Boolean(grant?.canAssign)
  const projectPeople = useMemo(
    () => people.filter((person) => !person.projects?.length || person.projects.includes(projectId)),
    [people, projectId],
  )

  useEffect(() => {
    if (!open) return
    const fallback = defaultProjectId && creatable.some((p) => p.id === defaultProjectId)
      ? defaultProjectId
      : creatable[0]?.id ?? ''
    setMode('manual')
    setProjectId(fallback)
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDueDate('')
    setAssignedTo('')
    setWorkType('')
    setDefinitionOfDone('')
    setLabels([])
    setLabelDraft('')
    setChecklist([])
    setChecklistDraft('')
    setDetailsOpen(false)
    setError(null)
    setProposal(null)
    setBusy(false)
    setThinking(false)
    window.setTimeout(() => titleRef.current?.focus(), 60)
  }, [open, defaultProjectId, creatable])

  const trimmedTitle = title.trim()
  const trimmedDescription = description.trim()
  const canSubmit = Boolean(projectId) && Boolean(trimmedTitle || trimmedDescription) && !busy

  function addLabel() {
    const value = labelDraft.trim()
    if (!value || labels.includes(value) || labels.length >= 8) { setLabelDraft(''); return }
    setLabels((current) => [...current, value])
    setLabelDraft('')
  }

  function addChecklistItem() {
    const value = checklistDraft.trim()
    if (!value || checklist.length >= 20) { setChecklistDraft(''); return }
    setChecklist((current) => [...current, value])
    setChecklistDraft('')
  }

  async function structureWithTagro(regenerate = false) {
    if (!projectId || (!trimmedTitle && !trimmedDescription)) return
    setThinking(true)
    setError(null)
    try {
      const result = await createTask({
        projectId,
        mode: 'tagro',
        title: trimmedTitle,
        description: trimmedDescription,
        regenerate,
        confirm: false,
      })
      if (result.proposal) setProposal(result.proposal as Proposal)
      else setError('Tagro konnte den Vorschlag nicht strukturieren. Du kannst die Aufgabe manuell anlegen.')
    } catch (caught) {
      setError(caught instanceof TaskApiError ? caught.message : 'Tagro ist gerade nicht erreichbar.')
    } finally {
      setThinking(false)
    }
  }

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const result = await createTask({
        projectId,
        mode: proposal ? 'tagro' : 'manual',
        title: trimmedTitle || trimmedDescription.split(/\s+/).slice(0, 9).join(' '),
        description: trimmedDescription,
        priority: priority === 'none' ? null : priority,
        dueDate: dueDate || null,
        labels,
        assignedTo: canAssign && assignedTo ? assignedTo : null,
        definitionOfDone: definitionOfDone.trim() || null,
        workType: workType || null,
        checklist,
        proposal: proposal ?? undefined,
        confirm: true,
      })
      if (result.task) {
        onCreated(result.task)
        onClose()
      } else {
        setError('Die Aufgabe wurde nicht angelegt. Bitte versuche es erneut.')
      }
    } catch (caught) {
      setError(caught instanceof TaskApiError ? caught.message : 'Die Aufgabe konnte nicht angelegt werden.')
    } finally {
      setBusy(false)
    }
  }

  if (!creatable.length && open) {
    return (
      <Modal open={open} onClose={onClose} size="md" title="Aufgabe erstellen">
        <div className="tsk-create-empty">
          <p>Aufgaben entstehen innerhalb eines Projekts.</p>
          <small>In deinen Projekten hast du gerade keine Berechtigung, Aufgaben anzulegen — oder es existiert noch kein Projekt.</small>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Aufgabe erstellen"
      subtitle="Klar formuliert, verantwortlich zugeordnet, prüfbar abgeschlossen."
      footer={(
        <>
          <ModalButton variant="ghost" onClick={onClose}>Abbrechen</ModalButton>
          {mode === 'tagro' && !proposal ? (
            <ModalButton
              variant="primary"
              disabled={!canSubmit || thinking}
              onClick={() => void structureWithTagro(false)}
            >
              {thinking ? 'Tagro strukturiert…' : 'Mit Tagro strukturieren'}
            </ModalButton>
          ) : (
            <ModalButton variant="primary" disabled={!canSubmit} onClick={() => void submit()}>
              {busy ? 'Wird angelegt…' : 'Aufgabe anlegen'}
            </ModalButton>
          )}
        </>
      )}
    >
      <div
        className="tsk-create"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            void submit()
          }
        }}
      >
        <div className="tsk-create-top">
          <label className="tsk-field tsk-field--inline">
            <span>Projekt</span>
            <select value={projectId} onChange={(event) => { setProjectId(event.target.value); setAssignedTo('') }}>
              {creatable.map((project) => (
                <option key={project.id} value={project.id}>{project.title}</option>
              ))}
            </select>
          </label>
          <div className="tsk-create-modes" role="tablist" aria-label="Erfassungsart">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'manual'}
              className={mode === 'manual' ? 'on' : ''}
              onClick={() => { setMode('manual'); setProposal(null) }}
            >
              Selbst formulieren
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'tagro'}
              className={mode === 'tagro' ? 'on' : ''}
              onClick={() => { setMode('tagro'); setProposal(null) }}
            >
              <Sparkle size={13} weight="fill" />
              Mit Tagro
            </button>
          </div>
        </div>

        {error && <p className="tsk-create-error" role="alert">{error}</p>}

        <label className="tsk-field">
          <span>Was soll passieren?</span>
          <input
            ref={titleRef}
            value={title}
            onChange={(event) => { setTitle(event.target.value); setProposal(null) }}
            placeholder={mode === 'tagro' ? 'In eigenen Worten — Tagro macht daraus eine prüfbare Aufgabe' : 'Kurz und konkret, z. B. „Kontaktformular an CRM anbinden"'}
            maxLength={200}
          />
        </label>

        <label className="tsk-field">
          <span>Kontext <em>optional</em></span>
          <textarea
            value={description}
            onChange={(event) => { setDescription(event.target.value); setProposal(null) }}
            rows={3}
            placeholder="Warum ist das nötig? Was ist der gewünschte Zustand danach?"
          />
        </label>

        {thinking && (
          <div className="tsk-create-thinking" role="status">
            <CircleNotch size={14} weight="bold" className="tsk-spin" />
            Tagro strukturiert die Aufgabe, prüft Kontext und Abhängigkeiten…
          </div>
        )}

        {proposal && (
          <div className="tsk-proposal">
            <div className="tsk-proposal-head">
              <Sparkle size={13} weight="fill" />
              <strong>Tagro-Vorschlag</strong>
              {typeof proposal.confidence_score === 'number' && (
                <span className="tsk-proposal-conf">
                  Sicherheit {Math.round((proposal.confidence_score > 1 ? proposal.confidence_score / 100 : proposal.confidence_score) * 100)} %
                </span>
              )}
            </div>
            {proposal.suggested_title && <p className="tsk-proposal-title">{proposal.suggested_title}</p>}
            {(proposal.client_summary || proposal.suggested_description) && (
              <p className="tsk-proposal-text">{proposal.client_summary || proposal.suggested_description}</p>
            )}
            {proposal.possible_dev_interpretation && (
              <p className="tsk-proposal-meta"><strong>Umsetzung:</strong> {proposal.possible_dev_interpretation}</p>
            )}
            {Boolean(proposal.open_questions?.length) && (
              <p className="tsk-proposal-meta"><strong>Offen:</strong> {proposal.open_questions!.join(' · ')}</p>
            )}
            {proposal.used_operational_dna && (
              <p className="tsk-proposal-meta">Muster aus deinem Workspace wurden berücksichtigt.</p>
            )}
            <div className="tsk-proposal-actions">
              <button type="button" onClick={() => setProposal(null)}>
                <X size={12} weight="bold" /> Verwerfen
              </button>
              <button type="button" onClick={() => void structureWithTagro(true)} disabled={thinking}>
                <ArrowClockwise size={12} weight="bold" /> Neu formulieren
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  if (proposal.suggested_title) setTitle(proposal.suggested_title)
                  if (proposal.suggested_description || proposal.client_summary) {
                    setDescription(proposal.suggested_description || proposal.client_summary || '')
                  }
                  if (proposal.priority && (TASK_PRIORITIES as readonly string[]).includes(proposal.priority)) {
                    setPriority(proposal.priority)
                  }
                  if (proposal.possible_dev_tasks?.length) {
                    setChecklist((current) => current.length ? current : proposal.possible_dev_tasks!.slice(0, 8))
                    setDetailsOpen(true)
                  }
                }}
              >
                <Check size={12} weight="bold" /> Übernehmen
              </button>
            </div>
          </div>
        )}

        <div className="tsk-create-quick">
          <label className="tsk-quick">
            <span>Priorität</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option value="none">Keine</option>
              {TASK_PRIORITIES.map((item) => (
                <option key={item} value={item}>{PRIORITY_DE[item].label}</option>
              ))}
            </select>
          </label>
          <label className="tsk-quick">
            <span>Termin</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
          {canAssign && (
            <label className="tsk-quick">
              <span>Verantwortlich</span>
              <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
                <option value="">Noch offen</option>
                {projectPeople.map((person) => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <button
          type="button"
          className="tsk-create-more"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((value) => !value)}
        >
          {detailsOpen ? 'Weniger anzeigen' : 'Abnahme, Art der Arbeit und Labels'}
        </button>

        {detailsOpen && (
          <div className="tsk-create-details">
            <label className="tsk-field">
              <span>Wann gilt das als erledigt? <em>Definition of Done</em></span>
              <textarea
                value={definitionOfDone}
                onChange={(event) => setDefinitionOfDone(event.target.value)}
                rows={2}
                placeholder="Der Zustand, an dem alle erkennen: fertig."
              />
            </label>

            <div className="tsk-field">
              <span>Abnahmepunkte</span>
              <div className="tsk-checklist">
                {checklist.map((item, index) => (
                  <span key={`${item}-${index}`} className="tsk-checklist-item">
                    {item}
                    <button
                      type="button"
                      aria-label={`${item} entfernen`}
                      onClick={() => setChecklist((current) => current.filter((_, i) => i !== index))}
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </span>
                ))}
                <span className="tsk-checklist-add">
                  <input
                    value={checklistDraft}
                    onChange={(event) => setChecklistDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') { event.preventDefault(); addChecklistItem() }
                    }}
                    placeholder="Punkt hinzufügen"
                  />
                  <button type="button" onClick={addChecklistItem} aria-label="Abnahmepunkt hinzufügen">
                    <Plus size={11} weight="bold" />
                  </button>
                </span>
              </div>
            </div>

            <label className="tsk-field tsk-field--inline">
              <span>Art der Arbeit</span>
              <select value={workType} onChange={(event) => setWorkType(event.target.value)}>
                <option value="">Automatisch erkennen</option>
                {WORK_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </label>

            <div className="tsk-field">
              <span>Labels</span>
              <div className="tsk-checklist">
                {labels.map((label) => (
                  <span key={label} className="tsk-checklist-item">
                    {label}
                    <button
                      type="button"
                      aria-label={`${label} entfernen`}
                      onClick={() => setLabels((current) => current.filter((item) => item !== label))}
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </span>
                ))}
                <span className="tsk-checklist-add">
                  <input
                    value={labelDraft}
                    onChange={(event) => setLabelDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') { event.preventDefault(); addLabel() }
                    }}
                    placeholder="Label"
                  />
                  <button type="button" onClick={addLabel} aria-label="Label hinzufügen">
                    <Plus size={11} weight="bold" />
                  </button>
                </span>
              </div>
            </div>
          </div>
        )}

        <p className="tsk-create-foot">
          {canAssign && assignedTo
            ? `${projectPeople.find((p) => p.id === assignedTo)?.name ?? 'Die Person'} wird benachrichtigt und übernimmt die Aufgabe.`
            : 'Ohne Zuweisung landet die Aufgabe im offenen Stapel des Projekts — Festag zeigt sie an, bis jemand verantwortlich ist.'}
        </p>
      </div>
    </Modal>
  )
}
