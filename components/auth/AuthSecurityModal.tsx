'use client'

import { useEffect } from 'react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagOutsideClickHint, isPointerOverOverlay } from '@/hooks/useFestagOutsideClickHint'
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
  const { showHint, onOverlayPointer, reset } = useFestagOutsideClickHint(open, 1)

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

  if (!mounted) return null

  return (
    <div
      className={`auth-sec-backdrop${visible ? ' is-visible' : ''}`}
      data-theme="read"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-security-title"
      onClick={e => {
        if (isPointerOverOverlay(e, '.auth-sec-panel')) onClose()
      }}
      onPointerMove={e => {
        onOverlayPointer(isPointerOverOverlay(e, '.auth-sec-panel'))
      }}
      onPointerLeave={() => onOverlayPointer(false)}
    >
      <style>{SECURITY_CSS}</style>
      {showHint ? (
        <p className="auth-sec-outside-hint" aria-hidden="true">
          Durch Klicken schließen.
        </p>
      ) : null}
      <div className="auth-sec-panel" onClick={e => e.stopPropagation()}>
        <FestagPopupDragHandle onDismiss={onClose} visible={visible} />
        <div className="auth-sec-inner">
          <h2 id="auth-security-title" className="auth-sec-title">
            Ihre Verbindung zu Festag ist{' '}
            <span className="auth-sec-title-muted">Ende-zu-Ende und per TLS abgesichert.</span>
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
              <a href={`${privacyHref}#adaptive-intelligence`}>Datenschutzerklärung</a>
              {' '}(inkl. Adaptive Intelligence).
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
    background: rgba(26, 25, 23, 0.34);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    opacity: 0;
    transition: opacity var(--festag-sheet-ms, 240ms) ease;
  }
  .auth-sec-backdrop.is-visible {
    opacity: 1;
  }
  .auth-sec-outside-hint {
    position: absolute;
    left: 50%;
    top: max(28px, env(safe-area-inset-top));
    transform: translateX(-50%);
    margin: 0;
    z-index: 2;
    pointer-events: none;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.01em;
    color: rgba(255, 255, 255, 0.88);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    white-space: nowrap;
  }
  .auth-sec-panel {
    width: min(100%, 480px);
    border-radius: 6px;
    border: 1px solid rgba(30, 30, 32, 0.08);
    background: #FFFFFF;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 28px rgba(15, 23, 42, 0.08);
    padding: 28px 24px 22px;
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
    letter-spacing: var(--auth-tracking-display, 0.006em);
    color: #1e1e20;
  }
  .auth-sec-title-muted {
    /* Same slate as /Benutzer eingeben — never a second popup gray. */
    color: var(--al-text-muted, #8891a0) !important;
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
    letter-spacing: var(--ls-body, 0.021em);
    color: var(--al-text-muted, #8891a0) !important;
  }
  .auth-sec-body a {
    color: #1e1e20;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .auth-sec-cta {
    margin-top: 18px;
    width: 100%;
    height: 46px;
    min-height: 46px;
    max-height: 46px;
    border-radius: 6px;
    border: 1px solid rgba(30, 30, 32, 0.08);
    background: #ffffff;
    color: #1e1e20;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 14.5px;
    font-weight: 400;
    letter-spacing: var(--auth-tracking, 0.01em);
    cursor: pointer;
    padding: 0 16px;
    white-space: nowrap;
    transition: background .15s, border-color .15s, color .15s, transform .08s ease, box-shadow .15s;
    -webkit-appearance: none;
    appearance: none;
    -webkit-tap-highlight-color: transparent;
  }
  .auth-sec-cta:hover {
    background: #fafafa;
    border-color: rgba(30, 30, 32, 0.08);
    color: #1e1e20;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .auth-sec-cta:active {
    transform: scale(0.985);
    background: #f5f5f6;
    border-color: rgba(30, 30, 32, 0.08);
    color: #1e1e20;
    box-shadow: none;
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
      border-radius: 14px 14px 0 0;
      border-bottom: none;
      padding: 0 var(--festag-sheet-gutter, 24px) calc(env(safe-area-inset-bottom, 0px) + 18px);
      isolation: isolate;
      background: #FFFFFF;
      background-clip: padding-box;
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.06),
        0 -12px 32px -16px rgba(15, 23, 42, 0.16);
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
    }
    .auth-sec-panel .festag-popup-drag-handle {
      background: rgba(0, 0, 0, 0.09);
      opacity: 1;
    }
    .auth-sec-title,
    #auth-security-title {
      margin: 4px 0 18px;
      font-size: 26px;
      line-height: 1.22;
    }
    .auth-sec-body {
      gap: 16px;
    }
    .auth-sec-body p {
      font-size: 16px;
      line-height: 1.55;
    }
    .auth-sec-cta {
      margin-top: 18px;
      height: 46px;
      min-height: 46px;
      max-height: 46px;
      border-radius: 6px;
      font-size: 14.5px;
      letter-spacing: var(--auth-tracking, 0.01em);
      flex-shrink: 0;
    }
  }

  .auth-sec-backdrop[data-theme="dark"] .auth-sec-backdrop,
  .auth-sec-backdrop[data-theme="classic-dark"] .auth-sec-backdrop,
  .al-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-backdrop,
  .dl-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-backdrop {
    background: var(--modal-backdrop, rgba(0, 0, 0, 0.58));
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .auth-sec-backdrop[data-theme="dark"] .auth-sec-panel,
  .auth-sec-backdrop[data-theme="classic-dark"] .auth-sec-panel,
  .al-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-panel,
  .dl-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-panel {
    background: var(--festag-black-popup, #1A1A1E);
    border-color: transparent;
    box-shadow: 0 20px 48px rgba(0,0,0,0.55);
  }
  /* ID selector needed — light rule sets #auth-security-title to #1e1e20. */
  .auth-sec-backdrop[data-theme="dark"] .auth-sec-title,
  .auth-sec-backdrop[data-theme="dark"] #auth-security-title,
  .al-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-title,
  .al-root.auth-sec-backdrop[data-theme="dark"] #auth-security-title,
  .dl-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-title,
  .dl-root.auth-sec-backdrop[data-theme="dark"] #auth-security-title,
  .auth-sec-backdrop[data-theme="classic-dark"] .auth-sec-title,
  .auth-sec-backdrop[data-theme="classic-dark"] #auth-security-title {
    color: #f5f5f7 !important;
  }
  .auth-sec-backdrop[data-theme="dark"] .auth-sec-title-muted,
  .al-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-title-muted,
  .dl-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-title-muted,
  .auth-sec-backdrop[data-theme="classic-dark"] .auth-sec-title-muted,
  .auth-sec-backdrop[data-theme="dark"] .auth-sec-body p,
  .al-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-body p,
  .dl-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-body p,
  .auth-sec-backdrop[data-theme="classic-dark"] .auth-sec-body p {
    color: #8891a0 !important;
  }
  .auth-sec-backdrop[data-theme="dark"] .auth-sec-body a,
  .al-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-body a,
  .dl-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-body a {
    color: #f5f5f7;
  }
  .auth-sec-backdrop[data-theme="dark"] .auth-sec-cta,
  .al-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-cta,
  .dl-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-cta {
    background: var(--festag-btn-dark-bg, rgba(186,194,210,0.06)) !important;
    color: var(--festag-btn-dark-fg, rgba(245,245,247,0.88)) !important;
    border: 1px solid var(--festag-btn-dark-border, rgba(255, 255, 255, 0.06)) !important;
    box-shadow: var(--festag-btn-dark-shadow, none) !important;
  }
  .auth-sec-backdrop[data-theme="dark"] .auth-sec-cta:hover,
  .auth-sec-backdrop[data-theme="dark"] .auth-sec-cta:focus-visible,
  .al-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-cta:hover,
  .al-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-cta:focus-visible,
  .dl-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-cta:hover,
  .dl-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-cta:focus-visible {
    background: var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.09)) !important;
    color: var(--festag-btn-dark-fg-hover, #f5f5f7) !important;
    border-color: var(--festag-btn-dark-border-hover, rgba(255, 255, 255, 0.09)) !important;
    box-shadow: var(--festag-btn-dark-shadow-hover, none) !important;
  }
  .auth-sec-backdrop[data-theme="dark"] .auth-sec-cta:active,
  .al-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-cta:active,
  .dl-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-cta:active {
    background: var(--festag-btn-dark-bg-active, rgba(186,194,210,0.12)) !important;
    color: var(--festag-btn-dark-fg-active, #f5f5f7) !important;
    border-color: var(--festag-btn-dark-border-active, rgba(255, 255, 255, 0.07)) !important;
    box-shadow: var(--festag-btn-dark-shadow-active, none) !important;
  }
  @media (max-width: 768px) {
    .auth-sec-backdrop[data-theme="dark"] .auth-sec-panel,
    .auth-sec-backdrop[data-theme="classic-dark"] .auth-sec-panel,
    .al-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-panel,
    .dl-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-panel {
      border: none;
      background: var(--festag-black-popup, #1A1A1E);
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.28),
        0 -24px 56px -20px rgba(0, 0, 0, 0.55);
    }
    .auth-sec-backdrop[data-theme="dark"] .auth-sec-panel .festag-popup-drag-handle,
    .auth-sec-backdrop[data-theme="classic-dark"] .auth-sec-panel .festag-popup-drag-handle,
    .al-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-panel .festag-popup-drag-handle,
    .dl-root.auth-sec-backdrop[data-theme="dark"] .auth-sec-panel .festag-popup-drag-handle {
      background: rgba(255, 255, 255, 0.22);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .auth-sec-backdrop,
    .auth-sec-panel {
      transition: none !important;
    }
  }

  .auth-sec-backdrop[data-theme="read"] .auth-sec-panel,
  .auth-sec-backdrop[data-theme="light"] .auth-sec-panel,
  html[data-theme="dark"] .auth-sec-backdrop[data-theme="read"] .auth-sec-panel,
  html[data-theme="dark"] .auth-sec-backdrop[data-theme="light"] .auth-sec-panel {
    background: #FFFFFF !important;
    border: 1px solid rgba(30, 30, 32, 0.08) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 28px rgba(15, 23, 42, 0.08) !important;
    border-radius: 6px !important;
    color-scheme: light;
  }
  @media (max-width: 768px) {
    .auth-sec-backdrop[data-theme="read"] .auth-sec-panel,
    .auth-sec-backdrop[data-theme="light"] .auth-sec-panel,
    html[data-theme="dark"] .auth-sec-backdrop[data-theme="read"] .auth-sec-panel,
    html[data-theme="dark"] .auth-sec-backdrop[data-theme="light"] .auth-sec-panel {
      border-radius: 14px 14px 0 0 !important;
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.06),
        0 -12px 32px -16px rgba(15, 23, 42, 0.16) !important;
    }
  }
  .auth-sec-backdrop[data-theme="read"] .auth-sec-panel h2,
  .auth-sec-backdrop[data-theme="light"] .auth-sec-panel h2,
  html[data-theme="dark"] .auth-sec-backdrop[data-theme="read"] .auth-sec-panel h2,
  html[data-theme="dark"] .auth-sec-backdrop[data-theme="read"] #auth-security-title {
    color: #1e1e20 !important;
  }
  .auth-sec-backdrop[data-theme="read"] .auth-sec-cta,
  .auth-sec-backdrop[data-theme="light"] .auth-sec-cta,
  html[data-theme="dark"] .auth-sec-backdrop[data-theme="read"] .auth-sec-cta {
    background: #ffffff !important;
    color: #1e1e20 !important;
    border: 1px solid rgba(30, 30, 32, 0.08) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  }
  .auth-sec-backdrop[data-theme="read"] .auth-sec-outside-hint,
  .auth-sec-backdrop[data-theme="light"] .auth-sec-outside-hint {
    color: rgba(26, 25, 23, 0.72);
    text-shadow: none;
  }
  .auth-sec-backdrop[data-theme="read"],
  .auth-sec-backdrop[data-theme="light"],
  html[data-theme="dark"] .auth-sec-backdrop[data-theme="read"] {
    background: rgba(26, 25, 23, 0.34) !important;
  }

`
