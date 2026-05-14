'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FestagLoader from '@/components/FestagLoader'

function LoadingInner() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const explicitNext = params?.get('next')
    let cancelled = false

    async function decide() {
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

export default function LoadingPage() {
  return (
    <Suspense fallback={<FestagLoader fullscreen label="Festag wird vorbereitet…" />}>
      <LoadingInner />
    </Suspense>
  )
}
