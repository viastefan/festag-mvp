'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function DevJobsRedirectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    const qs = searchParams?.toString()
    router.replace(qs ? `/dev/tasks?${qs}` : '/dev/tasks')
  }, [router, searchParams])
  return (
    <div style={{ padding: 48, color: 'var(--text-muted)', fontSize: 14 }}>
      Weiterleitung zu My Tasks…
    </div>
  )
}

/**
 * Legacy job board — redirects to /dev/tasks (Tagro-backed execution hub).
 */
export default function DevJobsRedirectPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--text-muted)', fontSize: 14 }}>Weiterleitung…</div>}>
      <DevJobsRedirectInner />
    </Suspense>
  )
}
