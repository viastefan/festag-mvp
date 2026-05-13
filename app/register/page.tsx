'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Design tokens from Figma ────────────────────────────────────────────────
// Dark bg: #0F141B  Card bg (mobile): #0F141B  Outer (mobile dark): #090C11
// Light bg: #FCFCFC  Card bg (mobile): #FCFCFC  Outer (mobile light): #F5F7FA
// Google btn: #5B647D  text white
// Email/SSO btn dark: #F3F5F7  text #2E2F33
// Email/SSO btn light: #FFFFFF  text #2E2F33
// Logo font: Qurova DEMO 24px  Title: Aeonik 22px desktop / 28px mobile
// Subtitle: Aeonik 14px  Legal: Geist 13px  Link: Aeonik 13px
// ─────────────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <span
      style={{
        width: 18,
        height: 18,
        display: 'inline-block',
        background: 'white',
        WebkitMask: "url('/google-symbol.svg') center / contain no-repeat",
        mask: "url('/google-symbol.svg') center / contain no-repeat",
        flexShrink: 0,
      }}
    />
  )
}

function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

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

    if (signUpError) {
      setError(signUpError.message)
      return
    }
    setSuccess(true)
  }

  const dark = isDark

  return (
    <main className="reg-root">
      <style>{`
        /* ── Reset & base ───────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .reg-root {
          min-height: 100dvh;
          width: 100%;
          display: grid;
          place-items: center;
          font-family: var(--font-aeonik, Aeonik, Inter, sans-serif);
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
          transition: background .25s;
          background: ${dark ? '#0F141B' : '#FCFCFC'};
          color: ${dark ? '#F3F5F7' : '#2E2F33'};
        }

        /* ── Card shell ─────────────────────────────────── */
        .reg-shell {
          width: 271px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          transform: translateY(-3vh);
        }

        /* ── Logo ───────────────────────────────────────── */
        .reg-logo {
          font-family: 'Qurova DEMO', serif;
          font-size: 24px;
          font-weight: 400;
          letter-spacing: -0.01em;
          color: ${dark ? '#F3F5F7' : '#2E2F33'};
          line-height: 1;
        }

        /* ── Heading block ──────────────────────────────── */
        .reg-heading { display: flex; flex-direction: column; gap: 4px; }
        .reg-title {
          font-size: 22px;
          font-weight: 500;
          letter-spacing: -0.025em;
          line-height: 1.15;
          color: ${dark ? '#F3F5F7' : '#2E2F33'};
        }
        .reg-subtitle {
          font-size: 14px;
          font-weight: 400;
          color: ${dark ? '#98A2B3' : '#6B7280'};
          line-height: 1.4;
        }

        /* ── Buttons ────────────────────────────────────── */
        .reg-btn-stack { display: flex; flex-direction: column; gap: 10px; }

        .reg-btn {
          width: 100%;
          height: 47px;
          border-radius: 32px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 400;
          cursor: pointer;
          transition: opacity .18s, box-shadow .18s;
          letter-spacing: -0.01em;
        }
        .reg-btn:hover { opacity: .88; }
        .reg-btn:active { opacity: .72; }
        .reg-btn:disabled { opacity: .5; cursor: not-allowed; }

        .reg-btn-google {
          background: #5B647D;
          color: #fff;
        }
        .reg-btn-outline {
          background: ${dark ? '#F3F5F7' : '#FFFFFF'};
          color: #2E2F33;
          border: 1px solid ${dark ? 'rgba(243,245,247,.12)' : 'rgba(46,47,51,.12)'};
        }

        /* ── Input fields ───────────────────────────────── */
        .reg-input {
          width: 100%;
          height: 47px;
          border-radius: 12px;
          border: 1px solid ${dark ? 'rgba(243,245,247,.14)' : 'rgba(46,47,51,.14)'};
          background: ${dark ? 'rgba(243,245,247,.06)' : '#fff'};
          color: ${dark ? '#F3F5F7' : '#2E2F33'};
          font-family: inherit;
          font-size: 14px;
          padding: 0 16px;
          outline: none;
          transition: border-color .18s, box-shadow .18s;
        }
        .reg-input::placeholder { color: ${dark ? 'rgba(152,162,179,.55)' : 'rgba(107,114,128,.55)'}; }
        .reg-input:focus {
          border-color: ${dark ? 'rgba(243,245,247,.35)' : 'rgba(46,47,51,.35)'};
          box-shadow: 0 0 0 3px ${dark ? 'rgba(243,245,247,.06)' : 'rgba(46,47,51,.06)'};
        }

        /* ── Legal block ────────────────────────────────── */
        .reg-legal {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .reg-legal-text {
          font-family: var(--font-geist, Geist, monospace);
          font-size: 13px;
          font-weight: 400;
          line-height: 1.55;
          color: ${dark ? '#98A2B3' : '#6B7280'};
        }
        .reg-legal-text a {
          color: inherit;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .reg-login-link {
          font-size: 13px;
          font-weight: 400;
          color: ${dark ? '#6B7280' : '#6B7280'};
          font-family: inherit;
        }
        .reg-login-link a {
          color: ${dark ? '#98A2B3' : '#2E2F33'};
          font-weight: 500;
          text-decoration: none;
        }
        .reg-login-link a:hover { text-decoration: underline; }

        /* ── Error ──────────────────────────────────────── */
        .reg-error {
          background: rgba(239,68,68,.08);
          color: #d53939;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12.5px;
          font-weight: 500;
        }

        /* ── Success ────────────────────────────────────── */
        .reg-success {
          background: rgba(34,197,94,.08);
          color: #16a34a;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12.5px;
          font-weight: 500;
        }

        /* ── Loader ─────────────────────────────────────── */
        .reg-loader {
          width: 16px; height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,.35);
          border-top-color: #fff;
          animation: regSpin .75s linear infinite;
          flex-shrink: 0;
        }
        @keyframes regSpin { to { transform: rotate(360deg); } }

        /* ── Dev link ───────────────────────────────────── */
        .reg-dev {
          position: fixed;
          right: 28px;
          bottom: 24px;
          font-size: 13px;
          color: ${dark ? '#6B7280' : '#6B7280'};
          text-decoration: none;
          font-family: inherit;
        }
        .reg-dev:hover { color: ${dark ? '#98A2B3' : '#2E2F33'}; }

        /* ── Mobile ─────────────────────────────────────── */
        @media (max-width: 640px) {
          .reg-root {
            background: ${dark ? '#090C11' : '#F5F7FA'};
            align-items: flex-start;
            padding: 0;
          }
          .reg-card {
            width: 100%;
            min-height: 825px;
            background: ${dark ? '#0F141B' : '#FCFCFC'};
            border-radius: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .reg-shell {
            width: 271px;
            transform: none;
          }
          .reg-logo { display: none; }
          .reg-title { font-size: 28px; }
          .reg-dev {
            position: static;
            display: block;
            text-align: center;
            margin-top: 32px;
          }
        }
        @media (min-width: 641px) {
          .reg-card { display: contents; }
        }
      `}</style>

      <div className="reg-card">
        <section className="reg-shell" aria-label="Festag Registrierung">

          {/* Logo — Desktop only */}
          <div className="reg-logo">festag</div>

          {/* Heading */}
          <div className="reg-heading">
            <h1 className="reg-title">Neu bei festag</h1>
            <p className="reg-subtitle">Bei Festag registrieren</p>
          </div>

          {/* Buttons / Form */}
          {success ? (
            <p className="reg-success">
              Bestätigungsmail gesendet! Bitte prüfe dein Postfach und bestätige deine E-Mail-Adresse.
            </p>
          ) : (
            <>
              {error && <p className="reg-error">{error}</p>}

              {!emailView ? (
                <div className="reg-btn-stack">
                  <button className="reg-btn reg-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
                    {oauthLoading ? <span className="reg-loader" /> : <GoogleIcon />}
                    <span>Mit Google verbinden</span>
                  </button>
                  <button className="reg-btn reg-btn-outline" type="button" onClick={() => { setError(''); setEmailView(true) }}>
                    <MailIcon />
                    <span>E-Mail verwenden</span>
                  </button>
                  <button className="reg-btn reg-btn-outline" type="button" onClick={() => setError('SAM SSO ist noch nicht verfügbar.')}>
                    <span>SAM SSO verwenden</span>
                  </button>
                </div>
              ) : (
                <div className="reg-btn-stack">
                  <input
                    className="reg-input"
                    type="email"
                    autoComplete="email"
                    placeholder="E-Mail-Adresse"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    className="reg-input"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Passwort (min. 8 Zeichen)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <input
                    className="reg-input"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Passwort bestätigen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEmailRegister() }}
                  />
                  <button className="reg-btn reg-btn-google" type="button" onClick={handleEmailRegister} disabled={loading}>
                    {loading ? <span className="reg-loader" /> : null}
                    <span>{loading ? 'Konto wird erstellt…' : 'Registrieren'}</span>
                  </button>
                  <button className="reg-btn reg-btn-outline" type="button" onClick={() => { setError(''); setEmailView(false) }}>
                    <span>Zurück</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Legal */}
          <div className="reg-legal">
            <p className="reg-legal-text">
              Secure, AI-orchestrated software Delivery. Mit Ihrer Anmeldung bestätigen Sie unsere{' '}
              <a href="/legal/agb">AGB</a> und <a href="/legal/nutzungsbedingungen">Nutzungsbestimmungen</a>.
            </p>
            <p className="reg-login-link">
              Zugang erstellt?{' '}
              <a href="/login">Hier anmelden</a>
            </p>
          </div>

        </section>
      </div>

      <a className="reg-dev" href="/dev">Dev Zugang</a>
    </main>
  )
}
