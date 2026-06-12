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
import { motion, useDragControls, type PanInfo } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import TagroLogo from '@/components/TagroLogo'
import AssignDevModal, { type AssignDraftPayload } from '@/components/AssignDevModal'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useMicLevel } from '@/hooks/useMicLevel'
import {
  ArrowRight, ArrowsClockwise, CaretDown, ChatCircleText, Check, DotsNine,
  MagnifyingGlass, Microphone, MicrophoneSlash, PaperPlaneTilt, Question, Sparkle, X,
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
  postCreate?: 'assign-existing' | 'assign-invite' | 'assign-team' | 'assign-festag'
}

const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'festag_delivery',
    label: 'Festag Entwickler finden',
    meta: 'Festag sucht einen passenden Entwickler und steuert die Umsetzung.',
    tagroAfter: 'Zusätzlich wird ein passender Festag-Entwickler für die Umsetzung gesucht.',
    postCreate: 'assign-festag',
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
    label: 'Dev-Team-Projekt',
    meta: 'Mitarbeiter, Freelancer oder Partner aus deinem Workspace übernehmen.',
    tagroAfter: 'Die nächsten Schritte werden für das zuständige Team vorbereitet.',
    postCreate: 'assign-team',
  },
]

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

  // After-create sub-flow (Assign / Invite).
  type PostKind = 'assign-existing' | 'assign-invite' | 'assign-team' | 'assign-festag'
  const [postFlow, setPostFlow] = useState<null | { kind: PostKind; projectId: string; projectTitle: string; requiresAssignment?: boolean; assigned?: boolean; draft?: boolean }>(null)
  // Daten aus dem Sub-Popup, die beim FINALISIEREN angewendet werden.
  const [pendingAssign, setPendingAssign] = useState<null | { kind: PostKind; payload: AssignDraftPayload }>(null)

  const titleRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const chatBodyRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const deliveryRef = useRef<HTMLDivElement>(null)
  const micBtnRef = useRef<HTMLButtonElement>(null)
  const primaryBtnRef = useRef<HTMLButtonElement>(null)
  const secondaryBtnRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  // Drag init is restricted to the handle (dragListener=false). Entrance,
  // snap-back and slide-down-to-close are declarative (initial/animate) so the
  // spring is robust to the isMobile flip and React StrictMode re-mounts.
  const dragControls = useDragControls()
  const [closing, setClosing] = useState(false)
  // Mount the sheet hidden (y:100%), then flip `entered` next frame so the
  // `animate` target CHANGES → framer reliably runs the spring-up transition.
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (!isMobile) { setEntered(false); return }
    const id = requestAnimationFrame(() => setEntered(true))
    return () => { cancelAnimationFrame(id); setEntered(false) }
  }, [isMobile])

  // High-quality iOS spring for entrance + snap-back; quick ease-out for close.
  const SHEET_SPRING = { type: 'spring' as const, stiffness: 320, damping: 32, mass: 0.9 }
  const SHEET_CLOSE = { type: 'tween' as const, duration: 0.3, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] }

  /** Close that respects the layout: mobile slides the sheet down first (then
   *  onAnimationComplete fires onClose); desktop closes immediately. Never
   *  closes mid-loading. */
  function requestClose() {
    if (phase === 'loading') return
    if (isMobile) setClosing(true)
    else onClose()
  }

  /** Release handler for the draggable sheet. Dismiss when dragged past ~35 %
   *  of the sheet height or flicked down fast; otherwise framer-motion springs
   *  it back to rest (animate y:0) on its own. */
  function onSheetDragEnd(_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const sheetH = sheetRef.current?.offsetHeight ?? window.innerHeight
    const draggedFar = info.offset.y > sheetH * 0.35
    const flickedDown = info.velocity.y > 700
    if (info.offset.y > 0 && (draggedFar || flickedDown)) setClosing(true)
  }

  useEffect(() => {
    const apply = () => {
      micBtnRef.current?.style.setProperty('border-radius', '999px', 'important')
      // Mobile CTA = Figma 32px radius; desktop CTA = full pill.
      primaryBtnRef.current?.style.setProperty('border-radius', isMobile ? '32px' : '999px', 'important')
      primaryBtnRef.current?.style.setProperty('font-weight', '400', 'important')
      secondaryBtnRef.current?.style.setProperty('border-radius', '999px', 'important')
      secondaryBtnRef.current?.style.setProperty('font-weight', '400', 'important')
    }
    apply()
    const t = window.setTimeout(apply, 50)
    return () => window.clearTimeout(t)
  })

  // Mount state for SSR-safe portal — declared early so the focus effect can depend on it.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    // No auto-focus on mobile — opening the keyboard would fight the sheet
    // slide-up and the safe-area layout.
    if (!mounted || isMobile) return
    const t = window.setTimeout(() => titleRef.current?.focus(), 30)
    return () => window.clearTimeout(t)
  }, [mounted, isMobile])

  // ESC closes — but never mid-loading so a half-finished submit can't be lost.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'loading') {
        if (deliveryPickerOpen) { setDeliveryPickerOpen(false); return }
        requestClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, phase, deliveryPickerOpen, isMobile])

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
    // Watchdog: wenn Loading > 10s steht, ist irgendwas hängen geblieben.
    // Phase auf error setzen damit der Nutzer das Modal schließen kann.
    const watchdog = setTimeout(() => {
      setError('Es dauert länger als gewohnt. Bitte erneut versuchen oder schließen.')
      setPhase('error')
    }, 10000)
    return () => { timers.forEach(clearTimeout); clearTimeout(watchdog) }
  }, [phase])

  // ESC erlauben sobald Loading > 2s — falls hängt soll der Nutzer raus können.
  useEffect(() => {
    if (phase !== 'loading') return
    const t = setTimeout(() => {
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
      document.addEventListener('keydown', handler)
      ;(window as any).__npmLoadingEsc = handler
    }, 2000)
    return () => {
      clearTimeout(t)
      const h = (window as any).__npmLoadingEsc
      if (h) document.removeEventListener('keydown', h)
    }
  }, [phase, onClose])

  // Voice dictation — schreibt in das Feld, das den letzten Fokus hatte
  // (Projektname / Beschreibung / Chat-Input).
  type DictationTarget = 'title' | 'desc' | 'chat'
  const dictationTargetRef = useRef<null | DictationTarget>(null)
  const dictationBaseRef = useRef('')
  const lastFocusedRef = useRef<DictationTarget>('title')
  const [dictating, setDictating] = useState<null | DictationTarget>(null)
  // „Mit Tagro einfügen" / „Manuell einfügen" Action-Chip nach einer Diktat-
  // Session. Wir merken uns den Stand VOR der Diktion (für „X = verwerfen")
  // und den danach erkannten Roh-Text (für „Mit Tagro einfügen").
  const [tagroInsert, setTagroInsert] = useState<null | {
    target: 'title' | 'desc'
    rawText: string
    snapshot: { title: string; description: string }
  }>(null)
  const [tagroInsertBusy, setTagroInsertBusy] = useState(false)
  // Ghost-Suggestion (für später).
  const [ghostSuggestion, setGhostSuggestion] = useState<string | null>(null)
  const [ghostLoading, setGhostLoading] = useState(false)
  // Wenn der Nutzer einen Tagro-Vorschlag übernommen oder verworfen hat,
  // wird der Chip ausgeblendet bis der Inhalt der Felder sich wieder ändert.
  const [chipDismissed, setChipDismissed] = useState(false)
  useEffect(() => { setChipDismissed(false) }, [title, description])
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
    setTimeout(() => {
      if (target === 'title') titleRef.current?.focus()
      else if (target === 'desc') descRef.current?.focus()
      else chatInputRef.current?.focus()
    }, 0)
  }

  // Tagro strukturiert/poliert/ergänzt Titel + Beschreibung basierend
  // auf dem aktuellen Stand. Egal ob getippt oder diktiert. Snapshot
  // wird vorm Aufruf gemerkt für Undo per X.
  async function applyTagroStructure() {
    if (tagroInsertBusy) return
    setTagroInsertBusy(true)
    const snapshot = { title, description }
    try {
      const res = await fetch('/api/ai/intake-step', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatHistory: [{
            role: 'user',
            text:
              `Du strukturierst Projekt-Notizen für ein Festag-Projekt.\n` +
              `Aktueller Titel: "${titleDraft || '(leer)'}"\n` +
              `Aktuelle Beschreibung: "${descriptionDraft || '(leer)'}"\n\n` +
              `Aufgabe:\n` +
              `- Falls Titel und/oder Beschreibung zu kurz oder unspezifisch sind, ergänze sie sinnvoll.\n` +
              `- Falls Inhalt vorhanden ist, formuliere kompakt und sachlich um.\n` +
              `- Titel: max 8 Wörter, prägnant.\n` +
              `- Beschreibung: 1-3 Sätze, was umgesetzt werden soll.\n` +
              `- Keine Doppelungen. Beschreibung darf den Titel NICHT einfach wiederholen.\n` +
              `Antworte als JSON {"title":"...","summary":"..."}.`,
          }],
        }),
      })
      const data = await res.json().catch(() => null)
      const nextTitle = typeof data?.title === 'string' && data.title.trim()
        ? data.title.trim() : (titleDraft || 'Neues Projekt')
      const nextDesc = typeof data?.summary === 'string' && data.summary.trim()
        ? data.summary.trim() : descriptionDraft
      setTitle(nextTitle)
      setDescription(nextDesc)
      setTagroInsert({ target: 'desc', rawText: '', snapshot })
    } catch {
      // Fallback: einfache Heuristik
      if (!titleDraft && descriptionDraft) {
        const first = descriptionDraft.split(/[.!?]\s+/)[0] || descriptionDraft
        setTitle(first.split(/\s+/).slice(0, 8).join(' '))
      } else if (titleDraft && !descriptionDraft) {
        setDescription(`Projekt rund um ${titleDraft.toLowerCase()} — Details folgen.`)
      }
      setTagroInsert({ target: 'desc', rawText: '', snapshot })
    } finally {
      setTagroInsertBusy(false)
    }
  }

  function undoTagroStructure() {
    if (!tagroInsert) return
    setTitle(tagroInsert.snapshot.title)
    setDescription(tagroInsert.snapshot.description)
    setTagroInsert(null)
  }

  const selectedDelivery = DELIVERY_OPTIONS.find(d => d.id === delivery) ?? DELIVERY_OPTIONS[0]
  const titleDraft = title.trim()
  const descriptionDraft = description.trim()
  // Mit Tagro fortfahren immer erlaubt — Tagro fragt im Chat nach Fehlendem.
  // Manuell anlegen verlangt aber zwingend einen Projektnamen.
  const canSubmit = true
  const canManual = titleDraft.length >= 2
  const canCreate = canSubmit || chatHistory.some(turn => turn.role === 'user' && turn.text.trim().length >= 2)
  const canStructure = (titleDraft.length + descriptionDraft.length) >= 4

  // Auto-Pill: Intent aus dem Freitext erkennen. Client-seitig, schnell.
  const intentDelivery = useMemo<DeliveryModel | null>(() => {
    const blob = (titleDraft + ' ' + descriptionDraft).toLowerCase()
    if (!blob.trim()) return null
    if (/\b(team|intern|mitarbeiter|selber bauen|wir bauen|kollegen|in[- ]?house)\b/.test(blob)) return 'team_internal'
    if (/\b(bestehende[rn]?|aktuelle[rn]?|mein dev|mein entwickler|gleichen dev|vorhandenen?)\b/.test(blob)) return 'assign_existing_dev'
    if (/\b(neu(en)? dev|neuen entwickler|jemand|einladen|einlade|onboarden|onboarding)\b/.test(blob)) return 'invite_new_dev'
    if (/\b(festag (sucht|sollst|sollen|macht|find)|sucht mir|find(et|en) (mir|uns))\b/.test(blob)) return 'festag_delivery'
    return null
  }, [titleDraft, descriptionDraft])
  const showIntentHint = !!intentDelivery && intentDelivery !== delivery

  function suggestedTitle() {
    const source = tagroTitle || title.trim() || description.trim()
    return source.split(/\s+/).slice(0, 6).join(' ').replace(/[.,;:!?]+$/, '') || 'Neues Projekt'
  }

  function buildInitialChatHistory(): ChatTurn[] {
    const known: string[] = []
    if (titleDraft) known.push(`Projektname (vom Nutzer bereits eingegeben): ${titleDraft}`)
    if (descriptionDraft) known.push(`Beschreibung (vom Nutzer bereits eingegeben): ${descriptionDraft}`)
    known.push(`Umsetzungs-Modus: ${selectedDelivery.label}`)
    const instructions = [
      'WICHTIG: Frage NICHT nach Informationen, die der Nutzer oben bereits angegeben hat — bau darauf auf.',
      titleDraft ? null : '- Da noch kein Projektname existiert, frage ZUERST danach.',
      'Stelle nur Fragen, die der Entwickler später wirklich braucht (Scope, Zielgruppe, Tech-Stack falls Software, Termine, besondere Anforderungen).',
    ].filter(Boolean).join('\n')
    return [{ role: 'user', text: `${known.join('\n')}\n\n${instructions}` }]
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
      const newTitle = typeof data?.title === 'string' ? data.title.trim() : ''
      setTagroTitle(newTitle || null)
      // Wenn der Titel-Input leer ist und Tagro einen brauchbaren Titel
      // erkannt hat → automatisch oben links eintragen.
      if (newTitle && !titleDraft) setTitle(newTitle)
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
  /** Click auf "Manuell anlegen" — öffnet das Sub-Popup im DRAFT-Modus
   *  ohne das Projekt schon in der DB anzulegen. */
  function manualCreate() {
    if (phase === 'loading') return
    if (!title.trim()) { setError('Bitte zuerst einen Projektnamen eingeben.'); return }
    setError('')
    const next = selectedDelivery.postCreate
    if (next) {
      // Sub-Popup mit draft=true → sammelt Daten, kein DB-Write.
      setPostFlow({
        kind: next,
        projectId: '',                 // existiert noch nicht
        projectTitle: title.trim(),
        draft: true,
      })
      return
    }
    // Keine Sub-Pill → direkt finalisieren.
    void finalize(null)
  }

  /** Erstellt das Projekt JETZT WIRKLICH in der DB und führt — falls
   *  pendingAssign vorhanden — die Zuweisung durch. */
  async function finalize(pending: typeof pendingAssign) {
    if (phase === 'loading') return
    setError('')
    setPhase('loading')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('Bitte melde dich erneut an.')
      const projectTitleVal = title.trim() || 'Neues Projekt'
      const { data: created, error: insErr } = await (supabase as any)
        .from('projects')
        .insert({
          user_id: userId,
          title: projectTitleVal,
          description: description.trim().slice(0, 1200) || null,
          status: 'planning',
        })
        .select('id').single()
      if (insErr || !created?.id) throw new Error(insErr?.message || 'Projekt konnte nicht angelegt werden.')
      const projectId = created.id as string

      try {
        await (supabase as any).from('projects').update({ delivery_model: delivery }).eq('id', projectId)
      } catch {}

      // Falls beim Sub-Popup Assign-Daten gesammelt wurden: jetzt versenden.
      if (pending?.payload) {
        const p = pending.payload
        try {
          if (p.mode === 'existing') {
            await fetch('/api/projects/assign-existing', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId,
                devEmail: 'devEmail' in p ? p.devEmail : undefined,
                devHandle: 'devHandle' in p ? p.devHandle : undefined,
              }),
            }).catch(() => null)
          } else if (p.mode === 'invite') {
            await fetch('/api/projects/invite-dev', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId,
                devEmail: 'devEmail' in p ? p.devEmail : undefined,
                devName: 'devName' in p ? (p as any).devName : undefined,
              }),
            }).catch(() => null)
          } else if (p.mode === 'team') {
            await fetch('/api/projects/assign-team', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId,
                members: (p.emails || []).map((em: string) => ({ email: em })),
              }),
            }).catch(() => null)
          } else if (p.mode === 'festag') {
            await fetch('/api/projects/festag-pool', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId }),
            }).catch(() => null)
          }
        } catch { /* still complete project creation */ }
      }

      setPendingAssign(null)
      setPhase('success')
      setTimeout(() => onCreated?.(projectId), 500)
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

      const next = selectedDelivery.postCreate
      if (next) {
        // Pill verlangt einen Sub-Flow: KEINE Erfolgs-Animation, direkt
        // das passende Popup aufschlagen. Pflicht-Flag, damit das Projekt
        // bei Abbruch wieder rolled back wird.
        setPostFlow({
          kind: next,
          projectId: projectId!,
          projectTitle: suggestedTitle(),
          requiresAssignment: true,
        })
      } else {
        setPhase('success')
        setTimeout(() => onCreated?.(projectId!), 700)
      }
    } catch (e: any) {
      setError(e?.message || 'Projekt konnte nicht angelegt werden.')
      setPhase(chatHistory.length ? 'chat' : 'error')
    }
  }

  if (!mounted) return null

  const tree = (
    <>
      <div className={`npm-overlay${isMobile ? ' is-mobile' : ''}`} role="dialog" aria-modal="true" aria-label="Neues Projekt">
        <style>{CSS}</style>
        <div
          className="npm-backdrop"
          onPointerDown={e => {
            if (phase === 'loading') return
            if (e.target === e.currentTarget) requestClose()
          }}
          aria-hidden
        />

        {/* Static header (Figma 259:329 + 259:307) — lives ABOVE the sheet and
            never animates, slides, or re-renders. Only the sheet moves. */}
        {isMobile && phase === 'form' && (
          <div className="npm-greeting">
            <div className="npm-greeting-text">
              <span className="primary">Was steht an?</span>
              <br />
              <span className="muted">Was wird umgesetzt?</span>
            </div>
            <div className="npm-greeting-pill">
              <button type="button" aria-label="Suchen"><MagnifyingGlass size={16} weight="regular" /></button>
              <button type="button" aria-label="Mehr"><DotsNine size={18} weight="regular" /></button>
            </div>
          </div>
        )}

        <motion.div
          key={isMobile ? 'sheet' : 'modal'}
          className={`npm-card${phase === 'chat' ? ' is-chat' : ''}${isMobile ? ' is-sheet' : ''}`}
          role="document"
          onMouseDown={e => e.stopPropagation()}
          ref={sheetRef}
          {...(isMobile
            ? {
                drag: 'y' as const,
                dragControls,
                dragListener: false,
                dragConstraints: { top: 0 },
                dragElastic: 0,
                dragMomentum: false,
                onDragEnd: onSheetDragEnd,
                initial: { y: '100%' },
                animate: { y: (entered && !closing) ? '0%' : '100%' },
                transition: closing ? SHEET_CLOSE : SHEET_SPRING,
                onAnimationComplete: () => { if (closing) onClose() },
              }
            : {})}
        >
          {isMobile && (
            <div
              className="npm-drag-area"
              onPointerDown={e => { if (phase !== 'loading') dragControls.start(e) }}
              aria-hidden
            >
              <div className="npm-drag-handle" />
            </div>
          )}

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
                  {showIntentHint && (
                    <button
                      type="button"
                      className="npm-intent-hint"
                      onClick={() => intentDelivery && setDelivery(intentDelivery)}
                      title="Diese Auswahl übernehmen"
                    >
                      <Sparkle size={11} weight="fill" />
                      Tagro schlägt vor: „{DELIVERY_OPTIONS.find(o => o.id === intentDelivery)?.label}" — übernehmen
                    </button>
                  )}
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
                    <CaretDown size={16} weight="fill" />
                  </button>
                  <button
                    type="button" className="npm-help mobile"
                    aria-label="Was bedeutet Umsetzung?" title="Wie soll dein Projekt umgesetzt werden?"
                  >
                    <span aria-hidden>?</span>
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

              {pendingAssign && (
                <div className="npm-pending-chip" role="status">
                  <Check size={14} weight="bold" />
                  <span>
                    {pendingAssign.payload.mode === 'team'
                      ? `${pendingAssign.payload.emails.length} Einladung${pendingAssign.payload.emails.length === 1 ? '' : 'en'} vorbereitet`
                      : pendingAssign.payload.mode === 'festag'
                      ? 'Tagro wählt den passenden Entwickler aus'
                      : 'devEmail' in pendingAssign.payload && pendingAssign.payload.devEmail
                      ? `Einladung an ${pendingAssign.payload.devEmail}`
                      : 'devHandle' in pendingAssign.payload && pendingAssign.payload.devHandle
                      ? `Dev @${pendingAssign.payload.devHandle} wird zugewiesen`
                      : 'Daten gesammelt'}
                  </span>
                  <button type="button" onClick={() => setPendingAssign(null)} aria-label="Verwerfen">
                    <X size={11} />
                  </button>
                </div>
              )}

              {canStructure && !chipDismissed && (
                <div className="npm-insert-chip" role="region" aria-label="Eingabe übersetzen">
                  <span className="npm-insert-label">
                    {tagroInsert
                      ? 'Tagro hat einen Vorschlag eingefügt. Übernehmen oder verwerfen?'
                      : 'Tagro kann deine Eingabe in Projektname & Beschreibung übersetzen.'}
                  </span>
                  <div className="npm-insert-actions">
                    {!tagroInsert && (
                      <button type="button" className="npm-insert-primary" onClick={applyTagroStructure} disabled={tagroInsertBusy}>
                        {tagroInsertBusy ? 'Tagro übersetzt…' : 'Mit Tagro übersetzen'}
                      </button>
                    )}
                    {tagroInsert && (
                      <>
                        <button
                          type="button"
                          className="npm-insert-primary"
                          onClick={() => { setTagroInsert(null); setChipDismissed(true) }}
                          disabled={tagroInsertBusy}
                        >
                          Übernehmen
                        </button>
                        <button
                          type="button"
                          className="npm-insert-x"
                          onClick={() => { undoTagroStructure(); setChipDismissed(true) }}
                          disabled={tagroInsertBusy}
                          aria-label="Verwerfen"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
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

          {phase === 'loading' && !postFlow && (
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
                <button
                  ref={secondaryBtnRef}
                  type="button"
                  className={`npm-secondary${phase === 'chat' ? ' is-collapsed' : ''}${pendingAssign ? ' is-finalize' : ''}`}
                  onClick={() => {
                    if (pendingAssign) void finalize(pendingAssign)
                    else manualCreate()
                  }}
                  disabled={!canManual || phase === 'chat'}
                  aria-hidden={phase === 'chat'}
                  tabIndex={phase === 'chat' ? -1 : 0}
                  title={!canManual ? 'Bitte zuerst einen Projektnamen eingeben' : undefined}
                >
                  {pendingAssign ? (
                    <>
                      <Check size={14} weight="bold" />
                      <span>Finalisieren</span>
                    </>
                  ) : 'Manuell anlegen'}
                </button>
                <button
                  ref={primaryBtnRef}
                  type="button"
                  className="npm-primary"
                  onClick={phase === 'chat' ? createProject : openTagroChat}
                  disabled={phase === 'chat' ? (!canCreate || chatLoading) : !canSubmit}
                  aria-busy={phase === 'chat' ? chatLoading : undefined}
                  title={!canSubmit && phase !== 'chat' ? 'Bitte zuerst einen Projektnamen eingeben' : undefined}
                >
                  <span>Mit Tagro fortfahren</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </footer>
          )}

          {/* Figma 259:310 — faint secondary indicator in the lower sheet. */}
          {isMobile && phase === 'form' && <div className="npm-deco-bar" aria-hidden />}
        </motion.div>
      </div>

      {postFlow && (
        <AssignDevModal
          open
          projectId={postFlow.projectId}
          projectTitle={postFlow.projectTitle}
          mode={
            postFlow.kind === 'assign-existing' ? 'existing' :
            postFlow.kind === 'assign-invite' ? 'invite' :
            postFlow.kind === 'assign-team' ? 'team' :
            'festag'
          }
          draft={postFlow.draft}
          onSubmitDraft={(payload) => {
            // Daten merken, Sub-Popup schließen, zurück zur Form.
            // Button wird zu "Finalisieren".
            setPendingAssign({ kind: postFlow.kind, payload })
            setPostFlow(null)
          }}
          onAssigned={() => {
            setPostFlow(p => p ? { ...p, assigned: true } : p)
          }}
          onClose={async () => {
            const id = postFlow.projectId
            const mustRollback = !postFlow.draft && postFlow.requiresAssignment && !postFlow.assigned
            setPostFlow(null)
            if (mustRollback && id) {
              try { await (supabase as any).from('projects').delete().eq('id', id) } catch {}
              setPhase('form')
              return
            }
            if (postFlow.draft) return  // bleibt im NewProjectModal
            if (id) onCreated?.(id)
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
  /* ===== MOBILE = IMMER LIGHT (Figma 259:304). Heller Backdrop rgba(252,252,252,.9).
     Overlay selbst animiert NICHT — nur der Backdrop blendet auf, das Sheet
     federt rein. Header bleibt komplett statisch. ===== */
  .npm-overlay.is-mobile { color-scheme: light; animation: none; }
  .npm-overlay.is-mobile .npm-backdrop {
    background: rgba(252,252,252,0.9);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    animation: npmFade .2s ease both;
  }
  @keyframes npmFade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes npmPop  { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: none; } }

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
  /* ---- Bottom sheet (Figma 259:311) ----
     bg rgba(252,252,252,.7) · radius 40 oben · shadow 0 -2 4 rgba(144,149,159,.07).
     Füllt von unterhalb des statischen Headers bis zur Bildschirmunterkante;
     env(safe-area-inset-top) hält das Sheet frei von Dynamic Island.
     Bewegung wird komplett von framer-motion getrieben → KEINE CSS-Animation. */
  .npm-card.is-sheet {
    width: 100%;
    max-width: 100%;
    min-height: 0;
    height: calc(100dvh - env(safe-area-inset-top) - 96px);
    max-height: calc(100dvh - env(safe-area-inset-top) - 56px);
    padding: 0;
    background: rgba(252,252,252,0.7);
    border-radius: 40px 40px 0 0;
    box-shadow: 0px -2px 4px 0px rgba(144,149,159,0.07);
    animation: none;
    will-change: transform;
    touch-action: pan-y;
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

  /* ---- Static header (Figma 259:329 text @ 24/24, 259:307 pill @ 296/14) ----
     Niemals animiert. Safe-area schiebt unter die Dynamic Island. */
  .npm-greeting {
    position: absolute; inset: 0 0 auto 0;
    z-index: 2;
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: calc(env(safe-area-inset-top) + 14px) 16px 0 24px;
    pointer-events: none;
  }
  .npm-greeting-text {
    margin-top: 10px;          /* Pill @ 14, Text @ 24 → +10 */
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 25px;
    line-height: normal;
    font-weight: 400;
    letter-spacing: 0;
    white-space: nowrap;   /* 2 Zeilen via <br>, kein zusätzlicher Umbruch */
  }
  .npm-greeting-text .primary { color: #0F0F10; }
  .npm-greeting-text .muted   { color: #90959F; }
  .npm-greeting-pill {
    pointer-events: auto;
    display: inline-flex; align-items: center; gap: 8px;
    padding: 7px 12px;
    height: 45px;
    background: #FFFFFF;
    border-radius: 999px;
    box-shadow: 0 4px 4px rgba(207,213,230,.4);
  }
  .npm-greeting-pill button {
    width: 30px; height: 30px;
    border: 0; background: transparent; color: #2A3032;
    border-radius: 999px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .npm-greeting-pill button:hover {
    background: #F1F2F8;
  }

  /* ---- Drag handle (Figma 259:314: 48×5, rgba(144,149,159,.25), r24, @12px) ---- */
  .npm-drag-area {
    width: 100%;
    min-height: 0;            /* override globalen 44px Touch-Mindestwert */
    padding: 12px 0 7px;
    display: flex; justify-content: center;
    cursor: grab;
    flex-shrink: 0;
    touch-action: none;
  }
  .npm-drag-area:active { cursor: grabbing; }
  .npm-drag-handle {
    width: 48px; height: 5px;
    background: rgba(144,149,159,0.25);
    border-radius: 24px;
  }

  /* ---- Faint secondary indicator (Figma 259:310: 46×4, rgba(91,100,125,.4), r12) ---- */
  .npm-deco-bar {
    position: absolute;
    left: 50%; transform: translateX(-50%);
    top: 64%;
    width: 46px; height: 4px;
    border-radius: 12px;
    background: rgba(91,100,125,0.4);
    pointer-events: none;
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

  /* ---- Mobile title row (Figma 259:313: "Projektname" #90959F 32px @ 41/182) ---- */
  .npm-mobile-title {
    padding: 45px 41px 0;
  }
  .npm-title-input.mobile {
    width: 100%;
    height: 41px;            /* Figma 259:313 Box-Höhe */
    padding: 0;
    font-size: 32px;
    line-height: 41px;
    font-weight: 400;
    letter-spacing: 0;
    color: #2A3032;
  }
  .npm-title-input.mobile::placeholder {
    color: #90959F;
    opacity: 1;
  }

  /* ---- Body ---- */
  .npm-body {
    padding: 30px 0 0;
    overflow: hidden !important;
    display: flex; flex-direction: column; gap: 28px;
    flex: 1;
    min-height: 0;
  }
  /* Mobile body — Dropdown @ 41/271 (48px unter Projektname), Beschreibung
     @ 44/341 (36px unter Dropdown). Overflow sichtbar fürs Dropdown-Menü. */
  .npm-card.is-sheet .npm-body {
    padding: 48px 34px 0 41px;
    gap: 36px;
    overflow: visible !important;
  }
  .npm-card.is-sheet .npm-section.description {
    margin-left: 3px;   /* 41 + 3 = 44 (Figma 259:312) */
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

  /* ---- Delivery (mobile dropdown — Figma 259:324) ----
     bg rgba(255,255,255,.9) · h34 · pl16 pr8 py7 · gap6 · text #90959F 13 Medium
     · shadow 0 2 4 rgba(144,149,159,.07). "?" sitzt 13px rechts daneben. */
  .npm-section.delivery.mobile {
    position: relative;
    flex-direction: row; align-items: center; gap: 13px;
  }
  .npm-pill.dropdown {
    height: 34px;
    min-height: 34px;   /* override globalen 44px Touch-Mindestwert */
    background: rgba(255,255,255,0.9);
    color: #90959F;
    padding: 7px 8px 7px 16px;
    font-size: 13px; font-weight: 500;
    gap: 6px;
    box-shadow: 0px 2px 4px 0px rgba(144,149,159,0.07);
  }
  .npm-pill.dropdown svg { width: 16px; height: 16px; color: #90959F; }
  .npm-pill.dropdown.on {
    background: rgba(255,255,255,0.95);
    color: #2A3032;
  }
  .npm-pill.dropdown.on svg { color: #2A3032; }

  /* ---- Mobile help "?" (Figma 259:322) ---- */
  .npm-help.mobile {
    width: 20px; height: 20px; min-height: 20px;
    padding: 0; border: 0;
    border-radius: 999px;
    background: rgba(251,251,255,0.2);
    box-shadow: 0px 4px 4px 0px rgba(91,100,125,0.25);
    color: #848D9B;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 14px; font-weight: 500; letter-spacing: 0.28px; line-height: 1;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
    transition: background .12s;
  }
  .npm-help.mobile:hover { background: rgba(251,251,255,0.5); }
  .npm-delivery-menu {
    position: absolute; top: calc(100% + 8px); left: 0;
    z-index: 5;
    min-width: min(320px, calc(100vw - 80px));
    margin: 0; padding: 8px; list-style: none;
    background: #FFFFFF;
    border: 1px solid #ECEFF3;
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(15,23,42,.06), 0 24px 60px -20px rgba(15,23,42,.28);
  }
  .npm-delivery-menu li button {
    width: 100%;
    display: flex; flex-direction: column; gap: 3px;
    padding: 11px 12px;
    border: 0; background: transparent; border-radius: 12px;
    text-align: left; cursor: pointer;
    color: #2A3032;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    transition: background .12s;
  }
  .npm-delivery-menu li button .lbl {
    font-size: 14px; font-weight: 500; color: #1B1E26;
  }
  .npm-delivery-menu li button .meta {
    font-size: 12px; line-height: 1.45; color: #9197A3;
  }
  .npm-delivery-menu li button:hover {
    background: #F3F5F7;
  }
  .npm-delivery-menu li button.on {
    background: #F0F2F7;
  }
  .npm-delivery-menu li button.on .lbl { color: #5B647D; }

  /* ---- Description textarea (borderless) ---- */
  .npm-section.description { min-height: 180px; flex: 1; }
  .npm-textarea {
    width: 100%;
    background: transparent; border: 0; outline: 0; resize: none;
    color: #2A3032; font: inherit;
    font-size: 18px; line-height: 30px; font-weight: 400;
    letter-spacing: .01em;
    min-height: 180px; max-height: 360px;
    padding: 0;
  }
  /* Mobile Beschreibung (Figma 259:312): 17px / LH 35 / #90959F, Höhe 168 */
  .npm-card.is-sheet .npm-textarea {
    font-size: 17px;
    line-height: 35px;
    min-height: 168px;
    letter-spacing: 0;
    color: #2A3032;
  }
  .npm-card.is-sheet .npm-textarea::placeholder {
    color: #90959F;
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

  /* ---- Pending Assign Chip — zeigt was beim Finalize angewendet wird ---- */
  .npm-pending-chip {
    display: inline-flex; align-items: center; gap: 8px;
    width: fit-content; max-width: 100%;
    padding: 8px 8px 8px 14px;
    background: #EEF1F8;
    color: #5B647D;
    border-radius: 999px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 12.5px; font-weight: 500;
    letter-spacing: .01em;
    animation: npmPop .24s cubic-bezier(.16,1,.3,1) both;
  }
  .npm-pending-chip > span {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .npm-pending-chip button {
    width: 22px; height: 22px;
    border: 0; border-radius: 999px !important;
    background: transparent; color: #5B647D;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
    transition: background .12s;
  }
  .npm-pending-chip button:hover { background: rgba(91,100,125,.12); }

  /* Finalize-State des Secondary-Buttons — Slate-Akzent statt neutral */
  .npm-secondary.is-finalize {
    border-color: #5B647D !important;
    color: #5B647D !important;
    gap: 8px;
  }
  .npm-secondary.is-finalize:hover:not(:disabled) {
    background: #5B647D !important;
    color: #FFFFFF !important;
  }

  /* ---- Auto-Pill Hint ---- */
  .npm-intent-hint {
    display: inline-flex; align-items: center; gap: 6px;
    margin-top: 10px;
    padding: 6px 12px 6px 10px;
    border: 0;
    border-radius: 999px;
    background: #F3F5F7;
    color: #5B647D;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 12px; font-weight: 500;
    letter-spacing: .01em;
    cursor: pointer;
    width: fit-content;
    transition: background .12s, color .12s;
  }
  .npm-intent-hint:hover { background: #E7EBF0; color: #2A3032; }

  /* ---- Tagro Insert Chip (Eingabe-Übersetzung) ---- */
  .npm-insert-chip {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px;
    margin-top: 6px;
    padding: 12px 12px 12px 18px;
    border: 1px solid #E7EBF0;
    border-radius: 16px;
    background: #FFFFFF;
    box-shadow: 0 1px 2px rgba(15,23,42,.03), 0 12px 28px -16px rgba(15,23,42,.18);
    animation: npmPop .24s cubic-bezier(.16,1,.3,1) both;
  }
  .npm-insert-label {
    flex: 1; min-width: 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 13px; line-height: 1.45;
    color: #2A3032; font-weight: 400;
    letter-spacing: .01em;
  }
  .npm-insert-actions {
    display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0;
  }
  .npm-insert-primary,
  .npm-insert-secondary {
    height: 36px; padding: 0 16px;
    border-radius: 999px !important;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 12.5px; font-weight: 400; letter-spacing: .14px;
    cursor: pointer;
    transition: background .12s, border-color .12s, color .12s;
  }
  .npm-insert-primary {
    border: 0;
    background: #5B647D !important; color: #FFFFFF !important;
    box-shadow: 0 6px 16px -8px rgba(91,100,125,.45);
  }
  .npm-insert-primary:hover:not(:disabled) { background: #4E576E !important; }
  .npm-insert-secondary {
    border: 1px solid #DCE1EA;
    background: #FFFFFF; color: #202532;
  }
  .npm-insert-secondary:hover:not(:disabled) { background: #F7F8FB; border-color: #CBCFD6; }
  .npm-insert-primary:disabled,
  .npm-insert-secondary:disabled { opacity: .4; cursor: not-allowed; }
  .npm-insert-x {
    width: 32px; height: 32px;
    border: 0; border-radius: 999px;
    background: transparent; color: #ADB3BD;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .npm-insert-x:hover:not(:disabled) { background: #F1F3F6; color: #5B647D; }
  .npm-insert-x:disabled { opacity: .4; cursor: not-allowed; }

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
    /* Damit collapse-Animation des Manuell-Button sauber überblendet */
    transition: gap .35s cubic-bezier(.16,1,.3,1);
  }
  /* Sub-Menü-Wechsel — der Sekundär-Button verschwindet nicht abrupt sondern
     schrumpft mit Crossfade, Slide und Scale auf 0 zusammen. */
  .npm-secondary.is-collapsed {
    max-width: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    margin-right: -10px;
    opacity: 0;
    transform: translateX(8px) scale(.92);
    pointer-events: none;
    border-color: transparent !important;
    box-shadow: none !important;
    overflow: hidden;
  }
  .npm-secondary {
    display: inline-flex; align-items: center; justify-content: center;
    height: 47px; padding: 0 22px;
    max-width: 240px;
    border: 0.7px solid #E7EBF0;
    border-radius: 999px !important;
    background: #FFFFFF; color: #202532;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 14px; font-weight: 400; letter-spacing: .14px;
    box-shadow: 0 1px 2px rgba(15,23,42,.03);
    cursor: pointer;
    opacity: 1;
    transform: translateX(0) scale(1);
    transition:
      max-width .42s cubic-bezier(.16,1,.3,1),
      padding .42s cubic-bezier(.16,1,.3,1),
      margin .42s cubic-bezier(.16,1,.3,1),
      transform .38s cubic-bezier(.16,1,.3,1),
      opacity .28s ease,
      background .14s,
      border-color .14s;
    will-change: max-width, opacity, transform;
    white-space: nowrap;
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

  /* Mobile-Footer (Figma 259:315) — Frame @ 22/800, gap 12, 14px über Unterkante.
     Mic 60×60 (259:316) + CTA 286×60 (259:318). "Manuell anlegen" entfällt mobil. */
  .npm-card.is-sheet .npm-foot {
    padding: 0 22px max(14px, env(safe-area-inset-bottom));
    margin-top: auto;
    gap: 12px;
    align-items: flex-end;
  }
  .npm-card.is-sheet .npm-foot-left { gap: 12px; flex: 0 0 auto; }
  /* Figma-Mobile-Footer hat KEINEN Visualizer — nur Mic + CTA. */
  .npm-card.is-sheet .npm-visualizer { display: none; }
  .npm-card.is-sheet .npm-foot-right {
    flex: 1; gap: 0; align-items: center;
  }
  .npm-card.is-sheet .npm-secondary { display: none !important; }
  /* CTA (Figma 259:318): #5B647D · 60h · r32 · pad19 · gap32 · justify-end
     · Text 16/#FFF/.32px · Shadow außen + innen. */
  .npm-card.is-sheet .npm-primary {
    flex: 1;
    justify-content: flex-end;
    align-items: center;
    gap: 32px;
    height: 60px;
    border-radius: 32px !important;
    font-size: 16px !important;
    font-weight: 400 !important;
    letter-spacing: 0.32px;
    padding: 19px;
    white-space: nowrap;
    background: #5B647D !important;
    box-shadow:
      0px 4px 4px 0px rgba(152,162,179,0.25),
      inset 0px 4px 4px 0px rgba(132,141,155,0.25);
  }
  .npm-card.is-sheet .npm-primary svg { width: 24px; height: 24px; }
  /* Mic (Figma 259:316): 60×60 weißer Kreis. */
  .npm-card.is-sheet .npm-mic-btn {
    width: 60px; height: 60px;
    box-shadow:
      0 0 0 1px rgba(15,23,42,.04),
      0 2px 4px rgba(15,23,42,.04),
      0 10px 20px -8px rgba(15,23,42,.14);
  }
  .npm-card.is-sheet .npm-mic-btn svg { width: 26px; height: 26px; }

  /* ---- Chat phase ---- */
  .npm-card.is-chat {
    /* gleiche Breite wie Form-Phase, damit nichts springt */
    width: min(900px, calc(100vw - 64px));
    min-height: 720px;
    max-height: calc(100dvh - 64px);
  }
  .npm-chat {
    flex: 1; min-height: 0;
    display: flex; flex-direction: column;
    background: #FFFFFF;
  }
  .npm-chat-main {
    flex: 1; min-height: 0; overflow-y: auto;
    padding: 4px 0 12px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .npm-chat-row { display: flex; align-items: flex-start; gap: 10px; }
  .npm-chat-row.user { justify-content: flex-end; }
  .npm-chat-avatar {
    width: 28px; height: 28px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 999px;
    background: #F3F5F7;
    flex-shrink: 0;
  }
  .npm-chat-bubble {
    max-width: min(620px, 78%);
    padding: 12px 16px;
    border-radius: 16px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 13.5px; line-height: 1.55;
    font-weight: 400; letter-spacing: 0;
    white-space: pre-wrap;
  }
  /* Tagro = links, hellgraue Bubble, dunkler Text */
  .npm-chat-row.tagro .npm-chat-bubble {
    background: #F3F5F7;
    color: #2A3032;
    border-bottom-left-radius: 6px;
  }
  /* User = rechts, Slate solid, weißer Text */
  .npm-chat-row.user .npm-chat-bubble {
    background: #5B647D;
    color: #FFFFFF;
    border-bottom-right-radius: 6px;
  }
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
    padding: 12px 0 4px;
    background: transparent;
  }
  .npm-chat-ready {
    display: inline-flex; align-items: center; gap: 7px;
    margin: 0 0 8px;
    color: #22a06b; font-size: 12.5px; font-weight: 500;
  }
  .npm-chat-input {
    min-height: 48px;
    display: grid; grid-template-columns: 22px minmax(0, 1fr) auto;
    align-items: end; gap: 8px;
    padding: 8px 8px 8px 16px;
    border-radius: 999px;
    border: 1px solid #E7EBF0;
    background: #FFFFFF;
    box-shadow: 0 1px 2px rgba(15,23,42,.03);
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
    background: #5B647D; color: #FFFFFF; cursor: pointer;
  }
  .npm-chat-input button:disabled { opacity: .42; cursor: default; }

  /* ---- Loading + success states ---- */
  .npm-busy {
    flex: 1; min-height: 0;
    padding: 24px 26px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center;
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
