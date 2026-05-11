'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setTheme } from '@/lib/theme'

type AuthView = 'login' | 'email'
type EmailStage = 'email' | 'password'

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

function FestagMark() {
  return (
    <div className="simple-login-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
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

export default function LoginPage() {
  const supabase = createClient()
  const [view, setView] = useState<AuthView>('login')
  const [emailStage, setEmailStage] = useState<EmailStage>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setTheme('light')
  }, [])

  async function doGoogleLogin() {
    setError('')
    setOauthLoading(true)

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (oauthError) {
      setError(oauthError.message)
      setOauthLoading(false)
    }
  }

  async function doEmailLogin() {
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Bitte E-Mail und Passwort eingeben.')
      return
    }

    setLoading(true)
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)

    if (loginError) {
      setError('E-Mail oder Passwort ist nicht korrekt.')
      return
    }

    window.location.href = '/dashboard'
  }

  function continueEmailFlow() {
    setError('')

    if (!email.trim()) {
      setError('Bitte E-Mail-Adresse eingeben.')
      return
    }

    setEmailStage('password')
    requestAnimationFrame(() => {
      document.getElementById('festag-password')?.focus()
    })
  }

  return (
    <main className="simple-login">
      <style>{`
        .simple-login {
          --ink:#191a1c;
          --ink-soft:rgba(25,26,28,.62);
          --line:rgba(25,26,28,.105);
          --line-strong:rgba(25,26,28,.24);
          --ring:rgba(25,26,28,.07);
          min-height:100dvh;
          width:100%;
          overflow:hidden;
          background:#fbfbfa;
          color:var(--ink);
          display:grid;
          place-items:center;
          font-family:var(--font-aeonik), Aeonik, Inter, sans-serif;
          -webkit-font-smoothing:antialiased;
          text-rendering:geometricPrecision;
        }
        .simple-login-shell {
          width:min(372px, calc(100vw - 40px));
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:0;
          transform:translateY(-3vh);
        }
        .simple-login-logo {
          display:flex;
          align-items:center;
          justify-content:center;
          margin:0 0 26px;
        }
        .simple-login-mark {
          width:42px;
          height:42px;
          border-radius:999px;
          background:var(--ink);
          display:flex;
          align-items:center;
          justify-content:center;
          gap:3px;
          box-shadow:0 1px 2px rgba(0,0,0,.035);
        }
        .simple-login-mark span {
          width:3px;
          height:22px;
          border-radius:999px;
          background:#fff;
          transform:rotate(-35deg);
          opacity:.9;
        }
        .simple-login-mark span:nth-child(1) { height:15px; opacity:.72; }
        .simple-login-mark span:nth-child(4) { height:15px; opacity:.72; }
        .simple-login h1 {
          margin:0 0 23px;
          color:var(--ink);
          font-size:20px;
          line-height:1.2;
          font-weight:660;
          letter-spacing:-.025em;
          text-align:center;
        }
        .simple-login-stack {
          width:100%;
          display:flex;
          flex-direction:column;
          gap:11px;
        }
        .simple-login-button,
        .simple-login-input {
          width:100%;
          height:46px;
          border-radius:999px;
          border:1px solid var(--line);
          background:#fff;
          color:var(--ink);
          box-shadow:0 1px 1px rgba(0,0,0,.018);
          font:inherit;
          font-size:13.5px;
          font-weight:640;
          transition:background .18s cubic-bezier(.16,1,.3,1), border-color .18s cubic-bezier(.16,1,.3,1), box-shadow .18s cubic-bezier(.16,1,.3,1), color .18s cubic-bezier(.16,1,.3,1);
        }
        .simple-login-button {
          display:grid;
          grid-template-columns:46px 1fr 46px;
          align-items:center;
          cursor:pointer;
        }
        .simple-login-button.primary {
          background:var(--ink);
          border-color:var(--ink);
          color:white;
          box-shadow:0 9px 22px rgba(0,0,0,.075);
        }
        .simple-login-button:hover,
        .simple-login-input:hover {
          border-color:rgba(25,26,28,.18);
          box-shadow:0 6px 16px rgba(0,0,0,.035);
        }
        .simple-login-button.primary:hover {
          border-color:#0d0e0f;
          background:#0d0e0f;
          box-shadow:0 10px 24px rgba(0,0,0,.105);
        }
        .simple-login-button:focus,
        .simple-login-input:focus {
          outline:0;
        }
        .simple-login-button:focus-visible,
        .simple-login-input:focus-visible,
        .simple-login-link:focus-visible {
          outline:0;
          border-color:var(--line-strong);
          box-shadow:0 0 0 3px var(--ring), 0 1px 1px rgba(0,0,0,.018);
        }
        .simple-login-input {
          padding:0 15px;
          font-weight:560;
        }
        .simple-login-input:focus {
          border-color:var(--line-strong);
          box-shadow:0 0 0 3px var(--ring), 0 1px 1px rgba(0,0,0,.018);
        }
        .simple-login-input::placeholder {
          color:rgba(25,26,28,.38);
        }
        .simple-login-muted {
          margin:10px 0 0;
          color:var(--ink-soft);
          font-size:12.5px;
          line-height:1.45;
          font-weight:560;
          text-align:center;
        }
        .simple-login-error {
          width:100%;
          margin:0 0 12px;
          border-radius:12px;
          background:rgba(239,68,68,.08);
          color:#d53939;
          padding:10px 12px;
          font-size:12.5px;
          font-weight:620;
          text-align:left;
        }
        .simple-login-links {
          margin-top:26px;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:14px;
          color:var(--ink-soft);
          font-size:12.5px;
          font-weight:560;
        }
        .simple-login-link {
          border:0;
          background:transparent;
          padding:0;
          color:var(--ink);
          font:inherit;
          font-weight:650;
          cursor:pointer;
          text-decoration:none;
        }
        .simple-login-link:hover {
          color:#111;
        }
        .simple-login-small-row {
          display:flex;
          align-items:center;
          justify-content:center;
          flex-wrap:wrap;
          gap:8px;
        }
        .simple-login-separator {
          width:100%;
          display:flex;
          align-items:center;
          gap:14px;
          margin:8px 0 2px;
          color:rgba(25,26,28,.34);
          font-size:11.5px;
          font-weight:600;
        }
        .simple-login-separator::before,
        .simple-login-separator::after {
          content:'';
          flex:1;
          height:1px;
          background:rgba(25,26,28,.075);
        }
        .simple-login-dev {
          position:fixed;
          right:28px;
          bottom:24px;
          color:rgba(25,26,28,.38);
          font-size:12px;
          font-weight:620;
          text-decoration:none;
        }
        .simple-login-dev:hover { color:rgba(25,26,28,.72); }
        .simple-login-loader {
          width:16px;
          height:16px;
          border-radius:999px;
          border:2px solid rgba(255,255,255,.38);
          border-top-color:#fff;
          animation:simpleLoginSpin .78s linear infinite;
        }
        @keyframes simpleLoginSpin { to { transform:rotate(360deg); } }
        @media (max-width:640px) {
          .simple-login-shell {
            width:min(382px, calc(100vw - 32px));
            transform:translateY(-2vh);
          }
          .simple-login-dev {
            position:static;
            margin-top:34px;
          }
        }
      `}</style>

      <section className="simple-login-shell" aria-label="Festag Anmeldung">
        <div className="simple-login-logo">
          <FestagMark />
        </div>

        {view === 'login' ? (
          <>
            <h1>Bei Festag anmelden</h1>
            {error ? <p className="simple-login-error">{error}</p> : null}
            <div className="simple-login-stack">
              <button className="simple-login-button primary" type="button" onClick={doGoogleLogin} disabled={oauthLoading}>
                <span>{oauthLoading ? <span className="simple-login-loader" /> : GOOGLE_ICON}</span>
                <span>Mit Google fortfahren</span>
                <span />
              </button>
              <div className="simple-login-separator">oder</div>
              <button className="simple-login-button" type="button" onClick={() => { setError(''); setEmailStage('email'); setView('email') }}>
                <span><MailIcon /></span>
                <span>Mit E-Mail fortfahren</span>
                <span />
              </button>
            </div>
            <div className="simple-login-links">
              <a className="simple-login-link" href="/redeem">Einladungspin einlösen</a>
              <div className="simple-login-small-row">
                <span>Noch kein Workspace?</span>
                <button className="simple-login-link" type="button" onClick={doGoogleLogin}>Workspace erstellen</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1>{emailStage === 'email' ? 'Wie lautet deine E-Mail-Adresse?' : 'Passwort eingeben'}</h1>
            {error ? <p className="simple-login-error">{error}</p> : null}
            <div className="simple-login-stack">
              <input
                className="simple-login-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="E-Mail-Adresse eingeben..."
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    continueEmailFlow()
                  }
                }}
              />
              {emailStage === 'password' ? (
                <input
                  id="festag-password"
                  className="simple-login-input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Passwort eingeben..."
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      doEmailLogin()
                    }
                  }}
                />
              ) : null}
              <button className="simple-login-button" type="button" onClick={emailStage === 'email' ? continueEmailFlow : doEmailLogin} disabled={loading}>
                <span />
                <span>{loading ? 'Anmeldung läuft…' : emailStage === 'email' ? 'Weiter mit E-Mail' : 'Anmelden'}</span>
                <span />
              </button>
            </div>
            <div className="simple-login-links">
              <button className="simple-login-link" type="button" onClick={() => {
                setError('')
                if (emailStage === 'password') {
                  setEmailStage('email')
                } else {
                  setView('login')
                }
              }}>Zurück zur Anmeldung</button>
            </div>
          </>
        )}
      </section>

      <a className="simple-login-dev" href="/dev">Dev-Zugang</a>
    </main>
  )
}
