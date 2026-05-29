'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLastFestagEmail, getLastFestagMethod, rememberFestagAccount } from '@/lib/auth-device-memory'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import AuthBrandLogo from '@/components/AuthBrandLogo'

type Method = 'google' | 'email' | 'sso' | 'passkey' | 'github'
type Theme = 'light' | 'dark'
const METHOD_KEY = 'festag_last_method'
const THEME_KEY = 'festag_theme'

type EmailStep = 'main' | 'email' | 'emailSent' | 'codeEntry'

function getInitialAuthTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark') return 'dark'
    if (stored === 'light' || stored === 'read') return 'light'
  } catch {}
  return 'dark'
}

function applyAuthThemeToDocument(t: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', t)
  document.documentElement.style.backgroundColor = t === 'dark' ? '#07090b' : '#fcfcfd'
  document.documentElement.style.colorScheme = t
}

function mapAuthError(raw: string): string {
  const msg = String(raw || '').toLowerCase()
  // Always surface the raw cause to the browser console — makes
  // production debugging possible without exposing it to the user.
  if (raw && typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('[festag/login] auth error:', raw)
  }
  if (msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('too many') || msg.includes('email rate'))
    return 'Zu viele Versuche. Bitte warte einen Moment.'
  if (msg.includes('security purposes') || msg.includes('can only request this after'))
    return 'Bitte warte kurz, bevor du einen neuen Code anforderst.'
  if (msg.includes('signups not allowed') || msg.includes('user not found') || msg.includes('user_not_found'))
    return 'Kein Account mit dieser E-Mail. Registriere dich zuerst.'
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
  return 'Anmeldung gerade nicht möglich. Bitte versuche es gleich erneut.'
}

function inferSessionMethod(user: any): Method {
  return user?.app_metadata?.provider === 'google' ? 'google' : 'email'
}

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailStep, setEmailStep] = useState<EmailStep>('main')
  const [animating, setAnimating] = useState(false)
  const [pageExiting, setPageExiting] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [theme, setThemeState] = useState<Theme>('dark')
  // Gate the form until we know whether a session exists — a logged-in user
  // never sees the login panel, they're sent straight in.
  const [booting, setBooting] = useState(true)
  const [lastMethod, setLastMethod] = useState<Method | null>(null)
  const [lastEmail, setLastEmail] = useState<string | null>(null)
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportEmail, setSupportEmail] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [supportSending, setSupportSending] = useState(false)
  const [supportSent, setSupportSent] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const emailView = emailStep !== 'main'

  // Invite passthrough: when the user arrived via festag.app/invite/<token>,
  // carry the token so post-auth lands back on the join screen instead of the
  // dashboard. Read fresh in handlers (client-only).
  const inviteToken =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('invite')
      : null
  const postAuthNext = inviteToken ? `/invite/${inviteToken}` : '/dashboard'

  function navigateWithFade(href: string) {
    router.prefetch(href)
    setPageExiting(true)
    setTimeout(() => router.push(href), 160)
  }

  async function routeSessionIfPresent() {
    // getUser() validates with the server AND refreshes an expired access
    // token via the refresh token. getSession() only reads the local
    // snapshot — which could be null/expired, wrongly showing the login form
    // (the "ab und zu keine Session" bug). With getUser() a returning user
    // with a valid refresh token is sent straight in.
    let user: { id: string; email?: string | null } | null = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user ?? null
    } catch { user = null }
    if (!user) { setBooting(false); return false }

    // /login is the *client* portal entry. Pass `/dashboard` as intent so
    // even an admin/dev who arrived here lands in the client workspace.
    // They can switch to the dev portal via /dev/login on purpose.
    const target = await resolvePostAuthTarget(supabase, user.id, '/dashboard')
    rememberFestagAccount({
      userId: user.id,
      email: user.email ?? null,
      method: lastMethod ?? inferSessionMethod(user),
      onboardingCompleted: target === '/dashboard',
    })
    window.location.href = inviteToken ? `/invite/${inviteToken}` : target
    return true
  }

  useEffect(() => {
    routeSessionIfPresent()
    // Safety net: never let the boot loader hang if getUser() stalls.
    const bootTimer = setTimeout(() => setBooting(false), 2500)
    const stored = getLastFestagMethod() as Method | null
    setLastMethod(stored)
    const initialTheme = getInitialAuthTheme()
    applyAuthThemeToDocument(initialTheme)
    setThemeState(initialTheme)
    try {
      const e = getLastFestagEmail()
      if (e && /\S+@\S+\.\S+/.test(e)) setLastEmail(e)
    } catch {}
    return () => clearTimeout(bootTimer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleEmailButton() {
    // Do not auto-request a magic link from the main button. Reopening the
    // email form keeps the flow predictable and avoids Supabase rate-limit
    // states that made the login screen look disabled.
    if (lastEmail) setEmail(lastEmail)
    switchToEmail()
  }

  function setTheme(t: Theme) {
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch {}
    applyAuthThemeToDocument(t)
    setThemeState(t)
  }

  useEffect(() => {
    if (emailStep !== 'email') return
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => emailRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [emailStep])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  useEffect(() => {
    if (emailStep !== 'codeEntry') return
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => codeRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [emailStep])

  function saveMethod(method: Method) {
    localStorage.setItem(METHOD_KEY, method)
    setLastMethod(method)
  }

  function goTo(step: EmailStep) {
    setError(''); setAnimating(true)
    setTimeout(() => { setEmailStep(step); setAnimating(false) }, 180)
  }

  function switchToEmail() {
    // Keep whatever the user already typed; otherwise prefill the last
    // remembered address. Avoid overwriting a non-empty draft.
    if (!email && lastEmail) setEmail(lastEmail)
    goTo('email')
  }
  function switchBack() {
    if (emailStep === 'codeEntry' || emailStep === 'emailSent') { setCode(''); goTo('email'); return }
    setEmail(''); setCode('')
    goTo('main')
  }

  function toggleTheme(t: Theme) { setTheme(t) }

  async function handleGoogle() {
    setError('')
    saveMethod('google')
    setOauthLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${postAuthNext}` },
    })
    if (oauthError) { setError(mapAuthError(oauthError.message)); setOauthLoading(false) }
  }

  // Single Sign-On via SAML. Resolves the IdP from the user's work-email
  // domain. If none is configured for that domain, we surface a calm hint
  // rather than a raw error.
  async function handleSSO() {
    setError('')
    const raw = (email.trim() || (typeof window !== 'undefined' ? window.prompt('Arbeits-E-Mail für Single Sign-On:') : '') || '').trim()
    if (!raw) { setError('Bitte gib deine Arbeits-E-Mail an, um SSO zu nutzen.'); return }
    const domain = raw.includes('@') ? raw.split('@')[1] : raw
    if (!domain || !domain.includes('.')) { setError('Bitte gib eine gültige Arbeits-Domain für SSO an.'); return }
    saveMethod('sso')
    setOauthLoading(true)
    try {
      const { data, error: ssoError } = await (supabase.auth as any).signInWithSSO({
        domain,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${postAuthNext}` },
      })
      if (ssoError || !data?.url) {
        setError('Für diese Domain ist noch kein SSO eingerichtet. Nutze Google oder E-Mail.')
        setOauthLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('SSO ist gerade nicht verfügbar. Nutze Google oder E-Mail.')
      setOauthLoading(false)
    }
  }

  async function sendMagicLink(): Promise<boolean> {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${postAuthNext}`,
        shouldCreateUser: false,
      },
    })
    if (otpError) { setError(mapAuthError(otpError.message)); return false }
    return true
  }

  async function handleEmailSubmit() {
    setError('')
    if (!email.trim()) { setError('Bitte E-Mail-Adresse eingeben.'); return }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError('Bitte eine gültige E-Mail-Adresse eingeben.'); return }
    setLoading(true)
    const ok = await sendMagicLink()
    setLoading(false)
    if (ok) { saveMethod('email'); setResendCooldown(60); goTo('codeEntry') }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return
    setError(''); setResending(true)
    const ok = await sendMagicLink()
    setResending(false)
    if (ok) setResendCooldown(60)
  }

  async function handleVerifyCode() {
    setError('')
    const trimmed = code.trim()
    if (!trimmed || trimmed.length < 6) { setError('Bitte vollständigen Code eingeben.'); return }
    setLoading(true)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(), token: trimmed, type: 'email',
    })
    setLoading(false)
    if (verifyError) { setError(mapAuthError(verifyError.message)); return }
    saveMethod('email')
    const { data: { session } } = await supabase.auth.getSession()
    const target = session ? await resolvePostAuthTarget(supabase, session.user.id, '/dashboard') : '/dashboard'
    if (session) {
      await supabase
        .from('onboarding_state')
        .upsert({ user_id: session.user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }
    if (session) {
      rememberFestagAccount({
        userId: session.user.id,
        email: email.trim(),
        method: 'email',
        onboardingCompleted: target === '/dashboard',
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
        body: JSON.stringify({ message, page: '/login' }),
      })
      if (!res.ok) throw new Error('support failed')
      setSupportSent(true)
      setSupportMessage('')
    } catch {
      setError('Support-Anfrage konnte gerade nicht gesendet werden. Bitte versuche es gleich erneut.')
    }
    setSupportSending(false)
  }

  const themeSwitcher = (
    <div className="log-theme-switcher">
      <button className={`log-theme-pill${theme === 'light' ? ' active' : ''}`} type="button" onClick={() => toggleTheme('light')} aria-label="Heller Modus">Aa</button>
      <button className={`log-theme-pill${theme === 'dark' ? ' active' : ''}`} type="button" onClick={() => toggleTheme('dark')} aria-label="Dunkler Modus">Aa</button>
    </div>
  )

  const mainButtons = (
    <div className="log-btn-stack">
      <div className="log-btn-group">
        <button className="log-btn log-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
          {oauthLoading ? <span className="log-loader" /> : (
            <svg className="log-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M21.35 11.1H12.18v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44-3.83 0-7.19-3.02-7.19-7.27 0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97l1.9-1.98S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" fill="currentColor"/>
            </svg>
          )}
          <span className="log-btn-label">Mit Google verbinden</span>
        </button>
        {lastMethod === 'google' && <p className="log-hint">Du hast dich zuletzt damit angemeldet</p>}
      </div>
      <div className="log-btn-group">
        <button className="log-btn log-btn-outline" type="button" onClick={handleEmailButton}>
          E-Mail verwenden
        </button>
        {lastMethod === 'email' && <p className="log-hint">Du hast dich zuletzt damit angemeldet</p>}
      </div>
      <div className="log-btn-group">
        <button className="log-btn log-btn-outline" type="button" onClick={handleSSO} disabled={oauthLoading}>
          Single Sign-On (SSO)
        </button>
        {lastMethod === 'sso' && <p className="log-hint">Du hast dich zuletzt damit angemeldet</p>}
      </div>
    </div>
  )

  const emailForm = (
    <div className="log-email-form">
      {error && <p className="log-error">{error}</p>}
      <input
        ref={emailRef}
        className="log-email-input"
        type="email"
        autoComplete="email"
        autoFocus
        placeholder="E-Mail-Adresse eingeben..."
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleEmailSubmit() }}
      />
      <button className="log-btn log-btn-outline" type="button" onClick={handleEmailSubmit} disabled={loading}>
        <span>{loading ? 'Link wird gesendet…' : 'Magic Link senden'}</span>
      </button>
      <button className="log-back" type="button" onClick={switchBack}>Zurück</button>
    </div>
  )

  const resendDisabled = resending || resendCooldown > 0
  const resendLabel = resending
    ? 'Wird gesendet…'
    : resendCooldown > 0
      ? `Neuen Code anfordern in ${resendCooldown}s`
      : 'Neuen Code anfordern'

  const newestWarning = (
    <p className="log-newest-hint">
      Nutze den jüngsten Code aus deiner E-Mail. Eine neue Anfrage entwertet alle vorherigen.
    </p>
  )

  const emailSentScreen = (
    <div className="log-email-form">
      {error && <p className="log-error">{error}</p>}
      <p className="log-sent-info">
        Wir haben einen sicheren<br />Anmeldelink geschickt an<br />
        <strong>{email}</strong>
      </p>
      <button className="log-btn log-btn-outline" type="button" onClick={() => goTo('codeEntry')}>Code manuell eintippen</button>
      <button className="log-link-action" type="button" onClick={handleResend} disabled={resendDisabled}>
        {resendLabel}
      </button>
      <p className="log-support-note">
        Anmelde-E-Mail vergessen? <button type="button" onClick={openSupportModal}>Support kontaktieren</button>
      </p>
      <button className="log-back" type="button" onClick={switchBack}>Zurück</button>
    </div>
  )

  const codeEntryScreen = (
    <div className="log-email-form">
      {error && <p className="log-error">{error}</p>}
      <p className="log-sent-info">
        Anmeldelink wurde geschickt an<br />
        <strong>{email}</strong>
      </p>
      <input
        ref={codeRef}
        className="log-email-input log-code-input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        placeholder="6-stelliger Code"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\s/g, ''))}
        onKeyDown={e => { if (e.key === 'Enter') handleVerifyCode() }}
      />
      <button className="log-btn log-btn-confirm" type="button" onClick={handleVerifyCode} disabled={loading}>
        <span>{loading ? 'Wird geprüft…' : 'Anmelden'}</span>
      </button>
      <button className="log-link-action" type="button" onClick={handleResend} disabled={resendDisabled}>
        {resendLabel}
      </button>
      <p className="log-support-note">
        Anmelde-E-Mail vergessen? <button type="button" onClick={openSupportModal}>Support kontaktieren</button>
      </p>
      <button className="log-back" type="button" onClick={switchBack}>Zurück</button>
    </div>
  )

  const legal = (
    <div className="log-legal">
      <p className="log-legal-text">
        Secure, AI-orchestrated software Delivery.
        <br />
        Mit Ihrer Anmeldung bestätigen Sie unsere
        <br />
        <a href="/agb" onClick={e => { e.preventDefault(); navigateWithFade('/agb') }}>AGB</a>
        {' '}und{' '}
        <a href="/nutzungsbedingungen" onClick={e => { e.preventDefault(); navigateWithFade('/nutzungsbedingungen') }}>Nutzungsbestimmungen</a>.
        <br />
        <br />
        Noch kein Zugang?{' '}
        <a href="/register" onClick={e => { e.preventDefault(); navigateWithFade('/register') }}>Hier&nbsp;registrieren</a>
      </p>
      <a className="log-dev" href="/dev" onClick={e => { e.preventDefault(); navigateWithFade('/dev/login') }}>Dev Zugang</a>
    </div>
  )

  const emailTitle =
    emailStep === 'email'     ? 'Wie lautet Ihre E-Mail?' :
    emailStep === 'emailSent' ? 'Prüfen Sie Ihre E-Mails' :
    emailStep === 'codeEntry' ? 'Prüfen Sie Ihre E-Mails' : ''
  const emailTitleMobile =
    emailStep === 'email'     ? 'Wie lautet Ihre\nE-Mail-Adresse?' :
    emailStep === 'emailSent' ? 'Prüfen Sie Ihre\nE-Mails' :
    emailStep === 'codeEntry' ? 'Prüfen Sie Ihre\nE-Mails' : ''

  const currentEmailScreen =
    emailStep === 'email'     ? emailForm :
    emailStep === 'emailSent' ? emailSentScreen :
    emailStep === 'codeEntry' ? codeEntryScreen : null

  // While we resolve the session, show a calm loader instead of flashing the
  // login form — a returning, still-authenticated user goes straight in.
  if (booting) {
    return (
      <main data-theme={theme} style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme === 'dark' ? '#07090b' : '#fcfcfd' }}>
        <style>{`@keyframes lgboot{to{transform:rotate(360deg)}}`}</style>
        <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(168,176,188,.25)', borderTopColor: 'rgba(168,176,188,.9)', animation: 'lgboot .8s linear infinite' }} />
      </main>
    )
  }

  return (
    <main className={`log-root${pageExiting ? ' exiting' : ''}`} data-theme={theme}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .log-root { min-height:100dvh; width:100%; font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; -webkit-font-smoothing:antialiased; text-rendering:geometricPrecision; transition: opacity 0.16s linear; }
        .log-root.exiting { opacity:0; pointer-events:none; }
        @keyframes logPageEnter { from { opacity:0; } to { opacity:1; } }
        .log-root:not(.exiting) { animation: logPageEnter 0.18s linear both; }

        /* BUTTON ANIMATION */
        .log-btn:active:not(:disabled) { transform:scale(0.97); transition:transform 0.08s ease !important; }

        /* VIEW TRANSITION */
        .log-content { width:100%; display:flex; flex-direction:column; gap:20px; transition:opacity 0.18s ease, transform 0.18s ease; }
        .log-content.animating { opacity:0; transform:translateY(6px); }

        /* THEME SWITCHER */
        .log-theme-switcher { display:flex; gap:8px; align-items:center; }
        .log-theme-pill { min-width:40px; height:32px; display:flex; align-items:center; justify-content:center; padding:0 12px; border-radius:14px; border:0; outline:0; background:#fff; font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:12px; font-weight:500; color:#5b647d; letter-spacing:0.24px; cursor:pointer; box-shadow:0 10px 24px rgba(15,23,42,0.10), 0 2px 5px rgba(15,23,42,0.06), 0 1px 0 rgba(255,255,255,0.9) inset; transition:background .15s, color .15s, box-shadow .15s, transform .15s; -webkit-tap-highlight-color:transparent; }
        .log-theme-pill:hover { background:#FAFBFC; transform:translateY(-1px); }
        .log-theme-pill.active { background:#EEF2F6; color:#202532; box-shadow:0 8px 18px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.06), 0 1px 0 rgba(255,255,255,0.78) inset; }
        .log-theme-pill:focus,
        .log-theme-pill:focus-visible { outline:0; box-shadow:0 10px 24px rgba(15,23,42,0.10), 0 2px 5px rgba(15,23,42,0.06), 0 1px 0 rgba(255,255,255,0.9) inset; }
        .log-theme-desktop { position:absolute; right:28px; top:24px; z-index:20; }
        .log-theme-mobile  { position:absolute; right:20px; top:48px; z-index:20; }

        /* DESKTOP */
        .log-desktop { display:flex; min-height:100dvh; background:#fcfcfd; align-items:center; justify-content:center; position:relative; transition:background .3s; }
        .log-desktop-shell { width:271px; display:flex; flex-direction:column; gap:24px; align-items:center; min-height:auto; justify-content:center; padding-top:0; transform:translateY(14px); }
        .log-desktop-header { width:100%; display:flex; flex-direction:column; gap:24px; align-items:center; }
        .log-logo-desktop { display:flex; align-items:center; justify-content:center; width:100%; }
        .log-desktop-title { font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:21px; font-weight:500; color:#202532; line-height:normal; text-align:center; letter-spacing:0.21px; width:100%; transition:color .3s; }

        /* MOBILE */
        .log-mobile { display:none; min-height:100svh; background:#fcfcfd; position:relative; overflow-x:hidden; overflow-y:auto; transition:background .3s; padding:32px 0 0; }
        .log-mobile-shell { position:relative; z-index:2; width:min(100%, 420px); min-height:calc(100svh - 32px); margin:0 auto; padding:96px 24px 60px; display:flex; flex-direction:column; gap:28px; align-items:center; }
        .log-mobile-logo-title { width:100%; display:flex; flex-direction:column; gap:9px; align-items:center; }
        .log-logo-mobile { display:flex; align-items:center; justify-content:center; width:100%; min-height:62px; }
        .log-mobile-inner { width:100%; display:flex; flex-direction:column; gap:32px; align-items:center; }
        .log-mobile-title { font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:28px; font-weight:500; color:#202532; white-space:nowrap; line-height:47px; text-align:center; letter-spacing:0.28px; height:35px; transition:color .3s; }
        .log-mobile-title-email { font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:20px; font-weight:500; color:#2e2f33; line-height:26px; text-align:center; letter-spacing:0.2px; white-space:pre-line; transition:color .3s; }

        /* SHARED BUTTONS */
        .log-btn-stack { width:271px; display:flex; flex-direction:column; gap:20px; }

        .log-btn-group { display:flex; flex-direction:column; gap:6px; }
        .log-hint { font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:12px; font-weight:400 !important; color:#7b8294; text-align:center; letter-spacing:0.24px; }
        .log-btn { width:100%; height:47px; border-radius:32px; border:none; display:flex; align-items:center; justify-content:center; gap:8px; font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:14px; font-weight:500; letter-spacing:0.14px; cursor:pointer; padding:12px 45px; white-space:nowrap; overflow:hidden; transition:background .15s, opacity .15s, border-color .15s, color .15s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1); transform-origin:center; }
        .log-btn-label { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-weight:500; }
        .log-btn:disabled { opacity:.5; cursor:not-allowed; }
        .log-btn-google { background:#5b647d; color:#fff; box-shadow:0px 8px 24px 0px rgba(200,169,91,0.14); }
        .log-btn-google:hover:not(:disabled) { background:#505870; }
        .log-btn-outline { background:#fff; color:#202532; border:0.7px solid #e7ebf0; box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03); }
        .log-btn-outline:hover:not(:disabled) { background:#F7F8FB; border:1px solid #DCE1EA; }

        /* CONFIRM — Slate pill, consistent with Google/primary actions */
        .log-btn-confirm { background:#fff; color:#202532; border:0.7px solid #e7ebf0; box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03); }
        .log-btn-confirm:hover:not(:disabled) { background:#F7F8FB; border-color:#DCE1EA; }
        .log-google-icon { width:18px; height:18px; display:block; flex-shrink:0; color:#fff; }

        /* DEVELOPER ACCESS */
        .log-dev-divider {
          width:100%; display:flex; align-items:center; gap:10px;
          margin:2px 0 -8px;
          color:#9aa1ad; font-size:11px; font-weight:500;
          letter-spacing:0.16em; text-transform:uppercase;
        }
        .log-dev-divider::before, .log-dev-divider::after {
          content:''; flex:1; height:1px; background:#E7EBF0;
        }
        .log-root[data-theme="dark"] .log-dev-divider { color:#5b647d; }
        .log-root[data-theme="dark"] .log-dev-divider::before,
        .log-root[data-theme="dark"] .log-dev-divider::after { background:rgba(255,255,255,0.06); }
        .log-btn-github {
          background:#fff; color:#202532;
          border:0.7px solid #e7ebf0;
          box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03);
        }
        .log-btn-github:hover:not(:disabled) { background:#F7F8FB; border-color:#DCE1EA; }
        .log-github-icon { width:18px; height:18px; display:block; flex-shrink:0; }
        .log-hint-muted { color:#9aa1ad; font-size:11px; }
        .log-root[data-theme="dark"] .log-btn-github { background:#111720; color:#e8ebf1; border:1px solid rgba(210,225,255,0.085); box-shadow:none; }
        .log-root[data-theme="dark"] .log-btn-github:hover:not(:disabled) { background:#171e28; border-color:rgba(210,225,255,0.13); }

        /* EMAIL FORM */
        .log-email-form { width:271px; display:flex; flex-direction:column; gap:16px; }
        .log-email-input { width:100%; height:47px; border-radius:8px; border:1px solid #5b647d; background:#fff; color:#202532; font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:14px; font-weight:400 !important; letter-spacing:0.01em; padding:0 16px; outline:none; caret-color:#5b647d; box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03); transition:border-color .15s, box-shadow .15s, background .3s, color .3s; }
        .log-email-input::placeholder { color:#bcbfc2; }
        .log-email-input:focus { border-color:#5b647d; box-shadow:0 0 0 3px rgba(91,100,125,0.12); }
        .log-back { font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:13px; font-weight:400 !important; color:#7b8294; background:none; border:none; cursor:pointer; text-align:center; letter-spacing:0.26px; line-height:20px; transition:color .15s; padding:4px; }
        .log-back:hover { color:#202532; }
        .log-link-action { font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:13px; font-weight:400 !important; color:#7b8294; background:none; border:none; cursor:pointer; text-align:center; letter-spacing:0.26px; line-height:20px; transition:color .15s; padding:4px; }
        .log-link-action:hover { color:#202532; }
        .log-link-action:disabled { opacity:.5; cursor:not-allowed; }
        .log-sent-info { font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:14px; font-weight:400 !important; line-height:20px; letter-spacing:0.14px; text-align:center; color:#7b8294; margin:8px 0 16px; }
        .log-sent-info strong { color:#202532; font-weight:500; }
        .log-code-input { text-align:center; letter-spacing:0.4em; font-size:15px; }
        .log-support-note { margin:-4px 0 0; font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:12.5px; line-height:18px; font-weight:400 !important; color:#7b8294; text-align:center; letter-spacing:0.01em; }
        .log-support-note button { border:0; background:transparent; padding:0; color:#202532; font:inherit; font-weight:400 !important; text-decoration:underline; cursor:pointer; }
        .log-newest-hint { margin:-4px 0 -2px; font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:12px; line-height:1.5; font-weight:400 !important; color:#7b8294; text-align:center; letter-spacing:0.01em; padding:8px 12px; background:rgba(91,100,125,0.05); border:1px solid rgba(91,100,125,0.10); border-radius:10px; }
        .log-root[data-theme="dark"] .log-newest-hint { color:#98A2B3; background:rgba(243,245,247,0.04); border-color:rgba(243,245,247,0.08); }

        /* SUPPORT MODAL */
        .log-support-backdrop { position:fixed; inset:0; z-index:90; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(10,14,20,.28); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); animation:logModalFade .16s ease both; }
        .log-support-modal { width:min(360px, 100%); border-radius:18px; border:1px solid rgba(91,100,125,.14); background:#fcfcfd; box-shadow:0 24px 70px rgba(15,23,42,.18), 0 6px 20px rgba(15,23,42,.08); padding:18px; animation:logModalPop .18s cubic-bezier(.16,1,.3,1) both; }
        .log-support-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:14px; }
        .log-support-head h2 { margin:0; color:#202532; font-size:17px; line-height:1.18; font-weight:500; letter-spacing:0.01em; }
        .log-support-head p { margin:5px 0 0; color:#7b8294; font-size:12.5px; line-height:18px; font-weight:400 !important; letter-spacing:0.01em; }
        .log-support-close { width:28px; height:28px; border-radius:9px; border:1px solid rgba(91,100,125,.12); background:transparent; color:#7b8294; font-size:16px; line-height:1; cursor:pointer; }
        .log-support-field { display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
        .log-support-field span { color:#7b8294; font-size:11px; line-height:16px; font-weight:500 !important; letter-spacing:.04em; text-transform:uppercase; }
        .log-support-field input,
        .log-support-field textarea { width:100%; border-radius:12px; border:1px solid rgba(91,100,125,.16); background:#fff; color:#202532; font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:13.5px; font-weight:400 !important; outline:none; padding:11px 12px; resize:none; box-shadow:0 1px 2px rgba(15,23,42,.03); }
        .log-support-field input:focus,
        .log-support-field textarea:focus { border-color:rgba(91,100,125,.42); box-shadow:0 0 0 3px rgba(91,100,125,.10); }
        .log-support-actions { display:flex; gap:8px; margin-top:14px; }
        .log-support-actions .log-btn { height:40px; border-radius:14px; padding:0 14px; font-size:13px; }
        .log-support-success { margin:8px 0 2px; color:#202532; font-size:13px; line-height:19px; text-align:center; font-weight:400 !important; }
        @keyframes logModalFade { from{opacity:0;} to{opacity:1;} }
        @keyframes logModalPop { from{opacity:0; transform:translateY(8px) scale(.98);} to{opacity:1; transform:none;} }

        /* LEGAL */
        .log-legal { width:271px; display:flex; flex-direction:column; gap:22px; text-align:center; }
        .log-legal-text { font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:13px; font-weight:400 !important; line-height:20px; letter-spacing:0.02em; color:#7b8294; }
        .log-legal-text span, .log-legal-text a { font-weight:400 !important; }
        .log-legal-text a { color:#202532; text-decoration:underline; text-underline-offset:3px; transition:color .3s; }
        .log-legal-text a:hover { opacity:.75; }
        .log-dev { font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:13px; font-weight:400 !important; line-height:20px; letter-spacing:0.02em; color:#7b8294; text-decoration:none; text-align:center; display:block; transition:color .3s; }
        .log-dev:hover { color:#202532; }

        .log-ssl-badge { position:fixed; left:20px; bottom:18px; display:flex; align-items:center; gap:6px; font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; font-size:11px; font-weight:400 !important; letter-spacing:0.22px; color:#98A2B3; user-select:none; z-index:30; transition:color .3s; }
        .log-ssl-badge svg { width:11px; height:13px; flex-shrink:0; }
        .log-root[data-theme="dark"] .log-ssl-badge { color:rgba(243,245,247,0.55); }
        .log-region-note { position:fixed; right:20px; bottom:18px; width:auto; max-width:260px; text-align:right; color:#A7AFBF; font-size:10.5px; line-height:1.35; letter-spacing:.02em; font-weight:400 !important; z-index:30; white-space:nowrap; }
        .log-root[data-theme="dark"] .log-region-note { color:rgba(243,245,247,0.50); }

        /* ERROR */
        .log-error { width:271px; background:transparent; color:var(--text-secondary); border:1px solid var(--border); border-radius:10px; padding:10px 12px; font-size:12.5px; font-weight:500 !important; font-family:'Aeonik', Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif; text-align:left; letter-spacing:0.01em; line-height:1.5; display:flex; align-items:flex-start; gap:8px; }
        .log-error::before { content:''; display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--accent); margin-top:6px; flex-shrink:0; }
        .log-loader { width:16px; height:16px; border-radius:999px; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; animation:logSpin .75s linear infinite; flex-shrink:0; }
        @keyframes logSpin { to { transform:rotate(360deg); } }

        @media (max-width: 640px) {
          .log-desktop { display:none; }
          .log-mobile { display:block; }
          .log-theme-mobile { top:132px; right:54px; }
          .log-ssl-badge,
          .log-region-note { display:none; }
        }
        @media (max-width: 380px) {
          .log-mobile { padding-top:24px; }
          .log-mobile-shell { min-height:calc(100svh - 60px); padding-top:226px; }
          .log-theme-mobile { top:116px; right:34px; }
        }
        @media (max-height: 760px) and (max-width: 640px) {
          .log-mobile-shell { padding-top:198px; padding-bottom:48px; }
          .log-mobile-inner { gap:24px; }
          .log-btn-stack { gap:16px; }
          .log-legal { gap:16px; }
        }

        /* ═══ DARK MODE — cool graphite, matches the app ════════════ */
        .log-root[data-theme="dark"] .log-desktop { background:#07090b; }
        .log-root[data-theme="dark"] .log-mobile  { background:#07090b; }

        .log-root[data-theme="dark"] .log-desktop-title,
        .log-root[data-theme="dark"] .log-mobile-title,
        .log-root[data-theme="dark"] .log-mobile-title-email { color:#e8ebf1; }

        /* Google — premium cool-gray-blue material with a subtle inner highlight */
        .log-root[data-theme="dark"] .log-btn-google {
          background:#69748d; color:#f1f3f7; border:1px solid rgba(210,225,255,0.10);
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 10px rgba(0,0,0,0.32) !important;
        }
        .log-root[data-theme="dark"] .log-btn-google:hover:not(:disabled) {
          background:#727e98; transform:translateY(-1px);
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 22px -6px rgba(0,0,0,0.5) !important;
        }
        .log-root[data-theme="dark"] .log-btn-google:active:not(:disabled) { background:#5f697f; transform:translateY(0); }

        /* Email / SSO / Confirm — dark elevated cool surface */
        .log-root[data-theme="dark"] .log-btn-outline,
        .log-root[data-theme="dark"] .log-btn-confirm {
          background:#111720; color:#e8ebf1; border:1px solid rgba(210,225,255,0.085); box-shadow:none;
        }
        .log-root[data-theme="dark"] .log-btn-outline:hover:not(:disabled),
        .log-root[data-theme="dark"] .log-btn-confirm:hover:not(:disabled) {
          background:#171e28; border-color:rgba(210,225,255,0.13); transform:translateY(-1px);
        }
        .log-root[data-theme="dark"] .log-btn-outline:active:not(:disabled),
        .log-root[data-theme="dark"] .log-btn-confirm:active:not(:disabled) { background:#1c2430; transform:translateY(0); }

        .log-root[data-theme="dark"] .log-email-input { background:#111720; color:#e8ebf1; border:1px solid rgba(210,225,255,0.085); caret-color:#8e96ff; }
        .log-root[data-theme="dark"] .log-email-input::placeholder { color:#606a77; }
        .log-root[data-theme="dark"] .log-email-input:focus { border-color:rgba(142,150,255,0.45); box-shadow:0 0 0 3px rgba(142,150,255,0.12); }

        .log-root[data-theme="dark"] .log-hint { color:#7f8997; }
        .log-root[data-theme="dark"] .log-legal-text { color:#a8b0bc; }
        .log-root[data-theme="dark"] .log-legal-text a { color:#e8ebf1; }
        .log-root[data-theme="dark"] .log-legal-text a:hover { color:#b9c4d6; }
        .log-root[data-theme="dark"] .log-dev { color:#a8b0bc; }
        .log-root[data-theme="dark"] .log-dev:hover { color:#e8ebf1; }
        .log-root[data-theme="dark"] .log-back { color:#a8b0bc; }
        .log-root[data-theme="dark"] .log-back:hover { color:#e8ebf1; }
        .log-root[data-theme="dark"] .log-link-action { color:#a8b0bc; }
        .log-root[data-theme="dark"] .log-link-action:hover { color:#e8ebf1; }
        .log-root[data-theme="dark"] .log-sent-info { color:#a8b0bc; }
        .log-root[data-theme="dark"] .log-sent-info strong { color:#e8ebf1; }
        .log-root[data-theme="dark"] .log-support-note { color:#a8b0bc; }
        .log-root[data-theme="dark"] .log-support-note button { color:#e8ebf1; }
        .log-root[data-theme="dark"] .log-support-backdrop { background:rgba(0,0,0,.5); }
        .log-root[data-theme="dark"] .log-support-modal { background:#10141a; border-color:rgba(210,225,255,.10); box-shadow:0 24px 70px rgba(0,0,0,.5); }
        .log-root[data-theme="dark"] .log-support-head h2,
        .log-root[data-theme="dark"] .log-support-success { color:#e8ebf1; }
        .log-root[data-theme="dark"] .log-support-head p,
        .log-root[data-theme="dark"] .log-support-field span { color:#a8b0bc; }
        .log-root[data-theme="dark"] .log-support-close { border-color:rgba(210,225,255,.10); color:#a8b0bc; }
        .log-root[data-theme="dark"] .log-support-field input,
        .log-root[data-theme="dark"] .log-support-field textarea { background:#111720; color:#e8ebf1; border-color:rgba(210,225,255,.10); }

        .log-root[data-theme="dark"] .log-theme-pill { background:#111720; color:#a8b0bc; box-shadow:0 12px 30px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.05) inset; }
        .log-root[data-theme="dark"] .log-theme-pill:hover { background:#171e28; }
        .log-root[data-theme="dark"] .log-theme-pill.active { background:#1c2430; color:#e8ebf1; box-shadow:0 10px 24px rgba(0,0,0,0.26), 0 1px 0 rgba(255,255,255,0.07) inset; }
        .log-root[data-theme="dark"] .log-theme-pill:focus,
        .log-root[data-theme="dark"] .log-theme-pill:focus-visible { outline:0; box-shadow:0 12px 30px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.05) inset; }
      `}</style>

      {/* ── DESKTOP ── */}
      <div className="log-desktop">
        <div className="log-theme-desktop">{themeSwitcher}</div>
        <section className="log-desktop-shell" aria-label="Festag Anmeldung">
          <div className="log-desktop-header">
            <div className="log-logo-desktop"><AuthBrandLogo size="desktop" /></div>
            <h1 className="log-desktop-title">{emailView ? emailTitle : 'Willkommen zurück'}</h1>
          </div>
          <div className={`log-content${animating ? ' animating' : ''}`}>
            {!emailView && error && <p className="log-error">{error}</p>}
            {emailView ? currentEmailScreen : mainButtons}
          </div>
          {!emailView && legal}
        </section>
      </div>

      {/* ── MOBILE ── */}
      <div className="log-mobile" aria-label="Festag Anmeldung">
        <div className="log-theme-mobile">{themeSwitcher}</div>
        <div className="log-mobile-shell">
          <div className="log-mobile-logo-title">
            <div className="log-logo-mobile"><AuthBrandLogo size="mobile" /></div>
            <div className="log-mobile-inner">
              {emailView
                ? <h1 className="log-mobile-title-email">{emailTitleMobile}</h1>
                : <h1 className="log-mobile-title">Willkommen zurück</h1>}
              <div className={`log-content${animating ? ' animating' : ''}`}>
                {!emailView && error && <p className="log-error">{error}</p>}
                {emailView ? currentEmailScreen : mainButtons}
              </div>
              {!emailView && legal}
            </div>
          </div>
        </div>
      </div>

      <div className="log-ssl-badge" aria-label="SSL verschlüsselt">
        <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 0.5C3.84315 0.5 2.5 1.84315 2.5 3.5V5H1.5C0.947715 5 0.5 5.44772 0.5 6V11.5C0.5 12.0523 0.947715 12.5 1.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6C10.5 5.44772 10.0523 5 9.5 5H8.5V3.5C8.5 1.84315 7.15685 0.5 5.5 0.5ZM3.5 5V3.5C3.5 2.39543 4.39543 1.5 5.5 1.5C6.60457 1.5 7.5 2.39543 7.5 3.5V5H3.5Z" fill="currentColor"/>
        </svg>
        <span>SSL · End-to-End verschlüsselt</span>
      </div>
      <p className="log-region-note">Aktuell nur in der DACH-Region verfügbar</p>

      {supportOpen && (
        <div className="log-support-backdrop" role="dialog" aria-modal="true" aria-labelledby="login-support-title">
          <div className="log-support-modal">
            <div className="log-support-head">
              <div>
                <h2 id="login-support-title">Zugang wiederfinden</h2>
                <p>Schreib uns kurz, welche E-Mail oder Firma zu deinem Konto gehört. Wir melden uns direkt bei dir.</p>
              </div>
              <button className="log-support-close" type="button" onClick={() => setSupportOpen(false)} aria-label="Support schließen">×</button>
            </div>

            {supportSent ? (
              <>
                <p className="log-support-success">Danke, deine Anfrage ist angekommen. Wir prüfen den Zugang und melden uns bei dir.</p>
                <div className="log-support-actions">
                  <button className="log-btn log-btn-confirm" type="button" onClick={() => setSupportOpen(false)}>Schließen</button>
                </div>
              </>
            ) : (
              <>
                <label className="log-support-field">
                  <span>Kontakt-E-Mail</span>
                  <input value={supportEmail} onChange={event => setSupportEmail(event.target.value)} placeholder="name@firma.de" type="email" />
                </label>
                <label className="log-support-field">
                  <span>Nachricht</span>
                  <textarea value={supportMessage} onChange={event => setSupportMessage(event.target.value)} rows={4} placeholder="Ich brauche Hilfe beim Login..." />
                </label>
                <div className="log-support-actions">
                  <button className="log-btn log-btn-outline" type="button" onClick={() => setSupportOpen(false)}>Abbrechen</button>
                  <button className="log-btn log-btn-confirm" type="button" onClick={sendSupportRequest} disabled={supportSending}>
                    {supportSending ? 'Wird gesendet…' : 'Anfrage senden'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
