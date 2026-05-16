'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { rememberFestagAccount } from '@/lib/auth-device-memory'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'

const googleLogoDesktop = "/google-symbol.svg"
const googleLogoMobile  = "/google-symbol.svg"

type EmailStep = 'none' | 'email' | 'emailSent' | 'codeEntry'
type Theme = 'light' | 'dark'
const THEME_KEY = 'festag_theme'

function mapAuthError(msg: string): string {
  if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('Email rate'))
    return 'Zu viele Versuche. Bitte warte einen Moment.'
  if (msg.includes('sending') || msg.includes('email') || msg.includes('unexpected'))
    return 'E-Mail-Versand vorübergehend nicht möglich. Versuche es gleich erneut oder kontaktiere uns.'
  if (msg.includes('expired'))
    return 'Code ist abgelaufen. Bitte fordere einen neuen an.'
  if (msg.includes('invalid') || msg.includes('Invalid'))
    return 'Ungültiger Code oder E-Mail-Adresse.'
  return 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
}

export default function RegisterPage() {
  const supabase = createClient()
  const router = useRouter()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailStep, setEmailStep] = useState<EmailStep>('none')
  const [animating, setAnimating] = useState(false)
  const [pageExiting, setPageExiting] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState('')
  const [theme, setThemeState] = useState<Theme>('dark')
  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') setThemeState(stored as Theme)
    else if (stored === 'read') setThemeState('light') // reading mode → light auth page
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    try {
      localStorage.setItem(THEME_KEY, t)
      document.documentElement.setAttribute('data-theme', t)
      document.documentElement.style.backgroundColor = t === 'dark' ? '#0A0E14' : '#fcfcfd'
      document.documentElement.style.colorScheme = t
    } catch {}
  }

  function navigateWithFade(href: string) {
    router.prefetch(href)
    setPageExiting(true)
    setTimeout(() => router.push(href), 160)
  }

  useEffect(() => {
    if (emailStep !== 'email') return
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => emailRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [emailStep])

  useEffect(() => {
    if (emailStep !== 'codeEntry') return
    const tries = [0, 50, 150, 250, 400]
    const timers = tries.map(ms => setTimeout(() => codeRef.current?.focus(), ms))
    return () => timers.forEach(clearTimeout)
  }, [emailStep])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  function goTo(step: EmailStep) {
    setError('')
    setAnimating(true)
    setTimeout(() => { setEmailStep(step); setAnimating(false) }, 180)
  }

  function goBack() {
    if (emailStep === 'codeEntry' || emailStep === 'emailSent') { setCode(''); goTo('email'); return }
    setEmail(''); setCode('')
    goTo('none')
  }

  async function handleGoogle() {
    setError('')
    setOauthLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    })
    if (oauthError) { setError(mapAuthError(oauthError.message)); setOauthLoading(false) }
  }

  async function sendMagicLink(): Promise<boolean> {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        shouldCreateUser: true,
      },
    })
    if (otpError) { setError(mapAuthError(otpError.message)); return false }
    return true
  }

  async function handleEmailNext() {
    setError('')
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Bitte gültige E-Mail-Adresse eingeben.'); return
    }
    setLoading(true)
    const ok = await sendMagicLink()
    setLoading(false)
    if (ok) { setResendCooldown(60); goTo('codeEntry') }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return
    setError('')
    setResending(true)
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
      email: email.trim(),
      token: trimmed,
      type: 'email',
    })
    setLoading(false)
    if (verifyError) { setError(mapAuthError(verifyError.message)); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase
        .from('onboarding_state')
        .upsert({ user_id: session.user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }
    const target = session ? await resolvePostAuthTarget(supabase, session.user.id) : '/onboarding'
    try {
      if (session) {
        rememberFestagAccount({
          userId: session.user.id,
          email: email.trim(),
          method: 'email',
          onboardingCompleted: target === '/dashboard',
        })
      } else {
        localStorage.setItem('festag_last_email', email.trim())
        localStorage.setItem('festag_last_method', 'email')
      }
    } catch {}
    window.location.href = target
  }

  const desktopTitle =
    emailStep === 'email'      ? 'Wie lautet Ihre E-Mail?' :
    emailStep === 'emailSent'  ? 'Prüfen Sie Ihre E-Mails' :
    emailStep === 'codeEntry'  ? 'Prüfen Sie Ihre E-Mails' :
    'Willkommen bei festag'
  const mobileTitle =
    emailStep === 'email'      ? 'Wie lautet Ihre\nE-Mail-Adresse?' :
    emailStep === 'emailSent'  ? 'Prüfen Sie Ihre\nE-Mails' :
    emailStep === 'codeEntry'  ? 'Prüfen Sie Ihre\nE-Mails' :
    'Willkommen'

  // ── render helpers (not React components — avoids remount on re-render) ──

  const themeSwitcher = (
    <div className="reg-theme-switcher">
      <button className={`reg-theme-pill${theme === 'light' ? ' active' : ''}`} type="button" onClick={() => setTheme('light')} aria-label="Heller Modus">Aa</button>
      <button className={`reg-theme-pill${theme === 'dark' ? ' active' : ''}`} type="button" onClick={() => setTheme('dark')} aria-label="Dunkler Modus">Aa</button>
    </div>
  )

  const mainButtons = (
    <div className="reg-btn-stack">
      <button className="reg-btn reg-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
        {oauthLoading ? <span className="reg-loader" /> : (
          <svg className="reg-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M21.35 11.1H12.18v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44-3.83 0-7.19-3.02-7.19-7.27 0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97l1.9-1.98S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" fill="currentColor"/>
          </svg>
        )}
        <span>Mit Google verbinden</span>
      </button>
      <button className="reg-btn reg-btn-outline" type="button" onClick={() => goTo('email')}>E-Mail verwenden</button>
    </div>
  )

  const mainButtonsMobile = (
    <div className="reg-btn-stack">
      <button className="reg-btn reg-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
        {oauthLoading ? <span className="reg-loader" /> : (
          <svg className="reg-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M21.35 11.1H12.18v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44-3.83 0-7.19-3.02-7.19-7.27 0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97l1.9-1.98S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" fill="currentColor"/>
          </svg>
        )}
        <span>Mit Google verbinden</span>
      </button>
      <button className="reg-btn reg-btn-outline" type="button" onClick={() => goTo('email')}>E-Mail verwenden</button>
    </div>
  )

  const emailScreen = (
    <div className="reg-email-form">
      {error && <p className="reg-error">{error}</p>}
      <input
        ref={emailRef}
        className="reg-email-input"
        type="email"
        autoComplete="email"
        autoFocus
        placeholder="E-Mail-Adresse eingeben..."
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleEmailNext() }}
      />
      <button className="reg-btn reg-btn-outline" type="button" onClick={handleEmailNext}>E-Mail verwenden</button>
      <button className="reg-back" type="button" onClick={goBack}>Zurück</button>
    </div>
  )

  const resendDisabled = resending || resendCooldown > 0
  const resendLabel = resending
    ? 'Wird gesendet…'
    : resendCooldown > 0
      ? `Neuen Code anfordern in ${resendCooldown}s`
      : 'Neuen Code anfordern'

  const newestWarning = (
    <p className="reg-newest-hint">
      Nutze den jüngsten Code aus deiner E-Mail. Eine neue Anfrage entwertet alle vorherigen.
    </p>
  )

  const emailSentScreen = (
    <div className="reg-email-form">
      {error && <p className="reg-error">{error}</p>}
      <p className="reg-sent-info">
        Wir haben einen sicheren<br />Anmeldelink geschickt an<br />
        <strong>{email}</strong>
      </p>
      {newestWarning}
      <button className="reg-btn reg-btn-outline" type="button" onClick={() => goTo('codeEntry')}>Code manuell eintippen</button>
      <button className="reg-link-action" type="button" onClick={handleResend} disabled={resendDisabled}>
        {resendLabel}
      </button>
      <button className="reg-back" type="button" onClick={goBack}>Zurück</button>
    </div>
  )

  const codeEntryScreen = (
    <div className="reg-email-form">
      {error && <p className="reg-error">{error}</p>}
      <p className="reg-sent-info">
        Anmeldelink wurde geschickt an<br />
        <strong>{email}</strong>
      </p>
      <input
        ref={codeRef}
        className="reg-email-input reg-code-input"
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
      <button className="reg-btn reg-btn-confirm" type="button" onClick={handleVerifyCode} disabled={loading}>
        {loading ? <span className="reg-loader" /> : <span>Konto erstellen</span>}
      </button>
      <button className="reg-link-action" type="button" onClick={handleResend} disabled={resendDisabled}>
        {resendLabel}
      </button>
      <button className="reg-back" type="button" onClick={goBack}>Zurück</button>
    </div>
  )

  const legal = (
    <div className="reg-legal">
      <p className="reg-legal-text">
        <span className="reg-legal-muted">Secure, AI-orchestrated software Delivery. Mit Ihrer Anmeldung bestätigen Sie unsere{' '}</span>
        <a href="/agb" onClick={e => { e.preventDefault(); navigateWithFade('/agb') }}>AGB</a>
        <span className="reg-legal-muted">{' '}und{' '}</span>
        <a href="/nutzungsbedingungen" onClick={e => { e.preventDefault(); navigateWithFade('/nutzungsbedingungen') }}>Nutzungsbestimmungen</a>
        <span className="reg-legal-muted">.</span>
      </p>
      <p className="reg-login-link">
        Zugang erstellt?{' '}
        <a href="/login" onClick={e => { e.preventDefault(); navigateWithFade('/login') }}>Hier&nbsp;anmelden</a>
      </p>
      <a className="reg-dev" href="/dev" onClick={e => { e.preventDefault(); navigateWithFade('/dev/login') }}>Dev Zugang</a>
    </div>
  )

  return (
    <main className={`reg-root${pageExiting ? ' exiting' : ''}`} data-theme={theme}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .reg-root { min-height:100dvh; width:100%; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); -webkit-font-smoothing:antialiased; text-rendering:geometricPrecision; transition: opacity 0.16s linear; }
        .reg-root.exiting { opacity:0; pointer-events:none; }
        @keyframes regPageEnter { from { opacity:0; } to { opacity:1; } }
        .reg-root:not(.exiting) { animation: regPageEnter 0.18s linear both; }
        .reg-btn:active:not(:disabled) { transform:scale(0.97); transition:transform 0.08s ease !important; }
        .reg-content { width:100%; display:flex; flex-direction:column; gap:20px; transition:opacity 0.18s ease, transform 0.18s ease; }
        .reg-content.animating { opacity:0; transform:translateY(6px); }

        .reg-theme-switcher { display:flex; gap:6px; align-items:center; }
        .reg-theme-pill { display:flex; align-items:center; justify-content:center; padding:4px 6px; border-radius:6px; border:0.4px solid #c7cdd6; background:transparent; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:12px; font-weight:500; color:#5b647d; letter-spacing:0.24px; cursor:pointer; transition:background .15s, border-color .15s, color .15s; }
        .reg-theme-pill.active { background:#f1f3f5; border-color:#fcfcfc; color:#2e2f33; }
        .reg-theme-desktop { position:absolute; right:28px; top:24px; z-index:20; }
        .reg-theme-mobile  { position:absolute; right:20px; top:48px; z-index:20; }

        .reg-desktop { display:flex; min-height:100dvh; background:#fcfcfd; align-items:center; justify-content:center; position:relative; transition:background .3s; }
        .reg-desktop-shell { width:271px; display:flex; flex-direction:column; gap:24px; align-items:center; min-height:auto; justify-content:center; padding-top:0; transform:translateY(14px); }
        .reg-desktop-header { width:100%; display:flex; flex-direction:column; gap:24px; align-items:center; }
        .reg-logo-desktop { font-family:'Qurova DEMO',serif; font-size:24px; font-weight:500; color:#202532; text-align:center; width:100%; line-height:normal; transition:color .3s; }
        .reg-desktop-title { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:21px; font-weight:500; color:#202532; line-height:normal; text-align:center; letter-spacing:0.21px; width:100%; transition:color .3s; }
        .reg-title-muted { color:#9B9B98; }
        .reg-dev { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; line-height:20px; letter-spacing:0.02em; color:#7b8294; text-decoration:none; text-align:center; display:block; transition:color .3s; }
        .reg-dev:hover { color:#202532; }

        .reg-mobile { display:none; min-height:100dvh; background:#edf1f6; position:relative; overflow:hidden; transition:background .3s; }
        .reg-mobile-card { position:absolute; left:12px; right:12px; bottom:10px; top:32px; background:#fff; border:1px solid rgba(99,111,132,.16); border-radius:36px; box-shadow:0px 22px 70px rgba(46,58,82,0.15),0px 4px 18px rgba(46,58,82,0.08),0px 1px 0px rgba(255,255,255,0.85) inset; transition:background .3s, border-color .3s, box-shadow .3s; }
        .reg-mobile-shell { position:absolute; left:50%; transform:translateX(-50%); top:175px; width:271px; display:flex; flex-direction:column; gap:28px; align-items:center; }
        .reg-mobile-logo-title { width:100%; display:flex; flex-direction:column; gap:9px; align-items:center; }
        .reg-logo-mobile { font-family:'Qurova DEMO',serif; font-size:20px; font-weight:500; color:#000; text-align:center; line-height:47px; height:35px; width:100%; transition:color .3s; }
        .reg-mobile-inner { width:100%; display:flex; flex-direction:column; gap:32px; align-items:center; }
        .reg-mobile-title { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:28px; font-weight:500; color:#202532; white-space:nowrap; line-height:47px; text-align:center; letter-spacing:0.28px; height:35px; transition:color .3s; }
        .reg-mobile-title-email { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:20px; font-weight:500; color:#2e2f33; line-height:26px; text-align:center; letter-spacing:0.2px; white-space:pre-line; transition:color .3s; }

        .reg-btn-stack { width:271px; display:flex; flex-direction:column; gap:20px; }
        .reg-btn { width:100%; height:47px; border-radius:32px; border:none; display:flex; align-items:center; justify-content:center; gap:8px; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:14px; font-weight:500; letter-spacing:0.14px; cursor:pointer; padding:12px 45px; white-space:nowrap; overflow:hidden; transition:background .15s, opacity .15s, border-color .15s, color .15s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1); transform-origin:center; }
        .reg-btn:disabled { opacity:.5; cursor:not-allowed; }
        .reg-btn-google { background:#5b647d; color:#fff; box-shadow:0px 8px 24px 0px rgba(200,169,91,0.14); }
        .reg-btn-google:hover:not(:disabled) { background:#505870; }
        .reg-btn-outline { background:#fff; color:#202532; border:0.7px solid #e7ebf0; box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03); }
        .reg-btn-outline:hover:not(:disabled) { background:#F7F8FB; border:1px solid #DCE1EA; }
        .reg-btn-confirm { background:#202532; color:#FFFFFF; border:none; box-shadow:0px 8px 24px 0px rgba(32,37,50,0.18); }
        .reg-btn-confirm:hover:not(:disabled) { background:#0E1218; }
        .reg-google-icon { width:18px; height:18px; display:block; flex-shrink:0; color:#fff; }

        .reg-email-form { width:271px; display:flex; flex-direction:column; gap:16px; }
        .reg-email-input {
          width:100%; height:47px; border-radius:8px; border:1px solid #5b647d;
          background:#fff; color:#202532;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          font-size:14px; font-weight:400 !important;
          letter-spacing:0.01em;
          padding:0 16px; outline:none; caret-color:#5b647d;
          box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03);
          transition:border-color .15s, box-shadow .15s, background .3s, color .3s;
        }
        .reg-email-input::placeholder { color:#bcbfc2; }
        .reg-email-input:focus { border-color:#5b647d; box-shadow:0 0 0 3px rgba(91,100,125,0.12); }
        .reg-back { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; color:#7b8294; background:none; border:none; cursor:pointer; text-align:center; letter-spacing:0.26px; line-height:20px; transition:color .15s; padding:4px; }
        .reg-back:hover { color:#202532; }
        .reg-link-action { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; color:#7b8294; background:none; border:none; cursor:pointer; text-align:center; letter-spacing:0.26px; line-height:20px; transition:color .15s; padding:4px; }
        .reg-link-action:hover { color:#202532; }
        .reg-link-action:disabled { opacity:.5; cursor:not-allowed; }
        .reg-sent-info { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:14px; font-weight:400 !important; line-height:20px; letter-spacing:0.14px; text-align:center; color:#7b8294; margin:8px 0 16px; }
        .reg-sent-info strong { color:#202532; font-weight:500; }
        .reg-code-input { text-align:center; letter-spacing:0.4em; font-size:15px; }
        .reg-newest-hint { margin:-4px 0 -2px; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:12px; line-height:1.5; font-weight:400 !important; color:#7b8294; text-align:center; letter-spacing:0.01em; padding:8px 12px; background:rgba(91,100,125,0.05); border:1px solid rgba(91,100,125,0.10); border-radius:10px; }
        .reg-root[data-theme="dark"] .reg-newest-hint { color:#98A2B3; background:rgba(243,245,247,0.04); border-color:rgba(243,245,247,0.08); }
        .reg-loader-dark { width:16px; height:16px; border-radius:999px; border:2px solid rgba(32,37,50,0.25); border-top-color:#202532; animation:regSpin .75s linear infinite; flex-shrink:0; }

        .reg-legal { width:271px; display:flex; flex-direction:column; gap:16px; text-align:center; }
        .reg-legal-text { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; line-height:20px; letter-spacing:0.02em; color:#98A2B3; }
        .reg-legal-text span, .reg-legal-text a { font-weight:400 !important; }
        .reg-legal-muted { color:#98A2B3; font-weight:400 !important; }
        .reg-legal-text a { color:#202532; text-decoration:none; transition:color .3s; }
        .reg-legal-text a:hover { text-decoration:underline; }
        .reg-login-link { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; line-height:20px; letter-spacing:0.02em; color:#7b8294; }
        .reg-login-link a { color:#202532; text-decoration:underline; font-weight:400 !important; transition:color .3s; }

        .reg-ssl-badge { position:fixed; left:20px; bottom:18px; display:flex; align-items:center; gap:6px; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:11px; font-weight:400 !important; letter-spacing:0.22px; color:#98A2B3; user-select:none; z-index:30; transition:color .3s; }
        .reg-ssl-badge svg { width:11px; height:13px; flex-shrink:0; }
        .reg-region-note { position:fixed; left:50%; bottom:18px; transform:translateX(-50%); width:min(520px, calc(100vw - 40px)); text-align:center; color:#98A2B3; font-size:11.5px; line-height:1.45; letter-spacing:.01em; font-weight:400 !important; z-index:30; }

        .reg-error { width:271px; background:rgba(239,68,68,.05); color:#c0362e; border-radius:10px; padding:9px 12px; font-size:12.5px; font-weight:500 !important; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); text-align:left; letter-spacing:0.01em; line-height:1.45; }
        .reg-success { width:271px; background:rgba(34,197,94,.08); color:#16a34a; border-radius:10px; padding:10px 12px; font-size:12.5px; font-weight:500; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); }
        .reg-loader { width:16px; height:16px; border-radius:999px; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; animation:regSpin .75s linear infinite; flex-shrink:0; }
        @keyframes regSpin { to { transform:rotate(360deg); } }
        @media (max-width: 640px) { .reg-desktop { display:none; } .reg-mobile { display:block; } }

        /* ═══ DARK MODE ═══ */
        .reg-root[data-theme="dark"] .reg-desktop { background:#0A0E14; }
        .reg-root[data-theme="dark"] .reg-mobile  { background:#06090E; }
        .reg-root[data-theme="dark"] .reg-mobile-card { background:#101722; border-color:rgba(255,255,255,0.09); box-shadow:0px 26px 80px rgba(0,0,0,0.55),0px 6px 22px rgba(0,0,0,0.34),0px 1px 0px rgba(255,255,255,0.04) inset; }
        .reg-root[data-theme="dark"] .reg-logo-desktop,
        .reg-root[data-theme="dark"] .reg-logo-mobile,
        .reg-root[data-theme="dark"] .reg-desktop-title,
        .reg-root[data-theme="dark"] .reg-mobile-title,
        .reg-root[data-theme="dark"] .reg-mobile-title-email { color:#E8E8E5; }
        .reg-root[data-theme="dark"] .reg-btn-google { box-shadow:none !important; }
        .reg-root[data-theme="dark"] .reg-btn-outline { background:rgba(243,245,247,0.035); color:#E8E8E5; border:0.7px solid rgba(243,245,247,0.08); box-shadow:none; }
        .reg-root[data-theme="dark"] .reg-btn-outline:hover:not(:disabled) { background:rgba(243,245,247,0.06); border:1px solid rgba(243,245,247,0.14); }
        .reg-root[data-theme="dark"] .reg-btn-confirm { background:#E8E8E5; color:#0A0E14; box-shadow:0px 8px 24px 0px rgba(0,0,0,0.35); }
        .reg-root[data-theme="dark"] .reg-btn-confirm:hover:not(:disabled) { background:#F3F5F7; }
        .reg-root[data-theme="dark"] .reg-email-input { background:rgba(243,245,247,0.035); color:#E8E8E5; border:1px solid rgba(102,112,143,0.10); caret-color:#66708F; }
        .reg-root[data-theme="dark"] .reg-email-input::placeholder { color:rgba(102,112,143,0.5); }
        .reg-root[data-theme="dark"] .reg-email-input:focus { border-color:rgba(102,112,143,0.5); box-shadow:0 0 0 3px rgba(102,112,143,0.10); }
        .reg-root[data-theme="dark"] .reg-legal-text, .reg-root[data-theme="dark"] .reg-legal-muted { color:#7B8294; }
        .reg-root[data-theme="dark"] .reg-legal-text a, .reg-root[data-theme="dark"] .reg-login-link a { color:#E8E8E5; }
        .reg-root[data-theme="dark"] .reg-login-link { color:#7B8294; }
        .reg-root[data-theme="dark"] .reg-back { color:#7B8294; }
        .reg-root[data-theme="dark"] .reg-back:hover { color:#E8E8E5; }
        .reg-root[data-theme="dark"] .reg-link-action { color:#98A2B3; }
        .reg-root[data-theme="dark"] .reg-link-action:hover { color:#F3F5F7; }
        .reg-root[data-theme="dark"] .reg-sent-info { color:#98A2B3; }
        .reg-root[data-theme="dark"] .reg-sent-info strong { color:#F3F5F7; }
        .reg-root[data-theme="dark"] .reg-dev { color:#98A2B3; }
        .reg-root[data-theme="dark"] .reg-dev:hover { color:#F3F5F7; }
        .reg-root[data-theme="dark"] .reg-theme-pill { border-color:rgba(243,245,247,0.18); color:rgba(243,245,247,0.45); background:transparent; }
        .reg-root[data-theme="dark"] .reg-theme-pill.active { background:#F3F5F7; border-color:#F3F5F7; color:#2e2f33; }
        .reg-root[data-theme="dark"] .reg-ssl-badge { color:rgba(243,245,247,0.55); }
        .reg-root[data-theme="dark"] .reg-title-muted { color:#7B8294; }
        .reg-root[data-theme="dark"] .reg-region-note { color:rgba(243,245,247,0.50); }
      `}</style>

      {/* ── DESKTOP ── */}
      <div className="reg-desktop">
        <div className="reg-theme-desktop">{themeSwitcher}</div>
        <section className="reg-desktop-shell" aria-label="Festag Registrierung">
          <div className="reg-desktop-header">
            <p className="reg-logo-desktop">festag</p>
            <h1 className="reg-desktop-title">{desktopTitle === 'Willkommen bei festag' ? <>Willkommen bei <span className="reg-title-muted">festag</span></> : desktopTitle}</h1>
          </div>
          <div className={`reg-content${animating ? ' animating' : ''}`}>
            {emailStep === 'none' && error && <p className="reg-error">{error}</p>}
            {emailStep === 'none' && mainButtons}
            {emailStep === 'email' && emailScreen}
            {emailStep === 'emailSent' && emailSentScreen}
            {emailStep === 'codeEntry' && codeEntryScreen}
          </div>
          {emailStep === 'none' && legal}
        </section>
      </div>

      {/* ── MOBILE ── */}
      <div className="reg-mobile" aria-label="Festag Registrierung">
        <div className="reg-mobile-card" />
        <div className="reg-theme-mobile">{themeSwitcher}</div>
        <div className="reg-mobile-shell">
          <div className="reg-mobile-logo-title">
            <p className="reg-logo-mobile">festag</p>
            <div className="reg-mobile-inner">
              {emailStep === 'none'
                ? <h1 className="reg-mobile-title">Willkommen</h1>
                : <h1 className="reg-mobile-title-email">{mobileTitle}</h1>}
              <div className={`reg-content${animating ? ' animating' : ''}`}>
                {emailStep === 'none' && error && <p className="reg-error">{error}</p>}
                {emailStep === 'none' && mainButtonsMobile}
                {emailStep === 'email' && emailScreen}
                {emailStep === 'emailSent' && emailSentScreen}
            {emailStep === 'codeEntry' && codeEntryScreen}
              </div>
              {emailStep === 'none' && legal}
            </div>
          </div>
        </div>
      </div>

      <div className="reg-ssl-badge" aria-label="SSL verschlüsselt">
        <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 0.5C3.84315 0.5 2.5 1.84315 2.5 3.5V5H1.5C0.947715 5 0.5 5.44772 0.5 6V11.5C0.5 12.0523 0.947715 12.5 1.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6C10.5 5.44772 10.0523 5 9.5 5H8.5V3.5C8.5 1.84315 7.15685 0.5 5.5 0.5ZM3.5 5V3.5C3.5 2.39543 4.39543 1.5 5.5 1.5C6.60457 1.5 7.5 2.39543 7.5 3.5V5H3.5Z" fill="currentColor"/>
        </svg>
        <span>SSL · End-to-End verschlüsselt</span>
      </div>
      <p className="reg-region-note">Aktuell konzentriert sich Festag bewusst auf die DACH-Region — Deutschland, Österreich und die Schweiz — damit Softwareprojekte nah, zuverlässig und persönlich begleitet werden.</p>
    </main>
  )
}
