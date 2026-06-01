'use client'

/**
 * NewProjectModal — calm, canvas-style dialog for creating a new project.
 *
 * Design (2026-06 revision — Linear-style canvas, Tagro logic):
 *   • A true modal: dim + blur backdrop over the whole viewport, dialog
 *     dead-centre. The sidebar stays visible behind the dim but locked.
 *   • The project NAME is the hero — a large, borderless input with a
 *     colour glyph to its left (the glyph opens the accent picker).
 *   • Below the name sits a quiet row of inline property pills —
 *     Status · Umsetzung · Zieltermin — each opening a small floating
 *     popover. These are functional and persist on the project row.
 *   • A calm brief area is where the user describes the work. Tagro
 *     structures it; it does NOT chat back here.
 *   • Milestones & next steps are NOT hand-entered — Tagro derives them
 *     while structuring. We say so, rather than faking a manual list.
 *   • Every button / pill / chip uses an 8px corner — no pills, no 32px
 *     (per the binding radius rule). Colour swatches are rounded squares.
 *   • No black / white / coloured buttons. Slate (var(--btn-prim)) is the
 *     only primary tone; accent colour is the project's own marker.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRight, ArrowsClockwise, Buildings, CalendarBlank, CaretDown,
  Check, CodeBlock, ListChecks, Sparkle, UsersThree, X,
} from '@phosphor-icons/react'

interface Props {
  onClose: () => void
  onCreated?: (projectId: string) => void
}

type DeliveryModel = 'festag_delivery' | 'team_internal' | 'white_label_client'

type DeliveryOption = {
  id: DeliveryModel
  icon: React.ElementType
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

// Project lifecycle phases — mirrors the project view (intake → done).
// A brand-new project starts in 'intake', matching /api/ai/decompose.
type Tone = 'muted' | 'amber' | 'good'
const PROJECT_STATES: { id: string; label: string; tone: Tone }[] = [
  { id: 'intake',   label: 'Intake',        tone: 'muted' },
  { id: 'planning', label: 'Planung',       tone: 'muted' },
  { id: 'active',   label: 'In Arbeit',     tone: 'amber' },
  { id: 'testing',  label: 'Testing',       tone: 'amber' },
  { id: 'done',     label: 'Abgeschlossen', tone: 'good'  },
]

// Calm accent palette. The colour shows up as the project glyph, a thin
// row marker in the projects table and a soft tint in the project header.
const ACCENT_COLOURS = [
  { id: 'slate',   value: '#5B647D', label: 'Slate' },
  { id: 'indigo',  value: '#6366F1', label: 'Indigo' },
  { id: 'sky',     value: '#0EA5E9', label: 'Sky' },
  { id: 'emerald', value: '#22A06B', label: 'Emerald' },
  { id: 'amber',   value: '#D4882B', label: 'Amber' },
  { id: 'rose',    value: '#E11D48', label: 'Rose' },
  { id: 'violet',  value: '#8B5CF6', label: 'Violet' },
  { id: 'mist',    value: '#94A3B8', label: 'Mist' },
]

const EXAMPLE_PROMPTS = [
  'Landingpage für ein Beratungsangebot — Hero, Leistungen, Kontaktformular, einfache SEO.',
  'Internes Tool für die Kundenverwaltung mit Login, Suche und Notizen pro Kontakt.',
  'Mobile App MVP für Hotelbuchungen mit Zimmerübersicht, Buchung und Bestätigungs-Mail.',
  'Automatisches Onboarding-System per E-Mail mit drei Stufen über sieben Tage.',
]

type Phase = 'form' | 'loading' | 'success' | 'error'
type PopKind = 'status' | 'delivery' | 'date' | 'accent'
type PopState = { kind: PopKind; top: number; left: number }

const LOADING_STEPS = [
  'Projekt wird vorbereitet',
  'Tagro strukturiert die Angaben',
  'Nächste Schritte werden angelegt',
  'Projekt wurde erstellt',
] as const

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
      .format(new Date(iso + 'T00:00:00'))
  } catch { return iso }
}

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [accent, setAccent] = useState(ACCENT_COLOURS[0].value)
  const [delivery, setDelivery] = useState<DeliveryModel>('festag_delivery')
  const [status, setStatus] = useState('intake')
  const [targetDate, setTargetDate] = useState('')
  // White-label only: the developer this project is routed to. Festag
  // provisions a dev account if the email has none yet (server-side).
  const [devEmail, setDevEmail] = useState('')
  const [devName, setDevName] = useState('')

  const [phase, setPhase] = useState<Phase>('form')
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState('')
  const [pop, setPop] = useState<PopState | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  // Focus the name on open.
  useEffect(() => { titleRef.current?.focus() }, [])

  // Esc: close an open popover first, otherwise close the dialog (never
  // mid-loading, so a half-finished submit can't be abandoned).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (pop) { setPop(null); return }
      if (phase !== 'loading') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, phase, pop])

  // Autosize the description textarea.
  useEffect(() => {
    const el = descRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(300, Math.max(132, el.scrollHeight)) + 'px'
  }, [description])

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

  // Close popovers if the viewport changes under them.
  useEffect(() => {
    if (!pop) return
    const close = () => setPop(null)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [pop])

  // Loading step ticker — purely visual, the actual work runs in submit().
  useEffect(() => {
    if (phase !== 'loading') return
    setLoadingStep(0)
    const ticks = [350, 900, 1500]
    const timers = ticks.map((t, i) => setTimeout(() => setLoadingStep(i + 1), t))
    return () => { timers.forEach(clearTimeout) }
  }, [phase])

  function openPop(kind: PopKind, e: React.MouseEvent<HTMLButtonElement>) {
    if (pop?.kind === kind) { setPop(null); return }
    const r = e.currentTarget.getBoundingClientRect()
    const width = kind === 'delivery' ? 336 : kind === 'accent' ? 184 : 224
    const left = Math.max(14, Math.min(r.left, window.innerWidth - width - 14))
    setPop({ kind, top: r.bottom + 6, left })
  }

  const canSubmit = title.trim().length >= 2 && description.trim().length >= 12

  async function submit() {
    if (!canSubmit || phase === 'loading') return
    setError('')
    setPop(null)
    setPhase('loading')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('Bitte melde dich erneut an.')

      // Run /api/ai/decompose with the prepared single-shot context so
      // Tagro doesn't bug the user with a chat. The route already
      // tolerates pre-filled title / scope context.
      const chatHistory = [
        { role: 'ai',   text: 'Beschreibe das Projekt in einem Satz oder kurzem Absatz.' },
        { role: 'user', text: `Projekttitel: ${title.trim()}` },
        { role: 'user', text: description.trim() },
      ]
      const res = await fetch('/api/ai/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory, userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Tagro konnte das Projekt nicht strukturieren.')
      const projectId: string | undefined = data?.projectId
      if (!projectId) throw new Error('Projekt wurde analysiert, aber noch nicht gespeichert.')

      // Patch the project row with the user's explicit selections so the
      // structuring step's guesses don't overwrite them.
      const patch: Record<string, unknown> = {
        title: title.trim(),
        scope_summary: description.trim().slice(0, 1200),
        color: accent,
        status,
      }
      if (targetDate) patch.target_date = targetDate
      // delivery_model column added by the modular-project-types migration.
      try { (patch as any).delivery_model = delivery } catch {}
      await (supabase as any).from('projects').update(patch).eq('id', projectId)

      // Background classifier — fire-and-forget.
      fetch('/api/projects/classify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), projectId }),
      }).catch(() => {})

      // White-label routing: hand the project to the chosen developer.
      // The server looks the dev up by email, provisions a Festag dev
      // account if none exists yet, links projects.assigned_dev and sends
      // the credential + assignment emails. Fire-and-forget — the project
      // is already created; routing failures surface in the dev's inbox
      // flow, not as a blocking error here.
      const trimmedDevEmail = devEmail.trim()
      if (delivery === 'white_label_client' && /.+@.+\..+/.test(trimmedDevEmail)) {
        fetch('/api/projects/assign-dev', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            devEmail: trimmedDevEmail,
            devName: devName.trim() || null,
            projectTitle: title.trim(),
            scope: description.trim().slice(0, 1200),
          }),
        }).catch(() => {})
      }

      // Hold the success state for a beat so the user sees the result
      // line up before we hand off.
      setPhase('success')
      setTimeout(() => onCreated?.(projectId), 700)
    } catch (e: any) {
      setError(e?.message || 'Projekt konnte nicht angelegt werden.')
      setPhase('error')
    }
  }

  const selectedDelivery = DELIVERY_OPTIONS.find(d => d.id === delivery)!
  const DeliveryIcon = selectedDelivery.icon
  const curState = PROJECT_STATES.find(s => s.id === status) ?? PROJECT_STATES[0]

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

      <div className="npm-card" ref={dialogRef} role="document" onMouseDown={e => e.stopPropagation()}>
        <header className="npm-head">
          <p className="npm-eyebrow">Neues Projekt</p>
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
          <div className="npm-body" onScroll={() => pop && setPop(null)}>
            {/* Hero canvas — name + property pills */}
            <div className="npm-canvas">
              <div className="npm-name-row">
                <button
                  type="button"
                  className="npm-glyph"
                  style={{ background: accent }}
                  aria-label="Projektfarbe wählen"
                  title="Projektfarbe"
                  onClick={e => openPop('accent', e)}
                />
                <input
                  ref={titleRef}
                  className="npm-name"
                  placeholder="Projektname"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={120}
                />
              </div>

              <div className="npm-props" role="group" aria-label="Projekteigenschaften">
                <button
                  type="button"
                  className="npm-pill"
                  aria-haspopup="listbox"
                  aria-expanded={pop?.kind === 'status'}
                  onClick={e => openPop('status', e)}
                >
                  <span className={`npm-dot t-${curState.tone}`} aria-hidden />
                  <span>{curState.label}</span>
                  <CaretDown size={11} weight="bold" className="npm-pill-caret" />
                </button>

                <button
                  type="button"
                  className="npm-pill"
                  aria-haspopup="listbox"
                  aria-expanded={pop?.kind === 'delivery'}
                  onClick={e => openPop('delivery', e)}
                >
                  <DeliveryIcon size={13} weight="regular" />
                  <span>{selectedDelivery.label}</span>
                  <CaretDown size={11} weight="bold" className="npm-pill-caret" />
                </button>

                <button
                  type="button"
                  className={`npm-pill${targetDate ? ' set' : ''}`}
                  aria-haspopup="dialog"
                  aria-expanded={pop?.kind === 'date'}
                  onClick={e => openPop('date', e)}
                >
                  <CalendarBlank size={13} weight="regular" />
                  <span>{targetDate ? fmtDate(targetDate) : 'Zieltermin'}</span>
                  <CaretDown size={11} weight="bold" className="npm-pill-caret" />
                </button>
              </div>
            </div>

            {/* White-label routing — who delivers this for the agency.
                Festag provisions the dev account if the email is new. */}
            {delivery === 'white_label_client' && (
              <section className="npm-field npm-dev">
                <label className="npm-label" htmlFor="npm-dev-email">Entwickler zuweisen</label>
                <p className="npm-helper">
                  Trag die E-Mail des Entwicklers ein, der das Projekt umsetzt. Hat er noch kein
                  Festag-Konto, richten wir es ein und schicken ihm Zugangsdaten und den Auftrag zu.
                </p>
                <div className="npm-dev-row">
                  <input
                    id="npm-dev-email"
                    type="email"
                    className="npm-input"
                    placeholder="entwickler@beispiel.de"
                    value={devEmail}
                    onChange={e => setDevEmail(e.target.value)}
                    autoComplete="off"
                  />
                  <input
                    type="text"
                    className="npm-input"
                    placeholder="Name (optional)"
                    value={devName}
                    onChange={e => setDevName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </section>
            )}

            {/* Brief */}
            <section className="npm-field">
              <label className="npm-label" htmlFor="npm-desc">Worum geht es?</label>
              <p className="npm-helper">
                Beschreibe, was umgesetzt werden soll. Tagro strukturiert daraus Ziel, Umfang, nächste Schritte und die passende Umsetzung.
              </p>
              <textarea
                id="npm-desc"
                ref={descRef}
                className="npm-textarea"
                placeholder="Zum Beispiel: Eine Landingpage für ein Beratungsangebot — Hero, Leistungen, Kontaktformular und einfache SEO-Grundstruktur."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={6}
                maxLength={2000}
              />
              <div className="npm-examples">
                {EXAMPLE_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    className="npm-example"
                    onClick={() => setDescription(prompt)}
                  >
                    <CodeBlock size={10} weight="regular" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Milestones — Tagro derives these, the user doesn't hand-enter them */}
            <div className="npm-milestones" aria-hidden>
              <span className="npm-milestones-ico"><ListChecks size={15} weight="regular" /></span>
              <span className="npm-milestones-text">
                <strong>Meilensteine &amp; nächste Schritte</strong>
                <small>Tagro leitet sie beim Strukturieren aus deiner Beschreibung ab.</small>
              </span>
            </div>

            {error && (
              <p className="npm-error" role="alert">{error}</p>
            )}
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

        {phase !== 'success' && (
          <footer className="npm-foot">
            <button
              type="button"
              className="npm-secondary"
              onClick={onClose}
              disabled={phase === 'loading'}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="npm-primary"
              onClick={submit}
              disabled={!canSubmit || phase === 'loading'}
              aria-busy={phase === 'loading'}
            >
              {phase === 'loading'
                ? <>Tagro strukturiert… <ArrowsClockwise size={13} className="npm-spin" /></>
                : phase === 'error'
                  ? <>Erneut versuchen <ArrowRight size={13} /></>
                  : <>Projekt vorbereiten <ArrowRight size={13} /></>}
            </button>
          </footer>
        )}
      </div>

      {/* Floating property popovers — fixed to the viewport so the card's
          rounded clip never cuts them off. */}
      {pop && (phase === 'form' || phase === 'error') && (
        <div className="npm-pop-layer" onMouseDown={() => setPop(null)}>
          <div
            className={`npm-pop k-${pop.kind}`}
            style={{ top: pop.top, left: pop.left }}
            onMouseDown={e => e.stopPropagation()}
            role={pop.kind === 'date' ? 'dialog' : 'listbox'}
          >
            {pop.kind === 'status' && PROJECT_STATES.map(s => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={status === s.id}
                className={`npm-pop-item${status === s.id ? ' on' : ''}`}
                onClick={() => { setStatus(s.id); setPop(null) }}
              >
                <span className={`npm-dot t-${s.tone}`} aria-hidden />
                <span className="npm-pop-label">{s.label}</span>
                {status === s.id && <Check size={12} weight="bold" className="npm-pop-check" />}
              </button>
            ))}

            {pop.kind === 'delivery' && DELIVERY_OPTIONS.map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={delivery === opt.id}
                  className={`npm-pop-item wide${delivery === opt.id ? ' on' : ''}`}
                  onClick={() => { setDelivery(opt.id); setPop(null) }}
                >
                  <span className="npm-pop-ico"><Icon size={14} weight="regular" /></span>
                  <span className="npm-pop-text">
                    <strong>{opt.label}</strong>
                    <small>{opt.meta}</small>
                  </span>
                  {delivery === opt.id && <Check size={12} weight="bold" className="npm-pop-check" />}
                </button>
              )
            })}

            {pop.kind === 'date' && (
              <div className="npm-pop-date">
                <label className="npm-pop-date-label">Zieltermin</label>
                <input
                  type="date"
                  className="npm-date-input"
                  value={targetDate}
                  min={today}
                  onChange={e => setTargetDate(e.target.value)}
                />
                {targetDate && (
                  <button
                    type="button"
                    className="npm-pop-clear"
                    onClick={() => { setTargetDate(''); setPop(null) }}
                  >
                    Termin entfernen
                  </button>
                )}
              </div>
            )}

            {pop.kind === 'accent' && (
              <div className="npm-pop-accents" role="radiogroup" aria-label="Projektfarbe">
                {ACCENT_COLOURS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={accent === c.value}
                    aria-label={c.label}
                    title={c.label}
                    className={`npm-swatch${accent === c.value ? ' on' : ''}`}
                    style={{ ['--sw' as any]: c.value }}
                    onClick={() => { setAccent(c.value); setPop(null) }}
                  >
                    {accent === c.value && <Check size={11} weight="bold" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
    width: min(720px, calc(100vw - 32px));
    max-height: calc(100dvh - 64px);
    background: var(--card);
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    border-radius: 16px;
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
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 16px 12px 22px;
  }
  .npm-eyebrow {
    margin: 0; font-size: 10.5px; font-weight: 500;
    letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted);
  }
  .npm-icon-btn {
    width: 30px; height: 30px; border: 0; background: transparent;
    color: var(--text-muted); border-radius: 8px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .npm-icon-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface-2) 65%, transparent);
    color: var(--text);
  }
  .npm-icon-btn:disabled { opacity: .35; cursor: not-allowed; }

  .npm-body {
    padding: 4px 22px 22px;
    overflow-y: auto;
    display: flex; flex-direction: column; gap: 20px;
  }

  /* Hero canvas */
  .npm-canvas { display: flex; flex-direction: column; gap: 14px; }
  .npm-name-row { display: flex; align-items: center; gap: 13px; }
  .npm-glyph {
    width: 30px; height: 30px; border-radius: 8px; border: 0;
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, #000 12%, transparent),
      0 1px 2px rgba(15,23,42,.18);
    cursor: pointer; flex-shrink: 0;
    transition: transform .12s, box-shadow .12s;
  }
  .npm-glyph:hover { transform: translateY(-1px); }
  .npm-glyph:focus-visible {
    outline: 0;
    box-shadow: 0 0 0 2px var(--card), 0 0 0 4px color-mix(in srgb, var(--btn-prim) 55%, transparent);
  }
  .npm-name {
    flex: 1; min-width: 0;
    background: transparent; border: 0; outline: 0;
    color: var(--text); font: inherit;
    font-size: 23px; font-weight: 500; letter-spacing: -.015em;
    padding: 4px 0;
  }
  .npm-name::placeholder { color: var(--text-muted); opacity: .5; }

  /* Property pills */
  .npm-props { display: flex; flex-wrap: wrap; gap: 7px; }
  .npm-pill {
    display: inline-flex; align-items: center; gap: 7px;
    height: 30px; padding: 0 10px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
    background: color-mix(in srgb, var(--surface-2) 30%, transparent);
    color: var(--text-secondary);
    font: inherit; font-size: 12.5px; font-weight: 500; letter-spacing: .01em;
    cursor: pointer; white-space: nowrap;
    transition: background .12s, color .12s, border-color .12s;
  }
  .npm-pill:hover {
    background: color-mix(in srgb, var(--surface-2) 60%, transparent);
    border-color: var(--border-strong);
    color: var(--text);
  }
  .npm-pill[aria-expanded="true"] {
    border-color: color-mix(in srgb, var(--btn-prim) 50%, var(--border));
    background: color-mix(in srgb, var(--btn-prim) 8%, transparent);
    color: var(--text);
  }
  .npm-pill.set { color: var(--text); }
  .npm-pill svg { color: var(--text-muted); flex-shrink: 0; }
  .npm-pill-caret { margin-left: -1px; opacity: .8; }

  .npm-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    background: color-mix(in srgb, var(--text-muted) 80%, transparent); }
  .npm-dot.t-muted { background: color-mix(in srgb, var(--text-muted) 78%, transparent); }
  .npm-dot.t-amber { background: var(--amber); }
  .npm-dot.t-good  { background: var(--green-dark); }

  /* Brief */
  .npm-field { display: flex; flex-direction: column; gap: 8px; }
  .npm-label {
    font-size: 11px; font-weight: 500; letter-spacing: .14em;
    text-transform: uppercase; color: var(--text-muted);
  }
  .npm-helper {
    margin: -4px 0 4px; font-size: 12.5px; line-height: 1.55;
    color: var(--text-muted); font-weight: 500; letter-spacing: .015em;
    max-width: 58ch;
  }
  .npm-textarea {
    width: 100%; padding: 13px 15px;
    background: color-mix(in srgb, var(--surface) 55%, var(--card) 45%);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    border-radius: 10px;
    color: var(--text); font: inherit;
    font-size: 14px; line-height: 1.6; font-weight: 500; letter-spacing: .015em;
    outline: 0; resize: vertical;
    min-height: 132px; max-height: 300px;
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
    padding: 5px 10px; border-radius: 8px;
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

  /* Milestones hint (Tagro derives — not hand-entered) */
  .npm-milestones {
    display: flex; align-items: center; gap: 11px;
    padding: 12px 14px;
    border: 1px dashed color-mix(in srgb, var(--border) 80%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface-2) 22%, transparent);
  }
  .npm-milestones-ico {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--surface-2) 60%, transparent);
    color: var(--text-secondary);
  }
  .npm-milestones-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .npm-milestones-text strong {
    font-size: 12.5px; font-weight: 500; letter-spacing: -.003em; color: var(--text);
  }
  .npm-milestones-text small {
    font-size: 11.5px; line-height: 1.45; color: var(--text-muted);
    font-weight: 500; letter-spacing: .015em;
  }

  /* White-label dev routing field */
  .npm-dev-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .npm-input {
    flex: 1; min-width: 180px; padding: 11px 13px;
    background: color-mix(in srgb, var(--surface) 55%, var(--card) 45%);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    border-radius: 10px;
    color: var(--text); font: inherit;
    font-size: 13.5px; font-weight: 500; letter-spacing: .015em;
    outline: 0;
    transition: border-color .14s, box-shadow .14s;
  }
  .npm-input::placeholder { color: var(--text-muted); opacity: .6; }
  .npm-input:focus {
    border-color: color-mix(in srgb, var(--btn-prim) 45%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--btn-prim) 14%, transparent);
  }

  /* Error inline */
  .npm-error {
    margin: 0; padding: 10px 14px;
    background: color-mix(in srgb, var(--red) 10%, transparent);
    color: var(--red);
    border: 1px solid color-mix(in srgb, var(--red) 22%, transparent);
    border-radius: 8px;
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
    background: color-mix(in srgb, var(--green-dark) 14%, transparent);
    border-color: color-mix(in srgb, var(--green-dark) 28%, transparent);
    color: var(--green-dark);
  }
  .npm-spin { animation: npmSpin 1s linear infinite; }
  @keyframes npmSpin { to { transform: rotate(360deg); } }

  .npm-steps {
    margin: 6px 0 0; padding: 0; list-style: none;
    display: flex; flex-direction: column; gap: 6px;
    max-width: 320px; width: 100%;
  }
  .npm-steps li {
    display: grid; grid-template-columns: 22px 1fr; gap: 10px; align-items: center;
    padding: 8px 12px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--surface-2) 35%, transparent);
    font-size: 12.5px; font-weight: 500; letter-spacing: .015em;
    color: var(--text-muted); text-align: left;
    transition: background .2s, color .2s;
  }
  .npm-steps li.active {
    background: color-mix(in srgb, var(--btn-prim) 10%, transparent);
    color: var(--text);
  }
  .npm-steps li.done { color: var(--text); }
  .npm-step-mark {
    width: 22px; height: 22px; border-radius: 6px;
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

  /* Floating popovers */
  .npm-pop-layer { position: fixed; inset: 0; z-index: 12600; }
  .npm-pop {
    position: fixed;
    background: var(--card);
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    border-radius: 12px;
    box-shadow:
      0 1px 2px rgba(15,23,42,.08),
      0 18px 44px -16px rgba(15,23,42,.4);
    padding: 5px;
    animation: npmPopIn .14s cubic-bezier(.16,1,.3,1) both;
  }
  [data-theme="dark"] .npm-pop,
  [data-theme="classic-dark"] .npm-pop {
    background: color-mix(in srgb, var(--card) 92%, #fff 8%);
    box-shadow: 0 1px 2px rgba(0,0,0,.5), 0 20px 50px -18px rgba(0,0,0,.75);
  }
  @keyframes npmPopIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  .npm-pop.k-status   { width: 224px; }
  .npm-pop.k-delivery { width: 336px; }
  .npm-pop.k-date     { width: 224px; }
  .npm-pop.k-accent   { width: 184px; }

  .npm-pop-item {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 8px 10px; border: 0; border-radius: 8px;
    background: transparent; color: var(--text);
    font: inherit; font-size: 13px; font-weight: 500; letter-spacing: .01em;
    text-align: left; cursor: pointer;
    transition: background .1s;
  }
  .npm-pop-item:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
  .npm-pop-item.on { background: color-mix(in srgb, var(--btn-prim) 9%, transparent); }
  .npm-pop-label { flex: 1; min-width: 0; }
  .npm-pop-check { color: var(--btn-prim); flex-shrink: 0; }
  .npm-pop-item.wide { align-items: flex-start; }
  .npm-pop-ico {
    width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; margin-top: 1px;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--surface-2) 60%, transparent);
    color: var(--text-secondary);
  }
  .npm-pop-item.on .npm-pop-ico {
    background: color-mix(in srgb, var(--btn-prim) 14%, transparent);
    color: var(--btn-prim);
  }
  .npm-pop-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
  .npm-pop-text strong { font-size: 12.5px; font-weight: 500; letter-spacing: -.003em; color: var(--text); }
  .npm-pop-text small { font-size: 11px; line-height: 1.45; color: var(--text-muted); font-weight: 500; letter-spacing: .015em; }
  .npm-pop-item.wide .npm-pop-check { margin-top: 8px; }

  /* Date popover */
  .npm-pop-date { display: flex; flex-direction: column; gap: 7px; padding: 7px; }
  .npm-pop-date-label {
    font-size: 10.5px; font-weight: 500; letter-spacing: .14em;
    text-transform: uppercase; color: var(--text-muted); padding: 2px 2px 0;
  }
  .npm-date-input {
    width: 100%; padding: 8px 10px;
    background: color-mix(in srgb, var(--surface) 55%, var(--card) 45%);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    border-radius: 8px;
    color: var(--text); font: inherit; font-size: 13px; font-weight: 500;
    outline: 0; cursor: pointer;
    transition: border-color .14s, box-shadow .14s;
  }
  .npm-date-input:focus {
    border-color: color-mix(in srgb, var(--btn-prim) 45%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--btn-prim) 14%, transparent);
  }
  [data-theme="dark"] .npm-date-input,
  [data-theme="classic-dark"] .npm-date-input { color-scheme: dark; }
  .npm-pop-clear {
    width: 100%; padding: 7px 10px; border: 0; border-radius: 8px;
    background: transparent; color: var(--text-secondary);
    font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .01em;
    cursor: pointer; text-align: left;
    transition: background .1s, color .1s;
  }
  .npm-pop-clear:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); color: var(--text); }

  /* Accent popover */
  .npm-pop-accents {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 6px;
  }
  .npm-swatch {
    width: 36px; height: 30px; border-radius: 8px; border: 0; padding: 0;
    cursor: pointer; position: relative;
    background: var(--sw);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 12%, transparent);
    display: inline-flex; align-items: center; justify-content: center;
    color: #fff;
    transition: transform .1s, box-shadow .1s;
  }
  .npm-swatch:hover { transform: translateY(-1px); }
  .npm-swatch.on { box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 14%, transparent), 0 0 0 2px var(--card), 0 0 0 4px color-mix(in srgb, var(--btn-prim) 60%, transparent); }
  .npm-swatch svg { filter: drop-shadow(0 1px 1px rgba(0,0,0,.35)); }

  @media (max-width: 720px) {
    .npm-overlay { padding: 16px; align-items: flex-end; }
    .npm-card {
      width: 100%;
      max-height: calc(100dvh - 24px);
      border-radius: 16px 16px 12px 12px;
    }
    .npm-foot { flex-direction: column; align-items: stretch; }
    .npm-primary, .npm-secondary { justify-content: center; width: 100%; }
    .npm-pop.k-delivery { width: min(336px, calc(100vw - 28px)); }
  }
`
