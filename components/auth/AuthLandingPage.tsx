'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { getLastFestagAccount, getLastFestagEmail, getLastFestagMethod, getLastWorkspaceName, hasFestagDeviceAccount, rememberFestagAccount } from '@/lib/auth-device-memory'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import GoogleBrandIcon from '@/components/auth/GoogleBrandIcon'
import AppleBrandIcon from '@/components/auth/AppleBrandIcon'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import AuthSecurityModal from '@/components/auth/AuthSecurityModal'
import AuthWorkspacePath from '@/components/auth/AuthWorkspacePath'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import AuthOtpInput from '@/components/auth/AuthOtpInput'
import { prepareAuthRouteTransition, useAuthTheme, consumePanelEnter, isCrossPanelAuthNav } from '@/lib/auth-theme'
import { extractSsoDomain, peekSsoDomain, startSsoLogin } from '@/lib/auth-sso'
import {
  clearPendingWorkspaceName,
  getPendingWorkspaceName,
  getRememberedWorkspaceName,
  normalizeWorkspaceName,
  rememberWorkspaceName,
  setPendingWorkspaceName,
} from '@/lib/pending-workspace'

export type AuthLandingMode = 'login' | 'signup'

type Method = 'google' | 'apple' | 'email' | 'sso' | 'passkey' | 'github'
const METHOD_KEY = 'festag_last_method'

type AuthStep = 'main' | 'codeEntry' | 'sso'

function mapAuthError(raw: string, mode: AuthLandingMode = 'login'): string {
  const msg = String(raw || '').toLowerCase()
  if (raw && typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(`[festag/${mode}] auth error:`, raw)
  }
  // Rate limits are handled silently — previous OTP stays valid.
  if (
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('too many') ||
    msg.includes('email rate') ||
    msg.includes('security purposes') ||
    msg.includes('can only request this after')
  ) {
    return ''
  }
  if (msg.includes('signups not allowed'))
    return 'Neue Konten sind derzeit nicht freigeschaltet. Bitte kontaktiere uns.'
  if (msg.includes('user already registered') || msg.includes('already registered'))
    return 'Diese E-Mail ist bereits registriert. Wechsle zur Anmeldung.'
  if (msg.includes('user not found') || msg.includes('user_not_found'))
    return mode === 'login'
      ? 'Kein Account mit dieser E-Mail. Registriere dich zuerst.'
      : 'Anmeldung gerade nicht möglich. Bitte versuche es gleich erneut.'
  if (msg.includes('expired') || msg.includes('token has expired'))
    return 'Der Anmeldelink ist nicht mehr gültig. Fordere einen neuen Code an, um fortzufahren.'
  if (msg.includes('invalid token') || msg.includes('invalid otp') || msg.includes('invalid code') || msg.includes('token_hash') || msg.includes('otp_expired'))
    return 'Ungültiger oder abgelaufener Code. Fordere einen neuen an.'
  if (msg.includes('invalid email') || msg.includes('email address') || msg.includes('email_address_invalid'))
    return 'Bitte eine gültige E-Mail-Adresse verwenden.'
  if (msg.includes('network') || msg.includes('failed to fetch'))
    return 'Netzwerkproblem. Prüfe deine Verbindung und versuche es erneut.'
  if (msg.includes('captcha'))
    return 'Sicherheitsprüfung fehlgeschlagen. Lade die Seite neu und versuche es erneut.'
  if (msg.includes('sending') || msg.includes('mailer') || msg.includes('unexpected'))
    return 'E-Mail-Versand vorübergehend nicht möglich. Versuche es gleich erneut oder kontaktiere uns.'
  return mode === 'signup'
    ? 'Registrierung gerade nicht möglich. Bitte versuche es gleich erneut.'
    : 'Anmeldung gerade nicht möglich. Bitte versuche es gleich erneut.'
}

function isOtpRateLimited(raw: string): boolean {
  const msg = String(raw || '').toLowerCase()
  return (
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('too many') ||
    msg.includes('email rate') ||
    msg.includes('security purposes') ||
    msg.includes('can only request this after')
  )
}

function inferSessionMethod(user: any): Method {
  return user?.app_metadata?.provider === 'google' ? 'google' : 'email'
}

export default function AuthLandingPage({ mode }: { mode: AuthLandingMode }) {
  const isSignup = mode === 'signup'
  const supabase = createClient()
  const router = useRouter()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [authStep, setAuthStep] = useState<AuthStep>('main')
  const [animating, setAnimating] = useState(false)
  const [pageExiting, setPageExiting] = useState(false)
  const [panelEnter, setPanelEnter] = useState(false)
  const [email, setEmail] = useState('')
  const [ssoInput, setSsoInput] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const { mode: theme, setMode: setTheme } = useAuthTheme('client')
  const [booting, setBooting] = useState(true)
  const [lastMethod, setLastMethod] = useState<Method | null>(null)
  const [returningUser, setReturningUser] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [supportEmail, setSupportEmail] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [supportSending, setSupportSending] = useState(false)
  const [supportSent, setSupportSent] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const ssoRef = useRef<HTMLInputElement>(null)
  const wsNameRef = useRef<HTMLInputElement>(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [wsHydrated, setWsHydrated] = useState(false)
  const [wsAvailability, setWsAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [wsAvailabilityMsg, setWsAvailabilityMsg] = useState('')
  const [wsNameEditing, setWsNameEditing] = useState(true)
  const wsCheckSeq = useRef(0)
  const subFlow = authStep !== 'main'

  const inviteToken =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('invite')
      : null
  const postAuthNext = inviteToken
    ? `/invite/${inviteToken}`
    : (isSignup ? '/onboarding' : '/dashboard')

  const displayWorkspaceName = normalizeWorkspaceName(workspaceName)
  // Login: always „Festag“.
  // Register: wordmark tracks the typed name live (same string as under the title).
  // When the check returns free, the name is also persisted — no Enter needed.
  const wordmarkLabel =
    isSignup && displayWorkspaceName
      ? `Workspace ${displayWorkspaceName}`
      : 'Festag'
  const wsReadyForSignup =
    !isSignup ||
    !!inviteToken ||
    (wsAvailability === 'available' && !!displayWorkspaceName)

  async function checkWorkspaceNameAvailability(raw: string): Promise<{ ok: boolean; reason?: string }> {
    const trimmed = normalizeWorkspaceName(raw)
    const seq = ++wsCheckSeq.current
    if (!trimmed) {
      setWsAvailability('idle')
      setWsAvailabilityMsg('')
      return { ok: false, reason: 'Bitte einen Workspace-Namen eingeben.' }
    }
    setWsAvailability('checking')
    setWsAvailabilityMsg('')
    try {
      const res = await fetch(`/api/workspaces/check-name?name=${encodeURIComponent(trimmed)}`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (seq !== wsCheckSeq.current) return { ok: false }
      if (!data?.ok) {
        const reason = 'Name konnte gerade nicht geprüft werden.'
        setWsAvailability('invalid')
        setWsAvailabilityMsg(reason)
        return { ok: false, reason }
      }
      if (data.available) {
        setWsAvailability('available')
        setWsAvailabilityMsg('')
        // Persist immediately so the header/wordmark and later login greeting stay in sync
        // without requiring Enter or continuing the signup form.
        setPendingWorkspaceName(trimmed)
        rememberWorkspaceName(trimmed)
        setWsNameEditing(false)
        return { ok: true }
      }
      const reason = data.reason || 'Dieser Workspace-Name ist bereits vergeben.'
      setWsAvailability('taken')
      setWsAvailabilityMsg(reason)
      return { ok: false, reason }
    } catch {
      if (seq !== wsCheckSeq.current) return { ok: false }
      const reason = 'Name konnte gerade nicht geprüft werden.'
      setWsAvailability('invalid')
      setWsAvailabilityMsg(reason)
      return { ok: false, reason }
    }
  }

  function updateWorkspaceName(nextRaw: string) {
    const next = nextRaw.slice(0, 64)
    setWorkspaceName(next)
    setWsNameEditing(true)
    const trimmed = normalizeWorkspaceName(next)
    if (trimmed) {
      setPendingWorkspaceName(trimmed)
      setWsAvailability('checking')
      setWsAvailabilityMsg('')
    } else {
      setPendingWorkspaceName('')
      setWsAvailability('idle')
      setWsAvailabilityMsg('')
    }
    setError('')
  }

  function startEditingWorkspaceName() {
    setWsNameEditing(true)
    window.setTimeout(() => {
      wsNameRef.current?.focus()
      const len = wsNameRef.current?.value.length ?? 0
      try { wsNameRef.current?.setSelectionRange(len, len) } catch { /* noop */ }
    }, 30)
  }

  useEffect(() => {
    if (!isSignup || inviteToken) return
    const trimmed = normalizeWorkspaceName(workspaceName)
    if (!trimmed) return
    const t = window.setTimeout(() => {
      void checkWorkspaceNameAvailability(trimmed)
    }, 220)
    return () => window.clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceName, isSignup, inviteToken])

  async function bootstrapWorkspaceIfNeeded(name: string) {
    const trimmed = normalizeWorkspaceName(name)
    if (!trimmed || inviteToken) return true
    setPendingWorkspaceName(trimmed)
    try {
      const res = await fetch('/api/workspaces/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.message || 'Dieser Workspace-Name ist bereits vergeben.')
        setWsAvailability('taken')
        setWsAvailabilityMsg(data?.message || 'Dieser Workspace-Name ist bereits vergeben.')
        return false
      }
      clearPendingWorkspaceName()
      rememberWorkspaceName(trimmed)
      return true
    } catch {
      return true /* onboarding can still pick up pending name */
    }
  }

  async function requireWorkspaceName(): Promise<string | null> {
    if (!isSignup || inviteToken) return normalizeWorkspaceName(workspaceName) || getPendingWorkspaceName()
    const trimmed = normalizeWorkspaceName(workspaceName)
    if (!trimmed) {
      setError('Bitte gib zuerst deinem Workspace einen Namen.')
      wsNameRef.current?.focus()
      return null
    }
    const check = await checkWorkspaceNameAvailability(trimmed)
    if (!check.ok) {
      setError(check.reason || 'Dieser Workspace-Name ist bereits vergeben.')
      wsNameRef.current?.focus()
      return null
    }
    setPendingWorkspaceName(trimmed)
    rememberWorkspaceName(trimmed)
    return trimmed
  }

  function navigateWithFade(href: string) {
    router.prefetch(href)
    // Paint destination canvas first — exit fade must not reveal white html/body.
    const cross = isCrossPanelAuthNav(href)
    prepareAuthRouteTransition(href)
    setPageExiting(true)
    setTimeout(() => router.push(href), cross ? 210 : 160)
  }

  function switchAuthMode(targetPath: '/login' | '/register') {
    const url = new URL(targetPath, window.location.origin)
    if (inviteToken) url.searchParams.set('invite', inviteToken)
    if (email.trim()) url.searchParams.set('email', email.trim())
    const ws = normalizeWorkspaceName(workspaceName)
    if (ws) url.searchParams.set('ws', ws)
    const href = `${url.pathname}${url.search}`
    prepareAuthRouteTransition(href)
    // Instant route change — /login and /register are separate pages, so they remount.
    router.push(href)
  }

  async function routeSessionIfPresent() {
    let user: { id: string; email?: string | null } | null = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user ?? null
    } catch { user = null }
    if (!user) { setBooting(false); return false }

    const target = await resolvePostAuthTarget(supabase, user.id, '/dashboard')
    rememberFestagAccount({
      userId: user.id,
      email: user.email ?? null,
      method: lastMethod ?? inferSessionMethod(user),
      onboardingCompleted: target === '/dashboard',
      workspaceName: normalizeWorkspaceName(workspaceName) || getRememberedWorkspaceName(),
    })
    window.location.href = inviteToken ? `/invite/${inviteToken}` : target
    return true
  }

  useLayoutEffect(() => {
    if (wsHydrated) return
    try {
      const params = new URLSearchParams(window.location.search)
      const wsParam = normalizeWorkspaceName(params.get('ws') || '')
      const seed =
        wsParam ||
        getPendingWorkspaceName() ||
        getLastWorkspaceName() ||
        getRememberedWorkspaceName() ||
        ''
      if (seed) {
        setWorkspaceName(seed)
        rememberWorkspaceName(seed)
      }
    } catch {}
    setWsHydrated(true)
  }, [wsHydrated])

  useLayoutEffect(() => {
    if (consumePanelEnter() !== 'client') return
    setPanelEnter(true)
    const t = window.setTimeout(() => setPanelEnter(false), 360)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    routeSessionIfPresent()
    const bootTimer = setTimeout(() => setBooting(false), 2500)
    const params = new URLSearchParams(window.location.search)
    const known = hasFestagDeviceAccount()
    setReturningUser(known && !isSignup)
    const stored = known && !isSignup
      ? ((getLastFestagAccount()?.method ?? getLastFestagMethod()) as Method | null)
      : null
    setLastMethod(stored)
    try {
      const emailParam = params.get('email')
      if (emailParam && /\S+@\S+\.\S+/.test(emailParam)) {
        setEmail(emailParam)
      } else if (known && !isSignup) {
        const e = getLastFestagEmail()
        if (e && /\S+@\S+\.\S+/.test(e)) setEmail(e)
      }
    } catch {}
    return () => clearTimeout(bootTimer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Focus after boot so the email/workspace inputs are mounted (spinner unmounts them).
  // Returning users with a remembered Arbeits-E-Mail get stroke + blinking caret immediately.
  useEffect(() => {
    if (booting) return
    if (authStep !== 'main') return
    if (isSignup && !inviteToken) {
      const tries = [0, 50, 150, 250, 400]
      const timers = tries.map(ms => setTimeout(() => wsNameRef.current?.focus(), ms))
      return () => timers.forEach(clearTimeout)
    }
    // Login / invite-signup: focus emailRef (prefilled remembered address or empty field).
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => emailRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [authStep, isSignup, inviteToken, wsHydrated, booting])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  useEffect(() => {
    if (authStep !== 'sso') return
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => ssoRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [authStep])

  function saveMethod(method: Method) {
    localStorage.setItem(METHOD_KEY, method)
    setLastMethod(method)
  }

  function goTo(step: AuthStep) {
    setError('')
    setAnimating(true)
    setTimeout(() => { setAuthStep(step); setAnimating(false) }, 220)
  }

  function switchBack() {
    setCode('')
    goTo('main')
  }

  function openSsoFlow() {
    setError('')
    setSsoInput(ssoInput.trim() || email.trim())
    goTo('sso')
  }

  async function handleGoogle() {
    setError('')
    const ws = await requireWorkspaceName()
    if (isSignup && !inviteToken && !ws) return
    if (ws) setPendingWorkspaceName(ws)
    saveMethod('google')
    setOauthLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postAuthNext)}`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (oauthError) { setError(mapAuthError(oauthError.message, mode)); setOauthLoading(false) }
  }

  async function handleApple() {
    setError('')
    const ws = await requireWorkspaceName()
    if (isSignup && !inviteToken && !ws) return
    if (ws) setPendingWorkspaceName(ws)
    saveMethod('apple')
    setOauthLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postAuthNext)}`,
      },
    })
    if (oauthError) {
      setError('Apple-Anmeldung gerade nicht verfügbar.')
      setOauthLoading(false)
    }
  }

  async function handleSsoSubmit() {
    setError('')
    const domain = extractSsoDomain(ssoInput)
    if (!domain) {
      setError('Bitte eine Arbeits-E-Mail oder Firmen-Domain eingeben (z. B. name@firma.de).')
      return
    }
    saveMethod('sso')
    setOauthLoading(true)
    const result = await startSsoLogin({
      supabase,
      domain,
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postAuthNext)}`,
    })
    if (!result.ok) {
      setError(result.error)
      setOauthLoading(false)
      return
    }
    window.location.href = result.url
  }

  async function sendMagicLink(): Promise<'ok' | 'rate_limited' | 'error'> {
    const ws = isSignup ? (normalizeWorkspaceName(workspaceName) || getPendingWorkspaceName()) : null
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postAuthNext)}`,
        shouldCreateUser: isSignup,
        data: ws ? { pending_workspace_name: ws } : undefined,
      },
    })
    if (otpError) {
      if (isOtpRateLimited(otpError.message)) return 'rate_limited'
      const mapped = mapAuthError(otpError.message, mode)
      if (mapped) setError(mapped)
      return 'error'
    }
    return 'ok'
  }

  async function handleEmailSubmit() {
    setError('')
    const ws = await requireWorkspaceName()
    if (isSignup && !inviteToken && !ws) return
    if (!email.trim()) { setError('Bitte E-Mail-Adresse eingeben.'); return }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError('Bitte eine gültige E-Mail-Adresse eingeben.'); return }
    setLoading(true)
    const result = await sendMagicLink()
    setLoading(false)
    // Rate-limit = still continue — the earlier code remains valid.
    if (result === 'ok' || result === 'rate_limited') {
      setError('')
      saveMethod('email')
      setResendCooldown(result === 'ok' ? 60 : 30)
      goTo('codeEntry')
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return
    setError('')
    setResending(true)
    const result = await sendMagicLink()
    setResending(false)
    if (result === 'ok') setResendCooldown(60)
    else if (result === 'rate_limited') {
      setError('')
      setResendCooldown(30)
    }
  }

  async function handleVerifyCode(nextCode?: string) {
    setError('')
    const trimmed = String(nextCode ?? code).trim()
    if (!trimmed || trimmed.length < 6) { setError('Bitte vollständigen Code eingeben.'); return }
    setLoading(true)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(), token: trimmed, type: 'email',
    })
    setLoading(false)
    if (verifyError) { setError(mapAuthError(verifyError.message, mode)); return }
    saveMethod('email')
    const { data: { session } } = await supabase.auth.getSession()
    const target = session
      ? await resolvePostAuthTarget(supabase, session.user.id, '/dashboard')
      : (isSignup ? '/onboarding' : '/dashboard')
    if (session) {
      await supabase
        .from('onboarding_state')
        .upsert({ user_id: session.user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }
    if (session) {
      const ws =
        normalizeWorkspaceName(workspaceName) ||
        getPendingWorkspaceName() ||
        (typeof session.user.user_metadata?.pending_workspace_name === 'string'
          ? session.user.user_metadata.pending_workspace_name
          : '')
      if (isSignup && ws) {
        const bootOk = await bootstrapWorkspaceIfNeeded(ws)
        if (!bootOk) return
      }
      rememberFestagAccount({
        userId: session.user.id,
        email: email.trim(),
        method: 'email',
        onboardingCompleted: target === '/dashboard' || target === '/dev',
        workspaceName: normalizeWorkspaceName(ws) || getRememberedWorkspaceName(),
      })
    } else {
      try { localStorage.setItem('festag_last_email', email.trim()) } catch {}
    }
    window.location.href = inviteToken ? `/invite/${inviteToken}` : target
  }

  function openSupportModal() {
    setSupportSent(false)
    setSupportEmail(email)
    setSupportMessage(
      email
        ? `Ich finde meine Anmelde-E-Mail nicht mehr. Vermutete Adresse: ${email}`
        : 'Ich finde meine Anmelde-E-Mail nicht mehr und brauche Hilfe beim Zugriff auf mein Festag-Konto.'
    )
    setSupportOpen(true)
  }

  async function sendSupportRequest() {
    const message = [
      supportMessage.trim(),
      supportEmail.trim() ? `Kontakt-E-Mail: ${supportEmail.trim()}` : '',
    ].filter(Boolean).join('\n\n')

    if (!message) {
      setError('Bitte beschreibe kurz, womit wir helfen können.')
      return
    }

    setSupportSending(true)
    setError('')
    try {
      const res = await fetch('/api/support/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, page: isSignup ? '/register' : '/login' }),
      })
      if (!res.ok) throw new Error('support failed')
      setSupportSent(true)
      setSupportMessage('')
    } catch {
      setError('Support-Anfrage konnte gerade nicht gesendet werden. Bitte versuche es gleich erneut.')
    }
    setSupportSending(false)
  }

  const resendDisabled = resending || resendCooldown > 0
  const resendLabel = resending
    ? 'Wird gesendet…'
    : resendCooldown > 0
      ? `Neuen Code anfordern in ${resendCooldown}s`
      : 'Neuen Code anfordern'

  const googleButton = (
    <button
      className="al-btn al-btn-google"
      type="button"
      onClick={handleGoogle}
      disabled={oauthLoading || (isSignup && !inviteToken && !wsReadyForSignup)}
    >
      {oauthLoading ? (
        <span className="al-loader" />
      ) : (
        <GoogleBrandIcon />
      )}
      <span>{isSignup ? 'Mit Google registrieren' : 'Mit Google fortfahren'}</span>
    </button>
  )

  const appleButton = (
    <button
      className="al-btn al-btn-apple"
      type="button"
      onClick={handleApple}
      disabled={oauthLoading || (isSignup && !inviteToken && !wsReadyForSignup)}
    >
      <AppleBrandIcon />
      <span>{isSignup ? 'Mit Apple registrieren' : 'Mit Apple fortfahren'}</span>
    </button>
  )

  const mainSignIn = (
    <div className="al-signin-stack">
      {error && <p className="al-error">{error}</p>}

      <div className="al-method-group">
        {googleButton}
        {appleButton}
        {!isSignup && lastMethod === 'google' && <p className="al-hint">Zuletzt mit Google angemeldet</p>}
        {!isSignup && lastMethod === 'apple' && <p className="al-hint">Zuletzt mit Apple angemeldet</p>}
      </div>

      <div className="al-divider" aria-hidden="true">
        <span>oder</span>
      </div>

      <div className="al-method-group">
        <input
          ref={emailRef}
          className="al-input"
          type="email"
          autoComplete="email"
          placeholder="Arbeits-E-Mail eingeben"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleEmailSubmit() }}
        />
        <button
          className="al-btn al-btn-primary"
          type="button"
          onClick={handleEmailSubmit}
          disabled={loading || (isSignup && !inviteToken && !wsReadyForSignup)}
        >
          {loading ? 'Wird gesendet…' : 'Weiter'}
        </button>
        {!isSignup && lastMethod === 'email' && <p className="al-hint">Zuletzt damit angemeldet</p>}
      </div>

      <div className="al-method-group al-sso-group">
        <button className="al-btn al-btn-ghost" type="button" onClick={openSsoFlow} disabled={oauthLoading}>
          Single Sign-On (SSO)
        </button>
        {!isSignup && lastMethod === 'sso' && <p className="al-hint">Zuletzt damit angemeldet</p>}
      </div>
    </div>
  )

  const ssoDomainPreview = peekSsoDomain(ssoInput)

  const ssoScreen = (
    <div className="al-signin-stack">
      {error && <p className="al-error">{error}</p>}
      <p className="al-flow-info">
        {ssoDomainPreview ? (
          <>
            Weiter mit Firmen-Domain{' '}
            <strong>{ssoDomainPreview}</strong>
          </>
        ) : (
          <>Arbeits-E-Mail oder Firmen-Domain eingeben. Wir leiten Sie zum Login Ihres Unternehmens weiter.</>
        )}
      </p>
      <input
        ref={ssoRef}
        className="al-input"
        type="text"
        autoComplete="username"
        inputMode="email"
        placeholder="Arbeits-E-Mail eingeben"
        value={ssoInput}
        onChange={e => setSsoInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSsoSubmit() }}
        spellCheck={false}
        autoCapitalize="none"
      />
      <button
        className="al-btn al-btn-primary"
        type="button"
        onClick={handleSsoSubmit}
        disabled={oauthLoading || !ssoDomainPreview}
      >
        {oauthLoading ? 'Weiterleitung…' : 'Weiter'}
      </button>
      <button className="al-back" type="button" onClick={switchBack} disabled={oauthLoading}>Zurück</button>
    </div>
  )

  const codeEntryScreen = (
    <div className="al-signin-stack">
      {error && <p className="al-error">{error}</p>}
      <p className="al-flow-info">
        Geschickt an <strong>{email}</strong>
      </p>
      <AuthOtpInput
        value={code}
        onChange={setCode}
        onComplete={full => { void handleVerifyCode(full) }}
        disabled={loading}
        autoFocus
      />
      <button className="al-btn al-btn-primary" type="button" onClick={() => handleVerifyCode()} disabled={loading}>
        {loading ? 'Wird geprüft…' : (isSignup ? 'Konto erstellen' : 'Anmelden')}
      </button>
      <button className="al-link" type="button" onClick={handleResend} disabled={resendDisabled}>
        {resendLabel}
      </button>
      {!isSignup && (
        <p className="al-support-note">
          Anmelde-E-Mail vergessen?{' '}
          <button type="button" onClick={openSupportModal}>Support kontaktieren</button>
        </p>
      )}
      <button className="al-back" type="button" onClick={switchBack}>Zurück</button>
    </div>
  )

  const legal = (
    <div className="al-agreements">
      <p className="al-agreements-text">
        {isSignup
          ? 'Mit der Registrierung stimmen Sie den '
          : 'Mit der Anmeldung oder Registrierung stimmen Sie den '}
        <a href="/agb" onClick={e => { e.preventDefault(); navigateWithFade('/agb') }}>AGB</a>,{' '}
        <a href="/nutzungsbedingungen" onClick={e => { e.preventDefault(); navigateWithFade('/nutzungsbedingungen') }}>Nutzungsbedingungen</a> und der{' '}
        <a href="/datenschutz" onClick={e => { e.preventDefault(); navigateWithFade('/datenschutz') }}>Datenschutzerklärung</a> zu.
      </p>
    </div>
  )

  if (booting) {
    return (
      <main
        data-theme={theme}
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <style>{`@keyframes alboot{to{transform:rotate(360deg)}}`}</style>
        <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(168,176,188,.25)', borderTopColor: 'rgba(168,176,188,.9)', animation: 'alboot .8s linear infinite' }} />
      </main>
    )
  }

  return (
    <main
      className={`al-root al-root--centered${pageExiting ? ' exiting' : ''}${panelEnter ? ' al-panel-enter' : ''}`}
      data-theme={theme}
    >
      <style>{AUTH_LANDING_STYLES}</style>

      <div className="al-container">
        <header className="al-header">
          <a
            key={wordmarkLabel}
            className="al-wordmark"
            href="/"
            onClick={e => { e.preventDefault(); navigateWithFade('/') }}
          >
            {wordmarkLabel}
          </a>
          <div className="al-header-actions">
            <AuthDocsPopover />
            <button
              type="button"
              className="al-theme-icon al-theme-icon--header"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
            </button>
          </div>
        </header>

        <main className="al-main">
          <div className={`al-desktop-stage al-desktop-stage--centered${subFlow ? ' al-desktop-stage--focus' : ''}`}>
            <div className="al-desktop-left">
              <div className="al-mobile-sheet">
                <div className="al-sheet-body">
                  <section className="al-signin" aria-label={isSignup ? 'Festag Registrierung' : 'Festag Anmeldung'}>
                    <div className="al-signin-head">
                      {!subFlow ? (
                        <div className="al-hero-copy">
                          <h1 className="al-title al-title-display">
                            {isSignup
                              ? 'Workspace erstellen'
                              : (returningUser ? 'Willkommen zurück' : 'Anmelden')}
                          </h1>
                          {isSignup && !inviteToken ? (
                            <>
                              {wsAvailability === 'available' && displayWorkspaceName && !wsNameEditing ? (
                                <AuthWorkspacePath
                                  name={displayWorkspaceName}
                                  onEdit={startEditingWorkspaceName}
                                />
                              ) : (
                                <label className={`al-ws-name-line${workspaceName ? ' has-value' : ''}`}>
                                  <span className="sr-only">Workspace-Name</span>
                                  <input
                                    ref={wsNameRef}
                                    className="al-ws-name-input"
                                    type="text"
                                    value={workspaceName}
                                    onChange={e => updateWorkspaceName(e.target.value)}
                                    onInput={e => updateWorkspaceName((e.target as HTMLInputElement).value)}
                                    placeholder=""
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="words"
                                    spellCheck={false}
                                    maxLength={64}
                                    aria-label="Workspace-Name"
                                    aria-invalid={wsAvailability === 'taken' || wsAvailability === 'invalid'}
                                  />
                                </label>
                              )}
                              {wsAvailability === 'checking' && displayWorkspaceName ? (
                                <p className="al-ws-status">Wird geprüft…</p>
                              ) : null}
                              {wsAvailability === 'available' && displayWorkspaceName ? (
                                <p className="al-ws-status al-ws-status--ok">Name ist frei</p>
                              ) : null}
                              {(wsAvailability === 'taken' || wsAvailability === 'invalid') && wsAvailabilityMsg ? (
                                <p className="al-ws-status al-ws-status--bad">{wsAvailabilityMsg}</p>
                              ) : null}
                            </>
                          ) : !isSignup && displayWorkspaceName ? (
                            <AuthWorkspacePath name={displayWorkspaceName} />
                          ) : null}
                        </div>
                      ) : authStep === 'sso' ? (
                        <div className="al-hero-copy">
                          <h1 className="al-title al-title-display">
                            Firmen-Login
                          </h1>
                          {displayWorkspaceName ? (
                            <AuthWorkspacePath name={displayWorkspaceName} />
                          ) : null}
                        </div>
                      ) : (
                        <div className="al-hero-copy">
                          <h1 className="al-title al-title-display">
                            Prüfen Sie Ihre E-Mails
                          </h1>
                          {displayWorkspaceName ? (
                            <AuthWorkspacePath name={displayWorkspaceName} />
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className={`al-content${animating ? ' animating' : ''}${subFlow ? ' al-content--sub' : ''}`}>
                      {authStep === 'main' ? mainSignIn : authStep === 'sso' ? ssoScreen : codeEntryScreen}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>

        {!subFlow && legal}

        <footer className="al-footer-meta">
          <button
            type="button"
            className="al-theme-icon al-theme-icon--footer"
            aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
          </button>
          <div className="al-footer-links">
            <a className="al-dev-link" href="/dev/login" onClick={e => { e.preventDefault(); navigateWithFade('/dev/login') }}>Dev Zugang</a>
            <span className="al-footer-sep" aria-hidden="true">|</span>
            <button
              type="button"
              className="al-ssl-badge"
              aria-label="Sicherheit und Verschlüsselung"
              onClick={() => setSecurityOpen(true)}
            >
              <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M5.5 0.5C3.84315 0.5 2.5 1.84315 2.5 3.5V5H1.5C0.947715 5 0.5 5.44772 0.5 6V11.5C0.5 12.0523 0.947715 12.5 1.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6C10.5 5.44772 10.0523 5 9.5 5H8.5V3.5C8.5 1.84315 7.15685 0.5 5.5 0.5ZM3.5 5V3.5C3.5 2.39543 4.39543 1.5 5.5 1.5C6.60457 1.5 7.5 2.39543 7.5 3.5V5H3.5Z" fill="currentColor"/>
              </svg>
              <span>SSL, End-to-End verschlüsselt</span>
            </button>
            <span className="al-footer-sep" aria-hidden="true">|</span>
            {isSignup ? (
              <a
                className="al-dev-link"
                href="/login"
                onClick={e => { e.preventDefault(); switchAuthMode('/login') }}
              >
                Anmelden
              </a>
            ) : (
              <a
                className="al-dev-link"
                href="/register"
                onClick={e => { e.preventDefault(); switchAuthMode('/register') }}
              >
                Registrieren
              </a>
            )}
          </div>
        </footer>
      </div>

      {supportOpen && (
        <div className="al-support-backdrop" role="dialog" aria-modal="true" aria-labelledby="login-support-title">
          <div className="al-support-modal">
            <div className="al-support-head">
              <div>
                <h2 id="login-support-title">Zugang wiederfinden</h2>
                <p>Schreib uns kurz, welche E-Mail oder Firma zu deinem Konto gehört. Wir melden uns direkt bei dir.</p>
              </div>
              <button className="al-support-close" type="button" onClick={() => setSupportOpen(false)} aria-label="Support schließen">×</button>
            </div>

            {supportSent ? (
              <>
                <p className="al-support-success">Danke, deine Anfrage ist angekommen. Wir prüfen den Zugang und melden uns bei dir.</p>
                <div className="al-support-actions">
                  <button className="al-btn al-btn-primary" type="button" onClick={() => setSupportOpen(false)}>Schließen</button>
                </div>
              </>
            ) : (
              <>
                <label className="al-support-field">
                  <span>Kontakt-E-Mail</span>
                  <input value={supportEmail} onChange={event => setSupportEmail(event.target.value)} placeholder="name@firma.de" type="email" />
                </label>
                <label className="al-support-field">
                  <span>Nachricht</span>
                  <textarea value={supportMessage} onChange={event => setSupportMessage(event.target.value)} rows={4} placeholder="Ich brauche Hilfe beim Login..." />
                </label>
                <div className="al-support-actions">
                  <button className="al-btn al-btn-ghost" type="button" onClick={() => setSupportOpen(false)}>Abbrechen</button>
                  <button className="al-btn al-btn-primary" type="button" onClick={sendSupportRequest} disabled={supportSending}>
                    {supportSending ? 'Wird gesendet…' : 'Anfrage senden'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <AuthSecurityModal open={securityOpen} onClose={() => setSecurityOpen(false)} />
    </main>
  )
}
