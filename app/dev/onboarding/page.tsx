'use client'

/**
 * Legacy /dev/onboarding → Build Projects (`/onboarding`).
 * Preserves query (?step=, ?preview=, invite flags) for mid-flow resume.
 */

import { useEffect } from 'react'
import { applyAuthTheme } from '@/lib/auth-theme'

export default function LegacyDevOnboardingRedirect() {
  useEffect(() => {
    applyAuthTheme('dark', 'dev')
    const qs = typeof window !== 'undefined' ? window.location.search : ''
    window.location.replace(`/onboarding${qs}`)
  }, [])

  return (
    <main
      data-theme="dark"
      style={{
        minHeight: '100dvh',
        background: '#070708',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '2px solid rgba(168,176,188,.25)',
          borderTopColor: 'rgba(168,176,188,.9)',
          animation: 'alboot .8s linear infinite',
        }}
      />
      <style>{`@keyframes alboot{to{transform:rotate(360deg)}}`}</style>
    </main>
  )
}
