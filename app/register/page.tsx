'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const googleLogoDesktop = "https://www.figma.com/api/mcp/asset/ac5179d1-bb52-459e-9ef7-23c9c6233b4a"
const googleLogoMobile  = "https://www.figma.com/api/mcp/asset/9029d041-7c9a-43a1-b1f2-5d0867aad46f"

type EmailStep = 'none' | 'email' | 'password'

export default function RegisterPage() {
  const supabase = createClient()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailStep, setEmailStep] = useState<EmailStep>('none')
  const [animating, setAnimating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (emailStep === 'email') {
      setTimeout(() => emailRef.current?.focus(), 200)
    }
  }, [emailStep])

  function goTo(step: EmailStep) {
    setError('')
    setAnimating(true)
    setTimeout(() => { setEmailStep(step); setAnimating(false) }, 180)
  }

  function goBack() {
    if (emailStep === 'password') { goTo('email'); return }
    setEmail(''); setPassword(''); setConfirmPassword('')
    goTo('none')
  }

  async function handleGoogle() {
    setError('')
    setOauthLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) { setError(oauthError.message); setOauthLoading(false) }
  }

  function handleEmailNext() {
    setError('')
    if (!email.trim()) { setError('Bitte E-Mail-Adresse eingeben.'); return }
    goTo('password')
  }

  async function handleRegister() {
    setError('')
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

  function MainButtons({ googleLogo }: { googleLogo: string }) {
    if (success) return <p className="reg-success">Bestätigungsmail gesendet! Bitte prüfe dein Postfach.</p>
    return (
      <div className="reg-btn-stack">
        <button className="reg-btn reg-btn-google" type="button" onClick={handleGoogle} disabled={oauthLoading}>
          {oauthLoading ? <span className="reg-loader" /> : <img className="reg-google-icon" src={googleLogo} alt="" />}
          <span>Mit Google verbinden</span>
        </button>
        <button className="reg-btn reg-btn-outline" type="button" onClick={() => goTo('email')}>
          E-Mail verwenden
        </button>
        <button className="reg-btn reg-btn-outline" type="button" onClick={() => setError('SAM SSO ist noch nicht verfügbar.')}>
          SAM SSO verwenden
        </button>
      </div>
    )
  }

  function EmailScreen() {
    return (
      <div className="reg-email-form">
        {error && <p className="reg-error">{error}</p>}
        <input
          ref={emailRef}
          className="reg-email-input"
          type="email"
          autoComplete="email"
          placeholder="E-Mail-Adresse eingeben..."
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleEmailNext() }}
        />
        <button className="reg-btn reg-btn-outline" type="button" onClick={handleEmailNext}>
          E-Mail verwenden
        </button>
        <button className="reg-back" type="button" onClick={goBack}>Zurück</button>
      </div>
    )
  }

  function PasswordScreen() {
    return (
      <div className="reg-email-form">
        {error && <p className="reg-error">{error}</p>}
        <input
          className="reg-email-input"
          type="password"
          autoComplete="new-password"
          placeholder="Passwort (min. 8 Zeichen)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
        />
        <input
          className="reg-email-input"
          type="password"
          autoComplete="new-password"
          placeholder="Passwort bestätigen"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleRegister() }}
        />
        <button className="reg-btn reg-btn-google" type="button" onClick={handleRegister} disabled={loading}>
          {loading && <span className="reg-loader" />}
          <span>{loading ? 'Konto wird erstellt…' : 'Registrieren'}</span>
        </button>
        <button className="reg-back" type="button" onClick={goBack}>Zurück</button>
      </div>
    )
  }

  const Legal = () => (
    <div className="reg-legal">
      <p className="reg-legal-text">
        <span className="reg-legal-muted">Secure, AI-orchestrated software Delivery. Mit Ihrer Anmeldung bestätigen Sie unsere{' '}</span>
        <a href="/legal/agb">AGB</a>
        <span className="reg-legal-muted">{' '}und{' '}</span>
        <a href="/legal/nutzungsbedingungen">Nutzungsbestimmungen</a>
        <span className="reg-legal-muted">.</span>
      </p>
      <p className="reg-login-link">
        Zugang erstellt?{' '}<a href="/login">Hier anmelden</a>
      </p>
    </div>
  )

  const desktopTitle =
    emailStep === 'email' ? 'Wie lautet Ihre E-Mail?' :
    emailStep === 'password' ? 'Passwort festlegen' :
    'Willkommen bei festag'

  const mobileTitle =
    emailStep === 'email' ? 'Wie lautet Ihre\nE-Mail-Adresse?' :
    emailStep === 'password' ? 'Passwort festlegen' :
    'Willkommen'

  return (
    <main className="reg-root">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .reg-root {
          min-height: 100dvh; width: 100%;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }

        /* ─── BUTTON CLICK ANIMATION ──────────────────────── */
        .reg-btn:active:not(:disabled) {
          transform: scale(0.97);
          transition: transform 0.08s ease !important;
        }

        /* ─── VIEW TRANSITION ─────────────────────────────── */
        .reg-content {
          width: 100%; display: flex; flex-direction: column; gap: 20px;
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .reg-content.animating { opacity: 0; transform: translateY(6px); }

        /* ─── DESKTOP ─────────────────────────────────────── */
        .reg-desktop {
          display: flex; min-height: 100dvh; background: #fcfcfd;
          align-items: center; justify-content: center;
        }
        .reg-desktop-shell {
          width: 271px; display: flex; flex-direction: column;
          gap: 24px; align-items: center; transform: translateY(-3vh);
        }
        .reg-desktop-header {
          width: 100%; display: flex; flex-direction: column;
          gap: 24px; align-items: center;
        }
        .reg-logo-desktop {
          font-family: 'Qurova DEMO', serif; font-size: 24px; font-weight: 500;
          color: #202532; text-align: center; width: 100%; line-height: normal;
        }
        .reg-desktop-title {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 21px; font-weight: 500; color: #202532;
          line-height: normal; text-align: center;
          letter-spacing: 0.21px; width: 100%;
        }
        .reg-dev-desktop {
          position: fixed; right: 28px; bottom: 24px;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 11px; font-weight: 500; color: #7b8294;
          text-decoration: none; letter-spacing: 0.22px; line-height: 20px;
        }
        .reg-dev-desktop:hover { color: #202532; }

        /* ─── MOBILE ──────────────────────────────────────── */
        .reg-mobile {
          display: none; min-height: 100dvh; background: #f5f7fa;
          position: relative; overflow: hidden;
        }
        .reg-mobile-card {
          position: absolute; left: 0; right: 0; bottom: 0; top: 24px;
          background: #fcfcfd; border-radius: 36px 36px 0 0;
          box-shadow: 0px 2px 8px 0px rgba(15,23,42,0.02),
            0px 12px 32px 0px rgba(15,23,42,0.03),
            0px 1px 2px 0px rgba(15,23,42,0.03);
        }
        .reg-mobile-shell {
          position: absolute; left: 50%; transform: translateX(-50%);
          top: 175px; width: 271px; display: flex; flex-direction: column;
          gap: 28px; align-items: center;
        }
        .reg-mobile-logo-title {
          width: 100%; display: flex; flex-direction: column;
          gap: 9px; align-items: center;
        }
        .reg-logo-mobile {
          font-family: 'Qurova DEMO', serif; font-size: 20px; font-weight: 500;
          color: #000; text-align: center; line-height: 47px; height: 35px; width: 100%;
        }
        .reg-mobile-inner {
          width: 100%; display: flex; flex-direction: column;
          gap: 32px; align-items: center;
        }
        .reg-mobile-title {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 28px; font-weight: 500; color: #202532;
          white-space: nowrap; line-height: 47px; text-align: center;
          letter-spacing: 0.28px; height: 35px;
        }
        .reg-mobile-title-email {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 20px; font-weight: 500; color: #2e2f33;
          line-height: 26px; text-align: center;
          letter-spacing: 0.2px; white-space: pre-line;
        }
        .reg-dev-mobile {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 12px; font-weight: 400; color: #7b8294;
          text-decoration: none; letter-spacing: 0.24px;
          line-height: 20px; text-align: center; display: block;
        }
        .reg-dev-mobile:hover { color: #202532; }

        /* ─── SHARED BUTTONS ──────────────────────────────── */
        .reg-btn-stack { width: 271px; display: flex; flex-direction: column; gap: 20px; }
        .reg-btn {
          width: 100%; height: 47px; border-radius: 32px; border: none;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 14px; font-weight: 500; letter-spacing: 0.14px; cursor: pointer;
          padding: 12px 45px; white-space: nowrap; overflow: hidden;
          transition: background .15s, opacity .15s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: center;
        }
        .reg-btn:disabled { opacity: .5; cursor: not-allowed; }
        .reg-btn-google { background: #5b647d; color: #fff; box-shadow: 0px 8px 24px 0px rgba(200,169,91,0.14); }
        .reg-btn-google:hover:not(:disabled) { background: #505870; }
        .reg-btn-outline {
          background: #fff; color: #202532;
          border: 0.7px solid #e7ebf0;
          box-shadow: 0px 1px 2px 0px rgba(15,23,42,0.03);
        }
        .reg-btn-outline:hover:not(:disabled) { background: #F7F8FB; border: 1px solid #DCE1EA; }
        .reg-google-icon { width: 22px; height: 22px; display: block; flex-shrink: 0; }

        /* ─── EMAIL / PASSWORD FORM ───────────────────────── */
        .reg-email-form { width: 271px; display: flex; flex-direction: column; gap: 16px; }
        .reg-email-input {
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
        .reg-email-input::placeholder { color: #bcbfc2; }
        .reg-email-input:focus {
          border-color: #5b647d;
          box-shadow: 0 0 0 3px rgba(91,100,125,0.12);
        }
        .reg-back {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px; font-weight: 400 !important; color: #7b8294;
          background: none; border: none; cursor: pointer;
          text-align: center; letter-spacing: 0.26px; line-height: 20px;
          transition: color .15s;
        }
        .reg-back:hover { color: #202532; }

        /* ─── LEGAL ───────────────────────────────────────── */
        .reg-legal { width: 271px; display: flex; flex-direction: column; gap: 16px; text-align: center; color: #7b8294; letter-spacing: 0.26px; }
        .reg-legal-text {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px; font-weight: 400 !important; line-height: 20px;
          letter-spacing: 0.02em; color: #98A2B3;
        }
        .reg-legal-muted { color: #98A2B3; }
        .reg-legal-text a { color: #202532; text-decoration: none; }
        .reg-legal-text a:hover { text-decoration: underline; }
        .reg-login-link {
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px; font-weight: 400 !important; line-height: 20px;
          letter-spacing: 0.02em; color: #7b8294;
        }
        .reg-login-link a { color: #202532; text-decoration: underline; }

        /* ─── FEEDBACK ────────────────────────────────────── */
        .reg-error {
          width: 271px; background: rgba(239,68,68,.08); color: #d53939;
          border-radius: 10px; padding: 10px 12px; font-size: 12.5px;
          font-weight: 500; font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          text-align: left;
        }
        .reg-success {
          width: 271px; background: rgba(34,197,94,.08); color: #16a34a;
          border-radius: 10px; padding: 10px 12px; font-size: 12.5px;
          font-weight: 500; font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
        }
        .reg-loader {
          width: 16px; height: 16px; border-radius: 999px;
          border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
          animation: regSpin .75s linear infinite; flex-shrink: 0;
        }
        @keyframes regSpin { to { transform: rotate(360deg); } }

        /* ─── BREAKPOINT ──────────────────────────────────── */
        @media (max-width: 640px) {
          .reg-desktop { display: none; }
          .reg-mobile  { display: block; }
        }
      `}</style>

      {/* ── DESKTOP ── */}
      <div className="reg-desktop">
        <section className="reg-desktop-shell" aria-label="Festag Registrierung">
          <div className="reg-desktop-header">
            <p className="reg-logo-desktop">festag</p>
            <h1 className="reg-desktop-title">{desktopTitle}</h1>
          </div>
          <div className={`reg-content${animating ? ' animating' : ''}`}>
            {emailStep === 'none' && error && <p className="reg-error">{error}</p>}
            {emailStep === 'none' && <MainButtons googleLogo={googleLogoDesktop} />}
            {emailStep === 'email' && <EmailScreen />}
            {emailStep === 'password' && <PasswordScreen />}
          </div>
          {emailStep === 'none' && <Legal />}
        </section>
        <a className="reg-dev-desktop" href="/dev">Dev Zugang</a>
      </div>

      {/* ── MOBILE ── */}
      <div className="reg-mobile" aria-label="Festag Registrierung">
        <div className="reg-mobile-card" />
        <div className="reg-mobile-shell">
          <div className="reg-mobile-logo-title">
            <p className="reg-logo-mobile">festag</p>
            <div className="reg-mobile-inner">
              {emailStep === 'none'
                ? <h1 className="reg-mobile-title">Willkommen</h1>
                : <h1 className="reg-mobile-title-email">{mobileTitle}</h1>
              }
              <div className={`reg-content${animating ? ' animating' : ''}`}>
                {emailStep === 'none' && error && <p className="reg-error">{error}</p>}
                {emailStep === 'none' && <MainButtons googleLogo={googleLogoMobile} />}
                {emailStep === 'email' && <EmailScreen />}
                {emailStep === 'password' && <PasswordScreen />}
              </div>
              {emailStep === 'none' && <Legal />}
            </div>
          </div>
          {emailStep === 'none' && <a className="reg-dev-mobile" href="/dev">Dev Zugang</a>}
        </div>
      </div>

    </main>
  )
}
