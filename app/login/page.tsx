'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Method = 'google' | 'email' | 'sso' | 'passkey'
const METHOD_KEY = 'festag_last_method'
const methodLabel: Record<Method, string> = {
  google: 'Google',
  email: 'E-Mail',
  sso: 'SAM SSO',
  passkey: 'Passkey',
}

export default function LoginPage() {
  const supabase = createClient()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailView, setEmailView] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordStep, setPasswordStep] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [lastMethod, setLastMethod] = useState<Method | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(METHOD_KEY) as Method | null
    setLastMethod(stored)
  }, [])

  useEffect(() => {
    if (emailView) {
      setTimeout(() => emailRef.current?.focus(), 200)
    }
  }, [emailView])

  function saveMethod(method: Method) {
    localStorage.setItem(METHOD_KEY, method)
    setLastMethod(method)
  }

  function switchToEmail() {
    setError('')
    setAnimating(true)
    setTimeout(() => { setEmailView(true); setAnimating(false) }, 180)
  }

  function switchBack() {
    setError('')
    setAnimating(true)
    setTimeout(() => { setEmailView(false); setPasswordStep(false); setEmail(''); setPassword(''); setAnimating(false) }, 180)
  }

  function toggleTheme(t: 'light' | 'dark') {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }

  async function handleGoogle() {
    setError('')
    saveMethod('google')
    setOauthLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) { setError(oauthError.message); setOauthLoading(false) }
  }

  async function handleEmailSubmit() {
    setError('')
    if (!email.trim()) { setError('Bitte E-Mail-Adresse eingeben.'); return }
    if (!passwordStep) { setPasswordStep(true); return }
    if (!password) { setError('Bitte Passwort eingeben.'); return }
    setLoading(true)
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (loginError) { setError('E-Mail oder Passwort ist nicht korrekt.'); return }
    saveMethod('email')
    window.location.href = '/dashboard'
  }

  function ThemeSwitcher({ className }: { className?: string }) {
    return (
      <div className={`log-theme-switcher${className ? ' ' + className : ''}`}>
        <button className={`log-theme-pill${theme === 'light' ? ' active' : ''}`} type="button" onClick={() => toggleTheme('light')} aria-label="Heller Modus">Aa</button>
        <button className={`log-theme-pill${theme === 'dark' ? ' active' : ''}`} type="button" onClick={() => toggleTheme('dark')} aria-label="Dunkler Modus">Aa</button>
      </div>
    )
  }

  function Hint({ method }: { method: Method }) {
    if (lastMethod !== method) return null
    return <p className="log-hint">Du hast dich zuletzt damit angemeldet</p>
  }

  function MainButtons() {
    return (
      <div className="log-btn-stack">
        <div className="log-btn-group">
          <button className="log-btn log-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
            {oauthLoading ? <span className="log-loader" /> : <span className="log-google-icon" />}
            <span>Mit Google verbinden</span>
          </button>
          <Hint method="google" />
        </div>
        <div className="log-btn-group">
          <button className="log-btn log-btn-outline" type="button" onClick={switchToEmail}>
            E-Mail verwenden
          </button>
          <Hint method="email" />
        </div>
        <div className="log-btn-group">
          <button className="log-btn log-btn-outline" type="button" onClick={() => setError('SAM SSO ist noch nicht verfügbar.')}>
            SAM SSO verwenden
          </button>
          <Hint method="sso" />
        </div>
        <div className="log-btn-group">
          <button className="log-btn log-btn-outline" type="button" onClick={() => setError('Passkey-Anmeldung ist noch nicht verfügbar.')}>
            Passkey verwenden
          </button>
          <Hint method="passkey" />
        </div>
      </div>
    )
  }

  function EmailForm() {
    return (
      <div className="log-email-form">
        {error && <p className="log-error">{error}</p>}
        <input
          ref={emailRef}
          className="log-email-input"
          type="email"
          autoComplete="email"
          placeholder="E-Mail-Adresse eingeben..."
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleEmailSubmit() }}
        />
        {passwordStep && (
          <input
            className="log-email-input"
            type="password"
            autoComplete="current-password"
            placeholder="Passwort eingeben..."
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleEmailSubmit() }}
            autoFocus
          />
        )}
        <button className="log-btn log-btn-outline" type="button" onClick={handleEmailSubmit} disabled={loading}>
          <span>{loading ? 'Anmeldung läuft…' : 'E-Mail verwenden'}</span>
        </button>
        <button className="log-back" type="button" onClick={switchBack}>Zurück</button>
      </div>
    )
  }

  const Legal = () => (
    <div className="log-legal">
      <p className="log-legal-text">
        <span className="log-legal-muted">Kein Konto?</span>{' '}
        <a href="/register">Hier registrieren</a>{' '}
        <span className="log-legal-muted">oder</span>{' '}
        <a href="/legal/mehr">mehr dazu</a>
      </p>
      <a className="log-dev" href="/dev">Dev Zugang</a>
    </div>
  )

  const emailTitle = passwordStep ? 'Passwort eingeben' : 'Wie lautet Ihre E-Mail?'
  const emailTitleMobile = passwordStep ? 'Passwort eingeben' : 'Wie lautet Ihre\nE-Mail-Adresse?'

  return (
    <main className="log-root">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .log-root {
          min-height: 100dvh; width: 100%;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }

        /* ─── THEME SWITCHER ──────────────────────────────── */
        .log-theme-switcher { display: flex; gap: 6px; align-items: center; }
        .log-theme-pill {
          display: flex; align-items: center; justify-content: center;
          padding: 4px 6px; border-radius: 6px;
          border: 0.4px solid #c7cdd6; background: transparent;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 12px; font-weight: 500; color: #5b647d;
          letter-spacing: 0.24px; cursor: pointer;
          transition: background .15s, border-color .15s, color .15s;
        }
        .log-theme-pill.active { background: #f1f3f5; border-color: #fcfcfc; color: #2e2f33; }

        /* ─── VIEW TRANSITION ─────────────────────────────── */
        .log-content {
          width: 100%; display: flex; flex-direction: column; gap: 20px;
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .log-content.animating { opacity: 0; transform: translateY(6px); }

        /* ─── BUTTON ANIMATION ────────────────────────────── */
        .log-btn:active:not(:disabled) {
          transform: scale(0.97);
          transition: transform 0.08s ease !important;
        }

        /* ─── DESKTOP ─────────────────────────────────────── */
        .log-desktop {
          display: flex; min-height: 100dvh; background: #fcfcfd;
          align-items: center; justify-content: center; position: relative;
        }
        .log-desktop-shell {
          width: 271px; display: flex; flex-direction: column;
          gap: 32px; align-items: center; transform: translateY(-3vh);
        }
        .log-desktop-header {
          width: 100%; display: flex; flex-direction: column;
          gap: 24px; align-items: center;
        }
        .log-logo-desktop {
          font-family: 'Qurova DEMO', serif; font-size: 24px; font-weight: 500;
          color: #202532; text-align: center; width: 100%; line-height: normal;
        }
        .log-desktop-title {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 21px; font-weight: 500; color: #202532;
          white-space: nowrap; line-height: normal; text-align: center;
          letter-spacing: 0.21px; width: 100%;
        }
        .log-theme-desktop { position: fixed; right: 28px; top: 24px; }

        /* ─── MOBILE ──────────────────────────────────────── */
        .log-mobile {
          display: none; min-height: 100dvh; background: #f5f7fa;
          position: relative; overflow: hidden;
        }
        .log-mobile-card {
          position: absolute; left: 0; right: 0; bottom: 0; top: 24px;
          background: #fcfcfd; border-radius: 36px 36px 0 0;
          box-shadow: 0px 2px 8px 0px rgba(15,23,42,0.02),
            0px 12px 32px 0px rgba(15,23,42,0.03),
            0px 1px 2px 0px rgba(15,23,42,0.03);
        }
        .log-mobile-shell {
          position: absolute; left: 50%; transform: translateX(-50%);
          top: 175px; width: 271px; display: flex; flex-direction: column;
          gap: 28px; align-items: center;
        }
        .log-mobile-logo-title {
          width: 100%; display: flex; flex-direction: column;
          gap: 9px; align-items: center;
        }
        .log-logo-mobile {
          font-family: 'Qurova DEMO', serif; font-size: 20px; font-weight: 500;
          color: #000; text-align: center; line-height: 47px; height: 35px; width: 100%;
        }
        .log-mobile-inner {
          width: 100%; display: flex; flex-direction: column;
          gap: 32px; align-items: center;
        }
        .log-mobile-title {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 28px; font-weight: 500; color: #202532;
          white-space: nowrap; line-height: 47px; text-align: center;
          letter-spacing: 0.28px; height: 35px;
        }
        .log-mobile-title-email {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 20px; font-weight: 500; color: #2e2f33;
          line-height: 26px; text-align: center; letter-spacing: 0.2px;
          white-space: pre-line;
        }
        .log-theme-mobile { position: absolute; right: 20px; top: 64px; }

        /* ─── SHARED BUTTONS ──────────────────────────────── */
        .log-btn-stack { width: 271px; display: flex; flex-direction: column; gap: 20px; }
        .log-btn-group { display: flex; flex-direction: column; gap: 6px; }
        .log-hint {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 12px; font-weight: 400 !important; color: #7b8294;
          text-align: center; letter-spacing: 0.24px;
        }
        .log-btn {
          width: 100%; height: 47px; border-radius: 32px; border: none;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 14px; font-weight: 500; letter-spacing: 0.14px; cursor: pointer;
          padding: 12px 45px; white-space: nowrap; overflow: hidden;
          transition: background .15s, opacity .15s, border-color .15s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: center;
        }
        .log-btn:disabled { opacity: .5; cursor: not-allowed; }
        .log-btn-google { background: #5b647d; color: #fff; box-shadow: 0px 8px 24px 0px rgba(200,169,91,0.14); }
        .log-btn-google:hover:not(:disabled) { background: #505870; }
        .log-btn-outline {
          background: #fff; color: #202532;
          border: 0.7px solid #e7ebf0;
          box-shadow: 0px 1px 2px 0px rgba(15,23,42,0.03);
        }
        .log-btn-outline:hover:not(:disabled) { background: #F7F8FB; border: 1px solid #DCE1EA; }
        .log-google-icon {
          width: 22px; height: 22px; display: block; flex-shrink: 0;
          background: currentColor;
          -webkit-mask: url('/google-symbol.svg') center / contain no-repeat;
          mask: url('/google-symbol.svg') center / contain no-repeat;
        }

        /* ─── EMAIL FORM ──────────────────────────────────── */
        .log-email-form { width: 271px; display: flex; flex-direction: column; gap: 16px; }
        .log-email-input {
          width: 100%; height: 47px; border-radius: 8px;
          border: 1px solid #5b647d;
          background: #fff; color: #202532;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 14px; font-weight: 400 !important;
          padding: 0 16px; outline: none;
          caret-color: #5b647d;
          box-shadow: 0px 1px 2px 0px rgba(15,23,42,0.03);
          transition: border-color .15s, box-shadow .15s;
        }
        .log-email-input::placeholder { color: #bcbfc2; }
        .log-email-input:focus {
          border-color: #5b647d;
          box-shadow: 0 0 0 3px rgba(91,100,125,0.12);
        }
        .log-back {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px; font-weight: 400 !important; color: #7b8294;
          background: none; border: none; cursor: pointer;
          text-align: center; letter-spacing: 0.26px; line-height: 20px;
          transition: color .15s;
        }
        .log-back:hover { color: #202532; }

        /* ─── LEGAL / FOOTER ──────────────────────────────── */
        .log-legal { width: 271px; display: flex; flex-direction: column; gap: 16px; text-align: center; }
        .log-legal-text {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px; font-weight: 400 !important; line-height: 20px;
          letter-spacing: 0.02em; color: #7b8294;
        }
        .log-legal-muted { color: #7b8294; }
        .log-legal-text a { color: #202532; text-decoration: underline; }
        .log-legal-text a:hover { opacity: 0.75; }
        .log-dev {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px; font-weight: 400 !important; line-height: 20px;
          letter-spacing: 0.02em; color: #7b8294; text-decoration: none;
          text-align: center; display: block;
        }
        .log-dev:hover { color: #202532; }

        /* ─── ERROR ───────────────────────────────────────── */
        .log-error {
          width: 271px; background: rgba(239,68,68,.08); color: #d53939;
          border-radius: 10px; padding: 10px 12px; font-size: 12.5px;
          font-weight: 500; font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          text-align: left;
        }
        .log-loader {
          width: 16px; height: 16px; border-radius: 999px;
          border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
          animation: logSpin .75s linear infinite; flex-shrink: 0;
        }
        @keyframes logSpin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .log-desktop { display: none; }
          .log-mobile  { display: block; }
        }
      `}</style>

      {/* ── DESKTOP ── */}
      <div className="log-desktop">
        <ThemeSwitcher className="log-theme-desktop" />
        <section className="log-desktop-shell" aria-label="Festag Anmeldung">
          <div className="log-desktop-header">
            <p className="log-logo-desktop">festag</p>
            <h1 className="log-desktop-title">
              {emailView ? emailTitle : 'Willkommen zurück'}
            </h1>
          </div>
          <div className={`log-content${animating ? ' animating' : ''}`}>
            {!emailView && error && <p className="log-error">{error}</p>}
            {emailView ? (
              <EmailForm />
            ) : (
              <MainButtons />
            )}
          </div>
          {!emailView && <Legal />}
        </section>
      </div>

      {/* ── MOBILE ── */}
      <div className="log-mobile" aria-label="Festag Anmeldung">
        <div className="log-mobile-card" />
        <ThemeSwitcher className="log-theme-mobile" />
        <div className="log-mobile-shell">
          <div className="log-mobile-logo-title">
            <p className="log-logo-mobile">festag</p>
            <div className="log-mobile-inner">
              {emailView ? (
                <h1 className="log-mobile-title-email">{emailTitleMobile}</h1>
              ) : (
                <h1 className="log-mobile-title">Willkommen zurück</h1>
              )}
              <div className={`log-content${animating ? ' animating' : ''}`}>
                {!emailView && error && <p className="log-error">{error}</p>}
                {emailView ? <EmailForm /> : <MainButtons />}
              </div>
              {!emailView && <Legal />}
            </div>
          </div>
          {!emailView && <a className="log-dev" href="/dev">Dev Zugang</a>}
        </div>
      </div>

    </main>
  )
}
