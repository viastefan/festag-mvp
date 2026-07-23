'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun, Users } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import {
  prepareAuthRouteTransition,
  useAuthTheme,
  consumePanelEnter,
  isCrossPanelAuthNav,
} from '@/lib/auth-theme'
import { rememberAuthEntry } from '@/lib/auth-entry'
import GoogleBrandIcon from '@/components/auth/GoogleBrandIcon'
import AppleBrandIcon from '@/components/auth/AppleBrandIcon'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import AuthPanelSwitchModal from '@/components/auth/AuthPanelSwitchModal'
import AuthRecoveryModal from '@/components/auth/AuthRecoveryModal'
import AuthHelpAccordion from '@/components/auth/AuthHelpAccordion'
import AuthWorkspacePath from '@/components/auth/AuthWorkspacePath'
import AuthExpandableTextField from '@/components/auth/AuthExpandableTextField'
import AuthOtpInput, { type AuthOtpInputHandle } from '@/components/auth/AuthOtpInput'
import { AUTH_OTP_STYLES } from '@/components/auth/auth-otp-styles'
import { storeDevSession, type DevSession } from '@/lib/dev-session'
import {
  getRememberedDevDevice,
  rememberDevDevice,
} from '@/lib/dev-device-memory'
import { normalizeWorkspaceName } from '@/lib/pending-workspace'
import { isLegalPath, rememberLegalReturn } from '@/lib/legal-return'
import {
  AUTH_CHROME_VARS_DARK,
  AUTH_CHROME_VARS_LIGHT,
} from '@/components/auth/auth-chrome-tokens'

type WsAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
type UserAvailability = 'idle' | 'checking' | 'found' | 'not_found' | 'invalid'

type AuthStep = 'main' | 'register' | 'setPin'
type OauthProvider = 'google' | 'github' | 'apple' | 'email' | null

type LoginOptions = {
  found: boolean
  setup_required: boolean
  workspace_name: string | null
  google: boolean
  github: boolean
  apple: boolean
  email: boolean
}

const EMPTY_LOGIN_OPTIONS: LoginOptions = {
  found: false,
  setup_required: false,
  workspace_name: null,
  google: false,
  github: false,
  apple: false,
  email: false,
}

/** Match server normalizeUsername for client length / probe gates. */
function normalizeDevUsernameClient(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32)
}

function mapPinError(msg: string, apiMessage?: string): string {
  if (apiMessage) return apiMessage
  if (msg.includes('rate') || msg.includes('too many')) return 'Zu viele Versuche. Bitte warte einen Moment.'
  if (msg.includes('service_unavailable') || msg.includes('signing_unavailable')) {
    return 'Dev-Login ist auf dem Server noch nicht eingerichtet. SUPABASE_SERVICE_ROLE_KEY fehlt in Vercel — bitte Admin informieren.'
  }
  if (msg.includes('invalid_credentials')) return 'Benutzername oder PIN ist nicht korrekt.'
  if (msg.includes('workspace_name_required')) return 'Bitte einen Workspace-Namen eingeben.'
  if (msg.includes('workspace_taken')) return 'Dieser Workspace-Name ist bereits vergeben.'
  if (msg.includes('pin_invalid')) return 'Bitte einen 6-stelligen persönlichen PIN wählen.'
  if (msg.includes('pin_reuse')) return 'Wähle einen neuen PIN — nicht denselben wie den Einladungs-Code.'
  if (msg.includes('already_registered')) {
    return 'Dieses Konto ist bereits eingerichtet. Melde dich mit deinem persönlichen PIN an.'
  }
  return 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.'
}

export default function DevLoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [authStep, setAuthStep] = useState<AuthStep>('main')
  const [username, setUsername] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [displayWorkspace, setDisplayWorkspace] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [invitePin, setInvitePin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageExiting, setPageExiting] = useState(false)
  const [panelEnter, setPanelEnter] = useState(false)
  const [stepEnter, setStepEnter] = useState(false)
  const [animating, setAnimating] = useState(false)
  const { mode: theme, setMode: setTheme } = useAuthTheme('dev')
  const [oauthLoading, setOauthLoading] = useState<OauthProvider>(null)
  const [panelSwitchOpen, setPanelSwitchOpen] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [booted, setBooted] = useState(false)
  const [returning, setReturning] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [wsAvailability, setWsAvailability] = useState<WsAvailability>('idle')
  const [wsAvailabilityMsg, setWsAvailabilityMsg] = useState('')
  const [wsNameEditing, setWsNameEditing] = useState(true)
  const [userAvailability, setUserAvailability] = useState<UserAvailability>('idle')
  const [options, setOptions] = useState<LoginOptions>(EMPTY_LOGIN_OPTIONS)
  const [emailSent, setEmailSent] = useState(false)

  const userRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<AuthOtpInputHandle>(null)
  const wsRef = useRef<HTMLInputElement>(null)
  const inviteRef = useRef<AuthOtpInputHandle>(null)
  const confirmPinRef = useRef<AuthOtpInputHandle>(null)
  const welcomeIntentRef = useRef(false)
  const registerAutoFocused = useRef(false)
  const wsCheckSeq = useRef(0)
  const userCheckSeq = useRef(0)
  const wsAvailabilityRef = useRef(wsAvailability)
  wsAvailabilityRef.current = wsAvailability
  const userAvailabilityRef = useRef(userAvailability)
  userAvailabilityRef.current = userAvailability

  useEffect(() => {
    rememberAuthEntry('dev')
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const prefill = String(params.get('prefill') || '').trim().toLowerCase()
    const welcome = params.get('welcome') === '1' || params.get('register') === '1'
    const remembered = getRememberedDevDevice()
    welcomeIntentRef.current = welcome

    if (prefill) {
      setUsername(prefill)
    } else if (remembered?.username) {
      setUsername(remembered.username)
    }

    if (remembered?.workspaceName && !welcome) {
      setDisplayWorkspace(remembered.workspaceName)
      setWorkspaceName(remembered.workspaceName)
    }

    // Explicit invite/register only. Cold start without device memory stays on
    // login (username under title) — never the workspace-create register stack.
    if (welcome) {
      setReturning(false)
      setAuthStep('register')
      setWsNameEditing(true)
      setWorkspaceName('')
      setDisplayWorkspace(null)
    } else if (remembered?.username) {
      setReturning(true)
      setAuthStep('main')
    } else {
      setReturning(false)
      setAuthStep('main')
    }

    setBooted(true)
  }, [])

  useEffect(() => {
    if (!booted) return
    const u = normalizeDevUsernameClient(username)
    if (!username.trim()) {
      userCheckSeq.current += 1
      setUserAvailability('idle')
      setOptions(EMPTY_LOGIN_OPTIONS)
      setEmailSent(false)
      return
    }
    if (u.length < 2) {
      userCheckSeq.current += 1
      setUserAvailability('invalid')
      setOptions(EMPTY_LOGIN_OPTIONS)
      setEmailSent(false)
      return
    }

    const seq = ++userCheckSeq.current
    setUserAvailability('checking')
    let cancelled = false
    const t = window.setTimeout(async () => {
      try {
        // Lean existence probe first — indexed id-only lookup.
        const checkRes = await fetch(
          `/api/dev/check-username?username=${encodeURIComponent(u)}`,
          { credentials: 'include' },
        )
        const check = await checkRes.json().catch(() => null)
        if (cancelled || seq !== userCheckSeq.current) return

        if (!check?.ok) {
          setUserAvailability('idle')
          return
        }
        if (check.invalid || !check.found) {
          setUserAvailability(check.invalid ? 'invalid' : 'not_found')
          setOptions(EMPTY_LOGIN_OPTIONS)
          setEmailSent(false)
          return
        }

        setUserAvailability('found')

        // Providers / setup only when the username exists.
        const res = await fetch(`/api/dev/login-options?username=${encodeURIComponent(u)}`)
        const d = await res.json().catch(() => ({}))
        if (cancelled || seq !== userCheckSeq.current || !d?.ok) return
        const setupRequired = !!d.setup_required
        setOptions({
          found: !!d.found,
          setup_required: setupRequired,
          workspace_name: d.workspace_name || null,
          google: !!d.google,
          github: !!d.github,
          apple: !!d.apple,
          email: !!d.email,
        })
        if (setupRequired || welcomeIntentRef.current) {
          setReturning(false)
          setAuthStep(prev => (prev === 'setPin' ? prev : 'register'))
          return
        }
        if (d.found && !setupRequired) {
          setReturning(true)
          if (d.workspace_name) {
            setDisplayWorkspace(String(d.workspace_name))
            setWorkspaceName(String(d.workspace_name))
          }
          setAuthStep(prev => (prev === 'register' && !welcomeIntentRef.current ? 'main' : prev))
        }
      } catch { /* ignore */ }
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [booted, username])

  useEffect(() => {
    if (!booted) return
    // Prefer under-title username when empty; otherwise PIN after a known user.
  if (authStep === 'main') {
      registerAutoFocused.current = false
      const focusPin = Boolean(username.trim())
      const tries = [0, 50, 150, 250]
      const timers = tries.map(ms => setTimeout(() => {
        if (focusPin) pinRef.current?.focus()
        else userRef.current?.focus()
      }, ms))
      return () => timers.forEach(clearTimeout)
    }
    if (authStep === 'register') {
      // Focus workspace once when entering register — never re-steal after the
      // user tabs into the invite PIN (login-options / availability rerenders).
      if (registerAutoFocused.current) return
      registerAutoFocused.current = true
      const t = setTimeout(() => {
        const active = document.activeElement as HTMLElement | null
        if (active && active !== document.body && active.closest?.('.dl-panel')) return
        wsRef.current?.focus()
      }, 40)
      return () => clearTimeout(t)
    }
    if (authStep === 'setPin') {
      registerAutoFocused.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when step/boot changes
  }, [authStep, booted])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  useLayoutEffect(() => {
    if (consumePanelEnter() !== 'dev') return
    setPanelEnter(true)
    const t = window.setTimeout(() => setPanelEnter(false), 280)
    return () => window.clearTimeout(t)
  }, [])

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
        if (document.activeElement !== wsRef.current) {
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
    setDisplayWorkspace(trimmed || null)
    if (trimmed) {
      setWsAvailability('checking')
      setWsAvailabilityMsg('')
    } else {
      setWsAvailability('idle')
      setWsAvailabilityMsg('')
    }
    setError('')
  }

  function startEditingWorkspaceName() {
    setWsNameEditing(true)
    window.setTimeout(() => {
      wsRef.current?.focus()
      const len = wsRef.current?.value.length ?? 0
      try { wsRef.current?.setSelectionRange(len, len) } catch { /* noop */ }
    }, 30)
  }

  function handleWorkspaceNameBlur() {
    window.setTimeout(() => {
      if (wsRef.current && document.activeElement === wsRef.current) return
      if (wsAvailabilityRef.current === 'available' && normalizeWorkspaceName(workspaceName)) {
        setWsNameEditing(false)
      }
    }, 0)
  }

  function handleUsernameBlur() {
    // Settled path styling is CSS (muted `/` gray). Re-assert error if probe settled invalid.
    window.setTimeout(() => {
      if (userRef.current && document.activeElement === userRef.current) return
      const avail = userAvailabilityRef.current
      if (avail === 'not_found' || avail === 'invalid') return
      const u = normalizeDevUsernameClient(username)
      if (username.trim() && u.length < 2) {
        setUserAvailability('invalid')
      }
    }, 0)
  }

  function updateUsername(nextRaw: string) {
    setUsername(nextRaw)
    setEmailSent(false)
    if (error) setError('')
    const u = normalizeDevUsernameClient(nextRaw)
    if (!nextRaw.trim()) {
      setUserAvailability('idle')
    } else if (u.length < 2) {
      setUserAvailability('invalid')
    } else {
      setUserAvailability('checking')
    }
  }

  useEffect(() => {
    if (authStep !== 'register') return
    const trimmed = normalizeWorkspaceName(workspaceName)
    if (!trimmed) return
    const t = window.setTimeout(() => {
      void checkWorkspaceNameAvailability(trimmed)
    }, 220)
    return () => window.clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceName, authStep])

  function navigateWithFade(href: string) {
    router.prefetch(href)
    try {
      const path = new URL(href, window.location.origin).pathname
      if (isLegalPath(path)) rememberLegalReturn()
      if (path === '/login' || path.startsWith('/login/')) rememberAuthEntry('client')
      if (path === '/dev/login' || path.startsWith('/dev/login/')) rememberAuthEntry('dev')
    } catch { /* noop */ }
    prepareAuthRouteTransition(href)
    setPageExiting(true)
    const crossPanel = isCrossPanelAuthNav(href)
    const delay = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : (crossPanel ? 280 : 220)
    window.setTimeout(() => { router.push(href) }, delay)
  }

  /** Same soft content fade as client SSO / code steps. */
  function goTo(step: AuthStep) {
    if (step === authStep) return
    setError('')
    setAnimating(true)
    setStepEnter(false)
    window.setTimeout(() => {
      setAuthStep(step)
      setAnimating(false)
      setStepEnter(true)
      window.setTimeout(() => setStepEnter(false), 180)
    }, 110)
  }

  function finishDevSession(session: DevSession, u: string, ws?: string | null) {
    storeDevSession(session)
    rememberDevDevice({
      username: u,
      workspaceName: ws || session.workspace_name || session.user_name || null,
      userId: session.user_id,
    })
    window.location.href = '/dev'
  }

  async function handleOauth(provider: 'google' | 'github' | 'apple') {
    setError('')
    setOauthLoading(provider)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dev')}`,
        ...(provider === 'github'
          ? { scopes: 'read:user user:email read:org' }
          : provider === 'google'
            ? { queryParams: { prompt: 'select_account' } }
            : {}),
      },
    })
    if (oauthError) {
      setError(
        provider === 'google'
          ? 'Google-Anmeldung fehlgeschlagen. Bitte erneut versuchen.'
          : provider === 'apple'
            ? 'Apple-Anmeldung gerade nicht verfügbar.'
            : 'GitHub-Anmeldung fehlgeschlagen. Bitte erneut versuchen.',
      )
      setOauthLoading(null)
    }
  }

  async function handleEmailLogin() {
    setError('')
    setEmailSent(false)
    const u = normalizeDevUsernameClient(username)
    if (!u) {
      setError('Bitte zuerst einen Benutzernamen eingeben.')
      userRef.current?.focus()
      return
    }
    if (userAvailability === 'not_found' || userAvailability === 'invalid') {
      setError(
        userAvailability === 'invalid'
          ? 'Bitte einen gültigen Benutzernamen eingeben.'
          : 'Benutzername nicht gefunden.',
      )
      userRef.current?.focus()
      return
    }
    setOauthLoading('email')
    try {
      const res = await fetch('/api/dev/login-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d?.ok) {
        setError(d?.message || 'E-Mail-Anmeldung fehlgeschlagen. Bitte erneut versuchen.')
        setOauthLoading(null)
        return
      }
      setEmailSent(true)
    } catch {
      setError('E-Mail-Anmeldung fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setOauthLoading(null)
    }
  }

  async function submitPin(pinOverride?: string) {
    setError('')
    const u = normalizeDevUsernameClient(username)
    const p = (pinOverride ?? pin).replace(/\D/g, '').slice(0, 6)
    // Returning login needs both; invite/register flows do not use this path.
    if (!username.trim() && !p) {
      setError('Bitte Benutzername und PIN eingeben.')
      userRef.current?.focus()
      return
    }
    if (!username.trim() || u.length < 2) {
      setError('Bitte Benutzername eingeben.')
      setUserAvailability(username.trim() ? 'invalid' : 'idle')
      userRef.current?.focus()
      return
    }
    if (userAvailability === 'not_found' || userAvailability === 'invalid') {
      setError(
        userAvailability === 'invalid'
          ? 'Bitte einen gültigen Benutzernamen eingeben.'
          : 'Benutzername nicht gefunden.',
      )
      userRef.current?.focus()
      return
    }
    if (userAvailability === 'checking') {
      setError('Benutzername wird noch geprüft.')
      return
    }
    if (!p) {
      setError('Bitte PIN eingeben.')
      pinRef.current?.focus()
      return
    }
    if (p.length !== 6) {
      setError('Bitte den 6-stelligen PIN eingeben.')
      pinRef.current?.focus()
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/dev/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, pin: p }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d?.ok) {
        setError(mapPinError(d?.error || 'invalid_credentials', d?.message))
        setLoading(false)
        return
      }
      if (d.needs_register) {
        const resolved = String(d.username || u || '').trim().toLowerCase()
        if (resolved) setUsername(resolved)
        setInvitePin(p)
        setReturning(false)
        welcomeIntentRef.current = true
        setWsNameEditing(true)
        if (d.profile?.workspace_name) {
          setWorkspaceName(String(d.profile.workspace_name))
          setDisplayWorkspace(String(d.profile.workspace_name))
        }
        goTo('register')
        setLoading(false)
        return
      }
      if (!d?.session?.user_id) {
        setError(mapPinError('invalid_credentials'))
        setLoading(false)
        return
      }
      finishDevSession(d.session as DevSession, u, d.session.workspace_name)
    } catch (e: any) {
      setError(mapPinError(e?.message || ''))
      setLoading(false)
    }
  }

  async function continueRegister() {
    setError('')
    const ws = normalizeWorkspaceName(workspaceName)
    const invite = invitePin.replace(/\D/g, '').slice(0, 6)
    if (ws.length < 2) {
      setError('Bitte einen Workspace-Namen eingeben.')
      wsRef.current?.focus()
      return
    }
    if (invite.length !== 6) {
      setError('Bitte den 6-stelligen Einladungs-PIN eingeben.')
      inviteRef.current?.focus()
      return
    }
    // Reuse debounce result when already green — skip second /check-name.
    if (wsAvailability !== 'available') {
      setLoading(true)
      const check = await checkWorkspaceNameAvailability(ws)
      setLoading(false)
      if (!check.ok) {
        setError(check.reason || 'Dieser Workspace-Name ist bereits vergeben.')
        setWsNameEditing(true)
        wsRef.current?.focus()
        return
      }
    }
    setInvitePin(invite)
    setWorkspaceName(ws)
    setDisplayWorkspace(ws)
    goTo('setPin')
  }

  async function completeRegister() {
    setError('')
    const u = username.trim().toLowerCase()
    const ws = normalizeWorkspaceName(workspaceName)
    const invite = invitePin.replace(/\D/g, '').slice(0, 6)
    const p1 = newPin.replace(/\D/g, '').slice(0, 6)
    const p2 = confirmPin.replace(/\D/g, '').slice(0, 6)
    if (p1.length !== 6) { setError('Bitte einen 6-stelligen persönlichen PIN wählen.'); return }
    if (p1 !== p2) { setError('Die PIN-Codes stimmen nicht überein.'); return }
    if (p1 === invite) { setError('Wähle einen neuen PIN — nicht denselben wie den Einladungs-Code.'); return }
    setLoading(true)
    try {
      const payload: Record<string, string> = {
        invite_pin: invite,
        workspace_name: ws,
        new_pin: p1,
      }
      if (u) payload.username = u
      const res = await fetch('/api/dev/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d?.ok || !d?.session?.user_id) {
        setError(mapPinError(d?.error || 'invalid_credentials', d?.message))
        setLoading(false)
        return
      }
      const resolvedUser = String(d.username || u || '').trim().toLowerCase()
      if (resolvedUser) setUsername(resolvedUser)
      finishDevSession(d.session as DevSession, resolvedUser || u, ws)
    } catch (e: any) {
      setError(mapPinError(e?.message || ''))
      setLoading(false)
    }
  }

  async function handleResendPin() {
    if (resendCooldown > 0 || resending) return
    setError('')
    const u = username.trim().toLowerCase()
    const invite = invitePin.replace(/\D/g, '').slice(0, 6)
    if (!u && invite.length !== 6) {
      setError('Bitte Benutzername oder den 6-stelligen Einladungs-PIN eingeben, dann erneut senden.')
      return
    }
    setResending(true)
    try {
      const payload: Record<string, string> = {}
      if (u) payload.username = u
      if (invite.length === 6) payload.invite_pin = invite
      const res = await fetch('/api/dev/resend-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(d?.message || mapPinError(d?.error || ''))
      } else {
        const resolved = String(d?.username || '').trim().toLowerCase()
        if (resolved) setUsername(resolved)
        setResendCooldown(60)
        setError('')
      }
    } catch {
      setError('Code konnte nicht gesendet werden.')
    } finally {
      setResending(false)
    }
  }

  const showProviders =
    options.found
    && !options.setup_required
    && (options.google || options.github || options.apple || options.email)
  const wsReady = authStep !== 'register' || wsAvailability === 'available'
  const displayWsNormalized = normalizeWorkspaceName(workspaceName)
  const usernameKnown = userAvailability === 'found' && normalizeDevUsernameClient(username).length >= 2
  const usernameStatusMsg =
    userAvailability === 'checking' && normalizeDevUsernameClient(username).length >= 2
      ? 'Wird geprüft…'
      : userAvailability === 'found'
        ? 'Benutzer gefunden'
        : userAvailability === 'not_found'
          ? 'Benutzername nicht gefunden'
          : userAvailability === 'invalid' && username.trim()
            ? 'Benutzername ungültig'
            : ''
  const usernameStatusClass =
    userAvailability === 'found'
      ? 'dl-ws-status dl-ws-status--ok'
      : userAvailability === 'not_found' || userAvailability === 'invalid'
        ? 'dl-ws-status dl-ws-status--bad'
        : 'dl-ws-status'

  const title = authStep === 'register'
    ? 'Workspace erstellen'
    : authStep === 'setPin'
      ? 'Persönlichen PIN wählen'
      : returning
        ? 'Willkommen zurück'
        : 'Anmelden'

  const stepLede = authStep === 'register'
    ? 'Wähle einen eindeutigen Workspace-Namen und bestätige mit deinem Einladungs-PIN. Danach legst du deinen persönlichen Zugang fest.'
    : authStep === 'setPin'
      ? 'Dieser PIN ersetzt den Einladungs-Code für künftige Anmeldungen. Merke ihn dir gut — er ist dein Zugang zum Execution Panel.'
      : null

  const resendLabel = resending
    ? 'Wird gesendet…'
    : resendCooldown > 0
      ? `Code erneut senden in ${resendCooldown}s`
      : 'Code erneut senden'

  return (
    <main
      className={`dl-root${authStep === 'register' || authStep === 'setPin' ? ' dl-root--register' : ''}${pageExiting ? ' exiting' : ''}${panelEnter ? ' dl-panel-enter' : ''}${stepEnter ? ' dl-step-enter' : ''}`}
      data-theme={theme}
    >
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .dl-root {
          min-height:100dvh;
          width:100%;
          --dl-panel-width:360px;
          --dl-mobile-gutter:24px;
          --dl-col-pad:max(24px, calc(50% - (var(--dl-panel-width) / 2)));
          /* Apple gray header muted — cool slate (path, Benutzer eingeben) */
          --dl-text-muted:#8891a0;
          --dl-text-muted-soft:#8e95a3;
          --festag-input-placeholder:#8e95a3;
          font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          -webkit-font-smoothing:antialiased;
          text-rendering:geometricPrecision;
          transition: opacity 0.12s ease;
          /* Light auth: opaque white so Apple-gray inputs read against canvas. */
          background:#ffffff;
          color:#1e1e20;
          ${AUTH_CHROME_VARS_LIGHT}
          display:flex;
          flex-direction:column;
          overflow-x:hidden;
        }
        /* Auth copy always Aeonik Regular — beat globals Medium (500) defaults. */
        .dl-root a,
        .dl-root button,
        .dl-root input,
        .dl-root textarea,
        .dl-root select,
        .dl-root p,
        .dl-root label,
        .dl-root strong,
        .dl-root b,
        .dl-root h1,
        .dl-root h2,
        .dl-root h3,
        .dl-root span {
          font-weight:400;
        }
        /* Keep canvas opaque while routing — fade content only (no white flash). */
        .dl-root.exiting { pointer-events:none; }
        .dl-root.exiting .dl-panel,
        .dl-root.exiting .dl-header,
        .dl-root.exiting .dl-main,
        .dl-root.exiting .dl-footer-meta,
        .dl-root.exiting .dl-panel-body {
          opacity:0;
          transition: opacity 0.28s cubic-bezier(.32,.72,0,1);
        }
        /* Opacity only — no translate/scale (those read as a hitch on client ↔ Dev). */
        @keyframes dlEnter { from { opacity:0.92; } to { opacity:1; } }
        .dl-root:not(.exiting):not(.dl-panel-enter) { animation: dlEnter 0.1s cubic-bezier(.16,1,.3,1) both; }
        @keyframes dlPanelEnter {
          from { opacity:0; }
          to { opacity:1; }
        }
        .dl-root.dl-panel-enter:not(.exiting) {
          animation: dlPanelEnter 0.32s cubic-bezier(.16,1,.3,1) both;
        }

        /* Soft step switch — same cue as client .al-content / SSO / Code. */
        .dl-panel-body {
          transition:opacity 0.12s cubic-bezier(.16,1,.3,1);
        }
        .dl-panel-body.animating {
          opacity:0;
          pointer-events:none;
        }
        /* Content enter only after an in-page step swap — never on cold mount (avoids double hitch with root enter). */
        .dl-root.dl-step-enter .dl-panel-body:not(.animating) {
          animation: dlContentIn 0.14s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes dlContentIn {
          from { opacity:0; }
          to { opacity:1; }
        }

        .dl-otp-label {
          margin:0;
          font-size:13px;
          font-weight:400;
          line-height:1.35;
          color:var(--dl-text-muted);
          letter-spacing:0.002em;
          width:100%;
          text-align:left;
        }
        .dl-otp-block {
          display:flex;
          flex-direction:column;
          gap:8px;
          width:100%;
        }
` + AUTH_OTP_STYLES + `
        .dl-container {
          flex:1;
          display:flex;
          flex-direction:column;
          min-height:100dvh;
        }

        .dl-header {
          display:flex;
          align-items:center;
          justify-content:flex-end;
          gap:16px;
          padding:16px 24px;
          flex-shrink:0;
        }
        .dl-wordmark {
          display:inline-flex;
          align-items:baseline;
          gap:6px;
          font-size:19px;
          font-weight:400;
          letter-spacing:0.004em;
          color:#1e1e20;
          line-height:1.2;
          padding:2px 0 3px;
          text-decoration:none;
          overflow:visible;
          max-width:min(70vw, 420px);
          white-space:nowrap;
          text-overflow:ellipsis;
        }

        /* Docs + theme: icon-only, no gray fill */
        .dl-header-actions {
          display:flex;
          align-items:center;
          gap:8px;
          flex-shrink:0;
          margin-left:auto;
        }
        .dl-header .auth-docs-trigger {
          border:0 !important;
          border-radius:999px !important;
          background:transparent !important;
          box-shadow:none !important;
          width:28px !important;
          height:28px !important;
          min-width:28px !important;
          min-height:28px !important;
          max-width:28px !important;
          max-height:28px !important;
          aspect-ratio:1;
          padding:0 !important;
        }
        .dl-header .auth-docs-trigger:hover,
        .dl-header .auth-docs-trigger:focus-visible,
        .dl-header .auth-docs-trigger[aria-expanded="true"] {
          background:transparent !important;
        }
        .dl-root[data-theme="dark"] .dl-header .auth-docs-trigger {
          background:transparent !important;
          color:var(--dl-text-muted);
        }
        .dl-root[data-theme="dark"] .dl-header .auth-docs-trigger:hover,
        .dl-root[data-theme="dark"] .dl-header .auth-docs-trigger:focus-visible,
        .dl-root[data-theme="dark"] .dl-header .auth-docs-trigger[aria-expanded="true"] {
          background:transparent !important;
          color:#f5f5f7;
        }

        /* Desktop: form sits slightly above mid-viewport (not vertically centered). */
        .dl-main {
          flex:1;
          display:flex;
          align-items:flex-start;
          justify-content:center;
          min-height:0;
          padding:clamp(56px, 12vh, 120px) var(--dl-col-pad) 120px;
        }
        .dl-panel {
          width:100%;
          max-width:var(--dl-panel-width);
          display:flex;
          flex-direction:column;
          gap:0;
        }

        .dl-title {
          font-size:32px;
          line-height:39px;
          font-weight:400;
          letter-spacing:-0.03em;
          color:#1e1e20;
          margin:0;
          text-align:left;
        }
        .dl-hero-copy {
          margin:0 0 22px;
          width:100%;
        }
        .dl-hero-copy .dl-title {
          width:100%;
        }
        /* Mirror client al-ws-name-line / al-ws-name-input — 32px under h1 */
        .dl-ws-name-line {
          position:relative;
          display:block;
          width:100%;
          min-height:39px;
          margin:6px 0 0;
          pointer-events:auto;
        }
        .dl-ws-name-input {
          display:block;
          width:100%;
          border:0;
          outline:none;
          background:transparent;
          color:#1e1e20;
          padding:0;
          margin:0;
          caret-color:#5B647D;
          font-family:inherit;
          font-size:32px;
          line-height:39px;
          letter-spacing:-0.025em;
          font-weight:400;
          box-shadow:none;
          -webkit-appearance:none;
          appearance:none;
          pointer-events:auto;
        }
        .dl-ws-name-input::placeholder { color:transparent; }
        /* Returning / cold login: visible muted placeholder under title */
        .dl-ws-name-line--user .dl-ws-name-input::placeholder {
          color:var(--dl-text-muted);
          opacity:1;
          font-weight:400;
          letter-spacing:-0.02em;
        }
        /* Path-like username: muted when settled (beat .dl-ws-name-input base color) */
        .dl-ws-name-line--user.has-value:not(:focus-within) .dl-ws-name-input {
          color:var(--dl-text-muted);
        }
        .dl-ws-name-line--user:focus-within .dl-ws-name-input {
          color:#1e1e20;
        }
        /*
         * Fake caret — only while focused & empty (gone on blur).
         * Same geometry as client login (.al-ws-name-line). Native caret hidden to avoid double stroke.
         */
        .dl-ws-name-line:not(.has-value):focus-within::after {
          content:'';
          position:absolute;
          left:0;
          top:4px;
          width:2.5px;
          height:28px;
          border-radius:1.5px;
          background:#5B647D;
          animation: dlCaretBlink 1.05s steps(1, end) infinite;
          pointer-events:none;
        }
        .dl-ws-name-line:not(.has-value):focus-within .dl-ws-name-input {
          caret-color:transparent;
        }
        @keyframes dlCaretBlink {
          0%, 49% { opacity:1; }
          50%, 100% { opacity:0; }
        }
        .dl-context {
          margin:6px 0 0;
          font-size:15px;
          font-weight:400;
          line-height:20px;
          color:var(--dl-text-muted);
          letter-spacing:0.002em;
        }
        .dl-lede {
          margin:10px 0 0;
          font-size:14.5px;
          font-weight:400;
          line-height:1.55;
          color:#5c5c62;
          letter-spacing:0.002em;
          max-width:36em;
        }
        .sr-only {
          position:absolute;
          width:1px;
          height:1px;
          padding:0;
          margin:-1px;
          overflow:hidden;
          clip:rect(0,0,0,0);
          white-space:nowrap;
          border:0;
        }

        .dl-stack {
          display:flex;
          flex-direction:column;
          gap:12px;
        }

        .dl-btn {
          width:100%;
          height:45px;
          border-radius:999px;
          border:0;
          outline:none;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:12px;
          font-family:inherit;
          font-size:15px;
          font-weight:400;
          letter-spacing:var(--ls-body, 0.021em);
          cursor:pointer;
          padding:0 18px;
          -webkit-appearance:none;
          appearance:none;
          background-clip:padding-box;
          transition:background .15s, border-color .15s, color .15s, transform .08s ease, opacity .15s, box-shadow .15s;
          -webkit-tap-highlight-color:transparent;
        }
        .dl-btn:active:not(:disabled) { transform:scale(0.985); }
        .dl-btn:disabled { opacity:.55; cursor:not-allowed; }

        .dl-btn-ghost,
        .dl-btn-apple {
          background:var(--festag-btn-dark-bg, #ffffff);
          color:var(--festag-btn-dark-fg, #1e1e20);
          border:1px solid var(--festag-btn-dark-border, rgba(15, 23, 42, 0.08));
          box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(15, 23, 42, 0.06));
        }
        .dl-btn-ghost:hover:not(:disabled) {
          background:var(--festag-btn-dark-bg-hover, #fafafa);
          color:var(--festag-btn-dark-fg-hover, #1e1e20);
          border-color:var(--festag-btn-dark-border-hover, rgba(15, 23, 42, 0.10));
          box-shadow:var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(15, 23, 42, 0.06));
        }
        .dl-btn-ghost:active:not(:disabled) {
          background:var(--festag-btn-dark-bg-active, #f5f5f6);
          color:var(--festag-btn-dark-fg-active, #1e1e20);
          border-color:var(--festag-btn-dark-border-active, rgba(15, 23, 42, 0.10));
          box-shadow:var(--festag-btn-dark-shadow-active, none);
        }
        .dl-btn-apple:hover:not(:disabled) {
          background:var(--festag-btn-dark-bg-hover, #fafafa);
          border-color:var(--festag-btn-dark-border-hover, rgba(15, 23, 42, 0.10));
          box-shadow:var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(15, 23, 42, 0.06));
        }
        .dl-btn-apple:active:not(:disabled) {
          background:var(--festag-btn-dark-bg-active, #f5f5f6);
          border-color:var(--festag-btn-dark-border-active, rgba(15, 23, 42, 0.10));
          box-shadow:var(--festag-btn-dark-shadow-active, none);
        }

        .dl-google-icon,
        .dl-github-icon,
        .dl-apple-icon {
          width:18px;
          height:18px;
          flex-shrink:0;
          display:block;
          object-fit:contain;
        }

        .dl-divider {
          display:flex;
          align-items:center;
          gap:10px;
          color:var(--dl-text-muted);
          font-size:13px;
          font-weight:400;
          letter-spacing:0.002em;
          margin:4px 0;
        }
        .dl-divider::before,
        .dl-divider::after {
          content:'';
          flex:1;
          height:1px;
          background:#e8e8ed;
        }

        .dl-input {
          width:100%;
          height:45px;
          border-radius:999px;
          /* Match .al-input: Sana outer hairline, transparent fill. */
          border:1px solid var(--festag-input-border, rgba(30,30,32,0.15));
          background-color:var(--festag-input-fill, transparent);
          background-image:none;
          color:#1e1e20;
          font-family:inherit;
          font-size:14px;
          font-weight:400;
          font-synthesis:none;
          letter-spacing:var(--ls-body, 0.021em);
          padding:0 18px;
          outline:none;
          caret-color:#1e1e20;
          box-shadow:none;
          transition:border-color .2s ease, opacity .18s ease;
        }
        .dl-input.mono {
          font-family:inherit;
          font-size:14px;
          font-weight:400;
        }
        .dl-input::placeholder {
          color:var(--festag-input-placeholder, var(--dl-text-muted-soft, #8e95a3));
          -webkit-text-fill-color:var(--festag-input-placeholder, var(--dl-text-muted-soft, #8e95a3));
          font-family:inherit;
          font-weight:400;
          letter-spacing:0.002em;
          opacity:1;
          transition: opacity .18s ease, letter-spacing .18s ease;
        }
        /* Empty hover — quiet lift. Focus or filled — accent stroke until cleared. */
        .dl-input:hover,
        .dl-input:active {
          background-color:var(--festag-input-fill-focus, transparent);
          background-image:none;
          border:1px solid var(--festag-input-border-hover, rgba(30,30,32,0.20));
          outline:none;
        }
        .dl-input:not(:placeholder-shown),
        .dl-input:focus,
        .dl-input:focus-visible {
          background-color:var(--festag-input-fill-focus, transparent);
          background-image:none;
          border:var(--festag-input-border-width-focus, 1.5px) solid var(--festag-input-border-focus, #5B647D);
          outline:none;
        }
        .dl-root:not([data-theme="dark"]) .dl-input {
          background:transparent !important;
          background-color:transparent !important;
          background-image:none !important;
          color:#1e1e20 !important;
          -webkit-text-fill-color:#1e1e20;
          caret-color:#1e1e20;
          border:1px solid var(--festag-input-border, rgba(30,30,32,0.15)) !important;
        }
        .dl-root:not([data-theme="dark"]) .dl-input::placeholder {
          color:var(--festag-input-placeholder, #8e95a3) !important;
          -webkit-text-fill-color:var(--festag-input-placeholder, #8e95a3) !important;
          opacity:1 !important;
        }
        .dl-root:not([data-theme="dark"]) .dl-input:hover,
        .dl-root:not([data-theme="dark"]) .dl-input:active {
          background:transparent !important;
          background-color:transparent !important;
          border-color:var(--festag-input-border-hover, rgba(30,30,32,0.20)) !important;
        }
        .dl-root:not([data-theme="dark"]) .dl-input:not(:placeholder-shown),
        .dl-root:not([data-theme="dark"]) .dl-input:focus,
        .dl-root:not([data-theme="dark"]) .dl-input:focus-visible {
          background:transparent !important;
          background-color:transparent !important;
          border-width:var(--festag-input-border-width-focus, 1.5px) !important;
          border-color:var(--festag-input-border-focus, #5B647D) !important;
        }
        /* Chrome autofill — canvas-matched inset. */
        .dl-input:-webkit-autofill,
        .dl-input:-webkit-autofill:hover,
        .dl-input:-webkit-autofill:focus,
        .dl-input:-webkit-autofill:active {
          -webkit-text-fill-color:#1e1e20 !important;
          caret-color:#1e1e20;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          background-color:transparent !important;
          background-image:none !important;
          border:1px solid var(--festag-input-border, rgba(30,30,32,0.15)) !important;
          -webkit-box-shadow:0 0 0 1000px #ffffff inset !important;
          box-shadow:0 0 0 1000px #ffffff inset !important;
          transition:background-color 9999s ease-out 0s;
        }
        .dl-root:not([data-theme="dark"]) .dl-input:-webkit-autofill,
        .dl-root:not([data-theme="dark"]) .dl-input:-webkit-autofill:hover,
        .dl-root:not([data-theme="dark"]) .dl-input:-webkit-autofill:focus,
        .dl-root:not([data-theme="dark"]) .dl-input:-webkit-autofill:active {
          background-color:transparent !important;
          border:1px solid var(--festag-input-border, rgba(30,30,32,0.15)) !important;
          -webkit-box-shadow:0 0 0 1000px #ffffff inset !important;
          box-shadow:0 0 0 1000px #ffffff inset !important;
          -webkit-text-fill-color:#1e1e20 !important;
        }
        .dl-ws-status {
          margin:6px 0 0;
          font-size:12px;
          line-height:1.35;
          font-weight:400;
          color:var(--dl-text-muted);
          letter-spacing:0.002em;
          min-height:16px;
        }
        .dl-ws-status--ok { color:#2E9B52; }
        .dl-ws-status--bad { color:#c9342a; }

        .dl-hint {
          margin:0 0 2px;
          font-size:12px;
          line-height:1.4;
          color:var(--dl-text-muted);
          text-align:center;
          letter-spacing:0.002em;
          width:100%;
        }

        .dl-link,
        .dl-back {
          font-family:inherit;
          font-size:14px;
          font-weight:400;
          color:var(--dl-text-muted);
          background:none;
          border:none;
          cursor:pointer;
          text-align:left;
          letter-spacing:0.002em;
          padding:4px 0;
        }
        .dl-link:hover,
        .dl-back:hover { color:#1e1e20; }
        .dl-link:disabled { opacity:.5; cursor:not-allowed; }

        .dl-legal {
          flex-shrink:0;
          font-size:12px;
          font-weight:400;
          line-height:1.5;
          color:var(--dl-text-muted);
          letter-spacing:0.002em;
          text-align:left;
        }
        /* Desktop: legal under form CTAs (inside panel). */
        .dl-legal--under-form {
          width:100%;
          max-width:100%;
          margin:16px 0 0;
          padding:0;
        }
        /* Mobile-only dock near footer. */
        .dl-legal--mobile-dock {
          display:none;
        }
        .dl-container:has(.dl-legal--under-form) .dl-main {
          padding-bottom:120px;
        }
        .dl-legal a {
          color:inherit;
          font-weight:400;
          text-decoration:none;
          border-bottom:1px solid color-mix(in srgb, currentColor 42%, transparent);
          transition:border-color .15s;
        }
        .dl-legal a:hover { border-bottom-color:currentColor; }
        .dl-under-cta-switch {
          display:inline-flex;
          align-items:center;
          margin:0;
          padding:2px 0;
          border:0;
          background:transparent;
          font-family:inherit;
          font-size:14px;
          font-weight:400;
          line-height:1.3;
          letter-spacing:var(--ls-body, 0.021em);
          color:#1e1e20;
          text-decoration:none;
          cursor:pointer;
          -webkit-tap-highlight-color:transparent;
          transition:opacity .15s, color .15s;
        }
        .dl-under-cta-switch:hover { opacity:0.72; }
        .dl-help-link {
          border:0;
          background:transparent;
          padding:0;
          font:inherit;
          font-size:inherit;
          font-weight:400;
          color:#1e1e20;
          text-decoration:underline;
          text-underline-offset:2px;
          cursor:pointer;
        }
        .dl-root[data-theme="dark"] .dl-help-link { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-legal { color:var(--dl-text-muted); }
        .dl-root[data-theme="dark"] .dl-under-cta-switch { color:#f5f5f7; }

        .dl-error {
          margin:0;
          padding:11px 14px;
          background:rgba(201, 52, 42, 0.06);
          border:0;
          border-radius:14px;
          box-shadow:inset 0 0 0 1px rgba(201, 52, 42, 0.10);
          color:#b42318;
          font-size:13px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:-0.011em;
          text-align:left;
          animation: dlErrorIn .28s cubic-bezier(.16,1,.3,1) both;
        }
        .dl-root[data-theme="dark"] .dl-error {
          background:rgba(255, 107, 97, 0.10);
          box-shadow:inset 0 0 0 1px rgba(255, 107, 97, 0.16);
          color:#ff9a93;
          border:0;
        }
        @keyframes dlErrorIn {
          from { opacity:0; transform:translateY(-3px); }
          to { opacity:1; transform:translateY(0); }
        }

        .dl-footer-meta {
          position:fixed;
          left:0;
          right:0;
          bottom:0;
          z-index:20;
          display:flex;
          flex-direction:row;
          align-items:center;
          justify-content:flex-start;
          gap:10px;
          /* Same centered 360px column as .dl-panel */
          padding:16px var(--dl-col-pad) max(20px, env(safe-area-inset-bottom));
          margin:0;
          width:100%;
          max-width:none;
          text-align:left;
          pointer-events:none;
          background:transparent;
          border-top:none;
          box-sizing:border-box;
        }
        .dl-footer-meta > * { pointer-events:auto; }
        .dl-footer-center {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:12px;
          flex-shrink:0;
        }
        .dl-footer-links--desktop {
          display:flex;
        }
        .dl-panel-switch-trigger {
          display:none;
        }
        .dl-account-hint {
          display:none;
          margin:14px 0 0;
          font-size:13.5px;
          line-height:1.45;
          letter-spacing:var(--ls-body, 0.021em);
          color:var(--dl-text-muted);
          text-align:left;
        }
        .dl-account-hint-link {
          display:inline;
          margin:0;
          padding:0;
          border:0;
          background:none;
          font:inherit;
          color:#1e1e20;
          text-decoration:underline;
          text-underline-offset:2px;
          cursor:pointer;
        }

        .dl-theme-icon {
          width:28px;
          height:28px;
          flex-shrink:0;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:0;
          border-radius:999px;
          background:transparent;
          color:var(--dl-text-muted);
          cursor:pointer;
          transition:color .15s ease, transform .15s ease;
          -webkit-tap-highlight-color:transparent;
        }
        .dl-theme-icon:hover {
          color:#1e1e20;
          background:transparent;
        }
        .dl-theme-icon:active { transform:scale(0.96); }
        /* Desktop: theme in footer next to Client Portal. Mobile: header next to docs. */
        .dl-theme-icon--header { display:none; }
        .dl-theme-icon--footer { display:inline-flex; }

        .dl-footer-links {
          display:flex;
          align-items:center;
          justify-content:flex-start;
          flex-wrap:wrap;
          gap:8px;
        }
        .dl-footer-sep {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          width:1px;
          height:11px;
          padding:0;
          margin:0;
          border:0;
          background:#c7c7cc;
          color:transparent;
          font-size:0;
          line-height:0;
          overflow:hidden;
          user-select:none;
        }
        /* Match client .al-ssl-badge / .al-dev-link exactly (11px) — never font:inherit */
        .dl-ssl,
        .dl-dev-link {
          font-family:inherit;
          font-size:11px;
          font-weight:400;
          letter-spacing:0.002em;
          line-height:1.55;
          color:var(--dl-text-muted);
          text-decoration:none;
        }
        .dl-ssl {
          display:inline-flex;
          align-items:center;
          gap:5px;
          margin:0;
          padding:0;
          border:0;
          background:transparent;
          color:var(--dl-text-muted);
          cursor:pointer;
          box-shadow:none;
          -webkit-appearance:none;
          appearance:none;
          user-select:none;
        }
        .dl-ssl:hover,
        .dl-ssl:active,
        .dl-dev-link:hover,
        .dl-dev-link:active { color:#1e1e20; transform:none; text-decoration:none; }
        .dl-ssl:focus-visible { color:#1e1e20; outline:none; }
        .dl-dev-link {
          transition:color .15s;
        }
        .dl-ssl svg {
          width:0.85em;
          height:1em;
          flex-shrink:0;
          display:block;
        }

        .dl-root[data-theme="dark"] {
          /* Opaque OLED — same canvas as Client auth (.al-root). */
          background:#000000;
          color:#f5f5f7;
          /* Calm Apple-gray muted on black — same spirit as light #8891a0 hierarchy */
          --dl-text-muted:rgba(245, 245, 247, 0.55);
          --dl-text-muted-soft:rgba(245, 245, 247, 0.40);
          ${AUTH_CHROME_VARS_DARK}
        }
        .dl-root[data-theme="dark"] .dl-wordmark { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-title { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-ws-name-input {
          color:var(--festag-input-fg, rgba(232,236,242,0.94));
          caret-color:var(--festag-input-caret, rgba(198,206,222,0.78));
        }
        .dl-root[data-theme="dark"] .dl-ws-name-line--user.has-value:not(:focus-within) .dl-ws-name-input {
          color:var(--dl-text-muted);
        }
        .dl-root[data-theme="dark"] .dl-ws-name-line--user:focus-within .dl-ws-name-input {
          color:var(--festag-input-fg, rgba(232,236,242,0.94));
        }
        .dl-root[data-theme="dark"] .dl-ws-name-line:not(.has-value):focus-within::after {
          background:rgba(198,206,222,0.78);
          animation: dlCaretBlink 1.05s steps(1, end) infinite;
        }
        .dl-root[data-theme="dark"] .dl-ws-status { color:var(--dl-text-muted-soft); }
        .dl-root[data-theme="dark"] .dl-ws-status--ok { color:#3dba66; }
        .dl-root[data-theme="dark"] .dl-ws-status--bad { color:#ff6961; }
        .dl-root[data-theme="dark"] .dl-context { color:var(--dl-text-muted); }
        .dl-root[data-theme="dark"] .dl-lede { color:rgba(245, 245, 247, 0.55); }
        .dl-root[data-theme="dark"] .dl-otp-label { color:var(--dl-text-muted); }
        /* Ghost CTAs — same as .al-btn-ghost (soft slate + hairline stroke). */
        .dl-root[data-theme="dark"] .dl-btn-ghost {
          background:var(--festag-btn-dark-bg, rgba(186,194,210,0.06));
          color:var(--festag-btn-dark-fg, rgba(245,245,247,0.88));
          border:1px solid var(--festag-btn-dark-border, rgba(255,255,255,0.06));
          box-shadow:var(--festag-btn-dark-shadow, none);
        }
        .dl-root[data-theme="dark"] .dl-btn-ghost:hover:not(:disabled),
        .dl-root[data-theme="dark"] .dl-btn-ghost:focus-visible:not(:disabled) {
          background:var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.09));
          color:var(--festag-btn-dark-fg-hover, #f5f5f7);
          border-color:var(--festag-btn-dark-border-hover, rgba(255,255,255,0.09));
          box-shadow:var(--festag-btn-dark-shadow-hover, none);
        }
        .dl-root[data-theme="dark"] .dl-btn-ghost:active:not(:disabled) {
          background:var(--festag-btn-dark-bg-active, rgba(186,194,210,0.12));
          color:var(--festag-btn-dark-fg-active, #f5f5f7);
          border-color:var(--festag-btn-dark-border-active, rgba(255,255,255,0.07));
          box-shadow:var(--festag-btn-dark-shadow-active, none);
        }
        /* Apple stays white + Festag black in dark mode (HIG / brand consistency). */
        .dl-root[data-theme="dark"] .dl-btn-apple {
          background:#ffffff;
          color:#1e1e20;
          border:0.7px solid transparent;
          box-shadow:none;
        }
        .dl-root[data-theme="dark"] .dl-btn-apple:hover:not(:disabled) {
          background:#f5f5f7;
          border-color:transparent;
          color:#1e1e20;
          box-shadow:none;
        }
        .dl-root[data-theme="dark"] .dl-btn-apple:active:not(:disabled) {
          background:#e8e8ed;
          border-color:transparent;
          color:#1e1e20;
          box-shadow:none;
        }
        /* Dark auth inputs — transparent fill + Sana-style outer hairline stroke. */
        .dl-root[data-theme="dark"] .dl-input {
          background:transparent !important;
          background-color:transparent !important;
          background-image:none !important;
          border:1px solid var(--festag-input-border, rgba(255,255,255,0.15)) !important;
          color:var(--festag-input-fg, rgba(232,236,242,0.94)) !important;
          -webkit-text-fill-color:var(--festag-input-fg, rgba(232,236,242,0.94));
          caret-color:var(--festag-input-caret, rgba(198,206,222,0.78));
          box-shadow:none;
          transition:border-color .2s ease;
        }
        .dl-root[data-theme="dark"] .dl-input::placeholder {
          color:var(--festag-input-placeholder, rgba(245,245,247,0.32)) !important;
          -webkit-text-fill-color:var(--festag-input-placeholder, rgba(245,245,247,0.32)) !important;
          opacity:1 !important;
        }
        .dl-root[data-theme="dark"] .dl-input:hover,
        .dl-root[data-theme="dark"] .dl-input:active {
          background:transparent !important;
          background-color:transparent !important;
          background-image:none !important;
          border:1px solid var(--festag-input-border-hover, rgba(255,255,255,0.20)) !important;
          box-shadow:none;
          outline:none;
        }
        .dl-root[data-theme="dark"] .dl-input:not(:placeholder-shown),
        .dl-root[data-theme="dark"] .dl-input:focus,
        .dl-root[data-theme="dark"] .dl-input:focus-visible {
          background:transparent !important;
          background-color:transparent !important;
          background-image:none !important;
          border:var(--festag-input-border-width-focus, 1.5px) solid var(--festag-input-border-focus, #5B647D) !important;
          box-shadow:none;
          outline:none;
        }
        /* Dark autofill — soft slate + keep outer stroke. */
        .dl-root[data-theme="dark"] .dl-input:-webkit-autofill,
        .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:hover,
        .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:focus,
        .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:active,
        html[data-theme="dark"] .dl-root[data-theme="dark"] .dl-input:-webkit-autofill,
        html[data-theme="dark"] .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:hover,
        html[data-theme="dark"] .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:focus,
        html[data-theme="dark"] .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:active,
        html[data-theme="classic-dark"] .dl-root[data-theme="dark"] .dl-input:-webkit-autofill,
        html[data-theme="classic-dark"] .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:hover,
        html[data-theme="classic-dark"] .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:focus,
        html[data-theme="classic-dark"] .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:active {
          -webkit-text-fill-color:var(--festag-input-fg, rgba(232,236,242,0.94)) !important;
          caret-color:var(--festag-input-caret, rgba(198,206,222,0.78)) !important;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          background-color:#1c1d22 !important;
          background-image:none !important;
          border:1px solid var(--festag-input-border, rgba(255,255,255,0.15)) !important;
          -webkit-box-shadow:0 0 0 1000px #1c1d22 inset !important;
          box-shadow:0 0 0 1000px #1c1d22 inset !important;
          transition:background-color 9999s ease-out 0s;
        }
        .dl-root[data-theme="dark"] .dl-input:-webkit-autofill,
        .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:hover,
        .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:focus,
        .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:active {
          background-color:#24262c !important;
          border-width:var(--festag-input-border-width-focus, 1.5px) !important;
          border-color:var(--festag-input-border-focus, #5B647D) !important;
          -webkit-box-shadow:0 0 0 1000px #24262c inset !important;
          box-shadow:0 0 0 1000px #24262c inset !important;
        }
        .dl-root[data-theme="dark"] .dl-divider { color:var(--dl-text-muted-soft); }
        .dl-root[data-theme="dark"] .dl-divider::before,
        .dl-root[data-theme="dark"] .dl-divider::after { background:rgba(186,194,210,0.22); }
        .dl-root[data-theme="dark"] .dl-hint,
        .dl-root[data-theme="dark"] .dl-link,
        .dl-root[data-theme="dark"] .dl-back { color:var(--dl-text-muted); }
        .dl-root[data-theme="dark"] .dl-link:hover,
        .dl-root[data-theme="dark"] .dl-back:hover { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-theme-icon { color:var(--dl-text-muted); background:transparent; }
        .dl-root[data-theme="dark"] .dl-theme-icon:hover {
          color:#f5f5f7;
          background:transparent;
        }
        .dl-root[data-theme="dark"] .dl-ssl,
        .dl-root[data-theme="dark"] .dl-dev-link { color:var(--dl-text-muted); }
        .dl-root[data-theme="dark"] .dl-ssl:hover,
        .dl-root[data-theme="dark"] .dl-ssl:active,
        .dl-root[data-theme="dark"] .dl-dev-link:hover,
        .dl-root[data-theme="dark"] .dl-dev-link:active { color:#f5f5f7; transform:none; }
        .dl-root[data-theme="dark"] .dl-footer-sep {
          background:rgba(245,245,247,0.28);
          color:transparent;
        }

        @media (min-width: 769px) {
          .dl-btn:active:not(:disabled) { transform:scale(0.98); }
        }

        @media (max-width: 768px) {
          .dl-root {
            /* Fixed 24px gutters — same left edge for header / form / legal / footer */
            --dl-col-pad:var(--dl-mobile-gutter);
          }
          .dl-header {
            padding:max(6px, env(safe-area-inset-top)) var(--dl-col-pad) 4px;
            gap:10px;
            align-items:center;
            justify-content:flex-end;
          }
          .dl-wordmark {
            font-size:17px;
            line-height:1.2;
            letter-spacing:-0.018em;
            padding:2px 0 3px 1px;
            max-width:min(68vw, 220px);
          }
          .dl-header-actions {
            gap:2px;
          }
          .dl-header .auth-docs-trigger,
          .dl-panel-switch-trigger,
          .dl-theme-icon--header {
            width:28px !important;
            height:28px !important;
            min-width:28px !important;
            min-height:28px !important;
            max-width:28px !important;
            max-height:28px !important;
          }
          .dl-panel-switch-trigger {
            display:inline-flex !important;
            align-items:center;
            justify-content:center;
            border:0;
            border-radius:999px;
            background:transparent;
            color:#6e6e73;
            cursor:pointer;
            -webkit-tap-highlight-color:transparent;
          }
          .dl-root[data-theme="dark"] .dl-panel-switch-trigger {
            color:rgba(245,245,247,0.55);
          }
          .dl-theme-icon--header { display:none !important; }
          .dl-theme-icon--footer { display:inline-flex !important; }
          .dl-main {
            flex:1;
            min-height:0;
            display:flex;
            align-items:stretch;
            justify-content:center;
            padding:8px var(--dl-col-pad) max(72px, calc(52px + env(safe-area-inset-bottom)));
          }
          h1.dl-title {
            font-size:var(--dl-hero-display-size, 32px) !important;
            line-height:var(--dl-hero-display-lh, 38px) !important;
            letter-spacing:-0.028em;
          }
          .dl-root {
            --dl-hero-display-size:32px;
            --dl-hero-display-lh:38px;
            --dl-hero-caret-h:28px;
            --al-hero-display-size:32px;
            --al-hero-display-lh:38px;
            --al-hero-caret-h:28px;
          }
          .dl-ws-name-input,
          .dl-hero-copy .auth-ws-path,
          .dl-hero-copy button.auth-ws-path--tap,
          .dl-hero-copy button.auth-ws-path--edit,
          .dl-hero-copy .auth-expand-slash,
          .dl-hero-copy .auth-expand-compact {
            font-size:var(--dl-hero-display-size) !important;
            line-height:var(--dl-hero-display-lh) !important;
          }
          .dl-hero-copy .auth-expand-idle-caret {
            height:var(--dl-hero-caret-h) !important;
            font-size:var(--dl-hero-display-size) !important;
            line-height:var(--dl-hero-display-lh) !important;
          }
          .dl-hero-copy .auth-ws-path,
          .dl-hero-copy button.auth-ws-path--tap,
          .dl-hero-copy button.auth-ws-path--edit,
          .dl-hero-copy .auth-expand-slash {
            color:#5c6370 !important;
          }
          .dl-root[data-theme="dark"] .dl-hero-copy .auth-ws-path,
          .dl-root[data-theme="dark"] .dl-hero-copy button.auth-ws-path--tap,
          .dl-root[data-theme="dark"] .dl-hero-copy button.auth-ws-path--edit,
          .dl-root[data-theme="dark"] .dl-hero-copy .auth-expand-slash {
            color:rgba(232,236,242,0.78) !important;
          }
          .dl-account-hint {
            display:block !important;
            margin:14px 0 0;
            font-size:13.5px;
            line-height:1.45;
            letter-spacing:var(--ls-body, 0.021em);
            color:var(--dl-text-muted);
            text-align:left;
          }
          .dl-account-hint-link {
            display:inline;
            margin:0;
            padding:0;
            border:0;
            background:none;
            font:inherit;
            color:#1e1e20;
            text-decoration:underline;
            text-underline-offset:2px;
            cursor:pointer;
          }
          .dl-root[data-theme="dark"] .dl-account-hint-link {
            color:#f5f5f7;
          }
          .dl-legal--mobile-dock { display:none !important; }
          .dl-cross-link--desktop-only,
          .dl-footer-sep--desktop-only {
            display:none !important;
          }
          .dl-footer-meta {
            justify-content:center;
            padding:10px var(--dl-col-pad) max(14px, env(safe-area-inset-bottom));
            gap:0;
          }
          .dl-footer-center {
            display:inline-flex !important;
            align-items:center;
            justify-content:center;
            gap:14px;
          }
          .dl-footer-links--desktop {
            display:none !important;
          }
          .dl-main {
            flex:1;
            min-height:0;
            display:flex;
            align-items:center;
            justify-content:flex-start;
            /* Match AuthLanding /enter mobile inset: 4 / 24 / 12 (dock) */
            padding:4px var(--dl-col-pad) 112px;
          }
          .dl-container:has(.dl-legal--mobile-dock) .dl-main { padding-bottom:12px; }
          .dl-legal--under-form { display:none !important; }
          .dl-legal--mobile-dock {
            display:none !important;
          }
          .dl-cross-link--desktop-only,
          .dl-footer-sep--desktop-only {
            display:none !important;
          }
          .dl-ws-name-line { min-height:var(--dl-hero-display-lh, 38px); }
          .dl-ws-name-line:not(.has-value):focus-within::after {
            top:5px;
            height:var(--dl-hero-caret-h, 28px);
            width:1px;
          }
          .dl-theme-icon--header { display:none !important; }
          .dl-theme-icon--footer { display:inline-flex !important; }
          .dl-footer-meta {
            justify-content:center;
            text-align:center;
            padding:10px var(--dl-col-pad) max(14px, env(safe-area-inset-bottom));
            gap:0;
          }
          .dl-footer-center {
            display:inline-flex !important;
            align-items:center;
            justify-content:center;
            gap:14px;
          }
          .dl-footer-links--desktop {
            display:none !important;
          }
          .dl-ssl,
          .dl-dev-link {
            min-height:0;
          }
          .dl-input { height:45px; font-size:15px; border-radius:999px; box-shadow:none; padding:0 18px; }
          .dl-btn {
            height:45px;
            min-height:45px;
            font-size:15px;
            border-radius:999px;
            gap:10px;
            padding:0 16px;
          }
          .dl-btn:has(.dl-google-icon),
          .dl-btn:has(.dl-apple-icon),
          .dl-btn:has(.dl-github-icon) {
            font-size:15px;
            letter-spacing:-0.015em;
            padding:0 16px;
            gap:10px;
          }
          .dl-btn:has(.dl-google-icon) span,
          .dl-btn:has(.dl-apple-icon) span,
          .dl-btn:has(.dl-github-icon) span {
            min-width:0;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            font-size:inherit;
            letter-spacing:inherit;
            font-weight:400;
          }
          .dl-btn .dl-google-icon,
          .dl-btn .dl-apple-icon,
          .dl-btn .dl-github-icon {
            width:16px;
            height:16px;
          }
          .dl-btn-ghost,
          .dl-btn-apple {
            border:1px solid var(--festag-btn-dark-border, rgba(15, 23, 42, 0.08)) !important;
            box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(15, 23, 42, 0.06)) !important;
          }
          .dl-btn-ghost:hover:not(:disabled),
          .dl-btn-apple:hover:not(:disabled) {
            background:var(--festag-btn-dark-bg-hover, #fafafa) !important;
            border-color:var(--festag-btn-dark-border-hover, rgba(15, 23, 42, 0.10)) !important;
            box-shadow:var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(15, 23, 42, 0.06)) !important;
          }
          .dl-btn-ghost:active:not(:disabled),
          .dl-btn-apple:active:not(:disabled) {
            background:var(--festag-btn-dark-bg-active, #f5f5f6) !important;
            border-color:var(--festag-btn-dark-border-active, rgba(15, 23, 42, 0.10)) !important;
            box-shadow:var(--festag-btn-dark-shadow-active, none) !important;
          }
          .dl-root[data-theme="dark"] .dl-btn-ghost {
            border:1px solid var(--festag-btn-dark-border, rgba(255,255,255,0.06)) !important;
            box-shadow:var(--festag-btn-dark-shadow, none) !important;
          }
          .dl-root[data-theme="dark"] .dl-btn-apple {
            border-color:transparent !important;
            box-shadow:none !important;
          }

          /* Dev register: header + footer scroll with content; mobile-only vertical center when short */
          .dl-root--register,
          .dl-root--register .dl-container {
            height:auto;
            max-height:none;
            min-height:100dvh;
            overflow:visible;
          }
          .dl-root--register .dl-main {
            flex:1 0 auto;
            min-height:min(100dvh, 520px);
            display:flex;
            align-items:center;
            justify-content:flex-start;
            padding:4px var(--dl-col-pad) 20px;
          }
          .dl-root--register .dl-legal--mobile-dock {
            padding:8px var(--dl-col-pad) 12px;
          }
          .dl-root--register .dl-footer-meta {
            position:relative;
            left:auto;
            right:auto;
            bottom:auto;
            margin-top:auto;
            padding:8px var(--dl-col-pad) max(16px, env(safe-area-inset-bottom));
          }
        }
      `}</style>

      <div className="dl-container">
        <header className="dl-header">
          <div className="dl-header-actions">
            <AuthDocsPopover />
            <button
              type="button"
              className="dl-panel-switch-trigger no-min-tap"
              aria-label="Zum Client Portal wechseln"
              onClick={() => setPanelSwitchOpen(true)}
            >
              <Users size={17} weight="regular" />
            </button>
            <button
              type="button"
              className="dl-theme-icon dl-theme-icon--header no-min-tap"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
            </button>
          </div>
        </header>

        <main className="dl-main">
          <section className="dl-panel" aria-label="Developer Login">
            <div className={`dl-panel-body${animating ? ' animating' : ''}`}>
            <div className="dl-hero-copy">
              <h1 className="dl-title">{title}</h1>
              {stepLede ? <p className="dl-lede">{stepLede}</p> : null}
              {authStep === 'register' ? (
                <>
                  {wsAvailability === 'available' && displayWsNormalized && !wsNameEditing ? (
                    <AuthWorkspacePath
                      name={displayWsNormalized}
                      onEdit={startEditingWorkspaceName}
                    />
                  ) : (
                    <AuthExpandableTextField
                      ref={wsRef}
                      lineClassName={`dl-ws-name-line${workspaceName ? ' has-value' : ''}`}
                      inputClassName="dl-ws-name-input"
                      srLabel="Workspace-Name"
                      type="text"
                      autoComplete="organization"
                      value={workspaceName}
                      onChange={e => updateWorkspaceName(e.target.value)}
                      onInput={e => updateWorkspaceName((e.target as HTMLInputElement).value)}
                      onBlur={handleWorkspaceNameBlur}
                      placeholder=""
                      spellCheck={false}
                      autoCapitalize="words"
                      maxLength={64}
                      aria-label="Workspace-Name"
                      aria-invalid={wsAvailability === 'taken' || wsAvailability === 'invalid'}
                    />
                  )}
                  {wsAvailability === 'checking' && displayWsNormalized ? (
                    <p className="dl-ws-status">Wird geprüft…</p>
                  ) : null}
                  {wsAvailability === 'available' && displayWsNormalized && wsNameEditing ? (
                    <p className="dl-ws-status dl-ws-status--ok">Benutzername verfügbar</p>
                  ) : null}
                  {(wsAvailability === 'taken' || wsAvailability === 'invalid') && wsAvailabilityMsg ? (
                    <p className="dl-ws-status dl-ws-status--bad">{wsAvailabilityMsg}</p>
                  ) : null}
                </>
              ) : authStep === 'setPin' && (displayWorkspace || workspaceName) ? (
                <AuthWorkspacePath name={displayWorkspace || workspaceName || ''} />
              ) : authStep === 'main' ? (
                <>
                  <AuthExpandableTextField
                    ref={userRef}
                    lineClassName={`dl-ws-name-line dl-ws-name-line--user${username ? ' has-value' : ''}`}
                    inputClassName="dl-ws-name-input"
                    srLabel="Benutzername"
                    withSlash
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={e => updateUsername(e.target.value)}
                    onInput={e => updateUsername((e.target as HTMLInputElement).value)}
                    onBlur={handleUsernameBlur}
                    placeholder="Benutzer eingeben"
                    spellCheck={false}
                    autoCapitalize="none"
                    maxLength={64}
                    aria-label="Benutzername"
                    aria-invalid={userAvailability === 'not_found' || userAvailability === 'invalid'}
                    aria-describedby={usernameStatusMsg ? 'dl-user-status' : undefined}
                    onExpandEnter={() => {
                      if (userAvailability === 'found') pinRef.current?.focus()
                      else userRef.current?.focus()
                    }}
                  />
                  {usernameStatusMsg ? (
                    <p id="dl-user-status" className={usernameStatusClass} role="status">
                      {usernameStatusMsg}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="dl-stack">
              {error ? <p className="dl-error">{error}</p> : null}

              {authStep === 'main' ? (
                <>
                  {usernameKnown && showProviders ? (
                    <>
                      {options.google ? (
                        <button
                          className="dl-btn dl-btn-ghost"
                          type="button"
                          onClick={() => handleOauth('google')}
                          disabled={oauthLoading !== null || loading}
                        >
                          <GoogleBrandIcon className="dl-google-icon" />
                          <span>{oauthLoading === 'google' ? 'Wird geöffnet…' : 'Mit Google fortfahren'}</span>
                        </button>
                      ) : null}
                      {options.apple ? (
                        <button
                          className="dl-btn dl-btn-apple"
                          type="button"
                          onClick={() => handleOauth('apple')}
                          disabled={oauthLoading !== null || loading}
                        >
                          <AppleBrandIcon className="dl-apple-icon" />
                          <span>{oauthLoading === 'apple' ? 'Wird geöffnet…' : 'Mit Apple fortfahren'}</span>
                        </button>
                      ) : null}
                      {options.github ? (
                        <button
                          className="dl-btn dl-btn-ghost"
                          type="button"
                          onClick={() => handleOauth('github')}
                          disabled={oauthLoading !== null || loading}
                        >
                          <svg className="dl-github-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.3 1.19-3.11-.12-.29-.51-1.48.11-3.08 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.6.23 2.79.11 3.08.74.81 1.19 1.85 1.19 3.11 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" fill="currentColor"/>
                          </svg>
                          <span>{oauthLoading === 'github' ? 'Wird geöffnet…' : 'Mit GitHub fortfahren'}</span>
                        </button>
                      ) : null}
                      {options.email ? (
                        <button
                          className="dl-btn dl-btn-ghost"
                          type="button"
                          onClick={() => { void handleEmailLogin() }}
                          disabled={oauthLoading !== null || loading}
                        >
                          <span>{oauthLoading === 'email' ? 'Wird gesendet…' : 'Mit E-Mail fortfahren'}</span>
                        </button>
                      ) : null}
                      {emailSent ? (
                        <p className="dl-hint">Prüfe deine E-Mails — der Anmeldelink ist unterwegs.</p>
                      ) : null}
                      <div className="dl-divider"><span>oder PIN</span></div>
                    </>
                  ) : null}

                  <form className="dl-stack" onSubmit={e => { e.preventDefault(); void submitPin() }}>
                    <AuthOtpInput
                      ref={pinRef}
                      value={pin}
                      onChange={next => {
                        setPin(next)
                        if (error) setError('')
                      }}
                      onComplete={full => {
                        // Auto-submit only when username is present; otherwise
                        // focus the under-title field with a precise message.
                        if (!username.trim()) {
                          setPin(full)
                          setError('Bitte Benutzername eingeben.')
                          userRef.current?.focus()
                          return
                        }
                        if (userAvailability === 'not_found' || userAvailability === 'invalid') {
                          setPin(full)
                          setError(
                            userAvailability === 'invalid'
                              ? 'Bitte einen gültigen Benutzernamen eingeben.'
                              : 'Benutzername nicht gefunden.',
                          )
                          userRef.current?.focus()
                          return
                        }
                        void submitPin(full)
                      }}
                      disabled={loading || oauthLoading !== null}
                      aria-label="PIN Code"
                    />
                    <button
                      className="dl-btn dl-btn-ghost"
                      type="submit"
                      disabled={
                        loading
                        || oauthLoading !== null
                        || pin.replace(/\D/g, '').length !== 6
                        || !username.trim()
                        || userAvailability === 'not_found'
                        || userAvailability === 'invalid'
                        || userAvailability === 'checking'
                        || userAvailability === 'idle'
                      }
                    >
                      {loading ? 'Wird geprüft…' : 'Anmelden'}
                    </button>
                  </form>
                </>
              ) : null}

              {authStep === 'register' ? (
                <form className="dl-stack" onSubmit={e => { e.preventDefault(); continueRegister() }}>
                  <button
                    className="dl-btn dl-btn-ghost"
                    type="button"
                    onClick={() => handleOauth('github')}
                    disabled={oauthLoading !== null || loading}
                  >
                    <svg className="dl-github-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.3 1.19-3.11-.12-.29-.51-1.48.11-3.08 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.6.23 2.79.11 3.08.74.81 1.19 1.85 1.19 3.11 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" fill="currentColor"/>
                    </svg>
                    <span>{oauthLoading === 'github' ? 'Wird geöffnet…' : 'Mit GitHub fortfahren'}</span>
                  </button>
                  <div className="dl-divider"><span>oder Einladungs-PIN</span></div>
                  <AuthOtpInput
                    ref={inviteRef}
                    value={invitePin}
                    onChange={next => {
                      setInvitePin(next)
                      if (error) setError('')
                    }}
                    disabled={loading || oauthLoading !== null}
                    aria-label="Einladungs-PIN"
                  />
                  <button
                    className="dl-btn dl-btn-ghost"
                    type="submit"
                    disabled={loading || oauthLoading !== null || !wsReady || invitePin.replace(/\D/g, '').length !== 6}
                  >
                    {loading ? 'Wird geprüft…' : 'Weiter'}
                  </button>
                  <button
                    className="dl-link"
                    type="button"
                    onClick={handleResendPin}
                    disabled={resending || resendCooldown > 0}
                  >
                    {resendLabel}
                  </button>
                  <button
                    className="dl-back"
                    type="button"
                    onClick={() => {
                      welcomeIntentRef.current = false
                      goTo('main')
                    }}
                  >
                    Zurück zur Anmeldung
                  </button>
                </form>
              ) : null}

              {authStep === 'setPin' ? (
                <form className="dl-stack" onSubmit={e => { e.preventDefault(); void completeRegister() }}>
                  <div className="dl-otp-block">
                    <p className="dl-otp-label">Neuer PIN</p>
                    <AuthOtpInput
                      value={newPin}
                      onChange={next => {
                        setNewPin(next)
                        if (error) setError('')
                      }}
                      onComplete={() => confirmPinRef.current?.focus()}
                      disabled={loading}
                      autoFocus
                      aria-label="Neuer PIN"
                    />
                  </div>
                  <div className="dl-otp-block">
                    <p className="dl-otp-label">PIN bestätigen</p>
                    <AuthOtpInput
                      ref={confirmPinRef}
                      value={confirmPin}
                      onChange={next => {
                        setConfirmPin(next)
                        if (error) setError('')
                      }}
                      disabled={loading}
                      aria-label="PIN bestätigen"
                    />
                  </div>
                  <button
                    className="dl-btn dl-btn-ghost"
                    type="submit"
                    disabled={
                      loading ||
                      newPin.replace(/\D/g, '').length !== 6 ||
                      confirmPin.replace(/\D/g, '').length !== 6
                    }
                  >
                    {loading ? 'Wird eingerichtet…' : 'Dev Panel öffnen'}
                  </button>
                  <button
                    className="dl-back"
                    type="button"
                    onClick={() => goTo('register')}
                  >
                    Zurück
                  </button>
                </form>
              ) : null}
            </div>
            </div>

            <AuthHelpAccordion
              id="dl-help"
              summary="Wo finde ich meinen Zugang?"
              open={helpOpen}
              onOpenChange={setHelpOpen}
            >
              <p>Neue Devs starten mit dem Link aus der Einladungs-Mail. Workspace-Name und Einladungs-PIN reichen für die Einrichtung — danach gilt dein persönlicher PIN.</p>
              <p>Bereits eingerichtet? Melde dich mit Benutzername und PIN an. Den Benutzernamen findest du in der Einladungs-Mail.</p>
              <p>
                <button
                  type="button"
                  className="dl-help-link"
                  onClick={() => setRecoveryOpen(true)}
                >
                  Support oder PIN-Hilfe öffnen
                </button>
              </p>
            </AuthHelpAccordion>

            {(authStep === 'main' || authStep === 'register') ? (
              <p className="dl-legal dl-legal--under-form">
                Mit der Anmeldung oder Registrierung für ein Konto oder einen Workspace
                stimmen Sie den{' '}
                <a
                  href="/agb"
                  onPointerEnter={() => { try { router.prefetch('/agb') } catch { /* noop */ } }}
                  onClick={e => { e.preventDefault(); navigateWithFade('/agb') }}
                >AGB</a>,{' '}
                <a
                  href="/nutzungsbedingungen"
                  onPointerEnter={() => { try { router.prefetch('/nutzungsbedingungen') } catch { /* noop */ } }}
                  onClick={e => { e.preventDefault(); navigateWithFade('/nutzungsbedingungen') }}
                >Nutzungsbedingungen</a> und der{' '}
                <a
                  href="/datenschutz"
                  onPointerEnter={() => { try { router.prefetch('/datenschutz') } catch { /* noop */ } }}
                  onClick={e => { e.preventDefault(); navigateWithFade('/datenschutz') }}
                >Datenschutzerklärung</a> zu.
              </p>
            ) : null}
            {(authStep === 'main' || authStep === 'register') ? (
              <p className="dl-account-hint">
                {authStep === 'register' ? (
                  <>
                    Schon einen Account?{' '}
                    <button
                      type="button"
                      className="dl-account-hint-link"
                      onClick={() => {
                        welcomeIntentRef.current = false
                        goTo('main')
                      }}
                    >
                      Hier anmelden
                    </button>
                    .
                  </>
                ) : (
                  <>
                    Client Portal?{' '}
                    <button
                      type="button"
                      className="dl-account-hint-link"
                      onClick={() => setPanelSwitchOpen(true)}
                    >
                      Hier wechseln
                    </button>
                    .
                  </>
                )}
              </p>
            ) : null}
          </section>
        </main>

        <footer className="dl-footer-meta">
          <div className="dl-footer-center">
            <button
              type="button"
              className="dl-theme-icon dl-theme-icon--footer no-min-tap"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
            </button>
          </div>
          <div className="dl-footer-links dl-footer-links--desktop">
            <a
              className="dl-dev-link"
              href="/login"
              onClick={e => { e.preventDefault(); navigateWithFade('/login') }}
            >
              Client Portal
            </a>
            <span className="dl-footer-sep" aria-hidden="true">|</span>
            <a className="dl-dev-link" href="#hilfe" onClick={e => {
              e.preventDefault()
              setHelpOpen(true)
              window.requestAnimationFrame(() => {
                document.getElementById('dl-help')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              })
            }}>Hilfe</a>
          </div>
        </footer>
      </div>

      <AuthRecoveryModal
        open={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
        initialUsername={username}
        page="/dev/login"
        variant="dev"
      />
      <AuthPanelSwitchModal
        open={panelSwitchOpen}
        onClose={() => setPanelSwitchOpen(false)}
        variant="dev"
        onSwitch={() => navigateWithFade('/login')}
      />
    </main>
  )
}
