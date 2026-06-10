'use client'

/**
 * TagroOverlay — the central object-aware Tagro Agent Workspace.
 *
 * Behaviour:
 *   1. Opens via `openTagro({ contextType, id, title })`.
 *   2. Initial state: centered hero composer + object-specific suggestions
 *      (matches the sana.ai-style references — clean, lots of whitespace).
 *   3. On first send: flips to conversation mode. Past messages scroll above,
 *      composer stays sticky at the bottom. User can keep chatting like an
 *      agent workspace — no static wizard, no dead end.
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
  Microphone, MicrophoneSlash, Plus, Lightbulb,
} from '@phosphor-icons/react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

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
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const mode: 'initial' | 'conversation' = messages.length === 0 ? 'initial' : 'conversation'

  // Global open event
  useEffect(() => {
    function onOpen(e: Event) {
      const d = (e as CustomEvent<TagroOpenDetail>).detail || { contextType: 'empty' }
      setCtx(d); setInput(d.prefill || ''); setMessages([]); setError(''); setExtraAttached([]); setFullscreen(!!d.fullscreen); setOpen(true)
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
    setOpen(false); setFullscreen(false); setMessages([]); setInput(''); setError('')
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

  // One source of truth for everything the overlay shows: attached chips,
  // intro lead, intro help, placeholder, suggestions. Computed from the
  // current ctx so opening a task vs. a documents overview always speaks
  // the right language without per-render guesswork.
  const session = useMemo(() => buildInitialSession(ctx), [ctx])
  const { chips: baseChips, introLead, introHelp, placeholder, suggestions } = session
  const attachedChips: AttachedChip[] = [...baseChips, ...extraAttached]
  const attachExtra = (c: AttachedChip) =>
    setExtraAttached(prev => prev.some(p => p.label === c.label) ? prev : [...prev, c])
  const removeExtra = (label: string) =>
    setExtraAttached(prev => prev.filter(p => p.label !== label))
  const chips = suggestions

  if (!open) return null

  const node = (
    <div className={`tov${fullscreen ? ' tov-full' : ''} tov-mode-${mode}`} role="dialog" aria-modal="true" aria-label="Mit Tagro bearbeiten">
      <div className="tov-backdrop" onClick={fullscreen ? undefined : close} aria-hidden />

      {/* No rail in fullscreen — the workspace fills the entire viewport.
          Users get back to the app via the close (X) or collapse buttons
          in the top-right; navigation stays in the app shell underneath. */}

      <div className="tov-shell" onClick={e => e.stopPropagation()}>
        {/* Header — minimal, ghost icons, context line */}
        <header className="tov-top">
          <span className="tov-top-ctx">{CTX_CHIP[ctx.contextType]}{ctx.title ? ` · ${ctx.title}` : ''}</span>
          <div className="tov-top-controls">
            <button type="button" className="tov-iconbtn" onClick={() => setFullscreen(v => !v)} aria-label={fullscreen ? 'Verkleinern' : 'Vergrößern'}>
              {fullscreen ? <ArrowsIn size={15} /> : <ArrowsOut size={15} />}
            </button>
            <button type="button" className="tov-iconbtn" onClick={close} aria-label="Schließen"><X size={16} /></button>
          </div>
        </header>

        {/* Initial hero — attached @context + Tagro intro + composer + suggestions */}
        {mode === 'initial' ? (
          <div className="tov-hero">
            <div className="tov-hero-inner">
              {/* Tagro mark — small, centered, ABOVE the intro. */}
              <span className="tov-hero-mark" aria-hidden>
                <Lightbulb size={18} weight="regular" />
              </span>

              {/* Initial Tagro intro — never empty, always says where it is. */}
              <h2 className="tov-hero-q">{introLead}</h2>
              <p className="tov-hero-sub">{introHelp}</p>

              {/* Attached @-mention chips pinned ABOVE the composer so the
                  user immediately sees what Tagro already knows. */}
              {attachedChips.length > 0 && (
                <div className="tov-attached" role="group" aria-label="Angehängter Kontext">
                  {attachedChips.map((c, i) => {
                    // User-added chips (anything beyond the base session)
                    // can be removed. Base context (object + meta) stays
                    // pinned because that's where Tagro is "rooted".
                    const isRemovable = i >= baseChips.length
                    return (
                      <span key={i} className={`tov-attached-chip tov-attached-${c.kind}`}>
                        {c.label}
                        {isRemovable && (
                          <button
                            type="button"
                            className="tov-attached-x"
                            aria-label="Entfernen"
                            onClick={() => removeExtra(c.label)}
                          ><X size={10} weight="bold" /></button>
                        )}
                      </span>
                    )
                  })}
                </div>
              )}

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
              />

              <div className="tov-chips">
                <div className="tov-chips-grid">
                  {chips.map(c => (
                    <button key={c} type="button" className="tov-chip" onClick={() => { setInput(c); window.setTimeout(() => composerRef.current?.focus(), 40) }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="tov-err">{error}</p>}
            </div>
          </div>
        ) : (
          /* Conversation mode — scrollable timeline + sticky bottom composer */
          <>
            <div className="tov-timeline" ref={timelineRef}>
              <div className="tov-timeline-inner">
                {messages.map(m => m.role === 'user'
                  ? <UserMsg key={m.id} content={m.content} />
                  : <TagroMsg key={m.id} msg={m} onAction={runQuickAction} />)}
                {busy && (
                  <div className="tov-typing"><span /><span /><span /></div>
                )}
              </div>
            </div>
            <div className="tov-stickybar">
              <div className="tov-stickybar-inner">
                {/* Attached @-context stays pinned across the whole
                    conversation so the user always sees what Tagro is
                    bound to. Click-to-remove can come later — for now
                    chips are persistent. */}
                {attachedChips.length > 0 && (
                  <div className="tov-attached tov-attached-sticky" role="group" aria-label="Angehängter Kontext">
                    {attachedChips.map((c, i) => (
                      <span key={i} className={`tov-attached-chip tov-attached-${c.kind}`}>
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
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
                  variant="sticky"
                  onAttach={attachExtra}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
    </div>
  )

  return typeof document === 'undefined' ? node : createPortal(node, document.body)
}

// ── Composer ──────────────────────────────────────────────────────────────

function Composer({
  inputRef, value, onChange, onSend, busy, placeholder, micOk, rec, onMic, variant, onAttach,
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
  /** Called when the user picks an @-target from the People/Sources sheet
   *  (or types '@' and chooses a result). Adds a chip to the overlay's
   *  attached context. */
  onAttach?: (chip: AttachedChip) => void
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

function PeopleObjectPicker({ onClose, onPick }: { onClose: () => void; onPick: (chip: AttachedChip) => void }) {
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
    <div className="tov-pick" role="dialog" aria-label="Quellen und Personen hinzufügen">
      <div className="tov-pick-backdrop" onClick={onClose} aria-hidden />
      <div className="tov-pick-sheet" onClick={e => e.stopPropagation()}>
        <p className="tov-pick-title">Hinzufügen</p>
        <p className="tov-pick-sub">
          Wähle, was Tagro mit diesem Chat verknüpfen soll. Tipp im Text
          auch <code>@</code> für Schnellzugriff.
        </p>
        <input
          ref={searchRef}
          type="text"
          className="tov-pick-search"
          placeholder="Suche Projekte, Aufgaben, Entscheidungen, Kunden, Notizen …"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <div className="tov-pick-results">
          {loading && results.length === 0 && (
            <p className="tov-pick-empty">Lade …</p>
          )}
          {!loading && results.length === 0 && (
            <p className="tov-pick-empty">Nichts gefunden{q ? ` für „${q}"` : ''}.</p>
          )}
          {groups.map(([group, items]) => (
            <div key={group} className="tov-pick-group">
              <p className="tov-pick-group-label">{group}</p>
              {items.map(r => (
                <button key={`${group}-${r.id}`} type="button" className="tov-pick-result" onClick={() => pickResult(r)}>
                  <strong>{r.title}</strong>
                  {r.hint && <span>{r.hint}</span>}
                </button>
              ))}
            </div>
          ))}
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
      <p>{content}</p>
    </div>
  )
}

function TagroMsg({ msg, onAction }: { msg: Extract<Message, { role: 'tagro' }>; onAction: (a: string) => void }) {
  return (
    <div className="tov-msg tov-msg-tagro">
      {/* No eyebrow labels — visual hierarchy carries the structure:
          understanding = lead, opinion = secondary, preview = framed box. */}
      {msg.understanding && (
        <p className="tov-msg-text tov-msg-lead">{msg.understanding}</p>
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
  --tov-bg: #FAFAFA; --tov-bg-2: #F7F7F5;
  --tov-input: #FFFFFF; --tov-input-2: #F4F4F4;
  --tov-text: #111111; --tov-text-2: #555555; --tov-muted: #8A8A8A;
  --tov-border: rgba(0,0,0,0.06); --tov-border-2: rgba(0,0,0,0.10);
  --tov-send: #111111; --tov-send-text: #FFFFFF;
  --tov-shadow: 0 30px 80px -28px rgba(15,23,42,0.20), 0 4px 18px rgba(15,23,42,0.05);
  --tov-backdrop: rgba(20,22,28,0.18);
  --tov-primary: #5B647D;
  --tov-pill: rgba(0,0,0,0.04); --tov-pill-h: rgba(0,0,0,0.07);
  --tov-warn-bg: rgba(245,158,11,0.10); --tov-warn-bar: rgba(245,158,11,0.55);
}
[data-theme="dark"], [data-theme="classic-dark"] {
  --tov-bg: #0D0D0D; --tov-bg-2: #111111;
  --tov-input: #151515; --tov-input-2: #1A1A1A;
  --tov-text: #F4F4F4; --tov-text-2: #A3A3A3; --tov-muted: #737373;
  --tov-border: rgba(255,255,255,0.06); --tov-border-2: rgba(255,255,255,0.10);
  --tov-send: #F4F4F4; --tov-send-text: #050505;
  --tov-shadow: 0 30px 80px -28px rgba(0,0,0,0.65);
  --tov-backdrop: rgba(0,0,0,0.55);
  --tov-pill: rgba(255,255,255,0.05); --tov-pill-h: rgba(255,255,255,0.09);
  --tov-warn-bg: rgba(245,158,11,0.10); --tov-warn-bar: rgba(245,158,11,0.55);
}

/* Stage */
.tov {
  position: fixed; inset: 0; z-index: 16000;
  display: flex; align-items: center; justify-content: center;
  padding: 56px;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  color: var(--tov-text);
  animation: tov-in .22s ease both;
  transition: padding .35s cubic-bezier(.16,1,.3,1);
}
.tov.tov-full {
  padding: 0;
  /* Fullscreen workspace fills the viewport — center it. */
  justify-content: center; align-items: stretch;
}
@media (max-width: 720px) { .tov { padding: 0; align-items: stretch; } }

.tov-backdrop {
  position: absolute; inset: 0;
  background: var(--tov-backdrop);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
}

.tov-shell {
  position: relative;
  width: min(1080px, calc(100vw - 112px));
  height: min(80vh, 780px);
  background: var(--tov-bg);
  border: 1px solid var(--tov-border);
  border-radius: 22px;
  box-shadow: var(--tov-shadow);
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  animation: tov-up .32s cubic-bezier(.16,1,.3,1) both;
  transition: width .35s cubic-bezier(.16,1,.3,1), height .35s cubic-bezier(.16,1,.3,1), border-radius .35s, box-shadow .35s;
}
@media (max-width: 720px) {
  .tov-shell { width: 100%; height: 100dvh; border-radius: 0; max-width: none; }
}
/* Fullscreen: workspace fills the ENTIRE viewport — no rail, no margins.
   The app shell collapses the underlying sidebar in tandem (see
   ClientAppShell). User dismisses via the top-right collapse / X. */
.tov.tov-full .tov-shell {
  width: 100vw;
  height: 100vh; max-width: none;
  border-radius: 0; border: 0; box-shadow: none;
}
.tov.tov-mode-conversation .tov-shell { grid-template-rows: auto 1fr auto; }

/* Top bar */
.tov-top {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 18px 24px;
}
/* Fullscreen: pin context line and controls to the very edge so they
   read as window chrome, not as content. Equal vertical breathing on
   both sides of the row. */
.tov.tov-full .tov-top { padding: 18px 22px; }
@media (max-width: 768px) {
  .tov.tov-full .tov-top { padding: 14px 16px; }
}
.tov-top-ctx {
  font-size: 12px; font-weight: 500; letter-spacing: .01em; color: var(--tov-muted);
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

/* Initial hero */
.tov-hero {
  overflow-y: auto;
  padding: 40px 24px 40px;
  display: flex; align-items: center; justify-content: center;
}
.tov-hero-inner {
  width: 100%; max-width: 760px;
  display: flex; flex-direction: column; align-items: center;
  gap: 20px;
}
/* Small Tagro mark above the question — calm, intentional. */
.tov-hero-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 999px;
  background: var(--tov-pill); color: var(--tov-text-2);
  margin-bottom: -4px;
}
.tov-hero-q {
  margin: 0; text-align: center;
  font-size: 28px; font-weight: 600; letter-spacing: -.016em; color: var(--tov-text);
  line-height: 1.18;
  /* Senior-designer touch: balance the wrap so the second line never
     orphans a single word. Falls back gracefully where unsupported. */
  text-wrap: balance;
}
.tov-hero-sub {
  margin: -8px 0 2px;
  text-align: center;
  font-size: 14.5px; line-height: 1.55; color: var(--tov-text-2); max-width: 56ch;
  text-wrap: balance;
}
.tov.tov-full .tov-hero-q { font-size: 32px; letter-spacing: -.02em; }
/* Mobile: bigger, more confident heading — was visibly too small. */
@media (max-width: 768px) {
  .tov-hero-q { font-size: 30px; }
  .tov.tov-full .tov-hero-q { font-size: 30px; }
  .tov-hero-sub { font-size: 15px; }
  .tov-hero-mark { width: 42px; height: 42px; }
}
.tov.tov-full .tov-hero {
  /* True vertical + horizontal centering of the agent block. The hero
     uses flex (align-items:center, justify-content:center) so the whole
     stack (mark + intro + chips + composer + suggestions) sits in the
     visual middle of the workspace. */
  padding: 24px 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tov.tov-full .tov-hero-inner {
  max-width: 820px;
  width: 100%;
  /* No min-height hack — flex centering on the hero container does the
     work. Remove top/bottom padding so the block is truly centered. */
  min-height: 0;
  justify-content: flex-start;
  padding-top: 0;
  padding-bottom: 0;
}
@media (max-width: 768px) {
  .tov.tov-full .tov-hero { padding: 24px 18px; }
}

/* Composer — ChatGPT single-row layout 1:1:
       (+)   [  input …                        🎤   ↑  ]
     + is OUTSIDE the pill on the left; mic + send are INSIDE the pill
     on the right. The pill is a stadium that grows for multi-line text. */
.tov-composer {
  width: 100%;
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

/* + button — its own circle, OUTSIDE the input pill (ChatGPT style). */
.tov-composer-plus {
  flex: 0 0 auto;
  width: 44px; height: 44px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-input);
  color: var(--tov-text);
  border: 1px solid var(--tov-border);
  border-radius: 999px; cursor: pointer;
  transition: background .14s, color .14s, border-color .14s;
}
.tov-composer-plus:hover {
  background: var(--tov-pill); border-color: var(--tov-border-2);
}

/* The input pill — holds the textarea + mic + send. */
.tov-composer-bar {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: var(--tov-input);
  border: 1px solid var(--tov-border);
  border-radius: 26px;
  padding: 6px 6px 6px 18px;
  box-shadow:
    0 1px 2px rgba(15,23,42,0.04),
    0 12px 32px -22px rgba(15,23,42,0.12);
  transition: border-color .16s ease, background .16s ease, box-shadow .16s ease;
}
[data-theme="dark"] .tov-composer-bar,
[data-theme="classic-dark"] .tov-composer-bar {
  box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 12px 32px -22px rgba(0,0,0,0.5);
}
.tov-composer-bar:focus-within {
  border-color: color-mix(in srgb, var(--tov-text) 22%, transparent);
  background: var(--tov-input-2);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--tov-text) 6%, transparent),
    0 8px 30px -18px rgba(15,23,42,0.18);
}
[data-theme="dark"] .tov-composer-bar:focus-within,
[data-theme="classic-dark"] .tov-composer-bar:focus-within {
  box-shadow:
    0 0 0 4px rgba(255,255,255,0.05),
    0 8px 30px -18px rgba(0,0,0,0.6);
}
.tov-composer-hero   .tov-composer-bar { padding: 8px 8px 8px 20px; }
.tov-composer-sticky .tov-composer-bar { border-radius: 24px; }

.tov-composer-input {
  flex: 1 1 auto;
  width: 100%; border: 0; outline: 0; resize: none; background: transparent;
  color: var(--tov-text); font: inherit;
  font-size: 16px; line-height: 1.5;
  min-height: 32px;          /* aligns with the 32px round buttons */
  max-height: 200px;
  /* vertical breathing room so single-line text sits centred in the pill */
  padding: 6px 0;
  overflow-y: auto;
}
.tov-composer-input::placeholder { color: var(--tov-muted); }

/* mic — ghost circle inside the pill. */
.tov-composer-mic {
  flex: 0 0 auto;
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; color: var(--tov-text-2);
  border: 0; border-radius: 999px; cursor: pointer;
  transition: background .14s, color .14s;
}
.tov-composer-mic:hover { background: var(--tov-pill); color: var(--tov-text); }
.tov-composer-mic.is-rec { background: var(--tov-pill-h); color: var(--tov-text); animation: tov-pulse 1.4s ease-in-out infinite; }

/* send — solid filled circle at the pill's right edge (ChatGPT). */
.tov-composer-send {
  flex: 0 0 auto;
  width: 36px; height: 36px;
  border: 0; border-radius: 999px;
  background: var(--tov-send); color: var(--tov-send-text);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: opacity .12s, transform .12s, box-shadow .14s;
}
.tov-composer-send:hover:not(:disabled) { opacity: .92; transform: translateY(-1px); }
.tov-composer-send:active:not(:disabled) { transform: scale(.95); }
.tov-composer-send:disabled { opacity: .35; cursor: not-allowed; box-shadow: none; }

/* Attached @-context chips. Pinned above the composer so the user
   immediately sees what Tagro is bound to. Two visual tones:
   object (slate filled pill) and meta (subtle outline). */
.tov-attached {
  width: 100%;
  display: flex; flex-wrap: wrap; gap: 6px;
  margin: -4px 0 -2px;
  justify-content: center;
}
.tov-attached-sticky {
  justify-content: flex-start;
  margin: 0 0 8px;
  padding: 0 4px;
}
.tov-attached-chip {
  display: inline-flex; align-items: center; gap: 4px;
  height: 24px; padding: 0 10px;
  font-size: 11.5px; font-weight: 500; letter-spacing: .012em;
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

/* Hero chips */
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

/* Conversation timeline */
.tov-timeline {
  overflow-y: auto;
  padding: 20px 24px 24px;
}
.tov-timeline-inner {
  max-width: 820px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 18px;
}
.tov.tov-full .tov-timeline-inner { max-width: 920px; }

.tov-msg { animation: tov-fadeup .25s ease both; }
.tov-msg-user {
  align-self: flex-end;
  max-width: 80%;
  padding: 10px 14px;
  background: var(--tov-pill);
  color: var(--tov-text);
  border-radius: 16px 16px 4px 16px;
  font-size: 14px; line-height: 1.55;
}
.tov-msg-user p { margin: 0; }
.tov-msg-tagro {
  display: flex; flex-direction: column; gap: 14px;
  max-width: 100%;
}
.tov-msg-label {
  margin: 0 0 4px;
  font-size: 11px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--tov-muted);
}
.tov-msg-text {
  margin: 0; font-size: 15px; line-height: 1.6; color: var(--tov-text-2);
}
.tov-msg-lead {
  /* The understanding line is the lead answer — full-strength text,
     slightly larger, carrying the structure without an eyebrow label. */
  color: var(--tov-text);
  font-size: 15.5px; font-weight: 500;
}
.tov-msg-preview {
  margin: 0; padding: 14px 16px;
  background: var(--tov-bg-2);
  border: 1px solid var(--tov-border);
  border-radius: 14px;
  font-size: 15px; line-height: 1.6; color: var(--tov-text);
  white-space: pre-wrap;
}
.tov-warnings { display: flex; flex-direction: column; gap: 6px; }
.tov-warning {
  margin: 0; padding: 10px 12px;
  background: var(--tov-warn-bg);
  box-shadow: inset 3px 0 0 var(--tov-warn-bar);
  border-radius: 8px;
  font-size: 12.5px; line-height: 1.5; color: var(--tov-text); font-weight: 500;
}
.tov-quickactions { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 2px; }
.tov-quickaction {
  border: 0; border-radius: 999px;
  height: 32px; padding: 0 13px;
  background: var(--tov-pill); color: var(--tov-text);
  font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: background .12s;
}
.tov-quickaction:hover { background: var(--tov-pill-h); }

/* Typing indicator */
.tov-typing {
  display: inline-flex; gap: 5px;
  padding: 12px 14px;
  background: var(--tov-pill);
  border-radius: 16px 16px 16px 4px;
  width: fit-content;
}
.tov-typing span {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--tov-muted);
  animation: tov-typing 1.2s ease-in-out infinite;
}
.tov-typing span:nth-child(2) { animation-delay: .15s; }
.tov-typing span:nth-child(3) { animation-delay: .3s; }

/* Sticky composer */
.tov-stickybar {
  border-top: 1px solid var(--tov-border);
  background: var(--tov-bg);
  padding: 14px 24px max(14px, env(safe-area-inset-bottom, 0px));
}
.tov-stickybar-inner { max-width: 820px; margin: 0 auto; }
.tov.tov-full .tov-stickybar-inner { max-width: 920px; }

.tov-err { margin: 0; color: #ef4444; font-size: 12.5px; }

/* People / Sources / Objects picker — opens via the composer + button
   or by typing '@'. Shell only for now; categories are listed so the
   user sees what Tagro can pull in. */
.tov-pick {
  position: fixed; inset: 0; z-index: 16100;
  display: flex; align-items: flex-end; justify-content: center;
  animation: tov-in .14s ease both;
}
.tov-pick-backdrop {
  position: absolute; inset: 0;
  background: rgba(8,10,14,0.42);
  backdrop-filter: blur(6px) saturate(140%);
  -webkit-backdrop-filter: blur(6px) saturate(140%);
}
.tov-pick-sheet {
  position: relative;
  width: min(560px, calc(100vw - 24px));
  margin-bottom: 14vh;
  background: var(--tov-bg);
  color: var(--tov-text);
  border: 1px solid var(--tov-border);
  border-radius: 18px;
  box-shadow: var(--tov-shadow);
  padding: 18px 18px 14px;
  animation: tov-up .2s cubic-bezier(.16,1,.3,1) both;
}
.tov-pick-title { margin: 0; font-size: 14px; font-weight: 600; letter-spacing: -.005em; }
.tov-pick-sub { margin: 4px 0 14px; font-size: 12.5px; color: var(--tov-text-2); }
.tov-pick-sub code { background: var(--tov-pill); padding: 1px 5px; border-radius: 4px; font-size: 11.5px; }
.tov-pick-search {
  width: 100%;
  height: 36px;
  background: var(--tov-input);
  border: 1px solid var(--tov-border);
  border-radius: 10px;
  padding: 0 12px;
  font: inherit; font-size: 13px;
  color: var(--tov-text);
  outline: 0;
  margin-bottom: 10px;
}
.tov-pick-search::placeholder { color: var(--tov-muted); }
.tov-pick-search:focus { border-color: var(--tov-border-2); background: var(--tov-input-2); }
.tov-pick-results {
  max-height: 320px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 10px;
  padding-right: 4px;
}
.tov-pick-group { display: flex; flex-direction: column; gap: 2px; }
.tov-pick-group-label {
  margin: 0 0 2px;
  font-size: 10.5px; font-weight: 600; letter-spacing: .08em;
  text-transform: uppercase; color: var(--tov-muted);
}
.tov-pick-result {
  display: flex; align-items: center; gap: 8px;
  background: transparent; color: var(--tov-text);
  border: 0; border-radius: 8px;
  padding: 7px 10px; text-align: left;
  font: inherit; font-size: 12.5px; font-weight: 500;
  cursor: pointer;
  transition: background .12s;
}
.tov-pick-result:hover { background: var(--tov-pill); }
.tov-pick-result strong { font-weight: 500; flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tov-pick-result span {
  color: var(--tov-text-2); font-size: 11px; font-weight: 400;
  flex-shrink: 0;
}
.tov-pick-empty {
  margin: 0; padding: 16px 0;
  text-align: center; font-size: 12.5px; color: var(--tov-text-2);
}
.tov-pick-close {
  position: absolute; top: 12px; right: 12px;
  width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; color: var(--tov-text-2);
  border: 0; border-radius: 999px; cursor: pointer;
}
.tov-pick-close:hover { background: var(--tov-pill); color: var(--tov-text); }

/* Animations */
@keyframes tov-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes tov-up { from { opacity: 0; transform: translateY(20px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes tov-fadeup { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tov-typing { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
@keyframes tov-pulse { 0%,100%{opacity:1;} 50%{opacity:.72;} }
.tov-spin { animation: tov-spin 1s linear infinite; }
@keyframes tov-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .tov, .tov-shell, .tov-msg, .tov-spin, .tov-composer-mic.is-rec, .tov-typing span { animation: none !important; }
}
`
