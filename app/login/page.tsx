'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Method = 'google' | 'email' | 'sso' | 'passkey'
type Theme = 'light' | 'dark'
const METHOD_KEY = 'festag_last_method'

type EmailStep = 'main' | 'email' | 'emailSent' | 'codeEntry'

function mapAuthError(msg: string): string {
  if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('Email rate'))
    return 'Zu viele Versuche. Bitte warte einen Moment.'
  if (msg.includes('invalid') || msg.includes('Invalid'))
    return 'Ungültiger Code oder E-Mail-Adresse.'
  if (msg.includes('expired'))
    return 'Code ist abgelaufen. Bitte fordere einen neuen an.'
  return 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
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
  const [theme, setTheme] = useState<Theme>('dark')
  const [lastMethod, setLastMethod] = useState<Method | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const emailView = emailStep !== 'main'

  function navigateWithFade(href: string) {
    setPageExiting(true)
    setTimeout(() => router.push(href), 240)
  }

  useEffect(() => {
    const stored = localStorage.getItem(METHOD_KEY) as Method | null
    setLastMethod(stored)
  }, [])

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

  function saveMethod(method: Method) {
    localStorage.setItem(METHOD_KEY, method)
    setLastMethod(method)
  }

  function goTo(step: EmailStep) {
    setError(''); setAnimating(true)
    setTimeout(() => { setEmailStep(step); setAnimating(false) }, 180)
  }

  function switchToEmail() { goTo('email') }
  function switchBack() {
    if (emailStep === 'codeEntry') { goTo('emailSent'); return }
    if (emailStep === 'emailSent') { setCode(''); goTo('email'); return }
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
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    })
    if (oauthError) { setError(mapAuthError(oauthError.message)); setOauthLoading(false) }
  }

  async function sendMagicLink(): Promise<boolean> {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
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
    if (ok) { saveMethod('email'); goTo('emailSent') }
  }

  async function handleResend() {
    setError(''); setResending(true)
    await sendMagicLink()
    setResending(false)
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
    window.location.href = '/dashboard'
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
          <span>Mit Google verbinden</span>
        </button>
        {lastMethod === 'google' && <p className="log-hint">Du hast dich zuletzt damit angemeldet</p>}
      </div>
      <div className="log-btn-group">
        <button className="log-btn log-btn-outline" type="button" onClick={switchToEmail}>E-Mail verwenden</button>
        {lastMethod === 'email' && <p className="log-hint">Du hast dich zuletzt damit angemeldet</p>}
      </div>
      <div className="log-btn-group">
        <button className="log-btn log-btn-outline" type="button" onClick={() => setError('SAM SSO ist noch nicht verfügbar.')}>SAM SSO verwenden</button>
        {lastMethod === 'sso' && <p className="log-hint">Du hast dich zuletzt damit angemeldet</p>}
      </div>
      <div className="log-btn-group">
        <button className="log-btn log-btn-outline" type="button" onClick={() => setError('Passkey-Anmeldung ist noch nicht verfügbar.')}>Passkey verwenden</button>
        {lastMethod === 'passkey' && <p className="log-hint">Du hast dich zuletzt damit angemeldet</p>}
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
        <span>{loading ? 'Link wird gesendet…' : 'E-Mail verwenden'}</span>
      </button>
      <button className="log-back" type="button" onClick={switchBack}>Zurück</button>
    </div>
  )

  const emailSentScreen = (
    <div className="log-email-form">
      {error && <p className="log-error">{error}</p>}
      <p className="log-sent-info">
        Wir haben einen sicheren<br />Anmeldelink geschickt an<br />
        <strong>{email}</strong>
      </p>
      <button className="log-btn log-btn-outline" type="button" onClick={() => goTo('codeEntry')}>Code manuell eintippen</button>
      <button className="log-link-action" type="button" onClick={handleResend} disabled={resending}>
        {resending ? 'Wird gesendet…' : 'Link erneut senden'}
      </button>
      <button className="log-back" type="button" onClick={switchBack}>Zurück</button>
    </div>
  )

  const codeEntryScreen = (
    <div className="log-email-form">
      {error && <p className="log-error">{error}</p>}
      <p className="log-sent-info">
        Wir haben einen sicheren<br />Anmeldelink geschickt an<br />
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
        placeholder="Code eingeben"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\s/g, ''))}
        onKeyDown={e => { if (e.key === 'Enter') handleVerifyCode() }}
      />
      <button className="log-btn log-btn-outline" type="button" onClick={handleVerifyCode} disabled={loading}>
        <span>{loading ? 'Wird geprüft…' : 'Mit Code fortfahren'}</span>
      </button>
      <button className="log-link-action" type="button" onClick={handleResend} disabled={resending}>
        {resending ? 'Wird gesendet…' : 'Link erneut senden'}
      </button>
      <button className="log-back" type="button" onClick={switchBack}>Zurück</button>
    </div>
  )

  const legal = (
    <div className="log-legal">
      <p className="log-legal-text">
        Kein Konto?{' '}
        <a href="/register" onClick={e => { e.preventDefault(); navigateWithFade('/register') }}>Hier registrieren</a>
        {' '}oder{' '}
        <a href="/legal/mehr" onClick={e => { e.preventDefault(); navigateWithFade('/legal/mehr') }}>mehr dazu</a>
      </p>
      <a className="log-dev" href="/dev" onClick={e => { e.preventDefault(); navigateWithFade('/dev') }}>Dev Zugang</a>
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

  return (
    <main className={`log-root${pageExiting ? ' exiting' : ''}`} data-theme={theme}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .log-root { min-height:100dvh; width:100%; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); -webkit-font-smoothing:antialiased; text-rendering:geometricPrecision; transition:opacity 0.24s ease, transform 0.24s ease; }
        .log-root.exiting { opacity:0; transform:translateY(-8px); pointer-events:none; }

        /* BUTTON ANIMATION */
        .log-btn:active:not(:disabled) { transform:scale(0.97); transition:transform 0.08s ease !important; }

        /* VIEW TRANSITION */
        .log-content { width:100%; display:flex; flex-direction:column; gap:20px; transition:opacity 0.18s ease, transform 0.18s ease; }
        .log-content.animating { opacity:0; transform:translateY(6px); }

        /* THEME SWITCHER */
        .log-theme-switcher { display:flex; gap:6px; align-items:center; }
        .log-theme-pill { display:flex; align-items:center; justify-content:center; padding:4px 6px; border-radius:6px; border:0.4px solid #c7cdd6; background:transparent; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:12px; font-weight:500; color:#5b647d; letter-spacing:0.24px; cursor:pointer; transition:background .15s, border-color .15s, color .15s; }
        .log-theme-pill.active { background:#f1f3f5; border-color:#fcfcfc; color:#2e2f33; }
        .log-theme-desktop { position:absolute; right:28px; top:24px; z-index:20; }
        .log-theme-mobile  { position:absolute; right:20px; top:48px; z-index:20; }

        /* DESKTOP */
        .log-desktop { display:flex; min-height:100dvh; background:#fcfcfd; align-items:center; justify-content:center; position:relative; transition:background .3s; }
        .log-desktop-shell { width:271px; display:flex; flex-direction:column; gap:32px; align-items:center; }
        .log-desktop-header { width:100%; display:flex; flex-direction:column; gap:24px; align-items:center; }
        .log-logo-desktop { font-family:'Qurova DEMO',serif; font-size:24px; font-weight:500; color:#202532; text-align:center; width:100%; line-height:normal; transition:color .3s; }
        .log-desktop-title { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:21px; font-weight:500; color:#202532; line-height:normal; text-align:center; letter-spacing:0.21px; width:100%; transition:color .3s; }

        /* MOBILE */
        .log-mobile { display:none; min-height:100dvh; background:#f5f7fa; position:relative; overflow:hidden; transition:background .3s; }
        .log-mobile-card { position:absolute; left:0; right:0; bottom:0; top:24px; background:#fcfcfd; border-radius:36px 36px 0 0; box-shadow:0px 2px 8px 0px rgba(15,23,42,0.02),0px 12px 32px 0px rgba(15,23,42,0.03),0px 1px 2px 0px rgba(15,23,42,0.03); transition:background .3s; }
        .log-mobile-shell { position:absolute; left:50%; transform:translateX(-50%); top:175px; width:271px; display:flex; flex-direction:column; gap:28px; align-items:center; }
        .log-mobile-logo-title { width:100%; display:flex; flex-direction:column; gap:9px; align-items:center; }
        .log-logo-mobile { font-family:'Qurova DEMO',serif; font-size:20px; font-weight:500; color:#000; text-align:center; line-height:47px; height:35px; width:100%; transition:color .3s; }
        .log-mobile-inner { width:100%; display:flex; flex-direction:column; gap:32px; align-items:center; }
        .log-mobile-title { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:28px; font-weight:500; color:#202532; white-space:nowrap; line-height:47px; text-align:center; letter-spacing:0.28px; height:35px; transition:color .3s; }
        .log-mobile-title-email { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:20px; font-weight:500; color:#2e2f33; line-height:26px; text-align:center; letter-spacing:0.2px; white-space:pre-line; transition:color .3s; }

        /* SHARED BUTTONS */
        .log-btn-stack { width:271px; display:flex; flex-direction:column; gap:20px; }
        .log-btn-group { display:flex; flex-direction:column; gap:6px; }
        .log-hint { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:12px; font-weight:400 !important; color:#7b8294; text-align:center; letter-spacing:0.24px; }
        .log-btn { width:100%; height:47px; border-radius:32px; border:none; display:flex; align-items:center; justify-content:center; gap:8px; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:14px; font-weight:500; letter-spacing:0.14px; cursor:pointer; padding:12px 45px; white-space:nowrap; overflow:hidden; transition:background .15s, opacity .15s, border-color .15s, color .15s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1); transform-origin:center; }
        .log-btn:disabled { opacity:.5; cursor:not-allowed; }
        .log-btn-google { background:#5b647d; color:#fff; box-shadow:0px 8px 24px 0px rgba(200,169,91,0.14); }
        .log-btn-google:hover:not(:disabled) { background:#505870; }
        .log-btn-outline { background:#fff; color:#202532; border:0.7px solid #e7ebf0; box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03); }
        .log-btn-outline:hover:not(:disabled) { background:#F7F8FB; border:1px solid #DCE1EA; }
        .log-google-icon { width:18px; height:18px; display:block; flex-shrink:0; color:#fff; }

        /* EMAIL FORM */
        .log-email-form { width:271px; display:flex; flex-direction:column; gap:16px; }
        .log-email-input { width:100%; height:47px; border-radius:8px; border:1px solid #5b647d; background:#fff; color:#202532; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:14px; font-weight:400 !important; letter-spacing:0.01em; padding:0 16px; outline:none; caret-color:#5b647d; box-shadow:0px 1px 2px 0px rgba(15,23,42,0.03); transition:border-color .15s, box-shadow .15s, background .3s, color .3s; }
        .log-email-input::placeholder { color:#bcbfc2; }
        .log-email-input:focus { border-color:#5b647d; box-shadow:0 0 0 3px rgba(91,100,125,0.12); }
        .log-back { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; color:#7b8294; background:none; border:none; cursor:pointer; text-align:center; letter-spacing:0.26px; line-height:20px; transition:color .15s; padding:4px; }
        .log-back:hover { color:#202532; }
        .log-link-action { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; color:#7b8294; background:none; border:none; cursor:pointer; text-align:center; letter-spacing:0.26px; line-height:20px; transition:color .15s; padding:4px; }
        .log-link-action:hover { color:#202532; }
        .log-link-action:disabled { opacity:.5; cursor:not-allowed; }
        .log-sent-info { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:14px; font-weight:400 !important; line-height:20px; letter-spacing:0.14px; text-align:center; color:#7b8294; margin:8px 0 16px; }
        .log-sent-info strong { color:#202532; font-weight:500; }
        .log-code-input { text-align:center; letter-spacing:0.4em; font-size:15px; }

        /* LEGAL */
        .log-legal { width:271px; display:flex; flex-direction:column; gap:16px; text-align:center; }
        .log-legal-text { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; line-height:20px; letter-spacing:0.02em; color:#7b8294; }
        .log-legal-text span, .log-legal-text a { font-weight:400 !important; }
        .log-legal-text a { color:#202532; text-decoration:underline; transition:color .3s; }
        .log-legal-text a:hover { opacity:.75; }
        .log-dev { font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:13px; font-weight:400 !important; line-height:20px; letter-spacing:0.02em; color:#7b8294; text-decoration:none; text-align:center; display:block; transition:color .3s; }
        .log-dev:hover { color:#202532; }

        .log-ssl-badge { position:fixed; left:20px; bottom:18px; display:flex; align-items:center; gap:6px; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); font-size:11px; font-weight:400 !important; letter-spacing:0.22px; color:#98A2B3; user-select:none; z-index:30; transition:color .3s; }
        .log-ssl-badge svg { width:11px; height:13px; flex-shrink:0; }
        .log-root[data-theme="dark"] .log-ssl-badge { color:rgba(243,245,247,0.55); }

        /* ERROR */
        .log-error { width:271px; background:rgba(239,68,68,.08); color:#d53939; border-radius:10px; padding:10px 12px; font-size:12.5px; font-weight:500; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); text-align:left; }
        .log-loader { width:16px; height:16px; border-radius:999px; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; animation:logSpin .75s linear infinite; flex-shrink:0; }
        @keyframes logSpin { to { transform:rotate(360deg); } }

        @media (max-width: 640px) { .log-desktop { display:none; } .log-mobile { display:block; } }

        /* ═══ DARK MODE ══════════════════════════════════════════════ */
        .log-root[data-theme="dark"] .log-desktop { background:#0F141B; }
        .log-root[data-theme="dark"] .log-mobile  { background:#0F141B; }
        .log-root[data-theme="dark"] .log-mobile-card { background:#141B25; box-shadow:0px 2px 8px 0px rgba(0,0,0,0.3),0px 12px 32px 0px rgba(0,0,0,0.2); }

        .log-root[data-theme="dark"] .log-logo-desktop,
        .log-root[data-theme="dark"] .log-logo-mobile { color:#F3F5F7; }
        .log-root[data-theme="dark"] .log-desktop-title,
        .log-root[data-theme="dark"] .log-mobile-title,
        .log-root[data-theme="dark"] .log-mobile-title-email { color:#F3F5F7; }

        .log-root[data-theme="dark"] .log-btn-outline { background:rgba(243,245,247,0.06); color:#F3F5F7; border:0.7px solid rgba(243,245,247,0.12); box-shadow:none; }
        .log-root[data-theme="dark"] .log-btn-outline:hover:not(:disabled) { background:rgba(243,245,247,0.1); border:1px solid rgba(243,245,247,0.2); }

        .log-root[data-theme="dark"] .log-email-input { background:rgba(243,245,247,0.06); color:#F3F5F7; border:1px solid rgba(102,112,143,0.15); caret-color:#66708F; }
        .log-root[data-theme="dark"] .log-email-input::placeholder { color:rgba(102,112,143,0.6); }
        .log-root[data-theme="dark"] .log-email-input:focus { border-color:#66708F; box-shadow:0 0 0 3px rgba(102,112,143,0.15); }

        .log-root[data-theme="dark"] .log-hint { color:#98A2B3; }
        .log-root[data-theme="dark"] .log-legal-text { color:#98A2B3; }
        .log-root[data-theme="dark"] .log-legal-text a { color:#F3F5F7; }
        .log-root[data-theme="dark"] .log-dev { color:#98A2B3; }
        .log-root[data-theme="dark"] .log-dev:hover { color:#F3F5F7; }
        .log-root[data-theme="dark"] .log-back { color:#98A2B3; }
        .log-root[data-theme="dark"] .log-back:hover { color:#F3F5F7; }
        .log-root[data-theme="dark"] .log-link-action { color:#98A2B3; }
        .log-root[data-theme="dark"] .log-link-action:hover { color:#F3F5F7; }
        .log-root[data-theme="dark"] .log-sent-info { color:#98A2B3; }
        .log-root[data-theme="dark"] .log-sent-info strong { color:#F3F5F7; }

        .log-root[data-theme="dark"] .log-theme-pill { border-color:rgba(243,245,247,0.18); color:rgba(243,245,247,0.45); }
        .log-root[data-theme="dark"] .log-theme-pill.active { background:#F3F5F7; border-color:#F3F5F7; color:#2e2f33; }
      `}</style>

      {/* ── DESKTOP ── */}
      <div className="log-desktop">
        <div className="log-theme-desktop">{themeSwitcher}</div>
        <section className="log-desktop-shell" aria-label="Festag Anmeldung">
          <div className="log-desktop-header">
            <p className="log-logo-desktop">festag</p>
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
        <div className="log-mobile-card" />
        <div className="log-theme-mobile">{themeSwitcher}</div>
        <div className="log-mobile-shell">
          <div className="log-mobile-logo-title">
            <p className="log-logo-mobile">festag</p>
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
          {!emailView && <a className="log-dev" href="/dev" onClick={e => { e.preventDefault(); navigateWithFade('/dev') }}>Dev Zugang</a>}
        </div>
      </div>

      <div className="log-ssl-badge" aria-label="SSL verschlüsselt">
        <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 0.5C3.84315 0.5 2.5 1.84315 2.5 3.5V5H1.5C0.947715 5 0.5 5.44772 0.5 6V11.5C0.5 12.0523 0.947715 12.5 1.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6C10.5 5.44772 10.0523 5 9.5 5H8.5V3.5C8.5 1.84315 7.15685 0.5 5.5 0.5ZM3.5 5V3.5C3.5 2.39543 4.39543 1.5 5.5 1.5C6.60457 1.5 7.5 2.39543 7.5 3.5V5H3.5Z" fill="currentColor"/>
        </svg>
        <span>SSL · End-to-End verschlüsselt</span>
      </div>
    </main>
  )
}
