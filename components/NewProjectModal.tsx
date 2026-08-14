'use client'

/**
 * NewProjectModal — Tagro Intent Intake
 *
 * Not a Create Project form. One intelligent input: describe what you need.
 * Tagro proposes a draft (project / task / invite / answer / briefing).
 * Human confirms before anything is saved.
 */

import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  File as FileIcon,
  Image as ImageIcon,
  Microphone,
  MicrophoneSlash,
  Paperclip,
  X,
} from '@phosphor-icons/react'
import Modal, { ModalButton } from '@/components/Modal'
import FestagWorkingDots from '@/components/FestagWorkingDots'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { getActiveWorkspaceId } from '@/lib/active-workspace'
import { syncAutoGrowTextarea } from '@/lib/ui/auto-grow-textarea'
import {
  INTENT_PLACEHOLDERS,
  INTENT_PROCESSING_STEPS,
  INVITE_ROLE_OPTIONS,
  PRIORITY_LABELS,
  SCOPE_LABELS,
  type EstimatedScope,
  type InviteDraft,
  type InviteDraftRole,
  type ProjectDraft,
  type TagroIntentResult,
  type TaskDraft,
  type TaskPriority,
  type WorkspaceProjectHint,
} from '@/lib/tagro/intent-intake'

interface Props {
  onClose: () => void
  onCreated?: (projectId: string) => void
}

type Phase =
  | 'compose'
  | 'understanding'
  | 'draft'
  | 'editing'
  | 'confirming'
  | 'done'
  | 'error'

type StagedFile = {
  id: string
  file: File
  kind: 'image' | 'file'
}

const ACCEPT_FILES =
  'image/*,.pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,.svg'

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const speechBaseRef = useRef('')

  const [phase, setPhase] = useState<Phase>('compose')
  const [text, setText] = useState('')
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [files, setFiles] = useState<StagedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [processingLabel, setProcessingLabel] = useState<string>(INTENT_PROCESSING_STEPS[0])
  const [result, setResult] = useState<TagroIntentResult | null>(null)
  const [projects, setProjects] = useState<WorkspaceProjectHint[]>([])
  const [error, setError] = useState('')
  const [doneMessage, setDoneMessage] = useState('')

  const [projectDraft, setProjectDraft] = useState<ProjectDraft | null>(null)
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null)
  const [inviteDraft, setInviteDraft] = useState<InviteDraft | null>(null)
  const [featureInput, setFeatureInput] = useState('')

  const { supported: speechSupported, listening, start: startSpeech, stop: stopSpeech } =
    useSpeechRecognition({
      lang: 'de-DE',
      onResult: (transcript, isFinal) => {
        const base = speechBaseRef.current
        const next = `${base}${base && !base.endsWith(' ') ? ' ' : ''}${transcript}`.trim()
        setText(next)
        if (isFinal) speechBaseRef.current = next
      },
    })

  useEffect(() => {
    if (phase !== 'compose') return
    const id = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % INTENT_PLACEHOLDERS.length)
    }, 4200)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    syncAutoGrowTextarea(textareaRef.current, { minPx: 140, maxPx: 280 })
  }, [text, phase])

  useEffect(() => {
    if (phase !== 'understanding') return
    let i = 0
    setProcessingLabel(INTENT_PROCESSING_STEPS[0])
    const id = window.setInterval(() => {
      i = Math.min(i + 1, INTENT_PROCESSING_STEPS.length - 1)
      setProcessingLabel(INTENT_PROCESSING_STEPS[i])
    }, 900)
    return () => window.clearInterval(id)
  }, [phase])

  const stageFiles = useCallback((list: FileList | File[]) => {
    const incoming = Array.from(list).slice(0, 8)
    if (!incoming.length) return
    setFiles((prev) => {
      const next = [...prev]
      for (const file of incoming) {
        if (next.length >= 8) break
        const kind = file.type.startsWith('image/') ? 'image' : 'file'
        next.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          kind,
        })
      }
      return next
    })
  }, [])

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) stageFiles(e.dataTransfer.files)
  }

  async function submitIntent() {
    const trimmed = text.trim()
    if ((!trimmed && files.length === 0) || phase === 'understanding' || phase === 'confirming') {
      return
    }
    if (listening) stopSpeech()

    setPhase('understanding')
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/tagro/intent-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed || 'Bitte organisiere diese Anhänge in konkrete Arbeit.',
          attachmentNames: files.map((f) => f.file.name),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok || !data?.result) {
        setError('Tagro konnte das noch nicht verstehen. Versuch es gleich noch einmal.')
        setPhase('error')
        return
      }

      const intake = data.result as TagroIntentResult
      setResult(intake)
      setProjects(Array.isArray(data.projects) ? data.projects : [])
      setProjectDraft(intake.project || null)
      setTaskDraft(intake.task || null)
      setInviteDraft(intake.invite || null)
      setPhase('draft')
    } catch {
      setError('Tagro konnte das noch nicht verstehen. Versuch es gleich noch einmal.')
      setPhase('error')
    }
  }

  async function confirmDraft() {
    if (!result || phase === 'confirming') return
    setPhase('confirming')
    setError('')

    try {
      if (result.intent === 'question') {
        setDoneMessage('Tagro hat deine Frage beantwortet. Es wurde nichts angelegt.')
        setPhase('done')
        return
      }

      if (result.intent === 'status_briefing') {
        await fetch('/api/tagro/intent-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'briefing' }),
        }).catch(() => null)
        setDoneMessage('Dein Workspace-Briefing wird geöffnet.')
        setPhase('done')
        window.setTimeout(() => {
          onClose()
          router.push('/overview')
          router.refresh()
        }, 700)
        return
      }

      if (result.intent === 'new_project' && projectDraft) {
        const response = await fetch('/api/tagro/intent-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'project',
            project: projectDraft,
            workspaceId: getActiveWorkspaceId(),
          }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data?.ok || !data?.project?.id) {
          setError('Der Projekt-Entwurf konnte nicht angelegt werden.')
          setPhase('error')
          return
        }
        await uploadStagedAssets(data.project.id)
        setDoneMessage(`${projectDraft.name} ist bereit.`)
        setPhase('done')
        onCreated?.(data.project.id)
        return
      }

      if ((result.intent === 'bug_task' || result.intent === 'feature_task') && taskDraft) {
        if (!taskDraft.projectId) {
          setError('Wähle ein Projekt für diesen Task-Entwurf.')
          setPhase('editing')
          return
        }
        const response = await fetch('/api/tagro/intent-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'task', task: taskDraft }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data?.ok) {
          setError('Der Task-Entwurf konnte nicht angelegt werden.')
          setPhase('error')
          return
        }
        setDoneMessage(`${taskDraft.title} wurde erstellt.`)
        setPhase('done')
        window.setTimeout(() => onClose(), 900)
        return
      }

      if (result.intent === 'invite' && inviteDraft) {
        if (!inviteDraft.projectId) {
          setError('Wähle ein Projekt für die Einladung.')
          setPhase('editing')
          return
        }
        if (!inviteDraft.username.trim() && !inviteDraft.email.trim()) {
          setError('Gib einen Benutzernamen oder eine E-Mail an.')
          setPhase('editing')
          return
        }
        const response = await fetch('/api/tagro/intent-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'invite', invite: inviteDraft }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data?.ok) {
          setError(
            data?.error === 'user_not_found'
              ? 'Kein Festag-Nutzer mit diesem Benutzernamen.'
              : 'Die Einladung konnte nicht gesendet werden.',
          )
          setPhase('error')
          return
        }
        setDoneMessage('Einladung gesendet.')
        setPhase('done')
        window.setTimeout(() => onClose(), 900)
        return
      }

      setError('Noch nichts zu bestätigen.')
      setPhase('error')
    } catch {
      setError('Etwas ist schiefgelaufen. Bitte versuch es erneut.')
      setPhase('error')
    }
  }

  async function uploadStagedAssets(projectId: string) {
    if (!files.length) return
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      for (const staged of files.slice(0, 8)) {
        const ext = staged.file.name.split('.').pop() || 'bin'
        const { data: row } = await sb
          .from('project_assets')
          .insert({
            project_id: projectId,
            name: staged.file.name,
            kind: staged.kind === 'image' ? 'image' : 'file',
            mime_type: staged.file.type || null,
          })
          .select('id')
          .maybeSingle()
        if (!row?.id) continue
        const path = `${projectId}/${row.id}.${ext}`
        const { error: upErr } = await sb.storage
          .from('project-assets')
          .upload(path, staged.file, { upsert: true, contentType: staged.file.type || undefined })
        if (!upErr) {
          await sb.from('project_assets').update({ storage_path: path }).eq('id', row.id)
        }
      }
    } catch {
      /* Attachments are best-effort after project create */
    }
  }

  function resetToCompose() {
    setPhase('compose')
    setError('')
    setResult(null)
    setProjectDraft(null)
    setTaskDraft(null)
    setInviteDraft(null)
    setDoneMessage('')
  }

  function addFeature() {
    const value = featureInput.trim()
    if (!value || !projectDraft) return
    if (projectDraft.features.includes(value)) {
      setFeatureInput('')
      return
    }
    setProjectDraft({
      ...projectDraft,
      features: [...projectDraft.features, value].slice(0, 12),
    })
    setFeatureInput('')
  }

  const headline =
    phase === 'compose' || phase === 'understanding'
      ? 'Was möchtest du bauen oder ändern?'
      : phase === 'done'
        ? doneMessage || 'Fertig.'
        : draftHeadline(result)

  const showCompose = phase === 'compose'
  const showUnderstanding = phase === 'understanding'
  const showDraft = phase === 'draft' || phase === 'editing' || phase === 'confirming'
  const editing = phase === 'editing'
  const busy = phase === 'understanding' || phase === 'confirming'

  const footer = (
    <>
      {showCompose && (
        <>
          <ModalButton variant="ghost" onClick={onClose}>
            Abbrechen
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={submitIntent}
            disabled={!text.trim() && files.length === 0}
          >
            Weiter mit Tagro
          </ModalButton>
        </>
      )}
      {showUnderstanding && (
        <ModalButton variant="ghost" onClick={onClose} disabled>
          Arbeitet …
        </ModalButton>
      )}
      {showDraft && result?.intent === 'new_project' && (
        <>
          <ModalButton
            variant="secondary"
            onClick={() => setPhase(editing ? 'draft' : 'editing')}
            disabled={busy}
          >
            {editing ? 'Fertig' : 'Entwurf bearbeiten'}
          </ModalButton>
          <ModalButton variant="primary" onClick={confirmDraft} loading={busy} disabled={busy}>
            Projekt anlegen
          </ModalButton>
        </>
      )}
      {showDraft && (result?.intent === 'bug_task' || result?.intent === 'feature_task') && (
        <>
          <ModalButton
            variant="secondary"
            onClick={() => setPhase(editing ? 'draft' : 'editing')}
            disabled={busy}
          >
            {editing ? 'Fertig' : 'Entwurf bearbeiten'}
          </ModalButton>
          <ModalButton variant="primary" onClick={confirmDraft} loading={busy} disabled={busy}>
            Task erstellen
          </ModalButton>
        </>
      )}
      {showDraft && result?.intent === 'invite' && (
        <>
          <ModalButton variant="ghost" onClick={resetToCompose} disabled={busy}>
            Zurück
          </ModalButton>
          <ModalButton variant="primary" onClick={confirmDraft} loading={busy} disabled={busy}>
            Einladung senden
          </ModalButton>
        </>
      )}
      {showDraft && result?.intent === 'question' && (
        <>
          <ModalButton variant="ghost" onClick={resetToCompose}>
            Erneut fragen
          </ModalButton>
          <ModalButton variant="primary" onClick={confirmDraft}>
            Fertig
          </ModalButton>
        </>
      )}
      {showDraft && result?.intent === 'status_briefing' && (
        <>
          <ModalButton variant="ghost" onClick={resetToCompose} disabled={busy}>
            Zurück
          </ModalButton>
          <ModalButton variant="primary" onClick={confirmDraft} loading={busy} disabled={busy}>
            Briefing öffnen
          </ModalButton>
        </>
      )}
      {phase === 'error' && (
        <>
          <ModalButton variant="ghost" onClick={onClose}>
            Schließen
          </ModalButton>
          <ModalButton variant="primary" onClick={resetToCompose}>
            Erneut versuchen
          </ModalButton>
        </>
      )}
      {phase === 'done' && (
        <ModalButton variant="primary" onClick={onClose}>
          Schließen
        </ModalButton>
      )}
    </>
  )

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      size="lg"
      dragHandle
      noBackdropClose={busy}
      autoFocus={showCompose}
      title={headline}
      footer={footer}
    >
      <style>{INTENT_MODAL_CSS}</style>
      <div className="ti-body">
        {showCompose && (
          <div
            className={`ti-compose${dragging ? ' is-drag' : ''}`}
            onDragEnter={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <textarea
              ref={textareaRef}
              className="ti-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={INTENT_PLACEHOLDERS[placeholderIdx]}
              rows={5}
              maxLength={4000}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  void submitIntent()
                }
              }}
            />

            {files.length > 0 && (
              <ul className="ti-files">
                {files.map((f) => (
                  <li key={f.id} className="ti-file">
                    {f.kind === 'image' ? (
                      <ImageIcon size={14} weight="bold" />
                    ) : (
                      <FileIcon size={14} weight="bold" />
                    )}
                    <span>{f.file.name}</span>
                    <button type="button" aria-label="Datei entfernen" onClick={() => removeFile(f.id)}>
                      <X size={12} weight="bold" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="ti-toolbar">
              <div className="ti-tools">
                {speechSupported && (
                  <button
                    type="button"
                    className={`ti-tool${listening ? ' is-on' : ''}`}
                    onClick={() => {
                      if (listening) stopSpeech()
                      else {
                        speechBaseRef.current = text
                        startSpeech()
                      }
                    }}
                    aria-label={listening ? 'Spracheingabe stoppen' : 'Spracheingabe'}
                  >
                    {listening ? (
                      <MicrophoneSlash size={16} weight="bold" />
                    ) : (
                      <Microphone size={16} weight="bold" />
                    )}
                    <span>Sprache</span>
                  </button>
                )}
                <button
                  type="button"
                  className="ti-tool"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Datei hochladen"
                >
                  <Paperclip size={16} weight="bold" />
                  <span>Datei</span>
                </button>
                <button
                  type="button"
                  className="ti-tool"
                  onClick={() => imageInputRef.current?.click()}
                  aria-label="Bild hochladen"
                >
                  <ImageIcon size={16} weight="bold" />
                  <span>Bild</span>
                </button>
              </div>
              <p className="ti-hint">Dateien hierher ziehen · ⌘ Enter zum Fortfahren</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_FILES}
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) stageFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) stageFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
        )}

        {showUnderstanding && (
          <div className="ti-process" aria-live="polite">
            <FestagWorkingDots size="md" tone="muted" label={processingLabel} />
            <p className="ti-process-label">{processingLabel}</p>
            <p className="ti-process-sub">
              Tagro strukturiert deine Anfrage in konkrete Arbeit.
            </p>
          </div>
        )}

        {showDraft && result?.intent === 'new_project' && projectDraft && (
          <ProjectDraftView
            draft={projectDraft}
            editing={editing}
            featureInput={featureInput}
            setFeatureInput={setFeatureInput}
            setDraft={setProjectDraft}
            onAddFeature={addFeature}
          />
        )}

        {showDraft &&
          (result?.intent === 'bug_task' || result?.intent === 'feature_task') &&
          taskDraft && (
            <TaskDraftView
              draft={taskDraft}
              editing={editing || !taskDraft.projectId}
              projects={projects}
              setDraft={setTaskDraft}
            />
          )}

        {showDraft && result?.intent === 'invite' && inviteDraft && (
          <InviteDraftView draft={inviteDraft} projects={projects} setDraft={setInviteDraft} />
        )}

        {showDraft && result?.intent === 'question' && result.answer && (
          <div className="ti-draft">
            <DraftField label="Deine Frage">
              <p className="ti-value ti-value-soft">{result.answer.question}</p>
            </DraftField>
            <DraftField label="Tagro">
              <p className="ti-value">{result.answer.answer}</p>
            </DraftField>
          </div>
        )}

        {showDraft && result?.intent === 'status_briefing' && result.briefing && (
          <div className="ti-draft">
            <DraftField label="Briefing">
              <p className="ti-value">{result.briefing.headline}</p>
              <p className="ti-value ti-value-soft" style={{ marginTop: 8 }}>
                {result.briefing.summary}
              </p>
            </DraftField>
          </div>
        )}

        {phase === 'error' && (
          <div className="ti-error" role="alert">
            <p>{error || 'Etwas ist schiefgelaufen.'}</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="ti-done">
            <p>{doneMessage || 'Fertig.'}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

function DraftField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ti-row">
      <div className="ti-label">{label}</div>
      <div className="ti-content">{children}</div>
    </div>
  )
}

function ProjectDraftView({
  draft,
  editing,
  featureInput,
  setFeatureInput,
  setDraft,
  onAddFeature,
}: {
  draft: ProjectDraft
  editing: boolean
  featureInput: string
  setFeatureInput: (v: string) => void
  setDraft: (d: ProjectDraft) => void
  onAddFeature: () => void
}) {
  return (
    <div className="ti-draft">
      <DraftField label="Projektname">
        {editing ? (
          <input
            className="ti-field"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            maxLength={120}
          />
        ) : (
          <p className="ti-value">{draft.name}</p>
        )}
      </DraftField>
      <DraftField label="Zusammenfassung">
        {editing ? (
          <textarea
            className="ti-field ti-field-area"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            rows={3}
            maxLength={800}
            style={{ resize: 'none' }}
          />
        ) : (
          <p className="ti-value ti-value-soft">{draft.summary}</p>
        )}
      </DraftField>
      <DraftField label="Erkannte Bausteine">
        <ul className="ti-chips">
          {draft.features.map((f) => (
            <li key={f} className="ti-chip">
              <span>{f}</span>
              {editing && (
                <button
                  type="button"
                  aria-label={`${f} entfernen`}
                  onClick={() =>
                    setDraft({ ...draft, features: draft.features.filter((x) => x !== f) })
                  }
                >
                  <X size={11} weight="bold" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {editing && (
          <div className="ti-add-row">
            <input
              className="ti-field"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              placeholder="Baustein hinzufügen"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onAddFeature()
                }
              }}
            />
            <button type="button" className="ti-add-btn" onClick={onAddFeature}>
              Hinzufügen
            </button>
          </div>
        )}
      </DraftField>
      <DraftField label="Geschätzter Umfang">
        {editing ? (
          <div className="ti-scope">
            {(['small', 'medium', 'large'] as EstimatedScope[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`ti-scope-btn${draft.estimatedScope === s ? ' is-on' : ''}`}
                onClick={() => setDraft({ ...draft, estimatedScope: s })}
              >
                {SCOPE_LABELS[s]}
              </button>
            ))}
          </div>
        ) : (
          <p className="ti-value">{SCOPE_LABELS[draft.estimatedScope]}</p>
        )}
      </DraftField>
    </div>
  )
}

function TaskDraftView({
  draft,
  editing,
  projects,
  setDraft,
}: {
  draft: TaskDraft
  editing: boolean
  projects: WorkspaceProjectHint[]
  setDraft: (d: TaskDraft) => void
}) {
  return (
    <div className="ti-draft">
      <DraftField label="Projekt">
        {editing ? (
          <select
            className="ti-field"
            value={draft.projectId || ''}
            onChange={(e) => {
              const id = e.target.value
              const match = projects.find((p) => p.id === id)
              setDraft({
                ...draft,
                projectId: id || null,
                projectTitle: match?.title || null,
              })
            }}
          >
            <option value="">Projekt wählen</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        ) : (
          <p className="ti-value">{draft.projectTitle || '—'}</p>
        )}
      </DraftField>
      <DraftField label="Task">
        {editing ? (
          <input
            className="ti-field"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            maxLength={160}
          />
        ) : (
          <p className="ti-value">{draft.title}</p>
        )}
      </DraftField>
      <DraftField label="Priorität">
        {editing ? (
          <select
            className="ti-field"
            value={draft.priority}
            onChange={(e) => setDraft({ ...draft, priority: e.target.value as TaskPriority })}
          >
            {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        ) : (
          <p className="ti-value">{PRIORITY_LABELS[draft.priority]}</p>
        )}
      </DraftField>
      <DraftField label="Zugewiesen">
        <p className="ti-value ti-value-soft">Nicht zugewiesen</p>
      </DraftField>
      {(editing || draft.description) && (
        <DraftField label="Details">
          {editing ? (
            <textarea
              className="ti-field ti-field-area"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3}
              style={{ resize: 'none' }}
            />
          ) : (
            <p className="ti-value ti-value-soft">{draft.description}</p>
          )}
        </DraftField>
      )}
    </div>
  )
}

function InviteDraftView({
  draft,
  projects,
  setDraft,
}: {
  draft: InviteDraft
  projects: WorkspaceProjectHint[]
  setDraft: (d: InviteDraft) => void
}) {
  return (
    <div className="ti-draft">
      <DraftField label="Projekt">
        <select
          className="ti-field"
          value={draft.projectId || ''}
          onChange={(e) => {
            const id = e.target.value
            const match = projects.find((p) => p.id === id)
            setDraft({
              ...draft,
              projectId: id || null,
              projectTitle: match?.title || null,
            })
          }}
        >
          <option value="">Projekt wählen</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </DraftField>
      <DraftField label="Benutzername">
        <input
          className="ti-field"
          value={draft.username}
          onChange={(e) => setDraft({ ...draft, username: e.target.value.replace(/^@+/, '') })}
          placeholder="@username"
        />
      </DraftField>
      <DraftField label="Email">
        <input
          className="ti-field"
          type="email"
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          placeholder="name@company.com"
        />
      </DraftField>
      <DraftField label="Rolle">
        <select
          className="ti-field"
          value={draft.role}
          onChange={(e) => setDraft({ ...draft, role: e.target.value as InviteDraftRole })}
        >
          {INVITE_ROLE_OPTIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </DraftField>
    </div>
  )
}

function draftHeadline(result: TagroIntentResult | null): string {
  if (!result) return 'Entwurf prüfen'
  switch (result.intent) {
    case 'new_project':
      return 'Projekt-Entwurf bereit zur Bestätigung.'
    case 'bug_task':
      return 'Bug-Task-Entwurf bereit zur Bestätigung.'
    case 'feature_task':
      return 'Feature-Task-Entwurf bereit zur Bestätigung.'
    case 'invite':
      return 'Einladungs-Entwurf bereit zur Bestätigung.'
    case 'question':
      return 'Hier ist Tagros Antwort.'
    case 'status_briefing':
      return 'Workspace-Briefing ist bereit.'
    default:
      return 'Entwurf prüfen'
  }
}

const INTENT_MODAL_CSS = `
.ti-body {
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding: 4px 2px 2px;
  font-family: var(--font-aeonik, 'Aeonik', Inter, system-ui, sans-serif);
}

/* ── Compose ── */
.ti-compose {
  border: 1px solid var(--fp-inp-border);
  border-radius: var(--festag-surface-radius, 14px);
  background: var(--fp-inp);
  padding: 20px 20px 14px;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.ti-compose:focus-within {
  border-color: var(--fp-inp-focus-border);
  background: var(--fp-inp-focus);
}
.ti-compose.is-drag {
  border-color: var(--fp-accent);
  background: var(--fp-accent-soft);
}
.ti-input {
  width: 100%;
  border: none;
  outline: none;
  resize: none !important;
  background: transparent;
  color: var(--fp-text);
  font: 400 17px/1.6 var(--font-aeonik, 'Aeonik', Inter, system-ui, sans-serif);
  min-height: 132px;
  field-sizing: content;
  max-block-size: 300px;
}
.ti-input::placeholder { color: var(--fp-muted); }

.ti-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--fp-divider);
}
.ti-tools { display: flex; gap: 8px; flex-wrap: wrap; }
.ti-tool {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 14px;
  border-radius: var(--festag-control-radius-lg, 8px);
  border: 1px solid var(--fp-border);
  background: transparent;
  color: var(--fp-soft);
  font: 400 14px/1 var(--font-aeonik, 'Aeonik', Inter, system-ui, sans-serif);
  white-space: nowrap;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
}
.ti-tool:hover { background: var(--fp-hover); color: var(--fp-text); }
.ti-tool.is-on {
  border-color: var(--fp-accent);
  color: var(--fp-accent);
  background: var(--fp-accent-soft);
}
.ti-hint { margin: 0; font-size: 14px; color: var(--fp-muted); white-space: nowrap; }

.ti-files { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.ti-file {
  display: inline-flex; align-items: center; gap: 8px;
  max-width: 100%; padding: 8px 10px 8px 12px;
  border-radius: var(--festag-control-radius-lg, 8px);
  background: var(--fp-pill);
  color: var(--fp-text);
  font-size: 14px;
}
.ti-file span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 190px; }
.ti-file button {
  border: none; background: transparent; color: var(--fp-muted);
  cursor: pointer; display: inline-flex; padding: 2px;
}
.ti-file button:hover { color: var(--fp-text); }

/* ── Processing ── */
.ti-process {
  display: flex; flex-direction: column; align-items: flex-start; gap: 12px;
  min-height: 150px; justify-content: center; padding: 16px 2px 28px;
}
.ti-process-label { margin: 0; font: 400 20px/1.35 var(--font-aeonik, 'Aeonik', Inter, system-ui, sans-serif); color: var(--fp-text); }
.ti-process-sub { margin: 0; font-size: 15px; line-height: 1.6; color: var(--fp-muted); max-width: 40rem; }

/* ── Draft — one calm rhythm, generous room ── */
.ti-draft { display: flex; flex-direction: column; gap: 24px; }
.ti-row { display: grid; gap: 8px; }
.ti-label {
  font-size: 14px;
  letter-spacing: 0.01em;
  color: var(--fp-muted);
}
.ti-value { margin: 0; font-size: 18px; line-height: 1.5; color: var(--fp-text); }
.ti-value-soft { color: var(--fp-soft); font-size: 16px; line-height: 1.6; }

.ti-field {
  width: 100%; height: 48px; border-radius: var(--festag-control-radius-lg, 8px);
  border: 1px solid var(--fp-inp-border);
  background: var(--fp-inp);
  color: var(--fp-text);
  padding: 0 14px;
  font: 400 16px/1.4 var(--font-aeonik, 'Aeonik', Inter, system-ui, sans-serif);
  outline: none;
  transition: border-color 140ms ease, background 140ms ease;
}
.ti-field:focus { border-color: var(--fp-inp-focus-border); background: var(--fp-inp-focus); }
.ti-field-area { height: auto; min-height: 104px; padding: 13px 14px; resize: none !important; line-height: 1.6; }
.ti-field option { color: var(--fp-text); background: var(--fp-bg); }

.ti-chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.ti-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 12px; border-radius: var(--festag-control-radius-lg, 8px);
  background: var(--fp-pill);
  border: 1px solid var(--fp-border);
  font-size: 15px; color: var(--fp-text);
}
.ti-chip button { border: none; background: transparent; color: var(--fp-muted); cursor: pointer; display: inline-flex; }
.ti-chip button:hover { color: var(--fp-text); }

.ti-add-row { display: flex; gap: 8px; margin-top: 10px; }
.ti-add-btn {
  height: 48px; padding: 0 16px; border-radius: var(--festag-control-radius-lg, 8px);
  border: 1px solid var(--fp-border);
  background: transparent; color: var(--fp-text);
  cursor: pointer; white-space: nowrap;
  font: 400 15px/1 var(--font-aeonik, 'Aeonik', Inter, system-ui, sans-serif);
  transition: background 140ms ease;
}
.ti-add-btn:hover { background: var(--fp-hover); }

.ti-scope { display: flex; gap: 8px; flex-wrap: wrap; }
.ti-scope-btn {
  height: 40px; padding: 0 16px; border-radius: var(--festag-control-radius-lg, 8px);
  border: 1px solid var(--fp-border);
  background: transparent; color: var(--fp-soft);
  cursor: pointer;
  font: 400 15px/1 var(--font-aeonik, 'Aeonik', Inter, system-ui, sans-serif);
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
}
.ti-scope-btn:hover { background: var(--fp-hover); }
.ti-scope-btn.is-on {
  border-color: var(--fp-accent);
  color: var(--fp-text);
  background: var(--fp-accent-soft);
}

.ti-error, .ti-done {
  padding: 12px 2px 16px; color: var(--fp-text);
  font-size: 16px; line-height: 1.6;
}
.ti-error { color: var(--red, #C43C3C); }

@media (max-width: 768px) {
  .ti-hint { display: none; }
  .ti-toolbar { justify-content: flex-start; }
  .ti-input { font-size: 16px; min-height: 120px; }
  .ti-body { gap: 22px; }
}
`
