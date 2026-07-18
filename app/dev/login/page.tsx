'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun } from '@phosphor-icons/react'
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
import { storeDevSession, type DevSession } from '@/lib/dev-session'
import {
  getRememberedDevDevice,
  rememberDevDevice,
} from '@/lib/dev-device-memory'

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
  const [booted, setBooted] = useState(false)
  const [returning, setReturning] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const prefill = String(params.get('prefill') || '').trim().toLowerCase()
    const welcome = params.get('welcome') === '1' || params.get('register') === '1'
    const remembered = getRememberedDevDevice()

    if (prefill) {
      setUsername(prefill)
    } else if (remembered?.username) {
      setUsername(remembered.username)
      setReturning(true)
    }

    if (remembered?.workspaceName) {
      setDisplayWorkspace(remembered.workspaceName)
      setWorkspaceName(remembered.workspaceName)
    }

    if (welcome) {
      setAuthStep('register')
      setReturning(false)
    } else if (remembered?.username) {
      setReturning(true)
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
        setOptions({
          found: !!d.found,
          setup_required: !!d.setup_required,
          workspace_name: d.workspace_name || null,
          google: !!d.google,
          github: !!d.github,
          apple: !!d.apple,
        })
        if (d.workspace_name) {
          setDisplayWorkspace(String(d.workspace_name))
          setWorkspaceName(prev => prev || String(d.workspace_name))
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
      const t = setTimeout(() => wsRef.current?.focus(), 40)
      return () => clearTimeout(t)
    }
  }, [authStep, booted, username])

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

  function navigateWithFade(href: string) {
    router.prefetch(href)
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
    const p = pin.trim()
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

  function continueRegister() {
    setError('')
    const ws = workspaceName.replace(/\s+/g, ' ').trim()
    const invite = invitePin.replace(/\D/g, '').slice(0, 6)
    if (!username.trim()) { setError('Benutzername fehlt. Bitte den Einladungslink nutzen.'); return }
    if (ws.length < 2) { setError('Bitte einen Workspace-Namen eingeben.'); return }
    if (invite.length !== 6) { setError('Bitte den 6-stelligen Einladungs-PIN eingeben.'); return }
    setInvitePin(invite)
    setWorkspaceName(ws)
    setAuthStep('setPin')
  }

  async function completeRegister() {
    setError('')
    const u = username.trim().toLowerCase()
    const ws = workspaceName.replace(/\s+/g, ' ').trim()
    const invite = invitePin.replace(/\D/g, '').slice(0, 6)
    const p1 = newPin.replace(/\D/g, '').slice(0, 6)
    const p2 = confirmPin.replace(/\D/g, '').slice(0, 6)
    if (p1.length !== 6) { setError('Bitte einen 6-stelligen persönlichen PIN wählen.'); return }
    if (p1 !== p2) { setError('Die PIN-Codes stimmen nicht überein.'); return }
    if (p1 === invite) { setError('Wähle einen neuen PIN — nicht denselben wie den Einladungs-Code.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/dev/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: u,
          invite_pin: invite,
          workspace_name: ws,
          new_pin: p1,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d?.ok || !d?.session?.user_id) {
        setError(mapPinError(d?.error || 'invalid_credentials', d?.message))
        setLoading(false)
        return
      }
      finishDevSession(d.session as DevSession, u, ws)
    } catch (e: any) {
      setError(mapPinError(e?.message || ''))
      setLoading(false)
    }
  }

  async function handleResendPin() {
    if (resendCooldown > 0 || resending) return
    setError('')
    const u = username.trim().toLowerCase()
    if (!u) { setError('Benutzername fehlt.'); return }
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
  const wsLabel = displayWorkspace || options.workspace_name
  const wordmarkLabel = wsLabel
    ? `Workspace ${wsLabel}`
    : (returning && username.trim() ? `Workspace ${username.trim()}` : 'Festag')

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
          font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          -webkit-font-smoothing:antialiased;
          text-rendering:geometricPrecision;
          transition: opacity 0.18s ease;
          background:transparent;
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
          letter-spacing:-0.03em;
          color:#1e1e20;
          line-height:1.2;
          padding:2px 0 3px;
          text-decoration:none;
          overflow:visible;
          max-width:min(70vw, 420px);
          white-space:nowrap;
          text-overflow:ellipsis;
        }

        /* Reinforce docs trigger: smaller circle, gray fill, no border */
        .dl-header .auth-docs-trigger {
          border:0 !important;
          border-radius:999px !important;
          background:#f5f5f7 !important;
          box-shadow:none !important;
          width:28px !important;
          height:28px !important;
        }
        .dl-root[data-theme="dark"] .dl-header .auth-docs-trigger {
          background:rgba(255,255,255,0.08) !important;
          color:rgba(245,245,247,0.55);
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
          font-size:30px;
          line-height:36px;
          font-weight:400;
          letter-spacing:-0.03em;
          color:#1e1e20;
          margin:0 0 10px;
          text-align:left;
        }
          text-align:left;
        }
        .dl-context {
          margin:0 0 22px;
          font-size:14px;
          font-weight:400;
          line-height:1.4;
          color:#86868b;
          letter-spacing:-0.01em;
        }
        .dl-context code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-size:13px;
          font-weight:500;
          color:#6e6e73;
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
          border:1px solid transparent;
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
          border-color:#e7ebf0;
          box-shadow:none;
        }
        .dl-btn-ghost:hover:not(:disabled) {
          background:#f7f8fb;
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
          color:#86868b;
          font-size:13px;
          font-weight:400;
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
          border-radius:14px;
          border:1px solid #e7ebf0;
          background:#f5f5f7;
          color:#1e1e20;
          font-family:inherit;
          font-size:15px;
          font-weight:400;
          letter-spacing:-0.01em;
          padding:0 16px;
          outline:none;
          caret-color:#1e1e20;
          box-shadow:none;
          transition:border-color .15s, box-shadow .15s, background .15s;
        }
        .dl-input.mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-size:14px;
          font-weight:500;
        }
        .dl-input::placeholder {
          color:#86868b;
          font-family:inherit;
          font-weight:400;
          letter-spacing:0;
        }
        .dl-input:focus,
        .dl-input:focus-visible {
          background:#f5f5f7;
          border:1.2px solid #aeaeb2;
          box-shadow:none;
          outline:none;
        }
        .dl-input.pin {
          text-align:center;
          letter-spacing:0.28em;
          font-size:18px;
          padding-left:18px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-weight:500;
        }
        .dl-input.pin::placeholder {
          letter-spacing:0.08em;
        }

        .dl-hint {
          margin:2px 0 0;
          font-size:12px;
          line-height:1.4;
          color:#86868b;
          text-align:left;
        }

        .dl-link,
        .dl-back {
          font-family:inherit;
          font-size:14px;
          font-weight:400;
          color:#6e6e73;
          background:none;
          border:none;
          cursor:pointer;
          text-align:left;
          padding:4px 0;
        }
        .dl-link:hover,
        .dl-back:hover { color:#1e1e20; }
        .dl-link:disabled { opacity:.5; cursor:not-allowed; }

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
          pointer-events:none;
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
          color:#86868b;
          cursor:pointer;
          transition:color .15s ease, background .15s ease;
        }
        .dl-theme-icon:hover {
          color:#1e1e20;
          background:rgba(15, 23, 42, 0.05);
        }

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
        .dl-ssl,
        .dl-dev-link {
          font-size:11px;
          font-weight:400;
          letter-spacing:0.02em;
          line-height:1.55;
          color:#86868b;
          text-decoration:none;
        }
        .dl-ssl {
          display:inline-flex;
          align-items:center;
          gap:6px;
          margin:0;
          padding:0;
          border:0;
          background:transparent;
          font:inherit;
          color:#86868b;
          cursor:pointer;
        }
        .dl-ssl:hover,
        .dl-dev-link:hover { color:#6e6e73; }
        .dl-ssl svg { width:11px; height:13px; flex-shrink:0; }

        .dl-root[data-theme="dark"] { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-wordmark { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-title { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-context { color:rgba(245,245,247,0.55); }
        .dl-root[data-theme="dark"] .dl-context code { color:rgba(245,245,247,0.62); }
        .dl-root[data-theme="dark"] .dl-btn-ghost {
          background:rgba(255,255,255,0.06);
          color:#f5f5f7;
          border-color:rgba(255,255,255,0.12);
        }
        .dl-root[data-theme="dark"] .dl-btn-ghost:hover:not(:disabled) {
          background:rgba(255,255,255,0.1);
        }
        .dl-root[data-theme="dark"] .dl-input {
          background:#0c0c0e;
          border-color:rgba(255,255,255,0.1);
          color:#f5f5f7;
          caret-color:#f5f5f7;
        }
        .dl-root[data-theme="dark"] .dl-input::placeholder { color:rgba(245,245,247,0.38); }
        .dl-root[data-theme="dark"] .dl-input:focus,
        .dl-root[data-theme="dark"] .dl-input:focus-visible {
          background:transparent;
          border-color:rgba(255,255,255,0.72);
        }
        .dl-root[data-theme="dark"] .dl-divider { color:rgba(245,245,247,0.45); }
        .dl-root[data-theme="dark"] .dl-divider::before,
        .dl-root[data-theme="dark"] .dl-divider::after { background:rgba(255,255,255,0.1); }
        .dl-root[data-theme="dark"] .dl-hint,
        .dl-root[data-theme="dark"] .dl-link,
        .dl-root[data-theme="dark"] .dl-back { color:rgba(245,245,247,0.55); }
        .dl-root[data-theme="dark"] .dl-link:hover,
        .dl-root[data-theme="dark"] .dl-back:hover { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-theme-icon { color:rgba(245,245,247,0.55); }
        .dl-root[data-theme="dark"] .dl-theme-icon:hover {
          color:#f5f5f7;
          background:rgba(255,255,255,0.08);
        }
        .dl-root[data-theme="dark"] .dl-ssl,
        .dl-root[data-theme="dark"] .dl-dev-link { color:rgba(245,245,247,0.58); }
        .dl-root[data-theme="dark"] .dl-ssl:hover,
        .dl-root[data-theme="dark"] .dl-dev-link:hover { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-footer-sep { color:rgba(255,255,255,0.22); }

        @media (max-width: 768px) {
          .dl-header { padding:max(12px, env(safe-area-inset-top)) 18px 8px; }
          .dl-main { padding:clamp(40px, 10vh, 80px) 18px 120px; }
          .dl-title { font-size:40px; line-height:46px; letter-spacing:-0.04em; }
          .dl-input { height:48px; font-size:15px; border-radius:999px; box-shadow:none; }
          .dl-btn { height:48px; font-size:15px; border-radius:999px; box-shadow:none !important; }
        }
      `}</style>

      <div className="dl-container">
        <header className="dl-header">
          <a
            className="dl-wordmark"
            href="/"
            onClick={e => { e.preventDefault(); navigateWithFade('/') }}
          >
            {wordmarkLabel}
          </a>
          <AuthDocsPopover />
        </header>

        <main className="dl-main">
          <section className="dl-panel" aria-label="Developer Login">
            <h1 className="dl-title">{title}</h1>
            {authStep === 'main' && (displayWorkspace || username) ? (
              <p className="dl-context">
                <code>/{displayWorkspace || username.trim().toLowerCase()}</code>
              </p>
            ) : authStep === 'register' ? (
              <p className="dl-context">Workspace-Name und Einladungs-PIN aus der Mail.</p>
            ) : authStep === 'setPin' ? (
              <p className="dl-context">Dieser PIN ersetzt den Einladungs-Code für künftige Anmeldungen.</p>
            ) : (
              <div style={{ height: 12 }} />
            )}

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
                    <input
                      ref={pinRef}
                      className="dl-input pin"
                      type="password"
                      inputMode="numeric"
                      autoComplete="current-password"
                      maxLength={6}
                      placeholder="PIN Code"
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                    <button
                      className="dl-btn dl-btn-ghost"
                      type="submit"
                      disabled={loading || oauthLoading !== null}
                    >
                      {loading ? 'Wird geprüft…' : 'Anmelden'}
                    </button>
                  </form>
                </>
              ) : null}

              {authStep === 'register' ? (
                <form className="dl-stack" onSubmit={e => { e.preventDefault(); continueRegister() }}>
                  <input
                    ref={wsRef}
                    className="dl-input"
                    type="text"
                    autoComplete="organization"
                    placeholder="Workspace-Name"
                    value={workspaceName}
                    onChange={e => setWorkspaceName(e.target.value)}
                    spellCheck={false}
                  />
                  <input
                    className="dl-input mono"
                    type="text"
                    autoComplete="username"
                    placeholder="Benutzername"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    spellCheck={false}
                    autoCapitalize="none"
                  />
                  <input
                    className="dl-input pin"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="Einladungs-PIN"
                    value={invitePin}
                    onChange={e => setInvitePin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    spellCheck={false}
                    autoCapitalize="none"
                  />
                  <button className="dl-btn dl-btn-ghost" type="submit" disabled={loading}>
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
                  <input
                    className="dl-input pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={6}
                    placeholder="Neuer PIN"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    spellCheck={false}
                    autoCapitalize="none"
                    autoFocus
                  />
                  <input
                    className="dl-input pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={6}
                    placeholder="PIN bestätigen"
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    spellCheck={false}
                    autoCapitalize="none"
                  />
                  <button className="dl-btn dl-btn-ghost" type="submit" disabled={loading}>
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
          </section>
        </main>

        <footer className="dl-footer-meta">
          <button
            type="button"
            className="dl-theme-icon"
            aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
          </button>
          <div className="dl-footer-links">
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
            <a
              className="dl-dev-link"
              href="/login"
              onClick={e => { e.preventDefault(); navigateWithFade('/login') }}
            >
              Client Portal
            </a>
          </div>
        </footer>
      </div>

      <AuthSecurityModal open={securityOpen} onClose={() => setSecurityOpen(false)} />
    </main>
  )
}
