'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { prepareAuthRouteTransition, useAuthTheme } from '@/lib/auth-theme'
import GoogleBrandIcon from '@/components/auth/GoogleBrandIcon'
import AuthOtpInput from '@/components/auth/AuthOtpInput'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import { rememberFestagAccount } from '@/lib/auth-device-memory'

type AuthStep = 'main' | 'codeEntry'
type OauthProvider = 'google' | 'github' | null

function mapPinError(msg: string): string {
  if (msg.includes('rate') || msg.includes('too many')) return 'Zu viele Versuche. Bitte warte einen Moment.'
  if (msg.includes('service_unavailable') || msg.includes('signing_unavailable')) {
    return 'Dev-Login ist auf dem Server noch nicht eingerichtet. SUPABASE_SERVICE_ROLE_KEY fehlt in Vercel — bitte Admin informieren.'
  }
  if (msg.includes('invalid_credentials')) return 'Benutzername oder PIN ist nicht korrekt.'
  return 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.'
}

function mapAuthError(raw: string): string {
  const msg = String(raw || '').toLowerCase()
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
  if (msg.includes('user not found') || msg.includes('user_not_found'))
    return 'Kein Account mit dieser E-Mail. Bitte zuerst registrieren oder GitHub nutzen.'
  if (msg.includes('invalid token') || msg.includes('invalid otp') || msg.includes('otp_expired'))
    return 'Ungültiger oder abgelaufener Code. Fordere einen neuen an.'
  if (msg.includes('invalid email') || msg.includes('email_address_invalid'))
    return 'Bitte eine gültige E-Mail-Adresse verwenden.'
  return 'Anmeldung gerade nicht möglich. Bitte versuche es gleich erneut.'
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

export default function DevLoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [authStep, setAuthStep] = useState<AuthStep>('main')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageExiting, setPageExiting] = useState(false)
  const { mode: theme, setMode: setTheme } = useAuthTheme('dev')
  const [oauthLoading, setOauthLoading] = useState<OauthProvider>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  const userRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const postAuthNext = '/dev'

  useEffect(() => {
    if (authStep !== 'main') return
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => emailRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [authStep])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  function navigateWithFade(href: string) {
    router.prefetch(href)
    prepareAuthRouteTransition(href)
    setPageExiting(true)
    setTimeout(() => router.push(href), 160)
  }

  async function handleOauth(provider: 'google' | 'github') {
    setError('')
    setOauthLoading(provider)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postAuthNext)}`,
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

  async function sendMagicLink(): Promise<'ok' | 'rate_limited' | 'error'> {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postAuthNext)}`,
        shouldCreateUser: true,
      },
    })
    if (otpError) {
      if (isOtpRateLimited(otpError.message)) return 'rate_limited'
      const mapped = mapAuthError(otpError.message)
      if (mapped) setError(mapped)
      return 'error'
    }
    return 'ok'
  }

  async function handleEmailSubmit() {
    setError('')
    if (!email.trim()) { setError('Bitte E-Mail-Adresse eingeben.'); return }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError('Bitte eine gültige E-Mail-Adresse eingeben.'); return }
    setLoading(true)
    const result = await sendMagicLink()
    setLoading(false)
    if (result === 'ok' || result === 'rate_limited') {
      setError('')
      setResendCooldown(result === 'ok' ? 60 : 30)
      setAuthStep('codeEntry')
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
      email: email.trim(),
      token: trimmed,
      type: 'email',
    })
    setLoading(false)
    if (verifyError) { setError(mapAuthError(verifyError.message)); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = `/auth/callback?next=${encodeURIComponent(postAuthNext)}`
      return
    }

    // Dev-Intent: mark pending if not already a protected role (mirrors OAuth callback).
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('role,approval_status')
        .eq('id', session.user.id)
        .maybeSingle()
      const role = (existing as any)?.role
      const protectedRole = role === 'dev' || role === 'admin' || role === 'project_owner'
      if (!protectedRole && role !== 'pending_developer') {
        await supabase.from('profiles').upsert({
          id: session.user.id,
          email: session.user.email ?? null,
          role: 'pending_developer',
          approval_status: 'pending',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      }
    } catch { /* best-effort */ }

    const target = await resolvePostAuthTarget(supabase, session.user.id, postAuthNext)
    rememberFestagAccount({
      userId: session.user.id,
      email: email.trim(),
      method: 'email',
      onboardingCompleted: target === '/dashboard' || target === '/dev',
    })
    window.location.href = target
  }

  async function submitPin() {
    setError('')
    const u = username.trim().toLowerCase()
    const p = pin.trim()
    if (!u || !p) { setError('Bitte Benutzername und PIN eingeben.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/dev/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, pin: p }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d?.ok || !d?.session?.user_id) {
        setError(mapPinError(d?.error || 'invalid_credentials')); setLoading(false); return
      }
      localStorage.setItem('festag_dev_session', JSON.stringify(d.session))
      window.location.href = '/dev'
    } catch (e: any) {
      setError(mapPinError(e?.message || ''))
      setLoading(false)
    }
  }

  const resendDisabled = resending || resendCooldown > 0
  const resendLabel = resending
    ? 'Wird gesendet…'
    : resendCooldown > 0
      ? `Neuen Code anfordern in ${resendCooldown}s`
      : 'Neuen Code anfordern'

  return (
    <main
      className={`dl-root${pageExiting ? ' exiting' : ''}`}
      data-theme={theme}
    >
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .dl-root {
          min-height:100dvh;
          width:100%;
          --dl-accent:#5B647D;
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
        .dl-root:not(.exiting) { animation: dlEnter 0.22s cubic-bezier(.16,1,.3,1) both; }

        .dl-container {
          flex:1;
          display:flex;
          flex-direction:column;
          min-height:100dvh;
        }

        .dl-header {
          display:flex;
          align-items:center;
          justify-content:flex-start;
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
          line-height:1;
          text-decoration:none;
        }
        .dl-wordmark-path {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-size:13px;
          font-weight:500;
          letter-spacing:-0.02em;
          color:#5B647D;
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
          margin:0 0 28px;
          text-align:left;
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

        .dl-btn-google {
          background:#5B647D;
          color:#ffffff;
          border-color:color-mix(in srgb, #5B647D 88%, #000000);
          box-shadow:0 2px 8px rgba(91, 100, 125, 0.28);
        }
        .dl-btn-google:hover:not(:disabled) {
          background:color-mix(in srgb, #5B647D 90%, #ffffff);
        }
        .dl-google-icon { width:18px; height:18px; flex-shrink:0; display:block; object-fit:contain; }

        .dl-btn-github {
          background:#1e1e20;
          color:#f5f5f7;
          border-color:#1e1e20;
          box-shadow:0 2px 8px rgba(15, 23, 42, 0.18);
        }
        .dl-btn-github:hover:not(:disabled) {
          background:#2a2a2c;
          border-color:#2a2a2c;
        }
        .dl-github-icon { width:18px; height:18px; flex-shrink:0; }

        .dl-btn-ghost {
          background:#ffffff;
          color:#1e1e20;
          border-color:#e7ebf0;
        }
        .dl-btn-ghost:hover:not(:disabled) {
          background:#f7f8fb;
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
          caret-color:#5B647D;
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
          background:#ffffff;
          border-color:color-mix(in srgb, #5B647D 55%, #e7ebf0);
          box-shadow:0 0 0 3px rgba(91, 100, 125, 0.16);
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

        .dl-btn-primary {
          background:#5B647D;
          color:#ffffff;
          border-color:color-mix(in srgb, #5B647D 88%, #000000);
          box-shadow:0 2px 8px rgba(91, 100, 125, 0.28);
        }
        .dl-btn-primary:hover:not(:disabled) {
          background:color-mix(in srgb, #5B647D 90%, #ffffff);
          border-color:color-mix(in srgb, #5B647D 82%, #000000);
        }

        .dl-hint,
        .dl-flow-info {
          margin:2px 0 0;
          font-size:12px;
          line-height:1.4;
          color:#86868b;
          text-align:left;
        }
        .dl-flow-info { font-size:13px; line-height:1.45; }
        .dl-flow-info strong { color:#1e1e20; font-weight:400; }

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

        .dl-otp,
        .al-otp {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          width:100%;
        }
        .dl-otp-cell,
        .al-otp-cell {
          width:42px;
          height:44px;
          flex:0 0 42px;
          border-radius:12px;
          border:0.7px solid #e7ebf0;
          background:#f5f5f7;
          color:#1e1e20;
          font-family:inherit;
          font-size:20px;
          font-weight:500;
          text-align:center;
          outline:none;
          caret-color:#5B647D;
        }
        .dl-otp-cell:focus,
        .al-otp-cell:focus {
          background:#fff;
          border-color:color-mix(in srgb, #5B647D 55%, #e7ebf0);
          box-shadow:0 0 0 3px rgba(91, 100, 125, 0.16);
        }

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
          user-select:none;
        }
        .dl-ssl svg { width:11px; height:13px; flex-shrink:0; }
        .dl-dev-link:hover { color:#1e1e20; }

        .dl-root[data-theme="dark"] {
          background:transparent;
          color:#f5f5f7;
        }
        .dl-root[data-theme="dark"] .dl-wordmark { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-wordmark-path { color:#9aa3b5; }
        .dl-root[data-theme="dark"] .dl-title { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-hint,
        .dl-root[data-theme="dark"] .dl-flow-info,
        .dl-root[data-theme="dark"] .dl-ssl,
        .dl-root[data-theme="dark"] .dl-dev-link,
        .dl-root[data-theme="dark"] .dl-link,
        .dl-root[data-theme="dark"] .dl-back,
        .dl-root[data-theme="dark"] .dl-divider { color:rgba(245,245,247,0.45); }
        .dl-root[data-theme="dark"] .dl-flow-info strong { color:#f5f5f7; }
        .dl-root[data-theme="dark"] .dl-divider::before,
        .dl-root[data-theme="dark"] .dl-divider::after { background:rgba(255,255,255,0.1); }
        .dl-root[data-theme="dark"] .dl-btn-google {
          background:#5B647D;
          color:#ffffff;
        }
        .dl-root[data-theme="dark"] .dl-btn-github {
          background:#f5f5f7;
          color:#0c0c0e;
          border-color:#f5f5f7;
        }
        .dl-root[data-theme="dark"] .dl-btn-github:hover:not(:disabled) {
          background:#ffffff;
          border-color:#ffffff;
        }
        .dl-root[data-theme="dark"] .dl-btn-ghost {
          background:#121214;
          color:#f5f5f7;
          border-color:rgba(255,255,255,0.12);
        }
        .dl-root[data-theme="dark"] .dl-btn-ghost:hover:not(:disabled) {
          background:#1c1c1e;
        }
        .dl-root[data-theme="dark"] .dl-input {
          background:transparent;
          color:#f5f5f7;
          border:1px solid rgba(255,255,255,0.28);
        }
        .dl-root[data-theme="dark"] .dl-input::placeholder { color:rgba(245,245,247,0.38); }
        .dl-root[data-theme="dark"] .dl-input:focus,
        .dl-root[data-theme="dark"] .dl-input:focus-visible {
          background:rgba(255,255,255,0.03);
          border-color:rgba(255,255,255,0.72);
          box-shadow:0 0 0 3px rgba(91, 100, 125, 0.28);
        }
        .dl-root[data-theme="dark"] .dl-otp-cell,
        .dl-root[data-theme="dark"] .al-otp-cell {
          background:#121214;
          color:#f5f5f7;
          border-color:rgba(255,255,255,0.12);
        }
        .dl-root[data-theme="dark"] .dl-otp-cell:focus,
        .dl-root[data-theme="dark"] .al-otp-cell:focus {
          background:#18181a;
          border-color:rgba(255,255,255,0.28);
        }
        .dl-root[data-theme="dark"] .dl-btn-primary {
          background:#5B647D;
          color:#ffffff;
        }
        .dl-root[data-theme="dark"] .dl-error {
          background:rgba(255,69,58,0.1);
          color:#ff6961;
          border-color:rgba(255,69,58,0.2);
        }
        .dl-root[data-theme="dark"] .dl-theme-icon { color:rgba(245,245,247,0.55); }
        .dl-root[data-theme="dark"] .dl-theme-icon:hover {
          color:#f5f5f7;
          background:rgba(255,255,255,0.08);
        }
        .dl-root[data-theme="dark"] .dl-footer-sep { color:rgba(245,245,247,0.28); }
        .dl-root[data-theme="dark"] .dl-dev-link:hover,
        .dl-root[data-theme="dark"] .dl-link:hover,
        .dl-root[data-theme="dark"] .dl-back:hover { color:#f5f5f7; }

        @media (min-width: 769px) {
          .dl-btn,
          .dl-input {
            height:45px;
            font-size:14px;
          }
          .dl-input { font-size:15px; }
          .dl-otp-cell,
          .al-otp-cell {
            height:44px;
            width:42px;
            flex-basis:42px;
          }
        }

        @media (max-width: 768px) {
          .dl-root,
          .dl-container {
            height:100dvh;
            max-height:100dvh;
            min-height:0;
            overflow:hidden;
            background:transparent;
          }
          .dl-header { padding:max(12px, env(safe-area-inset-top)) 18px 8px; flex-shrink:0; }
          .dl-wordmark { font-size:20px; }
          .dl-main {
            flex:1;
            min-height:0;
            align-items:center;
            justify-content:center;
            overflow:hidden;
            padding:12px 24px max(112px, calc(88px + env(safe-area-inset-bottom)));
          }
          .dl-panel {
            max-width:min(100%, 400px);
            max-height:100%;
            overflow-x:hidden;
            overflow-y:auto;
            overscroll-behavior:contain;
            -webkit-overflow-scrolling:touch;
            scroll-behavior:smooth;
            scrollbar-width:none;
            padding:0 2px;
          }
          .dl-panel::-webkit-scrollbar { display:none; }
          .dl-title {
            font-size:34px;
            line-height:40px;
            letter-spacing:-0.035em;
            margin-bottom:22px;
          }
          .dl-btn,
          .dl-input {
            height:54px;
            font-size:16px;
          }
          .dl-input { border-radius:16px; }
          .dl-input.mono { font-size:15px; }
          .dl-input.pin { font-size:20px; }
          .dl-otp-cell,
          .al-otp-cell { height:54px; width:46px; flex-basis:46px; border-radius:14px; }
          .dl-stack { gap:14px; }
          .dl-hint,
          .dl-flow-info { font-size:13px; }
          .dl-footer-meta {
            flex-direction:column;
            gap:10px;
            padding:12px 20px max(16px, env(safe-area-inset-bottom));
          }
          .dl-theme-icon { order:2; width:44px; height:44px; }
          .dl-footer-links { order:1; }
        }

        @media (max-width: 768px) and (max-height: 740px) {
          .dl-title { font-size:30px; line-height:36px; margin-bottom:16px; }
          .dl-btn, .dl-input { height:50px; }
          .dl-stack { gap:12px; }
        }
      `}</style>

      <div className="dl-container">
        <header className="dl-header">
          <a
            className="dl-wordmark"
            href="/"
            onClick={e => { e.preventDefault(); navigateWithFade('/') }}
          >
            Festag
            <span className="dl-wordmark-path">/dev</span>
          </a>
        </header>

        <main className="dl-main">
          <section className="dl-panel" aria-label="Developer Login">
            <h1 className="dl-title">
              {authStep === 'codeEntry' ? 'Prüfen Sie Ihre E-Mails' : 'Dev Panel'}
            </h1>

            <div className="dl-stack">
              {error && <p className="dl-error">{error}</p>}

              {authStep === 'codeEntry' ? (
                <>
                  <p className="dl-flow-info">
                    Code an <strong>{email.trim()}</strong> gesendet.
                  </p>
                  <AuthOtpInput
                    value={code}
                    onChange={setCode}
                    onComplete={handleVerifyCode}
                    disabled={loading}
                    autoFocus
                    aria-label="Bestätigungscode"
                  />
                  <button
                    className="dl-btn dl-btn-primary"
                    type="button"
                    onClick={() => handleVerifyCode()}
                    disabled={loading || code.length < 6}
                  >
                    {loading ? 'Wird geprüft…' : 'Ins Dev Panel'}
                  </button>
                  <button className="dl-link" type="button" onClick={handleResend} disabled={resendDisabled}>
                    {resendLabel}
                  </button>
                  <button
                    className="dl-back"
                    type="button"
                    onClick={() => { setCode(''); setError(''); setAuthStep('main') }}
                  >
                    Zurück
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="dl-btn dl-btn-google"
                    type="button"
                    onClick={() => handleOauth('google')}
                    disabled={oauthLoading !== null}
                  >
                    <GoogleBrandIcon className="dl-google-icon" />
                    <span>{oauthLoading === 'google' ? 'Wird geöffnet…' : 'Mit Google fortfahren'}</span>
                  </button>

                  <button
                    className="dl-btn dl-btn-github"
                    type="button"
                    onClick={() => handleOauth('github')}
                    disabled={oauthLoading !== null}
                  >
                    <svg className="dl-github-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.3 1.19-3.11-.12-.29-.51-1.48.11-3.08 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.6.23 2.79.11 3.08.74.81 1.19 1.85 1.19 3.11 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" fill="currentColor"/>
                    </svg>
                    <span>{oauthLoading === 'github' ? 'Wird geöffnet…' : 'Mit GitHub fortfahren'}</span>
                  </button>

                  <div className="dl-divider"><span>oder E-Mail</span></div>

                  <form className="dl-stack" onSubmit={e => { e.preventDefault(); handleEmailSubmit() }}>
                    <input
                      ref={emailRef}
                      className="dl-input"
                      type="email"
                      autoComplete="email"
                      placeholder="E-Mail-Adresse"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                    <button className="dl-btn dl-btn-ghost" type="submit" disabled={loading || oauthLoading !== null}>
                      {loading ? 'Wird gesendet…' : 'Code per E-Mail'}
                    </button>
                  </form>

                  <div className="dl-divider"><span>oder PIN</span></div>

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
                      className="dl-input pin"
                      type="text"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="PIN"
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                    <button className="dl-btn dl-btn-primary" type="submit" disabled={loading || oauthLoading !== null}>
                      {loading ? 'Wird geprüft…' : 'Ins Dev Panel'}
                    </button>
                  </form>

                  <p className="dl-hint">PIN-Zugang nur für freigeschaltete Developer-Accounts.</p>
                </>
              )}
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
            <span className="dl-ssl" aria-label="SSL verschlüsselt">
              <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.5 0.5C3.84315 0.5 2.5 1.84315 2.5 3.5V5H1.5C0.947715 5 0.5 5.44772 0.5 6V11.5C0.5 12.0523 0.947715 12.5 1.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6C10.5 5.44772 10.0523 5 9.5 5H8.5V3.5C8.5 1.84315 7.15685 0.5 5.5 0.5ZM3.5 5V3.5C3.5 2.39543 4.39543 1.5 5.5 1.5C6.60457 1.5 7.5 2.39543 7.5 3.5V5H3.5Z" fill="currentColor"/>
              </svg>
              <span>SSL, End-to-End verschlüsselt</span>
            </span>
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
    </main>
  )
}
