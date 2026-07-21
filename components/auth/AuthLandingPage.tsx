'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Code, Moon, Sun } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { getLastFestagAccount, getLastFestagEmail, getLastFestagMethod, getLastWorkspaceName, hasFestagDeviceAccount, rememberFestagAccount } from '@/lib/auth-device-memory'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import GoogleBrandIcon from '@/components/auth/GoogleBrandIcon'
import AppleBrandIcon from '@/components/auth/AppleBrandIcon'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import AuthSecurityModal from '@/components/auth/AuthSecurityModal'
import AuthPanelSwitchModal from '@/components/auth/AuthPanelSwitchModal'
import AuthRecoveryModal from '@/components/auth/AuthRecoveryModal'
import AuthWorkspacePath, { truncateWorkspaceLabel } from '@/components/auth/AuthWorkspacePath'
import AuthExpandableTextField from '@/components/auth/AuthExpandableTextField'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import AuthOtpInput from '@/components/auth/AuthOtpInput'
import AuthHelpAccordion from '@/components/auth/AuthHelpAccordion'
import { prepareAuthRouteTransition, useAuthTheme, consumePanelEnter } from '@/lib/auth-theme'
import { rememberAuthEntry } from '@/lib/auth-entry'
import { checkSsoDomain, extractSsoDomain, peekSsoDomain, startSsoLogin, type SsoDomainCheck } from '@/lib/auth-sso'
import {
  getPendingWorkspaceName,
  getRememberedWorkspaceName,
  normalizeWorkspaceName,
  rememberWorkspaceName,
  setPendingWorkspaceName,
} from '@/lib/pending-workspace'
import { bootstrapPersonalWorkspace } from '@/lib/workspace-bootstrap-client'
import { isLegalPath, rememberLegalReturn } from '@/lib/legal-return'

export type AuthLandingMode = 'login' | 'signup'

type Method = 'google' | 'apple' | 'email' | 'sso' | 'passkey' | 'github'
const METHOD_KEY = 'festag_last_method'
/** Soft login ↔ register handoff — skip boot spinner, content fade only. */
const AUTH_SOFT_MODE_KEY = 'festag_auth_soft_mode'

function consumeSoftAuthModeSwitch(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (sessionStorage.getItem(AUTH_SOFT_MODE_KEY) === '1') {
      sessionStorage.removeItem(AUTH_SOFT_MODE_KEY)
      return true
    }
  } catch { /* noop */ }
  return false
}

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
  if (msg.includes('sending') || msg.includes('mailer') || msg.includes('mail_failed') || msg.includes('unexpected'))
    return 'E-Mail-Versand gerade nicht möglich. Nutze Apple oder Google, oder versuche es gleich erneut.'
  if (msg.includes('otp_failed') || msg.includes('service_unavailable'))
    return 'Anmeldung vorübergehend nicht möglich. Bitte versuche es gleich erneut.'
  return mode === 'signup'
    ? 'Registrierung gerade nicht möglich. Bitte versuche es gleich erneut.'
    : 'Anmeldung gerade nicht möglich. Bitte versuche es gleich erneut.'
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
  const [softModeEnter] = useState(() => consumeSoftAuthModeSwitch())
  const [booting, setBooting] = useState(() => !softModeEnter)
  const [panelSwitchOpen, setPanelSwitchOpen] = useState(false)
  const [lastMethod, setLastMethod] = useState<Method | null>(null)
  const [returningUser, setReturningUser] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const ssoRef = useRef<HTMLInputElement>(null)
  const wsNameRef = useRef<HTMLInputElement>(null)
  const mainAutoFocused = useRef(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [wsHydrated, setWsHydrated] = useState(false)
  const [wsAvailability, setWsAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [wsAvailabilityMsg, setWsAvailabilityMsg] = useState('')
  const [wsNameEditing, setWsNameEditing] = useState(true)
  const wsCheckSeq = useRef(0)
  const wsAvailabilityRef = useRef(wsAvailability)
  const displayWorkspaceNameRef = useRef('')
  wsAvailabilityRef.current = wsAvailability
  const subFlow = authStep !== 'main'
  const emailReady = email.trim().length > 0
  const ssoDomainPreview = peekSsoDomain(ssoInput)
  const ssoReady = Boolean(ssoDomainPreview)
  const [ssoDomainCheck, setSsoDomainCheck] = useState<SsoDomainCheck | null>(null)
  const [ssoChecking, setSsoChecking] = useState(false)

  const inviteToken =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('invite')
      : null
  const postAuthNext = inviteToken
    ? `/invite/${inviteToken}`
    : (isSignup ? '/create-workspace' : '/dashboard')

  const displayWorkspaceName = normalizeWorkspaceName(workspaceName)
  displayWorkspaceNameRef.current = displayWorkspaceName
  // Login: always „Festag“.
  // Register: wordmark tracks the typed name live (same string as under the title).
  // When the check returns free, the name is also persisted — no Enter needed.
  const wordmarkLabel =
    isSignup && displayWorkspaceName
      ? `Workspace ${truncateWorkspaceLabel(displayWorkspaceName).text}`
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
        const reason = 'Prüfung nicht möglich.'
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
        // Settle to muted /name when the field is not focused (blur / check finished idle).
        if (document.activeElement !== wsNameRef.current) {
          setWsNameEditing(false)
        }
        return { ok: true }
      }
      const reason = 'Bereits vergeben'
      setWsAvailability('taken')
      setWsAvailabilityMsg(reason)
      return { ok: false, reason: 'Dieser Workspace-Name ist bereits vergeben.' }
    } catch {
      if (seq !== wsCheckSeq.current) return { ok: false }
      const reason = 'Prüfung nicht möglich.'
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

  /** Blur → muted `/name` chip when available (same as Login / Dev path settle). */
  function handleWorkspaceNameBlur() {
    window.setTimeout(() => {
      if (wsNameRef.current && document.activeElement === wsNameRef.current) return
      if (
        wsAvailabilityRef.current === 'available' &&
        displayWorkspaceNameRef.current
      ) {
        setWsNameEditing(false)
      }
    }, 0)
  }

  useEffect(() => {
    if (!isSignup) rememberAuthEntry('client')
  }, [isSignup])

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

  async function bootstrapWorkspaceIfNeeded(name: string): Promise<'ok' | 'fail' | 'defer'> {
    const trimmed = normalizeWorkspaceName(name)
    if (!trimmed || inviteToken) return 'ok'
    const result = await bootstrapPersonalWorkspace(trimmed)
    if (result.ok) return 'ok'
    if (result.reason === 'network' || result.status === 0) {
      // Session is valid — finish naming on the dedicated setup screen.
      setPendingWorkspaceName(trimmed)
      return 'defer'
    }
    setError(result.message)
    setWsAvailability('taken')
    setWsAvailabilityMsg(result.message)
    return 'fail'
  }

  async function requireWorkspaceName(): Promise<string | null> {
    if (!isSignup || inviteToken) return normalizeWorkspaceName(workspaceName) || getPendingWorkspaceName()
    const trimmed = normalizeWorkspaceName(workspaceName)
    if (!trimmed) {
      setError('Bitte gib zuerst deinem Workspace einen Namen.')
      wsNameRef.current?.focus()
      return null
    }
    // Reuse the live debounce result — avoid a second /check-name round-trip on CTA.
    if (wsAvailability === 'available') {
      setPendingWorkspaceName(trimmed)
      rememberWorkspaceName(trimmed)
      return trimmed
    }
    if (wsAvailability === 'taken' || wsAvailability === 'invalid') {
      setError(wsAvailabilityMsg || 'Dieser Workspace-Name ist bereits vergeben.')
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
    try {
      const path = new URL(href, window.location.origin).pathname
      if (isLegalPath(path)) rememberLegalReturn()
      if (path === '/dev/login' || path.startsWith('/dev/login/')) rememberAuthEntry('dev')
      if (path === '/login' || path.startsWith('/login/')) rememberAuthEntry('client')
    } catch { /* noop */ }
    prepareAuthRouteTransition(href)
    setPageExiting(true)
    requestAnimationFrame(() => router.push(href))
  }

  function switchAuthMode(targetPath: '/login' | '/register') {
    const url = new URL(targetPath, window.location.origin)
    if (inviteToken) url.searchParams.set('invite', inviteToken)
    if (email.trim()) url.searchParams.set('email', email.trim())
    const ws = normalizeWorkspaceName(workspaceName)
    if (ws) url.searchParams.set('ws', ws)
    const href = `${url.pathname}${url.search}`
    router.prefetch(href)
    prepareAuthRouteTransition(href)
    // Same soft exit as SSO / code steps — no full remount flash or boot spinner.
    setAnimating(true)
    try { sessionStorage.setItem(AUTH_SOFT_MODE_KEY, '1') } catch { /* noop */ }
    window.setTimeout(() => { router.push(href) }, 110)
  }

  function prefetchAuthHref(href: string) {
    try { router.prefetch(href) } catch { /* noop */ }
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
    const t = window.setTimeout(() => setPanelEnter(false), 280)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    void routeSessionIfPresent()
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
    // Soft login ↔ register: UI already painted — never re-arm the boot spinner.
    if (softModeEnter) return
    const bootTimer = setTimeout(() => setBooting(false), 1200)
    return () => clearTimeout(bootTimer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Focus after boot so the email/workspace inputs are mounted (spinner unmounts them).
  // Returning users with a remembered Arbeits-E-Mail get stroke + blinking caret immediately.
  // Only auto-focus once per main-step entry — wsHydrated flipping must not re-steal focus.
  // Register mobile: best-effort open soft keyboard on the workspace name field.
  // iOS/Android may still block keyboard without a user gesture — we still try after paint.
  useEffect(() => {
    if (booting) return
    if (authStep !== 'main') {
      mainAutoFocused.current = false
      return
    }
    if (!wsHydrated) return
    if (mainAutoFocused.current) return
    mainAutoFocused.current = true

    if (isSignup && !inviteToken) {
      // Soft keyboard only matters on mobile — never force focus on desktop register.
      const isMobileViewport = window.matchMedia('(max-width: 768px)').matches
      if (!isMobileViewport) return

      const focusWorkspaceName = () => {
        const active = document.activeElement as HTMLElement | null
        if (
          active &&
          active !== document.body &&
          active !== wsNameRef.current &&
          active.closest?.('.al-signin') &&
          (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
        ) {
          return
        }
        // Ensure AuthExpandableTextField is mounted (not the settled AuthWorkspacePath chip).
        setWsNameEditing(true)
        const el = wsNameRef.current
        if (!el) return
        el.focus({ preventScroll: true })
        const len = el.value.length
        try {
          el.setSelectionRange(len, len)
        } catch {
          /* noop */
        }
      }

      let rafOuter = 0
      let rafInner = 0
      const timers: number[] = []
      rafOuter = requestAnimationFrame(() => {
        rafInner = requestAnimationFrame(() => {
          focusWorkspaceName()
          // Short retries after paint — field may mount one frame late after path→input swap.
          ;[40, 120, 280].forEach(ms => {
            timers.push(window.setTimeout(focusWorkspaceName, ms))
          })
        })
      })
      return () => {
        cancelAnimationFrame(rafOuter)
        cancelAnimationFrame(rafInner)
        timers.forEach(clearTimeout)
      }
    }

    // Login / invite-signup: focus emailRef (prefilled remembered address or empty field).
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => {
      const active = document.activeElement as HTMLElement | null
      if (active && active !== document.body && active.closest?.('.al-signin')) return
      emailRef.current?.focus()
    }, ms))
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

  useEffect(() => {
    if (authStep !== 'sso') {
      setSsoDomainCheck(null)
      return
    }
    const domain = peekSsoDomain(ssoInput)
    if (!domain) {
      setSsoDomainCheck(null)
      setSsoChecking(false)
      return
    }
    let cancelled = false
    setSsoChecking(true)
    const t = setTimeout(() => {
      checkSsoDomain(domain).then(status => {
        if (!cancelled) {
          setSsoDomainCheck(status)
          setSsoChecking(false)
        }
      }).catch(() => {
        if (!cancelled) {
          setSsoDomainCheck({ configured: false, domain, lookupOk: false })
          setSsoChecking(false)
        }
      })
    }, 280)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [authStep, ssoInput])

  async function preferSsoIfEnforced(sourceEmail: string): Promise<boolean> {
    const domain = extractSsoDomain(sourceEmail)
    if (!domain) return false
    const status = await checkSsoDomain(domain)
    if (!status.configured || !status.enforceSso) return false
    setSsoInput(sourceEmail.trim())
    setError(`Für ${status.displayName || domain} bitte Firmen-SSO nutzen.`)
    goTo('sso')
    return true
  }

  function saveMethod(method: Method) {
    localStorage.setItem(METHOD_KEY, method)
    setLastMethod(method)
  }

  function goTo(step: AuthStep) {
    setError('')
    setAnimating(true)
    // Match .al-content exit (~0.12s) — swap as soon as fade-out paints.
    setTimeout(() => { setAuthStep(step); setAnimating(false) }, 110)
  }

  function switchBack() {
    setCode('')
    goTo('main')
  }

  async function openSsoFlow() {
    setError('')
    const ws = await requireWorkspaceName()
    if (isSignup && !inviteToken && !ws) return
    if (ws) setPendingWorkspaceName(ws)
    setSsoInput(ssoInput.trim() || email.trim())
    goTo('sso')
  }

  async function handleGoogle() {
    setError('')
    setOauthLoading(true)
    if (!isSignup && email.trim() && await preferSsoIfEnforced(email)) {
      setOauthLoading(false)
      return
    }
    const ws = await requireWorkspaceName()
    if (isSignup && !inviteToken && !ws) {
      setOauthLoading(false)
      return
    }
    if (ws) setPendingWorkspaceName(ws)
    saveMethod('google')
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
    setOauthLoading(true)
    const ws = await requireWorkspaceName()
    if (isSignup && !inviteToken && !ws) {
      setOauthLoading(false)
      return
    }
    if (ws) setPendingWorkspaceName(ws)
    saveMethod('apple')
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
    if (isSignup && !inviteToken) {
      const ws = await requireWorkspaceName()
      if (!ws) return
      setPendingWorkspaceName(ws)
    }
    saveMethod('sso')
    setOauthLoading(true)
    const result = await startSsoLogin({
      supabase,
      domain,
      email: ssoInput.includes('@') ? ssoInput.trim() : email.trim() || null,
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
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          kind: isSignup ? 'signup' : 'login',
          next: postAuthNext,
          pendingWorkspaceName: ws || undefined,
        }),
      })
      if (res.status === 429) return 'rate_limited'
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const mapped = mapAuthError(
          [data?.error, data?.message].filter(Boolean).join(' ') || 'otp_failed',
          mode,
        )
        if (mapped) setError(mapped)
        return 'error'
      }
      return 'ok'
    } catch {
      setError(mapAuthError('unexpected', mode) || 'E-Mail konnte nicht gesendet werden.')
      return 'error'
    }
  }

  async function handleEmailSubmit() {
    setError('')
    if (!email.trim()) { setError('Bitte E-Mail-Adresse eingeben.'); return }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError('Bitte eine gültige E-Mail-Adresse eingeben.'); return }
    setLoading(true)
    if (!isSignup && await preferSsoIfEnforced(email)) {
      setLoading(false)
      return
    }
    const ws = await requireWorkspaceName()
    if (isSignup && !inviteToken && !ws) {
      setLoading(false)
      return
    }
    const result = await sendMagicLink()
    setLoading(false)
    // Rate-limit = still continue — the earlier code remains valid.
    // Always land on the shared 6-digit code window (login + register).
    if (result === 'ok' || result === 'rate_limited') {
      setError('')
      setCode('')
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
    // Login OTP uses Magic Link (`email`). Confirm-signup mails use `signup`.
    // Try both on register so the same 6-digit UI works either way.
    const otpTypes = isSignup
      ? (['email', 'signup', 'magiclink'] as const)
      : (['email', 'magiclink'] as const)
    let verifyError: { message: string } | null = null
    for (const otpType of otpTypes) {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: trimmed,
        type: otpType,
      })
      if (!error) {
        verifyError = null
        break
      }
      verifyError = error
      // Wrong OTP type often surfaces as "invalid" — keep trying the next type.
      // Only abort early on rate limits / lockouts.
      const msg = String(error.message || '').toLowerCase()
      if (
        msg.includes('rate limit') ||
        msg.includes('rate_limit') ||
        msg.includes('too many') ||
        msg.includes('security purposes') ||
        msg.includes('can only request this after')
      ) {
        break
      }
    }
    if (verifyError) {
      setLoading(false)
      setError(mapAuthError(verifyError.message, mode))
      return
    }
    // Keep loading until hard navigation — avoids a brief re-enabled CTA.
    saveMethod('email')
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      // Fire-and-forget — must not block redirect after a valid OTP.
      void supabase
        .from('onboarding_state')
        .upsert({ user_id: session.user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }
    let target = session
      ? await resolvePostAuthTarget(supabase, session.user.id, '/dashboard')
      : (isSignup ? '/create-workspace' : '/dashboard')
    if (session) {
      const ws =
        normalizeWorkspaceName(workspaceName) ||
        getPendingWorkspaceName() ||
        (typeof session.user.user_metadata?.pending_workspace_name === 'string'
          ? session.user.user_metadata.pending_workspace_name
          : '')
      if (isSignup && !inviteToken) {
        if (ws) {
          const boot = await bootstrapWorkspaceIfNeeded(ws)
          if (boot === 'fail') {
            setLoading(false)
            return
          }
          if (boot === 'defer') target = '/create-workspace'
          else {
            target = await resolvePostAuthTarget(supabase, session.user.id, '/dashboard')
          }
        } else {
          target = '/create-workspace'
        }
      }
      // Honor ?returnTo= for TEMP onboarding replay (and other safe in-app paths).
      try {
        const returnTo = new URLSearchParams(window.location.search).get('returnTo')
        if (
          returnTo
          && returnTo.startsWith('/')
          && !returnTo.startsWith('//')
          && (returnTo === '/onboarding' || returnTo.startsWith('/onboarding?'))
        ) {
          await supabase.from('onboarding_state').upsert(
            {
              user_id: session.user.id,
              completed_at: null,
              current_step: 'profile',
              workspace_done: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          )
          target = returnTo
        }
      } catch { /* noop */ }
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
    setSupportOpen(true)
  }

  /** TEMP TEST — remove after onboarding QA. Plain link to preview UI, no auth gates. */
  function openOnboardingTest() {
    navigateWithFade('/onboarding')
  }

  const resendDisabled = resending || resendCooldown > 0
  const resendLabel = resending
    ? 'Wird gesendet…'
    : resendCooldown > 0
      ? `Neuen Code anfordern in ${resendCooldown}s`
      : 'Neuen Code anfordern'

  const googleLabelFull = isSignup ? 'Mit Google registrieren' : 'Mit Google fortfahren'
  const appleLabelFull = isSignup ? 'Mit Apple registrieren' : 'Mit Apple fortfahren'

  const googleButton = (
    <button
      className="al-btn al-btn-google"
      type="button"
      aria-label={googleLabelFull}
      onClick={handleGoogle}
      disabled={oauthLoading || (isSignup && !inviteToken && !wsReadyForSignup)}
    >
      {oauthLoading ? (
        <span className="al-loader" />
      ) : (
        <GoogleBrandIcon />
      )}
      <span className="al-oauth-label-full">{googleLabelFull}</span>
      <span className="al-oauth-label-short" aria-hidden="true">Mit Google</span>
    </button>
  )

  const appleButton = (
    <button
      className="al-btn al-btn-apple"
      type="button"
      aria-label={appleLabelFull}
      onClick={handleApple}
      disabled={oauthLoading || (isSignup && !inviteToken && !wsReadyForSignup)}
    >
      <AppleBrandIcon />
      <span className="al-oauth-label-full">{appleLabelFull}</span>
      <span className="al-oauth-label-short" aria-hidden="true">Mit Apple</span>
    </button>
  )

  const mainSignIn = (
    <div className="al-signin-stack">
      {error && <p className="al-error">{error}</p>}

      <div className="al-method-group al-method-group--oauth">
        {!isSignup && lastMethod === 'google' && <p className="al-hint">Zuletzt mit Google angemeldet</p>}
        {!isSignup && lastMethod === 'apple' && <p className="al-hint">Zuletzt mit Apple angemeldet</p>}
        {googleButton}
        {appleButton}
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
          className={`al-btn al-btn-primary${emailReady ? ' al-btn-primary--ready' : ''}`}
          type="button"
          onClick={handleEmailSubmit}
          disabled={loading || (isSignup && !inviteToken && !wsReadyForSignup)}
        >
          {loading ? 'Wird gesendet…' : 'Weiter'}
        </button>
      </div>

      <div className="al-method-group al-sso-group">
        {!isSignup && lastMethod === 'sso' && (
          <p className="al-hint al-hint--last-sso">Zuletzt damit angemeldet</p>
        )}
        <button
          className="al-btn al-btn-ghost"
          type="button"
          onClick={() => { void openSsoFlow() }}
          disabled={oauthLoading || (isSignup && !inviteToken && !wsReadyForSignup)}
        >
          Single Sign-On (SSO)
        </button>
      </div>

      {!isSignup && (
        <button type="button" className="al-support-note" onClick={openSupportModal}>
          Zugang wiederfinden?
        </button>
      )}
    </div>
  )

  const ssoScreen = (
    <>
      <div className="al-signin-stack">
        {error && <p className="al-error">{error}</p>}
        <p className="al-flow-info">
          {ssoDomainPreview ? (
            <>
              Weiter mit Firmen-Domain{' '}
              <strong>{ssoDomainPreview}</strong>
              {ssoChecking ? (
                <> — prüfen…</>
              ) : ssoDomainCheck?.configured ? (
                <> — SSO bereit{ssoDomainCheck.displayName && ssoDomainCheck.displayName !== ssoDomainPreview ? ` (${ssoDomainCheck.displayName})` : ''}</>
              ) : ssoDomainCheck && ssoDomainCheck.lookupOk !== false ? (
                <> — Domain noch nicht freigeschaltet</>
              ) : null}
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
          className={`al-btn al-btn-primary${ssoReady ? ' al-btn-primary--ready' : ''}`}
          type="button"
          onClick={handleSsoSubmit}
          disabled={oauthLoading || !ssoDomainPreview}
        >
          {oauthLoading ? 'Weiterleitung…' : 'Weiter'}
        </button>
        <button className="al-back" type="button" onClick={switchBack} disabled={oauthLoading}>Zurück</button>
      </div>
      <AuthHelpAccordion id="al-sso-help" summary="Hilfe zu SSO">
        <p>
          Firmen-SSO verbindet Festag mit dem Login Ihres Unternehmens (z. B. Okta, Microsoft Entra
          oder Google Workspace). Arbeits-E-Mail oder Firmendomain eingeben — wir leiten Sie zum
          Firmen-Login weiter.
        </p>
        <p>
          Die Domain muss freigeschaltet sein (Enterprise-Setup). Danach kein separates Festag-Passwort:
          derselbe Firmen-Login gilt beim nächsten Mal erneut.
        </p>
        <p>
          Noch nicht eingerichtet? Workspace-Admin kann unter Einstellungen → Sicherheit „SSO anfragen“,
          oder Sie wenden sich an Festag Support.
        </p>
      </AuthHelpAccordion>
    </>
  )

  // Shared login + register code window — same chrome, same CTA labels.
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
      <button className="al-btn al-btn-primary al-btn-primary--ready" type="button" onClick={() => handleVerifyCode()} disabled={loading}>
        {loading ? 'Wird geprüft…' : 'Anmelden'}
      </button>
      <button className="al-link" type="button" onClick={handleResend} disabled={resendDisabled}>
        {resendLabel}
      </button>
      {!isSignup && (
        <button type="button" className="al-support-note" onClick={openSupportModal}>
          Zugang wiederfinden?
        </button>
      )}
      <button className="al-back" type="button" onClick={switchBack}>Zurück</button>
    </div>
  )

  const legalCopy = (
    <p className="al-agreements-text">
      {isSignup
        ? 'Mit der Registrierung stimmen Sie den '
        : 'Mit der Anmeldung oder Registrierung stimmen Sie den '}
      <a
        href="/agb"
        onPointerEnter={() => prefetchAuthHref('/agb')}
        onClick={e => { e.preventDefault(); navigateWithFade('/agb') }}
      >AGB</a>,{' '}
      <a
        href="/nutzungsbedingungen"
        onPointerEnter={() => prefetchAuthHref('/nutzungsbedingungen')}
        onClick={e => { e.preventDefault(); navigateWithFade('/nutzungsbedingungen') }}
      >Nutzungsbedingungen</a> und der{' '}
      <a
        href="/datenschutz"
        onPointerEnter={() => prefetchAuthHref('/datenschutz')}
        onClick={e => { e.preventDefault(); navigateWithFade('/datenschutz') }}
      >Datenschutzerklärung</a> zu.
    </p>
  )
  /** Desktop only — long consent stays under CTAs on ≥769px. */
  const legalUnderForm = (
    <div className="al-agreements al-agreements--under-form">{legalCopy}</div>
  )

  const modeSwitchLink = isSignup ? (
    <button
      type="button"
      className="al-btn al-btn-primary al-under-cta-switch"
      onClick={() => switchAuthMode('/login')}
    >
      Anmelden
    </button>
  ) : (
    <button
      type="button"
      className="al-btn al-btn-primary al-under-cta-switch"
      onClick={() => switchAuthMode('/register')}
    >
      Registrieren
    </button>
  )

  const accountHint = (
    <p className="al-account-hint">
      {isSignup ? (
        <>
          Schon einen Account?{' '}
          <button type="button" className="al-account-hint-link" onClick={() => switchAuthMode('/login')}>
            Hier anmelden
          </button>
          .
        </>
      ) : (
        <>
          Noch keinen Account?{' '}
          <button type="button" className="al-account-hint-link" onClick={() => switchAuthMode('/register')}>
            Hier registrieren
          </button>
          .
        </>
      )}
    </p>
  )

  const renderSslBadge = () => (
    <button
      type="button"
      className="al-ssl-badge no-min-tap"
      aria-label="Sicherheit und Verschlüsselung"
      onClick={() => setSecurityOpen(true)}
    >
      <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M5.5 0.5C3.84315 0.5 2.5 1.84315 2.5 3.5V5H1.5C0.947715 5 0.5 5.44772 0.5 6V11.5C0.5 12.0523 0.947715 12.5 1.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6C10.5 5.44772 10.0523 5 9.5 5H8.5V3.5C8.5 1.84315 7.15685 0.5 5.5 0.5ZM3.5 5V3.5C3.5 2.39543 4.39543 1.5 5.5 1.5C6.60457 1.5 7.5 2.39543 7.5 3.5V5H3.5Z" fill="currentColor"/>
      </svg>
      <span>SSL, End-to-End verschlüsselt</span>
    </button>
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
      className={`al-root al-root--centered${pageExiting ? ' exiting' : ''}${panelEnter ? ' al-panel-enter' : ''}${softModeEnter ? ' al-soft-enter' : ''}`}
      data-theme={theme}
      data-auth-mode={mode}
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
              className="al-panel-switch-trigger no-min-tap"
              aria-label="Zum Dev Panel wechseln"
              onClick={() => setPanelSwitchOpen(true)}
            >
              <Code size={17} weight="regular" />
            </button>
            <button
              type="button"
              className="al-theme-icon al-theme-icon--header no-min-tap"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onMouseDown={e => e.preventDefault()}
              onClick={e => {
                setTheme(theme === 'dark' ? 'light' : 'dark')
                ;(e.currentTarget as HTMLButtonElement).blur()
              }}
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
                  <section
                    className={`al-signin${animating ? ' al-signin--out' : ''}`}
                    aria-label={isSignup ? 'Festag Registrierung' : 'Festag Anmeldung'}
                  >
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
                                <AuthExpandableTextField
                                  ref={wsNameRef}
                                  lineClassName={`al-ws-name-line${workspaceName ? ' has-value' : ''}`}
                                  inputClassName="al-ws-name-input"
                                  srLabel="Workspace-Name"
                                  type="text"
                                  inputMode="text"
                                  value={workspaceName}
                                  onChange={e => updateWorkspaceName(e.target.value)}
                                  onInput={e => updateWorkspaceName((e.target as HTMLInputElement).value)}
                                  onBlur={handleWorkspaceNameBlur}
                                  placeholder=""
                                  autoComplete="off"
                                  autoCorrect="off"
                                  autoCapitalize="words"
                                  spellCheck={false}
                                  maxLength={64}
                                  aria-label="Workspace-Name"
                                  aria-invalid={wsAvailability === 'taken' || wsAvailability === 'invalid'}
                                />
                              )}
                              {wsAvailability === 'checking' && displayWorkspaceName ? (
                                <p className="al-ws-status">Wird geprüft…</p>
                              ) : null}
                              {wsAvailability === 'available' && displayWorkspaceName && wsNameEditing ? (
                                <p className="al-ws-status al-ws-status--ok">Benutzername verfügbar</p>
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

                    <>
                      <div className={`al-content${animating ? ' animating' : ''}${subFlow ? ' al-content--sub' : ''}`}>
                        {authStep === 'main' ? mainSignIn : authStep === 'sso' ? ssoScreen : codeEntryScreen}
                        {!subFlow ? accountHint : null}
                      </div>
                      {!subFlow && legalUnderForm}
                      {!subFlow && (
                        <div className="al-register-meta al-register-meta--desktop">
                          {modeSwitchLink}
                          <span className="al-footer-sep" aria-hidden="true">|</span>
                          {renderSslBadge()}
                        </div>
                      )}
                    </>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="al-footer-meta">
          <div className="al-footer-center">
            <button
              type="button"
              className="al-theme-icon al-theme-icon--footer no-min-tap"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onMouseDown={e => e.preventDefault()}
              onClick={e => {
                setTheme(theme === 'dark' ? 'light' : 'dark')
                ;(e.currentTarget as HTMLButtonElement).blur()
              }}
            >
              {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
            </button>
            {renderSslBadge()}
          </div>
          <div className="al-footer-links al-footer-links--desktop">
            {/* TEMP TEST — remove after onboarding QA */}
            <button
              type="button"
              className="al-dev-link al-onb-test-link"
              onClick={() => openOnboardingTest()}
            >
              Onboarding testen
            </button>
            <span className="al-footer-sep" aria-hidden="true">|</span>
            <a
              className="al-dev-link"
              href="/dev/login"
              onPointerEnter={() => prefetchAuthHref('/dev/login')}
              onClick={e => { e.preventDefault(); navigateWithFade('/dev/login') }}
            >
              Dev Zugang
            </a>
            <span className="al-footer-sep" aria-hidden="true">|</span>
            {isSignup ? (
              <a
                className="al-dev-link al-footer-mode-switch"
                href="/login"
                onPointerEnter={() => prefetchAuthHref('/login')}
                onClick={e => { e.preventDefault(); switchAuthMode('/login') }}
              >
                Anmelden
              </a>
            ) : (
              <a
                className="al-dev-link al-footer-mode-switch"
                href="/register"
                onPointerEnter={() => prefetchAuthHref('/register')}
                onClick={e => { e.preventDefault(); switchAuthMode('/register') }}
              >
                Registrieren
              </a>
            )}
          </div>
        </footer>
      </div>

      <AuthRecoveryModal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        initialEmail={email}
        page={isSignup ? '/register' : '/login'}
        variant="client"
      />

      <AuthSecurityModal open={securityOpen} onClose={() => setSecurityOpen(false)} />
      <AuthPanelSwitchModal
        open={panelSwitchOpen}
        onClose={() => setPanelSwitchOpen(false)}
        variant="client"
        onSwitch={() => navigateWithFade('/dev/login')}
      />
    </main>
  )
}
