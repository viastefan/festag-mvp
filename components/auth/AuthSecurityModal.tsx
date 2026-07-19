'use client'

import { useEffect } from 'react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagPopupPresence } from '@/hooks/useFestagPopupPresence'

type Props = {
  open: boolean
  onClose: () => void
  privacyHref?: string
}

/**
 * Security explanation for auth footers (SSL badge).
 * Desktop: centered modal. Mobile (≤768px): Festag bottom sheet with drag handle.
 * Closes via bottom CTA „Verstanden und weiter“ (no X).
 */
export default function AuthSecurityModal({ open, onClose, privacyHref = '/datenschutz' }: Props) {
  const { mounted, visible } = useFestagPopupPresence(open)

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

  if (!mounted) return null

  return (
    <div
      className={`auth-sec-backdrop${visible ? ' is-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-security-title"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <style>{SECURITY_CSS}</style>
      <div className="auth-sec-panel">
        <FestagPopupDragHandle onDismiss={onClose} />
        <div className="auth-sec-inner">
          <h2 id="auth-security-title" className="auth-sec-title">
            Ihre Verbindung zu Festag ist Ende-zu-Ende und per TLS abgesichert.
          </h2>
          <div className="auth-sec-body">
            <p>
              Die Verbindung zu Festag wird mit TLS (Transport Layer Security) geschützt.
              Anmeldedaten und Sitzungsinformationen werden verschlüsselt übertragen und nicht
              im Klartext über das Netz gesendet.
            </p>
            <p>
              Der Zugriff auf Ihr Konto erfolgt über geschützte Sitzungen (Cookies bzw. Tokens).
              Diese sind an Ihr Konto gebunden und sollen den Zugriff durch Dritte erschweren.
            </p>
            <p>
              Über den Transport hinaus gelten die Regeln der Datenschutzerklärung —
              insbesondere zu Speicherung, Zweckbindung und Ihren Rechten.
            </p>
            <p>
              Ausführliche Angaben finden Sie in der{' '}
              <a href={privacyHref}>Datenschutzerklärung</a>.
            </p>
          </div>
          <button
            className="auth-sec-cta"
            type="button"
            onClick={onClose}
          >
            Verstanden und weiter
          </button>
        </div>
      </div>
    </div>
  )
}

const SECURITY_CSS = `
  .auth-sec-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(15, 23, 42, 0.52);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    opacity: 0;
    transition: opacity var(--festag-sheet-ms, 240ms) ease;
  }
  .auth-sec-backdrop.is-visible {
    opacity: 1;
  }
  .auth-sec-panel {
    width: min(100%, 520px);
    border-radius: 22px;
    border: 1px solid rgba(210, 210, 215, 0.8);
    background: #ffffff;
    box-shadow: 0 20px 48px rgba(15, 23, 42, 0.16);
    padding: 30px 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 0;
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
  .auth-sec-backdrop.is-visible .auth-sec-panel {
    opacity: 1;
    transform: none;
  }
  .auth-sec-panel .festag-popup-drag-area {
    display: none;
  }
  .auth-sec-inner {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .auth-sec-title,
  #auth-security-title {
    margin: 0 0 18px;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 26px;
    font-weight: 400;
    line-height: 1.28;
    letter-spacing: -0.022em;
    color: #1e1e20;
  }
  .auth-sec-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .auth-sec-body p {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 15.5px;
    font-weight: 400;
    line-height: 1.65;
    letter-spacing: 0.004em;
    color: #5c5c62;
  }
  .auth-sec-body a {
    color: #1e1e20;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .auth-sec-cta {
    margin-top: 24px;
    width: 100%;
    height: 45px;
    border-radius: 999px;
    border: 0.7px solid var(--festag-btn-dark-border, #e7ebf0);
    background: var(--festag-btn-dark-bg, #ffffff);
    color: var(--festag-btn-dark-fg, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow,
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 1px 3px rgba(15, 23, 42, 0.03));
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 15px;
    font-weight:400;
    letter-spacing: -0.01em;
    cursor: pointer;
    padding: 0 18px;
    transition: background .15s, border-color .15s, color .15s, transform .08s ease, box-shadow .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .auth-sec-cta:hover {
    background: var(--festag-btn-dark-bg-hover, #f7f8fb);
    border-color: var(--festag-btn-dark-border-hover, #dce1ea);
    color: var(--festag-btn-dark-fg-hover, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow-hover,
      0 1px 2px rgba(15, 23, 42, 0.05),
      0 1px 3px rgba(15, 23, 42, 0.04));
  }
  .auth-sec-cta:active {
    transform: scale(0.985);
  }

  @media (max-width: 768px) {
    .auth-sec-backdrop {
      align-items: flex-end;
      justify-content: flex-end;
      padding: 0;
    }
    .auth-sec-panel {
      width: 100%;
      max-width: 100%;
      max-height: min(92dvh, 820px);
      border-radius: 20px 20px 0 0;
      border-bottom: none;
      padding: 0 24px calc(env(safe-area-inset-bottom, 0px) + 18px);
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.12),
        0 -24px 56px -20px rgba(15, 23, 42, 0.28);
      opacity: 0;
      transform: translate3d(0, 100%, 0);
      transition:
        opacity var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease, cubic-bezier(.16,1,.3,1)),
        transform var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease, cubic-bezier(.16,1,.3,1));
    }
    .auth-sec-backdrop.is-visible .auth-sec-panel {
      opacity: 1;
      transform: none;
    }
    .auth-sec-backdrop:not(.is-visible) .auth-sec-panel {
      transition:
        opacity var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease-out, cubic-bezier(.32,.72,0,1)),
        transform var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease-out, cubic-bezier(.32,.72,0,1));
    }
    .auth-sec-panel .festag-popup-drag-area {
      display: flex;
      width: 100%;
      padding: 12px 0 8px;
      justify-content: center;
      flex-shrink: 0;
      touch-action: none;
      cursor: grab;
    }
    .auth-sec-panel .festag-popup-drag-area:active {
      cursor: grabbing;
    }
    .auth-sec-panel .festag-popup-drag-handle {
      width: 40px;
      height: 4px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.12);
      opacity: 1;
    }
    .auth-sec-title,
    #auth-security-title {
      margin: 4px 0 16px;
      font-size: 28px;
      line-height: 1.22;
    }
    .auth-sec-body {
      gap: 16px;
    }
    .auth-sec-body p {
      font-size: 16px;
      line-height: 1.62;
    }
    .auth-sec-cta {
      margin-top: 28px;
      height: 50px;
      font-size: 16px;
      flex-shrink: 0;
    }
  }

  [data-theme="dark"] .auth-sec-backdrop,
  .al-root[data-theme="dark"] .auth-sec-backdrop,
  .dl-root[data-theme="dark"] .auth-sec-backdrop {
    background: rgba(0, 0, 0, 0.68);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  [data-theme="dark"] .auth-sec-panel,
  .al-root[data-theme="dark"] .auth-sec-panel,
  .dl-root[data-theme="dark"] .auth-sec-panel {
    background: var(--festag-black-popup, #121214);
    border-color: transparent;
    box-shadow: 0 20px 48px rgba(0,0,0,0.55);
  }
  /* ID selector needed — light rule sets #auth-security-title to #1e1e20. */
  [data-theme="dark"] .auth-sec-title,
  [data-theme="dark"] #auth-security-title,
  .al-root[data-theme="dark"] .auth-sec-title,
  .al-root[data-theme="dark"] #auth-security-title,
  .dl-root[data-theme="dark"] .auth-sec-title,
  .dl-root[data-theme="dark"] #auth-security-title,
  [data-theme="classic-dark"] .auth-sec-title,
  [data-theme="classic-dark"] #auth-security-title {
    color: #f5f5f7 !important;
  }
  [data-theme="dark"] .auth-sec-body p,
  .al-root[data-theme="dark"] .auth-sec-body p,
  .dl-root[data-theme="dark"] .auth-sec-body p {
    color: rgba(245,245,247,0.68);
  }
  [data-theme="dark"] .auth-sec-body a,
  .al-root[data-theme="dark"] .auth-sec-body a,
  .dl-root[data-theme="dark"] .auth-sec-body a {
    color: #f5f5f7;
  }
  [data-theme="dark"] .auth-sec-cta,
  .al-root[data-theme="dark"] .auth-sec-cta,
  .dl-root[data-theme="dark"] .auth-sec-cta {
    background: var(--festag-btn-dark-bg, rgba(255,255,255,0.06));
    color: var(--festag-btn-dark-fg, rgba(245,245,247,0.55));
    border: 0.7px solid var(--festag-btn-dark-border, transparent);
    box-shadow: var(--festag-btn-dark-shadow, none);
  }
  [data-theme="dark"] .auth-sec-cta:hover,
  [data-theme="dark"] .auth-sec-cta:active,
  [data-theme="dark"] .auth-sec-cta:focus-visible,
  .al-root[data-theme="dark"] .auth-sec-cta:hover,
  .al-root[data-theme="dark"] .auth-sec-cta:active,
  .al-root[data-theme="dark"] .auth-sec-cta:focus-visible,
  .dl-root[data-theme="dark"] .auth-sec-cta:hover,
  .dl-root[data-theme="dark"] .auth-sec-cta:active,
  .dl-root[data-theme="dark"] .auth-sec-cta:focus-visible {
    background: var(--festag-btn-dark-bg-hover, rgba(255,255,255,0.10));
    color: var(--festag-btn-dark-fg-hover, #f5f5f7);
    border-color: var(--festag-btn-dark-border-hover, transparent);
    box-shadow: var(--festag-btn-dark-shadow-hover, none);
  }
  @media (max-width: 768px) {
    [data-theme="dark"] .auth-sec-panel,
    .al-root[data-theme="dark"] .auth-sec-panel,
    .dl-root[data-theme="dark"] .auth-sec-panel {
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.28),
        0 -24px 56px -20px rgba(0, 0, 0, 0.55);
    }
    [data-theme="dark"] .auth-sec-panel .festag-popup-drag-handle,
    .al-root[data-theme="dark"] .auth-sec-panel .festag-popup-drag-handle,
    .dl-root[data-theme="dark"] .auth-sec-panel .festag-popup-drag-handle {
      background: rgba(255, 255, 255, 0.22);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .auth-sec-backdrop,
    .auth-sec-panel {
      transition: none !important;
    }
  }
`
