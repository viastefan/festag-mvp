'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const googleLogoDesktop = "https://www.figma.com/api/mcp/asset/2d95a3fa-8a28-4d90-9503-9e821fad862d"
const googleLogoMobile  = "https://www.figma.com/api/mcp/asset/e985d996-ec21-4574-a535-8231cc2e9c38"

export default function RegisterPage() {
  const supabase = createClient()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailView, setEmailView] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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

  async function handleEmailRegister() {
    setError('')
    if (!email.trim()) { setError('Bitte E-Mail-Adresse eingeben.'); return }
    if (password.length < 8) { setError('Passwort muss mindestens 8 Zeichen haben.'); return }
    if (password !== confirmPassword) { setError('Passwörter stimmen nicht überein.'); return }
    setLoading(true)
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (signUpError) { setError(signUpError.message); return }
    setSuccess(true)
  }

  function Buttons({ googleLogo }: { googleLogo: string }) {
    if (success) return (
      <p className="reg-success">Bestätigungsmail gesendet! Bitte prüfe dein Postfach.</p>
    )
    if (!emailView) return (
      <div className="reg-btn-stack">
        <button className="reg-btn reg-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
          {oauthLoading ? <span className="reg-loader" /> : <img className="reg-google-icon" src={googleLogo} alt="" />}
          <span>Mit Goole verbinden</span>
        </button>
        <button className="reg-btn reg-btn-outline" type="button" onClick={() => { setError(''); setEmailView(true) }}>
          E-Mail verwenden
        </button>
        <button className="reg-btn reg-btn-outline" type="button" onClick={() => setError('SAM SSO ist noch nicht verfügbar.')}>
          SAM SSO verwenden
        </button>
      </div>
    )
    return (
      <div className="reg-btn-stack">
        <input className="reg-input" type="email" autoComplete="email" placeholder="E-Mail-Adresse" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="reg-input" type="password" autoComplete="new-password" placeholder="Passwort (min. 8 Zeichen)" value={password} onChange={e => setPassword(e.target.value)} />
        <input className="reg-input" type="password" autoComplete="new-password" placeholder="Passwort bestätigen" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleEmailRegister() }} />
        <button className="reg-btn reg-btn-google" type="button" onClick={handleEmailRegister} disabled={loading}>
          {loading && <span className="reg-loader" />}
          <span>{loading ? 'Konto wird erstellt…' : 'Registrieren'}</span>
        </button>
        <button className="reg-btn reg-btn-outline" type="button" onClick={() => { setError(''); setEmailView(false) }}>
          Zurück
        </button>
      </div>
    )
  }

  const Legal = () => (
    <div className="reg-legal">
      <p className="reg-legal-text">
        Secure, AI-orchestrated software Delivery. Mit Ihrer Anmeldung bestätigen Sie unsere{' '}
        <a href="/legal/agb">AGB</a>{' '}und{' '}
        <a href="/legal/nutzungsbedingungen">Nutzungsbestimmungen</a>.
      </p>
      <p className="reg-login-link">
        Zugang erstellt?{' '}<a href="/login">Hier anmelden</a>
      </p>
    </div>
  )

  return (
    <main className="reg-root">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .reg-root {
          min-height: 100dvh;
          width: 100%;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }

        /* ─── DESKTOP ──────────────────────────────────────── */
        .reg-desktop {
          display: flex;
          min-height: 100dvh;
          background: #fcfcfc;
          align-items: center;
          justify-content: center;
        }
        .reg-desktop-shell {
          width: 271px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
          transform: translateY(-3vh);
        }
        .reg-desktop-header {
          width: 186px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
        }
        .reg-logo-desktop {
          font-family: 'Qurova DEMO', serif;
          font-size: 24px;
          font-weight: 500;
          color: #2e2f33;
          text-align: center;
          width: 100%;
          line-height: normal;
        }
        .reg-desktop-title {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 25px;
          font-weight: 700;
          color: #2e2f33;
          white-space: nowrap;
          line-height: normal;
          text-align: center;
          width: 100%;
        }
        .reg-dev-desktop {
          position: fixed;
          right: 28px;
          bottom: 24px;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 11px;
          font-weight: 500;
          color: #6b7280;
          text-decoration: none;
          letter-spacing: 0.22px;
          line-height: 20px;
        }
        .reg-dev-desktop:hover { color: #2e2f33; }

        /* ─── MOBILE ───────────────────────────────────────── */
        .reg-mobile {
          display: none;
          min-height: 100dvh;
          background: #f5f7fa;
          flex-direction: column;
          justify-content: flex-end;
        }
        .reg-mobile-card {
          background: #fcfcfc;
          border-radius: 36px 36px 0 0;
          box-shadow:
            0px 2px 8px 0px rgba(15,23,42,0.02),
            0px 12px 32px 0px rgba(15,23,42,0.03),
            0px 1px 2px 0px rgba(15,23,42,0.03);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 0 40px;
        }
        .reg-mobile-shell {
          width: 271px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          align-items: center;
        }
        .reg-logo-mobile {
          font-family: 'Qurova DEMO', serif;
          font-size: 20px;
          font-weight: 500;
          color: #000;
          text-align: center;
          line-height: 47px;
          height: 35px;
          width: 100%;
        }
        .reg-mobile-inner {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 32px;
          align-items: center;
        }
        .reg-mobile-title {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 28px;
          font-weight: 700;
          color: #2e2f33;
          white-space: nowrap;
          line-height: 47px;
          text-align: center;
          height: 35px;
        }
        .reg-dev-mobile {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 12px;
          font-weight: 400;
          color: #6b7280;
          text-decoration: none;
          letter-spacing: 0.24px;
          line-height: 20px;
          text-align: center;
          display: block;
          padding: 20px 0 24px;
        }
        .reg-dev-mobile:hover { color: #2e2f33; }

        /* ─── SHARED ───────────────────────────────────────── */
        .reg-btn-stack {
          width: 271px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .reg-btn {
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
          letter-spacing: 0.28px;
          cursor: pointer;
          padding: 12px 45px;
          white-space: nowrap;
          overflow: hidden;
          transition: opacity .15s;
        }
        .reg-btn:disabled { opacity: .5; cursor: not-allowed; }
        .reg-btn-google {
          background: #5b647d;
          color: #fff;
          box-shadow: 0px 8px 24px 0px rgba(200,169,91,0.14);
          transition: background .15s;
        }
        .reg-btn-google:hover:not(:disabled) { background: #505870; }
        .reg-btn-outline {
          background: #fff;
          color: #2e2f33;
          border: 0.7px solid #e7ebf0;
          box-shadow: 0px 1px 2px 0px rgba(15,23,42,0.03);
          transition: background .15s;
        }
        .reg-btn-outline:hover:not(:disabled) { background: #e7ebf0; }
        .reg-google-icon {
          width: 22px;
          height: 22px;
          display: block;
          flex-shrink: 0;
        }
        .reg-legal {
          width: 271px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: center;
          color: #6b7280;
          letter-spacing: 0.26px;
        }
        .reg-legal-text {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px;
          font-weight: 400;
          line-height: 20px;
        }
        .reg-legal-text a { color: #2e2f33; text-decoration: none; }
        .reg-legal-text a:hover { text-decoration: underline; }
        .reg-login-link {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px;
          font-weight: 400;
          line-height: 20px;
        }
        .reg-login-link a { color: #2e2f33; text-decoration: underline; }
        .reg-input {
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
        .reg-input::placeholder { color: rgba(107,114,128,.5); }
        .reg-input:focus {
          border-color: rgba(46,47,51,.3);
          box-shadow: 0 0 0 3px rgba(46,47,51,.06);
        }
        .reg-error {
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
        .reg-success {
          width: 271px;
          background: rgba(34,197,94,.08);
          color: #16a34a;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12.5px;
          font-weight: 500;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
        }
        .reg-loader {
          width: 16px; height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,.35);
          border-top-color: #fff;
          animation: regSpin .75s linear infinite;
          flex-shrink: 0;
        }
        @keyframes regSpin { to { transform: rotate(360deg); } }

        /* ─── BREAKPOINT ───────────────────────────────────── */
        @media (max-width: 640px) {
          .reg-desktop { display: none; }
          .reg-mobile  { display: flex; }
        }
      `}</style>

      {/* ── DESKTOP ── */}
      <div className="reg-desktop">
        <section className="reg-desktop-shell" aria-label="Festag Registrierung">
          <div className="reg-desktop-header">
            <p className="reg-logo-desktop">festag</p>
            <h1 className="reg-desktop-title">Willkommen bei festag</h1>
          </div>
          {error && <p className="reg-error">{error}</p>}
          <Buttons googleLogo={googleLogoDesktop} />
          <Legal />
        </section>
        <a className="reg-dev-desktop" href="/dev">Dev Zugang</a>
      </div>

      {/* ── MOBILE ── */}
      <div className="reg-mobile" aria-label="Festag Registrierung">
        <div className="reg-mobile-card">
          <div className="reg-mobile-shell">
            <p className="reg-logo-mobile">festag</p>
            <div className="reg-mobile-inner">
              <h1 className="reg-mobile-title">Willkommen</h1>
              {error && <p className="reg-error">{error}</p>}
              <Buttons googleLogo={googleLogoMobile} />
              <Legal />
            </div>
          </div>
        </div>
        <a className="reg-dev-mobile" href="/dev">Dev Zugang</a>
      </div>

    </main>
  )
}
