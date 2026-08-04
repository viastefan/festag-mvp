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
          text: trimmed || 'Please organize these attachments into work.',
          attachmentNames: files.map((f) => f.file.name),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok || !data?.result) {
        setError('Tagro could not understand that yet. Try again in a moment.')
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
      setError('Tagro could not understand that yet. Try again in a moment.')
      setPhase('error')
    }
  }

  async function confirmDraft() {
    if (!result || phase === 'confirming') return
    setPhase('confirming')
    setError('')

    try {
      if (result.intent === 'question') {
        setDoneMessage('Tagro answered your question. Nothing was created.')
        setPhase('done')
        return
      }

      if (result.intent === 'status_briefing') {
        await fetch('/api/tagro/intent-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'briefing' }),
        }).catch(() => null)
        setDoneMessage('Opening your workspace briefing.')
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
          setError('The project draft could not be created.')
          setPhase('error')
          return
        }
        await uploadStagedAssets(data.project.id)
        setDoneMessage(`${projectDraft.name} is ready.`)
        setPhase('done')
        onCreated?.(data.project.id)
        return
      }

      if ((result.intent === 'bug_task' || result.intent === 'feature_task') && taskDraft) {
        if (!taskDraft.projectId) {
          setError('Choose a project for this task draft.')
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
          setError('The task draft could not be created.')
          setPhase('error')
          return
        }
        setDoneMessage(`${taskDraft.title} was created.`)
        setPhase('done')
        window.setTimeout(() => onClose(), 900)
        return
      }

      if (result.intent === 'invite' && inviteDraft) {
        if (!inviteDraft.projectId) {
          setError('Choose a project for the invitation.')
          setPhase('editing')
          return
        }
        if (!inviteDraft.username.trim() && !inviteDraft.email.trim()) {
          setError('Add a username or email.')
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
              ? 'No Festag user with that username.'
              : 'The invitation could not be sent.',
          )
          setPhase('error')
          return
        }
        setDoneMessage('Invitation sent.')
        setPhase('done')
        window.setTimeout(() => onClose(), 900)
        return
      }

      setError('Nothing to confirm yet.')
      setPhase('error')
    } catch {
      setError('Something went wrong. Please try again.')
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
      ? 'What would you like to build or update?'
      : phase === 'done'
        ? doneMessage || 'Ready.'
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
            Cancel
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={submitIntent}
            disabled={!text.trim() && files.length === 0}
          >
            Continue with Tagro
          </ModalButton>
        </>
      )}
      {showUnderstanding && (
        <ModalButton variant="ghost" onClick={onClose} disabled>
          Working
        </ModalButton>
      )}
      {showDraft && result?.intent === 'new_project' && (
        <>
          <ModalButton
            variant="secondary"
            onClick={() => setPhase(editing ? 'draft' : 'editing')}
            disabled={busy}
          >
            {editing ? 'Done editing' : 'Edit Draft'}
          </ModalButton>
          <ModalButton variant="primary" onClick={confirmDraft} loading={busy} disabled={busy}>
            Create Project
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
            {editing ? 'Done editing' : 'Edit Draft'}
          </ModalButton>
          <ModalButton variant="primary" onClick={confirmDraft} loading={busy} disabled={busy}>
            Create Task
          </ModalButton>
        </>
      )}
      {showDraft && result?.intent === 'invite' && (
        <>
          <ModalButton variant="ghost" onClick={resetToCompose} disabled={busy}>
            Back
          </ModalButton>
          <ModalButton variant="primary" onClick={confirmDraft} loading={busy} disabled={busy}>
            Send Invitation
          </ModalButton>
        </>
      )}
      {showDraft && result?.intent === 'question' && (
        <>
          <ModalButton variant="ghost" onClick={resetToCompose}>
            Ask again
          </ModalButton>
          <ModalButton variant="primary" onClick={confirmDraft}>
            Done
          </ModalButton>
        </>
      )}
      {showDraft && result?.intent === 'status_briefing' && (
        <>
          <ModalButton variant="ghost" onClick={resetToCompose} disabled={busy}>
            Back
          </ModalButton>
          <ModalButton variant="primary" onClick={confirmDraft} loading={busy} disabled={busy}>
            Open Briefing
          </ModalButton>
        </>
      )}
      {phase === 'error' && (
        <>
          <ModalButton variant="ghost" onClick={onClose}>
            Close
          </ModalButton>
          <ModalButton variant="primary" onClick={resetToCompose}>
            Try again
          </ModalButton>
        </>
      )}
      {phase === 'done' && (
        <ModalButton variant="primary" onClick={onClose}>
          Close
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
                    <button type="button" aria-label="Remove file" onClick={() => removeFile(f.id)}>
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
                    aria-label={listening ? 'Stop voice input' : 'Voice input'}
                  >
                    {listening ? (
                      <MicrophoneSlash size={16} weight="bold" />
                    ) : (
                      <Microphone size={16} weight="bold" />
                    )}
                    <span>Voice</span>
                  </button>
                )}
                <button
                  type="button"
                  className="ti-tool"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload file"
                >
                  <Paperclip size={16} weight="bold" />
                  <span>File</span>
                </button>
                <button
                  type="button"
                  className="ti-tool"
                  onClick={() => imageInputRef.current?.click()}
                  aria-label="Upload image"
                >
                  <ImageIcon size={16} weight="bold" />
                  <span>Image</span>
                </button>
              </div>
              <p className="ti-hint">Drop files here, ⌘ Enter to continue</p>
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
              Tagro is organizing your request into structured work.
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
            <DraftField label="Your question">
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
            <p>{error || 'Something went wrong.'}</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="ti-done">
            <p>{doneMessage || 'Ready.'}</p>
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
      <DraftField label="Project Name">
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
      <DraftField label="Summary">
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
      <DraftField label="Detected Features">
        <ul className="ti-chips">
          {draft.features.map((f) => (
            <li key={f} className="ti-chip">
              <span>{f}</span>
              {editing && (
                <button
                  type="button"
                  aria-label={`Remove ${f}`}
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
              placeholder="Add feature"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onAddFeature()
                }
              }}
            />
            <button type="button" className="ti-add-btn" onClick={onAddFeature}>
              Add
            </button>
          </div>
        )}
      </DraftField>
      <DraftField label="Estimated Scope">
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
      <DraftField label="Project">
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
            <option value="">Select project</option>
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
      <DraftField label="Priority">
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
      <DraftField label="Assigned">
        <p className="ti-value ti-value-soft">Unassigned</p>
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
      <DraftField label="Project">
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
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </DraftField>
      <DraftField label="Username">
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
      <DraftField label="Role">
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
  if (!result) return 'Review draft'
  switch (result.intent) {
    case 'new_project':
      return 'Project draft ready for your confirmation.'
    case 'bug_task':
      return 'Bug task draft ready for your confirmation.'
    case 'feature_task':
      return 'Feature task draft ready for your confirmation.'
    case 'invite':
      return 'Invitation draft ready for your confirmation.'
    case 'question':
      return 'Here is Tagro’s answer.'
    case 'status_briefing':
      return 'Workspace briefing is ready.'
    default:
      return 'Review draft'
  }
}

const INTENT_MODAL_CSS = `
.ti-body { display: flex; flex-direction: column; gap: 16px; }
.ti-compose {
  border: 1px solid var(--fp-border, rgba(30,30,32,0.10));
  border-radius: 12px;
  background: var(--fp-inp, transparent);
  padding: 14px 14px 10px;
  transition: border-color 160ms ease, background 160ms ease;
}
.ti-compose.is-drag {
  border-color: var(--fp-accent, #5B647D);
  background: var(--fp-accent-soft, rgba(91,100,125,0.06));
}
.ti-input {
  width: 100%;
  border: none;
  outline: none;
  resize: none !important;
  background: transparent;
  color: var(--fp-text, #1e1e20);
  font: 400 16px/1.55 Aeonik, Inter, system-ui, sans-serif;
  min-height: 140px;
  field-sizing: content;
  max-block-size: 280px;
}
.ti-input::placeholder { color: var(--fp-muted, #8891a0); }
.ti-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--fp-divider, rgba(30,30,32,0.08));
}
.ti-tools { display: flex; gap: 6px; flex-wrap: wrap; }
.ti-tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 4px;
  border: 1px solid var(--fp-border, rgba(30,30,32,0.10));
  background: transparent;
  color: var(--fp-soft, #5c5c62);
  font: 400 13px/1 Aeonik, Inter, system-ui, sans-serif;
  white-space: nowrap;
  cursor: pointer;
}
.ti-tool:hover { background: var(--fp-hover, rgba(91,100,125,0.07)); }
.ti-tool.is-on {
  border-color: var(--fp-accent, #5B647D);
  color: var(--fp-accent, #5B647D);
}
.ti-hint {
  margin: 0;
  font-size: 12.5px;
  color: var(--fp-muted, #8891a0);
  white-space: nowrap;
}
.ti-files {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ti-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 6px 8px 6px 10px;
  border-radius: 6px;
  background: var(--fp-pill, rgba(15,23,42,0.04));
  color: var(--fp-text, #1e1e20);
  font-size: 12.5px;
}
.ti-file span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}
.ti-file button {
  border: none;
  background: transparent;
  color: var(--fp-muted, #8891a0);
  cursor: pointer;
  display: inline-flex;
  padding: 2px;
}
.ti-process {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-height: 140px;
  justify-content: center;
  padding: 12px 2px 24px;
}
.ti-process-label {
  margin: 0;
  font: 400 18px/1.35 Aeonik, Inter, system-ui, sans-serif;
  color: var(--fp-text, #1e1e20);
}
.ti-process-sub {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--fp-muted, #8891a0);
  max-width: 36rem;
}
.ti-draft { display: flex; flex-direction: column; gap: 18px; }
.ti-row { display: grid; gap: 6px; }
.ti-label {
  font-size: 12.5px;
  letter-spacing: 0.01em;
  color: var(--fp-muted, #8891a0);
}
.ti-value {
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
  color: var(--fp-text, #1e1e20);
}
.ti-value-soft { color: var(--fp-soft, #5c5c62); font-size: 15px; line-height: 1.55; }
.ti-field {
  width: 100%;
  height: 42px;
  border-radius: 4px;
  border: 1px solid var(--fp-inp-border, rgba(30,30,32,0.15));
  background: transparent;
  color: var(--fp-text, #1e1e20);
  padding: 0 12px;
  font: 400 15px/1.4 Aeonik, Inter, system-ui, sans-serif;
  outline: none;
}
.ti-field:focus { border-color: var(--fp-inp-focus-border, #5B647D); }
.ti-field-area {
  height: auto;
  min-height: 84px;
  padding: 10px 12px;
  resize: none !important;
}
.ti-chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.ti-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 6px;
  background: var(--fp-pill, rgba(15,23,42,0.04));
  border: 1px solid var(--fp-border, rgba(30,30,32,0.08));
  font-size: 13.5px;
  color: var(--fp-text, #1e1e20);
}
.ti-chip button {
  border: none;
  background: transparent;
  color: var(--fp-muted, #8891a0);
  cursor: pointer;
  display: inline-flex;
}
.ti-add-row { display: flex; gap: 8px; margin-top: 8px; }
.ti-add-btn {
  height: 42px;
  padding: 0 14px;
  border-radius: 4px;
  border: 1px solid var(--fp-border, rgba(30,30,32,0.10));
  background: transparent;
  color: var(--fp-text, #1e1e20);
  cursor: pointer;
  white-space: nowrap;
  font: 400 14px/1 Aeonik, Inter, system-ui, sans-serif;
}
.ti-scope { display: flex; gap: 6px; flex-wrap: wrap; }
.ti-scope-btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 4px;
  border: 1px solid var(--fp-border, rgba(30,30,32,0.10));
  background: transparent;
  color: var(--fp-soft, #5c5c62);
  cursor: pointer;
  font: 400 13px/1 Aeonik, Inter, system-ui, sans-serif;
}
.ti-scope-btn.is-on {
  border-color: var(--fp-accent, #5B647D);
  color: var(--fp-text, #1e1e20);
  background: var(--fp-accent-soft, rgba(91,100,125,0.08));
}
.ti-error, .ti-done {
  padding: 8px 2px 12px;
  color: var(--fp-text, #1e1e20);
  font-size: 15.5px;
  line-height: 1.55;
}
.ti-error { color: var(--red, #D14343); }
@media (max-width: 768px) {
  .ti-hint { display: none; }
  .ti-toolbar { justify-content: flex-start; }
  .ti-input { font-size: 16px; min-height: 120px; }
}
`
