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
        <div className="auth-sec-top">
          <h2 id="auth-security-title" className="auth-sec-title">
            Verschlüsselte Verbindung
          </h2>
          <button
            className="auth-sec-close"
            type="button"
            onClick={onClose}
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
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
    background: rgba(15, 23, 42, 0.46);
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
    padding: 28px 28px 26px;
    opacity: 0;
    transform: translateY(10px) scale(0.985);
    transition: opacity .24s cubic-bezier(.16,1,.3,1), transform .24s cubic-bezier(.16,1,.3,1);
  }
  .auth-sec-backdrop.is-visible .auth-sec-panel {
    opacity: 1;
    transform: none;
  }
  .auth-sec-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 18px;
  }
  .auth-sec-title {
    margin: 0;
    max-width: calc(100% - 40px);
    font-family: inherit;
    font-size: 24px;
    font-weight: 400;
    line-height: 1.25;
    letter-spacing: -0.03em;
    color: #1e1e20;
  }
  .auth-sec-close {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: #86868b;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    transition: color .15s, background .15s;
  }
  .auth-sec-close:hover {
    color: #1e1e20;
    background: rgba(15, 23, 42, 0.05);
  }
  .auth-sec-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .auth-sec-body p {
    margin: 0;
    font-size: 14.5px;
    font-weight: 400;
    line-height: 1.55;
    letter-spacing: -0.01em;
    color: #5c5c62;
  }
  .auth-sec-body a {
    color: #1e1e20;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  [data-theme="dark"] .auth-sec-backdrop,
  .al-root[data-theme="dark"] .auth-sec-backdrop,
  .dl-root[data-theme="dark"] .auth-sec-backdrop {
    background: rgba(0, 0, 0, 0.62);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  [data-theme="dark"] .auth-sec-panel,
  .al-root[data-theme="dark"] .auth-sec-panel,
  .dl-root[data-theme="dark"] .auth-sec-panel {
    background: var(--festag-black-content, #0c0c0e);
    border-color: rgba(255,255,255,0.1);
    box-shadow: 0 20px 48px rgba(0,0,0,0.55);
  }
  [data-theme="dark"] .auth-sec-title,
  .al-root[data-theme="dark"] .auth-sec-title,
  .dl-root[data-theme="dark"] .auth-sec-title {
    color: #f5f5f7;
  }
  [data-theme="dark"] .auth-sec-close,
  .al-root[data-theme="dark"] .auth-sec-close,
  .dl-root[data-theme="dark"] .auth-sec-close {
    color: rgba(245,245,247,0.45);
  }
  [data-theme="dark"] .auth-sec-close:hover,
  .al-root[data-theme="dark"] .auth-sec-close:hover,
  .dl-root[data-theme="dark"] .auth-sec-close:hover {
    color: #f5f5f7;
    background: rgba(255,255,255,0.06);
  }
  [data-theme="dark"] .auth-sec-body p,
  .al-root[data-theme="dark"] .auth-sec-body p,
  .dl-root[data-theme="dark"] .auth-sec-body p {
    color: rgba(245,245,247,0.62);
  }
  [data-theme="dark"] .auth-sec-body a,
  .al-root[data-theme="dark"] .auth-sec-body a,
  .dl-root[data-theme="dark"] .auth-sec-body a {
    color: #f5f5f7;
  }
`
