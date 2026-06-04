'use client'

/**
 * TagroOverlay — Festag's central object-aware Tagro popup.
 *
 * Light-first per the sana.ai references: large centred modal on a calm surface,
 * one big input, soft examples below, generous whitespace, no card-in-card.
 * Darkmode is the SAME layout via CSS theme tokens — only the colours change.
 *
 * Opens via the global event `festag:open-tagro`. One <TagroOverlay /> lives at
 * the app shell; any page calls `openTagro({ contextType, id, title })` and the
 * overlay opens already knowing the object — never empty when started from one.
 *
 * 4 calm steps: Verstehen · Strukturieren · Vorbereiten · Ausführen.
 * Fullscreen switch in the top right. Mobile = bottom sheet.
 *
 * This file replaces all earlier draft overlay code. Nothing here imports
 * Copilot. "Mit Tagro bearbeiten" never opens Copilot.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, ArrowRight, ArrowLeft, ArrowUp, ArrowsClockwise, ArrowsOut, ArrowsIn,
  Check, Microphone, MicrophoneSlash, Plus, Lightbulb,
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
  /** Optional second line under the context chip (e.g. project name, visibility). */
  subtitle?: string
  /** Pre-fill the composer. */
  prefill?: string
  /** Skip the compact popup and open straight in the agent workspace. */
  fullscreen?: boolean
}

/** Open from anywhere: openTagro({ contextType: 'task', id, title }) */
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
  project:       'Was soll Tagro mit diesem Projekt machen?',
  task:          'Was soll Tagro mit dieser Aufgabe machen?',
  decision:      'Welche Entscheidung soll Tagro vorbereiten?',
  document:      'Was soll Tagro aus diesem Dokument machen?',
  pdf:           'Was soll Tagro aus diesem PDF machen?',
  client:        'Was soll Tagro für diesen Kunden vorbereiten?',
  briefing:      'Worüber soll Tagro briefen?',
  status_report: 'Was soll Tagro mit diesem Statusbericht machen?',
  report:        'Was soll Tagro mit diesem Bericht machen?',
  note:          'Was soll Tagro aus dieser Notiz machen?',
  evidence:      'Was soll Tagro mit diesem Beleg machen?',
  risk:          'Wie soll Tagro dieses Risiko einschätzen?',
  approval:      'Wie soll Tagro diese Freigabe vorbereiten?',
  dev_item:      'Was soll Tagro mit diesem Dev-Panel-Eintrag machen?',
  marketing:     'Was soll Tagro für dieses Marketing-Element vorbereiten?',
  empty:         'Was soll Tagro vorbereiten?',
}

const CTX_PLACEHOLDER: Record<TagroContextType, string> = {
  project:       'Beschreibe Ziel, Umfang oder offene Punkte. Du kannst @Teammitglieder erwähnen.',
  task:          'Schreib kurz, was passieren soll. Du kannst @Teammitglieder erwähnen.',
  decision:      'Welche Optionen, welche Empfehlung, welcher Impact?',
  document:      'Zusammenfassen, verbessern, ableiten — was brauchst du?',
  pdf:           'Zusammenfassen, verbessern, ableiten — was brauchst du?',
  client:        'Status-Update, offene Themen oder nächste Kommunikation?',
  briefing:      'Welcher Zeitraum, welche Empfänger, welcher Fokus?',
  status_report: 'Aktualisieren, kundensicher machen, Tasks ableiten — was brauchst du?',
  report:        'Aktualisieren, kürzen, kundensicher machen — was brauchst du?',
  note:          'Strukturieren, Aufgaben ableiten oder verknüpfen — was brauchst du?',
  evidence:      'Erklären, mit Bericht verknüpfen oder bestätigen — was brauchst du?',
  risk:          'Einschätzen, Gegenmaßnahme oder Owner — was brauchst du?',
  approval:      'Freigabetext, Kundenfrage oder Status — was brauchst du?',
  dev_item:      'Review anfordern, Blocker melden, Status an Lead — was brauchst du?',
  marketing:     'Performance erklären, Budget anfordern, Creative Review — was brauchst du?',
  empty:         'Beschreibe dein Ziel, dein Problem oder deine Idee.',
}

const CTX_CHIPS: Record<TagroContextType, string[]> = {
  project:       ['Projektstatus zusammenfassen', 'Offene Entscheidungen erkennen', 'Nächste Aufgaben ableiten', 'Kundenbriefing erstellen', 'Risiken prüfen'],
  task:          ['@Teammitglied prüfen lassen', 'Folgeaufgabe erstellen', 'Entscheidung anfordern', 'Status für Kunden formulieren'],
  decision:      ['Optionen erstellen', '@Person um Einschätzung bitten', 'Client-safe formulieren', 'In Aufgaben übersetzen', 'Impact erklären'],
  document:      ['Zusammenfassen', 'Verbessern', 'Als Aufgabe ableiten', 'Client-safe formulieren', 'An Team senden'],
  pdf:           ['Zusammenfassen', 'Aktionen ableiten', 'Mit Projekt verknüpfen', 'Client-safe formulieren'],
  client:        ['Status-Update', 'Offene Themen', 'Nächste Kommunikation', 'Kundenbriefing'],
  briefing:      ['Wochenbericht', 'Executive Briefing', 'Kunden-Update', 'Audio-Briefing'],
  status_report: ['Aktualisieren', 'Für Kunden zusammenfassen', 'An Team senden', 'Offene Entscheidungen ableiten'],
  report:        ['Kürzer und klarer machen', 'Für Kunden zusammenfassen', 'Risiken hervorheben'],
  note:          ['Strukturieren', 'Aufgaben ableiten', 'Mit Projekt verknüpfen'],
  evidence:      ['Erklären', 'Mit Report verknüpfen', 'Bestätigen', 'An Team senden'],
  risk:          ['Wahrscheinlichkeit einschätzen', 'Gegenmaßnahme vorschlagen', 'Owner zuweisen'],
  approval:      ['Freigabetext formulieren', 'Bedingung definieren', 'Rückfrage stellen'],
  dev_item:      ['@Dev Review anfragen', 'Blocker melden', 'Entscheidung vom Lead anfordern', 'Client-safe Rückfrage', 'Status an Lead'],
  marketing:     ['Performance erklären', 'Budgetentscheidung anfordern', 'Creative Review', 'Kundenupdate'],
  empty:         ['Projektidee', 'Aufgabe vorbereiten', 'Entscheidung formulieren', 'Briefing erzeugen'],
}

// ── Mock draft (fallback) ─────────────────────────────────────────────────

type Draft = { understanding: string; opinion: string; preview: string }

function mockDraft(ctx: TagroContextType, input: string, title?: string): Draft {
  const subject = title || (input.split(/[.\n]/)[0] || '').slice(0, 80) || 'Vorhaben'
  return {
    understanding: `Tagro hat „${subject}" als ${CTX_CHIP[ctx]}-Kontext verstanden.`,
    opinion: 'Tagro ist gerade nicht verbunden — der Entwurf basiert auf deiner Eingabe. Bearbeite ihn oder gib Tagro mehr Kontext.',
    preview: input.trim() || `Tagro bereitet einen Entwurf für „${subject}" vor.`,
  }
}

// ── Steps ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'understand', label: 'Verstehen' },
  { id: 'structure',  label: 'Strukturieren' },
  { id: 'prepare',    label: 'Vorbereiten' },
  { id: 'execute',    label: 'Ausführen' },
] as const
type StepId = typeof STEPS[number]['id']

// ── Component ─────────────────────────────────────────────────────────────

export default function TagroOverlay() {
  const [open, setOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [ctx, setCtx] = useState<TagroOpenDetail>({ contextType: 'empty' })
  const [step, setStep] = useState<StepId>('understand')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [actions, setActions] = useState<Set<string>>(new Set())
  const composerRef = useRef<HTMLTextAreaElement>(null)

  // Global open event
  useEffect(() => {
    function onOpen(e: Event) {
      const d = (e as CustomEvent<TagroOpenDetail>).detail || { contextType: 'empty' }
      setCtx(d); setInput(d.prefill || ''); setDraft(null); setActions(new Set()); setStep('understand')
      setFullscreen(!!d.fullscreen)
      setOpen(true)
    }
    window.addEventListener('festag:open-tagro', onOpen as EventListener)
    return () => window.removeEventListener('festag:open-tagro', onOpen as EventListener)
  }, [])

  // Body scroll lock + Esc + composer focus
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); next() }
    }
    document.addEventListener('keydown', onKey)
    if (step === 'understand') {
      const t = window.setTimeout(() => composerRef.current?.focus(), 80)
      return () => {
        window.clearTimeout(t); document.body.style.overflow = prevOverflow; document.removeEventListener('keydown', onKey)
      }
    }
    return () => { document.body.style.overflow = prevOverflow; document.removeEventListener('keydown', onKey) }
  }, [open, step])

  // Mic
  const micBaseRef = useRef('')
  const [rec, setRec] = useState(false)
  const { supported: micOk, listening: micOn, start: micStart, stop: micStop } = useSpeechRecognition({
    lang: 'de-DE',
    onResult: (text, isFinal) => {
      const combined = (micBaseRef.current ? micBaseRef.current + ' ' : '') + text
      setInput(combined); if (isFinal) micBaseRef.current = combined
    },
    onError: () => setRec(false),
  })
  useEffect(() => { if (!micOn) setRec(false) }, [micOn])
  function toggleMic() {
    if (!micOk) return
    if (rec || micOn) { micStop(); setRec(false); return }
    micBaseRef.current = input.trim(); setRec(true); micStart()
  }

  function close() {
    setOpen(false); setFullscreen(false)
    if (typeof window !== 'undefined') {
      try { window.dispatchEvent(new CustomEvent('festag:tagro-closed')) } catch {}
    }
  }

  // Tell the app shell to collapse its sidebar when we go fullscreen, restore
  // on close — keeps the Tagro workspace clean and reference-aligned.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const active = open && fullscreen
    window.dispatchEvent(new CustomEvent('festag:tagro-fullscreen', { detail: { active } }))
    return () => {
      if (active) window.dispatchEvent(new CustomEvent('festag:tagro-fullscreen', { detail: { active: false } }))
    }
  }, [open, fullscreen])

  async function structure() {
    if (!input.trim() && ctx.contextType !== 'empty') return
    setBusy(true)
    try {
      const r = await fetch('/api/tagro/context/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: ctx.contextType, id: ctx.id, title: ctx.title, input: input || ctx.title || '' }),
      })
      const data = await r.json().catch(() => null)
      if (r.ok && data?.preview) {
        setDraft({
          understanding: data.understanding || mockDraft(ctx.contextType, input, ctx.title).understanding,
          opinion: data.opinion || '',
          preview: data.preview,
        })
      } else {
        setDraft(mockDraft(ctx.contextType, input, ctx.title))
      }
    } catch {
      setDraft(mockDraft(ctx.contextType, input, ctx.title))
    } finally {
      setBusy(false); setStep('structure')
    }
  }

  function next() {
    if (step === 'understand') return structure()
    if (step === 'structure') { setStep('prepare'); return }
    if (step === 'prepare') { setStep('execute'); return }
    if (step === 'execute') { execute(); return }
  }
  function back() {
    const i = STEPS.findIndex(s => s.id === step); if (i > 0) setStep(STEPS[i - 1].id)
  }
  function execute() {
    if (typeof window !== 'undefined') {
      try { window.dispatchEvent(new CustomEvent('festag:tagro-executed', { detail: { ctx, actions: Array.from(actions), draft } })) } catch {}
    }
    close()
  }

  const question = CTX_QUESTION[ctx.contextType] || CTX_QUESTION.empty
  const placeholder = CTX_PLACEHOLDER[ctx.contextType] || CTX_PLACEHOLDER.empty
  const chips = CTX_CHIPS[ctx.contextType] || CTX_CHIPS.empty

  if (!open) return null

  const node = (
    <div className={`tov${fullscreen ? ' tov-full' : ''}`} role="dialog" aria-modal="true" aria-label="Mit Tagro bearbeiten">
      <div className="tov-backdrop" onClick={close} aria-hidden />
      <div className="tov-shell" onClick={e => e.stopPropagation()}>
        {/* Top bar — minimal, ghost icons. */}
        <header className="tov-top">
          <span className="tov-top-ctx" aria-hidden>
            {CTX_CHIP[ctx.contextType]}{ctx.title ? ` · ${ctx.title}` : ''}
          </span>
          <div className="tov-top-controls">
            <button type="button" className="tov-iconbtn" onClick={() => setFullscreen(v => !v)} aria-label={fullscreen ? 'Verkleinern' : 'Im Vollbild öffnen'}>
              {fullscreen ? <ArrowsIn size={15} /> : <ArrowsOut size={15} />}
            </button>
            <button type="button" className="tov-iconbtn" onClick={close} aria-label="Schließen"><X size={16} /></button>
          </div>
        </header>

        {/* Stepper — calm dots with labels. */}
        <nav className="tov-steps" aria-label="Schritte">
          {STEPS.map((s, i) => {
            const idx = STEPS.findIndex(x => x.id === step)
            const state = i < idx ? 'done' : i === idx ? 'active' : 'todo'
            return (
              <button key={s.id} type="button" className={`tov-step is-${state}`}
                onClick={() => i <= idx && setStep(s.id)} disabled={i > idx}>
                <span className="tov-step-dot">{i < idx ? <Check size={10} weight="bold" /> : null}</span>
                <span className="tov-step-label">{s.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Body — generous whitespace, centred composer on step 1. */}
        <div className="tov-body">
          {step === 'understand' && (
            <div className="tov-understand">
              <h2 className="tov-h">{question}</h2>
              {ctx.subtitle && <p className="tov-sub">{ctx.subtitle}</p>}

              {/* Big light input with an icon-prefix and a black send button. */}
              <div className="tov-inputrow">
                <span className="tov-inputrow-ico"><Lightbulb size={18} weight="regular" /></span>
                <textarea
                  ref={composerRef}
                  className="tov-input"
                  rows={2}
                  placeholder={placeholder}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <button type="button" className="tov-send"
                  onClick={() => next()} disabled={busy || (!input.trim() && ctx.contextType !== 'empty')}
                  aria-label="Mit Tagro strukturieren">
                  {busy ? <ArrowsClockwise size={16} className="tov-spin" /> : <ArrowUp size={16} weight="bold" />}
                </button>
              </div>

              <div className="tov-tools">
                {micOk && (
                  <button type="button" className={`tov-tool${rec ? ' is-rec' : ''}`} onClick={toggleMic}>
                    {rec ? <MicrophoneSlash size={13} weight="fill" /> : <Microphone size={13} />}
                    <span>{rec ? 'Hört zu …' : 'Sprechen'}</span>
                  </button>
                )}
                <button type="button" className="tov-tool" disabled title="Bald: People/Sources">
                  <Plus size={13} weight="bold" /> <span>@ / Quelle hinzufügen</span>
                </button>
              </div>

              {/* Examples below — calm row of soft pills. */}
              <div className="tov-examples">
                <p className="tov-examples-label">Beispiele</p>
                <div className="tov-examples-grid">
                  {chips.map(c => (
                    <button key={c} type="button" className="tov-example" onClick={() => { setInput(input ? `${input}\n${c}` : c); composerRef.current?.focus() }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'structure' && (
            <StepStructure draft={draft || mockDraft(ctx.contextType, input, ctx.title)} />
          )}

          {step === 'prepare' && (
            <StepPrepare ctxType={ctx.contextType} selected={actions} setSelected={setActions} />
          )}

          {step === 'execute' && (
            <StepExecute draft={draft} selected={actions} />
          )}
        </div>

        {/* Footer — minimal, just navigation. */}
        <footer className="tov-foot">
          <div>
            {step !== 'understand' && (
              <button type="button" className="tov-ghost" onClick={back}>
                <ArrowLeft size={13} /> Zurück
              </button>
            )}
          </div>
          <div className="tov-foot-r">
            <button type="button" className="tov-ghost" onClick={close}>Abbrechen</button>
            {step !== 'understand' && (
              <button type="button" className="tov-primary" onClick={next}>
                <span>
                  {step === 'structure' ? 'Aktionen wählen' : step === 'prepare' ? 'Übersicht' : 'Übernehmen'}
                </span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </footer>
      </div>

      <style jsx>{STYLES}</style>
    </div>
  )

  return typeof document === 'undefined' ? node : createPortal(node, document.body)
}

// ── Step bodies ───────────────────────────────────────────────────────────

function StepStructure({ draft }: { draft: Draft }) {
  return (
    <div className="tov-structure">
      <Block label="Ich verstehe dich so">{draft.understanding}</Block>
      {draft.opinion && <Block label="Meine Einschätzung">{draft.opinion}</Block>}
      <BlockPreview label="Vorschau">{draft.preview}</BlockPreview>
    </div>
  )
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="tov-block">
      <p className="tov-block-label">{label}</p>
      <p className="tov-block-text">{children}</p>
    </section>
  )
}

function BlockPreview({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="tov-block">
      <p className="tov-block-label">{label}</p>
      <p className="tov-preview">{children}</p>
    </section>
  )
}

function StepPrepare({ ctxType, selected, setSelected }: { ctxType: TagroContextType; selected: Set<string>; setSelected: (s: Set<string>) => void }) {
  const options = useMemo(() => actionsFor(ctxType), [ctxType])
  const toggle = useCallback((a: string) => {
    const next = new Set(selected); next.has(a) ? next.delete(a) : next.add(a); setSelected(next)
  }, [selected, setSelected])
  return (
    <div className="tov-prepare">
      <h2 className="tov-h">Was soll daraus entstehen?</h2>
      <p className="tov-sub">Wähle die Aktionen, die Tagro übernehmen soll.</p>
      <ul className="tov-actions">
        {options.map(a => {
          const on = selected.has(a)
          return (
            <li key={a}>
              <button type="button" className={`tov-action${on ? ' is-on' : ''}`} onClick={() => toggle(a)}>
                <span className={`tov-check${on ? ' is-on' : ''}`}>{on && <Check size={11} weight="bold" />}</span>
                <span>{a}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StepExecute({ draft, selected }: { draft: Draft | null; selected: Set<string> }) {
  return (
    <div className="tov-execute">
      <h2 className="tov-h">Bereit zur Übernahme.</h2>
      <p className="tov-sub">Tagro hat aus deinem Kontext einen Entwurf vorbereitet.</p>
      <Block label="Was erstellt wird">
        {selected.size === 0 ? 'Nichts ausgewählt — gehe zurück zu „Vorbereiten" und wähle eine Aktion.' : Array.from(selected).join(' · ')}
      </Block>
      {draft && <BlockPreview label="Entwurf">{draft.preview}</BlockPreview>}
    </div>
  )
}

function actionsFor(t: TagroContextType): string[] {
  switch (t) {
    case 'project':       return ['Aufgaben aus Entwurf anlegen', 'Meilensteine vorbereiten', 'Risiken markieren', 'Kundenbriefing erstellen']
    case 'task':          return ['Aufgabe aktualisieren', 'Folgeaufgabe anlegen', 'Akzeptanzkriterien speichern', 'An Verantwortliche senden']
    case 'decision':      return ['Entscheidung anlegen', 'Optionen speichern', 'Empfehlung an Owner senden', 'Frist setzen']
    case 'document':
    case 'pdf':           return ['Zusammenfassung speichern', 'Aktionen als Aufgaben erstellen', 'Mit Projekt verknüpfen', 'Client-safe Version erzeugen']
    case 'client':        return ['Kundenupdate erzeugen', 'Status-Briefing vorbereiten', 'Offene Punkte als Aufgaben anlegen']
    case 'status_report':
    case 'report':        return ['Statusbericht aktualisieren', 'Nächste Schritte als Aufgaben anlegen', 'Für Kunden vorbereiten']
    case 'dev_item':      return ['Review anfragen', 'Blocker anlegen', 'Evidence vorbereiten', 'Status an Lead senden']
    case 'evidence':      return ['Beleg bestätigen', 'Mit Bericht verknüpfen', 'An Team senden']
    case 'risk':          return ['Risiko anlegen', 'Gegenmaßnahme als Aufgabe erstellen']
    case 'approval':      return ['Freigabe-Vorlage erzeugen', 'An Entscheider senden']
    case 'marketing':     return ['Budgetentscheidung anfordern', 'Creative Review anfragen', 'Kundenupdate erzeugen']
    case 'briefing':      return ['Briefing erzeugen', 'Audio-Briefing vorbereiten', 'PDF exportieren']
    case 'note':          return ['Aufgaben ableiten', 'Mit Projekt verknüpfen', 'Zusammenfassen']
    default:              return ['Projekt erstellen', 'Aufgaben anlegen', 'Briefing erzeugen']
  }
}

// ── Theme-tokenised styles (light = default; dark via CSS vars) ───────────

const STYLES = `
  .tov {
    /* Light tokens (default) — straight from the sana.ai references. */
    --t-bg: #FAFAFA;
    --t-bg-2: #F7F7F5;
    --t-input: #FFFFFF;
    --t-text: #111111;
    --t-text-2: #666666;
    --t-muted: #8A8A8A;
    --t-border: rgba(0,0,0,0.08);
    --t-border-soft: rgba(0,0,0,0.05);
    --t-send: #111111;
    --t-send-text: #FFFFFF;
    --t-pill: rgba(0,0,0,0.04);
    --t-pill-hover: rgba(0,0,0,0.07);
    --t-shadow: 0 30px 80px -24px rgba(15,23,42,0.18), 0 4px 18px rgba(15,23,42,0.06);
    --t-backdrop: rgba(20,22,28,0.18);
    --t-primary: #5B647D;

    position: fixed; inset: 0; z-index: 16000;
    display: flex; align-items: center; justify-content: center;
    padding: 56px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    color: var(--t-text);
    animation: tovIn .22s ease both;
    transition: padding .35s cubic-bezier(.16,1,.3,1);
  }
  .tov.tov-full { padding: 0; }
  @media (max-width: 720px) { .tov { padding: 0; align-items: flex-end; } }

  /* Dark tokens — same layout, only colours change. */
  :global(html[data-theme="dark"]) .tov,
  :global(html[data-theme="classic-dark"]) .tov {
    --t-bg: #0D0D0D;
    --t-bg-2: #111111;
    --t-input: #151515;
    --t-text: #F4F4F4;
    --t-text-2: #A3A3A3;
    --t-muted: #737373;
    --t-border: rgba(255,255,255,0.06);
    --t-border-soft: rgba(255,255,255,0.04);
    --t-send: #F4F4F4;
    --t-send-text: #050505;
    --t-pill: rgba(255,255,255,0.05);
    --t-pill-hover: rgba(255,255,255,0.10);
    --t-shadow: 0 30px 80px -24px rgba(0,0,0,0.6);
    --t-backdrop: rgba(0,0,0,0.55);
  }

  .tov-backdrop {
    position: absolute; inset: 0; background: var(--t-backdrop);
    backdrop-filter: blur(8px) saturate(140%);
    -webkit-backdrop-filter: blur(8px) saturate(140%);
  }
  .tov-shell {
    position: relative;
    width: min(1080px, calc(100vw - 112px));
    height: min(78vh, 760px);
    background: var(--t-bg);
    border: 1px solid var(--t-border-soft);
    border-radius: 22px;
    box-shadow: var(--t-shadow);
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    overflow: hidden;
    animation: tovUp .32s cubic-bezier(.16,1,.3,1) both;
    transition: width .35s cubic-bezier(.16,1,.3,1), height .35s cubic-bezier(.16,1,.3,1), border-radius .35s, box-shadow .35s;
  }
  @media (max-width: 720px) {
    .tov-shell { width: 100%; height: 92dvh; border-radius: 22px 22px 0 0; max-width: none; }
  }
  /* Fullscreen — true workspace, calm spacious surface. Composer floats at bottom. */
  .tov-full .tov-shell {
    width: 100vw; height: 100vh; max-width: none;
    border-radius: 0; border: 0; box-shadow: none;
  }
  .tov-full .tov-body { padding-bottom: 140px; }

  /* Top bar — clean, ghost icons, calm context line. */
  .tov-top {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; padding: 18px 24px 0;
  }
  .tov-top-ctx {
    font-size: 12px; font-weight: 500; letter-spacing: .01em; color: var(--t-muted);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .tov-top-controls { display: inline-flex; gap: 6px; flex-shrink: 0; }
  .tov-iconbtn {
    width: 32px; height: 32px;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--t-pill); color: var(--t-text-2);
    border: 0; border-radius: 999px; cursor: pointer;
    transition: background .14s, color .14s;
  }
  .tov-iconbtn:hover { background: var(--t-pill-hover); color: var(--t-text); }

  /* Stepper — soft pill row, calm dots. */
  .tov-steps { display: flex; gap: 4px; padding: 12px 24px 0; }
  .tov-step {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 7px 12px;
    border: 0; border-radius: 999px;
    background: transparent; color: var(--t-muted);
    font: inherit; font-size: 12px; font-weight: 500;
    cursor: pointer; transition: background .12s, color .12s;
  }
  .tov-step:disabled { cursor: default; }
  .tov-step.is-active { background: var(--t-pill); color: var(--t-text); }
  .tov-step.is-done   { color: var(--t-text-2); }
  .tov-step.is-done:hover { background: var(--t-pill); color: var(--t-text); }
  .tov-step-dot {
    width: 14px; height: 14px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--t-border); color: var(--t-bg);
  }
  .tov-step.is-done .tov-step-dot { background: var(--t-primary); color: #FFFFFF; }
  .tov-step.is-active .tov-step-dot { background: var(--t-text); }

  /* Body — generous whitespace, centred composer step 1. */
  .tov-body {
    overflow-y: auto;
    padding: 40px 56px 28px;
    display: flex; flex-direction: column; align-items: center;
  }
  @media (max-width: 720px) { .tov-body { padding: 28px 18px; } }

  .tov-understand, .tov-prepare, .tov-execute, .tov-structure {
    width: 100%; max-width: 720px;
    display: flex; flex-direction: column; gap: 18px; align-items: center;
  }
  .tov-h {
    margin: 0; text-align: center;
    font-size: 22px; font-weight: 500; letter-spacing: -.012em; color: var(--t-text);
  }
  .tov-sub {
    margin: -8px 0 6px;
    text-align: center;
    font-size: 13.5px; line-height: 1.55; color: var(--t-text-2); max-width: 56ch;
  }

  /* The hero input row — large white pill with lightbulb + black send. */
  .tov-inputrow {
    width: 100%;
    background: var(--t-input);
    border: 1px solid var(--t-border-soft);
    border-radius: 22px;
    padding: 18px 18px 18px 22px;
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) auto;
    gap: 14px;
    align-items: start;
    box-shadow: 0 12px 32px -18px rgba(15,23,42,0.10), 0 1px 0 rgba(255,255,255,0.4) inset;
    transition: border-color .14s, box-shadow .14s;
  }
  /* Fullscreen: composer becomes a sticky bottom-center anchor — agent workspace feel. */
  .tov-full .tov-understand {
    max-width: 920px;
    min-height: calc(100vh - 240px);
    justify-content: center;
  }
  .tov-full .tov-understand .tov-inputrow {
    position: fixed;
    left: 50%; bottom: 32px;
    transform: translateX(-50%);
    width: min(820px, calc(100vw - 64px));
    background: var(--t-input);
    box-shadow: 0 20px 50px -22px rgba(15,23,42,0.18);
    z-index: 2;
  }
  :global(html[data-theme="dark"]) .tov-full .tov-understand .tov-inputrow,
  :global(html[data-theme="classic-dark"]) .tov-full .tov-understand .tov-inputrow {
    box-shadow: 0 20px 50px -22px rgba(0,0,0,0.55);
  }
  .tov-full .tov-understand .tov-tools { display: none; }
  :global(html[data-theme="dark"]) .tov-inputrow,
  :global(html[data-theme="classic-dark"]) .tov-inputrow {
    box-shadow: 0 12px 32px -18px rgba(0,0,0,0.45);
  }
  .tov-inputrow:focus-within { border-color: var(--t-border); }
  .tov-inputrow-ico { color: var(--t-muted); margin-top: 2px; }
  .tov-input {
    width: 100%;
    border: 0; outline: 0; resize: none; background: transparent;
    color: var(--t-text); font: inherit;
    font-size: 16px; line-height: 1.5;
    min-height: 56px;
  }
  .tov-input::placeholder { color: var(--t-muted); }
  .tov-send {
    width: 38px; height: 38px;
    border: 0; border-radius: 999px;
    background: var(--t-send); color: var(--t-send-text);
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: opacity .12s, transform .12s;
  }
  .tov-send:hover:not(:disabled) { opacity: .92; }
  .tov-send:active:not(:disabled) { transform: scale(.95); }
  .tov-send:disabled { opacity: .4; cursor: not-allowed; }

  /* Quiet tool row — mic + picker placeholder. */
  .tov-tools { display: flex; gap: 6px; }
  .tov-tool {
    display: inline-flex; align-items: center; gap: 6px;
    height: 28px; padding: 0 12px;
    background: transparent; color: var(--t-muted);
    border: 0; border-radius: 999px;
    font: inherit; font-size: 12px; font-weight: 500;
    cursor: pointer; transition: background .12s, color .12s;
  }
  .tov-tool:hover:not(:disabled) { background: var(--t-pill); color: var(--t-text); }
  .tov-tool:disabled { opacity: .45; cursor: not-allowed; }
  .tov-tool.is-rec { background: var(--t-pill); color: var(--t-text); animation: tovPulse 1.5s ease-in-out infinite; }
  @keyframes tovPulse { 0%,100%{opacity:1;} 50%{opacity:.72;} }

  /* Examples — soft pills under the input. */
  .tov-examples { width: 100%; margin-top: 8px; }
  .tov-examples-label {
    margin: 0 0 10px;
    text-align: left;
    font-size: 11px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--t-muted);
  }
  .tov-examples-grid {
    display: grid; gap: 8px; grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 640px) { .tov-examples-grid { grid-template-columns: 1fr; } }
  .tov-example {
    display: flex; align-items: center; gap: 12px;
    text-align: left;
    background: var(--t-bg-2);
    color: var(--t-text);
    border: 1px solid var(--t-border-soft);
    border-radius: 14px;
    padding: 12px 14px;
    font: inherit; font-size: 13.5px; font-weight: 500; line-height: 1.4;
    cursor: pointer;
    transition: background .12s, border-color .12s, transform .12s;
  }
  .tov-example:hover { background: var(--t-pill); border-color: var(--t-border); }
  .tov-example:active { transform: scale(.99); }

  /* Structured blocks (step 2 / 4) */
  .tov-structure { gap: 18px; }
  .tov-block { width: 100%; display: flex; flex-direction: column; gap: 6px; }
  .tov-block-label {
    margin: 0;
    font-size: 11px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--t-muted);
  }
  .tov-block-text { margin: 0; font-size: 15px; line-height: 1.55; color: var(--t-text); }
  .tov-preview {
    margin: 0; padding: 14px 16px;
    background: var(--t-bg-2);
    border: 1px solid var(--t-border-soft);
    border-radius: 14px;
    font-size: 15px; line-height: 1.6; color: var(--t-text);
    white-space: pre-wrap;
  }

  /* Prepare actions */
  .tov-actions { list-style: none; padding: 0; margin: 6px 0 0; width: 100%; display: flex; flex-direction: column; gap: 4px; }
  .tov-action {
    width: 100%; display: flex; align-items: center; gap: 12px;
    padding: 12px 14px;
    border: 0; border-radius: 12px;
    background: transparent; color: var(--t-text); text-align: left;
    font: inherit; font-size: 14px; font-weight: 500; cursor: pointer;
    transition: background .12s;
  }
  .tov-action:hover { background: var(--t-pill); }
  .tov-action.is-on { background: var(--t-bg-2); }
  .tov-check {
    width: 18px; height: 18px; border-radius: 5px;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--t-border); color: transparent;
  }
  .tov-check.is-on { background: var(--t-primary); color: #FFFFFF; }

  /* Footer */
  .tov-foot {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 14px 24px max(14px, env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--t-border-soft);
    background: var(--t-bg);
  }
  .tov-foot-r { display: inline-flex; gap: 8px; }
  .tov-ghost, .tov-primary {
    display: inline-flex; align-items: center; gap: 7px;
    height: 38px; padding: 0 16px;
    border-radius: 999px;
    font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
    transition: background .12s, opacity .12s, transform .12s;
  }
  .tov-ghost { border: 0; background: transparent; color: var(--t-text-2); }
  .tov-ghost:hover { background: var(--t-pill); color: var(--t-text); }
  .tov-primary { border: 0; background: var(--t-send); color: var(--t-send-text); }
  .tov-primary:hover:not(:disabled) { opacity: .92; }
  .tov-primary:active:not(:disabled) { transform: scale(.97); }
  .tov-spin { animation: tovSpin 1s linear infinite; }

  @keyframes tovIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes tovUp { from { opacity: 0; transform: translateY(20px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes tovSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .tov, .tov-shell, .tov-spin, .tov-tool.is-rec { animation: none !important; }
  }
`
