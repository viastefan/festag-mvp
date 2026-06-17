'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy job board — redirects to /dev/tasks (Tagro-backed execution hub).
 */
export default function DevJobsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dev/tasks')
  }, [router])
  return (
    <div style={{ padding: 48, color: 'var(--text-muted)', fontSize: 14 }}>
      Weiterleitung zu My Tasks…
    </div>
  )
}
