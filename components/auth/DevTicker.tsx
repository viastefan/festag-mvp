'use client'

/*
 * DevTicker — cinematic bottom-of-screen message feed, dev login desktop only.
 *
 * Messages rise from below the footer, travel upward through a
 * mask-clipped window, and fade out at the top. Pure CSS animation —
 * zero JS timers after mount.
 */

/* ─── Message pool ─────────────────────────────────────────────────────── */

type Msg = { from: string; to: string | null; text: string }

const POOL: Msg[] = [
  { from: 'Tagro',  to: 'CEO',  text: 'API-Integration mit Stripe verschoben — KW 32.' },
  { from: 'Tagro',  to: 'CTO',  text: 'Deployment auf Staging erfolgreich — 14:32 Uhr.' },
  { from: 'Tagro',  to: null,   text: '2 Entscheidungen warten auf deine Freigabe.' },
  { from: 'System', to: null,   text: 'Sprint 12 abgeschlossen — Velocity +8 %.' },
  { from: 'Tagro',  to: 'CEO',  text: 'Festag Launch on track — Delivery KW 30.' },
  { from: 'Tagro',  to: 'API',  text: 'Leqra-Anbindung erfolgreich aktiviert.' },
  { from: 'Tagro',  to: null,   text: 'Q3: 94 % Delivery Rate — 12 Projekte.' },
  { from: 'Tagro',  to: 'CTO',  text: 'Tech-Debt Review für Q3 — geplant KW 29.' },
  { from: 'System', to: null,   text: 'Andreas: Design System Übergabe — 40 h.' },
  { from: 'Tagro',  to: 'CEO',  text: 'Neues Projekt "Leqra API v2" erstellt.' },
  { from: 'Tagro',  to: null,   text: 'Blocker: Staging-Zugänge fehlen seit Dienstag.' },
  { from: 'System', to: null,   text: 'Woche 28 — 3 Projekte on track, 1 Warnsignal.' },
  { from: 'Tagro',  to: 'CEO',  text: 'Invoice-Modul: Stripe-Keys abgelaufen.' },
  { from: 'Tagro',  to: null,   text: 'Performance-Report verfügbar — 4,2 s LCP.' },
  { from: 'System', to: null,   text: 'Commit "fix: auth-flow" merged — main.' },
  { from: 'Tagro',  to: 'CEO',  text: 'Entscheidung "Deployment v1.2" ausstehend.' },
]

/*
 * Animation constants.
 * CYCLE_MS: total time one message takes from below-fold to above-fold.
 * GAP_MS:   delay between consecutive messages entering the screen.
 */
const CYCLE_MS = 16000
const GAP_MS   = CYCLE_MS / POOL.length   // ≈ 1000 ms between messages

export default function DevTicker() {
  return (
    <>
      <style>{CSS}</style>
      <div className="dtk-root" aria-hidden="true">
        <div className="dtk-stage">
          {POOL.map((msg, i) => (
            <div
              key={i}
              className="dtk-row"
              style={{ animationDelay: `-${(POOL.length - 1 - i) * GAP_MS}ms` }}
            >
              {/* Sender badge */}
              <span className="dtk-from">{msg.from}</span>
              {msg.to && (
                <>
                  <span className="dtk-arrow">→</span>
                  <span className="dtk-to">{msg.to}</span>
                </>
              )}
              <span className="dtk-sep" aria-hidden="true">/</span>
              {/* Message text */}
              <span className="dtk-text">{msg.text}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/* ─── CSS ────────────────────────────────────────────────────────────────── */

const CSS = `
  /* Desktop only */
  @media (max-width: 1080px) { .dtk-root { display: none !important; } }

  /* ── Container ───────────────────────────────────────────────────────── */
  .dtk-root {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 54vh;
    z-index: 3;                /* below the footer (footer gets z-index:10 below) */
    pointer-events: none;
    overflow: hidden;

    /*
     * Mask window: transparent at very bottom (footer stays readable),
     * opaque in the message zone (15 %–75 %), transparent again at top.
     */
    -webkit-mask-image: linear-gradient(
      to top,
      transparent   0%,
      transparent   6%,
      rgba(0,0,0,1) 20%,
      rgba(0,0,0,1) 72%,
      transparent   92%
    );
    mask-image: linear-gradient(
      to top,
      transparent   0%,
      transparent   6%,
      rgba(0,0,0,1) 20%,
      rgba(0,0,0,1) 72%,
      transparent   92%
    );
  }

  /* ── Stage ───────────────────────────────────────────────────────────── */
  .dtk-stage {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    padding-bottom: 48px;       /* space for the footer */
  }

  /* ── Message row ─────────────────────────────────────────────────────── */
  .dtk-row {
    position: absolute;
    bottom: 48px;               /* start just above footer */
    left: 0;
    right: 0;
    padding: 0 clamp(48px, 6vw, 100px);

    display: flex;
    align-items: baseline;
    gap: 9px;
    flex-wrap: nowrap;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.01em;
    line-height: 1.4;

    /* Continuous rise animation */
    animation: dtkRise ${CYCLE_MS}ms linear infinite;
    will-change: transform, opacity;
  }

  @keyframes dtkRise {
    0%   { transform: translateY(0);      opacity: 0; }
    4%   { opacity: 1; }
    88%  { opacity: 1; }
    100% { transform: translateY(-54vh);  opacity: 0; }
  }

  /* ── Text tokens — dark mode (default OLED auth canvas) ─────────────── */
  .dtk-from {
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.04em;
    background: linear-gradient(90deg, #a78bfa, #60a5fa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    flex-shrink: 0;
  }
  .dtk-arrow {
    font-size: 11px;
    font-weight: 300;
    flex-shrink: 0;
  }
  .dtk-to {
    font-size: 11px;
    font-weight: 400;
    flex-shrink: 0;
  }
  .dtk-sep {
    font-size: 11px;
    flex-shrink: 0;
  }
  .dtk-text {
    font-size: 13px;
    font-weight: 400;
    letter-spacing: -0.005em;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Dark mode colors */
  html[data-theme="dark"] .dtk-arrow,
  html[data-theme="classic-dark"] .dtk-arrow   { color: rgba(245,245,247,0.20); }
  html[data-theme="dark"] .dtk-to,
  html[data-theme="classic-dark"] .dtk-to       { color: rgba(245,245,247,0.38); }
  html[data-theme="dark"] .dtk-sep,
  html[data-theme="classic-dark"] .dtk-sep      { color: rgba(245,245,247,0.15); }
  html[data-theme="dark"] .dtk-text,
  html[data-theme="classic-dark"] .dtk-text     { color: rgba(245,245,247,0.55); }

  /* Light mode colors */
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .dtk-arrow { color: rgba(30,30,32,0.25); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .dtk-to    { color: rgba(30,30,32,0.42); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .dtk-sep   { color: rgba(30,30,32,0.18); }
  html:not([data-theme="dark"]):not([data-theme="classic-dark"]) .dtk-text  { color: rgba(30,30,32,0.60); }

  /* ── Footer z-index lift — keeps footer readable above the ticker ────── */
  .dl-root .dl-footer-meta {
    position: relative;
    z-index: 10;
  }
`
