'use client'

/**
 * TagroOverlay — the central object-aware Tagro Agent Workspace.
 *
 * Behaviour:
 *   1. Opens via `openTagro({ contextType, id, title })`.
 *   2. Initial state: sana.ai-style task picker — featured card, examples grid.
 *   3. On first send or "Von Grund auf starten": fullscreen workspace with
 *      icon rail, chat timeline, floating composer (sana screenshots 3+4).
 *   4. Tagro responses render as structured assistant messages inline
 *      (Ich verstehe dich so / Meine Einschätzung / Vorschau + quick actions).
 *   5. Fullscreen switch dispatches `festag:tagro-fullscreen` so the app shell
 *      can collapse its sidebar.
 *
 * Theming:
 *   Lightmode is the visual master (per the references). Darkmode is the same
 *   exact layout via a global stylesheet block that reads `data-theme` from
 *   <html>. No styled-jsx scoping — variable overrides cascade reliably.
 *
 * Object-level "Mit Tagro bearbeiten" calls openTagro(). NEVER routes through
 * the old Copilot.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
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
  const descriptions: Record<string, string> = {
    'Projektstatus zusammenfassen': 'Fasst den aktuellen Stand, Fortschritt und offene Punkte zusammen.',
    'Offene Entscheidungen erkennen': 'Findet blockierende Entscheidungen und bereitet Optionen vor.',
    'Nächste Aufgaben ableiten': 'Leitet konkrete nächste Schritte aus dem Projektstand ab.',
    'Kundenbriefing erstellen': 'Erstellt ein client-sicheres Update für Stakeholder.',
    'Risiken prüfen': 'Identifiziert Risiken und schlägt Gegenmaßnahmen vor.',
    'Angebot erstellen': 'Bereitet ein strukturiertes Angebot aus Projektdaten vor.',
    'Vertrag vorbereiten': 'Strukturiert Vertragsinhalte und offene Punkte.',
    'Rechnung erstellen': 'Leitet Rechnungspositionen aus dem Projektstand ab.',
    'Heutigen Fokus erstellen': 'Priorisiert die wichtigsten Aufgaben für heute.',
    'Blocker prüfen': 'Findet Blocker und schlägt Lösungswege vor.',
    'Update senden': 'Formuliert ein Team- oder Kunden-Update.',
    'GitHub-Stand zusammenfassen': 'Fasst Commits, PRs und offene Arbeit zusammen.',
  }
  return suggestions.slice(0, 4).map((title, i) => ({
    title,
    description: descriptions[title] || 'Tagro führt diese Aktion im aktuellen Kontext aus.',
    icon: EXAMPLE_ICONS[i % EXAMPLE_ICONS.length],
  }))
}

/** Highlight @-mentions in featured-card copy (sana blue links). */
function renderFeaturedText(text: string, mention: string) {
  const parts = text.split(/(@[^\s.]+(?:\s+[^\s.]+)?\.?)/g)
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

  const mode: 'initial' | 'conversation' = messages.length === 0 ? 'initial' : 'conversation'
  const showWorkspace = mode === 'conversation' || fromScratch

  // Global open event
  useEffect(() => {
    function onOpen(e: Event) {
      const d = (e as CustomEvent<TagroOpenDetail>).detail || { contextType: 'empty' }
      setCtx(d); setInput(d.prefill || ''); setMessages([]); setError(''); setExtraAttached([]); setFromScratch(false); setFullscreen(!!d.fullscreen); setOpen(true)
    }
    function onToggleFs() { setFullscreen(v => !v) }
    window.addEventListener('festag:open-tagro', onOpen as EventListener)
    window.addEventListener('festag:tagro-fullscreen-toggle', onToggleFs as EventListener)
    return () => {
      window.removeEventListener('festag:open-tagro', onOpen as EventListener)
      window.removeEventListener('festag:tagro-fullscreen-toggle', onToggleFs as EventListener)
    }
  }, [])

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
    if (mode !== 'conversation') return
    const el = timelineRef.current; if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, mode])

  async function send(textOverride?: string) {
    const value = (textOverride ?? input).trim()
    if (!value || busy) return
    setError('')
    if (messages.length === 0) setFullscreen(true)
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
    setFullscreen(true)
    setFromScratch(true)
    setInput('')
    window.setTimeout(() => composerRef.current?.focus(), 80)
  }

  function runExample(title: string) {
    setFullscreen(true)
    window.setTimeout(() => send(title), 60)
  }

  function runFeatured() {
    const prompt = suggestions[0] || introHelp
    runExample(prompt)
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

  if (!open) return null

  const node = (
    <div className={`tov${fullscreen ? ' tov-full' : ''} tov-mode-${showWorkspace ? 'conversation' : 'initial'}`} role="dialog" aria-modal="true" aria-label="Mit Tagro bearbeiten">
      <div className="tov-backdrop" onClick={fullscreen ? undefined : close} aria-hidden />

      <div className="tov-shell" onClick={e => e.stopPropagation()}>
        {showWorkspace ? (
          /* ── Sana-style workspace (screenshots 3 + 4) ── */
          <div className="tov-workspace">
            {fullscreen && (
              <TagroIconRail
                variant="inline"
                onNavigate={() => close()}
              />
            )}

            <div className="tov-main">
              <header className="tov-top">
                <span className="tov-top-ctx">{CTX_CHIP[ctx.contextType]}{ctx.title ? ` · ${ctx.title}` : ''}</span>
                <div className="tov-top-controls">
                  <button type="button" className="tov-iconbtn" onClick={() => setFullscreen(v => !v)} aria-label={fullscreen ? 'Verkleinern' : 'Vergrößern'}>
                    {fullscreen ? <ArrowsIn size={15} /> : <ArrowsOut size={15} />}
                  </button>
                  <button type="button" className="tov-iconbtn" onClick={close} aria-label="Schließen"><X size={16} /></button>
                </div>
              </header>

              <div className="tov-timeline" ref={timelineRef}>
                <div className="tov-timeline-inner">
                  {messages.map(m => m.role === 'user'
                    ? <UserMsg key={m.id} content={m.content} />
                    : <TagroMsg key={m.id} msg={m} onAction={runQuickAction} contextChips={attachedChips} />)}
                  {busy && (
                    <div className="tov-typing-row">
                      <TagroLogo size={20} thinking />
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
                    placeholder={fullscreen ? 'Frag Tagro …' : placeholder}
                    micOk={micOk}
                    rec={rec}
                    onMic={toggleMic}
                    variant="sticky"
                    onAttach={attachExtra}
                    fullscreen={fullscreen}
                  />
                  {fullscreen && (
                    <div className="tov-floatbar-meta">
                      <button type="button" className="tov-floatbar-link" onClick={() => composerRef.current?.focus()}>
                        <Plus size={13} weight="bold" /> Erstellen
                      </button>
                      <button type="button" className="tov-floatbar-link" onClick={() => {
                        const el = document.querySelector('.tov-composer-plus') as HTMLButtonElement | null
                        el?.click()
                      }}>
                        <Plus size={13} weight="bold" /> Quellen
                      </button>
                      <span className="tov-floatbar-auto">Auto</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Sana-style task picker (screenshot 2) ── */
          <div className="tov-picker-view">
            <div className="tov-picker-card">
              <div className="tov-picker-top">
                {!fullscreen && (
                  <button type="button" className="tov-iconbtn" onClick={() => setFullscreen(true)} aria-label="Vergrößern">
                    <ArrowsOut size={15} />
                  </button>
                )}
                <button type="button" className="tov-iconbtn" onClick={close} aria-label="Schließen"><X size={16} /></button>
              </div>

              <h1 className="tov-picker-title">{question}</h1>

              <div className="tov-featured">
                <span className="tov-featured-ico" aria-hidden><Lightbulb size={18} weight="regular" /></span>
                <p className="tov-featured-text">
                  {renderFeaturedText(introHelp, session.mentionLabel)}
                </p>
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
                <p className="tov-examples-label">Beispiel als Vorlage</p>
                <div className="tov-examples-grid">
                  {examples.map(ex => {
                    const Icon = ex.icon
                    return (
                      <button key={ex.title} type="button" className="tov-example" onClick={() => runExample(ex.title)}>
                        <span className="tov-example-ico" aria-hidden><Icon size={18} weight="regular" /></span>
                        <span className="tov-example-body">
                          <strong>{ex.title}</strong>
                          <span>{ex.description}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && <p className="tov-err">{error}</p>}
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
    </div>
  )

  return typeof document === 'undefined' ? node : createPortal(node, document.body)
}

// ── Composer ──────────────────────────────────────────────────────────────

function Composer({
  inputRef, value, onChange, onSend, busy, placeholder, micOk, rec, onMic, variant, onAttach, fullscreen = false,
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
  variant: 'hero' | 'sticky'
  onAttach?: (chip: AttachedChip) => void
  fullscreen?: boolean
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
      {/* Single-row ChatGPT layout:  (+)  [ input … 🎤 ↑ ]
          + sits OUTSIDE the pill on the left; mic + send sit INSIDE the
          pill on the right. */}
      <button
        type="button"
        className="tov-composer-plus"
        aria-label="Quellen oder Personen hinzufügen"
        title="Quellen / @Personen / Objekte hinzufügen"
        onClick={openPicker}
      >
        <Plus size={20} weight="regular" />
      </button>

      <div className="tov-composer-bar">
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
        {micOk && (
          <button type="button" className={`tov-composer-mic${rec ? ' is-rec' : ''}`} onClick={onMic} aria-label={rec ? 'Aufnahme stoppen' : 'Per Sprache diktieren'}>
            {rec ? <MicrophoneSlash size={18} weight="fill" /> : <Microphone size={18} />}
          </button>
        )}
        <button type="button" className="tov-composer-send" onClick={onSend} disabled={busy || !value.trim()} aria-label="Senden">
          {busy ? <ArrowsClockwise size={18} className="tov-spin" /> : <ArrowUp size={18} weight="bold" />}
        </button>
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
  msg, onAction, contextChips = [],
}: {
  msg: Extract<Message, { role: 'tagro' }>
  onAction: (a: string) => void
  contextChips?: AttachedChip[]
}) {
  return (
    <div className="tov-msg tov-msg-tagro">
      <div className="tov-msg-tagro-head">
        <TagroLogo size={18} />
        {msg.understanding && (
          <p className="tov-msg-text tov-msg-lead">{msg.understanding}</p>
        )}
      </div>
      {contextChips.length > 0 && (
        <div className="tov-source-pills">
          {contextChips.slice(0, 2).map((c, i) => (
            <span key={i} className={`tov-source-pill tov-source-pill-${i}`}>
              {c.label}
            </span>
          ))}
        </div>
      )}
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
  --tov-input: #F3F3F1;
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
@media (max-width: 720px) { .tov { padding: 0; align-items: stretch; } }

.tov-backdrop {
  position: absolute; inset: 0;
  background: var(--tov-backdrop);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
}
.tov.tov-full .tov-backdrop { display: none; }

.tov-shell {
  position: relative;
  width: min(640px, calc(100vw - 96px));
  max-height: min(88vh, 820px);
  background: var(--tov-canvas);
  border: 0;
  border-radius: 28px;
  box-shadow: var(--tov-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: tov-up .32s cubic-bezier(.16,1,.3,1) both;
  transition: width .35s cubic-bezier(.16,1,.3,1), height .35s, border-radius .35s, box-shadow .35s, max-height .35s;
}
.tov.tov-mode-conversation .tov-shell,
.tov.tov-full .tov-shell {
  width: 100%; max-width: none; max-height: none;
  height: 100%; border-radius: 0; box-shadow: none;
  background: var(--tov-bg);
}
@media (max-width: 720px) {
  .tov-shell { width: 100%; max-height: 100dvh; border-radius: 0; }
}

/* ── Task picker (sana modal) ── */
.tov-picker-view {
  flex: 1; overflow-y: auto;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 28px 28px 32px;
}
.tov-picker-card {
  width: 100%; max-width: 560px;
  position: relative;
}
.tov-picker-top {
  display: flex; justify-content: flex-end; gap: 6px;
  margin-bottom: 8px;
}
.tov-picker-title {
  margin: 0 0 24px;
  text-align: center;
  font-size: 22px; font-weight: 600; letter-spacing: -.018em;
  line-height: 1.25; color: var(--tov-text);
  text-wrap: balance;
}
.tov-featured {
  display: flex; align-items: center; gap: 14px;
  background: var(--tov-bg);
  border: 1px solid var(--tov-border);
  border-radius: 16px;
  padding: 16px 16px 16px 18px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  margin-bottom: 14px;
}
.tov-featured-ico {
  flex: 0 0 auto;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--tov-text-2);
}
.tov-featured-text {
  flex: 1; margin: 0;
  font-size: 14px; line-height: 1.55; color: var(--tov-text-2);
}
.tov-featured-link { color: var(--tov-link); font-weight: 500; }
.tov-featured-go {
  flex: 0 0 auto;
  width: 36px; height: 36px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-send); color: var(--tov-send-text);
  border: 0; border-radius: 999px; cursor: pointer;
  transition: opacity .12s, transform .12s;
}
.tov-featured-go:hover { opacity: .9; transform: scale(1.03); }

.tov.tov-full:not(.tov-mode-conversation) .tov-shell {
  background: var(--tov-canvas);
}
.tov-scratch-wrap {
  display: flex; justify-content: center;
  width: 100%;
}
.tov-scratch {
  display: inline-flex; align-items: center; gap: 4px;
  margin: 0 0 28px;
  padding: 8px 14px;
  background: var(--tov-bg-2);
  color: var(--tov-text-2);
  border: 0; border-radius: 999px;
  font: inherit; font-size: 13px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.tov-scratch:hover { background: var(--tov-pill-h); color: var(--tov-text); }

.tov-examples-label {
  margin: 0 0 14px;
  font-size: 13px; font-weight: 600; color: var(--tov-text);
}
.tov-examples-grid {
  display: grid; gap: 10px;
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 520px) { .tov-examples-grid { grid-template-columns: 1fr; } }
.tov-example {
  display: flex; align-items: flex-start; gap: 12px;
  text-align: left;
  background: transparent; color: var(--tov-text);
  border: 0; border-radius: 12px;
  padding: 10px 8px;
  font: inherit; cursor: pointer;
  transition: background .12s;
}
.tov-example:hover { background: var(--tov-pill); }
.tov-example-ico {
  flex: 0 0 auto;
  width: 36px; height: 36px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-bg);
  border: 1px solid var(--tov-border);
  border-radius: 999px;
  color: var(--tov-text);
}
.tov-example-body {
  display: flex; flex-direction: column; gap: 3px; min-width: 0;
}
.tov-example-body strong {
  font-size: 13.5px; font-weight: 600; line-height: 1.3;
}
.tov-example-body span {
  font-size: 12px; line-height: 1.45; color: var(--tov-text-2);
}

/* ── Workspace layout ── */
.tov-workspace {
  flex: 1; min-height: 0;
  display: flex; flex-direction: row;
  height: 100%;
}
.tov-main {
  flex: 1; min-width: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
}

/* Top bar */
.tov-top {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 16px 24px;
}
.tov-top-ctx {
  font-size: 12px; font-weight: 500; color: var(--tov-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tov-top-controls { display: inline-flex; gap: 6px; flex-shrink: 0; }
.tov-iconbtn {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-pill); color: var(--tov-text-2);
  border: 0; border-radius: 999px; cursor: pointer;
  transition: background .14s, color .14s;
}
.tov-iconbtn:hover { background: var(--tov-pill-h); color: var(--tov-text); }

/* Composer */
.tov-composer {
  width: 100%;
  display: flex; align-items: flex-end; gap: 10px;
}
.tov-composer-plus {
  flex: 0 0 auto;
  width: 40px; height: 40px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-input);
  color: var(--tov-text);
  border: 0; border-radius: 999px; cursor: pointer;
  transition: background .14s;
}
.tov-composer-plus:hover { background: var(--tov-pill-h); }
.tov-composer-bar {
  flex: 1 1 auto; min-width: 0;
  display: flex; align-items: flex-end; gap: 6px;
  background: var(--tov-input);
  border: 0;
  border-radius: 999px;
  padding: 6px 6px 6px 18px;
  transition: background .16s ease, box-shadow .16s ease;
}
.tov-composer-bar:focus-within {
  background: var(--tov-input-2);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--tov-text) 5%, transparent);
}
.tov-composer-input {
  flex: 1 1 auto; width: 100%;
  border: 0; outline: 0; resize: none; background: transparent;
  color: var(--tov-text); font: inherit;
  font-size: 15px; line-height: 1.5;
  min-height: 32px; max-height: 200px;
  padding: 6px 0; overflow-y: auto;
}
.tov-composer-input::placeholder { color: var(--tov-muted); }
.tov-composer-mic {
  flex: 0 0 auto; width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; color: var(--tov-text-2);
  border: 0; border-radius: 999px; cursor: pointer;
  transition: background .14s, color .14s;
}
.tov-composer-mic:hover { background: var(--tov-pill); color: var(--tov-text); }
.tov-composer-mic.is-rec { animation: tov-pulse 1.4s ease-in-out infinite; }
.tov-composer-send {
  flex: 0 0 auto; width: 36px; height: 36px;
  border: 0; border-radius: 999px;
  background: var(--tov-send); color: var(--tov-send-text);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: opacity .12s, transform .12s;
}
.tov-composer-send:hover:not(:disabled) { opacity: .9; }
.tov-composer-send:disabled { opacity: .35; cursor: not-allowed; }

/* Timeline / chat */
.tov-timeline {
  overflow-y: auto;
  padding: 8px 32px 24px;
}
.tov-timeline-inner {
  max-width: 760px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 28px;
}
.tov.tov-full .tov-timeline-inner { max-width: 820px; }

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
.tov-quickactions { display: flex; flex-wrap: wrap; gap: 8px; padding-left: 28px; }
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
  padding: 0 32px max(24px, env(safe-area-inset-bottom, 0px));
  background: linear-gradient(to top, var(--tov-bg) 70%, transparent);
}
.tov-floatbar-inner {
  max-width: 760px; margin: 0 auto;
}
.tov.tov-full .tov-floatbar-inner { max-width: 820px; }
.tov-floatbar-meta {
  display: flex; align-items: center; gap: 16px;
  margin-top: 10px; padding: 0 6px;
}
.tov-floatbar-link {
  display: inline-flex; align-items: center; gap: 5px;
  background: transparent; border: 0;
  color: var(--tov-text-2);
  font: inherit; font-size: 12.5px; font-weight: 500;
  cursor: pointer;
  transition: color .12s;
}
.tov-floatbar-link:hover { color: var(--tov-text); }
.tov-floatbar-auto {
  margin-left: auto;
  font-size: 12.5px; color: var(--tov-muted); font-weight: 500;
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
`
