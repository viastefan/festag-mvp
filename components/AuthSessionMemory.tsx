'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rememberFestagAccount, type FestagLoginMethod } from '@/lib/auth-device-memory'

function inferMethod(user: any): FestagLoginMethod {
  const provider = user?.app_metadata?.provider
  if (provider === 'google') return 'google'
  return 'email'
}

export default function AuthSessionMemory() {
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function syncUser(user: any) {
      if (!user || cancelled) return
      const { data: onboarding } = await supabase
        .from('onboarding_state')
        .select('completed_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return
      rememberFestagAccount({
        userId: user.id,
        email: user.email ?? null,
        method: inferMethod(user),
        onboardingCompleted: Boolean(onboarding?.completed_at),
      })
    }

    supabase.auth.getSession().then(({ data }) => syncUser(data.session?.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUser(session?.user)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  return null
}
