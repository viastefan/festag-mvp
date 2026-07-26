'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthTheme } from '@/lib/auth-theme'
import FestagLoader from '@/components/FestagLoader'
import AuthBrandLogo from '@/components/AuthBrandLogo'

function ResetPasswordInner() {
  const router = useRouter()
  const supabase = createClient()
  const { mode: theme } = useAuthTheme('client')
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace('/login?error=link_expired')
        return
      }
      setEmail(session.user.email ?? null)
      setChecking(false)
    })()
  }, [router, supabase])

  async function submit() {
    setError('')
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen haben.')
      return
    }
    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password, confirm }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.message || 'Passwort konnte nicht gespeichert werden.')
        setBusy(false)
        return
      }
      setDone(true)
      window.setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1200)
    } catch {
      setError('Netzwerkproblem. Bitte erneut versuchen.')
      setBusy(false)
    }
  }

  if (checking) {
    return <FestagLoader fullscreen label="Sitzung wird geprüft…" />
  }

  return (
    <main className="rp-page" data-theme={theme}>
      <style>{RP_CSS}</style>
      <div className="rp-card">
        <div className="rp-brand"><AuthBrandLogo size="compact" /></div>
        <h1 className="rp-title">
          {done ? 'Passwort gespeichert' : 'Neues Passwort festlegen'}
        </h1>
        {done ? (
          <p className="rp-text">Du wirst weitergeleitet…</p>
        ) : (
          <>
            {email ? (
              <p className="rp-text">Für <strong>{email}</strong></p>
            ) : (
              <p className="rp-text">Wähle ein neues Passwort für dein Konto.</p>
            )}
            <label className="rp-field">
              <span>Neues Passwort</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="rp-field">
              <span>Passwort bestätigen</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                disabled={busy}
                onKeyDown={e => { if (e.key === 'Enter') void submit() }}
              />
            </label>
            {error ? <p className="rp-error" role="alert">{error}</p> : null}
            <button
              className="rp-cta"
              type="button"
              disabled={busy}
              onClick={() => { void submit() }}
            >
              {busy ? 'Wird gespeichert…' : 'Passwort speichern'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<FestagLoader fullscreen label="Sitzung wird geprüft…" />}>
      <ResetPasswordInner />
    </Suspense>
  )
}

const RP_CSS = `
  .rp-page {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #f5f5f7;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-weight: 400;
  }
  .rp-page a,
  .rp-page button,
  .rp-page input,
  .rp-page textarea,
  .rp-page p,
  .rp-page label,
  .rp-page strong,
  .rp-page span,
  .rp-page h1 {
    font-weight: 400;
  }
  .rp-page[data-theme="dark"] {
    background: #000000;
  }
  .rp-card {
    width: min(100%, 420px);
    border-radius: 22px;
    background: #ffffff;
    border: 1px solid rgba(210, 210, 215, 0.8);
    box-shadow: 0 20px 48px rgba(15, 23, 42, 0.10);
    padding: 28px 26px 24px;
  }
  .rp-page[data-theme="dark"] .rp-card {
    background: #0c0c0e;
    border-color: transparent;
    box-shadow: 0 20px 48px rgba(0,0,0,0.5);
  }
  .rp-brand { margin-bottom: 18px; }
  .rp-title {
    margin: 0 0 10px;
    font-size: 26px;
    font-weight: 400;
    letter-spacing: -0.022em;
    line-height: 1.25;
    color: #1e1e20;
  }
  .rp-page[data-theme="dark"] .rp-title { color: #f5f5f7; }
  .rp-text {
    margin: 0 0 18px;
    font-size: 15px;
    line-height: 1.55;
    color: #5c5c62;
  }
  .rp-page[data-theme="dark"] .rp-text { color: rgba(245,245,247,0.68); }
  .rp-text strong { color: inherit; font-weight:400; }
  .rp-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }
  .rp-field span {
    font-size: 13px;
    font-weight:400;
    color: #5c5c62;
  }
  .rp-page[data-theme="dark"] .rp-field span { color: rgba(245,245,247,0.68); }
  .rp-field input {
    height: 48px;
    border-radius: 14px;
    border: 0;
    background: #F5F5F7;
    color: #1e1e20;
    padding: 0 14px;
    font: inherit;
    font-size: 15px;
    outline: none;
  }
  .rp-page[data-theme="dark"] .rp-field input {
    background: rgba(255,255,255,0.06);
    color: #f5f5f7;
  }
  .rp-error {
    margin: 0 0 12px;
    font-size: 13.5px;
    color: #c62828;
  }
  .rp-page[data-theme="dark"] .rp-error { color: #ff6961; }
  .rp-cta {
    width: 100%;
    height: 45px;
    margin-top: 8px;
    border-radius: 999px;
    border: 0.7px solid var(--festag-btn-dark-border, #e7ebf0);
    background: var(--festag-btn-dark-bg, #ffffff);
    color: var(--festag-btn-dark-fg, #1e1e20);
    font: inherit;
    font-size: 15px;
    font-weight:400;
    cursor: pointer;
  }
  .rp-page[data-theme="dark"] .rp-cta {
    background: rgba(255,255,255,0.06);
    color: rgba(245,245,247,0.85);
    border-color: transparent;
  }
  .rp-cta:disabled { opacity: 0.55; cursor: not-allowed; }
`
