'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import FestagLoader from '@/components/FestagLoader'
import { createClient } from '@/lib/supabase/client'
import { rememberFestagAccount, type FestagLoginMethod } from '@/lib/auth-device-memory'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'

type OtpType = 'email' | 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change'

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/loading'
  return value
}

function inferMethod(user: any): FestagLoginMethod {
  return user?.app_metadata?.provider === 'google' ? 'google' : 'email'
}

function hashParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.hash.replace(/^#/, ''))
}

function errorTarget(message = 'auth_failed') {
  return `/login?error=${encodeURIComponent(message)}`
}

type Mode = 'auto' | 'confirm' | 'verifying' | 'error'

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const ranRef = useRef(false)
  const [mode, setMode] = useState<Mode>('auto')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const supabase = createClient()
    const next = safeRedirectPath(params?.get('next'))

    async function finishAuthenticatedSession() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error('missing_session')

      await supabase
        .from('onboarding_state')
        .upsert({ user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

      const target = await resolvePostAuthTarget(supabase, user.id)
      rememberFestagAccount({
        userId: user.id,
        email: user.email ?? null,
        method: inferMethod(user),
        onboardingCompleted: target === '/dashboard',
      })

      const resolvedTarget = target === '/dashboard' && next !== '/loading' && next !== '/onboarding'
        ? next
        : target
      router.replace(resolvedTarget)
    }

    async function verifyTokenHash(tokenHash: string, type: OtpType) {
      setMode('verifying')
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (error) {
        setErrorMessage(error.message || 'link_expired')
        setMode('error')
        return
      }
      try {
        await finishAuthenticatedSession()
      } catch (e: any) {
        setErrorMessage(e?.message || 'auth_failed')
        setMode('error')
      }
    }

    async function run() {
      const fragment = hashParams()
      const providerError =
        params?.get('error_description') ||
        params?.get('error') ||
        fragment.get('error_description') ||
        fragment.get('error')

      if (providerError) {
        router.replace(errorTarget(providerError))
        return
      }

      // Hash tokens (implicit flow) — safe to auto-consume: hash fragment
      // is never sent to the server, so link scanners cannot observe it.
      const accessToken = fragment.get('access_token')
      const refreshToken = fragment.get('refresh_token')
      if (accessToken && refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          await finishAuthenticatedSession()
        } catch (e: any) {
          router.replace(errorTarget(e?.message || 'auth_failed'))
        }
        return
      }

      // PKCE flow — code is locked to the browser's code_verifier in
      // localStorage. Mail scanners do not hold the verifier so they
      // cannot redeem the code. Safe to auto-exchange here.
      const code = params?.get('code')
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          await finishAuthenticatedSession()
        } catch (e: any) {
          router.replace(errorTarget(e?.message || 'auth_failed'))
        }
        return
      }

      // OTP token_hash — single-use. Mail providers and security scanners
      // routinely prefetch/preview email links and would silently burn the
      // token before the human ever clicks. Hold here and wait for an
      // explicit click before redeeming.
      const tokenHash = params?.get('token_hash') || fragment.get('token_hash')
      const type = (params?.get('type') || fragment.get('type') || 'email') as OtpType
      if (tokenHash) {
        // already-authenticated visit (e.g. opened link in the same browser
        // after signing in elsewhere) — just route through.
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          try { await finishAuthenticatedSession() } catch { /* fall through */ }
          return
        }

        // Stash for the click handler.
        ;(window as any).__festagPendingOtp = { tokenHash, type, verify: verifyTokenHash }
        setMode('confirm')
        return
      }

      // Last-chance fallback: maybe the session was set out-of-band.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        try { await finishAuthenticatedSession() } catch {
          router.replace(errorTarget('auth_failed'))
        }
        return
      }

      router.replace(errorTarget('auth_failed'))
    }

    run()
  }, [params, router])

  if (mode === 'error') {
    return (
      <main className="cb-page">
        <style>{CB_CSS}</style>
        <div className="cb-card">
          <p className="cb-brand">festag</p>
          <h1 className="cb-title">Link nicht mehr gültig</h1>
          <p className="cb-text">
            Dieser Anmeldelink ist nicht mehr gültig oder wurde schon verwendet.
            Fordere einfach einen neuen Code an, dann geht es weiter.
          </p>
          <button
            className="cb-btn"
            type="button"
            onClick={() => router.replace(errorTarget(errorMessage || 'link_expired'))}
          >
            Zur Anmeldung
          </button>
        </div>
      </main>
    )
  }

  if (mode === 'confirm') {
    return (
      <main className="cb-page">
        <style>{CB_CSS}</style>
        <div className="cb-card">
          <p className="cb-brand">festag</p>
          <h1 className="cb-title">Anmeldung bestätigen</h1>
          <p className="cb-text">
            Tippe einmal auf den Button, um dich sicher anzumelden.
          </p>
          <button
            className="cb-btn"
            type="button"
            autoFocus
            onClick={() => {
              const pending = (window as any).__festagPendingOtp
              if (pending?.verify) pending.verify(pending.tokenHash, pending.type)
            }}
          >
            Jetzt anmelden
          </button>
          <p className="cb-foot">Du wirst direkt zu deinem Dashboard weitergeleitet.</p>
        </div>
      </main>
    )
  }

  return <FestagLoader fullscreen label={mode === 'verifying' ? 'Anmeldung wird abgeschlossen…' : 'Wir prüfen deinen Link…'} />
}

const CB_CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  .cb-page{min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#FCFCFD;padding:24px;font-family:var(--font-aeonik,'Aeonik',Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif);-webkit-font-smoothing:antialiased;color:#202532;}
  .cb-card{width:271px;display:flex;flex-direction:column;gap:18px;align-items:stretch;text-align:center;transform:translateY(14px);}
  .cb-brand{font-family:'Qurova DEMO',Georgia,serif;font-size:24px;font-weight:500;letter-spacing:-0.2px;margin-bottom:16px;color:#202532;}
  .cb-title{font-size:21px;font-weight:500;letter-spacing:0.21px;line-height:1.25;color:#202532;}
  .cb-text{font-size:14px;line-height:1.55;color:#7B8294;margin-bottom:4px;font-weight:400;}
  .cb-btn{appearance:none;width:100%;height:47px;background:#5b647d;color:#fff;border:none;border-radius:32px;padding:0 24px;font-family:inherit;font-size:14px;font-weight:500;letter-spacing:0.14px;cursor:default;transition:background .15s,transform .15s;box-shadow:0px 8px 24px 0px rgba(200,169,91,0.14);}
  .cb-btn:hover{background:#505870;}
  .cb-btn:active{transform:scale(0.98);}
  .cb-foot{margin-top:0;font-size:12px;color:#98A2B3;line-height:1.5;font-weight:400;}
  @media (prefers-color-scheme: dark){.cb-page{background:#0A0E14;color:#E8E8E5}.cb-brand,.cb-title{color:#E8E8E5}.cb-text{color:#98A2B3}.cb-btn{background:#E8E8E5;color:#0A0E14;box-shadow:none}.cb-btn:hover{background:#F3F5F7}.cb-foot{color:#7B8294}}
`

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<FestagLoader fullscreen label="Anmeldung wird abgeschlossen…" />}>
      <CallbackInner />
    </Suspense>
  )
}
