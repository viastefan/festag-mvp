'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { applyAuthTheme } from '@/lib/auth-theme'
import FestagLoader from '@/components/FestagLoader'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import { AUTH_OS_STYLES } from '@/components/auth/auth-os-styles'
import AuthSandAmbient from '@/components/auth/AuthSandAmbient'
import AuthGlassyHero, { AUTH_GLASSY_HERO_CSS } from '@/components/auth/AuthGlassyHero'

function ResetPasswordInner() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    applyAuthTheme('dark', 'client')
  }, [])

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

  const ready = password.length >= 8 && password === confirm

  return (
    <main className="al-root al-root--centered onb-sand-dark" data-theme="dark" data-auth-mode="login">
      <style>{AUTH_LANDING_STYLES}</style>
      <style>{AUTH_OS_STYLES}</style>
      <style>{AUTH_GLASSY_HERO_CSS}</style>
      <AuthSandAmbient variant="dev-onboarding" />

      <div className="al-container">
        <header className="al-header">
          <span className="al-wordmark" aria-label="Festag" role="img">
            <img
              className="al-wordmark-img al-wordmark-img--dark"
              src="/brand/festag-mark-fluid.png?v=20260731"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
            />
          </span>
        </header>

        <main className="al-main">
          <div className="al-desktop-stage al-desktop-stage--centered">
            <div className="al-desktop-left">
              <div className="al-mobile-sheet">
                <div className="al-sheet-body">
                  <section className="al-signin" aria-label="Passwort zurücksetzen">
                    <div className="al-signin-head">
                      <div className="al-hero-copy">
                        <AuthGlassyHero
                          animKey={done ? 'rp-done' : 'rp'}
                          lead={done ? 'Alles bereit.' : 'Neues Passwort.'}
                        />
                      </div>
                    </div>
                    <div className="al-content">
                      <div className="al-signin-stack">
                        {done ? (
                          <p className="al-t1">Du wirst weitergeleitet…</p>
                        ) : (
                          <form
                            className="al-method-group"
                            onSubmit={(e) => {
                              e.preventDefault()
                              void submit()
                            }}
                          >
                            {email ? (
                              <p className="al-t1">Für {email}</p>
                            ) : null}
                            <input
                              className="al-input"
                              type="password"
                              autoComplete="new-password"
                              placeholder="Neues Passwort"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              disabled={busy}
                              autoFocus
                            />
                            <input
                              className="al-input"
                              type="password"
                              autoComplete="new-password"
                              placeholder="Passwort bestätigen"
                              value={confirm}
                              onChange={(e) => setConfirm(e.target.value)}
                              disabled={busy}
                            />
                            {error ? <p className="al-error" role="alert">{error}</p> : null}
                            <button
                              type="submit"
                              className={`al-btn al-btn-primary${ready ? ' al-btn-primary--ready' : ''}`}
                              disabled={busy || !ready}
                            >
                              {busy ? 'Wird gespeichert…' : 'Passwort speichern'}
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<FestagLoader fullscreen label="Lädt…" />}>
      <ResetPasswordInner />
    </Suspense>
  )
}
