'use client'

import { useEffect, useRef, useState } from 'react'

/* ─── Scenarios ─────────────────────────────────────────────────────────── */

type Scenario = {
  context: string
  text: string    // the full typed message (use \n for line breaks)
  actions: [string, string]
  resolveIdx: 0 | 1
  resolveLabel: string
  stats: Array<{ label: string; value: string }>
}

const SCENARIOS: Scenario[] = [
  {
    context: 'Projektstatus — Festag Launch',
    text: [
      'API-Integration mit Stripe wurde auf KW 32 verschoben.',
      'Betrifft Payment-Flow und Invoice-Modul.',
      '',
      'Verzögerung: 3 Tage. Tech Lead hat noch',
      'keine Eskalation ausgelöst.',
      '',
      'Empfehle sofortige Eskalation.',
    ].join('\n'),
    actions: ['Eskalieren', 'Zurückstellen'],
    resolveIdx: 0,
    resolveLabel: 'Eskalation ausgelöst',
    stats: [
      { label: 'Projekt', value: 'Festag Launch' },
      { label: 'Status', value: '3 Tage Verzug' },
    ],
  },
  {
    context: 'Ressourcen — Design System',
    text: [
      'Andreas beantragt 40 zusätzliche',
      'Stunden für das Design System.',
      '',
      'Projektstatus: on track.',
      'Budget-Puffer noch verfügbar: 8 %.',
      '',
      'Genehmigung empfohlen.',
    ].join('\n'),
    actions: ['Freigeben', 'Ablehnen'],
    resolveIdx: 0,
    resolveLabel: 'Freigabe erteilt',
    stats: [
      { label: 'Aufwand', value: '+ 40 h' },
      { label: 'Puffer', value: '8 % verbleibend' },
    ],
  },
  {
    context: 'Wochenbriefing — KW 28',
    text: [
      '3 Projekte laufen on track.',
      '1 Projekt zeigt frühe Warnsignale.',
      '',
      '2 Entscheidungen warten seit mehr als',
      '48 Stunden auf deine Freigabe.',
      '',
      'Kritischer Blocker: Staging-Zugänge',
      'für Leqra fehlen seit Dienstag.',
    ].join('\n'),
    actions: ['Briefing öffnen', 'Später'],
    resolveIdx: 0,
    resolveLabel: 'Briefing geöffnet',
    stats: [
      { label: 'Woche', value: 'KW 28' },
      { label: 'Offen', value: '2 Entscheidungen' },
    ],
  },
]

/* ─── Timing ─────────────────────────────────────────────────────────────── */
const CHAR_MS      = 26
const PRE_ACTION   = 700
const ACTION_WAIT  = 2200
const RESOLVE_WAIT = 1500
const FADE_WAIT    = 480

type Phase = 'typing' | 'waiting' | 'resolving' | 'done' | 'fading'

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function AuthTagroShowcase() {
  const [scIdx,      setScIdx]      = useState(0)
  const [typed,      setTyped]      = useState('')
  const [phase,      setPhase]      = useState<Phase>('typing')
  const [actionsIn,  setActionsIn]  = useState(false)
  const [clickedIdx, setClickedIdx] = useState<number | null>(null)
  const [visible,    setVisible]    = useState(true)
  const [timestamp,  setTimestamp]  = useState('')

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clear  = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const after  = (ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms)
    timers.current.push(t)
  }

  const scenario = SCENARIOS[scIdx]

  /* ── Timestamp (client-only) ──────────────────────────────────────────── */
  useEffect(() => {
    setTimestamp(new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }))
  }, [scIdx])

  /* ── Typewriter ───────────────────────────────────────────────────────── */
  useEffect(() => {
    clear()
    setTyped('')
    setPhase('typing')
    setActionsIn(false)
    setClickedIdx(null)
    setVisible(true)

    const fullText = scenario.text
    let pos = 0

    const tick = () => {
      pos++
      setTyped(fullText.slice(0, pos))
      if (pos < fullText.length) {
        // Slight pause after empty paragraph lines for natural rhythm
        const ch = fullText[pos - 1]
        const extra = ch === '\n' && fullText[pos] === '\n' ? 80 : 0
        after(CHAR_MS + extra, tick)
      } else {
        after(PRE_ACTION, () => {
          setPhase('waiting')
          after(60, () => setActionsIn(true))
          after(ACTION_WAIT, () => {
            setClickedIdx(scenario.resolveIdx)
            setPhase('resolving')
            after(RESOLVE_WAIT, () => {
              setPhase('done')
              after(FADE_WAIT, () => {
                setVisible(false)
                after(380, () => setScIdx(i => (i + 1) % SCENARIOS.length))
              })
            })
          })
        })
      }
    }
    after(CHAR_MS, tick)
    return clear
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scIdx])

  const isTyping = phase === 'typing'

  return (
    <>
      <style>{CSS}</style>
      <aside
        className={`atg-root${!visible ? ' atg-fading' : ''}`}
        aria-hidden="true"
      >
        {/* Ambient glow */}
        <div className="atg-glow atg-glow--1" />
        <div className="atg-glow atg-glow--2" />

        {/* Decorative grid */}
        <div className="atg-grid" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="atg-grid-line" style={{ top: `${10 + i * 13}%` }} />
          ))}
        </div>

        {/* Context chip */}
        <div className={`atg-chip atg-chip--top${actionsIn ? ' is-in' : ''}`}>
          <span className="atg-chip-dot atg-chip-dot--green" />
          <span className="atg-chip-text">{scenario.context}</span>
        </div>

        {/* ── Main card ─────────────────────────────────────────────────── */}
        <div className="atg-card">

          <div className="atg-card-header">
            <div className="atg-sender">
              <span className="atg-tagro-label">Tagro</span>
              <span className="atg-arrow">→</span>
              <span className="atg-recipient">CEO</span>
            </div>
            {timestamp && <span className="atg-timestamp">{timestamp}</span>}
          </div>

          {/* Typed message */}
          <div className="atg-message">
            <span className="atg-text">{typed}</span>
            {isTyping ? <span className="atg-cursor" /> : null}
          </div>

          {/* Stats */}
          {actionsIn && (
            <div className="atg-stats-row is-in">
              {scenario.stats.map((s, i) => (
                <div key={i} className="atg-stat">
                  <span className="atg-stat-label">{s.label}</span>
                  <span className="atg-stat-value">{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {actionsIn && <div className="atg-sep is-in" />}

          {/* Actions */}
          {actionsIn && (
            <div className="atg-actions is-in">
              {scenario.actions.map((label, idx) => {
                const isClicked = clickedIdx === idx
                const isOther   = clickedIdx !== null && !isClicked
                return (
                  <button
                    key={idx}
                    className={`atg-btn${idx === 0 ? ' atg-btn--primary' : ' atg-btn--ghost'}${isClicked ? ' atg-btn--clicked' : ''}${isOther ? ' atg-btn--faded' : ''}`}
                    tabIndex={-1}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Resolution */}
          {(phase === 'resolving' || phase === 'done') && (
            <div className="atg-resolve">
              <span className="atg-resolve-check">✓</span>
              <span className="atg-resolve-text">{scenario.resolveLabel}</span>
            </div>
          )}
        </div>

        {/* Bottom chip */}
        <div className={`atg-chip atg-chip--bottom${actionsIn ? ' is-in' : ''}`}>
          <span className="atg-chip-dot atg-chip-dot--orange" />
          <span className="atg-chip-text">2 Entscheidungen offen</span>
        </div>
      </aside>
    </>
  )
}

/* ─── CSS ────────────────────────────────────────────────────────────────── */

const CSS = `
  @media (max-width: 1080px) { .atg-root { display: none !important; } }

  .atg-root {
    position: fixed;
    right: 0; top: 0; bottom: 0;
    width: min(500px, 42vw);
    z-index: 4;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    padding: 48px 40px 48px 20px;
    pointer-events: none;
    overflow: hidden;
    transition: opacity 0.42s ease;
  }
  .atg-fading { opacity: 0 !important; }

  /* ── Glow ────────────────────────────────────────────────────────────── */
  .atg-glow {
    position: absolute; border-radius: 50%; pointer-events: none;
  }
  .atg-glow--1 {
    width: 400px; height: 300px; top: 15%; left: -5%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 65%);
    filter: blur(4px);
  }
  .atg-glow--2 {
    width: 300px; height: 260px; bottom: 15%; right: 0;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 65%);
    filter: blur(4px);
  }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-glow--1 {
    background: radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 65%);
  }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-glow--2 {
    background: radial-gradient(circle, rgba(56, 189, 248, 0.05) 0%, transparent 65%);
  }

  /* ── Grid ────────────────────────────────────────────────────────────── */
  .atg-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
  .atg-grid-line { position: absolute; left: 0; right: 0; height: 1px; }
  html[data-theme="dark"] .atg-grid-line,
  html[data-theme="classic-dark"] .atg-grid-line { background: rgba(255,255,255,0.03); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-grid-line { background: rgba(30,30,32,0.04); }

  /* ── Chips ───────────────────────────────────────────────────────────── */
  .atg-chip {
    position: relative; z-index: 2;
    display: inline-flex; align-items: center; gap: 7px;
    padding: 6px 13px 6px 10px;
    border-radius: 999px;
    align-self: flex-start;
    opacity: 0; transform: translateY(6px);
    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(.16,1,.3,1);
  }
  .atg-chip.is-in { opacity: 1; transform: translateY(0); }
  .atg-chip--top  { margin-bottom: 14px; }
  .atg-chip--bottom { margin-top: 14px; transition-delay: 0.08s; }
  html[data-theme="dark"] .atg-chip,
  html[data-theme="classic-dark"] .atg-chip {
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.04);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-chip {
    border: 1px solid rgba(30,30,32,0.09);
    background: rgba(255,255,255,0.80);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  }
  .atg-chip-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .atg-chip-dot--green  { background: rgba(74, 222, 128, 0.85); }
  .atg-chip-dot--orange { background: rgba(251, 146, 60, 0.85); }
  .atg-chip-text {
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 11.5px; font-weight: 400; letter-spacing: 0.01em; white-space: nowrap;
  }
  html[data-theme="dark"] .atg-chip-text,
  html[data-theme="classic-dark"] .atg-chip-text { color: rgba(245,245,247,0.52); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-chip-text { color: rgba(30,30,32,0.52); }

  /* ── Card ────────────────────────────────────────────────────────────── */
  .atg-card {
    position: relative; z-index: 2;
    border-radius: 20px;
    padding: 22px 24px 20px;
    animation: atgCardIn 0.52s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes atgCardIn {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  html[data-theme="dark"] .atg-card,
  html[data-theme="classic-dark"] .atg-card {
    border: 1px solid rgba(255,255,255,0.07);
    background: rgba(11,11,15,0.82);
    backdrop-filter: blur(32px) saturate(160%);
    -webkit-backdrop-filter: blur(32px) saturate(160%);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.04) inset,
      0 24px 72px rgba(0,0,0,0.55),
      0 4px 20px rgba(0,0,0,0.30);
  }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-card {
    border: 1px solid rgba(30,30,32,0.08);
    background: rgba(255,255,255,0.90);
    backdrop-filter: blur(28px) saturate(150%);
    -webkit-backdrop-filter: blur(28px) saturate(150%);
    box-shadow:
      0 1px 0 rgba(255,255,255,0.95) inset,
      0 20px 60px rgba(15,23,42,0.08),
      0 4px 16px rgba(15,23,42,0.05);
  }

  /* ── Card header ─────────────────────────────────────────────────────── */
  .atg-card-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px; padding-bottom: 14px;
  }
  html[data-theme="dark"] .atg-card-header,
  html[data-theme="classic-dark"] .atg-card-header { border-bottom: 1px solid rgba(255,255,255,0.06); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-card-header { border-bottom: 1px solid rgba(30,30,32,0.07); }
  .atg-sender { display: flex; align-items: center; gap: 7px; }
  .atg-tagro-label {
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 12px; font-weight: 400; letter-spacing: 0.02em;
    background: linear-gradient(90deg, #a78bfa, #60a5fa);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .atg-arrow { font-size: 12px; font-weight: 300; }
  html[data-theme="dark"] .atg-arrow,
  html[data-theme="classic-dark"] .atg-arrow { color: rgba(245,245,247,0.22); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-arrow { color: rgba(30,30,32,0.25); }
  .atg-recipient {
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 12px; font-weight: 400;
  }
  html[data-theme="dark"] .atg-recipient,
  html[data-theme="classic-dark"] .atg-recipient { color: rgba(245,245,247,0.48); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-recipient { color: rgba(30,30,32,0.48); }
  .atg-timestamp {
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 11px; font-weight: 400; letter-spacing: 0.01em;
  }
  html[data-theme="dark"] .atg-timestamp,
  html[data-theme="classic-dark"] .atg-timestamp { color: rgba(245,245,247,0.25); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-timestamp { color: rgba(30,30,32,0.28); }

  /* ── Message ─────────────────────────────────────────────────────────── */
  .atg-message {
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 14.5px; font-weight: 400; line-height: 1.72; letter-spacing: -0.005em;
    min-height: 130px;
    white-space: pre-line; /* renders \n as line breaks, wraps normally */
    word-break: break-word;
  }
  html[data-theme="dark"] .atg-message,
  html[data-theme="classic-dark"] .atg-message { color: rgba(245,245,247,0.88); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-message { color: rgba(30,30,32,0.88); }
  .atg-text { display: inline; }
  .atg-cursor {
    display: inline-block;
    width: 1.5px; height: 1.05em;
    background: rgba(167, 139, 250, 0.80);
    border-radius: 1px;
    margin-left: 1px;
    vertical-align: text-bottom;
    animation: atgBlink 0.85s steps(1) infinite;
  }
  @keyframes atgBlink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  /* ── Stats row ───────────────────────────────────────────────────────── */
  .atg-stats-row {
    display: flex; gap: 20px; margin-top: 14px;
    opacity: 0; transform: translateY(4px);
    transition: opacity 0.28s ease, transform 0.28s cubic-bezier(.16,1,.3,1);
  }
  .atg-stats-row.is-in { opacity: 1; transform: translateY(0); }
  .atg-stat { display: flex; flex-direction: column; gap: 2px; }
  .atg-stat-label {
    font-size: 10px; font-weight: 400;
    letter-spacing: 0.05em; text-transform: uppercase;
  }
  html[data-theme="dark"] .atg-stat-label,
  html[data-theme="classic-dark"] .atg-stat-label { color: rgba(245,245,247,0.24); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-stat-label { color: rgba(30,30,32,0.30); }
  .atg-stat-value {
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 12.5px; font-weight: 400;
  }
  html[data-theme="dark"] .atg-stat-value,
  html[data-theme="classic-dark"] .atg-stat-value { color: rgba(245,245,247,0.60); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-stat-value { color: rgba(30,30,32,0.62); }

  /* ── Separator ───────────────────────────────────────────────────────── */
  .atg-sep {
    height: 1px; margin: 16px 0 0;
    opacity: 0; transition: opacity 0.22s ease 0.10s;
  }
  .atg-sep.is-in { opacity: 1; }
  html[data-theme="dark"] .atg-sep,
  html[data-theme="classic-dark"] .atg-sep { background: rgba(255,255,255,0.06); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-sep { background: rgba(30,30,32,0.07); }

  /* ── Action buttons ──────────────────────────────────────────────────── */
  .atg-actions {
    display: flex; gap: 8px; margin-top: 14px;
    opacity: 0; transform: translateY(5px);
    transition: opacity 0.3s ease 0.14s, transform 0.3s cubic-bezier(.16,1,.3,1) 0.14s;
  }
  .atg-actions.is-in { opacity: 1; transform: translateY(0); }
  .atg-btn {
    flex: 1;
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 13px; font-weight: 400; letter-spacing: -0.01em;
    border-radius: 999px; padding: 9px 16px;
    border: 1px solid transparent; outline: none; cursor: default;
    transition: background 0.18s, border-color 0.18s, opacity 0.2s, transform 0.18s cubic-bezier(.16,1,.3,1);
    white-space: nowrap;
  }
  html[data-theme="dark"] .atg-btn--primary,
  html[data-theme="classic-dark"] .atg-btn--primary {
    background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.13); color: rgba(245,245,247,0.88);
  }
  html[data-theme="dark"] .atg-btn--ghost,
  html[data-theme="classic-dark"] .atg-btn--ghost {
    background: transparent; border-color: rgba(255,255,255,0.07); color: rgba(245,245,247,0.40);
  }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-btn--primary {
    background: rgba(30,30,32,0.07); border-color: rgba(30,30,32,0.11); color: rgba(30,30,32,0.85);
  }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-btn--ghost {
    background: transparent; border-color: rgba(30,30,32,0.07); color: rgba(30,30,32,0.40);
  }
  .atg-btn--clicked {
    background: rgba(167,139,250,0.16) !important;
    border-color: rgba(167,139,250,0.30) !important;
    color: rgba(196,181,253,0.95) !important;
    transform: scale(0.96);
  }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .atg-btn--clicked {
    background: rgba(109,40,217,0.09) !important; border-color: rgba(109,40,217,0.20) !important; color: rgba(109,40,217,0.90) !important;
  }
  .atg-btn--faded { opacity: 0.25; }

  /* ── Resolution ──────────────────────────────────────────────────────── */
  .atg-resolve {
    display: flex; align-items: center; gap: 8px;
    margin-top: 12px; padding: 8px 12px;
    border-radius: 8px;
    background: rgba(74,222,128,0.08);
    border: 1px solid rgba(74,222,128,0.18);
    animation: atgResolveIn 0.28s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes atgResolveIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .atg-resolve-check { font-size: 12px; color: rgba(74,222,128,0.9); }
  .atg-resolve-text {
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-size: 12.5px; font-weight: 400; color: rgba(74,222,128,0.82); letter-spacing: -0.005em;
  }
`
