'use client'

/**
 * TagroOverlay — the central object-aware Tagro Agent Workspace.
 *
 * Behaviour:
 *   1. Opens via `openTagro({ contextType, id, title })` — always as a centred popup.
 *   2. Initial state: task picker (question, context chips, suggestions, composer).
 *   3. On first send / template / "Von Grund auf starten": chat stays in the SAME
 *      popup shell — user remains in task context, not a separate AI surface.
 *   4. Expand (↗) is the ONLY way to open fullscreen workspace + icon rail.
 *   5. Collapse (↙) returns to the compact popup with conversation intact.
 *
 * Theming:
 *   Lightmode is the visual master (per the references). Darkmode is the same
 *   exact layout via a global stylesheet block that reads `data-theme` from
 *   <html>. No styled-jsx scoping — variable overrides cascade reliably.
 *
 * Object-level "Mit Tagro bearbeiten" calls openTagro(). NEVER routes through
 * the old Copilot.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, ArrowUp, ArrowsClockwise, ArrowsOut, ArrowsIn,
  Microphone, MicrophoneSlash, Plus, Lightbulb, CaretRight,
  MagnifyingGlass, User, ChartLine, Scales, CheckSquare,
  UsersThree, Warning, FileText, Briefcase, Sun, EnvelopeSimple,
  Copy, ThumbsUp, ThumbsDown, SpeakerHigh, Stack,
} from '@phosphor-icons/react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import TagroLogo from '@/components/TagroLogo'
import TagroIconRail from '@/components/TagroIconRail'

// ── Public API ────────────────────────────────────────────────────────────

export type TagroContextType =
  | 'project' | 'task' | 'decision' | 'document' | 'pdf' | 'client'
  | 'briefing' | 'status_report' | 'report' | 'note' | 'evidence'
  | 'risk' | 'approval' | 'dev_item' | 'marketing' | 'empty'

export type TagroOpenDetail = {
  contextType: TagroContextType
  id?: string
  title?: string
  subtitle?: string
  prefill?: string
  fullscreen?: boolean
  /** Skip the task-picker modal — open the sana fullscreen agent workspace directly. */
  workspace?: boolean
}

export function openTagro(detail: TagroOpenDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<TagroOpenDetail>('festag:open-tagro', { detail }))
}

// ── Per-context copy ──────────────────────────────────────────────────────

const CTX_CHIP: Record<TagroContextType, string> = {
  project: 'Projekt', task: 'Aufgabe', decision: 'Entscheidung',
  document: 'Dokument', pdf: 'PDF', client: 'Kunde',
  briefing: 'Briefing', status_report: 'Statusbericht', report: 'Bericht',
  note: 'Notiz', evidence: 'Beleg', risk: 'Risiko', approval: 'Freigabe',
  dev_item: 'Dev Panel', marketing: 'Marketing', empty: 'Neu',
}

const CTX_QUESTION: Record<TagroContextType, string> = {
  project: 'Was soll Tagro mit diesem Projekt machen?',
  task: 'Was soll Tagro mit dieser Aufgabe machen?',
  decision: 'Welche Entscheidung soll Tagro vorbereiten?',
  document: 'Was soll Tagro aus diesem Dokument machen?',
  pdf: 'Was soll Tagro aus diesem PDF machen?',
  client: 'Was soll Tagro für diesen Kunden vorbereiten?',
  briefing: 'Worüber soll Tagro briefen?',
  status_report: 'Was soll Tagro mit diesem Statusbericht machen?',
  report: 'Was soll Tagro mit diesem Bericht machen?',
  note: 'Was soll Tagro aus dieser Notiz machen?',
  evidence: 'Was soll Tagro mit diesem Beleg machen?',
  risk: 'Wie soll Tagro dieses Risiko einschätzen?',
  approval: 'Wie soll Tagro diese Freigabe vorbereiten?',
  dev_item: 'Was soll Tagro mit diesem Dev-Panel-Eintrag machen?',
  marketing: 'Was soll Tagro für dieses Marketing-Element vorbereiten?',
  empty: 'Was soll Tagro vorbereiten?',
}

const CTX_PLACEHOLDER: Record<TagroContextType, string> = {
  project: 'Beschreibe Ziel, Umfang oder offene Punkte.',
  task: 'Schreib kurz, was passieren soll.',
  decision: 'Welche Optionen, welche Empfehlung, welcher Impact?',
  document: 'Zusammenfassen, verbessern, ableiten — was brauchst du?',
  pdf: 'Zusammenfassen, verbessern, ableiten — was brauchst du?',
  client: 'Status-Update, offene Themen oder nächste Kommunikation?',
  briefing: 'Welcher Zeitraum, welche Empfänger, welcher Fokus?',
  status_report: 'Aktualisieren, kundensicher machen, Tasks ableiten?',
  report: 'Aktualisieren, kürzen, kundensicher machen?',
  note: 'Strukturieren, Aufgaben ableiten oder verknüpfen?',
  evidence: 'Erklären, mit Bericht verknüpfen oder bestätigen?',
  risk: 'Einschätzen, Gegenmaßnahme oder Owner?',
  approval: 'Freigabetext, Kundenfrage oder Status?',
  dev_item: 'Review anfordern, Blocker melden, Status an Lead?',
  marketing: 'Performance erklären, Budget anfordern, Creative Review?',
  empty: 'Beschreibe dein Ziel, dein Problem oder deine Idee.',
}

const CTX_CHIPS: Record<TagroContextType, string[]> = {
  project: ['Projektstatus zusammenfassen', 'Offene Entscheidungen erkennen', 'Nächste Aufgaben ableiten', 'Kundenbriefing erstellen', 'Risiken prüfen'],
  task: ['@Teammitglied prüfen lassen', 'Folgeaufgabe erstellen', 'Entscheidung anfordern', 'Status für Kunden formulieren'],
  decision: ['Optionen erstellen', '@Person um Einschätzung bitten', 'Client-safe formulieren', 'In Aufgaben übersetzen'],
  document: ['Zusammenfassen', 'Verbessern', 'Als Aufgabe ableiten', 'Client-safe formulieren'],
  pdf: ['Zusammenfassen', 'Aktionen ableiten', 'Mit Projekt verknüpfen', 'Client-safe formulieren'],
  client: ['Status-Update', 'Offene Themen', 'Nächste Kommunikation'],
  briefing: ['Wochenbericht', 'Executive Briefing', 'Kunden-Update'],
  status_report: ['Aktualisieren', 'Für Kunden zusammenfassen', 'An Team senden'],
  report: ['Kürzer und klarer machen', 'Für Kunden zusammenfassen', 'Risiken hervorheben'],
  note: ['Strukturieren', 'Aufgaben ableiten', 'Mit Projekt verknüpfen'],
  evidence: ['Erklären', 'Mit Report verknüpfen', 'Bestätigen'],
  risk: ['Wahrscheinlichkeit einschätzen', 'Gegenmaßnahme vorschlagen', 'Owner zuweisen'],
  approval: ['Freigabetext formulieren', 'Bedingung definieren', 'Rückfrage stellen'],
  dev_item: ['@Dev Review anfragen', 'Blocker melden', 'Lead-Entscheidung anfordern', 'Client-safe Rückfrage'],
  marketing: ['Performance erklären', 'Budgetentscheidung anfordern', 'Creative Review'],
  empty: ['Projektidee', 'Aufgabe vorbereiten', 'Entscheidung formulieren', 'Briefing erzeugen'],
}

// ── Message model ─────────────────────────────────────────────────────────

type Message =
  | { id: string; role: 'user'; content: string }
  | {
      id: string; role: 'tagro';
      understanding?: string;
      opinion?: string;
      preview?: string;
      warnings?: string[];
      actions?: string[];
    }

function uid() { return Math.random().toString(36).slice(2, 10) }

// Object-specific quick actions appearing under a Tagro answer.
function quickActionsFor(t: TagroContextType): string[] {
  switch (t) {
    case 'project': return ['Aufgaben aus Entwurf anlegen', 'Meilensteine vorbereiten', 'Kundenbriefing erstellen', 'Risiken markieren']
    case 'task': return ['Aufgabe aktualisieren', 'Folgeaufgabe anlegen', 'Akzeptanzkriterien speichern', 'An Verantwortliche senden']
    case 'decision': return ['Entscheidung anlegen', 'Optionen speichern', 'Empfehlung senden', 'Frist setzen']
    case 'document':
    case 'pdf': return ['Zusammenfassung speichern', 'Als Aufgabe erstellen', 'Mit Projekt verknüpfen', 'Client-safe Version']
    case 'client': return ['Kundenupdate erzeugen', 'Status-Briefing', 'Aufgaben anlegen']
    case 'status_report':
    case 'report': return ['Statusbericht aktualisieren', 'Nächste Schritte als Aufgaben', 'Für Kunden vorbereiten']
    case 'dev_item': return ['Review anfragen', 'Blocker anlegen', 'Evidence vorbereiten', 'Status an Lead']
    case 'evidence': return ['Beleg bestätigen', 'Mit Bericht verknüpfen']
    case 'risk': return ['Risiko anlegen', 'Gegenmaßnahme als Aufgabe']
    case 'approval': return ['Freigabe-Vorlage erzeugen', 'An Entscheider senden']
    case 'marketing': return ['Budgetentscheidung', 'Creative Review', 'Kundenupdate']
    case 'briefing': return ['Briefing erzeugen', 'Audio-Briefing', 'PDF exportieren']
    case 'note': return ['Aufgaben ableiten', 'Mit Projekt verknüpfen']
    default: return ['Projekt erstellen', 'Aufgaben anlegen', 'Briefing erzeugen']
  }
}

// ── Initial session builder ───────────────────────────────────────────────
//
// Tagro must never wait for the user to "name" the object — when opened
// from any object/page, the attached context is rendered as an @-mention
// chip above the composer AND an initial Tagro intro line replaces the
// generic question. This helper centralizes all of that copy so every
// surface (overlay, /ai, mobile sheet) speaks the same language.

export type AttachedChip = { kind: 'object' | 'meta'; label: string }

export type InitialSession = {
  mentionLabel: string         // @-style chip pinned to the composer
  introLead: string            // First sentence: "Ich bin in @…"
  introHelp: string            // Second sentence: what Tagro can do next
  chips: AttachedChip[]        // Pinned context chips above the composer
  placeholder: string          // Context-specific composer placeholder
  suggestions: string[]        // Context-specific suggestion grid
}

function objectKind(t: TagroContextType): string {
  switch (t) {
    case 'project': return 'Projekt'
    case 'task': return 'Aufgabe'
    case 'decision': return 'Entscheidung'
    case 'document': return 'Dokument'
    case 'pdf': return 'PDF'
    case 'client': return 'Kunde'
    case 'briefing': return 'Briefing'
    case 'status_report': return 'Statusbericht'
    case 'report': return 'Bericht'
    case 'note': return 'Notiz'
    case 'evidence': return 'Beleg'
    case 'risk': return 'Risiko'
    case 'approval': return 'Freigabe'
    case 'dev_item': return 'Dev'
    case 'marketing': return 'Marketing'
    default: return 'Neu'
  }
}

/** Reads the workspace mode from localStorage without forcing a React
 *  re-render path on every call site. Sessions are derived from ctx, and
 *  ctx changes only when the overlay opens — that's the right cadence
 *  to recompute the language posture. */
function detectWorkspaceMode(): 'client_delivery' | 'internal_company' {
  // The workspace-mode toggle was removed from the UI (it confused more
  // than it helped — Festag has exactly two surfaces: client panel and
  // dev panel). Always use the client-delivery language. The lib stays
  // for a potential future opt-in via Settings.
  return 'client_delivery'
}

export function buildInitialSession(ctx: TagroOpenDetail): InitialSession {
  const t = ctx.contextType
  const kind = objectKind(t)
  const title = (ctx.title || '').trim()
  // "list" / "dev-overview" / "inbox" sentinel IDs mean "the page itself"
  // rather than a real object — treat them as overview contexts.
  const isOverview = !ctx.id || /^(list|inbox|dev-overview|dev-list|dev-plan|dev-updates|dev-inbox|github|dashboard)$/.test(ctx.id)
  const mentionLabel = isOverview && !title ? `@${kind} Übersicht` : `@${kind}${title ? ' ' + title : ''}`

  // Per-context intro + help. Falls back gracefully when title is missing.
  const ref = title || (isOverview ? 'Übersicht' : kind)
  // Workspace-mode flavour: in internal-company mode the help copy avoids
  // 'client-safe' / 'Kunden' phrasing and steers toward team-OS language.
  const mode = detectWorkspaceMode()
  const isInternal = mode === 'internal_company'
  const intro: Record<TagroContextType, { lead: string; help: string }> = {
    project: {
      lead: `Ich bin in @${isInternal ? 'Internes Projekt' : 'Projekt'} ${ref}.`,
      help: isInternal
        ? 'Ich kann den Projektstand zusammenfassen, Blocker erkennen oder nächste Schritte fürs Team ableiten.'
        : 'Ich kann den Projektstatus zusammenfassen, offene Entscheidungen erkennen oder nächste Aufgaben ableiten.',
    },
    task: {
      lead: `Ich bin in @Aufgabe ${ref}.`,
      help: isInternal
        ? 'Sag mir kurz, ob ich daraus eine Folgeaufgabe, Entscheidung, ein Update fürs Team oder eine Nachricht machen soll.'
        : 'Du kannst mir kurz sagen, ob ich daraus eine Folgeaufgabe, Entscheidung, Statusmeldung oder Nachricht machen soll.',
    },
    decision: {
      lead: `Ich bin in @Entscheidung ${ref}.`,
      help: isInternal
        ? 'Ich kann Optionen formulieren, eine Empfehlung vorbereiten oder die Frage fürs Team aufbereiten.'
        : 'Ich kann Optionen formulieren, eine Empfehlung vorbereiten oder die Frage client-safe übersetzen.',
    },
    document: {
      lead: isOverview
        ? `Ich bin in @Dokumente Übersicht.`
        : `Ich bin in @Dokument ${ref}.`,
      help: isOverview
        ? 'Ich kann dir ein Angebot, einen Vertrag, eine Rechnung oder eine Dokumentvorlage vorbereiten.'
        : 'Ich kann das Dokument zusammenfassen, verbessern, Aufgaben ableiten oder es client-safe formulieren.',
    },
    pdf: {
      lead: `Ich bin in @PDF ${ref}.`,
      help: 'Ich kann es zusammenfassen, Aktionen ableiten oder mit einem Projekt verknüpfen.',
    },
    client: {
      lead: isOverview ? 'Ich bin in @Kunden Übersicht.' : `Ich bin bei @Kunde ${ref}.`,
      help: 'Ich kann ein Kundenupdate vorbereiten, offene Themen sammeln oder die nächste Kommunikation formulieren.',
    },
    briefing: {
      lead: `Ich bin in @Briefing ${ref}.`,
      help: 'Ich kann ein Wochenbriefing, ein Executive-Briefing oder ein Kunden-Update vorbereiten.',
    },
    status_report: {
      lead: ref === 'Statusabfrage · Heute' || ref === 'Heute'
        ? 'Ich bin in deiner @Statusabfrage Heute.'
        : `Ich bin in @Statusbericht ${ref}.`,
      help: 'Ich kann den Bericht aktualisieren, kundensicher machen oder nächste Schritte als Aufgaben ableiten.',
    },
    report: {
      lead: `Ich bin in @Bericht ${ref}.`,
      help: 'Ich kann kürzen, für Kunden zusammenfassen oder Risiken hervorheben.',
    },
    note: {
      lead: `Ich bin in @Notiz ${ref}.`,
      help: 'Ich kann strukturieren, Aufgaben ableiten oder mit einem Projekt verknüpfen.',
    },
    evidence: {
      lead: `Ich bin in @Beleg ${ref}.`,
      help: 'Ich kann den Beleg erklären, mit einem Bericht verknüpfen oder bestätigen.',
    },
    risk: {
      lead: isOverview ? 'Ich bin in @Risiken Übersicht.' : `Ich bin in @Risiko ${ref}.`,
      help: 'Ich kann das Risiko einschätzen, eine Gegenmaßnahme vorschlagen oder einen Owner zuweisen.',
    },
    approval: {
      lead: `Ich bin in @Freigabe ${ref}.`,
      help: 'Du kannst freigeben, eine Änderung anfordern oder eine Rückfrage formulieren.',
    },
    dev_item: {
      lead: ctx.id === 'dev-overview'
        ? 'Ich bin im @Dev Panel.'
        : ctx.id === 'github'
          ? 'Ich bin in @GitHub-Aktivität.'
          : `Ich bin in @Dev ${ref}.`,
      help: 'Ich kann deinen heutigen Fokus erstellen, Blocker prüfen, ein Update formulieren oder GitHub-Arbeit zusammenfassen.',
    },
    marketing: {
      lead: `Ich bin in @Marketing ${ref}.`,
      help: 'Ich kann die Performance erklären, eine Budgetentscheidung anfordern oder einen Creative-Review vorbereiten.',
    },
    empty: {
      lead: 'Ich bin Tagro.',
      help: 'Frag mich zu Projekten, Aufgaben, Entscheidungen oder Briefings — oder lass mich etwas vorbereiten.',
    },
  }

  const placeholder: Record<TagroContextType, string> = {
    project: 'Schreib kurz, was Tagro mit diesem Projekt machen soll …',
    task: 'Schreib kurz, was mit dieser Aufgabe passieren soll …',
    decision: 'Schreib kurz, welche Entscheidung vorbereitet werden soll …',
    document: 'Was soll Tagro mit diesem Dokument machen?',
    pdf: 'Was soll Tagro aus diesem PDF ableiten?',
    client: 'Schreib kurz, was bei diesem Kunden anliegt …',
    briefing: 'Welcher Zeitraum, welche Empfänger, welcher Fokus?',
    status_report: 'Was soll Tagro im Statusbericht aktualisieren?',
    report: 'Was soll Tagro mit diesem Bericht machen?',
    note: 'Was soll Tagro aus dieser Notiz machen?',
    evidence: 'Was soll Tagro mit diesem Beleg machen?',
    risk: 'Wie soll Tagro dieses Risiko einschätzen?',
    approval: 'Schreib kurz dein Feedback oder deine Freigabe …',
    dev_item: 'Was soll Tagro aus deinem Dev-Kontext ableiten?',
    marketing: 'Was soll Tagro für dieses Marketing-Element vorbereiten?',
    empty: 'Frag Tagro über Projekte, Tasks, Risiken oder Briefings …',
  }

  // Overview-specific suggestions win for list/overview contexts.
  const overviewSuggestions: Partial<Record<TagroContextType, string[]>> = {
    document: ['Angebot erstellen', 'Vertrag vorbereiten', 'Rechnung erstellen', 'Vorlage anlegen'],
    client: ['Kunde anlegen', 'Status-Update an alle', 'Offene Themen sammeln'],
    risk: ['Risiken priorisieren', 'Gegenmaßnahmen vorschlagen', 'Owner zuweisen'],
    dev_item: ['Heutigen Fokus erstellen', 'Blocker prüfen', 'Update senden', 'GitHub-Stand zusammenfassen'],
  }

  const suggestions = (isOverview && overviewSuggestions[t]) || CTX_CHIPS[t] || CTX_CHIPS.empty

  // Pinned chips above the composer. Subtitle (when present) is pinned as
  // a secondary metadata chip so the user sees full attached context.
  const chips: AttachedChip[] = [{ kind: 'object', label: mentionLabel }]
  if (ctx.subtitle && ctx.subtitle.trim()) {
    chips.push({ kind: 'meta', label: ctx.subtitle.trim() })
  }

  return {
    mentionLabel,
    introLead: intro[t].lead,
    introHelp: intro[t].help,
    chips,
    placeholder: placeholder[t] || placeholder.empty,
    suggestions,
  }
}

// ── Sana-style example cards ──────────────────────────────────────────────

type ExampleItem = {
  title: string
  description: string
  icon: React.ElementType
}

const EXAMPLE_ICONS: React.ElementType[] = [
  EnvelopeSimple, Sun, UsersThree, Briefcase, ChartLine, Scales,
  CheckSquare, Warning, FileText, Lightbulb,
]

function buildExampleItems(suggestions: string[]): ExampleItem[] {
  return suggestions.slice(0, 4).map((title, i) => ({
    title,
    description: '',
    icon: EXAMPLE_ICONS[i % EXAMPLE_ICONS.length],
  }))
}

/** Highlight @-mentions in copy (sana blue links). */
function renderMentionText(text: string) {
  const parts = text.split(/(@[^\s@]+(?:\s+[^\s@.,;:!?]+)?)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="tov-featured-link">{part}</span>
      : part
  )
}

// ── Component ─────────────────────────────────────────────────────────────

export default function TagroOverlay() {
  const [open, setOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [ctx, setCtx] = useState<TagroOpenDetail>({ contextType: 'empty' })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Extra @-attachments added by the user via the picker / @ trigger.
  // Base chips come from the open context (buildInitialSession); these are
  // additive and survive across the whole conversation until removed.
  const [extraAttached, setExtraAttached] = useState<AttachedChip[]>([])
  const [fromScratch, setFromScratch] = useState(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Popup chat vs picker — independent of fullscreen.
  const inConversation = messages.length > 0 || fromScratch

  /** Expand/collapse: popup ↔ fullscreen. Conversation state is preserved. */
  const togglePresentation = useCallback(() => {
    setFullscreen(prev => !prev)
  }, [])

  // Global open event
  useEffect(() => {
    function onOpen(e: Event) {
      const d = (e as CustomEvent<TagroOpenDetail>).detail || { contextType: 'empty' }
      setCtx(d)
      setInput(d.prefill || '')
      setMessages([])
      setError('')
      setExtraAttached([])
      setFromScratch(false)
      setFullscreen(false)
      setOpen(true)
    }
    function onToggleFs() { togglePresentation() }
    window.addEventListener('festag:open-tagro', onOpen as EventListener)
    window.addEventListener('festag:tagro-fullscreen-toggle', onToggleFs as EventListener)
    return () => {
      window.removeEventListener('festag:open-tagro', onOpen as EventListener)
      window.removeEventListener('festag:tagro-fullscreen-toggle', onToggleFs as EventListener)
    }
  }, [togglePresentation])

  // Body scroll lock + Esc + composer focus
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    const t = window.setTimeout(() => composerRef.current?.focus(), 80)
    return () => {
      window.clearTimeout(t); document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Sidebar bridge — app shell collapses its rail while we're fullscreen.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const active = open && fullscreen
    window.dispatchEvent(new CustomEvent('festag:tagro-fullscreen', { detail: { active } }))
    return () => { if (active) window.dispatchEvent(new CustomEvent('festag:tagro-fullscreen', { detail: { active: false } })) }
  }, [open, fullscreen])

  // Mic
  const dictBaseRef = useRef('')
  const [rec, setRec] = useState(false)
  const { supported: micOk, listening: micOn, start: micStart, stop: micStop } = useSpeechRecognition({
    lang: 'de-DE',
    onResult: (text, isFinal) => {
      const combined = (dictBaseRef.current ? dictBaseRef.current + ' ' : '') + text
      setInput(combined); if (isFinal) dictBaseRef.current = combined
    },
    onError: () => setRec(false),
  })
  useEffect(() => { if (!micOn) setRec(false) }, [micOn])
  function toggleMic() {
    if (!micOk) return
    if (rec || micOn) { micStop(); setRec(false); return }
    dictBaseRef.current = input.trim(); setRec(true); micStart()
  }

  function close() {
    setOpen(false); setFullscreen(false); setMessages([]); setInput(''); setError(''); setFromScratch(false)
    if (typeof window !== 'undefined') {
      try { window.dispatchEvent(new CustomEvent('festag:tagro-closed')) } catch {}
    }
  }

  // Auto-scroll to bottom when new messages land.
  useEffect(() => {
    if (!inConversation || messages.length === 0) return
    const el = timelineRef.current; if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, inConversation, busy])

  async function send(textOverride?: string) {
    const value = (textOverride ?? input).trim()
    if (!value || busy) return
    setError('')
    if (messages.length === 0) setFromScratch(true)
    const userMsg: Message = { id: uid(), role: 'user', content: value }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setBusy(true)

    try {
      const r = await fetch('/api/tagro/context/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: ctx.contextType,
          id: ctx.id,
          title: ctx.title,
          subtitle: ctx.subtitle,
          input: value,
          // Attached @-mentions for backend continuity. Current object
          // stays bound across every turn unless the user removes it.
          // Extra picks (from the + picker or @ trigger) ride along too.
          attached: [
            {
              type: ctx.contextType,
              id: ctx.id,
              title: ctx.title,
              label: session.mentionLabel,
            },
            ...extraAttached.map(c => ({ kind: c.kind, label: c.label })),
          ],
          // Prior turns so Tagro keeps short-term memory. Backend trims
          // to the last 8 entries, so the full local timeline is fine.
          history: messages.map(m => m.role === 'user'
            ? { role: 'user' as const, content: m.content }
            : {
                role: 'tagro' as const,
                understanding: m.understanding,
                opinion: m.opinion,
                preview: m.preview,
              }),
        }),
      })
      const data = await r.json().catch(() => null)
      const tagroMsg: Message = {
        id: uid(), role: 'tagro',
        understanding: data?.understanding || `Tagro hat „${value.slice(0, 80)}" verstanden.`,
        opinion: data?.opinion || '',
        preview: data?.preview || value,
        warnings: Array.isArray(data?.warnings) ? data.warnings.filter((w: any) => typeof w === 'string').slice(0, 3) : [],
        actions: quickActionsFor(ctx.contextType),
      }
      setMessages(prev => [...prev, tagroMsg])
    } catch (e: any) {
      const tagroMsg: Message = {
        id: uid(), role: 'tagro',
        understanding: `Tagro ist gerade nicht voll verbunden — der Entwurf basiert auf deiner Eingabe.`,
        preview: value,
        actions: quickActionsFor(ctx.contextType),
      }
      setMessages(prev => [...prev, tagroMsg])
    } finally {
      setBusy(false)
      window.setTimeout(() => composerRef.current?.focus(), 60)
    }
  }

  function runQuickAction(action: string) {
    setInput(action); window.setTimeout(() => send(action), 30)
  }

  function startFromScratch() {
    setFromScratch(true)
    window.setTimeout(() => composerRef.current?.focus(), 80)
  }

  function runExample(title: string) {
    setFromScratch(true)
    window.setTimeout(() => send(title), 60)
  }

  function runFeatured() {
    const prompt = suggestions[0] || introHelp
    runExample(prompt)
  }

  function fillSuggestion(text: string) {
    setInput(text)
    window.setTimeout(() => composerRef.current?.focus(), 40)
  }

  // One source of truth for everything the overlay shows: attached chips,
  // intro lead, intro help, placeholder, suggestions. Computed from the
  // current ctx so opening a task vs. a documents overview always speaks
  // the right language without per-render guesswork.
  const session = useMemo(() => buildInitialSession(ctx), [ctx])
  const { chips: baseChips, introHelp, placeholder, suggestions } = session
  const attachedChips: AttachedChip[] = [...baseChips, ...extraAttached]
  const attachExtra = (c: AttachedChip) =>
    setExtraAttached(prev => prev.some(p => p.label === c.label) ? prev : [...prev, c])
  const removeExtra = (label: string) =>
    setExtraAttached(prev => prev.filter(p => p.label !== label))
  const examples = useMemo(() => buildExampleItems(suggestions), [suggestions])
  const question = CTX_QUESTION[ctx.contextType]
  const contextLine = ctx.title
    ? `${CTX_CHIP[ctx.contextType]} · ${ctx.title}`
    : CTX_CHIP[ctx.contextType]

  if (!open) return null

  const node = (
    <div className={`tov${fullscreen ? ' tov-full' : ''}${inConversation ? ' tov-mode-conversation' : ' tov-mode-initial'}`} role="dialog" aria-modal="true" aria-label="Mit Tagro bearbeiten">
      <div className="tov-backdrop" onClick={fullscreen ? undefined : close} aria-hidden />

      <div className="tov-shell" onClick={e => e.stopPropagation()}>
        {inConversation ? (
          <div className={`tov-workspace${fullscreen ? ' tov-workspace-fs' : ' tov-workspace-compact'}`}>
            {fullscreen && (
              <TagroIconRail variant="inline" onNavigate={() => close()} />
            )}

            <div className={fullscreen ? 'tov-stage-col' : undefined}>
              <div className={fullscreen ? 'tov-stage-card' : 'tov-main'}>
                <header className={fullscreen ? 'tov-stage-head' : 'tov-compact-head'}>
                  {fullscreen ? (
                    <div className="tov-stage-head-copy">
                      <h1 className="tov-stage-title">Tagro</h1>
                      <p className="tov-stage-sub">{contextLine}</p>
                    </div>
                  ) : (
                    <span className="tov-compact-ctx" title={contextLine}>{contextLine}</span>
                  )}
                  <div className="tov-top-controls">
                    <button
                      type="button"
                      className="tov-iconbtn"
                      onClick={togglePresentation}
                      aria-label={fullscreen ? 'Verkleinern' : 'Vergrößern'}
                    >
                      {fullscreen ? <ArrowsIn size={16} weight="bold" /> : <ArrowsOut size={16} weight="bold" />}
                    </button>
                    <button type="button" className="tov-iconbtn" onClick={close} aria-label="Schließen">
                      <X size={16} weight="bold" />
                    </button>
                  </div>
                </header>

                <div className="tov-timeline" ref={timelineRef}>
                  <div className="tov-timeline-inner">
                    {messages.length === 0 && !busy && (
                      <p className="tov-empty-hint">{introHelp}</p>
                    )}
                    {messages.map(m => m.role === 'user'
                      ? <UserMsg key={m.id} content={m.content} />
                      : <TagroMsg key={m.id} msg={m} onAction={runQuickAction} />)}
                    {busy && (
                      <div className="tov-typing-row">
                        <TagroLogo size={fullscreen ? 20 : 18} thinking />
                        <div className="tov-typing"><span /><span /><span /></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="tov-floatbar">
                  <div className="tov-floatbar-inner">
                    <Composer
                      inputRef={composerRef}
                      value={input}
                      onChange={setInput}
                      onSend={() => send()}
                      busy={busy}
                      placeholder={placeholder}
                      micOk={micOk}
                      rec={rec}
                      onMic={toggleMic}
                      variant={fullscreen ? 'sticky' : 'compact'}
                      onAttach={attachExtra}
                      fullscreen={fullscreen}
                      extraShelfChips={extraAttached}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : fullscreen ? (
          <div className="tov-workspace tov-workspace-fs">
            <TagroIconRail variant="inline" onNavigate={() => close()} />
            <div className="tov-stage-col">
              <div className="tov-stage-card tov-stage-card-picker">
                <div className="tov-picker">
                  <div className="tov-picker-view">
                    <div className="tov-picker-card">
                      <div className="tov-picker-top">
                        <button type="button" className="tov-iconbtn" onClick={togglePresentation} aria-label="Verkleinern">
                          <ArrowsIn size={16} weight="bold" />
                        </button>
                        <button type="button" className="tov-iconbtn" onClick={close} aria-label="Schließen"><X size={16} weight="bold" /></button>
                      </div>
                      <h1 className="tov-picker-title">{question}</h1>
                      <AttachedChipsRow chips={attachedChips} baseCount={baseChips.length} onRemove={removeExtra} />
                      <div className="tov-featured">
                        <p className="tov-featured-text">{renderMentionText(introHelp)}</p>
                        <button type="button" className="tov-featured-go" onClick={runFeatured} aria-label="Vorschlag starten">
                          <CaretRight size={16} weight="bold" />
                        </button>
                      </div>
                      <div className="tov-scratch-wrap">
                        <button type="button" className="tov-scratch" onClick={startFromScratch}>
                          Von Grund auf starten <CaretRight size={12} weight="bold" />
                        </button>
                      </div>
                      <div className="tov-examples">
                        <p className="tov-examples-label">Vorschläge</p>
                        <div className="tov-examples-grid">
                          {examples.map(ex => {
                            const Icon = ex.icon
                            return (
                              <button key={ex.title} type="button" className="tov-example" onClick={() => runExample(ex.title)}>
                                <span className="tov-example-ico" aria-hidden><Icon size={15} weight="regular" /></span>
                                <span className="tov-example-label">{ex.title}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      {error && <p className="tov-err">{error}</p>}
                    </div>
                  </div>
                  <div className="tov-picker-footer">
                    <Composer
                      inputRef={composerRef}
                      value={input}
                      onChange={setInput}
                      onSend={() => send()}
                      busy={busy}
                      placeholder={placeholder}
                      micOk={micOk}
                      rec={rec}
                      onMic={toggleMic}
                      variant="hero"
                      onAttach={attachExtra}
                      extraShelfChips={extraAttached}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="tov-picker">
            <div className="tov-picker-view">
              <div className="tov-picker-card">
                <div className="tov-picker-top">
                  <button type="button" className="tov-iconbtn" onClick={togglePresentation} aria-label={fullscreen ? 'Verkleinern' : 'Vergrößern'}>
                    {fullscreen ? <ArrowsIn size={16} weight="bold" /> : <ArrowsOut size={16} weight="bold" />}
                  </button>
                  <button type="button" className="tov-iconbtn" onClick={close} aria-label="Schließen"><X size={16} weight="bold" /></button>
                </div>

                <h1 className="tov-picker-title">{question}</h1>

                <AttachedChipsRow
                  chips={attachedChips}
                  baseCount={baseChips.length}
                  onRemove={removeExtra}
                />

                <div className="tov-featured">
                  <p className="tov-featured-text">{renderMentionText(introHelp)}</p>
                  <button type="button" className="tov-featured-go" onClick={runFeatured} aria-label="Vorschlag starten">
                    <CaretRight size={16} weight="bold" />
                  </button>
                </div>

                <div className="tov-scratch-wrap">
                  <button type="button" className="tov-scratch" onClick={startFromScratch}>
                    Von Grund auf starten <CaretRight size={12} weight="bold" />
                  </button>
                </div>

                <div className="tov-examples">
                  <p className="tov-examples-label">Vorschläge</p>
                  <div className="tov-examples-grid">
                    {examples.map(ex => {
                      const Icon = ex.icon
                      return (
                        <button key={ex.title} type="button" className="tov-example" onClick={() => runExample(ex.title)}>
                          <span className="tov-example-ico" aria-hidden><Icon size={15} weight="regular" /></span>
                          <span className="tov-example-label">{ex.title}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {error && <p className="tov-err">{error}</p>}
              </div>
            </div>

            <div className="tov-picker-footer">
              <Composer
                inputRef={composerRef}
                value={input}
                onChange={setInput}
                onSend={() => send()}
                busy={busy}
                placeholder={placeholder}
                micOk={micOk}
                rec={rec}
                onMic={toggleMic}
                variant="hero"
                onAttach={attachExtra}
                extraShelfChips={extraAttached}
              />
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
    </div>
  )

  return typeof document === 'undefined' ? node : createPortal(node, document.body)
}

// ── Context chips + intro (Festag logic, sana shell) ─────────────────────

function AttachedChipsRow({
  chips,
  baseCount,
  onRemove,
  sticky = false,
}: {
  chips: AttachedChip[]
  baseCount: number
  onRemove?: (label: string) => void
  sticky?: boolean
}) {
  if (!chips.length) return null
  return (
    <div className={`tov-attached${sticky ? ' tov-attached-sticky' : ''}`} role="group" aria-label="Angehängter Kontext">
      {chips.map((c, i) => {
        const isRemovable = !!onRemove && i >= baseCount
        return (
          <span key={`${c.label}-${i}`} className={`tov-attached-chip tov-attached-${c.kind}`}>
            {c.label}
            {isRemovable && (
              <button type="button" className="tov-attached-x" aria-label="Entfernen" onClick={() => onRemove!(c.label)}>
                <X size={10} weight="bold" />
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}

// ── Composer ──────────────────────────────────────────────────────────────

function Composer({
  inputRef, value, onChange, onSend, busy, placeholder, micOk, rec, onMic, variant, onAttach, fullscreen = false,
  extraShelfChips = [],
}: {
  inputRef: React.RefObject<HTMLTextAreaElement>
  value: string
  onChange: (v: string) => void
  onSend: () => void
  busy: boolean
  placeholder: string
  micOk: boolean
  rec: boolean
  onMic: () => void
  variant: 'hero' | 'sticky' | 'compact'
  onAttach?: (chip: AttachedChip) => void
  fullscreen?: boolean
  extraShelfChips?: AttachedChip[]
}) {
  // Auto-grow: keep the textarea exactly one line by default, expand only
  // as the user types more. ChatGPT/Claude pattern.
  function autosize(el: HTMLTextAreaElement | null) {
    if (!el) return
    el.style.height = 'auto'
    const max = 200 // ~8 lines
    el.style.height = Math.min(el.scrollHeight, max) + 'px'
  }

  // People/Sources picker — opens via the + button OR by typing '@' in the
  // textarea (current cursor position). For now this is the picker shell
  // requested by the spec: real categories listed, clear placeholder copy
  // so the user sees something happen (not a dead button). Actual person
  // / object search lands in the next pass — the structure is here.
  const [pickerOpen, setPickerOpen] = useState(false)

  function openPicker() { setPickerOpen(true) }
  function closePicker() { setPickerOpen(false) }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); return }
    // '@' triggers the people/object picker. We don't intercept the
    // character itself — it stays in the input so the user can keep
    // typing the name to filter when the real picker ships.
    if (e.key === '@') setPickerOpen(true)
  }

  return (
    <div className={`tov-composer tov-composer-${variant}`}>
      <div className="tov-composer-stack">
        <div className="tov-composer-panel">
          <textarea
            ref={(el) => {
              if (typeof inputRef === 'function') (inputRef as any)(el)
              else if (inputRef) (inputRef as any).current = el
              autosize(el)
            }}
            className="tov-composer-input"
            rows={1}
            placeholder={placeholder}
            value={value}
            onChange={e => { autosize(e.currentTarget); onChange(e.target.value) }}
            onKeyDown={onKeyDown}
          />
          <div className="tov-composer-toolbar">
            <button
              type="button"
              className="tov-composer-plus"
              aria-label="Quellen hinzufügen"
              title="Quellen hinzufügen"
              onClick={openPicker}
            >
              <Plus size={16} weight="regular" />
            </button>
            <span className="tov-composer-spacer" aria-hidden />
            {micOk && (
              <button type="button" className={`tov-composer-mic${rec ? ' is-rec' : ''}`} onClick={onMic} aria-label={rec ? 'Aufnahme stoppen' : 'Per Sprache diktieren'}>
                {rec ? <MicrophoneSlash size={17} weight="fill" /> : <Microphone size={17} />}
              </button>
            )}
            <button type="button" className="tov-composer-send" onClick={onSend} disabled={busy || !value.trim()} aria-label="Senden">
              {busy ? <ArrowsClockwise size={17} className="tov-spin" /> : <ArrowUp size={17} weight="bold" />}
            </button>
          </div>
        </div>
        {extraShelfChips.length > 0 && (
          <div className="tov-composer-shelf" role="group" aria-label="Zusätzliche Quellen">
            {extraShelfChips.map((c, i) => (
              <span key={`${c.label}-${i}`} className={`tov-shelf-chip tov-shelf-${c.kind}`}>
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {pickerOpen && (
        <PeopleObjectPicker
          onClose={closePicker}
          onPick={(chip) => { onAttach?.(chip); closePicker() }}
          fullscreen={fullscreen}
        />
      )}
    </div>
  )
}

// ── People / Sources / Objects picker shell ───────────────────────────────
//
// Spec calls for this picker to surface: people (@Max), tasks, projects,
// documents, decisions, status reports, clients, dev items. Real search +
// resolution lands in a follow-up — for now the shell renders the
// categories with placeholder copy so the user immediately understands
// "Tagro can pull these in" instead of facing a dead button.

type PickResult = {
  group: 'Projekte' | 'Aufgaben' | 'Entscheidungen' | 'Notizen' | 'Kunden'
  id: string
  title: string
  hint?: string
}

function PeopleObjectPicker({ onClose, onPick, fullscreen = false }: { onClose: () => void; onPick: (chip: AttachedChip) => void; fullscreen?: boolean }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PickResult[]>([])
  const [loading, setLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Autofocus the search box on open — keyboard-first.
  useEffect(() => { searchRef.current?.focus() }, [])

  // Debounced search across the user's workspace. Reuses the same
  // pattern as CommandPalette so results stay consistent. When the
  // query is empty we still fetch a small "recent" set so the picker
  // never opens to a blank list.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = window.setTimeout(async () => {
      try {
        // Lazy import the supabase client so this module stays lean for
        // server-side rendering paths.
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient() as any
        const term = q.trim()
        const like = term ? `%${term.replace(/[%_]/g, '\\$&')}%` : null
        const projectsQ = like
          ? sb.from('projects').select('id,title,status').ilike('title', like).limit(6)
          : sb.from('projects').select('id,title,status').order('updated_at', { ascending: false }).limit(6)
        const tasksQ = like
          ? sb.from('tasks').select('id,title,project_id,status').ilike('title', like).limit(6)
          : sb.from('tasks').select('id,title,project_id,status').order('updated_at', { ascending: false }).limit(6)
        const decisionsQ = like
          ? sb.from('decisions').select('id,title,status').ilike('title', like).limit(4)
          : sb.from('decisions').select('id,title,status').order('updated_at', { ascending: false }).limit(4)
        const clientsQ = like
          ? sb.from('clients').select('id,name').ilike('name', like).limit(4)
          : sb.from('clients').select('id,name').order('updated_at', { ascending: false }).limit(4)
        const notesQ = like
          ? sb.from('relations_notes').select('id,title,content').or(`title.ilike.${like},content.ilike.${like}`).limit(4)
          : sb.from('relations_notes').select('id,title,content').order('updated_at', { ascending: false }).limit(4)
        const [projects, tasks, decisions, clients, notes] = await Promise.all([
          projectsQ.then((r: any) => r).catch(() => ({ data: [] })),
          tasksQ.then((r: any) => r).catch(() => ({ data: [] })),
          decisionsQ.then((r: any) => r).catch(() => ({ data: [] })),
          clientsQ.then((r: any) => r).catch(() => ({ data: [] })),
          notesQ.then((r: any) => r).catch(() => ({ data: [] })),
        ])
        if (cancelled) return
        const out: PickResult[] = []
        ;(projects.data || []).forEach((p: any) => out.push({ group: 'Projekte', id: p.id, title: p.title, hint: p.status }))
        ;(tasks.data || []).forEach((t: any) => out.push({ group: 'Aufgaben', id: t.id, title: t.title, hint: t.status }))
        ;(decisions.data || []).forEach((d: any) => out.push({ group: 'Entscheidungen', id: d.id, title: d.title, hint: d.status }))
        ;(clients.data || []).forEach((c: any) => out.push({ group: 'Kunden', id: c.id, title: c.name }))
        ;(notes.data || []).forEach((n: any) => out.push({ group: 'Notizen', id: n.id, title: n.title || (n.content || '').slice(0, 60) }))
        setResults(out)
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 180)
    return () => { cancelled = true; window.clearTimeout(t) }
  }, [q])

  function pickResult(r: PickResult) {
    const kindLabel = r.group === 'Projekte' ? 'Projekt'
      : r.group === 'Aufgaben' ? 'Aufgabe'
      : r.group === 'Entscheidungen' ? 'Entscheidung'
      : r.group === 'Kunden' ? 'Kunde'
      : 'Notiz'
    onPick({ kind: 'object', label: `@${kindLabel} ${r.title}` })
  }

  // Group results for rendering.
  const groups = useMemo(() => {
    const map = new Map<string, PickResult[]>()
    for (const r of results) {
      if (!map.has(r.group)) map.set(r.group, [])
      map.get(r.group)!.push(r)
    }
    return Array.from(map.entries())
  }, [results])

  return (
    <div className={`tov-pick${fullscreen ? ' tov-pick-full' : ''}`} role="dialog" aria-label="Quellen und Personen hinzufügen">
      <div className="tov-pick-backdrop" onClick={onClose} aria-hidden />
      <div className="tov-pick-sheet" onClick={e => e.stopPropagation()}>
        <div className="tov-pick-searchbar">
          <MagnifyingGlass size={16} weight="regular" />
          <input
            ref={searchRef}
            type="text"
            className="tov-pick-search"
            placeholder="Projekte, Aufgaben, Entscheidungen, Kunden …"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <div className="tov-pick-results">
          {loading && results.length === 0 && (
            <p className="tov-pick-empty">Lade …</p>
          )}
          {!loading && results.length === 0 && (
            <p className="tov-pick-empty">Nichts gefunden{q ? ` für „${q}"` : ''}.</p>
          )}
          {groups.map(([group, items]) => (
            <div key={group} className="tov-pick-group">
              {items.map(r => (
                <button key={`${group}-${r.id}`} type="button" className="tov-pick-result" onClick={() => pickResult(r)}>
                  <span className="tov-pick-result-ico" aria-hidden>
                    {group === 'Projekte' ? <Briefcase size={14} />
                      : group === 'Aufgaben' ? <CheckSquare size={14} />
                      : group === 'Entscheidungen' ? <Scales size={14} />
                      : group === 'Kunden' ? <UsersThree size={14} />
                      : <FileText size={14} />}
                  </span>
                  <span className="tov-pick-result-body">
                    <strong>{r.title}</strong>
                    {r.hint && <span>{r.hint}</span>}
                    {group === 'Projekte' && <em className="tov-pick-tag">/Projekt</em>}
                    {group === 'Kunden' && <em className="tov-pick-tag tov-pick-tag-purple">#Kunde</em>}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="tov-pick-footer">
          <button type="button" className="tov-pick-sources"><Stack size={13} /> Quellen</button>
          <div className="tov-pick-footer-actions">
            <button type="button" aria-label="Kopieren"><Copy size={14} /></button>
            <button type="button" aria-label="Gut"><ThumbsUp size={14} /></button>
            <button type="button" aria-label="Schlecht"><ThumbsDown size={14} /></button>
            <button type="button" aria-label="Vorlesen"><SpeakerHigh size={14} /></button>
          </div>
        </div>
        <button type="button" className="tov-pick-close" onClick={onClose} aria-label="Schließen"><X size={14} /></button>
      </div>
    </div>
  )
}

// ── Messages ──────────────────────────────────────────────────────────────

function UserMsg({ content }: { content: string }) {
  return (
    <div className="tov-msg tov-msg-user">
      <div className="tov-msg-user-bubble"><p>{content}</p></div>
      <span className="tov-msg-user-avatar" aria-hidden><User size={14} weight="fill" /></span>
    </div>
  )
}

function TagroMsg({
  msg, onAction,
}: {
  msg: Extract<Message, { role: 'tagro' }>
  onAction: (a: string) => void
}) {
  return (
    <div className="tov-msg tov-msg-tagro">
      <div className="tov-msg-tagro-head">
        <TagroLogo size={18} />
        {msg.understanding && (
          <p className="tov-msg-text tov-msg-lead">{msg.understanding}</p>
        )}
      </div>
      {msg.opinion && (
        <p className="tov-msg-text">{msg.opinion}</p>
      )}
      {msg.preview && (
        <div className="tov-msg-preview">{msg.preview}</div>
      )}
      {msg.warnings && msg.warnings.length > 0 && (
        <div className="tov-warnings">
          {msg.warnings.map((w, i) => <p key={i} className="tov-warning">{w}</p>)}
        </div>
      )}
      {msg.actions && msg.actions.length > 0 && (
        <div className="tov-quickactions">
          {msg.actions.map(a => (
            <button key={a} type="button" className="tov-quickaction" onClick={() => onAction(a)}>{a}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Global styles (raw CSS so [data-theme="dark"] cascades properly) ──────

const STYLES = `
:root {
  --tov-bg: #FFFFFF;
  --tov-bg-2: #F3F3F1;
  --tov-canvas: #ECECEA;
  --tov-input: #F5F5F3;
  --tov-input-2: #EBEBE9;
  --tov-text: #111111;
  --tov-text-2: #5C5C5C;
  --tov-muted: #9A9A9A;
  --tov-border: rgba(0,0,0,0.06);
  --tov-border-2: rgba(0,0,0,0.10);
  --tov-send: #111111;
  --tov-send-text: #FFFFFF;
  --tov-shadow: 0 24px 64px -24px rgba(15,23,42,0.18), 0 2px 12px rgba(15,23,42,0.04);
  --tov-backdrop: rgba(20,22,28,0.22);
  --tov-link: #2563EB;
  --tov-pill: rgba(0,0,0,0.04);
  --tov-pill-h: rgba(0,0,0,0.07);
  --tov-warn-bg: rgba(245,158,11,0.10);
  --tov-warn-bar: rgba(245,158,11,0.55);
  --tov-source-green: #E8F5EE;
  --tov-source-blue: #E8EEF8;
}
[data-theme="dark"], [data-theme="classic-dark"] {
  --tov-bg: #111111;
  --tov-bg-2: #1A1A1A;
  --tov-canvas: #0A0A0A;
  --tov-input: #1A1A1A;
  --tov-input-2: #222222;
  --tov-text: #F4F4F4;
  --tov-text-2: #A3A3A3;
  --tov-muted: #737373;
  --tov-border: rgba(255,255,255,0.06);
  --tov-border-2: rgba(255,255,255,0.10);
  --tov-send: #F4F4F4;
  --tov-send-text: #050505;
  --tov-shadow: 0 24px 64px -24px rgba(0,0,0,0.65);
  --tov-backdrop: rgba(0,0,0,0.55);
  --tov-pill: rgba(255,255,255,0.05);
  --tov-pill-h: rgba(255,255,255,0.09);
}

/* Stage */
.tov {
  position: fixed; inset: 0; z-index: 16000;
  display: flex; align-items: center; justify-content: center;
  padding: 48px;
  font-family: var(--font-aeonik, 'Aeonik', Inter, -apple-system, sans-serif);
  color: var(--tov-text);
  animation: tov-in .22s ease both;
  transition: padding .35s cubic-bezier(.16,1,.3,1);
}
.tov.tov-full {
  padding: 0;
  justify-content: stretch; align-items: stretch;
}
@media (max-width: 720px) { .tov.tov-full { padding: 0; align-items: stretch; } }

.tov-backdrop {
  position: absolute; inset: 0;
  background: var(--tov-backdrop);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
}
.tov.tov-full .tov-backdrop { display: none; }

.tov-shell {
  position: relative;
  width: min(680px, calc(100vw - 28px));
  max-height: min(92vh, 880px);
  min-height: min(68vh, 660px);
  background: var(--tov-bg);
  border: 0;
  border-radius: 20px;
  box-shadow: var(--tov-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: tov-up .32s cubic-bezier(.16,1,.3,1) both;
  transition: width .35s cubic-bezier(.16,1,.3,1), height .35s cubic-bezier(.16,1,.3,1), max-height .35s cubic-bezier(.16,1,.3,1), border-radius .35s, box-shadow .35s;
}
.tov.tov-full .tov-shell {
  width: 100%; max-width: none; max-height: none;
  height: 100%; border-radius: 0; box-shadow: none;
  background: transparent;
}
.tov.tov-mode-conversation:not(.tov-full) .tov-shell {
  width: min(680px, calc(100vw - 28px));
  height: min(78vh, 800px);
  max-height: min(78vh, 800px);
  min-height: min(52vh, 520px);
  display: flex;
  flex-direction: column;
}
.tov.tov-mode-initial:not(.tov-full) .tov-shell {
  min-height: min(68vh, 660px);
}

/* ── Task picker (sana modal + Festag context) ── */
.tov-picker {
  flex: 1; min-height: 0;
  display: flex; flex-direction: column;
  background: var(--tov-bg);
}
.tov-picker-view {
  flex: 1; min-height: 0; overflow-y: auto;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 28px 32px 20px;
}
.tov-picker-footer {
  flex: 0 0 auto;
  padding: 6px 28px max(22px, env(safe-area-inset-bottom, 0px));
  border-top: 0;
  background: var(--tov-bg);
}
.tov-picker-footer .tov-composer { max-width: 100%; margin: 0 auto; }
.tov-picker-card {
  width: 100%; max-width: 100%;
  position: relative;
}
.tov-picker-top {
  display: flex; justify-content: flex-end; gap: 8px;
  margin-bottom: 8px;
  position: sticky; top: 0; z-index: 2;
  background: var(--tov-bg);
  padding: 4px 0 8px;
}
.tov-picker-title {
  margin: 0 0 22px;
  text-align: center;
  font-size: 22px; font-weight: 600; letter-spacing: -.02em;
  line-height: 1.28; color: var(--tov-text);
  text-wrap: balance;
}
.tov-featured {
  display: flex; align-items: center; gap: 14px;
  background: var(--tov-bg-2);
  border: 1px solid var(--tov-border);
  border-radius: 6px;
  padding: 14px 16px;
  margin-bottom: 18px;
}
.tov-featured-text {
  flex: 1; margin: 0;
  font-size: 13.5px; line-height: 1.5; color: var(--tov-text-2);
}
.tov-featured-link { color: var(--tov-link); font-weight: 500; }
.tov-featured-go {
  flex: 0 0 auto;
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-send); color: var(--tov-send-text);
  border: 0; border-radius: 999px; cursor: pointer;
  transition: opacity .12s, transform .12s;
}
.tov-featured-go:hover { opacity: .9; transform: scale(1.03); }

/* Attached @-context chips */
.tov-attached {
  width: 100%;
  display: flex; flex-wrap: wrap; gap: 6px;
  margin: 0 0 16px;
  justify-content: center;
}
.tov-picker-card .tov-attached { margin: 0 0 18px; }
.tov-attached-sticky {
  justify-content: flex-start;
  margin: 0 0 10px;
  padding: 0 2px;
}
.tov-attached-chip {
  display: inline-flex; align-items: center; gap: 4px;
  height: 26px; padding: 0 11px;
  font-size: 12px; font-weight: 500; letter-spacing: .01em;
  border-radius: 999px;
  white-space: nowrap;
}
.tov-attached-object {
  background: #5B647D; color: #FFFFFF;
}
.tov-attached-meta {
  background: transparent;
  color: var(--tov-text-2);
  border: 1px solid var(--tov-border);
}
.tov-attached-x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; margin-left: 2px;
  border: 0; border-radius: 999px;
  background: rgba(255,255,255,0.18); color: inherit;
  cursor: pointer; opacity: .8;
  transition: opacity .12s, background .12s;
}
.tov-attached-x:hover { opacity: 1; background: rgba(255,255,255,0.3); }
.tov-attached-meta .tov-attached-x { background: var(--tov-pill); }
.tov-attached-meta .tov-attached-x:hover { background: var(--tov-pill-h); }

.tov-chips { width: 100%; margin-top: 8px; }
.tov-chips-label {
  margin: 0 0 10px;
  font-size: 11px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--tov-muted);
}
.tov-chips-grid { display: grid; gap: 8px; grid-template-columns: 1fr 1fr; }
@media (max-width: 640px) { .tov-chips-grid { grid-template-columns: 1fr; } }
.tov-chip {
  display: flex; align-items: center; text-align: left;
  background: var(--tov-bg-2);
  color: var(--tov-text);
  border: 1px solid var(--tov-border);
  border-radius: 14px;
  padding: 12px 14px;
  font: inherit; font-size: 13.5px; font-weight: 500; line-height: 1.4;
  cursor: pointer;
  transition: background .12s, border-color .12s, transform .12s;
}
.tov-chip:hover { background: var(--tov-pill); border-color: var(--tov-border-2); }
.tov-chip:active { transform: scale(.99); }

/* Empty fullscreen chat */
.tov-empty-hint {
  margin: 0;
  padding: 28px 0 12px;
  text-align: center;
  font-size: 14px; line-height: 1.55;
  color: var(--tov-text-2);
  max-width: 480px;
  align-self: center;
}

.tov.tov-full:not(.tov-mode-conversation) .tov-shell {
  background: var(--tov-bg);
}
.tov.tov-full.tov-mode-initial .tov-picker {
  min-height: 100%;
}
.tov.tov-full.tov-mode-initial .tov-picker-view {
  padding: 40px 32px 24px;
  align-items: flex-start;
  justify-content: center;
}
.tov.tov-full.tov-mode-initial .tov-picker-card {
  max-width: 640px;
}
.tov.tov-full.tov-mode-initial .tov-picker-footer {
  padding: 12px 32px max(28px, env(safe-area-inset-bottom, 0px));
}
.tov.tov-full.tov-mode-initial .tov-picker-footer .tov-composer {
  max-width: 640px;
}
.tov-scratch-wrap {
  display: flex; justify-content: center;
  width: 100%;
}
.tov-scratch {
  display: inline-flex; align-items: center; gap: 4px;
  margin: 0 0 22px;
  padding: 7px 12px;
  background: var(--tov-bg-2);
  color: var(--tov-text-2);
  border: 1px solid var(--tov-border);
  border-radius: 6px;
  font: inherit; font-size: 13px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.tov-scratch:hover { background: var(--tov-pill-h); color: var(--tov-text); }

.tov-examples {
  margin-top: 2px;
}
.tov-examples-label {
  margin: 0 0 8px;
  font-size: 11px; font-weight: 500; color: var(--tov-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.tov-examples-grid {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
@media (max-width: 560px) {
  .tov-examples-grid { grid-template-columns: 1fr; }
}
.tov-example {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  box-sizing: border-box;
  text-align: left;
  background: color-mix(in srgb, var(--tov-bg-2) 90%, var(--tov-bg));
  color: var(--tov-text-2);
  border: 1px solid var(--tov-border);
  border-radius: 6px;
  font: inherit;
  cursor: pointer;
  transition: background .12s ease, border-color .12s ease, color .12s ease;
}
.tov-example:hover {
  background: var(--tov-pill-h);
  border-color: color-mix(in srgb, var(--tov-text) 12%, var(--tov-border));
  color: var(--tov-text);
  border-radius: 6px;
}
.tov-example:active { transform: scale(0.995); }
.tov-example-ico {
  flex: 0 0 auto;
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-bg);
  border: 1px solid var(--tov-border);
  border-radius: 6px;
  color: var(--tov-muted);
  transition: color .12s ease, border-color .12s ease;
}
.tov-example:hover .tov-example-ico {
  color: var(--tov-text-2);
  border-color: color-mix(in srgb, var(--tov-text) 8%, var(--tov-border));
}
.tov-example-label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.35;
  letter-spacing: -.01em;
}

/* ── Workspace layout ── */
.tov-workspace {
  flex: 1; min-height: 0;
  display: flex; flex-direction: row;
  height: 100%;
  overflow: hidden;
  background: var(--tov-canvas);
}

/* Fullscreen — mirrors PortalAppShell: canvas + rail + card */
.tov.tov-full {
  --tov-canvas: #F6F6F7;
  --tov-bg: #FFFFFF;
  --tov-border: rgba(0, 0, 0, 0.06);
  --tov-input: #F5F5F3;
}
[data-theme="dark"] .tov.tov-full,
[data-theme="classic-dark"] .tov.tov-full {
  --tov-canvas: #0a0a0b;
  --tov-bg: #141416;
  --tov-border: rgba(255, 255, 255, 0.08);
  --tov-input: #1a1a1a;
}
.tov-workspace-fs {
  background: var(--tov-canvas);
  padding: 8px 8px 8px 0;
  box-sizing: border-box;
  gap: 0;
}
.tov-workspace-fs .tir-rail-inline {
  background: transparent;
  border-right: none;
}
.tov-stage-col {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.tov-stage-card {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: var(--tov-bg);
  border-radius: 12px;
  border: 1px solid var(--tov-border);
  overflow: hidden;
  box-shadow: none;
}
.tov-stage-card-picker {
  display: flex;
  flex-direction: column;
  grid-template-rows: unset;
}
.tov-stage-card-picker .tov-picker {
  flex: 1;
  min-height: 0;
}
.tov-stage-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: clamp(22px, 3.2vh, 36px) clamp(28px, 4vw, 52px) 18px;
  border-bottom: 1px solid var(--tov-border);
  flex-shrink: 0;
}
.tov-stage-head-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tov-stage-title {
  margin: 0;
  font-size: clamp(22px, 2.4vw, 28px);
  font-weight: 400;
  letter-spacing: -.02em;
  line-height: 1.15;
  color: var(--tov-text);
}
.tov-stage-sub {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--tov-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tov.tov-full .tov-timeline {
  padding: 12px clamp(28px, 4vw, 52px) 28px;
}
.tov.tov-full .tov-timeline-inner {
  max-width: min(720px, 100%);
  margin: 0 auto;
  gap: 36px;
  padding-top: 4px;
  padding-bottom: 8px;
}
.tov.tov-full .tov-floatbar {
  padding: 16px clamp(28px, 4vw, 52px) max(24px, env(safe-area-inset-bottom, 0px));
  background: var(--tov-bg);
  border-top: 1px solid var(--tov-border);
}
.tov.tov-full .tov-floatbar-inner {
  max-width: min(720px, 100%);
  margin: 0 auto;
}
.tov.tov-full .tov-empty-hint {
  padding: 32px 0 16px;
  text-align: left;
  max-width: 560px;
}
.tov.tov-full .tov-msg-user {
  max-width: min(480px, 78%);
}
.tov.tov-full .tov-msg-tagro {
  gap: 12px;
  max-width: min(680px, 100%);
}
.tov.tov-full .tov-quickactions {
  padding-left: 0;
  gap: 8px;
  margin-top: 2px;
}
.tov.tov-full .tov-msg-preview {
  border: none;
  background: var(--tov-bg-2);
}
.tov.tov-full .tov-warning {
  border-radius: 10px;
}

/* Compact popup chat — same shell as picker, conversation inside */
.tov-workspace-compact {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.tov-workspace-compact .tov-main {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
}
.tov-compact-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--tov-border);
  flex-shrink: 0;
}
.tov-compact-ctx {
  font-size: 12px;
  font-weight: 500;
  color: var(--tov-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
  letter-spacing: -.01em;
}
.tov-workspace-compact .tov-timeline {
  padding: 10px 14px 6px;
}
.tov-workspace-compact .tov-timeline-inner {
  gap: 14px;
  max-width: none;
  padding-top: 0;
}
.tov-workspace-compact .tov-msg-user {
  max-width: 92%;
}
.tov-workspace-compact .tov-msg-user-bubble {
  font-size: 13.5px;
  padding: 9px 12px;
  border-radius: 14px 14px 4px 14px;
}
.tov-workspace-compact .tov-msg-user-avatar {
  width: 24px; height: 24px;
}
.tov-workspace-compact .tov-msg-text {
  font-size: 13.5px;
}
.tov-workspace-compact .tov-msg-preview {
  font-size: 13px;
  padding: 10px 12px;
  border-radius: 12px;
}
.tov-workspace-compact .tov-quickactions {
  padding-left: 0;
  gap: 6px;
}
.tov-workspace-compact .tov-quickaction {
  height: 28px;
  font-size: 12px;
  padding: 0 10px;
}
.tov-workspace-compact .tov-floatbar {
  padding: 0 14px max(12px, env(safe-area-inset-bottom, 0px));
  background: linear-gradient(to top, var(--tov-bg) 85%, transparent);
}
.tov-workspace-compact .tov-floatbar-inner {
  max-width: none;
}
.tov-workspace-compact .tov-empty-hint {
  padding: 16px 4px 8px;
  font-size: 13px;
  text-align: left;
  align-self: stretch;
}
.tov-composer-compact .tov-composer-panel {
  border-radius: 20px;
}
.tov-composer-compact .tov-composer-input {
  font-size: 14px;
  min-height: 36px;
  padding: 12px 14px 2px;
}
.tov-composer-compact .tov-composer-toolbar {
  padding: 2px 8px 8px;
}
.tov-stage-card-picker .tov-picker-view {
  padding: clamp(20px, 3vh, 32px) clamp(28px, 4vw, 48px) 16px;
}
.tov-stage-card-picker .tov-picker-footer {
  padding: 8px clamp(28px, 4vw, 48px) max(24px, env(safe-area-inset-bottom, 0px));
}
.tov-main {
  flex: 1; min-width: 0; min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
}

/* Top bar controls (shared) */
.tov-top-controls { display: inline-flex; gap: 8px; flex-shrink: 0; align-items: center; }
.tov-iconbtn {
  width: 36px; height: 36px;
  min-width: 36px; min-height: 36px;
  padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-pill); color: var(--tov-text-2);
  border: 0; border-radius: 50%; cursor: pointer;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
  transition: background .14s, color .14s, transform .12s;
}
.tov-iconbtn:hover { background: var(--tov-pill-h); color: var(--tov-text); }
.tov-iconbtn:active { transform: scale(.96); }

/* Composer — stacked panel + context shelf */
.tov-composer {
  width: 100%;
}
.tov-composer-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
}
.tov-composer-panel {
  position: relative;
  z-index: 2;
  background: var(--tov-input);
  border: none !important;
  outline: none;
  border-radius: 20px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 8px 28px rgba(0, 0, 0, 0.07);
  overflow: hidden;
  transition: box-shadow .18s ease;
}
[data-theme="dark"] .tov-composer-panel,
[data-theme="classic-dark"] .tov-composer-panel {
  background: var(--tov-input);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 4px 24px rgba(0, 0, 0, 0.38);
}
.tov-composer-panel:focus-within {
  border: none !important;
  outline: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 2px 4px rgba(0, 0, 0, 0.05),
    0 12px 36px rgba(0, 0, 0, 0.1);
}
[data-theme="dark"] .tov-composer-panel:focus-within,
[data-theme="classic-dark"] .tov-composer-panel:focus-within {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.09),
    0 6px 32px rgba(0, 0, 0, 0.45);
}
.tov-composer-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 0; outline: 0; resize: none; background: transparent;
  color: var(--tov-text); font: inherit;
  font-size: 15px; line-height: 1.45;
  min-height: 24px; max-height: 160px;
  padding: 14px 16px 2px;
  overflow-y: auto;
}
.tov-composer-hero .tov-composer-input {
  min-height: 22px;
  padding: 13px 16px 0;
}
.tov-composer-hero .tov-composer-panel {
  border-radius: 24px;
}
.tov-composer-hero .tov-composer-toolbar {
  padding: 6px 10px 10px;
}
.tov-composer-input::placeholder { color: var(--tov-muted); }
.tov-composer-toolbar {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 10px 10px;
}
.tov-composer-plus {
  flex: 0 0 auto;
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; color: var(--tov-text-2);
  border: 0; border-radius: 8px;
  cursor: pointer;
  transition: background .14s, color .14s;
}
.tov-composer-plus:hover { background: var(--tov-pill); color: var(--tov-text); }
.tov-composer-spacer { flex: 1 1 auto; min-width: 4px; }
.tov-composer-mic {
  flex: 0 0 auto; width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; color: var(--tov-text-2);
  border: 0; border-radius: 8px; cursor: pointer;
  transition: background .14s, color .14s;
}
.tov-composer-mic:hover { background: var(--tov-pill); color: var(--tov-text); }
.tov-composer-mic.is-rec { animation: tov-pulse 1.4s ease-in-out infinite; }
.tov-composer-send {
  flex: 0 0 auto; width: 34px; height: 34px;
  min-width: 34px; min-height: 34px;
  border: 0; border-radius: 50%;
  background: var(--tov-send); color: var(--tov-send-text);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: opacity .12s, transform .12s;
}
.tov-composer-send:hover:not(:disabled) { opacity: .9; }
.tov-composer-send:disabled { opacity: .35; cursor: not-allowed; }
.tov-composer-shelf {
  position: relative;
  z-index: 1;
  margin-top: -4px;
  padding: 12px 12px 8px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  background: color-mix(in srgb, var(--tov-bg-2) 88%, transparent);
  border: none;
  border-radius: 0 0 20px 20px;
}
.tov-shelf-chip {
  display: inline-flex; align-items: center;
  height: 26px; padding: 0 10px;
  border-radius: 8px;
  font-size: 12px; font-weight: 500;
  color: var(--tov-text-2);
  white-space: nowrap;
}
.tov-shelf-object {
  background: #5B647D; color: #fff; border-radius: 999px;
}
.tov-shelf-meta {
  background: transparent; color: var(--tov-muted);
}

/* Timeline / chat */
.tov-timeline {
  overflow-y: auto;
  min-height: 0;
  padding: 8px 32px 24px;
}
.tov-timeline-inner {
  max-width: 760px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 28px;
  min-height: 100%;
  justify-content: flex-start;
  padding-top: 8px;
}
.tov.tov-full .tov-timeline-inner {
  max-width: 820px;
  padding-top: 16px;
  padding-bottom: 12px;
}

.tov-msg { animation: tov-fadeup .25s ease both; }
.tov-msg-user {
  display: flex; align-items: flex-start; justify-content: flex-end;
  gap: 10px; align-self: flex-end; max-width: 85%;
}
.tov-msg-user-bubble {
  padding: 12px 16px;
  background: var(--tov-input);
  border-radius: 18px 18px 4px 18px;
  font-size: 14.5px; line-height: 1.55;
}
.tov-msg-user-bubble p { margin: 0; }
.tov-msg-user-avatar {
  flex: 0 0 auto;
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-bg-2);
  border-radius: 999px; color: var(--tov-text-2);
  margin-top: 2px;
}

.tov-msg-tagro {
  display: flex; flex-direction: column; gap: 12px;
  max-width: 100%; align-self: flex-start;
}
.tov-msg-tagro-head {
  display: flex; align-items: flex-start; gap: 10px;
}
.tov-msg-text { margin: 0; font-size: 15px; line-height: 1.6; color: var(--tov-text-2); }
.tov-msg-lead { color: var(--tov-text); font-weight: 500; }

.tov-source-pills { display: flex; flex-wrap: wrap; gap: 8px; padding-left: 28px; }
.tov-source-pill {
  display: inline-flex; align-items: center; gap: 6px;
  height: 30px; padding: 0 12px;
  font-size: 12.5px; font-weight: 500;
  border-radius: 999px;
  border: 1px solid var(--tov-border);
  background: var(--tov-bg);
}
.tov-source-pill-0 { background: var(--tov-source-green); border-color: transparent; }
.tov-source-pill-1 { background: var(--tov-source-blue); border-color: transparent; }

.tov-msg-preview {
  margin: 0; padding: 14px 16px;
  background: var(--tov-bg-2);
  border: 1px solid var(--tov-border);
  border-radius: 14px;
  font-size: 14.5px; line-height: 1.6;
  white-space: pre-wrap;
}
.tov-warnings { display: flex; flex-direction: column; gap: 6px; }
.tov-warning {
  margin: 0; padding: 10px 12px;
  background: var(--tov-warn-bg);
  box-shadow: inset 3px 0 0 var(--tov-warn-bar);
  border-radius: 8px;
  font-size: 12.5px; line-height: 1.5; font-weight: 500;
}
.tov-quickactions { display: flex; flex-wrap: wrap; gap: 8px; padding-left: 0; }
.tov-quickaction {
  border: 1px solid var(--tov-border);
  border-radius: 999px;
  height: 32px; padding: 0 13px;
  background: var(--tov-bg);
  color: var(--tov-text);
  font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: background .12s;
}
.tov-quickaction:hover { background: var(--tov-pill); }

.tov-typing-row {
  display: flex; align-items: center; gap: 10px;
}
.tov-typing {
  display: inline-flex; gap: 5px;
  padding: 10px 14px;
  background: var(--tov-input);
  border-radius: 16px;
  width: fit-content;
}
.tov-typing span {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--tov-muted);
  animation: tov-typing 1.2s ease-in-out infinite;
}
.tov-typing span:nth-child(2) { animation-delay: .15s; }
.tov-typing span:nth-child(3) { animation-delay: .3s; }

/* Floating bottom bar (sana) */
.tov-floatbar {
  flex: 0 0 auto;
  padding: 0 24px max(20px, env(safe-area-inset-bottom, 0px));
  background: linear-gradient(to top, var(--tov-bg) 70%, transparent);
}
.tov-floatbar-inner {
  max-width: 720px; margin: 0 auto;
}
.tov.tov-full .tov-floatbar-inner { max-width: 760px; }

/* ── /ai agent surface (sana screenshots 3 + 4) ── */
.tov.tov-agent {
  padding: 0;
  justify-content: stretch; align-items: stretch;
}
.tov.tov-agent .tov-shell {
  width: 100%; max-width: none; max-height: none;
  height: 100%; border-radius: 0; box-shadow: none;
  background: var(--tov-bg);
}
.tov-agent-top {
  display: flex; justify-content: flex-end;
  padding: 12px 16px 0;
  position: absolute; top: 0; right: 0; z-index: 2;
  pointer-events: none;
}
.tov-agent-top .tov-top-controls { pointer-events: auto; }
.tov-agent-close {
  pointer-events: auto;
  width: 36px; height: 36px;
  min-width: 36px; min-height: 36px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-pill); color: var(--tov-text-2);
  border: 0; border-radius: 50%; cursor: pointer;
  transition: background .14s, color .14s;
}
.tov-agent-close:hover { background: var(--tov-pill-h); color: var(--tov-text); }
.tov-agent-empty {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  min-height: min(48vh, 420px);
  opacity: .35;
}
.tov.tov-agent .tov-timeline {
  display: flex; flex-direction: column;
  padding-top: 48px;
}
.tov.tov-agent .tov-timeline-inner {
  flex: 1; display: flex; flex-direction: column;
}
.tov.tov-agent .tov-floatbar {
  padding-bottom: max(28px, env(safe-area-inset-bottom, 0px));
}

.tov-err { margin: 12px 0 0; color: #ef4444; font-size: 12.5px; text-align: center; }

/* Search picker (sana screenshot 4) */
.tov-pick {
  position: fixed; inset: 0; z-index: 16100;
  display: flex; align-items: center; justify-content: center;
  animation: tov-in .14s ease both;
  padding: 24px;
}
.tov-pick-full { align-items: center; }
.tov-pick-backdrop {
  position: absolute; inset: 0;
  background: rgba(8,10,14,0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.tov-pick-sheet {
  position: relative;
  width: min(680px, calc(100vw - 48px));
  max-height: min(72vh, 640px);
  background: var(--tov-bg);
  border: 1px solid var(--tov-border);
  border-radius: 20px;
  box-shadow: var(--tov-shadow);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: tov-up .2s cubic-bezier(.16,1,.3,1) both;
}
.tov-pick-searchbar {
  display: flex; align-items: center; gap: 10px;
  margin: 16px 16px 8px;
  padding: 0 14px;
  height: 44px;
  background: var(--tov-input);
  border-radius: 999px;
  color: var(--tov-muted);
}
.tov-pick-search {
  flex: 1; border: 0; outline: 0; background: transparent;
  font: inherit; font-size: 14px; color: var(--tov-text);
}
.tov-pick-search::placeholder { color: var(--tov-muted); }
.tov-pick-results {
  flex: 1; overflow-y: auto;
  padding: 4px 12px 8px;
  display: flex; flex-direction: column; gap: 2px;
}
.tov-pick-result {
  display: flex; align-items: flex-start; gap: 12px;
  width: 100%; text-align: left;
  background: transparent; border: 0; border-radius: 12px;
  padding: 10px 10px;
  font: inherit; cursor: pointer;
  transition: background .12s;
}
.tov-pick-result:hover { background: var(--tov-pill); }
.tov-pick-result-ico {
  flex: 0 0 auto;
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-bg-2);
  border-radius: 8px; color: var(--tov-text-2);
  margin-top: 2px;
}
.tov-pick-result-body {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 2px;
}
.tov-pick-result-body strong {
  font-size: 14px; font-weight: 600; line-height: 1.3;
}
.tov-pick-result-body span {
  font-size: 12px; color: var(--tov-text-2);
}
.tov-pick-tag {
  display: inline-block; margin-top: 4px;
  font-size: 11px; font-style: normal; font-weight: 500;
  padding: 2px 8px; border-radius: 999px;
  background: #E0F2F1; color: #0D7377;
  width: fit-content;
}
.tov-pick-tag-purple { background: #EDE7F6; color: #5E35B1; }
.tov-pick-empty {
  margin: 0; padding: 24px 0;
  text-align: center; font-size: 13px; color: var(--tov-text-2);
}
.tov-pick-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--tov-border);
}
.tov-pick-sources {
  display: inline-flex; align-items: center; gap: 6px;
  background: transparent; border: 0;
  font: inherit; font-size: 12.5px; font-weight: 500;
  color: var(--tov-text-2); cursor: pointer;
}
.tov-pick-footer-actions {
  display: inline-flex; gap: 4px;
}
.tov-pick-footer-actions button {
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: 0; border-radius: 8px;
  color: var(--tov-muted); cursor: pointer;
  transition: background .12s, color .12s;
}
.tov-pick-footer-actions button:hover {
  background: var(--tov-pill); color: var(--tov-text);
}
.tov-pick-close {
  position: absolute; top: 12px; right: 12px;
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-pill); color: var(--tov-text-2);
  border: 0; border-radius: 999px; cursor: pointer;
}
.tov-pick-close:hover { background: var(--tov-pill-h); color: var(--tov-text); }

/* Animations */
@keyframes tov-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes tov-up { from { opacity: 0; transform: translateY(16px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes tov-fadeup { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tov-typing { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
@keyframes tov-pulse { 0%,100%{opacity:1;} 50%{opacity:.72;} }
.tov-spin { animation: tov-spin 1s linear infinite; }
@keyframes tov-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .tov, .tov-shell, .tov-msg, .tov-spin, .tov-composer-mic.is-rec, .tov-typing span { animation: none !important; }
}

/* ── Mobile — Codex-style bottom sheet ── */
@media (max-width: 720px) {
  .tov:not(.tov-full) {
    padding: 0;
    align-items: flex-end;
    justify-content: center;
  }
  .tov:not(.tov-full) .tov-backdrop {
    background: rgba(0, 0, 0, 0.45);
  }
  .tov:not(.tov-full) .tov-shell {
    width: 100%;
    max-width: 100%;
    max-height: min(92dvh, 900px);
    height: auto;
    min-height: min(72dvh, 640px);
    border-radius: 22px 22px 0 0;
    box-shadow:
      0 -4px 40px rgba(0, 0, 0, 0.18),
      0 -1px 0 rgba(255, 255, 255, 0.06) inset;
    animation: tov-sheet-up .34s cubic-bezier(.16, 1, .3, 1) both;
  }
  .tov.tov-mode-conversation:not(.tov-full) .tov-shell {
    height: min(88dvh, 760px);
    max-height: min(88dvh, 760px);
    min-height: 0;
  }
  .tov.tov-full {
    padding: 0;
    align-items: stretch;
  }
  .tov.tov-full .tov-shell {
    width: 100%;
    max-height: 100dvh;
    border-radius: 0;
    min-height: 0;
  }
  .tov-picker-view {
    padding: 20px 20px 12px;
  }
  .tov-picker-title {
    font-size: 20px;
    margin-bottom: 18px;
  }
  .tov-picker-footer {
    padding: 6px 16px max(16px, env(safe-area-inset-bottom, 0px));
  }
  .tov-composer-hero .tov-composer-panel {
    border-radius: 22px;
  }
  .tov-composer-input {
    font-size: 16px;
  }
  .tov-floatbar {
    padding: 0 16px max(14px, env(safe-area-inset-bottom, 0px));
  }
  .tov-workspace-compact .tov-floatbar {
    padding: 0 14px max(14px, env(safe-area-inset-bottom, 0px));
  }
  .tov-timeline {
    padding: 8px 16px 16px;
  }
  .tov-compact-head {
    padding: 12px 16px 10px;
  }
  .tov.tov-full .tov-stage-head {
    padding: max(16px, env(safe-area-inset-top, 0px)) 20px 14px;
  }
  .tov.tov-full .tov-timeline {
    padding: 10px 20px 20px;
  }
  .tov.tov-full .tov-floatbar {
    padding: 12px 16px max(16px, env(safe-area-inset-bottom, 0px));
  }
  .tov-workspace-fs {
    padding: 0;
  }
  .tov.tov-full .tov-stage-card {
    border-radius: 0;
    border: none;
  }
}
@keyframes tov-sheet-up {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}
`
