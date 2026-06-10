'use client'

/**
 * NewProjectModal — 1:1 nach Figma (Sa43AzpBStYcfRjUruBeHj).
 *
 * Zwei sichtbare Layouts aus dem gleichen State:
 *   • Desktop ≥ 720 px: zentriertes Pop-up, voll­bild-Overlay (Backdrop deckt
 *     auch die Sidebar ab). Titel "Projektname" als Input, Label "Umsetzung"
 *     + Hilfe-Icon, eine Zeile mit 4 Pill-Chips, dann Beschreibungs­feld,
 *     unten Mic + Visualizer + slate-Pill "Mit Tagro fortfahren →".
 *   • Mobile < 720 px: Bottom-Sheet mit animiertem Greeting
 *     "Was möchten Sie / neu umsetzten?" (Mix aus Aeonik Medium / Light) und
 *     Pill (Search + Grid) oben rechts, Drag-Handle, große "Projektname"-
 *     Zeile, "Umsetzung wählen ▼" mit ?-Helper, dann Beschreibung und unten
 *     Mic + breite CTA. Karte animiert von unten ein.
 *
 * Wer "Bestehendem Dev'ler zuweisen" oder "Dev'ler neu einladen" wählt, sieht
 * nach dem Projekt-Anlegen sofort die passende Variante des Assign-Dev-Pop-
 * ups. "Festag Entwickler finden" und "Teamprojekt anlegen" gehen direkt
 * weiter ins Briefing / die App.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import TagroLogo from '@/components/TagroLogo'
import AssignDevModal from '@/components/AssignDevModal'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useMicLevel } from '@/hooks/useMicLevel'
import {
  ArrowRight, ArrowsClockwise, CaretDown, ChatCircleText, Check, DotsNine,
  MagnifyingGlass, Microphone, MicrophoneSlash, PaperPlaneTilt, Question, X,
} from '@phosphor-icons/react'

interface Props {
  onClose: () => void
  onCreated?: (projectId: string) => void
}

type DeliveryModel =
  | 'festag_delivery'
  | 'assign_existing_dev'
  | 'invite_new_dev'
  | 'team_internal'

type DeliveryOption = {
  id: DeliveryModel
  label: string
  meta: string
  tagroAfter: string
  /** Welcher Sub-Flow nach dem Anlegen geöffnet wird, falls vorhanden. */
  postCreate?: 'assign-existing' | 'assign-invite'
}

const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'festag_delivery',
    label: 'Festag Entwickler finden',
    meta: 'Festag sucht einen passenden Entwickler und steuert die Umsetzung.',
    tagroAfter: 'Zusätzlich wird ein passender Festag-Entwickler für die Umsetzung gesucht.',
  },
  {
    id: 'assign_existing_dev',
    label: 'Bestehendem Dev’ler zuweisen',
    meta: 'Bestehenden Entwickler im Workspace einem neuen Projekt zuordnen.',
    tagroAfter: 'Dein Dev’ler bekommt das Projekt direkt in sein Panel.',
    postCreate: 'assign-existing',
  },
  {
    id: 'invite_new_dev',
    label: 'Dev’ler neu einladen',
    meta: 'Neuen Entwickler per E-Mail-Einladung zum Projekt holen.',
    tagroAfter: 'Sobald der Einladungslink eingelöst ist, sieht der Dev das Projekt.',
    postCreate: 'assign-invite',
  },
  {
    id: 'team_internal',
    label: 'Teamprojekt anlegen',
    meta: 'Mitarbeiter, Freelancer oder Partner aus deinem Workspace übernehmen.',
    tagroAfter: 'Die nächsten Schritte werden für das zuständige Team vorbereitet.',
  },
]

const GREETING_PROMPTS = [
  ['Was möchten Sie', 'neu umsetzten?'],
  ['Welche Idee', 'wollen Sie starten?'],
  ['Womit soll', 'Tagro beginnen?'],
  ['Was steht', 'als nächstes an?'],
] as const

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
  const [delivery, setDelivery] = useState<DeliveryModel>('festag_delivery')
  const [deliveryPickerOpen, setDeliveryPickerOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatComplete, setChatComplete] = useState(false)
  const [tagroTitle, setTagroTitle] = useState<string | null>(null)
  const [tagroSummary, setTagroSummary] = useState<string | null>(null)

  const [phase, setPhase] = useState<Phase>('form')
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState('')

  // Mobile detection — listened to live so resize updates the layout.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  // Animated greeting (mobile only) — rotates every 4.5 s.
  const [greetingIndex, setGreetingIndex] = useState(0)
  useEffect(() => {
    if (!isMobile) return
    const t = window.setInterval(() => {
      setGreetingIndex(i => (i + 1) % GREETING_PROMPTS.length)
    }, 4500)
    return () => window.clearInterval(t)
  }, [isMobile])

  // After-create sub-flow (Assign / Invite).
  const [postFlow, setPostFlow] = useState<null | { kind: 'assign-existing' | 'assign-invite'; projectId: string; projectTitle: string }>(null)

  const titleRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const chatBodyRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const deliveryRef = useRef<HTMLDivElement>(null)
  const micBtnRef = useRef<HTMLButtonElement>(null)
  const primaryBtnRef = useRef<HTMLButtonElement>(null)

  // HARD-FORCE: setze border-radius mit !important direkt am DOM-Knoten,
  // damit keinerlei globale CSS-Regel die Pill-Form zerstören kann.
  useEffect(() => {
    const apply = () => {
      micBtnRef.current?.style.setProperty('border-radius', '999px', 'important')
      primaryBtnRef.current?.style.setProperty('border-radius', '999px', 'important')
      primaryBtnRef.current?.style.setProperty('font-weight', '400', 'important')
    }
    apply()
    const t = window.setTimeout(apply, 50)
    return () => window.clearTimeout(t)
  })

  // Mount state for SSR-safe portal — declared early so the focus effect can depend on it.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    const t = window.setTimeout(() => titleRef.current?.focus(), 30)
    return () => window.clearTimeout(t)
  }, [mounted])

  // ESC closes — but never mid-loading so a half-finished submit can't be lost.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'loading') {
        if (deliveryPickerOpen) { setDeliveryPickerOpen(false); return }
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, phase, deliveryPickerOpen])

  // Click outside delivery picker (mobile dropdown) closes it.
  useEffect(() => {
    if (!deliveryPickerOpen) return
    const onClick = (e: MouseEvent) => {
      if (!deliveryRef.current?.contains(e.target as Node)) setDeliveryPickerOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [deliveryPickerOpen])

  useEffect(() => {
    const el = descRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(360, Math.max(140, el.scrollHeight)) + 'px'
  }, [description])

  useEffect(() => {
    if (phase !== 'chat') return
    chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatHistory, chatLoading, phase])

  useEffect(() => {
    if (phase !== 'chat') return
    const t = window.setTimeout(() => chatInputRef.current?.focus(), 80)
    return () => window.clearTimeout(t)
  }, [phase])

  // Body scroll-lock with scrollbar-gutter compensation.
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

  useEffect(() => {
    if (phase !== 'loading') return
    setLoadingStep(0)
    const ticks = [350, 900, 1500]
    const timers = ticks.map((t, i) => setTimeout(() => setLoadingStep(i + 1), t))
    return () => { timers.forEach(clearTimeout) }
  }, [phase])

  // Voice dictation — schreibt in das Feld, das den letzten Fokus hatte
  // (Projektname / Beschreibung / Chat-Input).
  type DictationTarget = 'title' | 'desc' | 'chat'
  const dictationTargetRef = useRef<null | DictationTarget>(null)
  const dictationBaseRef = useRef('')
  const lastFocusedRef = useRef<DictationTarget>('title')
  const [dictating, setDictating] = useState<null | DictationTarget>(null)
  const { supported: micSupported, listening: micListening, start: startMic, stop: stopMic } = useSpeechRecognition({
    lang: 'de-DE',
    onResult: (text, isFinal) => {
      const target = dictationTargetRef.current
      if (!target) return
      const base = dictationBaseRef.current
      const combined = (base ? base + ' ' : '') + text
      if (target === 'title') setTitle(combined)
      else if (target === 'desc') setDescription(combined)
      else setChatInput(combined)
      if (isFinal) dictationBaseRef.current = combined
    },
    onError: () => setDictating(null),
  })
  useEffect(() => {
    if (!micListening) { setDictating(null); dictationTargetRef.current = null }
  }, [micListening])

  function toggleDictation(explicitTarget?: DictationTarget) {
    if (!micSupported) return
    if (micListening || dictating) {
      stopMic(); setDictating(null); dictationTargetRef.current = null
      return
    }
    const target: DictationTarget = explicitTarget ?? lastFocusedRef.current ?? 'desc'
    dictationTargetRef.current = target
    const baseValue =
      target === 'title' ? title :
      target === 'desc' ? description :
      chatInput
    dictationBaseRef.current = baseValue.trim()
    setDictating(target)
    startMic()
    // Fokus auf das Zielfeld setzen, damit visuell klar ist wohin geschrieben wird.
    setTimeout(() => {
      if (target === 'title') titleRef.current?.focus()
      else if (target === 'desc') descRef.current?.focus()
      else chatInputRef.current?.focus()
    }, 0)
  }

  const selectedDelivery = DELIVERY_OPTIONS.find(d => d.id === delivery) ?? DELIVERY_OPTIONS[0]
  const titleDraft = title.trim()
  const descriptionDraft = description.trim()
  // Erste Aktion: "Mit Tagro fortfahren" — auch ohne Eingabe erlaubt, weil Tagro
  // dann selbst Vorschläge macht (siehe Docs).
  const canSubmit = true
  const canCreate = canSubmit || chatHistory.some(turn => turn.role === 'user' && turn.text.trim().length >= 2)

  function suggestedTitle() {
    const source = tagroTitle || title.trim() || description.trim()
    return source.split(/\s+/).slice(0, 6).join(' ').replace(/[.,;:!?]+$/, '') || 'Neues Projekt'
  }

  function buildInitialChatHistory(): ChatTurn[] {
    const parts = [
      titleDraft ? `Projektname: ${titleDraft}` : '',
      descriptionDraft || '(keine Beschreibung — Tagro soll vorschlagen)',
      `Umsetzung: ${selectedDelivery.label}`,
    ].filter(Boolean)
    return [{ role: 'user', text: parts.join('\n\n') }]
  }

  async function askTagro(history: ChatTurn[]) {
    setChatLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/intake-step', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    if (phase === 'loading') return
    const initialHistory = buildInitialChatHistory()
    setChatHistory(initialHistory)
    setPhase('chat')
    await askTagro(initialHistory)
  }

  // „Manuell anlegen" — Projekt direkt mit den eingegebenen Werten anlegen,
  // Tagro-Chat überspringen. Danach abhängig vom Umsetzungs-Pill weiter:
  // assign_existing_dev / invite_new_dev → AssignDevModal öffnen.
  // festag_delivery / team_internal     → Modal schließen, weiter zum Projekt.
  async function manualCreate() {
    if (phase === 'loading') return
    setError('')
    setPhase('loading')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('Bitte melde dich erneut an.')
      const fallbackTitle = title.trim() || 'Neues Projekt'
      const { data: created, error: insErr } = await (supabase as any)
        .from('projects')
        .insert({
          user_id: userId,
          title: fallbackTitle,
          description: description.trim().slice(0, 1200) || null,
          status: 'planning',
        })
        .select('id').single()
      if (insErr || !created?.id) throw new Error(insErr?.message || 'Projekt konnte nicht angelegt werden.')
      const projectId = created.id as string

      try {
        await (supabase as any).from('projects').update({ delivery_model: delivery }).eq('id', projectId)
      } catch {}

      setPhase('success')
      const next = selectedDelivery.postCreate
      if (next) {
        setTimeout(() => {
          setPostFlow({ kind: next, projectId, projectTitle: fallbackTitle })
        }, 200)
      } else {
        setTimeout(() => onCreated?.(projectId), 500)
      }
    } catch (e: any) {
      setError(e?.message || 'Projekt konnte nicht angelegt werden.')
      setPhase('form')
    }
  }

  async function sendChatMessage() {
    const text = chatInput.trim()
    if (!text || chatLoading || phase !== 'chat') return
    const nextHistory = [...chatHistory, { role: 'user' as const, text }]
    setChatInput('')
    setChatHistory(nextHistory)
    await askTagro(nextHistory)
  }

  async function createProject() {
    if (phase === 'loading') return
    setError('')
    setPhase('loading')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('Bitte melde dich erneut an.')
      const finalHistory = chatHistory.length ? chatHistory : buildInitialChatHistory()
      const decomposerHistory = finalHistory.map(turn => ({
        role: turn.role === 'tagro' ? 'ai' : 'user', text: turn.text,
      }))
      let projectId: string | undefined
      try {
        const res = await fetch('/api/ai/decompose', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatHistory: decomposerHistory, userId }),
        })
        const data = await res.json().catch(() => null)
        if (res.ok && typeof data?.projectId === 'string') projectId = data.projectId
      } catch { /* fall through */ }

      if (!projectId) {
        const { data: created, error: insErr } = await (supabase as any)
          .from('projects')
          .insert({
            user_id: userId,
            title: suggestedTitle(),
            description: (tagroSummary || description.trim() || titleDraft).slice(0, 1200) || null,
            status: 'planning',
          })
          .select('id').single()
        if (insErr || !created?.id) throw new Error(insErr?.message || 'Projekt konnte nicht angelegt werden.')
        projectId = created.id as string
      }

      const patch: Record<string, unknown> = {
        title: suggestedTitle(),
        scope_summary: (tagroSummary || description.trim()).slice(0, 1200),
        status: 'planning',
      }
      try { (patch as any).delivery_model = delivery } catch {}
      await (supabase as any).from('projects').update(patch).eq('id', projectId)

      fetch('/api/projects/classify', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), projectId }),
      }).catch(() => {})

      setPhase('success')
      const next = selectedDelivery.postCreate
      if (next) {
        // Direkt in den Assign-Dev-Sub-Flow wechseln, wie in Figma gezeigt.
        setTimeout(() => {
          setPostFlow({ kind: next, projectId: projectId!, projectTitle: suggestedTitle() })
        }, 350)
      } else {
        setTimeout(() => onCreated?.(projectId!), 700)
      }
    } catch (e: any) {
      setError(e?.message || 'Projekt konnte nicht angelegt werden.')
      setPhase(chatHistory.length ? 'chat' : 'error')
    }
  }

  // Greeting tokens.
  const greeting = GREETING_PROMPTS[greetingIndex]

  if (!mounted) return null

  const tree = (
    <>
      <div className={`npm-overlay${isMobile ? ' is-mobile' : ''}`} role="dialog" aria-modal="true" aria-label="Neues Projekt">
        <style>{CSS}</style>
        <div
          className="npm-backdrop"
          onMouseDown={e => {
            if (phase === 'loading') return
            if (e.target === e.currentTarget) onClose()
          }}
          aria-hidden
        />

        {/* Mobile greeting bar lives ABOVE the sheet so it animates separately. */}
        {isMobile && phase === 'form' && (
          <div className="npm-greeting" aria-hidden>
            <div className="npm-greeting-text" key={greetingIndex}>
              <span className="primary">{greeting[0]}</span>{' '}
              <span className="muted">{greeting[1]}</span>
            </div>
            <div className="npm-greeting-pill">
              <button type="button" aria-label="Suchen"><MagnifyingGlass size={14} weight="regular" /></button>
              <button type="button" aria-label="Mehr"><DotsNine size={14} weight="regular" /></button>
            </div>
          </div>
        )}

        <div
          className={`npm-card${phase === 'chat' ? ' is-chat' : ''}${isMobile ? ' is-sheet' : ''}`}
          role="document"
          onMouseDown={e => e.stopPropagation()}
        >
          {isMobile && <div className="npm-drag-handle" aria-hidden />}

          {!isMobile && (
            <header className="npm-head">
              <input
                ref={titleRef}
                className="npm-title-input"
                placeholder="Projektname"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onFocus={() => { lastFocusedRef.current = 'title' }}
                maxLength={120}
                disabled={phase === 'chat' || phase === 'loading'}
              />
              <button
                type="button" className="npm-icon-btn"
                onClick={onClose}
                disabled={phase === 'loading'}
                aria-label="Schließen"
              >
                <X size={16} />
              </button>
            </header>
          )}

          {isMobile && phase === 'form' && (
            <div className="npm-mobile-title">
              <input
                ref={titleRef}
                className="npm-title-input mobile"
                placeholder="Projektname"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onFocus={() => { lastFocusedRef.current = 'title' }}
                maxLength={120}
              />
            </div>
          )}

          {(phase === 'form' || phase === 'error') && (
            <div className="npm-body">
              {!isMobile && (
                <section className="npm-section delivery">
                  <div className="npm-delivery-label">
                    <span>Umsetzung</span>
                    <button type="button" className="npm-help" aria-label="Was bedeutet das?" title="Wie soll dein Projekt umgesetzt werden?">
                      <Question size={11} weight="regular" />
                    </button>
                  </div>
                  <div className="npm-delivery-pills" role="radiogroup" aria-label="Umsetzungsart">
                    {DELIVERY_OPTIONS.map(opt => (
                      <button
                        key={opt.id} type="button" role="radio"
                        aria-checked={delivery === opt.id}
                        className={`npm-pill${delivery === opt.id ? ' on' : ''}`}
                        onClick={() => setDelivery(opt.id)}
                        title={opt.meta}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {isMobile && (
                <section className="npm-section delivery mobile" ref={deliveryRef}>
                  <button
                    type="button"
                    className={`npm-pill dropdown${deliveryPickerOpen ? ' on' : ''}`}
                    onClick={() => setDeliveryPickerOpen(o => !o)}
                    aria-haspopup="listbox" aria-expanded={deliveryPickerOpen}
                  >
                    <span>{selectedDelivery.id === 'festag_delivery' ? 'Umsetzung wählen' : selectedDelivery.label}</span>
                    <CaretDown size={11} weight="regular" />
                  </button>
                  <button
                    type="button" className="npm-help"
                    aria-label="Was bedeutet Umsetzung?" title="Wie soll dein Projekt umgesetzt werden?"
                  >
                    <Question size={11} weight="regular" />
                  </button>

                  {deliveryPickerOpen && (
                    <ul className="npm-delivery-menu" role="listbox" aria-label="Umsetzungsart">
                      {DELIVERY_OPTIONS.map(opt => (
                        <li key={opt.id}>
                          <button
                            type="button" role="option" aria-selected={delivery === opt.id}
                            className={delivery === opt.id ? 'on' : ''}
                            onClick={() => { setDelivery(opt.id); setDeliveryPickerOpen(false) }}
                          >
                            <span className="lbl">{opt.label}</span>
                            <span className="meta">{opt.meta}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              <section className="npm-section description">
                <textarea
                  ref={descRef}
                  className="npm-textarea"
                  placeholder="Schreibe oder sprich eine Beschreibung, Projektbriefing, sammle Ideen oder lass Tagro entscheiden was erstellt wird. Du kannst das Feld auch leer lassen und Tagro bestimmt es."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onFocus={() => { lastFocusedRef.current = 'desc' }}
                  rows={5}
                  maxLength={2000}
                />
              </section>

              {error && <p className="npm-error" role="alert">{error}</p>}
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
                    <div className="npm-chat-bubble"><p>{turn.text}</p></div>
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
                    onFocus={() => { lastFocusedRef.current = 'chat' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault(); sendChatMessage()
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
              <div className="npm-busy-mark"><ArrowsClockwise size={20} className="npm-spin" /></div>
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

          {phase === 'success' && !postFlow && (
            <div className="npm-busy success">
              <div className="npm-busy-mark success"><Check size={20} weight="bold" /></div>
              <h3>Projekt angelegt</h3>
              <p>{selectedDelivery.tagroAfter}</p>
            </div>
          )}

          {phase !== 'success' && phase !== 'loading' && (
            <footer className="npm-foot">
              <div className="npm-foot-left">
                {micSupported && (
                  <button
                    ref={micBtnRef}
                    type="button"
                    className={`npm-mic-btn${dictating ? ' rec' : ''}`}
                    onClick={() => toggleDictation()}
                    aria-pressed={!!dictating}
                    aria-label={dictating ? 'Aufnahme stoppen' : 'Per Sprache diktieren'}
                    title={dictating ? 'Aufnahme stoppen — schreibt ins fokussierte Feld' : 'Per Sprache diktieren — geht ins fokussierte Feld'}
                  >
                    {dictating ? <MicrophoneSlash size={20} weight="fill" /> : <Microphone size={20} weight="light" />}
                  </button>
                )}
                <Visualizer active={!!dictating} />
              </div>
              <div className="npm-foot-right">
                {phase !== 'chat' && (
                  <button
                    type="button"
                    className="npm-secondary"
                    onClick={manualCreate}
                  >
                    Manuell anlegen
                  </button>
                )}
                <button
                  ref={primaryBtnRef}
                  type="button"
                  className="npm-primary"
                  onClick={phase === 'chat' ? createProject : openTagroChat}
                  disabled={phase === 'chat' ? (!canCreate || chatLoading) : !canSubmit}
                  aria-busy={phase === 'chat' ? chatLoading : undefined}
                >
                  <span>Mit Tagro fortfahren</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </footer>
          )}
        </div>
      </div>

      {postFlow && (
        <AssignDevModal
          open
          projectId={postFlow.projectId}
          projectTitle={postFlow.projectTitle}
          mode={postFlow.kind === 'assign-existing' ? 'existing' : 'invite'}
          onClose={() => {
            const id = postFlow.projectId
            setPostFlow(null)
            onCreated?.(id)
          }}
        />
      )}
    </>
  )

  return createPortal(tree, document.body)
}

function Visualizer({ active }: { active: boolean }) {
  const levels = useMicLevel(active, 15)
  return (
    <span className={`npm-visualizer${active ? ' is-rec' : ''}`} aria-hidden>
      {levels.map((v, i) => {
        const h = active ? Math.max(0.08, Math.min(1, v * 1.6)) : 0
        return (
          <i
            key={i}
            style={{
              transform: `scaleY(${h})`,
              opacity: active ? 0.4 + h * 0.6 : 0,
            }}
          />
        )
      })}
    </span>
  )
}

const CSS = `
  /* ============================================================
     Festag NewProjectModal — 1:1 Figma (node 178:5)
     Tokens direkt aus Figma, KEINE Theme-Variablen verwenden:
       Card BG  #FFFFFF        Radius 24px        Padding 32px
       Title    #ADB3BD  35px  Aeonik Regular
       Label    #CBCFD6  15px  Aeonik Regular
       Pill BG  #F3F5F7        Text #848D9B 10px  Radius 32px  H 25px
       Desc     #ADB3BD  18px  LH 30px
       CTA      rgba(91,100,125,.9)  Text #FFFFFF 12px  Tracking .24px
                Radius 32px  Shadow 0 8 24 rgba(200,169,91,.14)
       Visu.   #CACFD4  2×15  Gap 10
     Overlay rendert via createPortal AUF document.body → deckt Sidebar.
     ============================================================ */
  .npm-overlay {
    position: fixed; inset: 0; z-index: 2147483600;
    display: flex; align-items: center; justify-content: center;
    padding: 32px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    animation: npmFade .18s ease both;
  }
  .npm-overlay.is-mobile { padding: 0; align-items: flex-end; }
  .npm-backdrop {
    position: absolute; inset: 0;
    background: rgba(15,18,24,.58);
    backdrop-filter: blur(12px) saturate(115%);
    -webkit-backdrop-filter: blur(12px) saturate(115%);
  }
  @keyframes npmFade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes npmPop  { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: none; } }
  @keyframes npmSheet { from { transform: translateY(100%); } to { transform: none; } }

  .npm-card {
    position: relative; z-index: 1;
    width: min(900px, calc(100vw - 64px));
    min-height: 720px;
    max-height: calc(100dvh - 64px);
    background: #FFFFFF;
    border-radius: 24px;
    padding: 40px 32px 32px;
    box-sizing: border-box;
    overflow: hidden !important;
    box-shadow:
      0 1px 2px rgba(15,23,42,.06),
      0 40px 96px -28px rgba(15,23,42,.45);
    display: flex; flex-direction: column;
    overflow: hidden;
    animation: npmPop .26s cubic-bezier(.16,1,.3,1) both;
  }
  .npm-card.is-sheet {
    width: 100%;
    max-width: 100%;
    min-height: 0;
    max-height: calc(100dvh - 88px);
    padding: 0;
    border-radius: 28px 28px 0 0;
    animation: npmSheet .36s cubic-bezier(.16,1,.3,1) both;
  }
  [data-theme="dark"] .npm-card,
  [data-theme="classic-dark"] .npm-card {
    /* Figma frame is pure white; im Dark-Theme bleibt das Modal hell, weil
       das Layout-Mock auf Light-BG ausgelegt ist. Konsistenz schlägt Theme. */
    background: #FFFFFF;
    box-shadow:
      0 1px 2px rgba(0,0,0,.5),
      0 40px 96px -30px rgba(0,0,0,.7);
  }

  /* ---- Mobile greeting (above sheet) ---- */
  .npm-greeting {
    position: absolute; inset: 0 0 auto 0;
    z-index: 2;
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 28px 20px 0;
    pointer-events: none;
  }
  .npm-greeting-text {
    font-size: 22px;
    line-height: 1.25;
    font-weight: 500;
    letter-spacing: -.005em;
    animation: npmGreetIn .55s cubic-bezier(.16,1,.3,1) both;
  }
  .npm-greeting-text .primary { color: var(--text); }
  .npm-greeting-text .muted   { color: var(--text-muted); opacity: .55; }
  @keyframes npmGreetIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: none; }
  }
  .npm-greeting-pill {
    pointer-events: auto;
    display: inline-flex; align-items: center; gap: 4px;
    padding: 5px;
    background: var(--card);
    border-radius: 999px;
    box-shadow: 0 1px 2px rgba(15,23,42,.06), 0 8px 24px -10px rgba(15,23,42,.18);
  }
  .npm-greeting-pill button {
    width: 28px; height: 28px;
    border: 0; background: transparent; color: var(--text-secondary);
    border-radius: 999px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .npm-greeting-pill button:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--surface-2) 65%, transparent);
  }

  .npm-drag-handle {
    width: 36px; height: 4px;
    background: color-mix(in srgb, var(--text-muted) 32%, transparent);
    border-radius: 999px;
    margin: 10px auto 0;
    flex-shrink: 0;
  }

  /* ---- Desktop header (title input + close) ---- */
  .npm-head {
    display: flex; align-items: flex-start; gap: 16px;
    padding: 0 0 4px;
  }
  .npm-title-input {
    flex: 1; min-width: 0;
    background: transparent; border: 0; outline: 0;
    color: #2A3032; font: inherit;
    font-size: 35px; line-height: 1.1;
    font-weight: 400; letter-spacing: -.01em;
    padding: 4px 0;
    caret-color: #5B647D;
  }
  .npm-title-input::placeholder {
    color: #ADB3BD; opacity: 1;
  }
  .npm-title-input:disabled { opacity: .7; }

  .npm-icon-btn {
    width: 36px; height: 36px; border: 0; background: transparent;
    color: #ADB3BD; border-radius: 999px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .14s, opacity .12s;
    flex-shrink: 0;
    margin-top: -6px;
    opacity: .85;
  }
  .npm-icon-btn svg { width: 20px; height: 20px; }
  .npm-icon-btn:hover:not(:disabled) { opacity: 1; background: #F1F3F6; color: #5B647D; }
  .npm-icon-btn:disabled { opacity: .35; cursor: not-allowed; }

  /* ---- Mobile title row ---- */
  .npm-mobile-title {
    padding: 22px 22px 0;
  }
  .npm-title-input.mobile {
    font-size: 26px;
  }

  /* ---- Body ---- */
  .npm-body {
    padding: 30px 0 0;
    overflow: hidden !important;
    display: flex; flex-direction: column; gap: 28px;
    flex: 1;
    min-height: 0;
  }
  .npm-card.is-sheet .npm-body {
    padding: 12px 22px 18px;
    gap: 14px;
  }

  /* ---- Delivery (desktop pills row) ---- */
  .npm-section.delivery {
    display: flex; flex-direction: column; gap: 12px;
  }
  .npm-delivery-label {
    display: inline-flex; align-items: center; gap: 8px;
    color: #848D9B;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 15px; font-weight: 400; letter-spacing: 0;
  }
  .npm-help {
    width: 18px; height: 18px;
    border-radius: 999px; border: 1px solid #E7EBF0;
    background: #FFFFFF;
    color: #848D9B;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
    transition: background .12s, color .12s, border-color .12s, transform .12s;
  }
  .npm-help svg { width: 11px; height: 11px; }
  .npm-help:hover {
    background: #F3F5F7; color: #2A3032; border-color: #CBCFD6;
    transform: translateY(-.5px);
  }

  .npm-delivery-pills {
    display: flex; flex-wrap: nowrap; gap: 10px;
    width: 100%;
  }
  .npm-pill {
    flex: 0 0 auto;
    height: 36px;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 0 24px;
    border-radius: 999px;
    border: 0;
    background: #F3F5F7;
    color: #848D9B;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 12.5px; font-weight: 500; letter-spacing: 0;
    white-space: nowrap;
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .npm-pill:focus { outline: none; }
  .npm-pill:focus-visible { outline: 2px solid #5B647D; outline-offset: 2px; }
  .npm-pill:hover {
    color: #2A3032;
    background: #E7EBF0;
  }
  .npm-pill.on {
    color: #FFFFFF;
    background: #5B647D;
  }

  /* ---- Delivery (mobile dropdown pill) ---- */
  .npm-section.delivery.mobile {
    position: relative;
    flex-direction: row; align-items: center; gap: 7px;
  }
  .npm-pill.dropdown {
    height: 30px;
    background: color-mix(in srgb, var(--surface-2) 55%, transparent);
    color: var(--text-secondary);
    padding: 0 12px;
  }
  .npm-pill.dropdown.on {
    background: color-mix(in srgb, var(--surface-2) 88%, transparent);
    color: var(--text);
  }
  .npm-delivery-menu {
    position: absolute; top: calc(100% + 6px); left: 0;
    z-index: 5;
    min-width: 260px;
    margin: 0; padding: 6px; list-style: none;
    background: var(--card);
    border-radius: 14px;
    box-shadow: 0 1px 2px rgba(15,23,42,.06), 0 24px 60px -20px rgba(15,23,42,.35);
  }
  .npm-delivery-menu li button {
    width: 100%;
    display: flex; flex-direction: column; gap: 2px;
    padding: 9px 11px;
    border: 0; background: transparent; border-radius: 10px;
    text-align: left; cursor: pointer;
    color: var(--text);
    font: inherit;
    transition: background .12s;
  }
  .npm-delivery-menu li button .lbl {
    font-size: 13px; font-weight: 500;
  }
  .npm-delivery-menu li button .meta {
    font-size: 11.5px; line-height: 1.4; color: var(--text-muted);
  }
  .npm-delivery-menu li button:hover,
  .npm-delivery-menu li button.on {
    background: color-mix(in srgb, var(--surface-2) 65%, transparent);
  }

  /* ---- Description textarea (borderless) ---- */
  .npm-section.description { min-height: 180px; flex: 1; }
  .npm-textarea {
    width: 100%;
    background: transparent; border: 0; outline: 0; resize: none;
    color: #2A3032; font: inherit;
    font-size: 18px; line-height: 30px; font-weight: 400; letter-spacing: 0;
    min-height: 180px; max-height: 360px;
    padding: 0;
  }
  .npm-card.is-sheet .npm-textarea {
    font-size: 15.5px;
    line-height: 1.6;
    min-height: 160px;
  }
  .npm-textarea::placeholder { color: #ADB3BD; opacity: 1; }

  /* ---- Error inline ---- */
  .npm-error {
    margin: 0; padding: 10px 14px;
    background: color-mix(in srgb, #ef4444 10%, transparent);
    color: #d44b4b;
    border-radius: 12px;
    font-size: 12.5px; font-weight: 500; line-height: 1.5;
  }
  .npm-error.in-chat { margin: 0 22px 10px; }

  /* ---- Footer (mic + CTA) ---- */
  .npm-foot {
    display: flex; align-items: center; justify-content: space-between;
    gap: 14px;
    padding: 24px 0 0;
  }
  .npm-card.is-sheet .npm-foot { padding: 14px 18px 18px; }
  .npm-foot-left {
    display: inline-flex; align-items: center; gap: 18px;
    min-width: 0; flex: 1;
  }
  .npm-mic-btn {
    position: relative;
    width: 52px; height: 52px;
    border: 0;
    border-radius: 999px;
    background: #FFFFFF;
    color: #ADB3BD;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: transform .12s, box-shadow .18s, color .14s;
    flex-shrink: 0;
    box-shadow:
      0 0 0 1px rgba(15,23,42,.04),
      0 2px 4px rgba(15,23,42,.04),
      0 10px 24px -8px rgba(15,23,42,.14),
      0 22px 36px -16px rgba(15,23,42,.16);
  }
  .npm-mic-btn:hover { transform: translateY(-1px); color: #5B647D; }
  .npm-mic-btn:active { transform: translateY(0); }
  .npm-mic-btn.rec {
    background: #FFFFFF;
    color: #5B647D;
  }
  .npm-mic-btn.rec::after {
    content: "";
    position: absolute; top: 6px; right: 6px;
    width: 8px; height: 8px; border-radius: 999px;
    background: #E5484D;
    box-shadow:
      0 0 0 2px #FFFFFF,
      0 0 8px rgba(229,72,77,.55);
    animation: npmRecDot 1.1s ease-in-out infinite;
  }
  @keyframes npmRecDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: .45; transform: scale(.85); }
  }
  @keyframes npmRecPulse {
    0%, 100% { opacity: 1; } 50% { opacity: .72; }
  }
  .npm-visualizer {
    display: inline-flex; align-items: center; gap: 10px; height: 22px;
    mask-image: linear-gradient(to right, #000 0%, #000 65%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, #000 0%, #000 65%, transparent 100%);
  }
  .npm-visualizer i {
    width: 2px; height: 22px;
    background: #5B647D;
    border-radius: 12px;
    transform-origin: center;
    transform: scaleY(0);
    opacity: 0;
    transition: transform 90ms linear, opacity 120ms linear;
  }

  .npm-foot-right {
    display: inline-flex; align-items: center; gap: 10px;
  }
  .npm-secondary {
    display: inline-flex; align-items: center; justify-content: center;
    height: 47px; padding: 0 22px;
    border: 0.7px solid #E7EBF0;
    border-radius: 999px !important;
    background: #FFFFFF; color: #202532;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 14px; font-weight: 400; letter-spacing: .14px;
    box-shadow: 0 1px 2px rgba(15,23,42,.03);
    cursor: pointer;
    transition: background .14s, border-color .14s, transform .12s;
  }
  .npm-secondary:hover:not(:disabled) {
    background: #F7F8FB; border-color: #DCE1EA;
  }
  .npm-secondary:active:not(:disabled) { transform: scale(.985); }
  .npm-secondary:disabled { opacity: .4; cursor: not-allowed; }

  .npm-primary {
    display: inline-flex; align-items: center; gap: 12px;
    height: 47px; padding: 0 28px;
    border: 0; border-radius: 999px;
    background: #5B647D !important; color: #FFFFFF !important;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
    font-size: 14px !important; font-weight: 400 !important;
    letter-spacing: .24px;
    cursor: pointer;
    box-shadow:
      0 0 0 1px rgba(91,100,125,.08),
      0 12px 28px -10px rgba(91,100,125,.45);
    transition: background .12s, transform .12s;
  }
  .npm-primary:hover:not(:disabled) { background: #4E576E !important; }
  .npm-primary:active:not(:disabled) { transform: scale(.97); }
  .npm-primary:disabled { opacity: .45; cursor: not-allowed; }

  .npm-card.is-sheet .npm-primary {
    flex: 1; justify-content: center;
    height: 48px;
    font-size: 14px;
  }

  /* ---- Chat phase (mostly unchanged) ---- */
  .npm-card.is-chat {
    width: min(820px, calc(100vw - 32px));
    min-height: min(720px, calc(100dvh - 64px));
  }
  .npm-chat {
    flex: 1; min-height: 0;
    display: flex; flex-direction: column;
    background: color-mix(in srgb, var(--surface) 38%, var(--card));
  }
  .npm-chat-main {
    flex: 1; min-height: 0; overflow-y: auto;
    padding: 26px 30px;
    display: flex; flex-direction: column; gap: 16px;
  }
  .npm-chat-row { display: flex; align-items: flex-start; gap: 11px; }
  .npm-chat-row.user { justify-content: flex-end; }
  .npm-chat-avatar {
    width: 28px; height: 28px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
    flex-shrink: 0;
  }
  .npm-chat-bubble {
    max-width: min(620px, 82%);
    padding: 11px 14px;
    border-radius: 16px;
    background: color-mix(in srgb, var(--surface-2) 62%, transparent);
    color: var(--text);
    font-size: 13.5px; line-height: 1.5;
    font-weight: 500; letter-spacing: 0;
    white-space: pre-wrap;
  }
  .npm-chat-row.user .npm-chat-bubble {
    background: var(--btn-prim); color: var(--btn-prim-text);
    border-bottom-right-radius: 6px;
  }
  .npm-chat-row.tagro .npm-chat-bubble { border-bottom-left-radius: 6px; }
  .npm-chat-bubble p { margin: 0; }
  .npm-chat-bubble.muted { width: 60px; padding: 12px 14px; }
  .npm-typing { display: inline-flex; gap: 4px; }
  .npm-typing span {
    width: 5px; height: 5px; border-radius: 999px;
    background: currentColor; opacity: .42;
    animation: npmTyping 1.1s ease-in-out infinite;
  }
  .npm-typing span:nth-child(2) { animation-delay: .14s; }
  .npm-typing span:nth-child(3) { animation-delay: .28s; }
  @keyframes npmTyping {
    0%, 100% { transform: translateY(0); opacity: .35; }
    50% { transform: translateY(-3px); opacity: .9; }
  }
  .npm-chat-composer {
    padding: 12px 18px 16px;
    background: color-mix(in srgb, var(--card) 92%, transparent);
  }
  .npm-chat-ready {
    display: inline-flex; align-items: center; gap: 7px;
    margin: 0 0 8px;
    color: #22a06b; font-size: 12.5px; font-weight: 500;
  }
  .npm-chat-input {
    min-height: 44px;
    display: grid; grid-template-columns: 22px minmax(0, 1fr) auto;
    align-items: end; gap: 8px;
    padding: 6px 6px 6px 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
    background: color-mix(in srgb, var(--surface) 68%, var(--card));
  }
  .npm-chat-actions { display: inline-flex; align-items: center; gap: 6px; align-self: end; }
  .npm-chat-mic {
    width: 34px; height: 34px; border: 0; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
    color: var(--text-secondary); cursor: pointer;
    transition: background .12s, color .12s;
  }
  .npm-chat-mic:hover:not(:disabled) {
    color: var(--text);
    background: color-mix(in srgb, var(--surface-2) 100%, transparent);
  }
  .npm-chat-mic.rec {
    background: color-mix(in srgb, #5B647D 22%, transparent);
    color: #F4F4F4;
    animation: npmRecPulse 1.4s ease-in-out infinite;
  }
  .npm-chat-input > svg { align-self: center; color: var(--text-muted); }
  .npm-chat-input textarea {
    width: 100%;
    min-height: 32px; max-height: 150px;
    resize: none; border: 0; outline: 0;
    background: transparent; color: var(--text);
    font: inherit; font-size: 14px; line-height: 1.5;
    padding: 6px 0;
  }
  .npm-chat-input button {
    width: 34px; height: 34px;
    border: 0; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--btn-prim); color: var(--btn-prim-text); cursor: pointer;
  }
  .npm-chat-input button:disabled { opacity: .42; cursor: default; }

  /* ---- Loading + success states ---- */
  .npm-busy {
    padding: 40px 26px 36px;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    gap: 14px;
  }
  .npm-busy h3 {
    margin: 0; font-size: 17px; font-weight: 500; letter-spacing: -.005em;
    color: var(--text);
  }
  .npm-busy p {
    margin: 0; font-size: 13px; line-height: 1.55;
    color: var(--text-muted); font-weight: 500; letter-spacing: 0;
    max-width: 420px;
  }
  .npm-busy-mark {
    width: 56px; height: 56px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--btn-prim) 12%, transparent);
    color: var(--btn-prim);
  }
  .npm-busy-mark.success {
    background: color-mix(in srgb, #22a06b 14%, transparent);
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
    font-size: 12.5px; font-weight: 500; letter-spacing: 0;
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
    background: var(--card);
    color: var(--btn-prim);
  }
  .npm-steps li.done .npm-step-mark {
    background: var(--btn-prim); color: var(--btn-prim-text);
  }
  .npm-step-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .35; }
  .npm-steps li.active .npm-step-dot {
    background: var(--btn-prim); opacity: .85;
    animation: npmDot 1.4s ease-in-out infinite;
  }
  @keyframes npmDot {
    0%, 100% { transform: scale(1); opacity: .55; }
    50% { transform: scale(1.25); opacity: 1; }
  }
`
