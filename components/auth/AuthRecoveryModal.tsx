'use client'

import { useEffect, useState, type ReactNode } from 'react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'

export type AuthRecoveryVariant = 'client' | 'dev'

type View = 'menu' | 'reset' | 'resetDone' | 'support' | 'supportDone' | 'pinHint'

type Props = {
  open: boolean
  onClose: () => void
  /** Prefill contact / reset email from the login form. */
  initialEmail?: string
  /** Where the user opened recovery from (for support routing). */
  page?: string
  variant?: AuthRecoveryVariant
}

const EXIT_MS = 160
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Zugang wiederfinden — client password reset + support, or Dev PIN/support.
 * Desktop: centered modal. Mobile: bottom sheet with drag handle.
 */
export default function AuthRecoveryModal({
  open,
  onClose,
  initialEmail = '',
  page = '/login',
  variant = 'client',
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [view, setView] = useState<View>('menu')
  const [email, setEmail] = useState(initialEmail)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setMounted(true)
      setView('menu')
      setEmail(initialEmail)
      setMessage(
        initialEmail
          ? `Ich brauche Hilfe beim Zugang. Vermutete Adresse: ${initialEmail}`
          : variant === 'dev'
            ? 'Ich brauche Hilfe beim Dev-Zugang (Benutzername oder PIN).'
            : 'Ich finde meine Anmelde-E-Mail nicht mehr und brauche Hilfe beim Zugriff auf mein Festag-Konto.',
      )
      setError('')
      setBusy(false)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
    const t = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(t)
  }, [open, initialEmail, variant])

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

  async function sendPasswordReset() {
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) {
      setError('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        if (res.status === 429) {
          setError(data?.message || 'Zu viele Anfragen. Bitte kurz warten und erneut versuchen.')
        } else {
          setError(data?.message || 'Link konnte gerade nicht gesendet werden.')
        }
        setBusy(false)
        return
      }
      setView('resetDone')
    } catch {
      setError('Netzwerkproblem. Bitte Verbindung prüfen und erneut versuchen.')
    }
    setBusy(false)
  }

  async function sendSupport() {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedMsg = message.trim()
    if (!trimmedMsg) {
      setError('Bitte kurz beschreiben, womit wir helfen können.')
      return
    }
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
      setError('Bitte eine gültige Kontakt-E-Mail eingeben.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/support/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: trimmedEmail || undefined,
          message: trimmedMsg,
          page,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        if (res.status === 429) {
          setError(data?.message || 'Zu viele Anfragen. Bitte kurz warten.')
        } else {
          setError(data?.message || 'Support-Anfrage konnte nicht gesendet werden.')
        }
        setBusy(false)
        return
      }
      setView('supportDone')
    } catch {
      setError('Netzwerkproblem. Bitte Verbindung prüfen und erneut versuchen.')
    }
    setBusy(false)
  }

  if (!mounted) return null

  const titleId = 'auth-recovery-title'

  let title = 'Zugang wiederfinden'
  let body: ReactNode = null
  let actions: ReactNode = null

  if (view === 'menu') {
    body = (
      <div className="auth-rec-body">
        <p>
          {variant === 'dev'
            ? 'PIN verloren oder Einladung nicht mehr da? Wir helfen dir weiter — per Support oder mit den Hinweisen zur Einrichtung.'
            : 'Passwort vergessen oder E-Mail unsicher? Setze dein Passwort per E-Mail zurück oder schreib kurz dem Support.'}
        </p>
      </div>
    )
    actions = (
      <div className="auth-rec-actions auth-rec-actions--stack">
        {variant === 'client' ? (
          <button
            className="auth-rec-cta"
            type="button"
            onClick={() => { setError(''); setView('reset') }}
          >
            Passwort per E-Mail zurücksetzen
          </button>
        ) : (
          <button
            className="auth-rec-cta"
            type="button"
            onClick={() => { setError(''); setView('pinHint') }}
          >
            PIN und Einladung
          </button>
        )}
        <button
          className="auth-rec-cta auth-rec-cta--ghost"
          type="button"
          onClick={() => { setError(''); setView('support') }}
        >
          Support kontaktieren
        </button>
      </div>
    )
  } else if (view === 'reset') {
    title = 'Passwort zurücksetzen'
    body = (
      <div className="auth-rec-body">
        <p>
          Wir senden einen sicheren Link an deine E-Mail. Darüber legst du ein neues Passwort fest.
        </p>
        <label className="auth-rec-field">
          <span>E-Mail</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@firma.de"
            disabled={busy}
          />
        </label>
        {error ? <p className="auth-rec-error" role="alert">{error}</p> : null}
      </div>
    )
    actions = (
      <div className="auth-rec-actions auth-rec-actions--stack">
        <button
          className="auth-rec-cta"
          type="button"
          disabled={busy}
          onClick={() => { void sendPasswordReset() }}
        >
          {busy ? 'Wird gesendet…' : 'Reset-Link senden'}
        </button>
        <button
          className="auth-rec-back"
          type="button"
          disabled={busy}
          onClick={() => { setError(''); setView('menu') }}
        >
          Zurück
        </button>
      </div>
    )
  } else if (view === 'resetDone') {
    title = 'E-Mail unterwegs'
    body = (
      <div className="auth-rec-body">
        <p>
          Wenn ein Konto mit dieser Adresse existiert, erhältst du in Kürze einen Link zum Zurücksetzen.
          Der Link ist zeitlich begrenzt und nur einmal nutzbar.
        </p>
      </div>
    )
    actions = (
      <div className="auth-rec-actions">
        <button className="auth-rec-cta" type="button" onClick={onClose}>
          Verstanden und weiter
        </button>
      </div>
    )
  } else if (view === 'pinHint') {
    title = 'PIN und Einladung'
    body = (
      <div className="auth-rec-body">
        <p>
          Neue Devs starten mit dem Link aus der Einladungs-Mail. Workspace-Name und Einladungs-PIN
          reichen für die Einrichtung — danach gilt dein persönlicher PIN.
        </p>
        <p>
          Bereits eingerichtet? Melde dich mit Benutzername und PIN an. Den Benutzernamen findest du
          in der Einladungs-Mail. Einen neuen Einladungs-PIN kannst du auf dem Registrier-Schritt
          erneut anfordern.
        </p>
      </div>
    )
    actions = (
      <div className="auth-rec-actions auth-rec-actions--stack">
        <button
          className="auth-rec-cta"
          type="button"
          onClick={() => { setError(''); setView('support') }}
        >
          Support kontaktieren
        </button>
        <button
          className="auth-rec-back"
          type="button"
          onClick={() => { setError(''); setView('menu') }}
        >
          Zurück
        </button>
      </div>
    )
  } else if (view === 'support') {
    title = 'Support kontaktieren'
    body = (
      <div className="auth-rec-body">
        <p>
          Schreib uns kurz, welche E-Mail oder Firma zu deinem Konto gehört. Wir melden uns direkt bei dir.
        </p>
        <label className="auth-rec-field">
          <span>Kontakt-E-Mail</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@firma.de"
            disabled={busy}
          />
        </label>
        <label className="auth-rec-field">
          <span>Nachricht</span>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            placeholder="Ich brauche Hilfe beim Login…"
            disabled={busy}
          />
        </label>
        {error ? <p className="auth-rec-error" role="alert">{error}</p> : null}
      </div>
    )
    actions = (
      <div className="auth-rec-actions auth-rec-actions--row">
        <button
          className="auth-rec-cta auth-rec-cta--ghost"
          type="button"
          disabled={busy}
          onClick={() => { setError(''); setView('menu') }}
        >
          Abbrechen
        </button>
        <button
          className="auth-rec-cta"
          type="button"
          disabled={busy}
          onClick={() => { void sendSupport() }}
        >
          {busy ? 'Wird gesendet…' : 'Anfrage senden'}
        </button>
      </div>
    )
  } else {
    title = 'Anfrage gesendet'
    body = (
      <div className="auth-rec-body">
        <p>
          Danke, deine Anfrage ist angekommen. Wir prüfen den Zugang und melden uns bei dir.
        </p>
      </div>
    )
    actions = (
      <div className="auth-rec-actions">
        <button className="auth-rec-cta" type="button" onClick={onClose}>
          Schließen
        </button>
      </div>
    )
  }

  return (
    <div
      className={`auth-rec-backdrop${visible ? ' is-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <style>{RECOVERY_CSS}</style>
      <div className="auth-rec-panel">
        <FestagPopupDragHandle onDismiss={onClose} />
        <div className="auth-rec-inner">
          <h2 id={titleId} className="auth-rec-title">{title}</h2>
          {body}
          {actions}
        </div>
      </div>
    </div>
  )
}

const RECOVERY_CSS = `
  .auth-rec-backdrop {
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
    transition: opacity .16s ease;
  }
  .auth-rec-backdrop.is-visible {
    opacity: 1;
  }
  .auth-rec-panel {
    width: min(100%, 520px);
    max-height: min(92dvh, 720px);
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
    transition: opacity .16s cubic-bezier(.16,1,.3,1), transform .16s cubic-bezier(.16,1,.3,1);
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .auth-rec-backdrop.is-visible .auth-rec-panel {
    opacity: 1;
    transform: none;
  }
  .auth-rec-panel .festag-popup-drag-area {
    display: none;
  }
  .auth-rec-inner {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .auth-rec-title,
  #auth-recovery-title {
    margin: 0 0 18px;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 26px;
    font-weight: 400;
    line-height: 1.28;
    letter-spacing: -0.022em;
    color: #1e1e20;
  }
  .auth-rec-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .auth-rec-body p {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 15.5px;
    font-weight: 400;
    line-height: 1.65;
    letter-spacing: 0.004em;
    color: #5c5c62;
  }
  .auth-rec-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .auth-rec-field span {
    font-size: 13px;
    font-weight:400;
    letter-spacing: 0.002em;
    color: #5c5c62;
  }
  .auth-rec-field input,
  .auth-rec-field textarea {
    width: 100%;
    border-radius: 14px;
    border: 0;
    background: var(--festag-input-fill, #F5F5F7);
    color: #1e1e20;
    font-family: inherit;
    font-size: 15px;
    font-weight: 400;
    outline: none;
    padding: 13px 14px;
    resize: vertical;
    min-height: 48px;
    box-sizing: border-box;
  }
  .auth-rec-field textarea {
    min-height: 110px;
    line-height: 1.45;
  }
  .auth-rec-field input:focus,
  .auth-rec-field textarea:focus {
    background: #ffffff;
    box-shadow: 0 0 0 2px rgba(30, 30, 32, 0.12);
  }
  .auth-rec-error {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.4;
    color: #c62828;
  }
  .auth-rec-actions {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .auth-rec-actions--stack {
    gap: 10px;
  }
  .auth-rec-actions--row {
    flex-direction: row;
    gap: 10px;
  }
  .auth-rec-actions--row .auth-rec-cta {
    flex: 1;
  }
  .auth-rec-cta {
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
  .auth-rec-cta:hover:not(:disabled) {
    background: var(--festag-btn-dark-bg-hover, #f7f8fb);
    border-color: var(--festag-btn-dark-border-hover, #dce1ea);
    color: var(--festag-btn-dark-fg-hover, #1e1e20);
  }
  .auth-rec-cta:active:not(:disabled) {
    transform: scale(0.985);
  }
  .auth-rec-cta:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .auth-rec-cta--ghost {
    background: transparent;
    box-shadow: none;
    border-color: rgba(30, 30, 32, 0.12);
  }
  .auth-rec-back {
    border: 0;
    background: transparent;
    padding: 8px 0;
    font: inherit;
    font-size: 14px;
    font-weight:400;
    color: #5c5c62;
    cursor: pointer;
    text-align: center;
  }
  .auth-rec-back:hover {
    color: #1e1e20;
  }

  @media (max-width: 768px) {
    .auth-rec-backdrop {
      align-items: flex-end;
      justify-content: flex-end;
      padding: 0;
    }
    .auth-rec-panel {
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
      transform: translateY(100%);
      transition: opacity .16s cubic-bezier(.16,1,.3,1), transform .2s cubic-bezier(.16,1,.3,1);
    }
    .auth-rec-backdrop.is-visible .auth-rec-panel {
      opacity: 1;
      transform: none;
    }
    .auth-rec-panel .festag-popup-drag-area {
      display: flex;
      width: 100%;
      padding: 12px 0 8px;
      justify-content: center;
      flex-shrink: 0;
      touch-action: none;
      cursor: grab;
    }
    .auth-rec-panel .festag-popup-drag-area:active {
      cursor: grabbing;
    }
    .auth-rec-panel .festag-popup-drag-handle {
      width: 40px;
      height: 4px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.12);
      opacity: 1;
    }
    .auth-rec-title,
    #auth-recovery-title {
      margin: 4px 0 16px;
      font-size: 28px;
      line-height: 1.22;
    }
    .auth-rec-cta {
      height: 50px;
      font-size: 16px;
    }
    .auth-rec-actions {
      margin-top: 28px;
    }
  }

  [data-theme="dark"] .auth-rec-backdrop,
  .al-root[data-theme="dark"] .auth-rec-backdrop,
  .dl-root[data-theme="dark"] .auth-rec-backdrop {
    background: rgba(0, 0, 0, 0.68);
  }
  [data-theme="dark"] .auth-rec-panel,
  .al-root[data-theme="dark"] .auth-rec-panel,
  .dl-root[data-theme="dark"] .auth-rec-panel {
    background: var(--festag-black-popup, #121214);
    border-color: transparent;
    box-shadow: 0 20px 48px rgba(0,0,0,0.55);
  }
  [data-theme="dark"] .auth-rec-title,
  [data-theme="dark"] #auth-recovery-title,
  .al-root[data-theme="dark"] .auth-rec-title,
  .al-root[data-theme="dark"] #auth-recovery-title,
  .dl-root[data-theme="dark"] .auth-rec-title,
  .dl-root[data-theme="dark"] #auth-recovery-title {
    color: #f5f5f7 !important;
  }
  [data-theme="dark"] .auth-rec-body p,
  .al-root[data-theme="dark"] .auth-rec-body p,
  .dl-root[data-theme="dark"] .auth-rec-body p,
  [data-theme="dark"] .auth-rec-field span,
  .al-root[data-theme="dark"] .auth-rec-field span,
  .dl-root[data-theme="dark"] .auth-rec-field span,
  [data-theme="dark"] .auth-rec-back,
  .al-root[data-theme="dark"] .auth-rec-back,
  .dl-root[data-theme="dark"] .auth-rec-back {
    color: rgba(245,245,247,0.68);
  }
  [data-theme="dark"] .auth-rec-back:hover,
  .al-root[data-theme="dark"] .auth-rec-back:hover,
  .dl-root[data-theme="dark"] .auth-rec-back:hover {
    color: #f5f5f7;
  }
  [data-theme="dark"] .auth-rec-field input,
  [data-theme="dark"] .auth-rec-field textarea,
  .al-root[data-theme="dark"] .auth-rec-field input,
  .al-root[data-theme="dark"] .auth-rec-field textarea,
  .dl-root[data-theme="dark"] .auth-rec-field input,
  .dl-root[data-theme="dark"] .auth-rec-field textarea {
    background: rgba(255,255,255,0.06);
    color: #f5f5f7;
  }
  [data-theme="dark"] .auth-rec-field input:focus,
  [data-theme="dark"] .auth-rec-field textarea:focus,
  .al-root[data-theme="dark"] .auth-rec-field input:focus,
  .al-root[data-theme="dark"] .auth-rec-field textarea:focus,
  .dl-root[data-theme="dark"] .auth-rec-field input:focus,
  .dl-root[data-theme="dark"] .auth-rec-field textarea:focus {
    background: rgba(255,255,255,0.09);
    box-shadow: 0 0 0 2px rgba(255,255,255,0.12);
  }
  [data-theme="dark"] .auth-rec-error,
  .al-root[data-theme="dark"] .auth-rec-error,
  .dl-root[data-theme="dark"] .auth-rec-error {
    color: #ff6961;
  }
  [data-theme="dark"] .auth-rec-cta,
  .al-root[data-theme="dark"] .auth-rec-cta,
  .dl-root[data-theme="dark"] .auth-rec-cta {
    background: var(--festag-btn-dark-bg, rgba(255,255,255,0.06));
    color: var(--festag-btn-dark-fg, rgba(245,245,247,0.55));
    border: 0.7px solid var(--festag-btn-dark-border, transparent);
    box-shadow: var(--festag-btn-dark-shadow, none);
  }
  [data-theme="dark"] .auth-rec-cta:hover:not(:disabled),
  [data-theme="dark"] .auth-rec-cta:active:not(:disabled),
  .al-root[data-theme="dark"] .auth-rec-cta:hover:not(:disabled),
  .al-root[data-theme="dark"] .auth-rec-cta:active:not(:disabled),
  .dl-root[data-theme="dark"] .auth-rec-cta:hover:not(:disabled),
  .dl-root[data-theme="dark"] .auth-rec-cta:active:not(:disabled) {
    background: var(--festag-btn-dark-bg-hover, rgba(255,255,255,0.10));
    color: var(--festag-btn-dark-fg-hover, #f5f5f7);
    border-color: var(--festag-btn-dark-border-hover, transparent);
  }
  [data-theme="dark"] .auth-rec-cta--ghost,
  .al-root[data-theme="dark"] .auth-rec-cta--ghost,
  .dl-root[data-theme="dark"] .auth-rec-cta--ghost {
    background: transparent;
    border-color: rgba(255,255,255,0.12);
  }
  @media (max-width: 768px) {
    [data-theme="dark"] .auth-rec-panel,
    .al-root[data-theme="dark"] .auth-rec-panel,
    .dl-root[data-theme="dark"] .auth-rec-panel {
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.28),
        0 -24px 56px -20px rgba(0, 0, 0, 0.55);
    }
    [data-theme="dark"] .auth-rec-panel .festag-popup-drag-handle,
    .al-root[data-theme="dark"] .auth-rec-panel .festag-popup-drag-handle,
    .dl-root[data-theme="dark"] .auth-rec-panel .festag-popup-drag-handle {
      background: rgba(255, 255, 255, 0.22);
    }
  }
`
