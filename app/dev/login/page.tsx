'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeSlash, Moon, Sun } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import {
  prepareAuthRouteTransition,
  useAuthTheme,
  consumePanelEnter,
  isCrossPanelAuthNav,
} from '@/lib/auth-theme'
import GoogleBrandIcon from '@/components/auth/GoogleBrandIcon'
import AppleBrandIcon from '@/components/auth/AppleBrandIcon'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import AuthSecurityModal from '@/components/auth/AuthSecurityModal'
import AuthHelpAccordion from '@/components/auth/AuthHelpAccordion'
import AuthWorkspacePath from '@/components/auth/AuthWorkspacePath'
import { storeDevSession, type DevSession } from '@/lib/dev-session'
import {
  getRememberedDevDevice,
  rememberDevDevice,
} from '@/lib/dev-device-memory'
import { normalizeWorkspaceName } from '@/lib/pending-workspace'
import { isLegalPath, rememberLegalReturn } from '@/lib/legal-return'

type WsAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

type AuthStep = 'main' | 'register' | 'setPin'
type OauthProvider = 'google' | 'github' | 'apple' | null

type LoginOptions = {
  found: boolean
  setup_required: boolean
  workspace_name: string | null
  google: boolean
  github: boolean
  apple: boolean
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
  const { mode: theme, setMode: setTheme } = useAuthTheme('dev')
  const [oauthLoading, setOauthLoading] = useState<OauthProvider>(null)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [booted, setBooted] = useState(false)
  const [returning, setReturning] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [wsAvailability, setWsAvailability] = useState<WsAvailability>('idle')
  const [wsAvailabilityMsg, setWsAvailabilityMsg] = useState('')
  const [wsNameEditing, setWsNameEditing] = useState(true)
  const [showInvitePin, setShowInvitePin] = useState(false)
  const [showLoginPin, setShowLoginPin] = useState(false)
  const [showNewPin, setShowNewPin] = useState(false)
  const [showConfirmPin, setShowConfirmPin] = useState(false)
  const [invitePinFocused, setInvitePinFocused] = useState(false)
  const [loginPinFocused, setLoginPinFocused] = useState(false)
  const [newPinFocused, setNewPinFocused] = useState(false)
  const [confirmPinFocused, setConfirmPinFocused] = useState(false)
  const [options, setOptions] = useState<LoginOptions>({
    found: false,
    setup_required: false,
    workspace_name: null,
    google: false,
    github: false,
    apple: false,
  })

  const userRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<HTMLInputElement>(null)
  const inviteRef = useRef<HTMLInputElement>(null)
  const welcomeIntentRef = useRef(false)
  const wsCheckSeq = useRef(0)

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

    if (welcome || !remembered?.username) {
      setReturning(false)
      setAuthStep('register')
      setWsNameEditing(true)
      if (welcome) {
        setWorkspaceName('')
        setDisplayWorkspace(null)
      }
    } else {
      setReturning(true)
      setAuthStep('main')
    }

    setBooted(true)
  }, [])

  useEffect(() => {
    if (!booted) return
    const u = username.trim().toLowerCase()
    if (!u) {
      setOptions({
        found: false,
        setup_required: false,
        workspace_name: null,
        google: false,
        github: false,
        apple: false,
      })
      return
    }
    let cancelled = false
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/dev/login-options?username=${encodeURIComponent(u)}`)
        const d = await res.json().catch(() => ({}))
        if (cancelled || !d?.ok) return
        const setupRequired = !!d.setup_required
        setOptions({
          found: !!d.found,
          setup_required: setupRequired,
          workspace_name: d.workspace_name || null,
          google: !!d.google,
          github: !!d.github,
          apple: !!d.apple,
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
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [booted, username])

  useEffect(() => {
    if (!booted) return
    if (authStep === 'main') {
      const target = !username.trim() ? userRef : pinRef
      const tries = [0, 50, 150, 250]
      const timers = tries.map(ms => setTimeout(() => target.current?.focus(), ms))
      return () => timers.forEach(clearTimeout)
    }
    if (authStep === 'register') {
      // Always land on workspace name first so typing works; user tabs to PIN.
      const t = setTimeout(() => wsRef.current?.focus(), 40)
      return () => clearTimeout(t)
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
    const t = window.setTimeout(() => setPanelEnter(false), 360)
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
        const reason = 'Name konnte gerade nicht geprüft werden.'
        setWsAvailability('invalid')
        setWsAvailabilityMsg(reason)
        return { ok: false, reason }
      }
      if (data.available) {
        setWsAvailability('available')
        setWsAvailabilityMsg('')
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
    } catch { /* noop */ }
    const cross = isCrossPanelAuthNav(href)
    prepareAuthRouteTransition(href)
    setPageExiting(true)
    setTimeout(() => router.push(href), cross ? 210 : 160)
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
    if (provider === 'apple') {
      setError('Apple-Anmeldung ist für dieses Konto noch nicht verfügbar.')
      setOauthLoading(null)
      return
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dev')}`,
        ...(provider === 'github'
          ? { scopes: 'read:user user:email read:org' }
          : { queryParams: { prompt: 'select_account' } }),
      },
    })
    if (oauthError) {
      setError(provider === 'google'
        ? 'Google-Anmeldung fehlgeschlagen. Bitte erneut versuchen.'
        : 'GitHub-Anmeldung fehlgeschlagen. Bitte erneut versuchen.')
      setOauthLoading(null)
    }
  }

  async function submitPin() {
    setError('')
    const u = username.trim().toLowerCase()
    const p = pin.replace(/\D/g, '').slice(0, 6)
    if (!u || !p) { setError('Bitte Benutzername und PIN eingeben.'); return }
    if (p.length !== 6) { setError('Bitte den 6-stelligen PIN eingeben.'); return }
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
        setInvitePin(p)
        setReturning(false)
        welcomeIntentRef.current = true
        setWsNameEditing(true)
        if (d.profile?.workspace_name) {
          setWorkspaceName(String(d.profile.workspace_name))
          setDisplayWorkspace(String(d.profile.workspace_name))
        }
        setAuthStep('register')
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
    const check = await checkWorkspaceNameAvailability(ws)
    if (!check.ok) {
      setError(check.reason || 'Dieser Workspace-Name ist bereits vergeben.')
      setWsNameEditing(true)
      wsRef.current?.focus()
      return
    }
    setInvitePin(invite)
    setWorkspaceName(ws)
    setDisplayWorkspace(ws)
    setAuthStep('setPin')
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
    if (!u) {
      setError('Bitte den Einladungslink aus der Mail öffnen, dann kannst du den Code erneut senden.')
      return
    }
    setResending(true)
    try {
      const res = await fetch('/api/dev/resend-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(d?.message || mapPinError(d?.error || ''))
      } else {
        setResendCooldown(60)
        setError('')
      }
    } catch {
      setError('Code konnte nicht gesendet werden.')
    } finally {
      setResending(false)
    }
  }

  const showProviders = options.google || options.github || options.apple
  const liveWs = authStep === 'register' || authStep === 'setPin'
    ? (normalizeWorkspaceName(workspaceName) || displayWorkspace)
    : (displayWorkspace || options.workspace_name)
  const wordmarkLabel = liveWs
    ? `Workspace ${liveWs}`
    : (returning && username.trim() ? `Workspace ${username.trim()}` : 'Festag')
  const wsReady = authStep !== 'register' || wsAvailability === 'available'
  const displayWsNormalized = normalizeWorkspaceName(workspaceName)

  const title = authStep === 'register'
    ? 'Dev Workspace erstellen'
    : authStep === 'setPin'
      ? 'Persönlichen PIN wählen'
      : returning
        ? 'Willkommen zurück'
        : 'Dev Panel'

  const resendLabel = resending
    ? 'Wird gesendet…'
    : resendCooldown > 0
      ? `Code erneut senden in ${resendCooldown}s`
      : 'Code erneut senden'

  return (
    <main
      className={`dl-root${pageExiting ? ' exiting' : ''}${panelEnter ? ' dl-panel-enter' : ''}`}
      data-theme={theme}
    >
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .dl-root {
          min-height:100dvh;
          width:100%;
          --dl-text-muted:#8e8e93;
          --dl-text-muted-soft:#aeaeb2;
          font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          -webkit-font-smoothing:antialiased;
          text-rendering:geometricPrecision;
          transition: opacity 0.18s ease;
          /* Light auth: opaque white so Apple-gray inputs read against canvas (match .al-root). */
          background:#ffffff;
          color:#1e1e20;
          display:flex;
          flex-direction:column;
          overflow-x:hidden;
        }
        .dl-root.exiting { opacity:0; pointer-events:none; }
        @keyframes dlEnter { from { opacity:0.001; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .dl-root:not(.exiting):not(.dl-panel-enter) { animation: dlEnter 0.22s cubic-bezier(.16,1,.3,1) both; }
        @keyframes dlPanelEnter {
          from { opacity:0.001; transform:translateY(12px) scale(0.991); }
          to { opacity:1; transform:translateY(0) scale(1); }
        }
        .dl-root.dl-panel-enter:not(.exiting) {
          animation: dlPanelEnter 0.34s cubic-bezier(.16,1,.3,1) both;
        }

        .dl-container {
          flex:1;
          display:flex;
          flex-direction:column;
          min-height:100dvh;
        }

        .dl-header {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:16px 24px;
          flex-shrink:0;
        }
        .dl-wordmark {
          display:inline-flex;
          align-items:baseline;
          gap:6px;
          font-size:22px;
          font-weight:500;
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

        .dl-main {
          flex:1;
          display:flex;
          align-items:flex-start;
          justify-content:center;
          padding:clamp(56px, 12vh, 120px) 24px 120px;
        }
        .dl-panel {
          width:100%;
          max-width:360px;
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
        .dl-ws-name-line:not(.has-value):not(:focus-within)::after {
          content:'';
          position:absolute;
          left:0;
          top:8px;
          width:2px;
          height:22px;
          border-radius:1px;
          background:#5B647D;
          animation: dlCaretBlink 1.05s steps(1, end) infinite;
          pointer-events:none;
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
          border:0.7px solid transparent;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:12px;
          font-family:inherit;
          font-size:15px;
          font-weight:500;
          letter-spacing:-0.01em;
          cursor:pointer;
          padding:0 18px;
          transition:background .15s, border-color .15s, color .15s, transform .08s ease, opacity .15s, box-shadow .15s;
          -webkit-tap-highlight-color:transparent;
        }
        .dl-btn:active:not(:disabled) { transform:scale(0.985); }
        .dl-btn:disabled { opacity:.55; cursor:not-allowed; }

        .dl-btn-ghost {
          background:#ffffff;
          color:#1e1e20;
          border:0.7px solid #e7ebf0;
          /* Linear-like lift on white canvas — match .al-btn-ghost. */
          box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.04),
            0 1px 3px rgba(15, 23, 42, 0.03);
        }
        .dl-btn-ghost:hover:not(:disabled) {
          background:#f7f8fb;
          border-color:#dce1ea;
          box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.05),
            0 1px 3px rgba(15, 23, 42, 0.04);
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
          /* Match .al-input light: transparent stroke, shared Festag input fill. */
          border:1.2px solid transparent;
          background:var(--festag-input-fill, #DFDFE1);
          color:#1e1e20;
          font-family:inherit;
          font-size:14px;
          font-weight:500;
          font-synthesis:none;
          letter-spacing:-0.01em;
          padding:0 18px;
          outline:none;
          caret-color:#1e1e20;
          box-shadow:none;
          transition:border-color .15s, box-shadow .15s, background .15s, opacity .18s ease;
        }
        .dl-input.mono {
          font-family:inherit;
          font-size:14px;
          font-weight:500;
        }
        .dl-input::placeholder {
          color:var(--dl-text-muted-soft);
          font-family:inherit;
          font-weight:400;
          letter-spacing:0.002em;
          transition: opacity .18s ease, letter-spacing .18s ease;
        }
        .dl-input:-webkit-autofill,
        .dl-input:-webkit-autofill:hover,
        .dl-input:-webkit-autofill:focus {
          -webkit-text-fill-color:#1e1e20;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:500;
          box-shadow:0 0 0 1000px var(--festag-input-fill, #DFDFE1) inset;
          transition:background-color 9999s ease-out 0s;
        }
        .dl-input:hover {
          background:var(--festag-input-fill-focus, #DBDBDC);
        }
        .dl-input:focus,
        .dl-input:focus-visible,
        .dl-input:active {
          /* Light: calm subtle darken, no focus stroke */
          background:var(--festag-input-fill-focus, #DBDBDC);
          border:1.2px solid transparent;
          box-shadow:none;
          outline:none;
        }
        .dl-input.pin {
          text-align:center;
          letter-spacing:0.22em;
          font-size:16px;
          padding:0 44px 0 18px;
          font-family:inherit;
          font-weight:500;
        }
        .dl-input.pin::placeholder {
          letter-spacing:0.02em;
          font-weight:400;
        }
        .dl-pin-wrap {
          position:relative;
          width:100%;
        }
        .dl-pin-toggle {
          position:absolute;
          right:10px;
          top:50%;
          transform:translateY(-50%);
          width:32px;
          height:32px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:0;
          border-radius:999px;
          background:transparent;
          color:var(--dl-text-muted);
          cursor:pointer;
          padding:0;
          -webkit-tap-highlight-color:transparent;
        }
        .dl-pin-toggle:hover { color:#1e1e20; }
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
          color:#1e1e20;
          font-weight:500;
          text-decoration:none;
          border-bottom:1px solid rgba(30, 30, 32, 0.2);
          transition:border-color .15s, color .15s;
        }
        .dl-legal a:hover { border-bottom-color:#1e1e20; }
        .dl-root[data-theme="dark"] .dl-legal a {
          color:#f5f5f7;
          border-bottom-color:rgba(245,245,247,0.28);
        }
        .dl-root[data-theme="dark"] .dl-legal a:hover {
          border-bottom-color:#f5f5f7;
        }
        .dl-root[data-theme="dark"] .dl-legal { color:var(--dl-text-muted); }

        .dl-error {
          background:rgba(255,59,48,0.06);
          color:#c9342a;
          border:1px solid rgba(255,59,48,0.14);
          border-radius:12px;
          padding:10px 12px;
          font-size:13px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:-0.01em;
          text-align:left;
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
          justify-content:center;
          gap:10px;
          padding:16px 24px max(20px, env(safe-area-inset-bottom));
          margin:0;
          width:100%;
          max-width:none;
          text-align:center;
          pointer-events:none;
          background:transparent;
          border-top:none;
        }
        .dl-footer-meta > * { pointer-events:auto; }

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
          justify-content:center;
          flex-wrap:wrap;
          gap:8px;
        }
        .dl-footer-sep {
          color:#c7c7cc;
          font-size:11px;
          line-height:1;
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
          background:transparent;
          color:#f5f5f7;
          --dl-text-muted:rgba(235,235,245,0.6);
          --dl-text-muted-soft:rgba(235,235,245,0.4);
        }
        .dl-root[data-theme="dark"] .dl-wordmark { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-title { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-ws-name-input { color:#f5f5f7; caret-color:rgba(245,245,247,0.35); }
        .dl-root[data-theme="dark"] .dl-ws-name-line:not(.has-value):not(:focus-within)::after {
          background:rgba(245,245,247,0.35);
          animation: dlCaretBlinkSoft 1.6s ease-in-out infinite;
        }
        @keyframes dlCaretBlinkSoft {
          0%, 100% { opacity:0.35; }
          50% { opacity:0.85; }
        }
        .dl-root[data-theme="dark"] .dl-ws-status { color:var(--dl-text-muted-soft); }
        .dl-root[data-theme="dark"] .dl-ws-status--ok { color:#3dba66; }
        .dl-root[data-theme="dark"] .dl-ws-status--bad { color:#ff6961; }
        .dl-root[data-theme="dark"] .dl-pin-toggle { color:var(--dl-text-muted); }
        .dl-root[data-theme="dark"] .dl-pin-toggle:hover { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-context { color:var(--dl-text-muted); }
        .dl-root[data-theme="dark"] .dl-btn-ghost {
          background:#121214;
          color:#f5f5f7;
          border:0.7px solid rgba(255,255,255,0.1);
          box-shadow:none;
        }
        .dl-root[data-theme="dark"] .dl-btn-ghost:hover:not(:disabled) {
          background:#1c1c1e;
          border-color:rgba(255,255,255,0.16);
          box-shadow:none;
        }
        .dl-root[data-theme="dark"] .dl-input {
          background:transparent;
          border:1px solid rgba(255,255,255,0.28);
          color:#f5f5f7;
          caret-color:#f5f5f7;
          box-shadow:none;
        }
        .dl-root[data-theme="dark"] .dl-input::placeholder { color:rgba(245,245,247,0.38); }
        .dl-root[data-theme="dark"] .dl-input:-webkit-autofill,
        .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:hover,
        .dl-root[data-theme="dark"] .dl-input:-webkit-autofill:focus {
          -webkit-text-fill-color:#f5f5f7;
          font-weight:500;
          box-shadow:0 0 0 1000px #0c0c0e inset;
        }
        .dl-root[data-theme="dark"] .dl-input:focus,
        .dl-root[data-theme="dark"] .dl-input:focus-visible {
          background:rgba(255,255,255,0.06);
          border:1.2px solid transparent;
          box-shadow:none;
          outline:none;
        }
        .dl-root[data-theme="dark"] .dl-divider { color:var(--dl-text-muted-soft); }
        .dl-root[data-theme="dark"] .dl-divider::before,
        .dl-root[data-theme="dark"] .dl-divider::after { background:rgba(255,255,255,0.1); }
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
        .dl-root[data-theme="dark"] .dl-footer-sep { color:rgba(245,245,247,0.28); }

        @media (max-width: 768px) {
          .dl-header { padding:max(12px, env(safe-area-inset-top)) 18px 8px; }
          .dl-main { padding:clamp(40px, 10vh, 80px) 18px 120px; }
          .dl-container:has(.dl-legal--mobile-dock) .dl-main { padding-bottom:16px; }
          .dl-legal--under-form { display:none !important; }
          .dl-legal--mobile-dock {
            display:block;
            width:100%;
            max-width:min(100%, 400px);
            margin:0 auto;
            padding:6px 18px max(68px, calc(56px + env(safe-area-inset-bottom)));
          }
          .dl-title,
          h1.dl-title,
          .dl-ws-name-input,
          .dl-hero-copy .auth-ws-path,
          .dl-hero-copy button.auth-ws-path--tap,
          .dl-hero-copy button.auth-ws-path--edit {
            font-size:32px !important;
            line-height:39px !important;
            letter-spacing:-0.03em;
          }
          .dl-ws-name-line { min-height:39px; }
          .dl-theme-icon--header { display:inline-flex !important; }
          .dl-theme-icon--footer { display:none !important; }
          .dl-footer-meta {
            padding:12px 20px max(16px, env(safe-area-inset-bottom));
          }
          .dl-input { height:48px; font-size:15px; border-radius:999px; box-shadow:none; padding:0 18px; }
          .dl-btn { height:48px; font-size:15px; border-radius:999px; }
          .dl-btn-ghost {
            box-shadow:
              0 1px 1px rgba(15, 23, 42, 0.03),
              0 1px 2px rgba(15, 23, 42, 0.02) !important;
          }
          .dl-btn-ghost:hover:not(:disabled) {
            box-shadow:
              0 1px 1px rgba(15, 23, 42, 0.035),
              0 1px 2px rgba(15, 23, 42, 0.025) !important;
          }
          .dl-root[data-theme="dark"] .dl-btn-ghost {
            box-shadow:none !important;
          }
        }
      `}</style>

      <div className="dl-container">
        <header className="dl-header">
          <a
            key={wordmarkLabel}
            className="dl-wordmark"
            href="/"
            onClick={e => { e.preventDefault(); navigateWithFade('/') }}
          >
            {wordmarkLabel}
          </a>
          <div className="dl-header-actions">
            <AuthDocsPopover />
            <button
              type="button"
              className="dl-theme-icon dl-theme-icon--header"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
            </button>
          </div>
        </header>

        <main className="dl-main">
          <section className="dl-panel" aria-label="Developer Login">
            <div className="dl-hero-copy">
              <h1 className="dl-title">{title}</h1>
              {authStep === 'register' ? (
                <>
                  {wsAvailability === 'available' && displayWsNormalized && !wsNameEditing ? (
                    <AuthWorkspacePath
                      name={displayWsNormalized}
                      onEdit={startEditingWorkspaceName}
                    />
                  ) : (
                    <label className={`dl-ws-name-line${workspaceName ? ' has-value' : ''}`}>
                      <span className="sr-only">Workspace-Name</span>
                      <input
                        ref={wsRef}
                        className="dl-ws-name-input"
                        type="text"
                        autoComplete="organization"
                        value={workspaceName}
                        onChange={e => updateWorkspaceName(e.target.value)}
                        onInput={e => updateWorkspaceName((e.target as HTMLInputElement).value)}
                        placeholder=""
                        spellCheck={false}
                        autoCapitalize="words"
                        maxLength={64}
                        aria-label="Workspace-Name"
                        aria-invalid={wsAvailability === 'taken' || wsAvailability === 'invalid'}
                      />
                    </label>
                  )}
                  {wsAvailability === 'checking' && displayWsNormalized ? (
                    <p className="dl-ws-status">Wird geprüft…</p>
                  ) : null}
                  {wsAvailability === 'available' && displayWsNormalized ? (
                    <p className="dl-ws-status dl-ws-status--ok">Name ist frei</p>
                  ) : null}
                  {(wsAvailability === 'taken' || wsAvailability === 'invalid') && wsAvailabilityMsg ? (
                    <p className="dl-ws-status dl-ws-status--bad">{wsAvailabilityMsg}</p>
                  ) : null}
                </>
              ) : authStep === 'setPin' && (displayWorkspace || workspaceName) ? (
                <AuthWorkspacePath name={displayWorkspace || workspaceName || ''} />
              ) : authStep === 'main' && (displayWorkspace || username) ? (
                <AuthWorkspacePath name={displayWorkspace || username.trim().toLowerCase()} />
              ) : authStep === 'setPin' ? (
                <p className="dl-context">Dieser PIN ersetzt den Einladungs-Code für künftige Anmeldungen.</p>
              ) : null}
            </div>

            <div className="dl-stack">
              {error ? <p className="dl-error">{error}</p> : null}

              {authStep === 'main' ? (
                <>
                  {showProviders ? (
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
                          className="dl-btn dl-btn-ghost"
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
                      <div className="dl-divider"><span>oder PIN</span></div>
                    </>
                  ) : null}

                  <form className="dl-stack" onSubmit={e => { e.preventDefault(); submitPin() }}>
                    <input
                      ref={userRef}
                      className="dl-input mono"
                      type="text"
                      autoComplete="username"
                      placeholder="Benutzername"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                    <div className="dl-pin-wrap">
                      <input
                        ref={pinRef}
                        className="dl-input pin"
                        type={showLoginPin ? 'text' : 'password'}
                        inputMode="numeric"
                        autoComplete="current-password"
                        maxLength={6}
                        placeholder={loginPinFocused ? '6-stelligen Pin Code eingeben' : 'PIN Code'}
                        value={pin}
                        onChange={e => {
                          setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                          if (error) setError('')
                        }}
                        onFocus={() => setLoginPinFocused(true)}
                        onBlur={() => setLoginPinFocused(false)}
                        spellCheck={false}
                        autoCapitalize="none"
                      />
                      <button
                        type="button"
                        className="dl-pin-toggle"
                        aria-label={showLoginPin ? 'PIN verbergen' : 'PIN anzeigen'}
                        onClick={() => setShowLoginPin(v => !v)}
                      >
                        {showLoginPin ? <EyeSlash size={16} weight="regular" /> : <Eye size={16} weight="regular" />}
                      </button>
                    </div>
                    <button
                      className="dl-btn dl-btn-ghost"
                      type="submit"
                      disabled={loading || oauthLoading !== null || pin.replace(/\D/g, '').length !== 6 || !username.trim()}
                    >
                      {loading ? 'Wird geprüft…' : 'Anmelden'}
                    </button>
                  </form>
                </>
              ) : null}

              {authStep === 'register' ? (
                <form className="dl-stack" onSubmit={e => { e.preventDefault(); continueRegister() }}>
                  <div className="dl-pin-wrap">
                    <input
                      ref={inviteRef}
                      className="dl-input pin"
                      type={showInvitePin ? 'text' : 'password'}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder={invitePinFocused ? '6-stelligen Pin Code eingeben' : 'Einladungs-PIN'}
                      value={invitePin}
                      onChange={e => {
                        setInvitePin(e.target.value.replace(/\D/g, '').slice(0, 6))
                        if (error) setError('')
                      }}
                      onFocus={() => setInvitePinFocused(true)}
                      onBlur={() => setInvitePinFocused(false)}
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                    <button
                      type="button"
                      className="dl-pin-toggle"
                      aria-label={showInvitePin ? 'PIN verbergen' : 'PIN anzeigen'}
                      onClick={() => setShowInvitePin(v => !v)}
                    >
                      {showInvitePin ? <EyeSlash size={16} weight="regular" /> : <Eye size={16} weight="regular" />}
                    </button>
                  </div>
                  <button
                    className="dl-btn dl-btn-ghost"
                    type="submit"
                    disabled={loading || !wsReady || invitePin.replace(/\D/g, '').length !== 6}
                  >
                    Weiter
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
                    onClick={() => { setError(''); setAuthStep('main') }}
                  >
                    Zurück zur Anmeldung
                  </button>
                </form>
              ) : null}

              {authStep === 'setPin' ? (
                <form className="dl-stack" onSubmit={e => { e.preventDefault(); completeRegister() }}>
                  <div className="dl-pin-wrap">
                    <input
                      className="dl-input pin"
                      type={showNewPin ? 'text' : 'password'}
                      inputMode="numeric"
                      autoComplete="new-password"
                      maxLength={6}
                      placeholder={newPinFocused ? '6-stelligen Pin Code eingeben' : 'Neuer PIN'}
                      value={newPin}
                      onChange={e => {
                        setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                        if (error) setError('')
                      }}
                      onFocus={() => setNewPinFocused(true)}
                      onBlur={() => setNewPinFocused(false)}
                      spellCheck={false}
                      autoCapitalize="none"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="dl-pin-toggle"
                      aria-label={showNewPin ? 'PIN verbergen' : 'PIN anzeigen'}
                      onClick={() => setShowNewPin(v => !v)}
                    >
                      {showNewPin ? <EyeSlash size={16} weight="regular" /> : <Eye size={16} weight="regular" />}
                    </button>
                  </div>
                  <div className="dl-pin-wrap">
                    <input
                      className="dl-input pin"
                      type={showConfirmPin ? 'text' : 'password'}
                      inputMode="numeric"
                      autoComplete="new-password"
                      maxLength={6}
                      placeholder={confirmPinFocused ? '6-stelligen Pin Code eingeben' : 'PIN bestätigen'}
                      value={confirmPin}
                      onChange={e => {
                        setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                        if (error) setError('')
                      }}
                      onFocus={() => setConfirmPinFocused(true)}
                      onBlur={() => setConfirmPinFocused(false)}
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                    <button
                      type="button"
                      className="dl-pin-toggle"
                      aria-label={showConfirmPin ? 'PIN verbergen' : 'PIN anzeigen'}
                      onClick={() => setShowConfirmPin(v => !v)}
                    >
                      {showConfirmPin ? <EyeSlash size={16} weight="regular" /> : <Eye size={16} weight="regular" />}
                    </button>
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
                    onClick={() => { setError(''); setAuthStep('register') }}
                  >
                    Zurück
                  </button>
                </form>
              ) : null}
            </div>

            <AuthHelpAccordion
              id="dl-help"
              summary="Hilfe zum Dev Zugang"
              open={helpOpen}
              onOpenChange={setHelpOpen}
            >
              <p>Neue Devs starten mit dem Link aus der Einladungs-Mail. Workspace-Name und Einladungs-PIN reichen für die Einrichtung — danach gilt dein persönlicher PIN.</p>
              <p>Bereits eingerichtet? Melde dich mit Benutzername und PIN an. Den Benutzernamen findest du in der Einladungs-Mail.</p>
            </AuthHelpAccordion>

            {(authStep === 'main' || authStep === 'register') ? (
              <p className="dl-legal dl-legal--under-form">
                Mit der Anmeldung stimmen Sie den{' '}
                <a href="/agb" onClick={e => { e.preventDefault(); navigateWithFade('/agb') }}>AGB</a>,{' '}
                <a href="/nutzungsbedingungen" onClick={e => { e.preventDefault(); navigateWithFade('/nutzungsbedingungen') }}>Nutzungsbedingungen</a> und der{' '}
                <a href="/datenschutz" onClick={e => { e.preventDefault(); navigateWithFade('/datenschutz') }}>Datenschutzerklärung</a> zu.
              </p>
            ) : null}
          </section>
        </main>

        {(authStep === 'main' || authStep === 'register') ? (
          <p className="dl-legal dl-legal--mobile-dock">
            Mit der Anmeldung stimmen Sie den{' '}
            <a href="/agb" onClick={e => { e.preventDefault(); navigateWithFade('/agb') }}>AGB</a>,{' '}
            <a href="/nutzungsbedingungen" onClick={e => { e.preventDefault(); navigateWithFade('/nutzungsbedingungen') }}>Nutzungsbedingungen</a> und der{' '}
            <a href="/datenschutz" onClick={e => { e.preventDefault(); navigateWithFade('/datenschutz') }}>Datenschutzerklärung</a> zu.
          </p>
        ) : null}

        <footer className="dl-footer-meta">
          <button
            type="button"
            className="dl-theme-icon dl-theme-icon--footer"
            aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
          </button>
          <div className="dl-footer-links">
            <a
              className="dl-dev-link"
              href="/login"
              onClick={e => { e.preventDefault(); navigateWithFade('/login') }}
            >
              Client Portal
            </a>
            <span className="dl-footer-sep" aria-hidden="true">|</span>
            <button
              type="button"
              className="dl-ssl"
              aria-label="Sicherheit und Verschlüsselung"
              onClick={() => setSecurityOpen(true)}
            >
              <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M5.5 0.5C3.84315 0.5 2.5 1.84315 2.5 3.5V5H1.5C0.947715 5 0.5 5.44772 0.5 6V11.5C0.5 12.0523 0.947715 12.5 1.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6C10.5 5.44772 10.0523 5 9.5 5H8.5V3.5C8.5 1.84315 7.15685 0.5 5.5 0.5ZM3.5 5V3.5C3.5 2.39543 4.39543 1.5 5.5 1.5C6.60457 1.5 7.5 2.39543 7.5 3.5V5H3.5Z" fill="currentColor"/>
              </svg>
              <span>SSL, End-to-End verschlüsselt</span>
            </button>
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

      <AuthSecurityModal open={securityOpen} onClose={() => setSecurityOpen(false)} />
    </main>
  )
}
