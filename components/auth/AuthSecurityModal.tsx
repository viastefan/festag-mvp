'use client'

import { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  privacyHref?: string
}

/**
 * Short security explanation for auth footers (SSL badge).
 * Light solid dim (no glass blur); solid panel; single X close.
 */
export default function AuthSecurityModal({ open, onClose, privacyHref = '/datenschutz' }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="auth-sec-backdrop"
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
            Die Verbindung zu Festag läuft über TLS. Daten werden beim Transport verschlüsselt übertragen.
          </p>
          <p>
            Sitzungen nutzen geschützte Cookies bzw. Tokens. Zugriff bleibt an dein Konto gebunden.
          </p>
          <p>
            Mehr dazu in der{' '}
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
    background: rgba(15, 23, 42, 0.14);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    animation: authSecFade .16s ease both;
  }
  .auth-sec-panel {
    width: min(100%, 400px);
    border-radius: 22px;
    border: 1px solid rgba(210, 210, 215, 0.8);
    background: #ffffff;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.1);
    padding: 22px 22px 20px;
    animation: authSecPop .18s cubic-bezier(.16,1,.3,1) both;
  }
  .auth-sec-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .auth-sec-title {
    margin: 0;
    max-width: calc(100% - 40px);
    font-family: inherit;
    font-size: 22px;
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
    gap: 10px;
  }
  .auth-sec-body p {
    margin: 0;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
    letter-spacing: -0.01em;
    color: #5c5c62;
  }
  .auth-sec-body a {
    color: #1e1e20;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  @keyframes authSecFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes authSecPop {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }

  [data-theme="dark"] .auth-sec-backdrop,
  .al-root[data-theme="dark"] .auth-sec-backdrop,
  .dl-root[data-theme="dark"] .auth-sec-backdrop {
    background: rgba(0, 0, 0, 0.28);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  [data-theme="dark"] .auth-sec-panel,
  .al-root[data-theme="dark"] .auth-sec-panel,
  .dl-root[data-theme="dark"] .auth-sec-panel {
    background: var(--festag-black-content, #0c0c0e);
    border-color: rgba(255,255,255,0.1);
    box-shadow: 0 16px 40px rgba(0,0,0,0.45);
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
