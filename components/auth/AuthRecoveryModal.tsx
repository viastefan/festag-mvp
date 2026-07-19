'use client'

import { useEffect, useState, type ReactNode } from 'react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { FESTAG_SHEET_MS, prefersReducedMotion } from '@/lib/festag-sheet-motion'

export type AuthRecoveryVariant = 'client' | 'dev'

type View = 'menu' | 'reset' | 'resetDone' | 'pinReset' | 'pinDone' | 'support' | 'supportDone'

type Props = {
  open: boolean
  onClose: () => void
  /** Prefill contact / reset email from the login form. */
  initialEmail?: string
  /** Prefill Dev username when opened from Dev login. */
  initialUsername?: string
  /** Where the user opened recovery from (for support routing). */
  page?: string
  variant?: AuthRecoveryVariant
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEVICE_KEY = 'festag_recovery_device_key'
const SUPPORT_LOCAL = 'festag_recovery_support_sent'

function getOrCreateDeviceKey(): string {
  if (typeof window === 'undefined') return ''
  try {
    let key = window.localStorage.getItem(DEVICE_KEY)
    if (!key) {
      key = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
      window.localStorage.setItem(DEVICE_KEY, key)
    }
    return key.slice(0, 80)
  } catch {
    return ''
  }
}

function readLocalSupportSent(email: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(SUPPORT_LOCAL)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { emails?: string[]; device?: boolean }
    const emails = Array.isArray(parsed.emails) ? parsed.emails : []
    const norm = email.trim().toLowerCase()
    if (norm && emails.includes(norm)) return true
    if (!norm && parsed.device) return true
    return false
  } catch {
    return false
  }
}

function rememberLocalSupportSent(email: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(SUPPORT_LOCAL)
    const parsed = raw ? (JSON.parse(raw) as { emails?: string[]; device?: boolean }) : {}
    const emails = new Set(Array.isArray(parsed.emails) ? parsed.emails : [])
    const norm = email.trim().toLowerCase()
    if (norm) emails.add(norm)
    window.localStorage.setItem(
      SUPPORT_LOCAL,
      JSON.stringify({
        emails: Array.from(emails).slice(-12),
        device: true,
        at: new Date().toISOString(),
      }),
    )
  } catch { /* ignore */ }
}

/**
 * Auth recovery — client password reset + Dev PIN reset + support.
 * Desktop: centered modal. Mobile: bottom sheet with drag handle.
 */
export default function AuthRecoveryModal({
  open,
  onClose,
  initialEmail = '',
  initialUsername = '',
  page = '/login',
  variant = 'client',
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [view, setView] = useState<View>('menu')
  const [email, setEmail] = useState(initialEmail)
  const [username, setUsername] = useState(initialUsername)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [supportAlreadySent, setSupportAlreadySent] = useState(false)
  const [showPassword, setShowPassword] = useState(variant === 'client')
  const [showPin, setShowPin] = useState(variant === 'dev')
  const [pinKind, setPinKind] = useState<'invite' | 'personal' | null>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setView('menu')
      setEmail(initialEmail)
      setUsername(initialUsername)
      setMessage(
        initialEmail
          ? `Ich brauche Hilfe beim Zugang. Vermutete Adresse: ${initialEmail}`
          : variant === 'dev'
            ? 'Ich brauche Hilfe beim Dev-Zugang (Benutzername oder PIN).'
            : 'Ich finde meine Anmelde-E-Mail nicht mehr und brauche Hilfe beim Zugriff auf mein Festag-Konto.',
      )
      setError('')
      setBusy(false)
      setPinKind(null)
      setShowPassword(variant === 'client')
      setShowPin(variant === 'dev')
      setSupportAlreadySent(readLocalSupportSent(initialEmail))

      const deviceKey = getOrCreateDeviceKey()
      void (async () => {
        try {
          const statusRes = await fetch('/api/support/recovery-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: initialEmail.trim().toLowerCase() || undefined,
              deviceKey: deviceKey || undefined,
            }),
          })
          const status = await statusRes.json().catch(() => null)
          if (status?.alreadySent) {
            setSupportAlreadySent(true)
            if (initialEmail) rememberLocalSupportSent(initialEmail)
          }
        } catch { /* ignore */ }

        const probeEmail = initialEmail.trim().toLowerCase()
        const probeUser = initialUsername.trim().toLowerCase()
        if (!probeEmail && !probeUser) return
        try {
          const optsRes = await fetch('/api/auth/recovery-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: probeEmail || undefined,
              username: probeUser || undefined,
              variant,
            }),
          })
          const opts = await optsRes.json().catch(() => null)
          if (opts?.ok) {
            setShowPassword(Boolean(opts.password))
            setShowPin(Boolean(opts.pin))
          }
        } catch { /* keep variant defaults */ }
      })()

      if (prefersReducedMotion()) {
        setVisible(true)
        return
      }
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
    if (prefersReducedMotion()) {
      setMounted(false)
      return
    }
    const t = window.setTimeout(() => setMounted(false), FESTAG_SHEET_MS)
    return () => window.clearTimeout(t)
  }, [open, initialEmail, initialUsername, variant])

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

  async function refreshOptionsFromEmail(nextEmail: string) {
    const trimmed = nextEmail.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) return
    try {
      const optsRes = await fetch('/api/auth/recovery-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: trimmed, variant }),
      })
      const opts = await optsRes.json().catch(() => null)
      if (opts?.ok) {
        setShowPassword(Boolean(opts.password))
        setShowPin(Boolean(opts.pin))
      }
      const statusRes = await fetch('/api/support/recovery-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: trimmed,
          deviceKey: getOrCreateDeviceKey() || undefined,
        }),
      })
      const status = await statusRes.json().catch(() => null)
      if (status?.alreadySent) {
        setSupportAlreadySent(true)
        rememberLocalSupportSent(trimmed)
      } else if (!readLocalSupportSent(trimmed)) {
        setSupportAlreadySent(false)
      }
    } catch { /* ignore */ }
  }

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

  async function sendPinReset() {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedUser = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
    if (!trimmedEmail && !trimmedUser) {
      setError('Bitte Benutzername oder E-Mail eingeben.')
      return
    }
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
      setError('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/dev/pin-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: trimmedEmail || undefined,
          username: trimmedUser || undefined,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        if (res.status === 429) {
          setError(data?.message || 'Zu viele Anfragen. Bitte kurz warten und erneut versuchen.')
        } else {
          setError(data?.message || 'PIN konnte gerade nicht gesendet werden.')
        }
        setBusy(false)
        return
      }
      if (data?.kind === 'invite' || data?.kind === 'personal') {
        setPinKind(data.kind)
      } else {
        setPinKind(null)
      }
      setView('pinDone')
    } catch {
      setError('Netzwerkproblem. Bitte Verbindung prüfen und erneut versuchen.')
    }
    setBusy(false)
  }

  async function sendSupport() {
    if (supportAlreadySent) {
      setError('Anfrage bereits gesendet. Wir melden uns bei dir.')
      return
    }
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedMsg = message.trim()
    if (!trimmedMsg) {
      setError('Bitte kurz beschreiben, womit wir helfen können.')
      return
    }
    if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) {
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
          email: trimmedEmail,
          message: trimmedMsg,
          page,
          kind: 'recovery',
          deviceKey: getOrCreateDeviceKey() || undefined,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        if (res.status === 409 || data?.error === 'already_sent' || data?.alreadySent) {
          setSupportAlreadySent(true)
          rememberLocalSupportSent(trimmedEmail)
          setError('Anfrage bereits gesendet. Wir melden uns bei dir.')
          setBusy(false)
          return
        }
        if (res.status === 429) {
          setError(data?.message || 'Zu viele Anfragen. Bitte kurz warten.')
        } else {
          setError(data?.message || 'Support-Anfrage konnte nicht gesendet werden.')
        }
        setBusy(false)
        return
      }
      setSupportAlreadySent(true)
      rememberLocalSupportSent(trimmedEmail)
      setView('supportDone')
    } catch {
      setError('Netzwerkproblem. Bitte Verbindung prüfen und erneut versuchen.')
    }
    setBusy(false)
  }

  if (!mounted) return null

  const titleId = 'auth-recovery-title'

  let title: ReactNode = (
    <>
      <span className="auth-rec-title-muted">Wenn du dich nicht anmelden kannst,</span>
      <span className="auth-rec-title-strong">Passwort zurück oder schreib uns.</span>
    </>
  )
  let body: ReactNode = null
  let actions: ReactNode = null

  if (view === 'menu') {
    const hasAnyReset = showPassword || showPin
    body = supportAlreadySent ? (
      <div className="auth-rec-body">
        <p className="auth-rec-note">
          Deine Support-Anfrage ist bereits unterwegs. Wir melden uns bei dir. Passwort- oder PIN-Reset bleibt weiterhin möglich.
        </p>
      </div>
    ) : null
    actions = (
      <div className="auth-rec-actions auth-rec-actions--stack">
        {showPassword ? (
          <button
            className="auth-rec-cta"
            type="button"
            onClick={() => { setError(''); setView('reset') }}
          >
            Passwort per E-Mail zurücksetzen
          </button>
        ) : null}
        {showPin ? (
          <button
            className={showPassword ? 'auth-rec-cta auth-rec-cta--ghost' : 'auth-rec-cta'}
            type="button"
            onClick={() => { setError(''); setView('pinReset') }}
          >
            PIN neu anfordern
          </button>
        ) : null}
        {!hasAnyReset ? (
          <button
            className="auth-rec-cta"
            type="button"
            onClick={() => { setError(''); setView(variant === 'dev' ? 'pinReset' : 'reset') }}
          >
            {variant === 'dev' ? 'PIN neu anfordern' : 'Passwort per E-Mail zurücksetzen'}
          </button>
        ) : null}
        <button
          className={`auth-rec-cta auth-rec-cta--ghost${supportAlreadySent ? ' auth-rec-cta--disabled' : ''}`}
          type="button"
          disabled={supportAlreadySent}
          aria-disabled={supportAlreadySent}
          title={supportAlreadySent ? 'Anfrage bereits gesendet' : undefined}
          onClick={() => {
            if (supportAlreadySent) return
            setError('')
            setView('support')
          }}
        >
          {supportAlreadySent ? 'Anfrage bereits gesendet' : 'Support kontaktieren'}
        </button>
        {supportAlreadySent ? (
          <p className="auth-rec-disabled-hint">Wir melden uns bei dir.</p>
        ) : null}
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
            onChange={e => {
              setEmail(e.target.value)
              void refreshOptionsFromEmail(e.target.value)
            }}
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
  } else if (view === 'pinReset') {
    title = 'PIN neu anfordern'
    body = (
      <div className="auth-rec-body">
        <p>
          Wir senden einen neuen PIN an die hinterlegte E-Mail — Einladungs-PIN bei offener Einrichtung,
          sonst deinen persönlichen PIN.
        </p>
        <label className="auth-rec-field">
          <span>Benutzername</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="dein.benutzername"
            disabled={busy}
          />
        </label>
        <label className="auth-rec-field">
          <span>E-Mail am Konto</span>
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
          onClick={() => { void sendPinReset() }}
        >
          {busy ? 'Wird gesendet…' : 'Neuen PIN senden'}
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
  } else if (view === 'pinDone') {
    title = 'PIN unterwegs'
    body = (
      <div className="auth-rec-body">
        <p>
          {pinKind === 'invite'
            ? 'Wenn ein Konto existiert, erhältst du in Kürze einen neuen Einladungs-PIN. Danach kannst du Workspace und persönlichen PIN einrichten.'
            : pinKind === 'personal'
              ? 'Wenn ein Konto existiert, erhältst du in Kürze deinen neuen persönlichen PIN. Der bisherige ist danach ungültig.'
              : 'Wenn ein Konto existiert, erhältst du in Kürze einen neuen PIN per E-Mail.'}
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
  } else if (view === 'support') {
    title = 'Support kontaktieren'
    body = (
      <div className="auth-rec-body">
        {supportAlreadySent ? (
          <p>
            Anfrage bereits gesendet. Wir melden uns bei dir. Passwort- oder PIN-Reset bleibt weiterhin möglich.
          </p>
        ) : (
          <>
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
                disabled={busy || supportAlreadySent}
              />
            </label>
            <label className="auth-rec-field">
              <span>Nachricht</span>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                placeholder="Ich brauche Hilfe beim Login…"
                disabled={busy || supportAlreadySent}
              />
            </label>
          </>
        )}
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
          {supportAlreadySent ? 'Zurück' : 'Abbrechen'}
        </button>
        <button
          className={`auth-rec-cta${supportAlreadySent ? ' auth-rec-cta--disabled' : ''}`}
          type="button"
          disabled={busy || supportAlreadySent}
          aria-disabled={busy || supportAlreadySent}
          title={supportAlreadySent ? 'Anfrage bereits gesendet' : undefined}
          onClick={() => { void sendSupport() }}
        >
          {supportAlreadySent
            ? 'Anfrage bereits gesendet'
            : busy
              ? 'Wird gesendet…'
              : 'Anfrage senden'}
        </button>
      </div>
    )
  } else {
    title = 'Anfrage gesendet'
    body = (
      <div className="auth-rec-body">
        <p>
          Danke, deine Anfrage ist angekommen. Wir prüfen den Zugang und melden uns bei dir.
          Eine weitere Support-Anfrage ist hier nicht nötig — Passwort- oder PIN-Reset bleibt möglich.
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
    transition: opacity var(--festag-sheet-ms, 240ms) ease;
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
    transform: translate3d(0, 10px, 0) scale(0.985);
    transition:
      opacity var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease, cubic-bezier(.16,1,.3,1)),
      transform var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease, cubic-bezier(.16,1,.3,1));
    will-change: transform, opacity;
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
  #auth-recovery-title,
  .auth-rec-panel h2.auth-rec-title {
    margin: 0 0 22px;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 22px !important;
    font-weight: 400 !important;
    line-height: 1.32 !important;
    letter-spacing: -0.022em;
    color: #1e1e20;
  }
  .auth-rec-title-muted,
  .auth-rec-title-strong {
    display: block;
    white-space: nowrap;
  }
  .auth-rec-title-muted {
    /* Match auth header path muted — Apple gray, cool/bluish */
    color: #8891a0;
  }
  .auth-rec-title-strong {
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
  .auth-rec-note {
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(30, 30, 32, 0.04);
    color: #5c5c62 !important;
    font-size: 12.5px !important;
    line-height: 1.45 !important;
    letter-spacing: var(--festag-tracking-small, 0.015em) !important;
    text-align: left;
  }
  .auth-rec-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .auth-rec-field span {
    font-size: 13px;
    font-weight:400;
    letter-spacing: var(--festag-tracking-small, 0.015em);
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
  .auth-rec-disabled-hint {
    margin: -2px 0 0;
    text-align: left;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: var(--festag-tracking-small, 0.015em);
    color: #8a8a90;
  }
  .auth-rec-actions {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .auth-rec-body + .auth-rec-actions {
    margin-top: 24px;
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
    transition: background .15s, border-color .15s, color .15s, transform .08s ease, box-shadow .15s, opacity .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .auth-rec-cta:hover:not(:disabled) {
    background: var(--festag-btn-dark-bg-hover, #f7f8fb);
    border-color: var(--festag-btn-dark-border-hover, #dce1ea);
    color: var(--festag-btn-dark-fg-hover, #1e1e20);
  }
  .auth-rec-cta:active:not(:disabled) {
    transform: scale(0.985);
    background: var(--festag-btn-dark-bg-active, #e8ebf0);
    border-color: var(--festag-btn-dark-border-active, #cfd5df);
    color: var(--festag-btn-dark-fg-active, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow-active,
      inset 0 1px 2px rgba(15, 23, 42, 0.07),
      0 0.5px 1px rgba(15, 23, 42, 0.03));
  }
  .auth-rec-cta:disabled,
  .auth-rec-cta--disabled {
    opacity: 1;
    cursor: not-allowed;
    background: rgba(30, 30, 32, 0.06);
    border-color: transparent;
    color: rgba(30, 30, 32, 0.38);
    box-shadow: none;
    pointer-events: none;
  }
  .auth-rec-cta--ghost {
    background: transparent;
    box-shadow: none;
    border-color: rgba(30, 30, 32, 0.12);
  }
  .auth-rec-cta--ghost.auth-rec-cta--disabled,
  .auth-rec-cta--ghost:disabled {
    background: rgba(30, 30, 32, 0.05);
    border-color: transparent;
    color: rgba(30, 30, 32, 0.38);
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
  .auth-rec-back:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
      border-radius: var(--festag-sheet-radius, 22px) var(--festag-sheet-radius, 22px) 0 0;
      border-bottom: none;
      padding: 0 var(--festag-sheet-gutter, 24px) calc(env(safe-area-inset-bottom, 0px) + 18px);
      isolation: isolate;
      background-clip: padding-box;
      box-shadow:
        0 -1px 2px rgba(0, 0, 0, 0.12),
        0 -24px 56px -20px rgba(15, 23, 42, 0.28);
      opacity: 0;
      transform: translate3d(0, 100%, 0);
      transition:
        opacity var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease, cubic-bezier(.16,1,.3,1)),
        transform var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease, cubic-bezier(.16,1,.3,1));
    }
    .auth-rec-backdrop.is-visible .auth-rec-panel {
      opacity: 1;
      transform: none;
    }
    .auth-rec-backdrop:not(.is-visible) .auth-rec-panel {
      transition:
        opacity var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease-out, cubic-bezier(.32,.72,0,1)),
        transform var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease-out, cubic-bezier(.32,.72,0,1));
    }
    .auth-rec-panel .festag-popup-drag-area {
      display: flex;
    }
    .auth-rec-panel .festag-popup-drag-handle {
      background: rgba(0, 0, 0, 0.12);
      opacity: 1;
    }
    .auth-rec-title,
    #auth-recovery-title,
    .auth-rec-panel h2.auth-rec-title {
      margin: 4px 0 20px;
      font-size: 22px !important;
      line-height: 1.32 !important;
    }
    .auth-rec-cta {
      height: 50px;
      font-size: 16px;
    }
    .auth-rec-actions {
      margin-top: 12px;
    }
    .auth-rec-body + .auth-rec-actions {
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
    background: var(--festag-black-popup, #18181c);
    border-color: transparent;
    box-shadow: 0 20px 48px rgba(0,0,0,0.55);
  }
  [data-theme="dark"] .auth-rec-title,
  [data-theme="dark"] #auth-recovery-title,
  [data-theme="dark"] .auth-rec-panel h2.auth-rec-title,
  .al-root[data-theme="dark"] .auth-rec-title,
  .al-root[data-theme="dark"] #auth-recovery-title,
  .al-root[data-theme="dark"] .auth-rec-panel h2.auth-rec-title,
  .dl-root[data-theme="dark"] .auth-rec-title,
  .dl-root[data-theme="dark"] #auth-recovery-title,
  .dl-root[data-theme="dark"] .auth-rec-panel h2.auth-rec-title {
    color: #f5f5f7 !important;
  }
  [data-theme="dark"] .auth-rec-title-muted,
  .al-root[data-theme="dark"] .auth-rec-title-muted,
  .dl-root[data-theme="dark"] .auth-rec-title-muted {
    color: rgba(186, 194, 210, 0.72) !important;
  }
  [data-theme="dark"] .auth-rec-title-strong,
  .al-root[data-theme="dark"] .auth-rec-title-strong,
  .dl-root[data-theme="dark"] .auth-rec-title-strong {
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
  .dl-root[data-theme="dark"] .auth-rec-back,
  [data-theme="dark"] .auth-rec-disabled-hint,
  .al-root[data-theme="dark"] .auth-rec-disabled-hint,
  .dl-root[data-theme="dark"] .auth-rec-disabled-hint {
    color: rgba(245,245,247,0.68);
  }
  [data-theme="dark"] .auth-rec-note,
  .al-root[data-theme="dark"] .auth-rec-note,
  .dl-root[data-theme="dark"] .auth-rec-note {
    background: rgba(186,194,210,0.10);
    color: rgba(245,245,247,0.68) !important;
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
    background: rgba(186,194,210,0.10);
    color: #f5f5f7;
  }
  [data-theme="dark"] .auth-rec-field input:focus,
  [data-theme="dark"] .auth-rec-field textarea:focus,
  .al-root[data-theme="dark"] .auth-rec-field input:focus,
  .al-root[data-theme="dark"] .auth-rec-field textarea:focus,
  .dl-root[data-theme="dark"] .auth-rec-field input:focus,
  .dl-root[data-theme="dark"] .auth-rec-field textarea:focus {
    background: rgba(186,194,210,0.14);
    box-shadow: 0 0 0 2px rgba(186,194,210,0.16);
  }
  [data-theme="dark"] .auth-rec-error,
  .al-root[data-theme="dark"] .auth-rec-error,
  .dl-root[data-theme="dark"] .auth-rec-error {
    color: #ff6961;
  }
  [data-theme="dark"] .auth-rec-cta,
  .al-root[data-theme="dark"] .auth-rec-cta,
  .dl-root[data-theme="dark"] .auth-rec-cta {
    background: var(--festag-btn-dark-bg, rgba(186,194,210,0.10));
    color: var(--festag-btn-dark-fg, rgba(245,245,247,0.62));
    border: 0.7px solid var(--festag-btn-dark-border, transparent);
    box-shadow: var(--festag-btn-dark-shadow, none);
  }
  [data-theme="dark"] .auth-rec-cta:hover:not(:disabled),
  .al-root[data-theme="dark"] .auth-rec-cta:hover:not(:disabled),
  .dl-root[data-theme="dark"] .auth-rec-cta:hover:not(:disabled) {
    background: var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.16));
    color: var(--festag-btn-dark-fg-hover, #f5f5f7);
    border-color: var(--festag-btn-dark-border-hover, transparent);
  }
  [data-theme="dark"] .auth-rec-cta:active:not(:disabled),
  .al-root[data-theme="dark"] .auth-rec-cta:active:not(:disabled),
  .dl-root[data-theme="dark"] .auth-rec-cta:active:not(:disabled) {
    background: var(--festag-btn-dark-bg-active, rgba(186,194,210,0.22));
    color: var(--festag-btn-dark-fg-active, #f5f5f7);
    border-color: var(--festag-btn-dark-border-active, transparent);
    box-shadow: var(--festag-btn-dark-shadow-active, none);
  }
  [data-theme="dark"] .auth-rec-cta:disabled,
  [data-theme="dark"] .auth-rec-cta--disabled,
  .al-root[data-theme="dark"] .auth-rec-cta:disabled,
  .al-root[data-theme="dark"] .auth-rec-cta--disabled,
  .dl-root[data-theme="dark"] .auth-rec-cta:disabled,
  .dl-root[data-theme="dark"] .auth-rec-cta--disabled {
    background: rgba(186,194,210,0.06);
    border-color: transparent;
    color: rgba(245,245,247,0.28);
    box-shadow: none;
  }
  [data-theme="dark"] .auth-rec-cta--ghost,
  .al-root[data-theme="dark"] .auth-rec-cta--ghost,
  .dl-root[data-theme="dark"] .auth-rec-cta--ghost {
    background: transparent;
    border-color: rgba(186,194,210,0.16);
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

  @media (prefers-reduced-motion: reduce) {
    .auth-rec-backdrop,
    .auth-rec-panel {
      transition: none !important;
    }
  }
`
