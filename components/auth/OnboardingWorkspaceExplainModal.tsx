'use client'

import { useEffect } from 'react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagOutsideClickHint } from '@/hooks/useFestagOutsideClickHint'
import { useFestagPopupPresence } from '@/hooks/useFestagPopupPresence'

export type OnboardingTeamFlag = 'alone' | 'existing_team' | 'clients_partners' | 'festag_support'

type ExplainCopy = {
  title: string
  modeLabel: string
  body: string[]
  bullets: string[]
}

const EXPLAIN: Record<OnboardingTeamFlag, ExplainCopy> = {
  alone: {
    title: 'Alleine starten',
    modeLabel: 'Du steuerst den Workspace allein — ohne festes Team und ohne externe Stakeholder im selben Raum.',
    body: [
      'Du steuerst den Workspace selbst — ohne festes Entwicklerteam und ohne externe Stakeholder im selben Raum.',
      'Festag bleibt deine Klarheitsschicht: Status, Risiken und nächste Schritte werden für dich und spätere Mitwirkende aufbereitet, ohne dass du ein klassisches Projekttool pflegen musst.',
    ],
    bullets: [
      'Du bist Owner und Entscheidungsträger',
      'Berichte und Briefings für dich persönlich',
      'Jederzeit später Team oder Kunden einladen',
    ],
  },
  existing_team: {
    title: 'Mit Entwicklerteam',
    modeLabel: 'Dein Team arbeitet im Execution Panel — du siehst Fortschritt und Blocker, nicht den Ticket-Lärm.',
    body: [
      'Dein bestehendes Entwicklerteam arbeitet weiter in den gewohnten Tools. Festag sitzt darüber und übersetzt Roharbeit in ruhige, prüfbare Statusklarheit.',
      'Im Execution Panel sehen Entwickler Aufgaben und Prioritäten — du und Führung sehen Fortschritt, Blocker und Entscheidungen, ohne den Chat-Lärm der Umsetzung.',
    ],
    bullets: [
      'Dev-Zugang und Aufgaben im Execution Panel',
      'Status für dich, nicht die Roh-Tickets',
      'Einladungen an dein Team im nächsten Schritt',
    ],
  },
  clients_partners: {
    title: 'Kunden und Beteiligte',
    modeLabel: 'Agency-Modus: geprüfte Statusberichte für Kunden und Partner — ohne Roh-Arbeit.',
    body: [
      'Mehrere Rollen teilen sich denselben Lieferkontext: Agentur oder Delivery-Team liefert, Kunden und Partner sehen geprüfte Berichte — keine Roh-Arbeit.',
      'Dieser Modus richtet den Workspace auf professionelle Client-Erlebnisse aus und ist die Basis für später auch white-labelbare Portale unter eurer Marke.',
    ],
    bullets: [
      'Ruhige Client-Sicht statt Ticket-Flut',
      'Freigaben, Status und nächste Schritte',
      'Einladungen an Beteiligte im nächsten Schritt',
    ],
  },
  festag_support: {
    title: 'Unterstützung durch Festag',
    modeLabel: 'Delivery-Modus: Festag hilft beim Aufbau und der Ausführung — du behältst Freigaben.',
    body: [
      'Festag übernimmt den operativen Aufbau mit geprüften Entwicklern und Delivery-Prozessen. Du bleibst Owner — musst aber nicht selbst Team und Tooling orchestrieren.',
      'Der Delivery-Modus fokussiert auf Berichte, Briefings und kontrollierte Ausführung: Festag macht aus Signalen lieferfertige Klarheit, während unser Team die Umsetzung absichert.',
    ],
    bullets: [
      'Festag meldet sich innerhalb von 24 Stunden',
      'Geprüfte Entwickler und Delivery-Setup',
      'Du behältst Überblick und Freigaben',
    ],
  },
}

/** Soft SaaS nodes: gray fills, one primary accent — no strokes. */
function ModeDiagram({ id }: { id: OnboardingTeamFlag }) {
  const link = 'var(--onb-wx-link)'
  const soft = 'var(--onb-wx-node)'
  const softFg = 'var(--onb-wx-node-fg)'
  const softMuted = 'var(--onb-wx-node-muted)'
  const primary = 'var(--onb-wx-primary)'
  const primaryFg = 'var(--onb-wx-primary-fg)'
  const primaryMuted = 'var(--onb-wx-primary-muted)'

  if (id === 'alone') {
    return (
      <svg className="onb-wx-diagram" viewBox="0 0 320 120" aria-hidden>
        <rect x="52" y="28" width="100" height="64" rx="18" fill={soft} />
        <circle cx="86" cy="50" r="11" fill={softMuted} />
        <path d="M72 72c3-8 8-11 14-11s11 3 14 11" fill={softMuted} />
        <text x="118" y="56" textAnchor="start" className="onb-wx-diagram-label" fill={softFg}>Du</text>
        <path d="M160 60h28" stroke={link} strokeWidth="2" strokeLinecap="round" />
        <circle cx="168" cy="60" r="2.5" fill={link} />
        <circle cx="180" cy="60" r="2.5" fill={link} />
        <rect x="196" y="32" width="88" height="56" rx="18" fill={primary} />
        <text x="240" y="58" textAnchor="middle" className="onb-wx-diagram-label" fill={primaryFg}>Festag</text>
        <text x="240" y="74" textAnchor="middle" className="onb-wx-diagram-sub" fill={primaryMuted}>Klarheit</text>
      </svg>
    )
  }
  if (id === 'existing_team') {
    return (
      <svg className="onb-wx-diagram" viewBox="0 0 320 120" aria-hidden>
        <rect x="12" y="32" width="72" height="56" rx="16" fill={soft} />
        <circle cx="36" cy="52" r="9" fill={softMuted} />
        <path d="M25 70c2.5-6 7-9 11-9s8.5 3 11 9" fill={softMuted} />
        <text x="62" y="56" textAnchor="middle" className="onb-wx-diagram-label" fill={softFg}>Du</text>
        <path d="M92 60h22" stroke={link} strokeWidth="2" strokeLinecap="round" />
        <rect x="120" y="24" width="92" height="72" rx="18" fill={primary} />
        <text x="166" y="54" textAnchor="middle" className="onb-wx-diagram-label" fill={primaryFg}>Festag</text>
        <text x="166" y="72" textAnchor="middle" className="onb-wx-diagram-sub" fill={primaryMuted}>Portal + Panel</text>
        <path d="M220 60h22" stroke={link} strokeWidth="2" strokeLinecap="round" />
        <rect x="248" y="28" width="60" height="64" rx="16" fill={soft} />
        <circle cx="266" cy="48" r="8" fill={softMuted} />
        <circle cx="286" cy="48" r="8" fill={softMuted} />
        <circle cx="276" cy="62" r="8" fill={softMuted} />
        <text x="278" y="84" textAnchor="middle" className="onb-wx-diagram-sub" fill={softFg}>Devs</text>
      </svg>
    )
  }
  if (id === 'clients_partners') {
    return (
      <svg className="onb-wx-diagram" viewBox="0 0 320 120" aria-hidden>
        <rect x="10" y="30" width="78" height="60" rx="16" fill={soft} />
        <text x="49" y="56" textAnchor="middle" className="onb-wx-diagram-label" fill={softFg}>Team</text>
        <text x="49" y="72" textAnchor="middle" className="onb-wx-diagram-sub" fill={softMuted}>liefert</text>
        <path d="M96 60h22" stroke={link} strokeWidth="2" strokeLinecap="round" />
        <rect x="124" y="22" width="80" height="76" rx="18" fill={primary} />
        <text x="164" y="56" textAnchor="middle" className="onb-wx-diagram-label" fill={primaryFg}>Festag</text>
        <text x="164" y="74" textAnchor="middle" className="onb-wx-diagram-sub" fill={primaryMuted}>Agency</text>
        <path d="M212 48h18" stroke={link} strokeWidth="2" strokeLinecap="round" />
        <path d="M212 72h18" stroke={link} strokeWidth="2" strokeLinecap="round" />
        <path d="M212 48v24" stroke={link} strokeWidth="2" strokeLinecap="round" />
        <rect x="236" y="18" width="74" height="38" rx="14" fill={soft} />
        <text x="273" y="42" textAnchor="middle" className="onb-wx-diagram-label" fill={softFg}>Kunde</text>
        <rect x="236" y="64" width="74" height="38" rx="14" fill={soft} />
        <text x="273" y="88" textAnchor="middle" className="onb-wx-diagram-label" fill={softFg}>Partner</text>
      </svg>
    )
  }
  return (
    <svg className="onb-wx-diagram" viewBox="0 0 320 120" aria-hidden>
      <rect x="12" y="32" width="72" height="56" rx="16" fill={soft} />
      <circle cx="36" cy="52" r="9" fill={softMuted} />
      <path d="M25 70c2.5-6 7-9 11-9s8.5 3 11 9" fill={softMuted} />
      <text x="62" y="56" textAnchor="middle" className="onb-wx-diagram-label" fill={softFg}>Du</text>
      <path d="M92 60h22" stroke={link} strokeWidth="2" strokeLinecap="round" />
      <rect x="120" y="24" width="92" height="72" rx="18" fill={primary} />
      <text x="166" y="54" textAnchor="middle" className="onb-wx-diagram-label" fill={primaryFg}>Festag</text>
      <text x="166" y="72" textAnchor="middle" className="onb-wx-diagram-sub" fill={primaryMuted}>Delivery</text>
      <path d="M220 60h22" stroke={link} strokeWidth="2" strokeLinecap="round" />
      <rect x="248" y="34" width="60" height="52" rx="16" fill={soft} />
      <text x="278" y="64" textAnchor="middle" className="onb-wx-diagram-label" fill={softFg}>Support</text>
    </svg>
  )
}

type Props = {
  open: boolean
  optionId: OnboardingTeamFlag | null
  onClose: () => void
}

/**
 * Explains onboarding team / workspace mode choices.
 * Same motion + surface language as AuthSecurityModal.
 */
export default function OnboardingWorkspaceExplainModal({ open, optionId, onClose }: Props) {
  const { mounted, visible } = useFestagPopupPresence(open && !!optionId)
  const { showHint, onOverlayPointer, reset } = useFestagOutsideClickHint(open && !!optionId)
  const copy = optionId ? EXPLAIN[optionId] : null

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  useEffect(() => {
    if (!mounted) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [mounted, onClose])

  if (!mounted || !copy || !optionId) return null

  return (
    <div
      className={`onb-wx-backdrop${visible ? ' is-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-wx-title"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onMouseMove={e => {
        onOverlayPointer(e.target === e.currentTarget)
      }}
      onMouseLeave={() => onOverlayPointer(false)}
    >
      <style>{EXPLAIN_CSS}</style>
      {showHint ? (
        <p className="onb-wx-outside-hint" aria-hidden="true">
          Außerhalb klicken zum Schließen.
        </p>
      ) : null}
      <div className="onb-wx-panel" onClick={e => e.stopPropagation()}>
        <FestagPopupDragHandle onDismiss={onClose} visible={visible} />
        <div className="onb-wx-inner">
          <h2 id="onb-wx-title" className="onb-wx-title">{copy.title}</h2>
          <div className="onb-wx-visual" aria-hidden>
            <ModeDiagram id={optionId} />
          </div>
          <div className="onb-wx-body">
            <p>{copy.modeLabel}</p>
            {copy.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <ul className="onb-wx-bullets">
              {copy.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <button className="onb-wx-cta" type="button" onClick={onClose}>
            Verstanden und weiter
          </button>
        </div>
      </div>
    </div>
  )
}

const EXPLAIN_CSS = `
  .onb-wx-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(15, 23, 42, 0.52);
    opacity: 0;
    transition: opacity var(--festag-sheet-ms, 240ms) ease;
  }
  .onb-wx-backdrop.is-visible { opacity: 1; }
  .onb-wx-outside-hint {
    position: absolute;
    left: 50%;
    bottom: max(20px, env(safe-area-inset-bottom));
    transform: translateX(-50%);
    margin: 0;
    z-index: 1;
    pointer-events: none;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.02em;
    color: rgba(255, 255, 255, 0.55);
    white-space: nowrap;
  }
  .onb-wx-panel {
    width: min(100%, 520px);
    max-height: min(88dvh, 720px);
    border-radius: 22px;
    border: 0;
    background: #ffffff;
    box-shadow: 0 20px 48px rgba(15, 23, 42, 0.16);
    padding: 28px 28px 24px;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transform: translate3d(0, 10px, 0) scale(0.985);
    transition:
      opacity var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease, cubic-bezier(.16,1,.3,1)),
      transform var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease, cubic-bezier(.16,1,.3,1));
    will-change: transform, opacity;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .onb-wx-backdrop.is-visible .onb-wx-panel {
    opacity: 1;
    transform: none;
  }
  .onb-wx-panel .festag-popup-drag-area { display: none; }
  .onb-wx-inner {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .onb-wx-title {
    margin: 0 0 16px;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 26px;
    font-weight: 400;
    line-height: 1.28;
    letter-spacing: -0.022em;
    color: #1e1e20;
  }
  .onb-wx-visual {
    margin: 0 0 18px;
    padding: 18px 14px;
    border-radius: 18px;
    background: #F0F1F4;
    color: #1e1e20;
    --onb-wx-node: #ffffff;
    --onb-wx-node-fg: #1e1e20;
    --onb-wx-node-muted: #B8BCC6;
    --onb-wx-primary: #5B647D;
    --onb-wx-primary-fg: #ffffff;
    --onb-wx-primary-muted: rgba(255, 255, 255, 0.72);
    --onb-wx-link: #C5C9D2;
  }
  .onb-wx-diagram {
    display: block;
    width: 100%;
    height: auto;
    max-height: 128px;
  }
  .onb-wx-diagram-label {
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 12.5px;
    font-weight: 400;
    letter-spacing: -0.01em;
  }
  .onb-wx-diagram-sub {
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 10.5px;
    font-weight: 400;
    letter-spacing: 0.01em;
  }
  .onb-wx-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .onb-wx-body p,
  .onb-wx-mode-inline {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 15.5px;
    font-weight: 400;
    line-height: 1.65;
    letter-spacing: 0.004em;
    color: #8891a0;
  }
  .onb-wx-mode-inline {
    color: #1e1e20;
  }
  .onb-wx-bullets {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .onb-wx-bullets li {
    position: relative;
    padding-left: 16px;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 14.5px;
    line-height: 1.5;
    color: #1e1e20;
  }
  .onb-wx-bullets li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55em;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #8C94AA;
  }
  .onb-wx-cta {
    margin-top: 22px;
    width: 100%;
    height: 42px;
    border-radius: 999px;
    border: 1px solid var(--festag-btn-dark-border, #e5e5e6);
    outline: none;
    background: var(--festag-btn-dark-bg, #ffffff);
    color: var(--festag-btn-dark-fg, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.05));
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 15px;
    font-weight: 400;
    letter-spacing: -0.01em;
    cursor: pointer;
    padding: 0 18px;
    transition: background .15s, border-color .15s, color .15s, transform .08s ease, box-shadow .15s;
    -webkit-appearance: none;
    appearance: none;
    -webkit-tap-highlight-color: transparent;
  }
  .onb-wx-cta:hover {
    background: var(--festag-btn-dark-bg-hover, #fafafa);
    border-color: var(--festag-btn-dark-border-hover, rgba(30, 30, 32, 0.08));
    box-shadow: var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.04));
  }
  .onb-wx-cta:active {
    transform: scale(0.985);
    background: var(--festag-btn-dark-bg-active, #f5f5f6);
    border-color: var(--festag-btn-dark-border-active, #d8d8da);
    box-shadow: var(--festag-btn-dark-shadow-active, none);
  }

  @media (max-width: 768px) {
    .onb-wx-backdrop {
      align-items: flex-end;
      justify-content: flex-end;
      padding: 0;
    }
    .onb-wx-panel {
      width: 100%;
      max-width: 100%;
      max-height: min(92dvh, 820px);
      border-radius: var(--festag-sheet-radius, 22px) var(--festag-sheet-radius, 22px) 0 0;
      padding: 0 var(--festag-sheet-gutter, 24px) calc(env(safe-area-inset-bottom, 0px) + 18px);
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.09),
        0 -24px 56px -20px rgba(15, 23, 42, 0.28);
      opacity: 0;
      transform: translate3d(0, 100%, 0);
    }
    .onb-wx-backdrop.is-visible .onb-wx-panel {
      opacity: 1;
      transform: none;
    }
    .onb-wx-panel .festag-popup-drag-area { display: flex; }
    .onb-wx-panel .festag-popup-drag-handle {
      background: rgba(0, 0, 0, 0.09);
      opacity: 1;
    }
    .onb-wx-title {
      margin: 4px 0 14px;
      font-size: 23px;
      line-height: 1.22;
    }
    .onb-wx-cta {
      margin-top: 24px;
      height: 43px;
      min-height: 43px;
      font-size: 15px;
      letter-spacing: -0.015em;
      flex-shrink: 0;
    }
  }

  [data-theme="dark"] .onb-wx-backdrop,
  [data-theme="classic-dark"] .onb-wx-backdrop,
  .al-root[data-theme="dark"] .onb-wx-backdrop {
    background: var(--modal-backdrop, rgba(0, 0, 0, 0.58));
  }
  [data-theme="dark"] .onb-wx-panel,
  [data-theme="classic-dark"] .onb-wx-panel,
  .al-root[data-theme="dark"] .onb-wx-panel {
    background: var(--festag-black-popup, #121214);
    box-shadow: 0 20px 48px rgba(0,0,0,0.55);
  }
  [data-theme="dark"] .onb-wx-title,
  .al-root[data-theme="dark"] .onb-wx-title {
    color: #f5f5f7;
  }
  [data-theme="dark"] .onb-wx-visual,
  .al-root[data-theme="dark"] .onb-wx-visual {
    background: rgba(186,194,210,0.06);
    color: #f5f5f7;
    --onb-wx-node: rgba(255, 255, 255, 0.08);
    --onb-wx-node-fg: rgba(245, 245, 247, 0.92);
    --onb-wx-node-muted: rgba(186, 194, 210, 0.42);
    --onb-wx-primary: #8C94AA;
    --onb-wx-primary-fg: #0c0c0e;
    --onb-wx-primary-muted: rgba(12, 12, 14, 0.62);
    --onb-wx-link: rgba(186, 194, 210, 0.28);
  }
  [data-theme="dark"] .onb-wx-body p,
  [data-theme="dark"] .onb-wx-mode-inline,
  .al-root[data-theme="dark"] .onb-wx-body p,
  .al-root[data-theme="dark"] .onb-wx-mode-inline {
    color: rgba(245, 245, 247, 0.55);
  }
  [data-theme="dark"] .onb-wx-mode-inline,
  .al-root[data-theme="dark"] .onb-wx-mode-inline {
    color: #f5f5f7;
  }
  [data-theme="dark"] .onb-wx-bullets li,
  .al-root[data-theme="dark"] .onb-wx-bullets li {
    color: #f5f5f7;
  }
  [data-theme="dark"] .onb-wx-bullets li::before,
  .al-root[data-theme="dark"] .onb-wx-bullets li::before {
    background: rgba(186,194,210,0.55);
  }
  [data-theme="dark"] .onb-wx-cta,
  .al-root[data-theme="dark"] .onb-wx-cta {
    background: var(--festag-btn-dark-bg, rgba(186,194,210,0.06));
    color: var(--festag-btn-dark-fg, rgba(245,245,247,0.88));
    border: 1px solid var(--festag-btn-dark-border, rgba(255,255,255,0.06));
    box-shadow: var(--festag-btn-dark-shadow, none);
  }
  [data-theme="dark"] .onb-wx-cta:hover,
  .al-root[data-theme="dark"] .onb-wx-cta:hover {
    background: var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.09));
    border-color: var(--festag-btn-dark-border-hover, rgba(255,255,255,0.09));
    box-shadow: var(--festag-btn-dark-shadow-hover, none);
  }
  [data-theme="dark"] .onb-wx-panel .festag-popup-drag-handle,
  .al-root[data-theme="dark"] .onb-wx-panel .festag-popup-drag-handle {
    background: rgba(255, 255, 255, 0.22);
  }
`
