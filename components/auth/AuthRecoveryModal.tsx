'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagOutsideClickHint, isPointerOverOverlay } from '@/hooks/useFestagOutsideClickHint'
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
/** Client-side mirror of server Hybrid-B cooldown (10 min). */
const SUPPORT_COOLDOWN_MS = 10 * 60 * 1000

type LocalSupportEntry = { email: string; until: string }
type LocalSupportStore = {
  entries?: LocalSupportEntry[]
  deviceUntil?: string | null
}

/** First sentence / half stays strong; the rest uses Festag muted gray. */
function splitAuthPopupTitle(full: string): { lead: string; muted: string } {
  const trimmed = full.trim()
  const period = trimmed.indexOf('. ')
  if (period > 12 && period < trimmed.length * 0.72) {
    return { lead: trimmed.slice(0, period + 1), muted: trimmed.slice(period + 2) }
  }
  const em = trimmed.indexOf(' — ')
  if (em > 12) {
    return { lead: trimmed.slice(0, em), muted: trimmed.slice(em) }
  }
  const mid = Math.floor(trimmed.length / 2)
  const space = trimmed.indexOf(' ', mid)
  if (space > 0 && space < trimmed.length - 4) {
    return { lead: trimmed.slice(0, space), muted: trimmed.slice(space + 1) }
  }
  return { lead: trimmed, muted: '' }
}

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

function pruneLocalSupportStore(parsed: LocalSupportStore): LocalSupportStore {
  const now = Date.now()
  const entries = (Array.isArray(parsed.entries) ? parsed.entries : [])
    .filter(e => e?.email && e?.until && Date.parse(e.until) > now)
    .slice(-12)
  const deviceUntil =
    parsed.deviceUntil && Date.parse(parsed.deviceUntil) > now ? parsed.deviceUntil : null
  return { entries, deviceUntil }
}

function readLocalSupportCooldown(email: string): { locked: boolean; retryAfterSec: number } {
  if (typeof window === 'undefined') return { locked: false, retryAfterSec: 0 }
  try {
    const raw = window.localStorage.getItem(SUPPORT_LOCAL)
    if (!raw) return { locked: false, retryAfterSec: 0 }
    const legacy = JSON.parse(raw) as LocalSupportStore & {
      emails?: string[]
      device?: boolean
      at?: string
    }
    // Migrate permanent legacy flag → treat as expired (open again).
    if (Array.isArray(legacy.emails) && !legacy.entries) {
      window.localStorage.removeItem(SUPPORT_LOCAL)
      return { locked: false, retryAfterSec: 0 }
    }
    const store = pruneLocalSupportStore(legacy)
    window.localStorage.setItem(SUPPORT_LOCAL, JSON.stringify(store))
    const norm = email.trim().toLowerCase()
    const hit = norm
      ? store.entries?.find(e => e.email === norm)
      : store.deviceUntil
        ? { email: '', until: store.deviceUntil }
        : undefined
    const until = hit?.until || (!norm ? store.deviceUntil : null)
    if (!until) return { locked: false, retryAfterSec: 0 }
    const retryAfterSec = Math.max(0, Math.ceil((Date.parse(until) - Date.now()) / 1000))
    return { locked: retryAfterSec > 0, retryAfterSec }
  } catch {
    return { locked: false, retryAfterSec: 0 }
  }
}

function rememberLocalSupportSent(email: string, availableAt?: string | null) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(SUPPORT_LOCAL)
    const parsed = raw ? (JSON.parse(raw) as LocalSupportStore) : {}
    const store = pruneLocalSupportStore(parsed)
    const until =
      availableAt && Number.isFinite(Date.parse(availableAt))
        ? availableAt
        : new Date(Date.now() + SUPPORT_COOLDOWN_MS).toISOString()
    const norm = email.trim().toLowerCase()
    const entries = (store.entries || []).filter(e => e.email !== norm)
    if (norm) entries.push({ email: norm, until })
    window.localStorage.setItem(
      SUPPORT_LOCAL,
      JSON.stringify({
        entries: entries.slice(-12),
        deviceUntil: until,
      }),
    )
  } catch { /* ignore */ }
}

function formatRetryLabel(sec: number): string {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m <= 0) return `Wieder verfügbar in ${r} Sek.`
  return `Wieder verfügbar in ${m}:${String(r).padStart(2, '0')} Min.`
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
  const [supportRetryAfterSec, setSupportRetryAfterSec] = useState(0)
  const [showPassword, setShowPassword] = useState(variant === 'client')
  const [showPin, setShowPin] = useState(variant === 'dev')
  const [pinKind, setPinKind] = useState<'invite' | 'personal' | null>(null)
  const messageRef = useRef<HTMLTextAreaElement | null>(null)
  const supportAvailableAtRef = useRef<string | null>(null)
  const { showHint, onOverlayPointer, reset: resetOutsideHint } =
    useFestagOutsideClickHint(open, 1)

  const applySupportCooldown = useCallback((opts: {
    locked: boolean
    retryAfterSec?: number
    availableAt?: string | null
    email?: string
  }) => {
    const retry = Math.max(0, Math.floor(opts.retryAfterSec ?? 0))
    const locked = Boolean(opts.locked && retry > 0)
    const availableAt =
      locked
        ? (opts.availableAt && Number.isFinite(Date.parse(opts.availableAt))
            ? opts.availableAt
            : new Date(Date.now() + retry * 1000).toISOString())
        : null
    setSupportAlreadySent(locked)
    setSupportRetryAfterSec(locked ? retry : 0)
    supportAvailableAtRef.current = availableAt
    if (locked && opts.email) {
      rememberLocalSupportSent(opts.email, availableAt)
    }
  }, [])

  const syncTextareaHeight = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 96), 280)}px`
  }, [])

  useEffect(() => {
    if (open) resetOutsideHint()
  }, [open, resetOutsideHint])

  useEffect(() => {
    if (view === 'support') syncTextareaHeight(messageRef.current)
  }, [view, message, syncTextareaHeight])

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
      const localCool = readLocalSupportCooldown(initialEmail)
      applySupportCooldown({
        locked: localCool.locked,
        retryAfterSec: localCool.retryAfterSec,
        email: initialEmail,
      })

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
            applySupportCooldown({
              locked: true,
              retryAfterSec: Number(status.retryAfterSec) || 0,
              availableAt: status.availableAt ?? null,
              email: initialEmail,
            })
          } else {
            applySupportCooldown({ locked: false })
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
  }, [open, initialEmail, initialUsername, variant, applySupportCooldown])

  useEffect(() => {
    if (!supportAlreadySent) return
    const id = window.setInterval(() => {
      const until = supportAvailableAtRef.current
      if (!until) {
        applySupportCooldown({ locked: false })
        return
      }
      const left = Math.max(0, Math.ceil((Date.parse(until) - Date.now()) / 1000))
      if (left <= 0) {
        applySupportCooldown({ locked: false })
        return
      }
      setSupportRetryAfterSec(left)
    }, 1000)
    return () => window.clearInterval(id)
  }, [supportAlreadySent, applySupportCooldown])

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
        applySupportCooldown({
          locked: true,
          retryAfterSec: Number(status.retryAfterSec) || 0,
          availableAt: status.availableAt ?? null,
          email: trimmed,
        })
      } else {
        applySupportCooldown({ locked: false })
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
      setError(
        supportRetryAfterSec > 0
          ? `${formatRetryLabel(supportRetryAfterSec)} Passwort- oder PIN-Reset bleibt möglich.`
          : 'Support ist kurz gesperrt. Passwort- oder PIN-Reset bleibt möglich.',
      )
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
          applySupportCooldown({
            locked: true,
            retryAfterSec: Number(data?.retryAfterSec) || SUPPORT_COOLDOWN_MS / 1000,
            availableAt: data?.availableAt ?? null,
            email: trimmedEmail,
          })
          setError(
            data?.message ||
              `${formatRetryLabel(Number(data?.retryAfterSec) || SUPPORT_COOLDOWN_MS / 1000)} Passwort- oder PIN-Reset bleibt möglich.`,
          )
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
      applySupportCooldown({
        locked: true,
        retryAfterSec: Number(data?.retryAfterSec) || SUPPORT_COOLDOWN_MS / 1000,
        availableAt: data?.availableAt ?? null,
        email: trimmedEmail,
      })
      setView('supportDone')
    } catch {
      setError('Netzwerkproblem. Bitte Verbindung prüfen und erneut versuchen.')
    }
    setBusy(false)
  }

  if (!mounted) return null

  const titleId = 'auth-recovery-title'

  let title = 'Setze dein Passwort oder deinen PIN zurück, oder schreib uns — wir helfen dir weiter.'
  let body: ReactNode = null
  let actions: ReactNode = null

  if (view === 'menu') {
    const hasAnyReset = showPassword || showPin
    const cooldownHint = supportAlreadySent
      ? formatRetryLabel(supportRetryAfterSec)
      : ''
    body = supportAlreadySent ? (
      <div className="auth-rec-body">
        <p className="auth-rec-note">
          Deine Support-Anfrage ist unterwegs. {cooldownHint} Passwort- oder PIN-Reset bleibt weiterhin möglich.
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
            Per E-Mail zurücksetzen
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
            {variant === 'dev' ? 'PIN neu anfordern' : 'Per E-Mail zurücksetzen'}
          </button>
        ) : null}
        <button
          className={`auth-rec-cta auth-rec-cta--ghost${supportAlreadySent ? ' auth-rec-cta--disabled' : ''}`}
          type="button"
          disabled={supportAlreadySent}
          aria-disabled={supportAlreadySent}
          title={supportAlreadySent ? cooldownHint : undefined}
          onClick={() => {
            if (supportAlreadySent) return
            setError('')
            setView('support')
          }}
        >
          {supportAlreadySent ? 'Support kurz gesperrt' : 'Support kontaktieren'}
        </button>
        {supportAlreadySent ? (
          <p className="auth-rec-disabled-hint">{cooldownHint}</p>
        ) : null}
      </div>
    )
  } else if (view === 'reset') {
    title = 'Wir senden dir einen sicheren Link, mit dem du dein Passwort zurücksetzen kannst.'
    body = (
      <div className="auth-rec-body">
        <p>Gib die Adresse ein, mit der du dich bei Festag anmeldest.</p>
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
    title = 'Der sichere Link zum Zurücksetzen deines Passworts ist unterwegs.'
    body = (
      <div className="auth-rec-body">
        <p>Prüfe dein Postfach — der Link ist zeitlich begrenzt.</p>
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
    title = 'Wir senden dir einen neuen PIN an die hinterlegte E-Mail-Adresse.'
    body = (
      <div className="auth-rec-body">
        <p>Benutzername und Konto-E-Mail müssen zum Dev-Zugang passen.</p>
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
    title = 'Dein neuer PIN ist unterwegs.'
    body = (
      <div className="auth-rec-body">
        <p>
          {pinKind === 'invite'
            ? 'Neuer Einladungs-PIN folgt per E-Mail — danach Workspace einrichten.'
            : pinKind === 'personal'
              ? 'Neuer persönlicher PIN folgt per E-Mail — der bisherige wird ungültig.'
              : 'Neuer PIN folgt per E-Mail, wenn ein Konto existiert.'}
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
    title = 'Beschreibe kurz dein Anliegen, damit wir dir beim Zugang helfen können.'
    body = (
      <div className="auth-rec-body">
        <p>Schreib kurz, woran es scheitert — wir melden uns schnellstmöglich.</p>
        {supportAlreadySent ? (
          <p className="auth-rec-note">
            Anfrage gesendet. {formatRetryLabel(supportRetryAfterSec)} Passwort- oder PIN-Reset bleibt weiterhin möglich.
          </p>
        ) : (
          <>
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
                ref={messageRef}
                value={message}
                onChange={e => {
                  setMessage(e.target.value)
                  syncTextareaHeight(e.currentTarget)
                }}
                rows={3}
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
          title={supportAlreadySent ? formatRetryLabel(supportRetryAfterSec) : undefined}
          onClick={() => { void sendSupport() }}
        >
          {supportAlreadySent
            ? 'Support kurz gesperrt'
            : busy
              ? 'Wird gesendet…'
              : 'Anfrage senden'}
        </button>
      </div>
    )
  } else {
    title = 'Deine Anfrage ist bei uns eingegangen.'
    body = (
      <div className="auth-rec-body">
        <p>
          Wir prüfen den Zugang und melden uns bei dir. Support ist für 10 Minuten gesperrt — Reset bleibt offen.
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

  const { lead: titleLead, muted: titleMuted } = splitAuthPopupTitle(title)

  return (
    <div
      className={`auth-rec-backdrop${visible ? ' is-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={e => {
        if (isPointerOverOverlay(e, '.auth-rec-panel')) onClose()
      }}
      onPointerMove={e => {
        onOverlayPointer(isPointerOverOverlay(e, '.auth-rec-panel'))
      }}
      onPointerLeave={() => onOverlayPointer(false)}
    >
      <style>{RECOVERY_CSS}</style>
      {showHint ? (
        <p className="auth-rec-outside-hint" aria-hidden="true">
          Durch Klicken schließen.
        </p>
      ) : null}
      <div className="auth-rec-panel">
        <FestagPopupDragHandle onDismiss={onClose} visible={visible} />
        <div className="auth-rec-inner">
          <h2 id={titleId} className="auth-rec-title">
            {titleLead}
            {titleMuted ? (
              <>
                {' '}
                <span className="auth-rec-title-muted">{titleMuted}</span>
              </>
            ) : null}
          </h2>
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
    width: min(100%, 480px);
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
    margin: 0 0 18px;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 26px !important;
    font-weight: 400 !important;
    line-height: 1.28 !important;
    letter-spacing: -0.022em;
    color: #1e1e20;
  }
  .auth-rec-title-muted {
    color: var(--al-text-muted, #8891a0) !important;
  }
  .auth-rec-outside-hint {
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
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    white-space: nowrap;
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
    letter-spacing: var(--ls-body, 0.021em);
    color: var(--al-text-muted, #8891a0) !important;
  }
  .auth-rec-note {
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(30, 30, 32, 0.04);
    color: var(--al-text-muted, #8891a0) !important;
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
    color: var(--al-text-muted, #8891a0) !important;
  }
  .auth-rec-field input,
  .auth-rec-field textarea {
    width: 100%;
    border-radius: 999px;
    border: 1px solid var(--festag-input-border, rgba(30, 30, 32, 0.15));
    background: transparent;
    color: #1e1e20;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 400;
    outline: none;
    padding: 0 16px;
    resize: none;
    height: 45px;
    min-height: 45px;
    box-sizing: border-box;
    box-shadow: none;
    transition: border-color 0.2s ease;
  }
  .auth-rec-field input::placeholder,
  .auth-rec-field textarea::placeholder {
    color: var(--festag-input-placeholder, #8e95a3);
    -webkit-text-fill-color: var(--festag-input-placeholder, #8e95a3);
    opacity: 1;
  }
  .auth-rec-field textarea {
    border-radius: 18px;
    height: auto;
    min-height: 96px;
    max-height: 280px;
    padding: 12px 16px;
    line-height: 1.45;
    overflow-y: hidden;
  }
  .auth-rec-field input:focus,
  .auth-rec-field textarea:focus {
    background: transparent;
    border-width: var(--festag-input-border-width-focus, 1.5px);
    border-color: var(--festag-input-border-focus, #5B647D);
    box-shadow: none;
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
    border: 1px solid var(--festag-btn-dark-border, rgba(30, 30, 32, 0.08));
    background: var(--festag-btn-dark-bg, #ffffff);
    color: var(--festag-btn-dark-fg, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.04));
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-size: 13.5px;
    font-weight:400;
    letter-spacing: var(--ls-body, 0.021em);
    cursor: pointer;
    padding: 0 16px;
    white-space: nowrap;
    transition: background .15s, border-color .15s, color .15s, transform .08s ease, box-shadow .15s, opacity .15s;
    -webkit-appearance: none;
    appearance: none;
    -webkit-tap-highlight-color: transparent;
  }
  .auth-rec-cta:hover:not(:disabled) {
    background: var(--festag-btn-dark-bg-hover, #fafafa);
    border-color: var(--festag-btn-dark-border-hover, rgba(30, 30, 32, 0.08));
    color: var(--festag-btn-dark-fg-hover, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.04));
  }
  .auth-rec-cta:active:not(:disabled) {
    transform: scale(0.985);
    background: var(--festag-btn-dark-bg-active, #f5f5f6);
    border-color: var(--festag-btn-dark-border-active, #d8d8da);
    color: var(--festag-btn-dark-fg-active, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow-active, none);
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
  /* Ghost = same white SSO fill in light (never charcoal). */
  .auth-rec-cta--ghost {
    background: var(--festag-btn-dark-bg, #ffffff);
    color: var(--festag-btn-dark-fg, #1e1e20);
    border-color: var(--festag-btn-dark-border, #e5e5e6);
    box-shadow: var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.05));
  }
  .auth-rec-cta--ghost:hover:not(:disabled) {
    background: var(--festag-btn-dark-bg-hover, #fafafa);
    border-color: var(--festag-btn-dark-border-hover, rgba(30, 30, 32, 0.08));
    color: var(--festag-btn-dark-fg-hover, #1e1e20);
  }
  .auth-rec-cta--ghost:active:not(:disabled) {
    background: var(--festag-btn-dark-bg-active, #f5f5f6);
    border-color: var(--festag-btn-dark-border-active, #d8d8da);
    color: var(--festag-btn-dark-fg-active, #1e1e20);
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
    color: var(--al-text-muted, #8891a0);
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
        0 -1px 2px rgba(0, 0, 0, 0.09),
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
      background: rgba(0, 0, 0, 0.09);
      opacity: 1;
    }
    .auth-rec-title,
    #auth-recovery-title,
    .auth-rec-panel h2.auth-rec-title {
      margin: 4px 0 16px;
      font-size: 23px !important;
      line-height: 1.22 !important;
    }
    .auth-rec-body p {
      font-size: 16px;
      line-height: 1.62;
    }
    .auth-rec-cta {
      height: 45px;
      min-height: 45px;
      font-size: 15px;
      letter-spacing: -0.015em;
    }
    .auth-rec-outside-hint {
      top: max(20px, env(safe-area-inset-top));
      bottom: auto;
      font-size: 12.5px;
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
  [data-theme="classic-dark"] .auth-rec-panel,
  .al-root[data-theme="dark"] .auth-rec-panel,
  .dl-root[data-theme="dark"] .auth-rec-panel {
    background: var(--festag-black-popup, #1c1c1e);
    border-color: transparent;
    box-shadow: 0 20px 48px rgba(0,0,0,0.55);
  }
  @media (max-width: 768px) {
    [data-theme="dark"] .auth-rec-panel,
    [data-theme="classic-dark"] .auth-rec-panel,
    .al-root[data-theme="dark"] .auth-rec-panel,
    .dl-root[data-theme="dark"] .auth-rec-panel {
      border: none;
      background: var(--festag-black-popup, #1c1c1e);
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
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
  .dl-root[data-theme="dark"] .auth-rec-title-muted,
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
  .dl-root[data-theme="dark"] .auth-rec-disabled-hint,
  [data-theme="dark"] .auth-rec-note,
  .al-root[data-theme="dark"] .auth-rec-note,
  .dl-root[data-theme="dark"] .auth-rec-note {
    color: rgba(245, 245, 247, 0.55) !important;
  }
  [data-theme="dark"] .auth-rec-outside-hint,
  .al-root[data-theme="dark"] .auth-rec-outside-hint,
  .dl-root[data-theme="dark"] .auth-rec-outside-hint {
    color: rgba(245, 245, 247, 0.82);
  }
  [data-theme="dark"] .auth-rec-note,
  .al-root[data-theme="dark"] .auth-rec-note,
  .dl-root[data-theme="dark"] .auth-rec-note {
    background: rgba(186,194,210,0.26);
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
    background: transparent !important;
    color: var(--festag-input-fg, rgba(232, 236, 242, 0.94));
    -webkit-text-fill-color: var(--festag-input-fg, rgba(232, 236, 242, 0.94));
    caret-color: var(--festag-input-caret, rgba(198, 206, 222, 0.78));
    border: 1px solid var(--festag-input-border, rgba(255, 255, 255, 0.15)) !important;
    box-shadow: none;
    transition: border-color 0.2s ease;
  }
  [data-theme="dark"] .auth-rec-field input:focus,
  [data-theme="dark"] .auth-rec-field textarea:focus,
  .al-root[data-theme="dark"] .auth-rec-field input:focus,
  .al-root[data-theme="dark"] .auth-rec-field textarea:focus,
  .dl-root[data-theme="dark"] .auth-rec-field input:focus,
  .dl-root[data-theme="dark"] .auth-rec-field textarea:focus {
    background: transparent !important;
    border-width: var(--festag-input-border-width-focus, 1.5px) !important;
    border-color: var(--festag-input-border-focus, #5B647D) !important;
    box-shadow: none;
  }
  [data-theme="dark"] .auth-rec-error,
  .al-root[data-theme="dark"] .auth-rec-error,
  .dl-root[data-theme="dark"] .auth-rec-error {
    color: #ff6961;
  }
  [data-theme="dark"] .auth-rec-cta,
  [data-theme="dark"] .auth-rec-cta--ghost,
  .al-root[data-theme="dark"] .auth-rec-cta,
  .al-root[data-theme="dark"] .auth-rec-cta--ghost,
  .dl-root[data-theme="dark"] .auth-rec-cta,
  .dl-root[data-theme="dark"] .auth-rec-cta--ghost {
    background: var(--festag-btn-dark-bg, rgba(186,194,210,0.06));
    color: var(--festag-btn-dark-fg, rgba(245,245,247,0.88));
    border: 1px solid var(--festag-btn-dark-border, rgba(255,255,255,0.06));
    box-shadow: var(--festag-btn-dark-shadow, none);
  }
  [data-theme="dark"] .auth-rec-cta:hover:not(:disabled),
  [data-theme="dark"] .auth-rec-cta--ghost:hover:not(:disabled),
  .al-root[data-theme="dark"] .auth-rec-cta:hover:not(:disabled),
  .al-root[data-theme="dark"] .auth-rec-cta--ghost:hover:not(:disabled),
  .dl-root[data-theme="dark"] .auth-rec-cta:hover:not(:disabled),
  .dl-root[data-theme="dark"] .auth-rec-cta--ghost:hover:not(:disabled) {
    background: var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.09));
    color: var(--festag-btn-dark-fg-hover, #f5f5f7);
    border-color: var(--festag-btn-dark-border-hover, rgba(255,255,255,0.09));
    box-shadow: var(--festag-btn-dark-shadow-hover, none);
  }
  [data-theme="dark"] .auth-rec-cta:active:not(:disabled),
  [data-theme="dark"] .auth-rec-cta--ghost:active:not(:disabled),
  .al-root[data-theme="dark"] .auth-rec-cta:active:not(:disabled),
  .al-root[data-theme="dark"] .auth-rec-cta--ghost:active:not(:disabled),
  .dl-root[data-theme="dark"] .auth-rec-cta:active:not(:disabled),
  .dl-root[data-theme="dark"] .auth-rec-cta--ghost:active:not(:disabled) {
    background: var(--festag-btn-dark-bg-active, rgba(186,194,210,0.12));
    color: var(--festag-btn-dark-fg-active, #f5f5f7);
    border-color: var(--festag-btn-dark-border-active, rgba(255,255,255,0.07));
    box-shadow: var(--festag-btn-dark-shadow-active, none);
  }
  [data-theme="dark"] .auth-rec-cta:disabled,
  [data-theme="dark"] .auth-rec-cta--disabled,
  .al-root[data-theme="dark"] .auth-rec-cta:disabled,
  .al-root[data-theme="dark"] .auth-rec-cta--disabled,
  .dl-root[data-theme="dark"] .auth-rec-cta:disabled,
  .dl-root[data-theme="dark"] .auth-rec-cta--disabled {
    background: rgba(186,194,210,0.06);
    border: 1px solid rgba(255,255,255,0.04);
    color: rgba(245,245,247,0.28);
    box-shadow: none;
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
