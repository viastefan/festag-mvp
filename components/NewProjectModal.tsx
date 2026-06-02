'use client'

/**
 * NewProjectModal — calm centred dialog for creating a new project.
 *
 * Design (per 2026-05-23 spec):
 *   • True modal — dim + blur backdrop over the whole viewport. The
 *     sidebar stays visible behind the dim but is locked. The dialog
 *     sits dead-centre on the page (not inside the content column).
 *   • One concise form that opens a focused Tagro briefing chat. The
 *     first user message is carried into the chat as the starting point.
 *   • Submit lifecycle: idle → "Projekt vorbereiten" → loading
 *     "Tagro strukturiert…" → success "Projekt angelegt" with a calm
 *     four-step progress strip → onCreated.
 *   • No black buttons anywhere. Slate (var(--btn-prim)) is the only
 *     primary tone.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ElementType } from 'react'
import { createClient } from '@/lib/supabase/client'
import TagroLogo from '@/components/TagroLogo'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import {
  ArrowRight, ArrowsClockwise, Buildings, ChatCircleText, Check,
  ListChecks, Microphone, MicrophoneSlash, PaperPlaneTilt, Plus, Sparkle, Trash, UsersThree, X,
} from '@phosphor-icons/react'

interface Props {
  onClose: () => void
  onCreated?: (projectId: string) => void
}

type DeliveryModel = 'festag_delivery' | 'team_internal' | 'white_label_client'

type DeliveryOption = {
  id: DeliveryModel
  icon: ElementType
  label: string
  meta: string
  tagroAfter: string
}

const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'festag_delivery',
    icon: Sparkle,
    label: 'Festag-Entwickler finden',
    meta: 'Festag sucht einen passenden Entwickler und steuert die Umsetzung.',
    tagroAfter: 'Zusätzlich wird ein passender Festag-Entwickler für die Umsetzung gesucht.',
  },
  {
    id: 'team_internal',
    icon: UsersThree,
    label: 'Eigenes Team',
    meta: 'Mitarbeiter, Freelancer oder Partner aus deinem Workspace übernehmen.',
    tagroAfter: 'Die nächsten Schritte werden für das zuständige Team vorbereitet.',
  },
  {
    id: 'white_label_client',
    icon: Buildings,
    label: 'White-Label',
    meta: 'Für Agenturen — Festag bleibt im Hintergrund, dein Branding zählt.',
    tagroAfter: 'Die Umsetzung wird diskret für das hinterlegte Team vorbereitet.',
  },
]

// Calm accent palette. The colour shows up only as a thin row marker in
// the projects table and as a soft tint in the project header.
const ACCENT_COLOURS = [
  { id: 'primary', value: '#6a738c', label: 'Primary' },
  { id: 'slate',   value: '#5B647D', label: 'Slate' },
  { id: 'sky',     value: '#0EA5E9', label: 'Sky' },
  { id: 'emerald', value: '#22A06B', label: 'Emerald' },
  { id: 'amber',   value: '#D4882B', label: 'Amber' },
  { id: 'rose',    value: '#E11D48', label: 'Rose' },
  { id: 'mist',    value: '#94A3B8', label: 'Mist' },
]

type WorkspaceMode = 'delivery' | 'team' | 'agency'
type Phase = 'form' | 'chat' | 'loading' | 'success' | 'error'
type ChatTurn = { role: 'user' | 'tagro'; text: string }

const LOADING_STEPS = [
  'Projekt wird vorbereitet',
  'Tagro strukturiert die Angaben',
  'Nächste Schritte werden angelegt',
  'Projekt wurde erstellt',
] as const

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [accent, setAccent] = useState(ACCENT_COLOURS[0].value)
  const [delivery, setDelivery] = useState<DeliveryModel>('festag_delivery')
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('delivery')
  const [milestonesOpen, setMilestonesOpen] = useState(false)
  const [milestoneDraft, setMilestoneDraft] = useState('')
  const [milestones, setMilestones] = useState<string[]>([])
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatComplete, setChatComplete] = useState(false)
  const [tagroTitle, setTagroTitle] = useState<string | null>(null)
  const [tagroSummary, setTagroSummary] = useState<string | null>(null)

  const [phase, setPhase] = useState<Phase>('form')
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState('')

  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const chatBodyRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  // Focus the title on open.
  useEffect(() => { titleRef.current?.focus() }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('mode')
          .eq('primary_owner_id', user.id)
          .eq('is_personal', true)
          .maybeSingle()
        const mode = (workspace as any)?.mode
        if (!cancelled && (mode === 'team' || mode === 'agency' || mode === 'delivery')) {
          setWorkspaceMode(mode)
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [supabase])

  // Esc closes — but only when not mid-loading, so a half-finished
  // submit can't be abandoned accidentally.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'loading') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, phase])

  // Autosize the description textarea.
  useEffect(() => {
    const el = descRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(360, Math.max(220, el.scrollHeight)) + 'px'
  }, [description])

  useEffect(() => {
    if (workspaceMode !== 'agency' && delivery === 'white_label_client') {
      setDelivery('festag_delivery')
    }
  }, [delivery, workspaceMode])

  useEffect(() => {
    if (phase !== 'chat') return
    chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatHistory, chatLoading, phase])

  useEffect(() => {
    if (phase !== 'chat') return
    const t = window.setTimeout(() => chatInputRef.current?.focus(), 80)
    return () => window.clearTimeout(t)
  }, [phase])

  // Body scroll lock with scrollbar-gutter compensation — keeps the
  // sidebar from jumping when the scrollbar disappears.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const prevPadding = document.body.style.paddingRight
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPadding
    }
  }, [])

  // Loading step ticker — purely visual, the actual work runs in submit().
  useEffect(() => {
    if (phase !== 'loading') return
    setLoadingStep(0)
    const ticks = [350, 900, 1500]
    const timers = ticks.map((t, i) => setTimeout(() => setLoadingStep(i + 1), t))
    return () => { timers.forEach(clearTimeout) }
  }, [phase])

  // Voice dictation (Web Speech API, on-device). Festag is voice-first — you
  // can speak the project instead of typing. Dictates into either the
  // description (form) or the chat composer.
  const dictationTargetRef = useRef<null | 'desc' | 'chat'>(null)
  const dictationBaseRef = useRef('')
  const [dictating, setDictating] = useState<null | 'desc' | 'chat'>(null)
  const { supported: micSupported, listening: micListening, start: startMic, stop: stopMic } = useSpeechRecognition({
    lang: 'de-DE',
    onResult: (text, isFinal) => {
      const target = dictationTargetRef.current
      if (!target) return
      const base = dictationBaseRef.current
      const combined = (base ? base + ' ' : '') + text
      if (target === 'desc') setDescription(combined)
      else setChatInput(combined)
      if (isFinal) dictationBaseRef.current = combined
    },
    onError: () => setDictating(null),
  })
  useEffect(() => {
    if (!micListening) { setDictating(null); dictationTargetRef.current = null }
  }, [micListening])

  function toggleDictation(target: 'desc' | 'chat') {
    if (!micSupported) return
    if (micListening || dictating) {
      stopMic(); setDictating(null); dictationTargetRef.current = null
      return
    }
    dictationTargetRef.current = target
    dictationBaseRef.current = (target === 'desc' ? description : chatInput).trim()
    setDictating(target)
    startMic()
  }

  const isAgency = workspaceMode === 'agency'
  const deliveryOptions = useMemo(
    () => isAgency ? DELIVERY_OPTIONS : DELIVERY_OPTIONS.filter(opt => opt.id !== 'white_label_client'),
    [isAgency],
  )
  const selectedDelivery = deliveryOptions.find(d => d.id === delivery) ?? deliveryOptions[0]
  const titleDraft = title.trim()
  const descriptionDraft = description.trim()
  const canStartChat = titleDraft.length >= 2 || descriptionDraft.length >= 12
  const canCreate = chatHistory.some(turn => turn.role === 'user' && turn.text.trim().length >= 2)

  function suggestedTitle() {
    const source = tagroTitle || title.trim() || description.trim()
    return source.split(/\s+/).slice(0, 6).join(' ').replace(/[.,;:!?]+$/, '') || 'Neues Projekt'
  }

  function buildInitialChatHistory(): ChatTurn[] {
    const parts = [
      titleDraft ? `Projektname: ${titleDraft}` : '',
      descriptionDraft,
      milestones.length ? `Gewünschte Meilensteine: ${milestones.join(', ')}` : '',
      `Umsetzung: ${selectedDelivery.label}`,
    ].filter(Boolean)

    return [{ role: 'user', text: parts.join('\n\n') }]
  }

  async function askTagro(history: ChatTurn[]) {
    setChatLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/intake-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory: history }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Tagro konnte gerade nicht antworten.')

      setTagroTitle(typeof data?.title === 'string' ? data.title : null)
      setTagroSummary(typeof data?.summary === 'string' ? data.summary : null)
      setChatComplete(Boolean(data?.complete))

      const question = typeof data?.question === 'string' ? data.question.trim() : ''
      const tagroText = question || 'Ich habe genug Kontext. Du kannst das Projekt jetzt vorbereiten.'
      setChatHistory([...history, { role: 'tagro', text: tagroText }])
    } catch (e: any) {
      setError(e?.message || 'Tagro konnte gerade nicht antworten.')
      setChatHistory([...history, {
        role: 'tagro',
        text: 'Ich habe deine Nachricht übernommen. Du kannst noch Details ergänzen oder das Projekt direkt vorbereiten.',
      }])
    } finally {
      setChatLoading(false)
    }
  }

  async function openTagroChat() {
    if (!canStartChat || phase === 'loading') return
    const initialHistory = buildInitialChatHistory()
    setChatHistory(initialHistory)
    setPhase('chat')
    await askTagro(initialHistory)
  }

  async function sendChatMessage() {
    const text = chatInput.trim()
    if (!text || chatLoading || phase !== 'chat') return
    const nextHistory = [...chatHistory, { role: 'user' as const, text }]
    setChatInput('')
    setChatHistory(nextHistory)
    await askTagro(nextHistory)
  }

  function addMilestone() {
    const value = milestoneDraft.trim()
    if (!value) return
    setMilestones(prev => [...prev, value])
    setMilestoneDraft('')
  }

  function removeMilestone(index: number) {
    setMilestones(prev => prev.filter((_, i) => i !== index))
  }

  async function createProject() {
    if (!canCreate || phase === 'loading') return
    setError('')
    setPhase('loading')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('Bitte melde dich erneut an.')

      const finalHistory = chatHistory.length ? chatHistory : buildInitialChatHistory()
      const decomposerHistory = finalHistory.map(turn => ({
        role: turn.role === 'tagro' ? 'ai' : 'user',
        text: turn.text,
      }))
      // Preferred path: Tagro structures the project (epics/tasks) and persists
      // it. This needs the server service-role key + a usable AI response.
      let projectId: string | undefined
      try {
        const res = await fetch('/api/ai/decompose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatHistory: decomposerHistory, userId }),
        })
        const data = await res.json().catch(() => null)
        if (res.ok && typeof data?.projectId === 'string') projectId = data.projectId
      } catch { /* fall through to direct create */ }

      // Fallback: always be able to create a project, even when the AI
      // structuring path is unavailable (no service-role key, AI offline,
      // parse failure, or onboarding skipped). RLS allows a user to insert
      // their own project, so a plain row is created directly.
      if (!projectId) {
        const { data: created, error: insErr } = await (supabase as any)
          .from('projects')
          .insert({
            user_id: userId,
            title: suggestedTitle(),
            description: (tagroSummary || description.trim() || titleDraft).slice(0, 1200) || null,
            status: isAgency ? 'intake' : 'planning',
          })
          .select('id')
          .single()
        if (insErr || !created?.id) {
          throw new Error(insErr?.message || 'Projekt konnte nicht angelegt werden.')
        }
        projectId = created.id as string
      }

      // Patch the project row with the user's explicit selections so the
      // structuring step's guesses don't overwrite them.
      const patch: Record<string, unknown> = {
        title: suggestedTitle(),
        scope_summary: (tagroSummary || description.trim()).slice(0, 1200),
        color: accent,
        status: isAgency ? 'intake' : 'planning',
      }
      // delivery_model column added by the modular-project-types migration.
      try { (patch as any).delivery_model = delivery } catch {}
      await (supabase as any).from('projects').update(patch).eq('id', projectId)

      if (milestones.length > 0) {
        const rows = milestones.map((name, index) => ({
          project_id: projectId,
          title: name,
          amount: 0,
          status: index === 0 ? 'pending' : 'locked',
          order_index: index,
        }))
        try {
          await (supabase as any).from('milestones').insert(rows)
        } catch {}
      }

      // Background classifier — fire-and-forget.
      fetch('/api/projects/classify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), projectId }),
      }).catch(() => {})

      // Hold the success state for a beat so the user sees the result
      // line up before we hand off.
      setPhase('success')
      setTimeout(() => onCreated?.(projectId), 700)
    } catch (e: any) {
      setError(e?.message || 'Projekt konnte nicht angelegt werden.')
      setPhase(chatHistory.length ? 'chat' : 'error')
    }
  }

  return (
    <div className="npm-overlay" role="dialog" aria-modal="true" aria-label="Neues Projekt">
      <style>{CSS}</style>

      <div
        className="npm-backdrop"
        onMouseDown={e => {
          if (phase === 'loading') return
          if (e.target === e.currentTarget) onClose()
        }}
        aria-hidden
      />

      <div
        className={`npm-card${phase === 'chat' ? ' is-chat' : ''}`}
        ref={dialogRef}
        role="document"
        onMouseDown={e => e.stopPropagation()}
      >
        <header className="npm-head">
          <div className="npm-head-meta">
            <p className="npm-eyebrow">{phase === 'chat' ? 'Tagro Briefing' : 'Neues Projekt'}</p>
            <h2>{phase === 'chat' ? 'Mit Tagro strukturieren' : 'Was möchtest du umsetzen?'}</h2>
          </div>
          <button
            type="button"
            className="npm-icon-btn"
            onClick={onClose}
            disabled={phase === 'loading'}
            aria-label="Schließen"
          >
            <X size={16} />
          </button>
        </header>

        {(phase === 'form' || phase === 'error') && (
          <div className="npm-body">
            <section className="npm-section title">
              <div className="npm-title-row">
                <button
                  type="button"
                  className="npm-accent-trigger"
                  style={{ background: accent }}
                  aria-label={`Projektakzent gewählt: ${accent}`}
                  title="Akzentfarbe anpassen"
                  onClick={() => titleRef.current?.focus()}
                />
                <input
                  ref={titleRef}
                  className="npm-title"
                  placeholder="Projektname"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="npm-accent-row" role="radiogroup" aria-label="Projektakzent">
                {ACCENT_COLOURS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={accent === c.value}
                    aria-label={c.label}
                    title={c.label}
                    className={`npm-accent-chip${accent === c.value ? ' on' : ''}`}
                    onClick={() => setAccent(c.value)}
                  >
                    <span style={{ background: c.value }} />
                  </button>
                ))}
              </div>
            </section>

            <section className="npm-section compact">
              <p className="npm-label as-block">Umsetzung</p>
              <div className="npm-delivery" role="radiogroup" aria-label="Umsetzungsart">
                {deliveryOptions.map(opt => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={delivery === opt.id}
                      className={`npm-delivery-pill${delivery === opt.id ? ' on' : ''}`}
                      onClick={() => setDelivery(opt.id)}
                      title={opt.meta}
                    >
                      <Icon size={14} weight="regular" />
                      <span>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="npm-section npm-description">
              <textarea
                id="npm-desc"
                ref={descRef}
                className="npm-textarea"
                placeholder="Schreibe oder sprich eine Beschreibung, ein Projektbriefing oder sammle Ideen..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={8}
                maxLength={2000}
              />
              <div className="npm-input-tools">
                {micSupported && (
                  <button
                    type="button"
                    className={`npm-tool-btn${dictating === 'desc' ? ' rec' : ''}`}
                    onClick={() => toggleDictation('desc')}
                    aria-pressed={dictating === 'desc'}
                    title={dictating === 'desc' ? 'Aufnahme stoppen' : 'Per Sprache diktieren'}
                  >
                    {dictating === 'desc' ? <MicrophoneSlash size={15} weight="fill" /> : <Microphone size={15} />}
                    <span>{dictating === 'desc' ? 'Hört zu …' : 'Sprechen'}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="npm-tool-btn tagro"
                  onClick={openTagroChat}
                  disabled={!canStartChat}
                  title="Mit Tagro strukturieren — Tagro kennt den Kontext"
                >
                  <TagroLogo size={16} />
                  <span>Tagro fragen</span>
                </button>
              </div>
            </section>

            <section className="npm-section">
              <button
                type="button"
                className={`npm-milestone-trigger${milestonesOpen ? ' on' : ''}`}
                onClick={() => setMilestonesOpen(v => !v)}
                aria-expanded={milestonesOpen}
              >
                <span className="npm-milestone-left">
                  <ListChecks size={15} weight="regular" />
                  <span>
                    <strong>Meilensteine</strong>
                    <small>{milestones.length ? `${milestones.length} vorbereitet` : 'Optional vorbereiten'}</small>
                  </span>
                </span>
                <Plus size={15} weight="regular" className="npm-milestone-plus" />
              </button>

              {milestonesOpen && (
                <div className="npm-milestone-panel">
                  {milestones.length > 0 && (
                    <div className="npm-milestone-list">
                      {milestones.map((milestone, index) => (
                        <div className="npm-milestone-item" key={`${milestone}-${index}`}>
                          <span>{milestone}</span>
                          <button type="button" onClick={() => removeMilestone(index)} aria-label={`${milestone} entfernen`}>
                            <Trash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="npm-milestone-input-row">
                    <input
                      value={milestoneDraft}
                      onChange={e => setMilestoneDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addMilestone()
                        }
                      }}
                      placeholder="Meilenstein hinzufügen..."
                    />
                    <button type="button" onClick={addMilestone} disabled={!milestoneDraft.trim()}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </section>

            {error && (
              <p className="npm-error" role="alert">{error}</p>
            )}
          </div>
        )}

        {phase === 'chat' && (
          <div className="npm-chat">
            <div className="npm-chat-main" ref={chatBodyRef}>
              {chatHistory.map((turn, index) => (
                <div key={`${turn.role}-${index}`} className={`npm-chat-row ${turn.role}`}>
                  {turn.role === 'tagro' && (
                    <span className="npm-chat-avatar"><TagroLogo size={22} thinking={chatLoading && index === chatHistory.length - 1} /></span>
                  )}
                  <div className="npm-chat-bubble">
                    <p>{turn.text}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="npm-chat-row tagro">
                  <span className="npm-chat-avatar"><TagroLogo size={22} thinking /></span>
                  <div className="npm-chat-bubble muted">
                    <span className="npm-typing"><span /><span /><span /></span>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="npm-error in-chat" role="alert">{error}</p>}

            <div className="npm-chat-composer">
              {chatComplete && (
                <div className="npm-chat-ready">
                  <Check size={13} weight="bold" />
                  <span>Tagro hat genug Kontext für die Projektstruktur.</span>
                </div>
              )}
              <div className="npm-chat-input">
                <ChatCircleText size={16} />
                <textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendChatMessage()
                    }
                  }}
                  placeholder={dictating === 'chat' ? 'Sprich mit Tagro …' : 'Schreibe oder sprich mit Tagro...'}
                  rows={1}
                />
                <div className="npm-chat-actions">
                  {micSupported && (
                    <button
                      type="button"
                      className={`npm-chat-mic${dictating === 'chat' ? ' rec' : ''}`}
                      onClick={() => toggleDictation('chat')}
                      disabled={chatLoading}
                      aria-pressed={dictating === 'chat'}
                      aria-label={dictating === 'chat' ? 'Aufnahme stoppen' : 'Per Sprache antworten'}
                    >
                      {dictating === 'chat' ? <MicrophoneSlash size={15} weight="fill" /> : <Microphone size={15} />}
                    </button>
                  )}
                  <button type="button" onClick={sendChatMessage} disabled={!chatInput.trim() || chatLoading} aria-label="Nachricht senden">
                    {chatLoading ? <ArrowsClockwise size={14} className="npm-spin" /> : <PaperPlaneTilt size={14} weight="fill" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="npm-busy">
            <div className="npm-busy-mark">
              <ArrowsClockwise size={20} className="npm-spin" />
            </div>
            <h3>Tagro strukturiert dein Projekt…</h3>
            <ol className="npm-steps">
              {LOADING_STEPS.map((step, i) => (
                <li key={step} className={i < loadingStep ? 'done' : i === loadingStep ? 'active' : 'todo'}>
                  <span className="npm-step-mark" aria-hidden>
                    {i < loadingStep ? <Check size={10} weight="bold" /> : <span className="npm-step-dot" />}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {phase === 'success' && (
          <div className="npm-busy success">
            <div className="npm-busy-mark success">
              <Check size={20} weight="bold" />
            </div>
            <h3>Projekt angelegt</h3>
            <p>{selectedDelivery.tagroAfter}</p>
          </div>
        )}

        {phase !== 'success' && phase !== 'loading' && (
          <footer className="npm-foot">
            <button
              type="button"
              className="npm-secondary"
              onClick={phase === 'chat' ? () => setPhase(error ? 'error' : 'form') : onClose}
              disabled={chatLoading}
            >
              {phase === 'chat' ? 'Zurück' : 'Abbrechen'}
            </button>
            <button
              type="button"
              className="npm-primary"
              onClick={phase === 'chat' ? createProject : openTagroChat}
              disabled={phase === 'chat' ? (!canCreate || chatLoading) : !canStartChat}
              aria-busy={phase === 'chat' ? chatLoading : undefined}
            >
              {phase === 'chat'
                ? <>Projekt vorbereiten <ArrowRight size={13} /></>
                : phase === 'error'
                  ? <>Mit Tagro fortfahren <ArrowRight size={13} /></>
                  : <>Mit Tagro fortfahren <ArrowRight size={13} /></>}
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}

const CSS = `
  .npm-overlay {
    position: fixed; inset: 0; z-index: 12500;
    display: flex; align-items: center; justify-content: center;
    padding: 32px 24px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    animation: npmFade .18s ease both;
  }
  .npm-backdrop {
    position: absolute; inset: 0;
    background: rgba(8,10,14,.42);
    backdrop-filter: blur(8px) saturate(120%);
    -webkit-backdrop-filter: blur(8px) saturate(120%);
  }
  @keyframes npmFade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes npmPop  { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: none; } }

  .npm-card {
    position: relative; z-index: 1;
    width: min(780px, calc(100vw - 32px));
    max-height: calc(100dvh - 64px);
    background: var(--card);
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    border-radius: 20px;
    box-shadow:
      0 1px 2px rgba(15,23,42,.06),
      0 32px 80px -28px rgba(15,23,42,.35);
    display: flex; flex-direction: column;
    overflow: hidden;
    animation: npmPop .26s cubic-bezier(.16,1,.3,1) both;
  }
  [data-theme="dark"] .npm-card,
  [data-theme="classic-dark"] .npm-card {
    background: color-mix(in srgb, var(--card) 96%, #fff 4%);
    box-shadow:
      0 1px 2px rgba(0,0,0,.5),
      0 36px 90px -30px rgba(0,0,0,.7);
  }

  .npm-head {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 20px 22px 14px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }
  .npm-eyebrow {
    margin: 0; font-size: 10.5px; font-weight: 500;
    letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted);
  }
  .npm-head-meta h2 {
    margin: 4px 0 0; font-size: 19px; font-weight: 500; letter-spacing: -.01em;
    color: var(--text);
  }
  .npm-icon-btn {
    width: 32px; height: 32px; border: 0; background: transparent;
    color: var(--text-muted); border-radius: 10px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .npm-icon-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface-2) 65%, transparent);
    color: var(--text);
  }
  .npm-icon-btn:disabled { opacity: .35; cursor: not-allowed; }

  .npm-body {
    padding: 18px 22px 20px;
    overflow-y: auto;
    display: flex; flex-direction: column; gap: 22px;
  }
  .npm-section { display: flex; flex-direction: column; gap: 8px; }
  .npm-label {
    font-size: 11px; font-weight: 500; letter-spacing: .14em;
    text-transform: uppercase; color: var(--text-muted);
  }
  .npm-label.as-block { display: block; }
  .npm-helper {
    margin: -4px 0 4px; font-size: 12.5px; line-height: 1.55;
    color: var(--text-muted); font-weight: 500; letter-spacing: .015em;
    max-width: 56ch;
  }

  /* Title row */
  .npm-title-row { display: flex; align-items: center; gap: 12px; }
  .npm-accent-trigger {
    width: 24px; height: 24px; border-radius: 7px; border: 0;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--border) 80%, transparent);
    cursor: pointer; flex-shrink: 0;
  }
  .npm-title {
    flex: 1; min-width: 0;
    background: transparent; border: 0; outline: 0;
    color: var(--text); font: inherit;
    font-size: 22px; font-weight: 500; letter-spacing: -.015em;
    padding: 6px 0;
  }
  .npm-title::placeholder { color: var(--text-muted); opacity: .55; }

  .npm-accent-row { display: flex; flex-wrap: wrap; gap: 6px; padding-left: 36px; }
  .npm-accent-chip {
    width: 22px; height: 22px; padding: 3px;
    border: 0; background: transparent; border-radius: 999px;
    cursor: pointer; transition: box-shadow .12s;
  }
  .npm-accent-chip > span {
    display: block; width: 100%; height: 100%; border-radius: 999px;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--border) 70%, transparent);
  }
  .npm-accent-chip:hover > span { transform: scale(1.08); transition: transform .12s; }
  .npm-accent-chip.on { box-shadow: 0 0 0 2px color-mix(in srgb, var(--btn-prim) 60%, transparent); }

  /* Description textarea */
  .npm-textarea {
    width: 100%; padding: 14px 16px;
    background: color-mix(in srgb, var(--surface) 55%, var(--card) 45%);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    border-radius: 14px;
    color: var(--text); font: inherit;
    font-size: 14px; line-height: 1.6; font-weight: 500; letter-spacing: .015em;
    outline: 0; resize: vertical;
    min-height: 120px; max-height: 280px;
    transition: border-color .14s, box-shadow .14s;
  }
  .npm-textarea::placeholder { color: var(--text-muted); opacity: .6; }
  .npm-textarea:focus {
    border-color: color-mix(in srgb, var(--btn-prim) 45%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--btn-prim) 14%, transparent);
  }

  .npm-examples { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
  .npm-example {
    display: inline-flex; align-items: center; gap: 5px;
    max-width: 100%;
    padding: 5px 10px; border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
    background: color-mix(in srgb, var(--surface-2) 35%, transparent);
    color: var(--text-secondary);
    font: inherit; font-size: 11px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer;
    transition: background .12s, color .12s, border-color .12s;
  }
  .npm-example > span {
    max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .npm-example:hover {
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
    color: var(--text); border-color: var(--border);
  }
  .npm-example svg { color: var(--text-muted); flex-shrink: 0; }

  /* Delivery cards */
  .npm-delivery {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
  }
  .npm-delivery-card {
    display: grid; grid-template-columns: 32px 1fr 16px;
    gap: 10px; align-items: flex-start;
    padding: 12px 14px;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    background: var(--card);
    border-radius: 14px;
    text-align: left;
    cursor: pointer;
    transition: border-color .14s, background .14s, transform .14s;
    color: var(--text);
    font: inherit;
  }
  .npm-delivery-card:hover {
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }
  .npm-delivery-card.on {
    border-color: color-mix(in srgb, var(--btn-prim) 50%, var(--border));
    background: color-mix(in srgb, var(--btn-prim) 7%, var(--card));
  }
  .npm-delivery-icon {
    width: 32px; height: 32px; border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--surface-2) 65%, transparent);
    color: var(--text-secondary);
  }
  .npm-delivery-card.on .npm-delivery-icon {
    background: color-mix(in srgb, var(--btn-prim) 14%, transparent);
    color: var(--btn-prim);
  }
  .npm-delivery-main { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .npm-delivery-main strong {
    font-size: 13px; font-weight: 500; letter-spacing: -.005em; color: var(--text);
  }
  .npm-delivery-main small {
    font-size: 11.5px; line-height: 1.5;
    color: var(--text-muted); font-weight: 500; letter-spacing: .015em;
  }
  .npm-delivery-tick {
    width: 16px; height: 16px; border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    display: inline-flex; align-items: center; justify-content: center;
    color: transparent; background: transparent; flex-shrink: 0; margin-top: 1px;
    transition: all .14s;
  }
  .npm-delivery-card.on .npm-delivery-tick {
    background: var(--btn-prim); border-color: var(--btn-prim); color: var(--btn-prim-text);
  }

  @media (max-width: 720px) {
    .npm-delivery { grid-template-columns: 1fr; }
  }

  /* Linear-style compose layout overrides.
     Backdrop matches every other Festag modal — same dim + blur, full screen. */
  .npm-backdrop {
    background: rgba(8,10,14,.42);
    backdrop-filter: blur(8px) saturate(120%);
    -webkit-backdrop-filter: blur(8px) saturate(120%);
  }
  .npm-head {
    border-bottom: 0 !important;
  }
  .npm-foot {
    border-top: 0 !important;
  }
  .npm-card.is-chat {
    width: min(860px, calc(100vw - 32px));
    min-height: min(720px, calc(100dvh - 64px));
  }
  .npm-section.title { gap: 5px; }
  .npm-title-row {
    align-items: stretch;
    gap: 13px;
  }
  .npm-accent-trigger {
    width: 3px !important;
    height: 45px !important;
    align-self: center;
    border-radius: 999px !important;
    border: 0 !important;
    box-shadow: none !important;
    opacity: .95;
  }
  .npm-title {
    font-size: 29px;
    line-height: 1.15;
    padding: 8px 0;
  }
  .npm-accent-row {
    gap: 7px;
    padding-left: 16px;
    min-height: 14px;
  }
  .npm-accent-chip {
    width: 22px;
    height: 10px;
    padding: 0;
    border-radius: 999px;
  }
  .npm-accent-chip > span {
    height: 3px;
    border-radius: 999px;
    box-shadow: none;
    opacity: .6;
  }
  .npm-accent-chip:hover > span {
    transform: none;
    opacity: .9;
  }
  .npm-accent-chip.on {
    box-shadow: none;
  }
  .npm-accent-chip.on > span {
    height: 4px;
    opacity: 1;
  }
  .npm-section.compact {
    gap: 9px;
  }
  .npm-delivery {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .npm-delivery-pill {
    height: 32px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
    background: color-mix(in srgb, var(--surface-2) 44%, transparent);
    color: var(--text-secondary);
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: 0;
    cursor: pointer;
    transition: background .12s, color .12s, border-color .12s;
  }
  .npm-delivery-pill:hover {
    color: var(--text);
    border-color: var(--border-strong);
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
  }
  .npm-delivery-pill.on {
    color: var(--text);
    border-color: color-mix(in srgb, var(--btn-prim) 46%, var(--border));
    background: color-mix(in srgb, var(--btn-prim) 10%, var(--surface-2));
  }
  .npm-description {
    min-height: 250px;
    padding-top: 18px;
    border-top: 0 !important;
  }
  .npm-textarea {
    min-height: 220px;
    max-height: 360px;
    padding: 0 !important;
    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    font-size: 18px;
    line-height: 1.48;
    font-weight: 500;
    letter-spacing: 0;
    resize: none;
  }
  .npm-textarea:focus {
    border-color: transparent;
    box-shadow: none;
  }
  .npm-textarea::placeholder {
    opacity: .58;
  }
  .npm-milestone-trigger {
    width: 100%;
    min-height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 17px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
    background: transparent;
    color: var(--text);
    font: inherit;
    cursor: pointer;
    transition: border-color .12s, background .12s;
  }
  .npm-milestone-trigger:hover,
  .npm-milestone-trigger.on {
    border-color: var(--border-strong);
    background: color-mix(in srgb, var(--surface-2) 34%, transparent);
  }
  .npm-milestone-left {
    display: inline-flex;
    align-items: center;
    gap: 13px;
    min-width: 0;
  }
  .npm-milestone-left svg,
  .npm-milestone-plus {
    color: var(--text-muted);
    flex-shrink: 0;
  }
  .npm-milestone-left > span {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .npm-milestone-left strong {
    display: block;
    font-size: 14.5px;
    font-weight: 500;
    color: var(--text);
    letter-spacing: 0;
  }
  .npm-milestone-left small {
    display: block;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-muted);
    letter-spacing: 0;
  }
  .npm-milestone-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
    background: color-mix(in srgb, var(--surface-2) 24%, transparent);
  }
  .npm-milestone-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .npm-milestone-item,
  .npm-milestone-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .npm-milestone-item {
    justify-content: space-between;
    min-height: 34px;
    padding: 0 8px 0 11px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--card) 80%, transparent);
    color: var(--text);
    font-size: 13px;
    font-weight: 500;
  }
  .npm-milestone-item button,
  .npm-milestone-input-row button {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }
  .npm-milestone-item button:hover,
  .npm-milestone-input-row button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
    color: var(--text);
  }
  .npm-milestone-input-row input {
    flex: 1;
    min-width: 0;
    height: 34px;
    padding: 0 11px;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    border-radius: 10px;
    background: var(--card);
    color: var(--text);
    font: inherit;
    font-size: 13px;
    outline: 0;
  }
  .npm-chat {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: color-mix(in srgb, var(--surface) 38%, var(--card));
  }
  .npm-chat-main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 30px 34px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .npm-chat-row {
    display: flex;
    align-items: flex-start;
    gap: 11px;
  }
  .npm-chat-row.user {
    justify-content: flex-end;
  }
  .npm-chat-avatar {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
    flex-shrink: 0;
  }
  .npm-chat-bubble {
    max-width: min(620px, 82%);
    padding: 12px 15px;
    border-radius: 18px;
    background: color-mix(in srgb, var(--surface-2) 62%, transparent);
    color: var(--text);
    font-size: 14px;
    line-height: 1.52;
    font-weight: 500;
    letter-spacing: 0;
    white-space: pre-wrap;
  }
  .npm-chat-row.user .npm-chat-bubble {
    background: var(--btn-prim);
    color: var(--btn-prim-text);
    border-bottom-right-radius: 6px;
  }
  .npm-chat-row.tagro .npm-chat-bubble {
    border-bottom-left-radius: 6px;
  }
  .npm-chat-bubble p {
    margin: 0;
  }
  .npm-chat-bubble.muted {
    width: 64px;
    padding: 13px 15px;
  }
  .npm-typing {
    display: inline-flex;
    gap: 4px;
  }
  .npm-typing span {
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: currentColor;
    opacity: .42;
    animation: npmTyping 1.1s ease-in-out infinite;
  }
  .npm-typing span:nth-child(2) { animation-delay: .14s; }
  .npm-typing span:nth-child(3) { animation-delay: .28s; }
  @keyframes npmTyping {
    0%, 100% { transform: translateY(0); opacity: .35; }
    50% { transform: translateY(-3px); opacity: .9; }
  }
  .npm-error.in-chat {
    margin: 0 34px 12px;
  }
  .npm-chat-composer {
    padding: 14px 18px 18px;
    border-top: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
    background: color-mix(in srgb, var(--card) 92%, transparent);
  }
  .npm-chat-ready {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin: 0 0 9px;
    color: #22a06b;
    font-size: 12.5px;
    font-weight: 500;
  }
  .npm-chat-input {
    min-height: 48px;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    align-items: end;
    gap: 8px;
    padding: 6px 6px 6px 12px;
    border-radius: 18px;
    border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
    background: color-mix(in srgb, var(--surface) 68%, var(--card));
  }
  .npm-chat-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: end;
  }
  .npm-chat-mic {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 999px !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
    color: var(--text-secondary);
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .npm-chat-mic:hover:not(:disabled) { color: var(--text); background: color-mix(in srgb, var(--surface-2) 100%, transparent); }
  .npm-chat-mic:disabled { opacity: .42; cursor: default; }
  .npm-chat-mic.rec {
    background: color-mix(in srgb, #e0564f 18%, transparent);
    color: #e0564f;
    animation: npmRecPulse 1.3s ease-in-out infinite;
  }

  /* Input tools row under the description — mic + Tagro hand-off */
  .npm-input-tools {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    flex-wrap: wrap;
  }
  .npm-tool-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
    background: color-mix(in srgb, var(--surface-2) 40%, transparent);
    color: var(--text-secondary);
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: 0;
    cursor: pointer;
    transition: background .12s, color .12s, border-color .12s;
  }
  .npm-tool-btn:hover:not(:disabled) {
    color: var(--text);
    border-color: var(--border-strong);
    background: color-mix(in srgb, var(--surface-2) 72%, transparent);
  }
  .npm-tool-btn:disabled { opacity: .45; cursor: not-allowed; }
  .npm-tool-btn.tagro { color: var(--text); }
  .npm-tool-btn.rec {
    color: #e0564f;
    border-color: color-mix(in srgb, #e0564f 40%, transparent);
    background: color-mix(in srgb, #e0564f 12%, transparent);
    animation: npmRecPulse 1.3s ease-in-out infinite;
  }
  @keyframes npmRecPulse {
    0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, #e0564f 32%, transparent); }
    50% { box-shadow: 0 0 0 5px color-mix(in srgb, #e0564f 0%, transparent); }
  }
  .npm-chat-input > svg {
    align-self: center;
    color: var(--text-muted);
  }
  .npm-chat-input textarea {
    width: 100%;
    min-height: 34px;
    max-height: 150px;
    resize: none;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 14px;
    line-height: 1.5;
    padding: 7px 0;
  }
  .npm-chat-input button {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--btn-prim);
    color: var(--btn-prim-text);
    cursor: pointer;
  }
  .npm-chat-input button:disabled {
    opacity: .42;
    cursor: default;
  }
  .npm-delivery-pill,
  .npm-milestone-trigger,
  .npm-milestone-panel,
  .npm-milestone-input-row input,
  .npm-primary,
  .npm-secondary {
    border-radius: 8px !important;
  }
  .npm-milestone-item button,
  .npm-milestone-input-row button,
  .npm-chat-input button {
    border-radius: 999px !important;
  }

  /* Error inline */
  .npm-error {
    margin: 0; padding: 10px 14px;
    background: color-mix(in srgb, #ef4444 10%, transparent);
    color: #d44b4b;
    border: 1px solid color-mix(in srgb, #ef4444 22%, transparent);
    border-radius: 12px;
    font-size: 12.5px; font-weight: 500; line-height: 1.5;
  }

  /* Loading + success body states */
  .npm-busy {
    padding: 36px 26px 32px;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    gap: 14px;
  }
  .npm-busy h3 {
    margin: 0; font-size: 17px; font-weight: 500; letter-spacing: -.005em;
    color: var(--text);
  }
  .npm-busy p {
    margin: 0; font-size: 13px; line-height: 1.55;
    color: var(--text-muted); font-weight: 500; letter-spacing: .015em;
    max-width: 420px;
  }
  .npm-busy-mark {
    width: 56px; height: 56px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--btn-prim) 12%, transparent);
    color: var(--btn-prim);
    border: 1px solid color-mix(in srgb, var(--btn-prim) 24%, transparent);
  }
  .npm-busy-mark.success {
    background: color-mix(in srgb, #22a06b 14%, transparent);
    border-color: color-mix(in srgb, #22a06b 28%, transparent);
    color: #22a06b;
  }
  .npm-spin { animation: npmSpin 1s linear infinite; }
  @keyframes npmSpin { to { transform: rotate(360deg); } }

  .npm-steps {
    margin: 6px 0 0; padding: 0; list-style: none;
    display: flex; flex-direction: column; gap: 6px;
    max-width: 320px;
  }
  .npm-steps li {
    display: grid; grid-template-columns: 22px 1fr; gap: 10px; align-items: center;
    padding: 8px 12px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface-2) 35%, transparent);
    font-size: 12.5px; font-weight: 500; letter-spacing: .015em;
    color: var(--text-muted);
    transition: background .2s, color .2s;
  }
  .npm-steps li.active {
    background: color-mix(in srgb, var(--btn-prim) 10%, transparent);
    color: var(--text);
  }
  .npm-steps li.done { color: var(--text); }
  .npm-step-mark {
    width: 22px; height: 22px; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--card); border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    color: var(--btn-prim);
  }
  .npm-steps li.done .npm-step-mark {
    background: var(--btn-prim);
    border-color: var(--btn-prim);
    color: var(--btn-prim-text);
  }
  .npm-step-dot {
    width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .35;
  }
  .npm-steps li.active .npm-step-dot {
    background: var(--btn-prim); opacity: .85;
    animation: npmDot 1.4s ease-in-out infinite;
  }
  @keyframes npmDot {
    0%, 100% { transform: scale(1); opacity: .55; }
    50%      { transform: scale(1.25); opacity: 1; }
  }

  /* Footer */
  .npm-foot {
    display: flex; align-items: center; justify-content: flex-end;
    gap: 10px;
    padding: 14px 18px 16px;
    border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
    background: color-mix(in srgb, var(--surface) 35%, var(--card));
  }
  .npm-primary, .npm-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    height: 38px; padding: 0 18px;
    border-radius: 8px;
    font: inherit; font-size: 13px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer;
    transition: opacity .12s, transform .12s, background .12s, color .12s, border-color .12s;
  }
  .npm-primary {
    background: var(--btn-prim); color: var(--btn-prim-text); border: 0;
  }
  .npm-primary:hover:not(:disabled) { opacity: .92; }
  .npm-primary:active:not(:disabled) { transform: scale(.97); }
  .npm-primary:disabled { opacity: .45; cursor: not-allowed; }
  .npm-secondary {
    background: transparent; color: var(--text-secondary);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  }
  .npm-secondary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface-2) 55%, transparent);
    color: var(--text);
  }
  .npm-secondary:disabled { opacity: .4; cursor: not-allowed; }

  @media (max-width: 720px) {
    .npm-overlay { padding: 16px; align-items: flex-end; }
    .npm-card {
      width: 100%;
      max-height: calc(100dvh - 24px);
      border-radius: 22px 22px 14px 14px;
    }
    .npm-foot { flex-direction: column; align-items: stretch; }
    .npm-primary, .npm-secondary { justify-content: center; width: 100%; }
  }
`
