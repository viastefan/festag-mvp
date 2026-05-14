'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FestagLoader from '@/components/FestagLoader'

function RecoverInner() {
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

export default function AuthRecoverPage() {
  return (
    <Suspense fallback={<FestagLoader fullscreen label="Anmeldung wird abgeschlossen…" />}>
      <RecoverInner />
    </Suspense>
  )
}
