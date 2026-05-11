'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setTheme } from '@/lib/theme'

type AuthView = 'login' | 'email'
type EmailStage = 'email' | 'password'

function FestagMark() {
  return (
    <img className="simple-login-mark" src="/festag-mark.png" alt="Festag" />
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
          width:min(344px, calc(100vw - 40px));
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
          margin:0 0 24px;
        }
        .simple-login-mark {
          width:46px;
          height:46px;
          display:block;
          object-fit:contain;
          user-select:none;
          -webkit-user-drag:none;
        }
        .simple-login h1 {
          margin:0 0 22px;
          color:var(--ink);
          font-size:19px;
          line-height:1.2;
          font-weight:500;
          letter-spacing:-.025em;
          text-align:center;
        }
        .simple-login-stack {
          width:100%;
          display:flex;
          flex-direction:column;
          gap:10px;
        }
        .simple-login-button,
        .simple-login-input {
          width:100%;
          height:44px;
          border-radius:32px;
          border:1px solid var(--line);
          background:#fff;
          color:var(--ink);
          box-shadow:0 1px 1px rgba(0,0,0,.018);
          font:inherit;
          font-size:13.5px;
          font-weight:400;
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
        .simple-login-google-icon {
          width:17px;
          height:17px;
          display:inline-block;
          justify-self:center;
          background:currentColor;
          -webkit-mask:url('/google-symbol.svg') center / contain no-repeat;
          mask:url('/google-symbol.svg') center / contain no-repeat;
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
          padding:0 16px;
          font-weight:400;
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
          font-weight:400;
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
          font-weight:500;
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
          font-weight:400;
        }
        .simple-login-link {
          border:0;
          background:transparent;
          padding:0;
          color:var(--ink);
          font:inherit;
          font-weight:500;
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
          font-weight:400;
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
          font-weight:400;
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
            width:min(344px, calc(100vw - 32px));
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
                <span>{oauthLoading ? <span className="simple-login-loader" /> : <span className="simple-login-google-icon" />}</span>
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
