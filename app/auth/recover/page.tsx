'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FestagLoader from '@/components/FestagLoader'

/**
 * Client-side fallback for the magic-link callback when the server-side
 * PKCE exchange could not find the code_verifier cookie. This happens when
 * the user opens the email link on a different device than the one that
 * started the sign-in. Here we try the same exchange from the browser,
 * which still has the verifier in its own storage / cookies.
 *
 * Routes:
 *  - success -> /loading?next=... -> /onboarding or /dashboard
 *  - failure -> /login?error=link_expired (with a friendly retry message)
 */
export default function AuthRecoverPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const [stage, setStage] = useState<'verifying' | 'failed'>('verifying')
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    const code = params?.get('code')
    const next = params?.get('next') || '/loading'

    async function run() {
      if (!code) { setStage('failed'); return }
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) { setStage('failed'); return }
        // Persist device hint so we can recognise this browser next time
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user?.email) {
            localStorage.setItem('festag_last_email', user.email)
            localStorage.setItem('festag_last_method', 'email')
          }
        } catch {}
        router.replace(next)
      } catch {
        setStage('failed')
      }
    }
    run()
  }, [params, router, supabase])

  useEffect(() => {
    if (stage !== 'failed') return
    const t = setTimeout(() => {
      router.replace('/login?error=link_expired')
    }, 1400)
    return () => clearTimeout(t)
  }, [stage, router])

  return <FestagLoader fullscreen label={stage === 'failed' ? 'Link nicht mehr gültig…' : 'Anmeldung wird abgeschlossen…'} />
}
