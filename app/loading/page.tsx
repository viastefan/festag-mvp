'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FestagLoader from '@/components/FestagLoader'

/**
 * Transitional loader page shown:
 * - after email PIN entry / magic-link verification
 * - between auth callback and onboarding/dashboard
 *
 * Optional `?next=/route` decides where to go after the session is confirmed.
 * If a session exists, we look up onboarding state and route to /onboarding
 * (incomplete) or /dashboard (done).
 */
export default function LoadingPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const explicitNext = params?.get('next')
    let cancelled = false

    async function decide() {
      // Small minimum hold so the loader feels intentional, not glitchy.
      const start = Date.now()
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      let target = '/login'
      if (session) {
        if (explicitNext && explicitNext.startsWith('/') && !explicitNext.startsWith('//')) {
          target = explicitNext
        } else {
          const { data: onb } = await supabase
            .from('onboarding_state')
            .select('completed_at')
            .eq('user_id', session.user.id)
            .maybeSingle()
          target = onb?.completed_at ? '/dashboard' : '/onboarding'
        }
      }

      const elapsed = Date.now() - start
      const hold = Math.max(0, 900 - elapsed)
      setTimeout(() => { if (!cancelled) router.replace(target) }, hold)
    }

    decide()
    return () => { cancelled = true }
  }, [router, supabase, params])

  return <FestagLoader fullscreen label="Festag wird vorbereitet…" />
}
