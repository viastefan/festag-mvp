'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const googleLogoUrl = "https://www.figma.com/api/mcp/asset/c42cac16-4843-46d5-8661-84e5ad01f2e7"

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  )
}

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

  return (
    <main style={{
      minHeight: '100dvh',
      width: '100%',
      background: '#fcfcfc',
      display: 'grid',
      placeItems: 'center',
      fontFamily: "var(--font-aeonik, 'Aeonik', Inter, sans-serif)",
      WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`
        .reg-shell {
          width: 271px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          align-items: center;
          transform: translateY(-3vh);
        }
        .reg-header {
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
        .reg-titles {
          display: flex;
          flex-direction: column;
          gap: 2px;
          align-items: center;
          width: 100%;
        }
        .reg-title {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 22px;
          font-weight: 500;
          color: #2e2f33;
          white-space: nowrap;
          line-height: normal;
          margin: 0;
        }
        .reg-subtitle {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 14px;
          font-weight: 400;
          color: #6b7280;
          letter-spacing: 0.28px;
          text-align: center;
          line-height: normal;
          margin: 0;
        }
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
          transition: opacity .15s;
        }
        .reg-btn:hover { opacity: .85; }
        .reg-btn:active { opacity: .7; }
        .reg-btn:disabled { opacity: .5; cursor: not-allowed; }
        .reg-btn-google {
          background: #5b647d;
          color: #fff;
          box-shadow: 0px 8px 24px 0px rgba(200, 169, 91, 0.14);
        }
        .reg-btn-outline {
          background: #fff;
          color: #2e2f33;
          border: 0.7px solid #e7ebf0;
          box-shadow: 0px 1px 2px 0px rgba(15, 23, 42, 0.03);
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
          margin: 0;
        }
        .reg-legal-text a {
          color: #2e2f33;
          text-decoration: none;
        }
        .reg-legal-text a:hover { text-decoration: underline; }
        .reg-login-link {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px;
          font-weight: 400;
          line-height: 20px;
          margin: 0;
        }
        .reg-login-link a {
          color: #2e2f33;
          text-decoration: none;
        }
        .reg-login-link a:hover { text-decoration: underline; }
        .reg-dev {
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
        .reg-dev:hover { color: #2e2f33; }
        .reg-error {
          width: 271px;
          background: rgba(239,68,68,.08);
          color: #d53939;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12.5px;
          font-weight: 500;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
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
        .reg-loader {
          width: 16px; height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,.35);
          border-top-color: #fff;
          animation: regSpin .75s linear infinite;
          flex-shrink: 0;
        }
        @keyframes regSpin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .reg-dev { position: static; display: block; text-align: center; margin-top: 32px; }
        }
      `}</style>

      <section className="reg-shell" aria-label="Festag Registrierung">

        <div className="reg-header">
          <p className="reg-logo">festag</p>
          <div className="reg-titles">
            <h1 className="reg-title">Neu bei festag</h1>
            <p className="reg-subtitle">Bei Festag registrieren</p>
          </div>
        </div>

        {success ? (
          <p className="reg-success">
            Bestätigungsmail gesendet! Bitte prüfe dein Postfach.
          </p>
        ) : (
          <>
            {error && <p className="reg-error">{error}</p>}

            {!emailView ? (
              <div className="reg-btn-stack">
                <button className="reg-btn reg-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
                  {oauthLoading
                    ? <span className="reg-loader" />
                    : <img className="reg-google-icon" src={googleLogoUrl} alt="" />
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
            ) : (
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
            )}
          </>
        )}

        <div className="reg-legal">
          <p className="reg-legal-text">
            Secure, AI-orchestrated software Delivery. Mit Ihrer Anmeldung bestätigen Sie unsere{' '}
            <a href="/legal/agb">AGB</a>{' '}und{' '}
            <a href="/legal/nutzungsbedingungen">Nutzungsbestimmungen</a>.
          </p>
          <p className="reg-login-link">
            Zugang erstellt?{' '}
            <a href="/login">Hier anmelden</a>
          </p>
        </div>

      </section>

      <a className="reg-dev" href="/dev">Dev Zugang</a>
    </main>
  )
}
