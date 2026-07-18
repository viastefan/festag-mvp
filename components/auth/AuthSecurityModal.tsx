'use client'

import { useEffect, useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  privacyHref?: string
}

const EXIT_MS = 240

/**
 * Security explanation for auth footers (SSL badge).
 * Solid dim overlay (no frost); solid panel; calm enter/exit.
 * Closes via bottom CTA „Verstanden und weiter“ (no X).
 */
export default function AuthSecurityModal({ open, onClose, privacyHref = '/datenschutz' }: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
    const t = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
        <h2 id="auth-security-title" className="auth-sec-title">
          Verschlüsselte Verbindung
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
    transition: opacity .24s ease;
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
    transform: translateY(10px) scale(0.985);
    transition: opacity .24s cubic-bezier(.16,1,.3,1), transform .24s cubic-bezier(.16,1,.3,1);
  }
  .auth-sec-backdrop.is-visible .auth-sec-panel {
    opacity: 1;
    transform: none;
  }
  .auth-sec-title {
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
    border: 0.7px solid #e7ebf0;
    background: #ffffff;
    color: #1e1e20;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 1px 3px rgba(15, 23, 42, 0.03);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.01em;
    cursor: pointer;
    padding: 0 18px;
    transition: background .15s, border-color .15s, color .15s, transform .08s ease, box-shadow .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .auth-sec-cta:hover {
    background: #f7f8fb;
    border-color: #dce1ea;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.05),
      0 1px 3px rgba(15, 23, 42, 0.04);
  }
  .auth-sec-cta:active {
    transform: scale(0.985);
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
    border-color: rgba(255,255,255,0.1);
    box-shadow: 0 20px 48px rgba(0,0,0,0.55);
  }
  [data-theme="dark"] .auth-sec-title,
  .al-root[data-theme="dark"] .auth-sec-title,
  .dl-root[data-theme="dark"] .auth-sec-title {
    color: #f5f5f7;
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
    background: #1c1c1e;
    color: #f5f5f7;
    border: 0.7px solid rgba(255,255,255,0.12);
    box-shadow: none;
  }
  [data-theme="dark"] .auth-sec-cta:hover,
  .al-root[data-theme="dark"] .auth-sec-cta:hover,
  .dl-root[data-theme="dark"] .auth-sec-cta:hover {
    background: #252528;
    border-color: rgba(255,255,255,0.16);
    box-shadow: none;
  }
`
