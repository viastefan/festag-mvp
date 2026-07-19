'use client'

import { useEffect } from 'react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
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
    title: 'Alleine arbeiten',
    modeLabel: 'Dieser Workspace läuft im Modus Team — du steuerst ihn allein.',
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
    modeLabel: 'Dieser Workspace läuft im Modus Team — mit Entwicklern im Execution Panel.',
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
    modeLabel: 'Dieser Workspace läuft im Modus Agency — für klare Stakeholder-Kommunikation.',
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
    modeLabel: 'Dieser Workspace läuft im Modus Delivery — Festag hilft bei Aufbau und Ausführung.',
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

function ModeDiagram({ id }: { id: OnboardingTeamFlag }) {
  const ink = 'currentColor'
  if (id === 'alone') {
    return (
      <svg className="onb-wx-diagram" viewBox="0 0 320 120" aria-hidden>
        <rect x="118" y="28" width="84" height="64" rx="16" fill="none" stroke={ink} strokeWidth="1.5" opacity="0.22" />
        <circle cx="160" cy="52" r="14" fill="none" stroke={ink} strokeWidth="1.6" />
        <path d="M140 78c4-10 12-14 20-14s16 4 20 14" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
        <text x="160" y="108" textAnchor="middle" className="onb-wx-diagram-label">Du</text>
        <path d="M202 60h28" stroke={ink} strokeWidth="1.4" opacity="0.35" strokeLinecap="round" />
        <rect x="234" y="42" width="62" height="36" rx="12" fill="none" stroke={ink} strokeWidth="1.5" />
        <text x="265" y="64" textAnchor="middle" className="onb-wx-diagram-label">Festag</text>
      </svg>
    )
  }
  if (id === 'existing_team') {
    return (
      <svg className="onb-wx-diagram" viewBox="0 0 320 120" aria-hidden>
        <circle cx="48" cy="48" r="12" fill="none" stroke={ink} strokeWidth="1.5" />
        <path d="M32 72c3-8 9-12 16-12s13 4 16 12" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
        <text x="48" y="92" textAnchor="middle" className="onb-wx-diagram-label">Du</text>
        <path d="M72 52h36" stroke={ink} strokeWidth="1.3" opacity="0.35" strokeLinecap="round" />
        <rect x="112" y="28" width="96" height="56" rx="14" fill="none" stroke={ink} strokeWidth="1.5" />
        <text x="160" y="52" textAnchor="middle" className="onb-wx-diagram-label">Festag</text>
        <text x="160" y="68" textAnchor="middle" className="onb-wx-diagram-sub">Portal + Panel</text>
        <path d="M208 52h36" stroke={ink} strokeWidth="1.3" opacity="0.35" strokeLinecap="round" />
        <circle cx="268" cy="36" r="9" fill="none" stroke={ink} strokeWidth="1.4" />
        <circle cx="292" cy="52" r="9" fill="none" stroke={ink} strokeWidth="1.4" />
        <circle cx="268" cy="68" r="9" fill="none" stroke={ink} strokeWidth="1.4" />
        <text x="280" y="98" textAnchor="middle" className="onb-wx-diagram-label">Devs</text>
      </svg>
    )
  }
  if (id === 'clients_partners') {
    return (
      <svg className="onb-wx-diagram" viewBox="0 0 320 120" aria-hidden>
        <rect x="18" y="30" width="78" height="52" rx="14" fill="none" stroke={ink} strokeWidth="1.5" />
        <text x="57" y="52" textAnchor="middle" className="onb-wx-diagram-label">Team</text>
        <text x="57" y="68" textAnchor="middle" className="onb-wx-diagram-sub">liefert</text>
        <path d="M96 56h28" stroke={ink} strokeWidth="1.3" opacity="0.35" strokeLinecap="round" />
        <rect x="124" y="24" width="72" height="64" rx="16" fill="none" stroke={ink} strokeWidth="1.6" />
        <text x="160" y="52" textAnchor="middle" className="onb-wx-diagram-label">Festag</text>
        <text x="160" y="68" textAnchor="middle" className="onb-wx-diagram-sub">Agency</text>
        <path d="M196 56h28" stroke={ink} strokeWidth="1.3" opacity="0.35" strokeLinecap="round" />
        <rect x="224" y="22" width="78" height="36" rx="12" fill="none" stroke={ink} strokeWidth="1.4" />
        <text x="263" y="44" textAnchor="middle" className="onb-wx-diagram-label">Kunde</text>
        <rect x="224" y="66" width="78" height="36" rx="12" fill="none" stroke={ink} strokeWidth="1.4" />
        <text x="263" y="88" textAnchor="middle" className="onb-wx-diagram-label">Partner</text>
      </svg>
    )
  }
  return (
    <svg className="onb-wx-diagram" viewBox="0 0 320 120" aria-hidden>
      <circle cx="56" cy="52" r="14" fill="none" stroke={ink} strokeWidth="1.5" />
      <path d="M36 78c4-10 12-14 20-14s16 4 20 14" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      <text x="56" y="102" textAnchor="middle" className="onb-wx-diagram-label">Du</text>
      <path d="M84 52h40" stroke={ink} strokeWidth="1.3" opacity="0.35" strokeLinecap="round" />
      <rect x="124" y="26" width="72" height="56" rx="16" fill="none" stroke={ink} strokeWidth="1.6" />
      <text x="160" y="50" textAnchor="middle" className="onb-wx-diagram-label">Festag</text>
      <text x="160" y="66" textAnchor="middle" className="onb-wx-diagram-sub">Delivery</text>
      <path d="M196 52h40" stroke={ink} strokeWidth="1.3" opacity="0.35" strokeLinecap="round" />
      <rect x="236" y="34" width="66" height="40" rx="12" fill="none" stroke={ink} strokeWidth="1.5" />
      <text x="269" y="58" textAnchor="middle" className="onb-wx-diagram-label">Support</text>
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
  const copy = optionId ? EXPLAIN[optionId] : null

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
    >
      <style>{EXPLAIN_CSS}</style>
      <div className="onb-wx-panel">
        <FestagPopupDragHandle onDismiss={onClose} />
        <div className="onb-wx-inner">
          <h2 id="onb-wx-title" className="onb-wx-title">{copy.title}</h2>
          <div className="onb-wx-visual" aria-hidden>
            <ModeDiagram id={optionId} />
          </div>
          <div className="onb-wx-body">
            <p className="onb-wx-mode-inline">{copy.modeLabel}</p>
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
    padding: 14px 12px;
    border-radius: 16px;
    background: var(--festag-input-fill, #F5F5F7);
    color: #1e1e20;
  }
  .onb-wx-diagram {
    display: block;
    width: 100%;
    height: auto;
    max-height: 120px;
  }
  .onb-wx-diagram-label {
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 12px;
    fill: currentColor;
    opacity: 0.78;
  }
  .onb-wx-diagram-sub {
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 10px;
    fill: currentColor;
    opacity: 0.45;
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
    color: #5c5c62;
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
    height: 45px;
    border-radius: 999px;
    border: 1px solid var(--festag-btn-dark-border, rgba(15, 23, 42, 0.08));
    outline: none;
    background: var(--festag-btn-dark-bg, #ffffff);
    color: var(--festag-btn-dark-fg, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow, 0 1px 2px rgba(15, 23, 42, 0.06));
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
    background: var(--festag-btn-dark-bg-hover, #f7f8fb);
    border-color: var(--festag-btn-dark-border-hover, rgba(15, 23, 42, 0.10));
    box-shadow: var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(15, 23, 42, 0.08));
  }
  .onb-wx-cta:active {
    transform: scale(0.985);
    background: var(--festag-btn-dark-bg-active, #f0f1f3);
    border-color: var(--festag-btn-dark-border-active, rgba(15, 23, 42, 0.10));
    box-shadow: var(--festag-btn-dark-shadow-active, inset 0 1px 1px rgba(15, 23, 42, 0.08));
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
        0 -1px 2px rgba(0, 0, 0, 0.12),
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
      background: rgba(0, 0, 0, 0.12);
      opacity: 1;
    }
    .onb-wx-title {
      margin: 4px 0 14px;
      font-size: 28px;
      line-height: 1.22;
    }
    .onb-wx-cta {
      margin-top: 24px;
      height: 50px;
      font-size: 16px;
      flex-shrink: 0;
    }
  }

  [data-theme="dark"] .onb-wx-backdrop,
  [data-theme="classic-dark"] .onb-wx-backdrop,
  .al-root[data-theme="dark"] .onb-wx-backdrop {
    background: rgba(0, 0, 0, 0.68);
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
    background: rgba(186,194,210,0.08);
    color: #f5f5f7;
  }
  [data-theme="dark"] .onb-wx-body p,
  [data-theme="dark"] .onb-wx-mode-inline,
  .al-root[data-theme="dark"] .onb-wx-body p,
  .al-root[data-theme="dark"] .onb-wx-mode-inline {
    color: rgba(245,245,247,0.68);
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
    background: var(--festag-btn-dark-bg, rgba(186,194,210,0.16));
    color: var(--festag-btn-dark-fg, rgba(245,245,247,0.88));
    box-shadow: none;
  }
  [data-theme="dark"] .onb-wx-cta:hover,
  .al-root[data-theme="dark"] .onb-wx-cta:hover {
    background: var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.28));
    box-shadow: none;
  }
  [data-theme="dark"] .onb-wx-panel .festag-popup-drag-handle,
  .al-root[data-theme="dark"] .onb-wx-panel .festag-popup-drag-handle {
    background: rgba(255, 255, 255, 0.22);
  }
`
