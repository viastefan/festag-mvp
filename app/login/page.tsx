'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailView, setEmailView] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  function switchView(toEmail: boolean) {
    setError('')
    setAnimating(true)
    setTimeout(() => {
      setEmailView(toEmail)
      setAnimating(false)
    }, 180)
  }

  function toggleTheme(t: 'light' | 'dark') {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }

  async function handleGoogle() {
    setError('')
    setOauthLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) {
      setError(oauthError.message)
      setOauthLoading(false)
    }
  }

  async function handleEmailLogin() {
    setError('')
    if (!email.trim()) { setError('Bitte E-Mail-Adresse eingeben.'); return }
    if (!password) { setError('Bitte Passwort eingeben.'); return }
    setLoading(true)
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (loginError) { setError('E-Mail oder Passwort ist nicht korrekt.'); return }
    window.location.href = '/dashboard'
  }

  function ThemeSwitcher({ className }: { className?: string }) {
    return (
      <div className={`log-theme-switcher${className ? ' ' + className : ''}`}>
        <button
          className={`log-theme-pill${theme === 'light' ? ' log-theme-pill-active' : ''}`}
          type="button"
          onClick={() => toggleTheme('light')}
          aria-label="Heller Modus"
        >
          Aa
        </button>
        <button
          className={`log-theme-pill${theme === 'dark' ? ' log-theme-pill-active' : ''}`}
          type="button"
          onClick={() => toggleTheme('dark')}
          aria-label="Dunkler Modus"
        >
          Aa
        </button>
      </div>
    )
  }

  function Buttons() {
    if (!emailView) return (
      <div className="log-btn-stack">
        <button className="log-btn log-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
          {oauthLoading
            ? <span className="log-loader" />
            : <span className="log-google-icon" />
          }
          <span>Mit Google verbinden</span>
        </button>
        <button className="log-btn log-btn-outline" type="button" onClick={() => switchView(true)}>
          E-Mail verwenden
        </button>
        <button className="log-btn log-btn-outline" type="button" onClick={() => setError('SAM SSO ist noch nicht verfügbar.')}>
          SAM SSO verwenden
        </button>
        <button className="log-btn log-btn-outline" type="button" onClick={() => setError('Passkey-Anmeldung ist noch nicht verfügbar.')}>
          Passkey verwenden
        </button>
      </div>
    )
    return (
      <div className="log-btn-stack">
        <input className="log-input" type="email" autoComplete="email" placeholder="E-Mail-Adresse" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="log-input" type="password" autoComplete="current-password" placeholder="Passwort" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleEmailLogin() }} />
        <button className="log-btn log-btn-google" type="button" onClick={handleEmailLogin} disabled={loading}>
          {loading && <span className="log-loader" />}
          <span>{loading ? 'Anmeldung läuft…' : 'Anmelden'}</span>
        </button>
        <button className="log-btn log-btn-outline" type="button" onClick={() => switchView(false)}>
          Zurück
        </button>
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

  return (
    <main className="log-root">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .log-root {
          min-height: 100dvh;
          width: 100%;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }

        .log-btn:active:not(:disabled) {
          transform: scale(0.97);
          transition: transform 0.08s ease !important;
        }

        .log-content {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 20px;
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .log-content.animating {
          opacity: 0;
          transform: translateY(6px);
        }

        /* ─── THEME SWITCHER ──────────────────────────────── */
        .log-theme-switcher {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .log-theme-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px 6px;
          border-radius: 6px;
          border: 0.4px solid #c7cdd6;
          background: transparent;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 12px;
          font-weight: 500;
          color: #5b647d;
          letter-spacing: 0.24px;
          cursor: pointer;
          transition: background .15s, border-color .15s, color .15s;
          white-space: nowrap;
        }
        .log-theme-pill-active {
          background: #f1f3f5;
          border-color: #fcfcfc;
          color: #2e2f33;
        }

        /* ─── DESKTOP ─────────────────────────────────────── */
        .log-desktop {
          display: flex;
          min-height: 100dvh;
          background: #fcfcfd;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .log-desktop-shell {
          width: 271px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
          transform: translateY(-3vh);
        }
        .log-desktop-header {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
        }
        .log-logo-desktop {
          font-family: 'Qurova DEMO', serif;
          font-size: 24px;
          font-weight: 500;
          color: #202532;
          text-align: center;
          width: 100%;
          line-height: normal;
        }
        .log-desktop-title {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 21px;
          font-weight: 500;
          color: #202532;
          white-space: nowrap;
          line-height: normal;
          text-align: center;
          letter-spacing: 0.24px;
          width: 100%;
        }
        .log-theme-desktop {
          position: fixed;
          right: 28px;
          top: 24px;
        }

        /* ─── MOBILE ──────────────────────────────────────── */
        .log-mobile {
          display: none;
          min-height: 100dvh;
          background: #f5f7fa;
          position: relative;
          overflow: hidden;
        }
        .log-mobile-card {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          top: 24px;
          background: #fcfcfd;
          border-radius: 36px 36px 0 0;
          box-shadow:
            0px 2px 8px 0px rgba(15,23,42,0.02),
            0px 12px 32px 0px rgba(15,23,42,0.03),
            0px 1px 2px 0px rgba(15,23,42,0.03);
        }
        .log-mobile-shell {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 175px;
          width: 271px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          align-items: center;
        }
        .log-mobile-logo-title {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 9px;
          align-items: center;
        }
        .log-logo-mobile {
          font-family: 'Qurova DEMO', serif;
          font-size: 20px;
          font-weight: 500;
          color: #000;
          text-align: center;
          line-height: 47px;
          height: 35px;
          width: 100%;
        }
        .log-mobile-inner {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 32px;
          align-items: center;
        }
        .log-mobile-title {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 28px;
          font-weight: 500;
          color: #202532;
          white-space: nowrap;
          line-height: 47px;
          text-align: center;
          letter-spacing: 0.28px;
          height: 35px;
        }
        .log-theme-mobile {
          position: absolute;
          right: 20px;
          top: 64px;
        }

        /* ─── SHARED ──────────────────────────────────────── */
        .log-btn-stack {
          width: 271px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .log-btn {
          width: 100%;
          height: 47px;
          border-radius: 32px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.14px;
          cursor: pointer;
          padding: 12px 45px;
          white-space: nowrap;
          overflow: hidden;
          transition: background .15s, opacity .15s, border-color .15s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: center;
        }
        .log-btn:disabled { opacity: .5; cursor: not-allowed; }
        .log-btn-google {
          background: #5b647d;
          color: #fff;
          box-shadow: 0px 8px 24px 0px rgba(200,169,91,0.14);
        }
        .log-btn-google:hover:not(:disabled) { background: #505870; }
        .log-btn-outline {
          background: #fff;
          color: #202532;
          border: 0.7px solid #e7ebf0;
          box-shadow: 0px 1px 2px 0px rgba(15,23,42,0.03);
        }
        .log-btn-outline:hover:not(:disabled) { background: #F7F8FB; border: 1px solid #DCE1EA; }

        .log-google-icon {
          width: 22px;
          height: 22px;
          display: block;
          flex-shrink: 0;
          background: currentColor;
          -webkit-mask: url('/google-symbol.svg') center / contain no-repeat;
          mask: url('/google-symbol.svg') center / contain no-repeat;
        }
        .log-legal {
          width: 271px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }
        .log-legal-text {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px;
          font-weight: 400;
          line-height: 20px;
          letter-spacing: 0.02em;
          color: #7b8294;
        }
        .log-legal-muted { color: #7b8294; }
        .log-legal-text a { color: #202532; text-decoration: underline; }
        .log-legal-text a:hover { opacity: 0.75; }
        .log-dev {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px;
          font-weight: 400;
          line-height: 20px;
          letter-spacing: 0.02em;
          color: #7b8294;
          text-decoration: none;
          text-align: center;
          display: block;
        }
        .log-dev:hover { color: #202532; }
        .log-input {
          width: 100%;
          height: 47px;
          border-radius: 12px;
          border: 0.7px solid #e7ebf0;
          background: #fff;
          color: #2e2f33;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 14px;
          font-weight: 400;
          padding: 0 16px;
          outline: none;
          box-shadow: 0px 1px 2px 0px rgba(15,23,42,0.03);
          transition: border-color .15s, box-shadow .15s;
        }
        .log-input::placeholder { color: rgba(107,114,128,.5); }
        .log-input:focus {
          border-color: rgba(46,47,51,.3);
          box-shadow: 0 0 0 3px rgba(46,47,51,.06);
        }
        .log-error {
          width: 271px;
          background: rgba(239,68,68,.08);
          color: #d53939;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12.5px;
          font-weight: 500;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          text-align: left;
        }
        .log-loader {
          width: 16px; height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,.35);
          border-top-color: #fff;
          animation: logSpin .75s linear infinite;
          flex-shrink: 0;
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
            <h1 className="log-desktop-title">Willkommen zurück</h1>
          </div>
          <div className={`log-content${animating ? ' animating' : ''}`}>
            {error && <p className="log-error">{error}</p>}
            <Buttons />
          </div>
          <Legal />
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
              <h1 className="log-mobile-title">Willkommen zurück</h1>
              <div className={`log-content${animating ? ' animating' : ''}`}>
                {error && <p className="log-error">{error}</p>}
                <Buttons />
              </div>
              <Legal />
            </div>
          </div>
        </div>
      </div>

    </main>
  )
}
