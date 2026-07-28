'use client'

/**
 * Soft-deprecated mobile overflow page.
 *
 * Mobile destination nav is CodexMobileActionPill → MobileNavSheet.
 * Keep the route so old bookmarks / Sidebar links do not 404.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MorePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <div
      style={{
        padding: 'calc(24px + env(safe-area-inset-top, 0px)) 20px',
        color: 'var(--text-muted, #8891a0)',
        fontSize: 14,
      }}
    >
      Weiterleitung…
    </div>
  )
}
