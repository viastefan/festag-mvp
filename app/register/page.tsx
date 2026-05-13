'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const googleLogoDesktop = "https://www.figma.com/api/mcp/asset/c42cac16-4843-46d5-8661-84e5ad01f2e7"
const googleLogoMobile  = "https://www.figma.com/api/mcp/asset/cbe9a366-2f79-4e18-85ad-abd2c1a35b3d"

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

  const buttons = (isMobile: boolean) => {
    const googleLogo = isMobile ? googleLogoMobile : googleLogoDesktop
    if (success) {
      return (
        <p className="reg-success">
          Bestätigungsmail gesendet! Bitte prüfe dein Postfach.
        </p>
      )
    }
    if (!emailView) {
      return (
        <div className="reg-btn-stack">
          <button className="reg-btn reg-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
            {oauthLoading
              ? <span className="reg-loader" />
              : <img className="reg-google-icon" src={googleLogo} alt="" />
            }
            <span>Mit Goole verbinden</span>
          </button>
          <button className="reg-btn reg-btn-outline" type="button" onClick={() => { setError(''); setEmailView(true) }}>
            <span>E-Mail verwenden</span>
          </button>
          <button className="reg-btn reg-btn-outline" type="button" onClick={() => setError('SAM SSO ist noch nicht verfügbar.')}>
            <span>SAM SSO verwenden</span>
          </button>
        </div>
      )
    }
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
          <span>Zurück</span>
        </button>
      </div>
    )
  }

  const legal = (
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
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .reg-root {
          min-height: 100dvh;
          width: 100%;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }

        /* ── DESKTOP ─────────────────────────────────── */
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
          gap: 32px;
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
        .reg-logo {
          font-family: 'Qurova DEMO', serif;
          font-size: 24px;
          font-weight: 500;
          color: #2e2f33;
          text-align: center;
          width: 100%;
          line-height: normal;
        }
        .reg-desktop-titles {
          display: flex;
          flex-direction: column;
          gap: 2px;
          align-items: center;
          width: 100%;
        }
        .reg-desktop-title {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 22px;
          font-weight: 500;
          color: #2e2f33;
          white-space: nowrap;
          line-height: normal;
        }
        .reg-desktop-subtitle {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 14px;
          font-weight: 400;
          color: #6b7280;
          letter-spacing: 0.28px;
          text-align: center;
          line-height: normal;
        }
        .reg-dev-desktop {
          position: fixed;
          right: 28px;
          bottom: 24px;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          text-decoration: none;
          letter-spacing: 0.26px;
          line-height: 20px;
        }
        .reg-dev-desktop:hover { color: #2e2f33; }

        /* ── MOBILE ──────────────────────────────────── */
        .reg-mobile {
          display: none;
          min-height: 100dvh;
          background: #f5f7fa;
          flex-direction: column;
        }
        .reg-mobile-card {
          margin-top: 45px;
          background: #fcfcfc;
          border-radius: 36px 36px 0 0;
          box-shadow:
            0px 2px 8px 0px rgba(15,23,42,0.02),
            0px 12px 32px 0px rgba(15,23,42,0.03),
            0px 1px 2px 0px rgba(15,23,42,0.03);
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 0;
        }
        .reg-mobile-shell {
          width: 271px;
          display: flex;
          flex-direction: column;
          gap: 40px;
          align-items: center;
        }
        .reg-mobile-header {
          width: 212px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .reg-mobile-title {
          font-size: 28px;
          font-weight: 500;
          color: #2e2f33;
          line-height: 47px;
          white-space: nowrap;
          text-align: center;
        }
        .reg-mobile-title-festag {
          font-family: 'Qurova DEMO', serif;
        }
        .reg-mobile-subtitle {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 14px;
          font-weight: 400;
          color: #6b7280;
          letter-spacing: 0.28px;
          text-align: center;
          line-height: normal;
          width: 100%;
        }
        .reg-dev-mobile {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px;
          font-weight: 400;
          color: #6b7280;
          text-decoration: none;
          letter-spacing: 0.26px;
          line-height: 20px;
          padding: 24px 30px;
          display: block;
        }
        .reg-dev-mobile:hover { color: #2e2f33; }

        /* ── SHARED COMPONENTS ───────────────────────── */
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
        .reg-btn:hover { opacity: .85; }
        .reg-btn:active { opacity: .7; }
        .reg-btn:disabled { opacity: .5; cursor: not-allowed; }
        .reg-btn-google {
          background: #5b647d;
          color: #fff;
          box-shadow: 0px 8px 24px 0px rgba(200,169,91,0.14);
        }
        .reg-btn-outline {
          background: #fff;
          color: #2e2f33;
          border: 0.7px solid #e7ebf0;
          box-shadow: 0px 1px 2px 0px rgba(15,23,42,0.03);
        }
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
        .reg-login-link a {
          color: #2e2f33;
          text-decoration: underline;
          text-decoration-color: #2e2f33;
        }
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

        /* ── BREAKPOINT ──────────────────────────────── */
        @media (max-width: 640px) {
          .reg-desktop { display: none; }
          .reg-mobile  { display: flex; }
        }
      `}</style>

      {/* ── DESKTOP ── */}
      <div className="reg-desktop">
        <section className="reg-desktop-shell" aria-label="Festag Registrierung">
          <div className="reg-desktop-header">
            <p className="reg-logo">festag</p>
            <div className="reg-desktop-titles">
              <h1 className="reg-desktop-title">Neu bei festag</h1>
              <p className="reg-desktop-subtitle">Bei Festag registrieren</p>
            </div>
          </div>
          {error && <p className="reg-error">{error}</p>}
          {buttons(false)}
          {legal}
        </section>
        <a className="reg-dev-desktop" href="/dev">Dev Zugang</a>
      </div>

      {/* ── MOBILE ── */}
      <div className="reg-mobile" aria-label="Festag Registrierung">
        <div className="reg-mobile-card">
          <div className="reg-mobile-shell">
            <div className="reg-mobile-header">
              <p className="reg-mobile-title">
                Neu bei <span className="reg-mobile-title-festag">festag</span>
              </p>
              <p className="reg-mobile-subtitle">Bei Festag registrieren</p>
            </div>
            {error && <p className="reg-error">{error}</p>}
            {buttons(true)}
            {legal}
          </div>
        </div>
        <a className="reg-dev-mobile" href="/dev">Dev Zugang</a>
      </div>

    </main>
  )
}
