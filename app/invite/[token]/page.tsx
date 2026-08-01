'use client'

/**
 * Invite landing — calm entry into Join Project.
 * Unauthenticated: register/login. Authenticated: accept → /join.
 */

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import { AUTH_OS_STYLES } from '@/components/auth/auth-os-styles'
import AuthSandAmbient from '@/components/auth/AuthSandAmbient'
import { prepareAuthRouteTransition } from '@/lib/auth-theme'
import { joinProjectHref } from '@/lib/platform/join'

type Info = {
  ok: boolean
  status?: string
  expired?: boolean
  projectTitle?: string | null
  inviterName?: string | null
  workspaceName?: string | null
  email?: string | null
}

function InviteAcceptInner() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [info, setInfo] = useState<Info | null>(null)
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [{ data: { session } }, res] = await Promise.all([
        supabase.auth.getSession(),
        fetch(`/api/invites/info?token=${encodeURIComponent(String(token || ''))}`)
          .then((r) => r.json())
          .catch(() => ({ ok: false })),
      ])
      if (cancelled) return
      setAuthed(!!session)
      setInfo(res as Info)
      setLoading(false)

      // Already signed in → Join Project immediately.
      if (session && (res as Info)?.ok && !(res as Info)?.expired) {
        prepareAuthRouteTransition(joinProjectHref({ token: String(token) }))
        router.replace(joinProjectHref({ token: String(token) }))
      }
    })()
    return () => { cancelled = true }
  }, [token, supabase, router])

  async function join() {
    setJoining(true)
    setError('')
    try {
      const res = await fetch('/api/invites/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(
          data?.error === 'invite-expired'
            ? 'Diese Einladung ist abgelaufen.'
            : 'Beitritt fehlgeschlagen.',
        )
        setJoining(false)
        return
      }
      prepareAuthRouteTransition(data.redirect || joinProjectHref({ token: String(token) }))
      router.replace(data.redirect || joinProjectHref({ token: String(token) }))
    } catch {
      setError('Netzwerkfehler.')
      setJoining(false)
    }
  }

  const goRegister = () => {
    const q = new URLSearchParams({ invite: String(token) })
    if (info?.email) q.set('email', info.email)
    prepareAuthRouteTransition('/register')
    router.push(`/register?${q.toString()}`)
  }
  const goLogin = () => {
    const q = new URLSearchParams({ invite: String(token) })
    if (info?.email) q.set('email', info.email)
    prepareAuthRouteTransition('/login')
    router.push(`/login?${q.toString()}`)
  }

  const title = info?.projectTitle
    ? `${info.projectTitle}.`
    : 'Du bist eingeladen.'
  const rest = info?.inviterName || info?.workspaceName
    ? ` Von ${info.inviterName || info.workspaceName}.`
    : ' Tritt dem Projekt bei.'

  return (
    <main className="al-root al-root--centered onb-sand-dark" data-theme="dark">
      <style>{AUTH_LANDING_STYLES}</style>
      <style>{AUTH_OS_STYLES}</style>
      <AuthSandAmbient variant="dev-onboarding" />
      <div className="al-container">
        <header className="al-header">
          <span className="al-wordmark" aria-label="Festag" role="img">
            <img
              className="al-wordmark-img al-wordmark-img--dark"
              src="/brand/festag-mark-fluid.png?v=20260731"
              alt=""
              aria-hidden="true"
            />
          </span>
        </header>
        <main className="al-main">
          <div className="al-desktop-stage al-desktop-stage--centered">
            <div className="al-desktop-left">
              <div className="al-mobile-sheet">
                <div className="al-sheet-body">
                  <section className="al-signin" aria-label="Einladung">
                    {loading ? (
                      <p className="al-hint" style={{ opacity: 0.55 }}>Einladung wird geladen…</p>
                    ) : !info?.ok || info?.expired ? (
                      <>
                        <div className="al-hero-copy">
                          <h1 className="al-title al-title-display">
                            Einladung nicht verfügbar.
                          </h1>
                        </div>
                        <p className="al-hint" style={{ marginTop: 12, opacity: 0.55 }}>
                          Bitte um einen neuen Link.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="al-hero-copy">
                          <h1 className="al-title al-title-display onb-hero-line">
                            <span className="onb-hero-lead">{title}</span>
                            <span className="al-hero-gray">{rest}</span>
                          </h1>
                          <p className="al-os-support">
                            Ein Workspace. Eine Wahrheit. Weiter mit Festag.
                          </p>
                        </div>
                        <div className="al-signin-stack" style={{ marginTop: 28 }}>
                          {error ? <p className="al-error" role="alert">{error}</p> : null}
                          {authed ? (
                            <button
                              type="button"
                              className="al-btn al-btn-primary al-btn-primary--ready"
                              disabled={joining}
                              onClick={() => void join()}
                            >
                              {joining ? 'Öffne…' : 'Weiter'}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="al-btn al-btn-primary al-btn-primary--ready"
                                onClick={goRegister}
                              >
                                Konto erstellen
                              </button>
                              <button
                                type="button"
                                className="al-btn al-btn-secondary"
                                style={{ marginTop: 10 }}
                                onClick={goLogin}
                              >
                                Ich habe schon ein Konto
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
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

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <main className="al-root onb-sand-dark" data-theme="dark" style={{ minHeight: '100dvh' }}>
          <style>{AUTH_LANDING_STYLES}</style>
      <style>{AUTH_OS_STYLES}</style>
        </main>
      }
    >
      <InviteAcceptInner />
    </Suspense>
  )
}
