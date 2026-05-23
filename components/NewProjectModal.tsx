'use client'

/**
 * NewProjectModal — calm centred dialog for creating a new project.
 *
 * Design (per 2026-05-23 spec):
 *   • True modal — dim + blur backdrop over the whole viewport. The
 *     sidebar stays visible behind the dim but is locked. The dialog
 *     sits dead-centre on the page (not inside the content column).
 *   • One concise form, no chat back-and-forth. Title, calm
 *     description textarea, three umsetzungsart cards, a quiet colour
 *     accent picker.
 *   • Tagro doesn't ask follow-up questions here — it confirms,
 *     structures and bows out. Follow-ups go through the project
 *     surface afterwards.
 *   • Submit lifecycle: idle → "Projekt vorbereiten" → loading
 *     "Tagro strukturiert…" → success "Projekt angelegt" with a calm
 *     four-step progress strip → onCreated.
 *   • No black buttons anywhere. Slate (var(--btn-prim)) is the only
 *     primary tone.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRight, ArrowsClockwise, Buildings, Check, CodeBlock,
  Sparkle, UsersThree, X,
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

// Calm accent palette. The colour shows up only as a thin row marker in
// the projects table and as a soft tint in the project header.
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

  const [phase, setPhase] = useState<Phase>('form')
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState('')

  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  // Focus the title on open.
  useEffect(() => { titleRef.current?.focus() }, [])

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
    el.style.height = Math.min(280, Math.max(120, el.scrollHeight)) + 'px'
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

  // Loading step ticker — purely visual, the actual work runs in submit().
  useEffect(() => {
    if (phase !== 'loading') return
    setLoadingStep(0)
    const ticks = [350, 900, 1500]
    const timers = ticks.map((t, i) => setTimeout(() => setLoadingStep(i + 1), t))
    return () => { timers.forEach(clearTimeout) }
  }, [phase])

  const canSubmit = title.trim().length >= 2 && description.trim().length >= 12

  async function submit() {
    if (!canSubmit || phase === 'loading') return
    setError('')
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
      }
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
          <div className="npm-head-meta">
            <p className="npm-eyebrow">Neues Projekt</p>
            <h2>Was möchtest du umsetzen?</h2>
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
            <section className="npm-section">
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

            <section className="npm-section">
              <label className="npm-label" htmlFor="npm-desc">Projekt kurz beschreiben</label>
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
                rows={5}
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

            <section className="npm-section">
              <p className="npm-label as-block">Wie soll das Projekt umgesetzt werden?</p>
              <div className="npm-delivery">
                {DELIVERY_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={delivery === opt.id}
                      className={`npm-delivery-card${delivery === opt.id ? ' on' : ''}`}
                      onClick={() => setDelivery(opt.id)}
                    >
                      <span className="npm-delivery-icon">
                        <Icon size={16} weight="regular" />
                      </span>
                      <span className="npm-delivery-main">
                        <strong>{opt.label}</strong>
                        <small>{opt.meta}</small>
                      </span>
                      <span className="npm-delivery-tick" aria-hidden>
                        <Check size={11} weight="bold" />
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

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
    border-radius: 999px;
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
