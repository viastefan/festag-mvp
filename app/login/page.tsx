'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setTheme } from '@/lib/theme'

type AuthView = 'login' | 'email'

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

export default function LoginPage() {
  const supabase = createClient()
  const [view, setView] = useState<AuthView>('login')
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

  return (
    <main className="simple-login">
      <style>{`
        .simple-login {
          min-height:100dvh;
          width:100%;
          overflow:hidden;
          background:#fbfbfa;
          color:#242426;
          display:grid;
          place-items:center;
          font-family:var(--font-aeonik), Aeonik, Inter, sans-serif;
          -webkit-font-smoothing:antialiased;
          text-rendering:geometricPrecision;
        }
        .simple-login-shell {
          width:min(390px, calc(100vw - 40px));
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:0;
          transform:translateY(-4vh);
        }
        .simple-login-logo {
          display:flex;
          align-items:center;
          justify-content:center;
          margin:0 0 28px;
        }
        .simple-login-mark {
          width:48px;
          height:48px;
          border-radius:999px;
          background:#29292b;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:3px;
          box-shadow:0 1px 2px rgba(0,0,0,.04);
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
          margin:0 0 24px;
          color:#252629;
          font-size:22px;
          line-height:1.2;
          font-weight:690;
          letter-spacing:-.025em;
          text-align:center;
        }
        .simple-login-stack {
          width:100%;
          display:flex;
          flex-direction:column;
          gap:12px;
        }
        .simple-login-button,
        .simple-login-input {
          width:100%;
          height:48px;
          border-radius:14px;
          border:1px solid rgba(20,20,22,.1);
          background:#fff;
          color:#26272a;
          box-shadow:0 1px 2px rgba(0,0,0,.035);
          font:inherit;
          font-size:14px;
          font-weight:650;
          transition:background .16s cubic-bezier(.16,1,.3,1), border-color .16s cubic-bezier(.16,1,.3,1), transform .16s cubic-bezier(.16,1,.3,1), box-shadow .16s cubic-bezier(.16,1,.3,1);
        }
        .simple-login-button {
          display:grid;
          grid-template-columns:46px 1fr 46px;
          align-items:center;
          cursor:pointer;
        }
        .simple-login-button.primary {
          background:#6f75d8;
          border-color:#6f75d8;
          color:white;
          box-shadow:0 10px 24px rgba(91,96,205,.18);
        }
        .simple-login-button:hover,
        .simple-login-input:hover {
          border-color:rgba(20,20,22,.18);
          transform:translateY(-1px);
          box-shadow:0 8px 22px rgba(0,0,0,.06);
        }
        .simple-login-button.primary:hover {
          border-color:#6268cb;
          background:#676dd1;
          box-shadow:0 12px 28px rgba(91,96,205,.22);
        }
        .simple-login-button:focus,
        .simple-login-input:focus {
          outline:0;
        }
        .simple-login-button:focus-visible,
        .simple-login-input:focus-visible,
        .simple-login-link:focus-visible {
          outline:2px solid rgba(111,117,216,.36);
          outline-offset:3px;
        }
        .simple-login-input {
          padding:0 14px;
          font-weight:560;
        }
        .simple-login-input::placeholder {
          color:rgba(37,38,41,.4);
        }
        .simple-login-muted {
          margin:10px 0 0;
          color:rgba(37,38,41,.58);
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
          margin-top:28px;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:16px;
          color:rgba(37,38,41,.58);
          font-size:13px;
          font-weight:560;
        }
        .simple-login-link {
          border:0;
          background:transparent;
          padding:0;
          color:#343538;
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
        .simple-login-dev {
          position:fixed;
          right:28px;
          bottom:24px;
          color:rgba(37,38,41,.38);
          font-size:12px;
          font-weight:620;
          text-decoration:none;
        }
        .simple-login-dev:hover { color:rgba(37,38,41,.72); }
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
              <button className="simple-login-button" type="button" onClick={() => { setError(''); setView('email') }}>
                <span />
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
            <h1>Wie lautet deine E-Mail-Adresse?</h1>
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
                    document.getElementById('festag-password')?.focus()
                  }
                }}
              />
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
              <button className="simple-login-button" type="button" onClick={doEmailLogin} disabled={loading}>
                <span />
                <span>{loading ? 'Anmeldung läuft…' : 'Mit E-Mail anmelden'}</span>
                <span />
              </button>
            </div>
            <p className="simple-login-muted">Für neue Workspaces empfehlen wir Google Login. Der Projektstart läuft danach direkt im Workspace.</p>
            <div className="simple-login-links">
              <button className="simple-login-link" type="button" onClick={() => { setError(''); setView('login') }}>Zurück zur Anmeldung</button>
            </div>
          </>
        )}
      </section>

      <a className="simple-login-dev" href="/dev">Dev-Zugang</a>
    </main>
  )
}
