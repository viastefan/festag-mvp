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
 *   Light and dark share the same layout; dark uses OLED-style --tov-* tokens
 *   on the popup shell (no inverted white card).
 *
 * Object-level "Mit Tagro bearbeiten" calls openTagro(). NEVER routes through
 * the old Copilot.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import {
  X, ArrowUp, ArrowsClockwise, ArrowsOut, ArrowsIn,
  Microphone, MicrophoneSlash, Plus, Lightbulb, CaretRight,
  MagnifyingGlass, User, ChartLine, Scales, CheckSquare,
  UsersThree, Warning, FileText, Briefcase, Sun, EnvelopeSimple,
  Copy,
} from '@phosphor-icons/react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import TagroLogo from '@/components/TagroLogo'
import TagroIconRail from '@/components/TagroIconRail'
import {
  applyLabelForAction,
  buildMessageActions,
  executeTagroPreview,
  tagroCreatedHref,
} from '@/lib/tagro/overlay-execute'
import { pickResultToChip, rememberRecentPick, searchTagroPicker, type PickGroup, type PickResult } from '@/lib/tagro/picker-search'
import { replaceTrailingMention, trailingMentionQuery } from '@/lib/tagro/mention-input'
import Link from 'next/link'
import SuggestionIcon from '@/components/brand/SuggestionIcon'
import { detectBrandFromText } from '@/lib/brand/detect-brand'

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
  projectId?: string
  status?: string | null
  clientVisible?: boolean | null
  fullscreen?: boolean
  /** Skip the task-picker modal — open the sana fullscreen agent workspace directly. */
  workspace?: boolean
  /** Send this message immediately after open (e.g. briefing → Tagro handoff). */
  submit?: string
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
  empty: ['Login mit Google hinzufügen', 'Aufgabe vorbereiten', 'Entscheidung formulieren', 'Briefing erzeugen'],
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
      suggestedAction?: string;
      fellBack?: boolean;
      actions?: string[];
      applyBusy?: boolean;
      applyNotice?: string;
      applied?: boolean;
      applyCreated?: Array<{ type: string; id: string; title: string }>;
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

export type AttachedChip = {
  kind: 'object' | 'meta'
  label: string
  objectType?: string
  objectId?: string
}

const FESTAG_CHIP: AttachedChip = { kind: 'object', label: '@Festag' }

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
      lead: 'Ich bin @Festag, dein Project Interpreter.',
      help: 'Erwähne @Projekt, @Aufgabe oder @Entscheidung — ich erkenne den Kontext und bereite den nächsten Schritt vor.',
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
  const chips: AttachedChip[] = [{
    kind: 'object',
    label: mentionLabel,
    objectType: t,
    objectId: isOverview ? undefined : ctx.id,
  }]
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

const EXAMPLE_DESCRIPTIONS: Record<string, string> = {
  'Projektstatus zusammenfassen': 'Kurzbericht für dich oder den Kunden aus allen Signalen.',
  'Offene Entscheidungen erkennen': 'Festag sammelt offene Punkte und formuliert Optionen.',
  'Nächste Aufgaben ableiten': 'Aus dem aktuellen Stand werden konkrete To-dos vorgeschlagen.',
  'Kundenbriefing erstellen': 'Ruhiger Text für Stakeholder, ohne Jargon.',
  'Risiken prüfen': 'Blocker und Verzögerungen werden sichtbar gemacht.',
  'Projektidee': 'Scope skizzieren und erste Schritte ableiten.',
  'Aufgabe vorbereiten': 'Klare Beschreibung, Owner und nächster Schritt.',
  'Entscheidung formulieren': 'Optionen, Empfehlung und Impact aufbereiten.',
  'Briefing erzeugen': 'Wochen- oder Statusbriefing aus dem Projektstand.',
  'Angebot erstellen': 'Struktur und Kernpunkte für ein neues Angebot.',
  'Vertrag vorbereiten': 'Klauseln und offene Punkte als Entwurf.',
  'Rechnung erstellen': 'Positionen und Leistungszeitraum zusammenfassen.',
  'Vorlage anlegen': 'Wiederverwendbare Dokumentvorlage anlegen.',
}

function buildExampleItems(suggestions: string[]): ExampleItem[] {
  const fallbacks = [
    'Festag liest @Projekt-Kontext und schlägt den nächsten Schritt vor.',
    'Mit @Aufgabe oder @Entscheidung arbeiten — immer im richtigen Objekt.',
    'Status, Blocker und nächste Schritte client-safe formulieren.',
    'Aus einem Satz wird Aufgabe, Entscheidung oder Bericht.',
  ]
  return suggestions.slice(0, 4).map((title, i) => ({
    title,
    description: EXAMPLE_DESCRIPTIONS[title] || fallbacks[i % fallbacks.length],
    icon: EXAMPLE_ICONS[i % EXAMPLE_ICONS.length],
  }))
}

/** Highlight @-mentions in copy (Festag accent). */
function renderMentionText(text: string) {
  const parts = text.split(/(@[^\s@]+(?:\s+[^\s@.,;:!?]+)?)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="tov-featured-link">{part}</span>
      : part
  )
}

function FeaturedIntro({ introLead, introHelp }: { introLead: string; introHelp: string }) {
  return (
    <div className="tov-featured-text">
      <p className="tov-featured-lead">{renderMentionText(introLead)}</p>
      <p className="tov-featured-help">{renderMentionText(introHelp)}</p>
    </div>
  )
}

function ContextHint({ introLead, introHelp }: { introLead: string; introHelp: string }) {
  return (
    <div className="tov-context-hint">
      <p className="tov-context-hint-lead">{renderMentionText(introLead)}</p>
      <p className="tov-context-hint-help">{renderMentionText(introHelp)}</p>
    </div>
  )
}

function PickerCardBody({
  attachedChips,
  pinnedCount,
  removeExtra,
  introLead,
  introHelp,
  runFeatured,
  startFromScratch,
  examples,
  runExample,
  error,
}: {
  attachedChips: AttachedChip[]
  pinnedCount: number
  removeExtra: (label: string) => void
  introLead: string
  introHelp: string
  runFeatured: () => void
  startFromScratch: () => void
  examples: ExampleItem[]
  runExample: (title: string) => void
  error: string | null
}) {
  return (
    <>
      <AttachedChipsRow chips={attachedChips} baseCount={pinnedCount} onRemove={removeExtra} />
      <div className="tov-featured">
        <div className="tov-featured-inner">
          <span className="tov-featured-ico" aria-hidden><Lightbulb size={18} weight="regular" /></span>
          <FeaturedIntro introLead={introLead} introHelp={introHelp} />
        </div>
        <button type="button" className="tov-featured-go" onClick={runFeatured} aria-label="Vorschlag starten">
          <CaretRight size={16} weight="bold" />
        </button>
      </div>
      <div className="tov-scratch-wrap">
        <button type="button" className="tov-scratch" onClick={startFromScratch}>
          Von Grund auf starten <CaretRight size={12} weight="bold" />
        </button>
      </div>
      <ExampleGrid examples={examples} onPick={runExample} />
      {error && <p className="tov-err">{error}</p>}
    </>
  )
}

function ExampleGrid({
  examples,
  onPick,
}: {
  examples: ExampleItem[]
  onPick: (title: string) => void
}) {
  if (!examples.length) return null
  return (
    <div className="tov-examples" role="group" aria-label="Beispiele">
      <p className="tov-examples-label">Mit einem Beispiel starten</p>
      <div className="tov-examples-grid">
        {examples.slice(0, 4).map(ex => (
          <button key={ex.title} type="button" className="tov-example-card" onClick={() => onPick(ex.title)}>
            <span className={`tov-example-icon${detectBrandFromText(ex.title) ? ' has-brand' : ''}`} aria-hidden>
              <SuggestionIcon text={ex.title} Icon={ex.icon} size={16} />
            </span>
            <span className="tov-example-copy">
              <span className="tov-example-title">{ex.title}</span>
              {ex.description ? <span className="tov-example-desc">{ex.description}</span> : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function SuggestionPills({
  examples,
  onPick,
}: {
  examples: ExampleItem[]
  onPick: (title: string) => void
}) {
  if (!examples.length) return null
  return (
    <div className="tov-chips" role="group" aria-label="Vorschläge">
      <p className="tov-chips-label">Vorschläge</p>
      <div className="tov-chips-grid">
        {examples.slice(0, 4).map(ex => (
          <button key={ex.title} type="button" className="tov-chip" onClick={() => onPick(ex.title)}>
            <span className={`tov-chip-icon${detectBrandFromText(ex.title) ? ' has-brand' : ''}`} aria-hidden>
              <SuggestionIcon text={ex.title} Icon={ex.icon} size={15} />
            </span>
            <span>{ex.title}</span>
          </button>
        ))}
      </div>
    </div>
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
  const pathname = usePathname() || ''
  const tagroSurface = pathname.startsWith('/dev') ? 'dev' as const : 'client' as const
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const pendingSubmitRef = useRef<string | null>(null)
  const [themeAttr, setThemeAttr] = useState('read')

  // Sync resolved theme onto the portaled .tov root — :root tokens alone do not
  // reliably reach createPortal(document.body) subtrees in all browsers.
  useEffect(() => {
    function syncTheme() {
      setThemeAttr(document.documentElement.getAttribute('data-theme') || 'read')
    }
    syncTheme()
    window.addEventListener('festag-theme', syncTheme)
    const obs = new MutationObserver(syncTheme)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      window.removeEventListener('festag-theme', syncTheme)
      obs.disconnect()
    }
  }, [])

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
      setInput(d.prefill || d.submit || '')
      pendingSubmitRef.current = d.submit?.trim() || null
      setMessages([])
      setError('')
      setExtraAttached([])
      setFromScratch(!!d.workspace || !!d.submit?.trim())
      setFullscreen(!!d.fullscreen || !!d.workspace || !!d.submit?.trim() || pathname.startsWith('/ai'))
      setOpen(true)
    }
    function onToggleFs() { togglePresentation() }
    window.addEventListener('festag:open-tagro', onOpen as EventListener)
    window.addEventListener('festag:tagro-fullscreen-toggle', onToggleFs as EventListener)
    return () => {
      window.removeEventListener('festag:open-tagro', onOpen as EventListener)
      window.removeEventListener('festag:tagro-fullscreen-toggle', onToggleFs as EventListener)
    }
  }, [togglePresentation, pathname])

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

  // Close popup when navigating — avoids invisible full-screen blockers on other routes.
  const pathnameRef = useRef(pathname)
  useLayoutEffect(() => {
    if (pathnameRef.current === pathname) return
    pathnameRef.current = pathname
    if (open) {
      setOpen(false)
      setFullscreen(false)
      setMessages([])
      setInput('')
      setError('')
      setFromScratch(false)
      const el = composerRef.current
      if (el) el.style.height = ''
    }
    document.body.style.overflow = ''
  }, [pathname, open])

  // Sidebar bridge — app shell collapses its rail while we're fullscreen.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const active = open && fullscreen
    window.dispatchEvent(new CustomEvent('festag:tagro-fullscreen', { detail: { active } }))
    return () => { if (active) window.dispatchEvent(new CustomEvent('festag:tagro-fullscreen', { detail: { active: false } })) }
  }, [open, fullscreen])

  // Hydrate live object metadata (status, subtitle, project) when opening from a bound object.
  useEffect(() => {
    if (!open || !ctx.id) return
    const skip = /^(list|inbox|dev-overview|dev-list|dev-plan|dev-updates|dev-inbox|github|dashboard|all)$/.test(ctx.id)
    if (skip) return
    let cancelled = false
    const qs = new URLSearchParams({
      type: ctx.contextType,
      id: ctx.id,
      ...(ctx.title ? { title: ctx.title } : {}),
      ...(ctx.subtitle ? { subtitle: ctx.subtitle } : {}),
      ...(ctx.status ? { status: String(ctx.status) } : {}),
      ...(ctx.projectId ? { projectId: ctx.projectId } : {}),
    })
    fetch(`/api/tagro/context/enrich?${qs}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled || !data?.ok) return
        setCtx(prev => ({
          ...prev,
          subtitle: prev.subtitle || data.subtitle,
          status: prev.status ?? data.status ?? prev.status,
          clientVisible: typeof prev.clientVisible === 'boolean' ? prev.clientVisible : data.clientVisible,
          projectId: prev.projectId || data.projectId,
        }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open, ctx.id, ctx.contextType])

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
    const el = composerRef.current
    if (el) el.style.height = ''
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
          status: ctx.status,
          clientVisible: ctx.clientVisible,
          projectId: ctx.projectId || (ctx.contextType === 'project' ? ctx.id : undefined),
          input: value,
          attached: attachedChips.map(c => ({
            type: c.objectType,
            id: c.objectId,
            label: c.label,
            kind: c.kind,
            title: c.label.replace(/^@\w+\s*/, ''),
          })),
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
      if (!r.ok) {
        throw new Error(data?.error || 'Tagro konnte gerade nicht antworten.')
      }
      const tagroMsg: Message = {
        id: uid(), role: 'tagro',
        understanding: data?.understanding || `Tagro hat „${value.slice(0, 80)}" verstanden.`,
        opinion: data?.opinion || '',
        preview: data?.preview || value,
        warnings: Array.isArray(data?.warnings) ? data.warnings.filter((w: any) => typeof w === 'string').slice(0, 3) : [],
        suggestedAction: typeof data?.suggestedAction === 'string' ? data.suggestedAction : 'note',
        fellBack: !!data?.fellBack,
        actions: buildMessageActions(data?.suggestedAction, ctx.contextType, quickActionsFor(ctx.contextType)),
      }
      setMessages(prev => [...prev, tagroMsg])
    } catch (e: any) {
      setError(e?.message || 'Tagro konnte gerade nicht antworten.')
      const tagroMsg: Message = {
        id: uid(), role: 'tagro',
        understanding: 'Tagro ist gerade nicht voll verbunden — der Entwurf basiert auf deiner Eingabe.',
        preview: value,
        suggestedAction: 'note',
        actions: buildMessageActions('note', ctx.contextType, quickActionsFor(ctx.contextType)),
      }
      setMessages(prev => [...prev, tagroMsg])
    } finally {
      setBusy(false)
      window.setTimeout(() => composerRef.current?.focus(), 60)
    }
  }

  useEffect(() => {
    if (!open) return
    const text = pendingSubmitRef.current
    if (!text) return
    pendingSubmitRef.current = null
    const t = window.setTimeout(() => { void send(text) }, 140)
    return () => clearTimeout(t)
  }, [open, ctx.contextType, ctx.id, ctx.title])

  function runQuickAction(action: string) {
    const applyLabel = applyLabelForAction(
      [...messages].reverse().find(m => m.role === 'tagro')?.suggestedAction,
    )
    if (action === applyLabel) {
      const last = [...messages].reverse().find(m => m.role === 'tagro')
      if (last?.role === 'tagro') { applyTagroResult(last.id); return }
    }
    setInput(action); window.setTimeout(() => send(action), 30)
  }

  async function applyTagroResult(messageId: string) {
    const msg = messages.find(m => m.id === messageId && m.role === 'tagro')
    if (!msg || msg.role !== 'tagro' || !msg.preview || msg.applyBusy || msg.applied) return
    setMessages(prev => prev.map(m => m.id === messageId && m.role === 'tagro'
      ? { ...m, applyBusy: true, applyNotice: '' }
      : m))
    try {
      let result = await fetch('/api/tagro/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preview: msg.preview,
          suggestedAction: msg.suggestedAction,
          ctx: {
            contextType: ctx.contextType,
            id: ctx.id,
            projectId: ctx.projectId,
            title: ctx.title,
            surface: tagroSurface,
          },
        }),
      }).then(r => r.ok ? r.json() : null).catch(() => null)

      if (!result?.ok) {
        result = await executeTagroPreview({
          preview: msg.preview,
          suggestedAction: msg.suggestedAction,
          ctx: {
            contextType: ctx.contextType,
            id: ctx.id,
            projectId: ctx.projectId,
            title: ctx.title,
            surface: tagroSurface,
          },
        })
      }
      setMessages(prev => prev.map(m => m.id === messageId && m.role === 'tagro'
        ? {
            ...m,
            applyBusy: false,
            applied: result.ok,
            applyNotice: result.message,
            applyCreated: result.ok ? result.created : undefined,
          }
        : m))
      if (result.ok && msg.preview && typeof window !== 'undefined') {
        const memoryProjectId = ctx.projectId || (ctx.contextType === 'project' ? ctx.id : undefined)
        fetch('/api/tagro/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: memoryProjectId,
            scope: 'handoff',
            content: msg.preview.slice(0, 500),
          }),
        }).catch(() => {})
        window.dispatchEvent(new CustomEvent('festag:tagro-applied', {
          detail: { mode: result.mode, created: result.created, contextType: ctx.contextType },
        }))
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === messageId && m.role === 'tagro'
        ? { ...m, applyBusy: false, applyNotice: 'Übernahme fehlgeschlagen.' }
        : m))
    }
  }

  async function copyTagroPreview(messageId: string) {
    const msg = messages.find(m => m.id === messageId && m.role === 'tagro')
    if (!msg || msg.role !== 'tagro' || !msg.preview) return
    try {
      await navigator.clipboard.writeText(msg.preview)
      setMessages(prev => prev.map(m => m.id === messageId && m.role === 'tagro'
        ? { ...m, applyNotice: 'Entwurf kopiert.' }
        : m))
    } catch {
      setMessages(prev => prev.map(m => m.id === messageId && m.role === 'tagro'
        ? { ...m, applyNotice: 'Kopieren nicht möglich.' }
        : m))
    }
  }

  function startFromScratch() {
    setFromScratch(true)
    window.setTimeout(() => composerRef.current?.focus(), 80)
  }

  function resetConversation() {
    setMessages([])
    setInput('')
    setError('')
    setExtraAttached([])
    setFromScratch(false)
    window.setTimeout(() => composerRef.current?.focus(), 60)
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
  const { chips: baseChips, introLead, introHelp, placeholder, suggestions } = session
  const attachedChips: AttachedChip[] = useMemo(() => {
    const rest = [...baseChips, ...extraAttached].filter(c => c.label !== '@Festag')
    return [FESTAG_CHIP, ...rest]
  }, [baseChips, extraAttached])
  const pinnedCount = 1 + baseChips.length
  const attachExtra = (c: AttachedChip) => {
    setExtraAttached(prev => prev.some(p => p.label === c.label) ? prev : [...prev, c])
  }
  const removeExtra = (label: string) =>
    setExtraAttached(prev => prev.filter(p => p.label !== label))
  const examples = useMemo(() => buildExampleItems(suggestions), [suggestions])
  const pickerTitle = 'Welche Aufgabe möchtest du erledigen?'
  const contextLine = [
    ctx.title ? `${CTX_CHIP[ctx.contextType]}, ${ctx.title}` : CTX_CHIP[ctx.contextType],
    ctx.subtitle,
    ctx.status ? `Status: ${ctx.status}` : '',
  ].filter(Boolean).join(', ')

  if (!open) return null

  const node = (
    <div
      className={`tov${fullscreen ? ' tov-full' : ''}${inConversation ? ' tov-mode-conversation' : ' tov-mode-initial'}`}
      data-theme={themeAttr}
      role="dialog"
      aria-modal="true"
      aria-label="Neues Update"
      onClick={fullscreen ? undefined : (e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="tov-backdrop" aria-hidden />

      <div className="tov-shell" onClick={e => e.stopPropagation()}>
        {inConversation ? (
          <div className={`tov-workspace${fullscreen ? ' tov-workspace-fs' : ' tov-workspace-compact'}`}>
            {fullscreen && (
              <TagroIconRail variant="inline" onNavigate={() => close()} />
            )}

            <div className={fullscreen ? 'tov-stage-col' : 'tov-compact-col'}>
              <div className={fullscreen ? 'tov-stage-card' : 'tov-main'}>
                <header className={fullscreen ? 'tov-stage-head' : 'tov-compact-head'}>
                  {fullscreen ? (
                    <div className="tov-stage-head-copy">
                      <h1 className="tov-stage-title">Tagro</h1>
                      <p className="tov-stage-sub">{contextLine}</p>
                    </div>
                  ) : (
                    <div className="tov-compact-head-copy">
                      <strong className="tov-compact-title">{ctx.title || CTX_CHIP[ctx.contextType]}</strong>
                      {messages.length === 0 && (
                        <span className="tov-compact-ctx" title={contextLine}>{contextLine}</span>
                      )}
                    </div>
                  )}
                  <div className="tov-top-controls">
                    {messages.length > 0 && (
                      <button
                        type="button"
                        className="tov-reset-btn"
                        onClick={resetConversation}
                        aria-label="Neues Gespräch"
                      >
                        Neu
                      </button>
                    )}
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
                      <ContextHint introLead={introLead} introHelp={introHelp} />
                    )}
                    {messages.map(m => m.role === 'user'
                      ? <UserMsg key={m.id} content={m.content} />
                    : <TagroMsg
                          key={m.id}
                          msg={m}
                          compact={!fullscreen}
                          linkSurface={tagroSurface}
                          onAction={runQuickAction}
                          onApply={() => applyTagroResult(m.id)}
                          onCopy={() => copyTagroPreview(m.id)}
                          onNavigate={close}
                          contextChips={attachedChips}
                        />)}
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
                    {messages.length === 0 && !busy && (
                      <SuggestionPills examples={examples} onPick={fillSuggestion} />
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
                      <h1 className="tov-picker-title">{pickerTitle}</h1>
                      <PickerCardBody
                        attachedChips={attachedChips}
                        pinnedCount={pinnedCount}
                        removeExtra={removeExtra}
                        introLead={introLead}
                        introHelp={introHelp}
                        runFeatured={runFeatured}
                        startFromScratch={startFromScratch}
                        examples={examples}
                        runExample={runExample}
                        error={error}
                      />
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

                <h1 className="tov-picker-title">{pickerTitle}</h1>

                <PickerCardBody
                  attachedChips={attachedChips}
                  pinnedCount={pinnedCount}
                  removeExtra={removeExtra}
                  introLead={introLead}
                  introHelp={introHelp}
                  runFeatured={runFeatured}
                  startFromScratch={startFromScratch}
                  examples={examples}
                  runExample={runExample}
                  error={error}
                />
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
          <span key={`${c.label}-${i}`} className={`tov-attached-chip tov-attached-${c.kind}${c.label === '@Festag' ? ' tov-attached-festag' : ''}`}>
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
  const COMPOSER_MIN_H = 24
  const COMPOSER_MAX_H = 200

  function autosize(el: HTMLTextAreaElement | null) {
    if (!el) return
    el.style.height = '0px'
    const next = Math.min(Math.max(el.scrollHeight, COMPOSER_MIN_H), COMPOSER_MAX_H)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > COMPOSER_MAX_H ? 'auto' : 'hidden'
  }

  useLayoutEffect(() => {
    autosize(inputRef.current)
  }, [value, inputRef])

  // People/Sources picker — opens via the + button or by typing '@'.
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')

  function openPicker(seed = '') {
    setPickerQuery(seed)
    setPickerOpen(true)
  }
  function closePicker() {
    setPickerOpen(false)
    setPickerQuery('')
  }

  function handlePick(chip: AttachedChip) {
    onAttach?.(chip)
    onChange(replaceTrailingMention(value, chip.label))
    closePicker()
    window.setTimeout(() => inputRef.current?.focus(), 30)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); return }
    if (e.key === '@') {
      window.setTimeout(() => {
        const el = inputRef.current
        if (!el) return
        openPicker(trailingMentionQuery(el.value) ?? '')
      }, 0)
    }
  }

  function onInputChange(next: string) {
    onChange(next)
    const mentionQ = trailingMentionQuery(next)
    if (mentionQ !== null) {
      setPickerQuery(mentionQ)
      if (!pickerOpen) setPickerOpen(true)
    } else if (pickerOpen && pickerQuery) {
      closePicker()
    }
  }

  return (
    <div className={`tov-composer tov-composer-${variant}`}>
      <div className="tov-composer-stack">
        <div className={`tov-composer-shell${value.trim() ? ' has-text' : ''}`}>
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
            onChange={e => { autosize(e.currentTarget); onInputChange(e.target.value) }}
            onKeyDown={onKeyDown}
          />
          <div className="tov-composer-toolbar">
            <button
              type="button"
              className="tov-composer-plus"
              aria-label="Quellen hinzufügen"
              title="Quellen hinzufügen"
              onClick={() => openPicker('')}
            >
              <Plus size={variant === 'hero' ? 20 : 18} weight="regular" />
            </button>
            <span className="tov-composer-spacer" aria-hidden />
            {micOk && (
              <button type="button" className={`tov-composer-mic${rec ? ' is-rec' : ''}`} onClick={onMic} aria-label={rec ? 'Aufnahme stoppen' : 'Per Sprache diktieren'}>
                {rec ? <MicrophoneSlash size={variant === 'hero' ? 20 : 18} weight="regular" /> : <Microphone size={variant === 'hero' ? 20 : 18} weight="regular" />}
              </button>
            )}
            <button type="button" className="tov-composer-send" onClick={onSend} disabled={busy || !value.trim()} aria-label="Senden">
              {busy ? <ArrowsClockwise size={variant === 'hero' ? 18 : 17} className="tov-spin" /> : <ArrowUp size={variant === 'hero' ? 18 : 17} weight="bold" />}
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
          onPick={handlePick}
          initialQuery={pickerQuery}
          fullscreen={fullscreen}
        />
      )}
    </div>
  )
}

// ── People / Sources / Objects picker ─────────────────────────────────────

const PICK_GROUP_ORDER: PickGroup[] = [
  'Quellen', 'Personen', 'Projekte', 'Aufgaben', 'Entscheidungen', 'Berichte', 'Dokumente', 'Kunden', 'Notizen',
]

function pickGroupIcon(group: PickGroup) {
  switch (group) {
    case 'Quellen': return <LinkSimple size={14} />
    case 'Personen': return <User size={14} weight="fill" />
    case 'Projekte': return <Briefcase size={14} />
    case 'Aufgaben': return <CheckSquare size={14} />
    case 'Entscheidungen': return <Scales size={14} />
    case 'Berichte': return <ChartLine size={14} />
    case 'Dokumente': return <FileText size={14} />
    case 'Kunden': return <UsersThree size={14} />
    default: return <FileText size={14} />
  }
}

function PickResultIcon({ result, group }: { result: PickResult; group: PickGroup }) {
  const text = `${result.title} ${result.hint || ''}`
  const brand = result.brand ?? detectBrandFromText(text)
  if (brand) {
    return <SuggestionIcon text={text} brand={brand} size={14} />
  }
  return <>{pickGroupIcon(group)}</>
}

function PeopleObjectPicker({
  onClose, onPick, initialQuery = '', fullscreen = false,
}: {
  onClose: () => void
  onPick: (chip: AttachedChip) => void
  initialQuery?: string
  fullscreen?: boolean
}) {
  const [q, setQ] = useState(initialQuery)
  const [results, setResults] = useState<PickResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  useEffect(() => { setQ(initialQuery) }, [initialQuery])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = window.setTimeout(async () => {
      try {
        const out = await searchTagroPicker(q)
        if (!cancelled) {
          setResults(out)
          setActiveIdx(0)
        }
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 180)
    return () => { cancelled = true; window.clearTimeout(t) }
  }, [q])

  const groups = useMemo(() => {
    const map = new Map<PickGroup, PickResult[]>()
    for (const r of results) {
      if (!map.has(r.group)) map.set(r.group, [])
      map.get(r.group)!.push(r)
    }
    return PICK_GROUP_ORDER
      .filter(g => map.has(g))
      .map(g => [g, map.get(g)!] as const)
  }, [results])

  const flatResults = useMemo(() => groups.flatMap(([, items]) => items), [groups])

  function pickAt(idx: number) {
    const r = flatResults[idx]
    if (!r) return
    rememberRecentPick(r)
    onPick(pickResultToChip(r))
    onClose()
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!flatResults.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pickAt(activeIdx)
    }
  }

  let flatCursor = 0

  const pickNode = (
    <div
      className={`tov-pick${fullscreen ? ' tov-pick-full' : ''}`}
      role="dialog"
      aria-label="Quellen und Personen hinzufügen"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="tov-pick-backdrop" aria-hidden />
      <div className="tov-pick-sheet" onClick={e => e.stopPropagation()}>
        <div className="tov-pick-head">
          <p className="tov-pick-kicker">Kontext hinzufügen</p>
          <button type="button" className="tov-pick-close" onClick={onClose} aria-label="Schließen"><X size={14} /></button>
        </div>
        <div className="tov-pick-searchbar">
          <MagnifyingGlass size={16} weight="regular" />
          <input
            ref={searchRef}
            type="text"
            className="tov-pick-search"
            placeholder="Personen, Projekte, Aufgaben, Berichte …"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onSearchKeyDown}
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
              <p className="tov-pick-group-label">{group}</p>
              {items.map(r => {
                const idx = flatCursor++
                const isActive = idx === activeIdx
                return (
                <button
                  key={`${group}-${r.id}`}
                  type="button"
                  className={`tov-pick-result${isActive ? ' is-active' : ''}`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => { rememberRecentPick(r); onPick(pickResultToChip(r)); onClose() }}
                >
                  <span className="tov-pick-result-ico" aria-hidden>
                    <PickResultIcon result={r} group={group} />
                  </span>
                  <span className="tov-pick-result-body">
                    <strong>{r.title}</strong>
                    {r.hint && <span>{r.hint}</span>}
                  </span>
                  <span className="tov-pick-mention">{r.mentionLabel}</span>
                </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return typeof document === 'undefined' ? pickNode : createPortal(pickNode, document.body)
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
  msg, compact = false, onAction, onApply, onCopy, onNavigate, contextChips = [], linkSurface = 'client',
}: {
  msg: Extract<Message, { role: 'tagro' }>
  compact?: boolean
  linkSurface?: 'client' | 'dev'
  onAction: (a: string) => void
  onApply: () => void
  onCopy: () => void
  onNavigate?: () => void
  contextChips?: AttachedChip[]
}) {
  const applyLabel = applyLabelForAction(msg.suggestedAction)

  if (compact) {
    const body = msg.preview || msg.opinion || msg.understanding
    return (
      <div className="tov-msg tov-msg-tagro tov-msg-tagro-compact">
        <div className="tov-msg-tagro-head">
          <TagroLogo size={16} />
          {body && (
            msg.preview
              ? <div className="tov-msg-preview">{msg.preview}</div>
              : <p className="tov-msg-text">{body}</p>
          )}
        </div>
        {msg.fellBack && (
          <p className="tov-fallback-note">Vorschau basiert auf deiner Eingabe.</p>
        )}
        {msg.preview && (
          <div className="tov-msg-foot tov-msg-foot-inline">
            <button type="button" className="tov-msg-secondary" onClick={onCopy}>
              <Copy size={13} /> Kopieren
            </button>
            <button
              type="button"
              className="tov-msg-primary"
              onClick={onApply}
              disabled={msg.applyBusy || msg.applied}
            >
              {msg.applyBusy
                ? <><ArrowsClockwise size={13} className="tov-spin" /> …</>
                : msg.applied ? 'Übernommen' : applyLabel}
            </button>
          </div>
        )}
        {msg.applyNotice && <p className="tov-apply-notice">{msg.applyNotice}</p>}
      </div>
    )
  }

  return (
    <div className="tov-msg tov-msg-tagro">
      <div className="tov-msg-tagro-head">
        <TagroLogo size={18} />
        {msg.understanding && (
          <p className="tov-msg-text tov-msg-lead">{msg.understanding}</p>
        )}
      </div>
      {msg.fellBack && (
        <p className="tov-fallback-note">Tagro ist gerade nicht voll verbunden — Vorschau basiert auf deiner Eingabe.</p>
      )}
      {msg.opinion && (
        <p className="tov-msg-text">{msg.opinion}</p>
      )}
      {msg.preview && (
        <div className="tov-msg-preview">{msg.preview}</div>
      )}
      {contextChips.length > 0 && (
        <div className="tov-source-pills" aria-label="Quellen">
          {contextChips.slice(0, 2).map((c, i) => (
            <span key={`${c.label}-${i}`} className={`tov-source-pill tov-source-pill-${i % 2}`}>{c.label}</span>
          ))}
        </div>
      )}
      {msg.warnings && msg.warnings.length > 0 && (
        <div className="tov-warnings">
          {msg.warnings.map((w, i) => <p key={i} className="tov-warning">{w}</p>)}
        </div>
      )}
      {msg.preview && (
        <div className="tov-msg-foot">
          <button type="button" className="tov-msg-secondary" onClick={onCopy}>
            <Copy size={14} /> Kopieren
          </button>
          <button
            type="button"
            className="tov-msg-primary"
            onClick={onApply}
            disabled={msg.applyBusy || msg.applied}
          >
            {msg.applyBusy
              ? <><ArrowsClockwise size={14} className="tov-spin" /> Wird übernommen …</>
              : msg.applied ? 'Übernommen' : applyLabel}
          </button>
        </div>
      )}
      {msg.applyNotice && <p className="tov-apply-notice">{msg.applyNotice}</p>}
      {msg.applyCreated && msg.applyCreated.length > 0 && (
        <div className="tov-created-links">
          {msg.applyCreated.map(item => {
            const href = tagroCreatedHref(item, linkSurface)
            const label = item.title || item.type
            return href
              ? <Link key={`${item.type}-${item.id}`} href={href} className="tov-created-link" onClick={onNavigate}>{label} öffnen →</Link>
              : <span key={`${item.type}-${item.id}`} className="tov-created-link-static">{label}</span>
          })}
        </div>
      )}
      {(() => {
        const extraActions = (msg.actions ?? []).filter(a => a !== applyLabel).slice(0, 3)
        if (!extraActions.length) return null
        return (
          <div className="tov-quickactions">
            {extraActions.map(a => (
              <button key={a} type="button" className="tov-quickaction" onClick={() => onAction(a)}>{a}</button>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

// ── Global styles (raw CSS so [data-theme="dark"] cascades properly) ──────

const STYLES = `
:root {
  --tov-bg: #FFFFFF;
  --tov-bg-2: #F5F5F7;
  --tov-canvas: #F5F5F7;
  --tov-input: #FAFAFA;
  --tov-input-2: #FFFFFF;
  --tov-text: #1D1D1F;
  --tov-text-2: #86868B;
  --tov-muted: #86868B;
  --tov-border: rgba(0,0,0,0.08);
  --tov-border-2: rgba(0,0,0,0.12);
  --tov-accent: #5B647D;
  --tov-accent-soft: rgba(91, 100, 125, 0.14);
  --tov-accent-mid: rgba(91, 100, 125, 0.28);
  --tov-accent-glow: rgba(91, 100, 125, 0.22);
  --tov-accent-ring: rgba(91, 100, 125, 0.20);
  --tov-send: #111111;
  --tov-send-text: #FFFFFF;
  --tov-shadow: 0 28px 72px -28px rgba(15,23,42,0.26);
  --tov-backdrop: var(--modal-backdrop);
  --tov-link: #2563eb;
  --tov-pill: rgba(0,0,0,0.04);
  --tov-pill-h: rgba(0,0,0,0.07);
  --tov-warn-bg: rgba(245,158,11,0.10);
  --tov-warn-bar: rgba(245,158,11,0.55);
  --tov-source-green: #E8F5EE;
  --tov-source-blue: #EEF2F7;
}
[data-theme="light"],
[data-theme="pure-light"] {
  --tov-bg: #FFFFFF;
  --tov-bg-2: #F5F5F7;
  --tov-canvas: #F5F5F7;
  --tov-input: #FAFAFA;
  --tov-input-2: #FFFFFF;
  --tov-text: #1D1D1F;
  --tov-text-2: #86868B;
  --tov-muted: #86868B;
  --tov-border: rgba(0,0,0,0.08);
  --tov-border-2: rgba(0,0,0,0.12);
  --tov-pill: rgba(0,0,0,0.04);
  --tov-pill-h: rgba(0,0,0,0.07);
}
[data-theme="read"] {
  --tov-bg: #FFFFFF;
  --tov-bg-2: #F5F5F7;
  --tov-canvas: #F5F5F7;
  --tov-input: #FAFAFA;
  --tov-input-2: #FFFFFF;
  --tov-text: #1D1D1F;
  --tov-text-2: #86868B;
  --tov-muted: #86868B;
  --tov-border: rgba(0,0,0,0.08);
  --tov-border-2: rgba(0,0,0,0.12);
  --tov-pill: rgba(0,0,0,0.04);
  --tov-pill-h: rgba(0,0,0,0.07);
  --tov-backdrop: var(--modal-backdrop);
  --tov-shadow: 0 28px 72px -28px rgba(15,23,42,0.26);
}
[data-theme="dark"], [data-theme="classic-dark"] {
  --tov-bg: var(--festag-black-popup, #121214);
  --tov-bg-2: #161618;
  --tov-canvas: var(--festag-black-canvas, #000000);
  --tov-input: #0a0a0c;
  --tov-input-2: #101012;
  --tov-text: #F4F4F4;
  --tov-text-2: #B0B0B5;
  --tov-muted: #8A8A90;
  --tov-border: rgba(255,255,255,0.10);
  --tov-border-2: rgba(255,255,255,0.14);
  --tov-accent: #7a839c;
  --tov-accent-soft: rgba(122, 131, 156, 0.18);
  --tov-accent-mid: rgba(122, 131, 156, 0.34);
  --tov-accent-glow: rgba(122, 131, 156, 0.28);
  --tov-accent-ring: rgba(122, 131, 156, 0.24);
  --tov-send: #F4F4F4;
  --tov-send-text: #0A0A0A;
  --tov-shadow: 0 32px 88px -28px rgba(0,0,0,0.82);
  --tov-backdrop: rgba(0, 0, 0, 0.24);
  --tov-link: #b8c0cc;
  --tov-pill: rgba(255,255,255,0.06);
  --tov-pill-h: rgba(255,255,255,0.11);
  --tov-warn-bg: rgba(245,158,11,0.14);
  --tov-warn-bar: rgba(251,191,36,0.72);
  --tov-source-green: rgba(52, 199, 89, 0.14);
  --tov-source-blue: rgba(91, 100, 125, 0.18);
}

/* Portaled overlay carries its own theme — popup shell must not stay white in dark. */
.tov[data-theme="dark"],
.tov[data-theme="classic-dark"],
html[data-theme="dark"] .tov,
html[data-theme="classic-dark"] .tov {
  color-scheme: dark;
  --tov-bg: var(--festag-black-popup, #121214);
  --tov-bg-2: #161618;
  --tov-canvas: var(--festag-black-canvas, #000000);
  --tov-input: #0a0a0c;
  --tov-input-2: #101012;
  --tov-text: #F4F4F4;
  --tov-text-2: #B0B0B5;
  --tov-muted: #8A8A90;
  --tov-border: rgba(255,255,255,0.10);
  --tov-border-2: rgba(255,255,255,0.14);
  --tov-accent: #7a839c;
  --tov-accent-soft: rgba(122, 131, 156, 0.18);
  --tov-accent-mid: rgba(122, 131, 156, 0.34);
  --tov-accent-glow: rgba(122, 131, 156, 0.28);
  --tov-accent-ring: rgba(122, 131, 156, 0.24);
  --tov-send: #F4F4F4;
  --tov-send-text: #0A0A0A;
  --tov-shadow: 0 32px 88px -28px rgba(0,0,0,0.82);
  --tov-backdrop: rgba(0, 0, 0, 0.24);
  --tov-link: #b8c0cc;
  --tov-pill: rgba(255,255,255,0.06);
  --tov-pill-h: rgba(255,255,255,0.11);
  --tov-warn-bg: rgba(245,158,11,0.14);
  --tov-warn-bar: rgba(251,191,36,0.72);
  --tov-source-green: rgba(52, 199, 89, 0.14);
  --tov-source-blue: rgba(91, 100, 125, 0.18);
}
.tov[data-theme="read"],
.tov[data-theme="light"],
.tov[data-theme="pure-light"],
html[data-theme="read"] .tov,
html[data-theme="light"] .tov,
html[data-theme="pure-light"] .tov {
  --tov-bg: #FFFFFF;
  --tov-bg-2: #F5F5F7;
  --tov-canvas: #F5F5F7;
  --tov-input: #FAFAFA;
  --tov-input-2: #FFFFFF;
  --tov-text: #1D1D1F;
  --tov-text-2: #86868B;
  --tov-muted: #86868B;
  --tov-border: rgba(0, 0, 0, 0.08);
  --tov-border-2: rgba(0, 0, 0, 0.12);
  --tov-pill: rgba(0, 0, 0, 0.04);
  --tov-pill-h: rgba(0, 0, 0, 0.07);
}
.tov[data-theme="dark"] .tov-shell,
.tov[data-theme="classic-dark"] .tov-shell,
html[data-theme="dark"] .tov .tov-shell,
html[data-theme="classic-dark"] .tov .tov-shell {
  background: var(--tov-bg);
  color: #F4F4F4;
  border-color: rgba(255, 255, 255, 0.08);
}

/* Stage — popup backdrop matches Modal / NewProject / AssignDev tokens */
.tov {
  position: fixed; inset: 0; z-index: 2147483600;
  display: flex; align-items: center; justify-content: center;
  padding: 32px;
  font-family: var(--font-aeonik, 'Aeonik', Inter, -apple-system, sans-serif);
  color: var(--tov-text);
  animation: tov-in .22s ease both;
  transition: padding .35s cubic-bezier(.16,1,.3,1);
}
.tov:not(.tov-full) {
  background: var(--tov-backdrop, var(--modal-backdrop));
  backdrop-filter: blur(var(--modal-backdrop-blur)) saturate(115%);
  -webkit-backdrop-filter: blur(var(--modal-backdrop-blur)) saturate(115%);
}
.tov.tov-full {
  padding: 0;
  justify-content: stretch; align-items: stretch;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
@media (max-width: 720px) { .tov.tov-full { padding: 0; align-items: stretch; } }

.tov-backdrop {
  position: absolute; inset: 0;
  background: transparent;
  pointer-events: none;
}
.tov:not(.tov-full)::after {
  display: none;
}
.tov.tov-full .tov-backdrop { display: none; }
.tov.tov-full::after { display: none; }

.tov-shell {
  position: relative;
  z-index: 1;
  width: min(900px, calc(100vw - 48px));
  max-height: min(92vh, 920px);
  min-height: min(740px, 84vh);
  background: var(--tov-bg);
  border: 1px solid var(--tov-border);
  border-radius: 32px;
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.18),
    0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: tov-up .32s cubic-bezier(.16,1,.3,1) both;
  transition: width .35s cubic-bezier(.16,1,.3,1), height .35s cubic-bezier(.16,1,.3,1), max-height .35s cubic-bezier(.16,1,.3,1), border-radius .35s, box-shadow .35s;
}
.tov:not(.tov-full) .tov-shell {
  box-shadow:
    0 1px 2px rgba(15,23,42,.06),
    0 40px 96px -28px rgba(15,23,42,.45);
}
[data-theme="dark"] .tov:not(.tov-full) .tov-shell,
[data-theme="classic-dark"] .tov:not(.tov-full) .tov-shell {
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.45),
    0 40px 96px -28px rgba(0, 0, 0, 0.62);
}
.tov-shell::before {
  display: none;
}
[data-theme="dark"] .tov.tov-full .tov-shell,
[data-theme="classic-dark"] .tov.tov-full .tov-shell {
  background: transparent;
  border: none;
  box-shadow: none;
  color-scheme: normal;
}
.tov:not(.tov-full) .tov-shell {
  display: flex;
  flex-direction: column;
}
.tov.tov-full .tov-shell {
  width: 100%; max-width: none; max-height: none;
  height: 100%; border-radius: 0; box-shadow: none;
  background: transparent;
}
.tov.tov-mode-conversation:not(.tov-full) .tov-shell {
  width: min(820px, calc(100vw - 64px));
  height: min(86vh, 860px);
  max-height: min(86vh, 860px);
  min-height: min(600px, 72vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tov.tov-mode-initial:not(.tov-full) .tov-shell {
  min-height: min(740px, 84vh);
  background: #f5f5f7;
}
[data-theme="dark"] .tov.tov-mode-initial:not(.tov-full) .tov-shell,
[data-theme="classic-dark"] .tov.tov-mode-initial:not(.tov-full) .tov-shell {
  background: var(--festag-black-popup, #121214);
}

/* ── Task picker (sana modal + Festag context) ── */
.tov-picker {
  flex: 1; min-height: 0;
  display: flex; flex-direction: column;
  background: transparent;
}
.tov-picker-view {
  flex: 1; min-height: 0; overflow-y: auto;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 32px 36px 24px;
}
.tov-picker-footer {
  flex: 0 0 auto;
  padding: 16px 32px max(28px, env(safe-area-inset-bottom, 0px));
  border-top: none;
  background: transparent;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 0;
}
[data-theme="dark"] .tov-picker-footer,
[data-theme="classic-dark"] .tov-picker-footer {
  box-shadow: none;
}
.tov-picker-footer .tov-composer { max-width: 100%; margin: 0 auto; }
.tov-picker-footer .tov-chips {
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}
.tov-picker-card {
  width: 100%; max-width: 100%;
  position: relative;
}
.tov-picker-top {
  display: flex; justify-content: flex-end; gap: 8px;
  margin-bottom: 8px;
  position: sticky; top: 0; z-index: 2;
  background: transparent;
  padding: 4px 0 8px;
}
.tov-picker-title {
  margin: 0 0 clamp(20px, 2.8vh, 28px);
  text-align: center;
  font-size: clamp(24px, 3.2vw, 32px);
  font-weight: 600;
  letter-spacing: -.02em;
  line-height: 1.25;
  color: var(--tov-text);
  text-wrap: balance;
}
.tov.tov-full.tov-mode-initial .tov-picker-title {
  font-size: clamp(28px, 3.8vw, 40px);
  margin-bottom: clamp(28px, 3.5vh, 36px);
}
.tov-featured {
  position: relative;
  width: 100%;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 16px 16px 54px;
  margin-bottom: 18px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02);
}
[data-theme="dark"] .tov-featured,
[data-theme="classic-dark"] .tov-featured {
  background: var(--festag-black-content, #0c0c0e);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: none;
}
.tov-featured-inner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.tov-featured-ico {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--tov-muted);
  opacity: .75;
}
.tov-featured-text {
  flex: 1;
  min-width: 0;
}
.tov-featured-lead {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--tov-text);
}
.tov-featured-help {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--tov-text-2);
}
.tov-featured-link { color: var(--tov-link); font-weight: 500; }
.tov-featured-go {
  position: absolute;
  right: 14px;
  bottom: 14px;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--tov-text);
  color: var(--tov-bg);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: opacity .14s ease, transform .12s ease;
}
[data-theme="dark"] .tov-featured-go,
[data-theme="classic-dark"] .tov-featured-go {
  background: #f4f4f5;
  color: #18181b;
}
.tov-featured-go:hover {
  opacity: .9;
  transform: translateX(1px);
}

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
  background: var(--tov-accent); color: #FFFFFF;
}
.tov-attached-festag {
  background: rgba(37, 99, 235, 0.12);
  color: var(--tov-link);
  border: 1px solid rgba(37, 99, 235, 0.22);
}
[data-theme="dark"] .tov-attached-festag,
[data-theme="classic-dark"] .tov-attached-festag {
  background: rgba(37, 99, 235, 0.18);
  border-color: rgba(96, 165, 250, 0.28);
  color: #93c5fd;
}
.tov-attached-meta {
  background: var(--tov-pill);
  color: var(--tov-text-2);
  border: none;
}
[data-theme="dark"] .tov-attached-meta,
[data-theme="classic-dark"] .tov-attached-meta {
  background: rgba(255, 255, 255, 0.06);
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

.tov-examples { width: 100%; margin: 0 0 8px; }
.tov-examples-label {
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--tov-text);
}
.tov-examples-grid {
  display: grid;
  gap: 10px 12px;
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 640px) { .tov-examples-grid { grid-template-columns: 1fr; } }
.tov-example-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  text-align: left;
  background: transparent;
  color: var(--tov-text);
  border: none;
  border-radius: 12px;
  padding: 6px 4px;
  font: inherit;
  cursor: pointer;
  transition: background .14s ease;
}
.tov-example-card:hover { background: var(--tov-pill); }
.tov-example-icon {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--tov-pill);
  color: var(--tov-text);
}
.tov-example-icon.has-brand {
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}
[data-theme="dark"] .tov-example-icon.has-brand,
[data-theme="classic-dark"] .tov-example-icon.has-brand {
  background: rgba(255, 255, 255, 0.96);
}
.tov-example-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.tov-example-title {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--tov-text);
}
.tov-example-desc {
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--tov-text-2);
}

.tov-chips { width: 100%; margin-top: 0; }
.tov-chips-label {
  margin: 0 0 10px;
  font-size: 10.5px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--tov-muted);
}
.tov-chips-grid { display: grid; gap: 8px; grid-template-columns: 1fr 1fr; }
@media (max-width: 640px) { .tov-chips-grid { grid-template-columns: 1fr; } }
.tov-chip {
  display: flex; align-items: center; gap: 10px; text-align: left;
  background: #ffffff;
  color: var(--tov-text);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 13px 14px;
  min-height: 48px;
  font: inherit; font-size: 13px; font-weight: 500; line-height: 1.35;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 1),
    0 1px 0 rgba(0, 0, 0, 0.02);
  transition: background .14s ease, border-color .14s ease, transform .12s ease;
}
.tov-chip svg { flex-shrink: 0; opacity: .85; color: var(--tov-text); }
.tov-chip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tov-chip-icon.has-brand .festag-brand-icon {
  width: 24px !important;
  height: 24px !important;
}
.tov-chip:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.11);
}
.tov-chip:active { transform: scale(.99); }
[data-theme="dark"] .tov-chip,
[data-theme="classic-dark"] .tov-chip {
  background: rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .tov-chip:hover,
[data-theme="classic-dark"] .tov-chip:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Empty fullscreen chat */
.tov-context-hint {
  margin: 0;
  padding: 28px 0 12px;
  text-align: center;
  max-width: 480px;
  align-self: center;
}
.tov-context-hint-lead {
  margin: 0 0 8px;
  font-size: 15px; font-weight: 600; line-height: 1.45;
  color: var(--tov-text);
}
.tov-context-hint-help {
  margin: 0;
  font-size: 14px; line-height: 1.55;
  color: var(--tov-text-2);
}
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
  padding: clamp(32px, 4vh, 48px) 32px 20px;
  align-items: flex-start;
  justify-content: center;
}
.tov.tov-full.tov-mode-initial .tov-picker-card {
  max-width: 660px;
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
  margin: 0 0 28px;
  padding: 9px 16px;
  background: var(--tov-pill);
  color: var(--tov-text-2);
  border: none;
  border-radius: 999px;
  font: inherit; font-size: 13px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.tov-scratch:hover { background: var(--tov-pill-h); color: var(--tov-text); }
[data-theme="dark"] .tov-scratch,
[data-theme="classic-dark"] .tov-scratch {
  background: rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .tov-scratch:hover,
[data-theme="classic-dark"] .tov-scratch:hover {
  background: rgba(255, 255, 255, 0.08);
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
.tov.tov-full:not([data-theme="dark"]):not([data-theme="classic-dark"]) {
  --tov-canvas: #F6F6F7;
  --tov-bg: var(--raised, #FAFAFA);
  --tov-border: rgba(0, 0, 0, 0.06);
  --tov-input: #FAFAFA;
}
.tov.tov-full[data-theme="dark"],
.tov.tov-full[data-theme="classic-dark"],
[data-theme="dark"] .tov.tov-full,
[data-theme="classic-dark"] .tov.tov-full {
  --tov-canvas: var(--festag-black-canvas, #000000);
  --tov-bg: var(--festag-black-content, #0c0c0e);
  --tov-border: rgba(255, 255, 255, 0.08);
  --tov-input: #0a0a0c;
  --tov-input-2: #101012;
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
  background: color-mix(in srgb, var(--tov-bg) 88%, transparent);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border-radius: 12px;
  border: none;
  overflow: hidden;
  box-shadow:
    0 20px 56px -32px rgba(15, 23, 42, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
[data-theme="dark"] .tov-stage-card,
[data-theme="classic-dark"] .tov-stage-card {
  background: rgba(32, 32, 36, 0.72);
  box-shadow:
    0 24px 64px -28px rgba(0, 0, 0, 0.72),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
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
  border-bottom: none;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}
[data-theme="dark"] .tov-stage-head,
[data-theme="classic-dark"] .tov-stage-head {
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.05);
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
  background: transparent;
  border-top: none;
  box-shadow: inset 0 1px 0 rgba(0, 0, 0, 0.06);
}
[data-theme="dark"] .tov.tov-full .tov-floatbar,
[data-theme="classic-dark"] .tov.tov-full .tov-floatbar {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
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

/* Compact popup chat — composer pinned to bottom, timeline scrolls above */
.tov-compact-col {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tov-workspace-compact {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--tov-bg);
}
.tov-workspace-compact .tov-main {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tov-compact-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--tov-border);
  flex-shrink: 0;
  background: var(--tov-bg);
  box-shadow: none;
}
[data-theme="dark"] .tov-compact-head,
[data-theme="classic-dark"] .tov-compact-head {
  box-shadow: none;
  background: var(--tov-bg);
  border-bottom-color: var(--tov-border);
}
.tov-compact-head-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
.tov-compact-title {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--tov-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tov-compact-ctx {
  font-size: 11px;
  font-weight: 400;
  color: var(--tov-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.01em;
}
.tov-workspace-compact .tov-timeline {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 20px 12px;
  -webkit-overflow-scrolling: touch;
}
.tov-workspace-compact .tov-timeline-inner {
  gap: 16px;
  max-width: none;
  padding-top: 0;
  min-height: min-content;
  justify-content: flex-start;
}
.tov-workspace-compact .tov-msg-user {
  max-width: 82%;
}
.tov-workspace-compact .tov-msg-user-bubble {
  font-size: 14px;
  padding: 11px 14px;
  border-radius: 16px 16px 4px 16px;
  background: var(--tov-input);
  border: 1px solid var(--tov-border);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.12);
}
[data-theme="dark"] .tov-workspace-compact .tov-msg-user-bubble,
[data-theme="classic-dark"] .tov-workspace-compact .tov-msg-user-bubble {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 2px 8px rgba(0, 0, 0, 0.28);
}
.tov-workspace-compact .tov-msg-user-avatar {
  width: 24px; height: 24px;
}
.tov-workspace-compact .tov-msg-text {
  font-size: 13.5px;
  line-height: 1.55;
}
.tov-workspace-compact .tov-msg-preview {
  font-size: 13px;
  line-height: 1.55;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--tov-input);
  border: 1px solid var(--tov-border);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.1);
}
[data-theme="dark"] .tov-workspace-compact .tov-msg-preview,
[data-theme="classic-dark"] .tov-workspace-compact .tov-msg-preview {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 2px 8px rgba(0, 0, 0, 0.24);
}
.tov-workspace-compact .tov-quickactions {
  padding-left: 0;
  gap: 6px;
  margin-top: 2px;
}
.tov-workspace-compact .tov-quickaction {
  height: 30px;
  font-size: 12px;
  padding: 0 12px;
  border: none;
  background: var(--tov-pill);
  color: var(--tov-text-2);
}
.tov-workspace-compact .tov-warning {
  font-size: 12px;
  padding: 9px 11px;
}
.tov-workspace-compact .tov-floatbar {
  flex: 0 0 auto;
  margin-top: auto;
  width: 100%;
  padding: 12px 18px max(18px, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--tov-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  background: var(--tov-bg);
}
[data-theme="dark"] .tov-workspace-compact .tov-floatbar,
[data-theme="classic-dark"] .tov-workspace-compact .tov-floatbar {
  box-shadow: none;
  background: var(--tov-bg);
}
.tov-workspace-compact .tov-floatbar-inner {
  max-width: none;
  gap: 10px;
}
.tov-workspace-compact .tov-empty-hint {
  padding: 8px 2px 4px;
  font-size: 13px;
  text-align: left;
  align-self: stretch;
}
.tov-composer-compact .tov-composer-shell {
  border-radius: 22px;
  border: 1px solid var(--tov-border);
  background: var(--tov-input);
  box-shadow: none;
  transition: background .18s ease, border-color .18s ease;
}
.tov-composer-compact .tov-composer-shell:focus-within {
  background: var(--tov-input-2);
  border-color: var(--tov-border-2);
  box-shadow: none;
}
[data-theme="dark"] .tov-composer-compact .tov-composer-shell,
[data-theme="classic-dark"] .tov-composer-compact .tov-composer-shell {
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: none;
}
[data-theme="dark"] .tov-composer-compact .tov-composer-shell:focus-within,
[data-theme="classic-dark"] .tov-composer-compact .tov-composer-shell:focus-within {
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: none;
}
[data-theme="dark"] .tov-composer-compact .tov-composer-send:not(:disabled),
[data-theme="classic-dark"] .tov-composer-compact .tov-composer-send:not(:disabled) {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.28);
}
.tov-composer-compact .tov-composer-send:not(:disabled) {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 2px 6px rgba(0, 0, 0, 0.18);
}
.tov-composer-compact .tov-composer-input {
  font-size: 13px;
  padding: 12px 14px 4px;
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
.tov-workspace-compact .tov-main {
  display: flex;
  flex-direction: column;
}

/* Top bar controls (shared) */
.tov-top-controls { display: inline-flex; gap: 8px; flex-shrink: 0; align-items: center; }
.tov-reset-btn {
  height: 32px; padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: var(--tov-pill);
  color: var(--tov-text-2);
  font: inherit; font-size: 12.5px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.tov-reset-btn:hover { background: var(--tov-pill-h); color: var(--tov-text); }
.tov-iconbtn {
  width: 36px; height: 36px;
  min-width: 36px; min-height: 36px;
  padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tov-pill);
  color: var(--tov-text-2);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: background .14s, color .14s, transform .12s;
}
[data-theme="dark"] .tov-iconbtn,
[data-theme="classic-dark"] .tov-iconbtn {
  background: rgba(255, 255, 255, 0.06);
}
.tov-iconbtn:hover {
  background: var(--tov-pill-h);
  color: var(--tov-text);
}
[data-theme="dark"] .tov-iconbtn:hover,
[data-theme="classic-dark"] .tov-iconbtn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.tov-iconbtn:active { transform: scale(.96); }

/* Composer — ChatGPT-style dock: grows upward, toolbar pinned at bottom */
.tov-composer {
  width: 100%;
}
.tov-composer-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}
.tov-composer-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
  border-radius: 26px;
  border: none;
  background: var(--tov-input);
  box-shadow: none;
  transition: background .18s ease;
}
.tov-composer-shell:focus-within {
  background: color-mix(in srgb, var(--tov-input) 94%, var(--tov-bg));
}
[data-theme="dark"] .tov-composer-shell,
[data-theme="classic-dark"] .tov-composer-shell {
  background: var(--tov-input);
}
[data-theme="dark"] .tov-composer-shell:focus-within,
[data-theme="classic-dark"] .tov-composer-shell:focus-within {
  background: var(--tov-input-2);
}
.tov-composer-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: var(--tov-text);
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  min-height: 22px;
  max-height: 200px;
  padding: 14px 16px 4px;
  overflow-y: hidden;
  field-sizing: content;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--tov-muted) 55%, transparent) transparent;
}
.tov-composer-input::-webkit-scrollbar { width: 5px; }
.tov-composer-input::-webkit-scrollbar-track { background: transparent; }
.tov-composer-input::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--tov-muted) 50%, transparent);
  border-radius: 999px;
}
.tov-composer-input::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--tov-muted) 70%, transparent);
}
.tov-composer-hero .tov-composer-shell {
  border-radius: 22px;
  border: none;
  outline: none;
  background: #fafafa;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 4px 16px rgba(15, 23, 42, 0.06);
  transition: background .18s ease, box-shadow .18s ease;
}
.tov:not(.tov-full) .tov-composer-hero .tov-composer-shell:focus-within {
  background: #ffffff;
  box-shadow:
    inset 0 1px 0 #ffffff,
    0 2px 6px rgba(15, 23, 42, 0.05),
    0 8px 22px rgba(15, 23, 42, 0.08);
}
.tov[data-theme="light"] .tov-composer-hero .tov-composer-shell,
.tov[data-theme="pure-light"] .tov-composer-hero .tov-composer-shell,
.tov[data-theme="read"] .tov-composer-hero .tov-composer-shell,
html[data-theme="light"] .tov .tov-composer-hero .tov-composer-shell,
html[data-theme="pure-light"] .tov .tov-composer-hero .tov-composer-shell,
html[data-theme="read"] .tov .tov-composer-hero .tov-composer-shell {
  background: #fafafa !important;
  border: none !important;
  outline: none !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 4px 16px rgba(15, 23, 42, 0.06) !important;
}
.tov[data-theme="light"] .tov:not(.tov-full) .tov-composer-hero .tov-composer-shell:focus-within,
.tov[data-theme="pure-light"] .tov:not(.tov-full) .tov-composer-hero .tov-composer-shell:focus-within,
.tov[data-theme="read"] .tov:not(.tov-full) .tov-composer-hero .tov-composer-shell:focus-within,
html[data-theme="light"] .tov:not(.tov-full) .tov-composer-hero .tov-composer-shell:focus-within,
html[data-theme="pure-light"] .tov:not(.tov-full) .tov-composer-hero .tov-composer-shell:focus-within,
html[data-theme="read"] .tov:not(.tov-full) .tov-composer-hero .tov-composer-shell:focus-within {
  background: #ffffff !important;
  box-shadow:
    inset 0 1px 0 #ffffff,
    0 2px 6px rgba(15, 23, 42, 0.05),
    0 8px 22px rgba(15, 23, 42, 0.08) !important;
}
[data-theme="dark"] .tov-composer-hero .tov-composer-shell,
[data-theme="classic-dark"] .tov-composer-hero .tov-composer-shell {
  background: var(--tov-input);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: none;
}
[data-theme="dark"] .tov:not(.tov-full) .tov-composer-hero .tov-composer-shell:focus-within,
[data-theme="classic-dark"] .tov:not(.tov-full) .tov-composer-hero .tov-composer-shell:focus-within {
  background: var(--tov-input-2);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: none;
}
.tov-composer-hero .tov-composer-input {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.45;
  padding: 18px 18px 4px;
  color: #1d1d1f;
}
.tov-composer-hero .tov-composer-input::placeholder {
  color: #8e8e93;
  font-size: 17px;
  font-weight: 400;
}
.tov-composer-hero .tov-composer-plus,
.tov-composer-hero .tov-composer-mic {
  color: #1d1d1f;
}
.tov-composer-hero .tov-composer-toolbar {
  padding: 2px 10px 12px;
  gap: 4px;
  min-height: 44px;
  align-items: center;
}
.tov-composer-input::placeholder {
  color: var(--tov-muted);
}
.tov-composer-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 2px 10px 10px;
}
.tov-composer-enter-hint {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .02em;
  color: var(--tov-muted);
  user-select: none;
  padding: 0 4px;
}
.tov-composer-plus,
.tov-composer-mic {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--tov-muted);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.tov-composer-hero .tov-composer-plus,
.tov-composer-hero .tov-composer-mic {
  width: 36px;
  height: 36px;
}
.tov-composer-hero .tov-composer-plus:hover,
.tov-composer-hero .tov-composer-mic:hover {
  background: rgba(0, 0, 0, 0.06);
}
.tov[data-theme="light"] .tov-composer-hero .tov-composer-send,
.tov[data-theme="pure-light"] .tov-composer-hero .tov-composer-send,
.tov[data-theme="read"] .tov-composer-hero .tov-composer-send,
html[data-theme="light"] .tov .tov-composer-hero .tov-composer-send,
html[data-theme="pure-light"] .tov .tov-composer-hero .tov-composer-send,
html[data-theme="read"] .tov .tov-composer-hero .tov-composer-send {
  background: #e8e8ed;
  color: #6e6e73;
  opacity: 1;
}
.tov[data-theme="light"] .tov-composer-hero .tov-composer-shell.has-text .tov-composer-send:not(:disabled),
.tov[data-theme="pure-light"] .tov-composer-hero .tov-composer-shell.has-text .tov-composer-send:not(:disabled),
.tov[data-theme="read"] .tov-composer-hero .tov-composer-shell.has-text .tov-composer-send:not(:disabled),
html[data-theme="light"] .tov .tov-composer-hero .tov-composer-shell.has-text .tov-composer-send:not(:disabled),
html[data-theme="pure-light"] .tov .tov-composer-hero .tov-composer-shell.has-text .tov-composer-send:not(:disabled),
html[data-theme="read"] .tov .tov-composer-hero .tov-composer-shell.has-text .tov-composer-send:not(:disabled) {
  background: #1d1d1f;
  color: #ffffff;
}
.tov[data-theme="light"] .tov-composer-hero .tov-composer-send:disabled,
.tov[data-theme="pure-light"] .tov-composer-hero .tov-composer-send:disabled,
.tov[data-theme="read"] .tov-composer-hero .tov-composer-send:disabled,
html[data-theme="light"] .tov .tov-composer-hero .tov-composer-send:disabled,
html[data-theme="pure-light"] .tov .tov-composer-hero .tov-composer-send:disabled,
html[data-theme="read"] .tov .tov-composer-hero .tov-composer-send:disabled {
  opacity: 1;
  cursor: default;
}
.tov-composer-plus:hover,
.tov-composer-mic:hover {
  background: var(--tov-pill);
  color: var(--tov-text);
}
.tov-composer-spacer { flex: 1 1 auto; min-width: 4px; }
.tov-composer-mic.is-rec {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}
.tov-composer-send {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--tov-text) 10%, var(--tov-pill));
  color: var(--tov-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background .16s ease, color .16s ease, opacity .16s ease, transform .12s ease;
}
.tov-composer-hero .tov-composer-send {
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
}
.tov-composer-shell.has-text .tov-composer-send:not(:disabled) {
  background: var(--tov-send);
  color: var(--tov-send-text);
}
[data-theme="dark"] .tov-composer-shell.has-text .tov-composer-send:not(:disabled),
[data-theme="classic-dark"] .tov-composer-shell.has-text .tov-composer-send:not(:disabled) {
  background: #f4f4f5;
  color: #18181b;
}
.tov-composer-send:hover:not(:disabled) { opacity: .92; }
.tov-composer-send:disabled { opacity: .38; cursor: not-allowed; }
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

.tov-msg-tagro-compact {
  gap: 10px;
  max-width: 100%;
}
.tov-msg-tagro-compact .tov-msg-tagro-head {
  align-items: flex-start;
  gap: 8px;
}
.tov-msg-tagro-compact .tov-msg-preview {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
  max-height: 160px;
  overflow-y: auto;
}
.tov-msg-tagro-compact .tov-msg-text {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  line-height: 1.5;
}
.tov-msg-foot-inline {
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 0;
}
.tov-msg-foot-inline .tov-msg-secondary,
.tov-msg-foot-inline .tov-msg-primary {
  width: auto;
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
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
  height: 28px; padding: 0 10px;
  font-size: 11.5px; font-weight: 400;
  border-radius: 999px;
  border: none;
  background: var(--tov-pill);
  color: var(--tov-text-2);
}
.tov-source-pill-0,
.tov-source-pill-1 {
  background: var(--tov-pill);
  color: var(--tov-text-2);
}
[data-theme="dark"] .tov-source-pill,
[data-theme="classic-dark"] .tov-source-pill {
  color: var(--tov-text-2);
  background: rgba(255, 255, 255, 0.06);
}

.tov-msg-preview {
  margin: 0; padding: 14px 16px;
  background: var(--tov-input);
  border: 0;
  border-radius: 12px;
  font-size: 14px; line-height: 1.6;
  white-space: pre-wrap;
  color: var(--tov-text);
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
.tov-msg-foot {
  display: flex; align-items: center; gap: 8px;
  margin-top: 10px;
}
.tov-msg-secondary,
.tov-msg-primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 13px;
  border-radius: 999px;
  border: none;
  font: inherit; font-size: 12.5px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, opacity .12s;
}
.tov-msg-secondary {
  background: var(--tov-pill);
  color: var(--tov-text-2);
}
.tov-msg-secondary:hover { background: var(--tov-pill-h); color: var(--tov-text); }
.tov-msg-primary {
  background: color-mix(in srgb, var(--tov-accent) 18%, var(--tov-pill));
  color: var(--tov-text);
}
.tov-msg-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--tov-accent) 24%, var(--tov-pill-h)); }
.tov-msg-primary:disabled { opacity: .45; cursor: default; }
.tov-fallback-note {
  margin: 0 0 8px;
  font-size: 12.5px; line-height: 1.45;
  color: var(--tov-muted);
}
.tov-apply-notice {
  margin: 8px 0 0;
  font-size: 12.5px; line-height: 1.45;
  color: var(--tov-text-2);
}
.tov-created-links {
  display: flex; flex-wrap: wrap; gap: 8px;
  margin-top: 10px;
}
.tov-created-link,
.tov-created-link-static {
  display: inline-flex; align-items: center;
  font-size: 12.5px; font-weight: 500;
  padding: 6px 10px; border-radius: 999px;
  background: var(--tov-accent-soft);
  color: var(--tov-link);
  text-decoration: none;
  transition: background .12s;
}
.tov-created-link:hover { background: var(--tov-accent-mid); }
.tov-created-link-static { opacity: .85; }
.tov-quickaction {
  border: none;
  border-radius: 999px;
  height: 30px; padding: 0 12px;
  background: var(--tov-pill);
  color: var(--tov-text-2);
  font: inherit; font-size: 12px; font-weight: 400; cursor: pointer;
  transition: background .12s, color .12s;
}
.tov-quickaction:hover { background: var(--tov-pill-h); color: var(--tov-text); }
[data-theme="dark"] .tov-quickaction,
[data-theme="classic-dark"] .tov-quickaction {
  background: rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .tov-quickaction:hover,
[data-theme="classic-dark"] .tov-quickaction:hover {
  background: rgba(255, 255, 255, 0.08);
}

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
  background: var(--tov-bg);
}
.tov-floatbar-inner {
  max-width: 720px; margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
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

/* Search picker (@-mention / Kontext hinzufügen) */
.tov-pick {
  position: fixed; inset: 0; z-index: 2147483601;
  display: flex; align-items: center; justify-content: center;
  animation: tov-in .14s ease both;
  padding: 32px;
  background: var(--tov-backdrop, var(--modal-backdrop));
  backdrop-filter: blur(var(--modal-backdrop-blur)) saturate(115%);
  -webkit-backdrop-filter: blur(var(--modal-backdrop-blur)) saturate(115%);
}
.tov-pick-full { align-items: center; }
.tov-pick-backdrop {
  position: absolute; inset: 0;
  background: transparent;
  pointer-events: none;
}
.tov-pick-sheet {
  position: relative;
  z-index: 1;
  width: min(820px, calc(100vw - 64px));
  max-height: min(72vh, 680px);
  background: var(--tov-bg);
  border: 1px solid var(--tov-border);
  border-radius: 24px;
  box-shadow:
    0 1px 2px rgba(15,23,42,.06),
    0 40px 96px -28px rgba(15,23,42,.45);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: tov-up .2s cubic-bezier(.16,1,.3,1) both;
  color: var(--tov-text);
}
/* Dark — self-contained tokens so portaled picker always matches portal black */
html[data-theme="dark"] .tov-pick,
html[data-theme="classic-dark"] .tov-pick {
  --tov-bg: var(--festag-black-popup, #121214);
  --tov-bg-2: #161618;
  --tov-input: #0a0a0c;
  --tov-input-2: #101012;
  --tov-text: #F4F4F4;
  --tov-text-2: #B0B0B5;
  --tov-muted: #8A8A90;
  --tov-border: rgba(255, 255, 255, 0.08);
  --tov-pill: rgba(255, 255, 255, 0.06);
  --tov-pill-h: rgba(255, 255, 255, 0.11);
  --tov-link: #b8c0cc;
  --tov-accent-ring: rgba(122, 131, 156, 0.24);
  color-scheme: dark;
}
html[data-theme="dark"] .tov-pick-sheet,
html[data-theme="classic-dark"] .tov-pick-sheet {
  background: var(--festag-black-popup, #121214);
  border-color: rgba(255, 255, 255, 0.08);
  color: #F4F4F4;
  box-shadow:
    0 1px 2px rgba(0,0,0,.45),
    0 40px 96px -30px rgba(0,0,0,.62);
}
html[data-theme="dark"] .tov-pick-result-body strong,
html[data-theme="classic-dark"] .tov-pick-result-body strong {
  color: #F4F4F4;
}
html[data-theme="dark"] .tov-pick-result-ico,
html[data-theme="classic-dark"] .tov-pick-result-ico {
  background: #1C1C1E;
  color: #B0B0B5;
}
html[data-theme="dark"] .tov-pick-result:hover,
html[data-theme="dark"] .tov-pick-result.is-active,
html[data-theme="classic-dark"] .tov-pick-result:hover,
html[data-theme="classic-dark"] .tov-pick-result.is-active {
  background: rgba(255, 255, 255, 0.06);
}
.tov-pick-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 0;
}
.tov-pick-kicker {
  margin: 0;
  font-size: 12px; font-weight: 600; letter-spacing: 0.04em;
  text-transform: uppercase; color: var(--tov-muted);
}
.tov-pick-searchbar {
  display: flex; align-items: center; gap: 10px;
  margin: 12px 16px 8px;
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
  padding: 4px 12px 16px;
  display: flex; flex-direction: column; gap: 8px;
}
.tov-pick-group-label {
  margin: 8px 10px 4px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.03em;
  text-transform: uppercase; color: var(--tov-muted);
}
.tov-pick-result {
  display: flex; align-items: flex-start; gap: 12px;
  width: 100%; text-align: left;
  background: transparent; border: 0; border-radius: 12px;
  padding: 10px 10px;
  font: inherit; cursor: pointer;
  transition: background .12s;
}
.tov-pick-result:hover,
.tov-pick-result.is-active { background: var(--tov-pill); }
.tov-pick-result.is-active {
  box-shadow: inset 0 0 0 1px var(--tov-accent-ring);
}
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
.tov-pick-mention {
  flex: 0 0 auto;
  max-width: 42%;
  font-size: 11px; font-weight: 500;
  color: var(--tov-link);
  text-align: right;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  padding-top: 2px;
}
.tov-pick-empty {
  margin: 0; padding: 24px 0;
  text-align: center; font-size: 13px; color: var(--tov-text-2);
}
.tov-pick-close {
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
  .tov, .tov-shell, .tov-msg, .tov-spin, .tov-composer-mic.is-rec, .tov-typing span, .tov::after { animation: none !important; }
}

/* ── Mobile — Codex-style bottom sheet ── */
@media (max-width: 720px) {
  .tov:not(.tov-full) {
    padding: 0;
    align-items: flex-end;
    justify-content: center;
  }
  .tov:not(.tov-full) .tov-shell {
    width: 100%;
    max-width: 100%;
    max-height: min(92dvh, 900px);
    height: auto;
    min-height: min(78dvh, 680px);
    border-radius: 24px 24px 0 0;
    border: none;
    box-shadow:
      0 -12px 48px rgba(0, 0, 0, 0.42),
      0 -4px 20px rgba(0, 0, 0, 0.22);
    animation: tov-sheet-up .34s cubic-bezier(.16, 1, .3, 1) both;
  }
  [data-theme="dark"] .tov:not(.tov-full) .tov-shell,
  [data-theme="classic-dark"] .tov:not(.tov-full) .tov-shell {
    box-shadow:
      0 -12px 48px rgba(0, 0, 0, 0.55),
      0 -4px 20px rgba(0, 0, 0, 0.32);
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
    font-size: clamp(22px, 6vw, 28px);
    margin-bottom: 20px;
  }
  .tov-picker-footer {
    padding: 10px 16px max(16px, env(safe-area-inset-bottom, 0px));
    gap: 12px;
  }
  .tov-composer-hero .tov-composer-shell { border-radius: 20px; }
  .tov-composer-hero .tov-composer-plus,
  .tov-composer-hero .tov-composer-mic {
    width: 34px;
    height: 34px;
  }
  .tov-composer-hero .tov-composer-send {
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
  }
  .tov-composer-hero .tov-composer-input {
    font-size: 17px;
    padding: 16px 16px 4px;
  }
  .tov-composer-hero .tov-composer-input::placeholder {
    font-size: 17px;
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
  .tov-pick {
    padding: 0;
    align-items: flex-end;
  }
  .tov-pick-sheet {
    width: 100%;
    max-width: 100%;
    max-height: min(78dvh, 640px);
    border-radius: 22px 22px 0 0;
    animation: tov-sheet-up .28s cubic-bezier(.16,1,.3,1) both;
  }
  .tov-pick-results { max-height: 50dvh; }
}
@keyframes tov-sheet-up {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}
`
