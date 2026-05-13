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

  function switchView(toEmail: boolean) {
    setError('')
    setAnimating(true)
    setTimeout(() => {
      setEmailView(toEmail)
      setAnimating(false)
    }, 180)
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
        Kein Konto?{' '}
        <a href="/register">Hier registrieren</a>
        {' '}und{' '}
        <a href="/legal/mehr">mehr dazu</a>
      </p>
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

        /* ─── BUTTON CLICK ANIMATION ──────────────────────── */
        @keyframes btnPress {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        .log-btn:active:not(:disabled) {
          animation: btnPress 0.22s cubic-bezier(.36,.07,.19,.97) forwards;
        }

        /* ─── VIEW TRANSITION ─────────────────────────────── */
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

        /* ─── DESKTOP ─────────────────────────────────────── */
        .log-desktop {
          display: flex;
          min-height: 100dvh;
          background: #fcfcfd;
          align-items: center;
          justify-content: center;
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
          font-size: 24px;
          font-weight: 500;
          color: #202532;
          white-space: nowrap;
          line-height: normal;
          text-align: center;
          letter-spacing: 0.24px;
          width: 100%;
        }
        .log-dev-desktop {
          position: fixed;
          right: 28px;
          bottom: 24px;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 11px;
          font-weight: 500;
          color: #7b8294;
          text-decoration: none;
          letter-spacing: 0.22px;
          line-height: 20px;
        }
        .log-dev-desktop:hover { color: #202532; }

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
        .log-dev-mobile {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 12px;
          font-weight: 400;
          color: #7b8294;
          text-decoration: none;
          letter-spacing: 0.24px;
          line-height: 20px;
          text-align: center;
          display: block;
        }
        .log-dev-mobile:hover { color: #202532; }

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
          transition: background .15s, opacity .15s, border-color .15s;
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
          color: #7b8294;
          letter-spacing: 0.26px;
        }
        .log-legal-text {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px;
          font-weight: 400;
          line-height: 20px;
          letter-spacing: 0.02em;
        }
        .log-legal-text a { color: #202532; text-decoration: underline; }
        .log-legal-text a:hover { opacity: 0.75; }
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

        /* ─── BREAKPOINT ──────────────────────────────────── */
        @media (max-width: 640px) {
          .log-desktop { display: none; }
          .log-mobile  { display: block; }
        }
      `}</style>

      {/* ── DESKTOP ── */}
      <div className="log-desktop">
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
        <a className="log-dev-desktop" href="/dev">Dev Zugang</a>
      </div>

      {/* ── MOBILE ── */}
      <div className="log-mobile" aria-label="Festag Anmeldung">
        <div className="log-mobile-card" />
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
          <a className="log-dev-mobile" href="/dev">Dev Zugang</a>
        </div>
      </div>

    </main>
  )
}
