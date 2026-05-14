'use client'

import { Suspense, useEffect, useRef } from 'react'
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

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const ranRef = useRef(false)

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

      try {
        const accessToken = fragment.get('access_token')
        const refreshToken = fragment.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          await finishAuthenticatedSession()
          return
        }

        const code = params?.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          await finishAuthenticatedSession()
          return
        }

        const tokenHash = params?.get('token_hash') || fragment.get('token_hash')
        const type = (params?.get('type') || fragment.get('type') || 'email') as OtpType
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
          if (error) throw error
          await finishAuthenticatedSession()
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await finishAuthenticatedSession()
          return
        }

        router.replace(errorTarget('auth_failed'))
      } catch (error: any) {
        const message = error?.message || 'link_expired'
        router.replace(errorTarget(message))
      }
    }

    run()
  }, [params, router])

  return <FestagLoader fullscreen label="Anmeldung wird abgeschlossen…" />
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<FestagLoader fullscreen label="Anmeldung wird abgeschlossen…" />}>
      <CallbackInner />
    </Suspense>
  )
}
