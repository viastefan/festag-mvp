'use client'

import { useEffect, useState } from 'react'
import { Plus, Sparkle, X } from '@phosphor-icons/react'
import Modal, { ModalButton } from '@/components/Modal'
import type { ComposerMode, ProjectRow, TagroPreview } from '@/components/tasks/tasks-shared'
import { PRIORITY_OPTIONS } from '@/components/tasks/tasks-shared'

type Props = {
  open: boolean
  onClose: () => void
  projects: ProjectRow[]
  defaultProjectId?: string
  onCreated: () => void
  onProjectColorChange?: (projectId: string, color: string) => void
}

function projectAccentColor(id: string, color?: string | null) {
  if (color && color !== 'var(--text-muted)') return color
  return '#64748b'
}

export default function TaskSuggestModal({
  open,
  onClose,
  projects,
  defaultProjectId,
  onCreated,
  onProjectColorChange,
}: Props) {
  const [composerMode, setComposerMode] = useState<ComposerMode>('tagro')
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('none')
  const [dueDate, setDueDate] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [tagroPreview, setTagroPreview] = useState<TagroPreview | null>(null)

  useEffect(() => {
    if (!open) return
    setProjectId(defaultProjectId || projects[0]?.id || '')
    setTitle('')
    setDescription('')
    setPriority('none')
    setDueDate('')
    setLabelInput('')
    setLabels([])
    setComposerMode('tagro')
    setNotice('')
    setTagroPreview(null)
  }, [open, defaultProjectId, projects])

  function addLabel() {
    const label = labelInput.trim()
    if (!label || labels.includes(label)) return
    setLabels((current) => [...current, label])
    setLabelInput('')
  }

  async function submit(options: { regenerate?: boolean } = {}) {
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    const fallbackTitle = trimmedDescription.split(/\s+/).slice(0, 9).join(' ').replace(/[.,;:!?]+$/, '')
    const finalTitle = trimmedTitle || fallbackTitle
    if (!finalTitle || !projectId || busy) return

    setBusy(true)
    setNotice('')
    try {
      const response = await fetch('/api/tagro/task-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          mode: composerMode,
          title: finalTitle,
          description: options.regenerate
            ? `${trimmedDescription || finalTitle}\n\nBitte formuliere den Vorschlag noch kürzer, klarer und prüfbarer.`
            : trimmedDescription,
          priority: priority === 'none' ? null : priority,
          dueDate: dueDate || null,
          labels,
          proposal: options.regenerate ? null : tagroPreview,
          confirmCreate: composerMode === 'manual' || (!options.regenerate && Boolean(tagroPreview)),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) {
        setNotice('Der Vorschlag konnte gerade nicht verarbeitet werden.')
        return
      }

      if (composerMode === 'tagro' && (!tagroPreview || options.regenerate) && result.proposal) {
        setTagroPreview(result.proposal)
        return
      }

      if (result.task) {
        onCreated()
        onClose()
      }
    } catch {
      setNotice('Der Vorschlag konnte gerade nicht verarbeitet werden.')
    } finally {
      setBusy(false)
    }
  }

  const selectedProject = projects.find((p) => p.id === projectId)
  const canSubmit = Boolean(projectId && (title.trim() || description.trim()))

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Aufgabe vorschlagen"
      subtitle="Vorschläge landen im Dev Panel — du siehst den Fortschritt hier."
      footer={(
        <>
          <ModalButton variant="ghost" onClick={onClose}>Abbrechen</ModalButton>
          <ModalButton
            variant="primary"
            disabled={busy || !canSubmit}
            onClick={() => void submit()}
          >
            {busy
              ? 'Sende…'
              : composerMode === 'tagro'
                ? (tagroPreview ? 'Vorschlag übernehmen' : 'Mit Tagro vorbereiten')
                : 'An Dev Panel senden'}
          </ModalButton>
        </>
      )}
    >
      <div className="task-suggest-form">
        <div className="task-suggest-top">
          <label className="task-suggest-project">
            <span
              className="task-suggest-ring"
              style={{ ['--project-ring' as string]: projectAccentColor(projectId, selectedProject?.color) }}
            >
              <input
                aria-label="Projektfarbe"
                type="color"
                value={projectAccentColor(projectId, selectedProject?.color).startsWith('#')
                  ? projectAccentColor(projectId, selectedProject?.color)
                  : '#64748b'}
                onChange={(event) => projectId && onProjectColorChange?.(projectId, event.target.value)}
              />
            </span>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.title}</option>
              ))}
            </select>
          </label>
          <div className="task-suggest-tabs" role="tablist">
            <button type="button" className={composerMode === 'tagro' ? 'on' : ''} onClick={() => { setComposerMode('tagro'); setTagroPreview(null); setNotice('') }}>
              <Sparkle size={14} weight="fill" />
              Mit Tagro
            </button>
            <button type="button" className={composerMode === 'manual' ? 'on' : ''} onClick={() => { setComposerMode('manual'); setTagroPreview(null); setNotice('') }}>
              Manuell
            </button>
          </div>
        </div>

        {notice ? <p className="task-suggest-notice">{notice}</p> : null}

        {tagroPreview && (
          <div className="task-suggest-preview">
            <strong>{tagroPreview.suggested_title || 'Geprüfte Aufgabe'}</strong>
            <p>{tagroPreview.client_summary || tagroPreview.suggested_description}</p>
            {tagroPreview.possible_dev_interpretation ? (
              <p className="task-suggest-dev-hint">Dev Panel: {tagroPreview.possible_dev_interpretation}</p>
            ) : null}
            {tagroPreview.used_operational_dna ? (
              <p className="task-suggest-dev-hint">Workspace-Muster wurden für diesen Vorschlag berücksichtigt.</p>
            ) : null}
            <div className="task-suggest-preview-actions">
              <button type="button" onClick={() => { setTagroPreview(null); setNotice('Vorschlag verworfen.') }}>
                Ablehnen
              </button>
              <button type="button" onClick={() => void submit({ regenerate: true })} disabled={busy}>
                Neu formulieren
              </button>
              <button type="button" className="primary" onClick={() => void submit()} disabled={busy}>
                Übernehmen
              </button>
            </div>
          </div>
        )}

        <label className="dec-form-field">
          <span>Titel</span>
          <input
            value={title}
            onChange={(event) => { setTitle(event.target.value); setTagroPreview(null) }}
            placeholder="Aufgabe kurz benennen…"
            autoFocus
          />
        </label>
        <label className="dec-form-field">
          <span>Beschreibung</span>
          <textarea
            value={description}
            onChange={(event) => { setDescription(event.target.value); setTagroPreview(null) }}
            placeholder="Ziel, Kontext oder gewünschte Änderung…"
            rows={4}
          />
        </label>

        <div className="task-suggest-chips">
          <label className="task-suggest-chip">
            Priorität
            <select value={priority} onChange={(event) => setPriority(event.target.value)}>
              {PRIORITY_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="task-suggest-chip">
            Fällig
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
          <label className="task-suggest-chip">
            Label
            <input
              value={labelInput}
              onChange={(event) => setLabelInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addLabel()
                }
              }}
              placeholder="Hinzufügen"
            />
          </label>
          {labels.map((label) => (
            <span key={label} className="task-suggest-chip on">
              {label}
              <button type="button" aria-label={`${label} entfernen`} onClick={() => setLabels((current) => current.filter((item) => item !== label))}>
                <X size={11} weight="bold" />
              </button>
            </span>
          ))}
        </div>

        <p className="task-suggest-bridge">
          <Plus size={12} weight="bold" aria-hidden />
          Nach dem Senden erscheint die Aufgabe im Dev Panel. Status-Updates kommen automatisch zurück.
        </p>
      </div>
    </Modal>
  )
}
