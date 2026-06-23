'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/** Legacy route — canonical Benachrichtigungen is /benachrichtigungen. */
export default function MessagesRedirectPage() {
  return (
    <Suspense fallback={null}>
      <MessagesRedirectInner />
    </Suspense>
  )
}

function MessagesRedirectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const q = searchParams.toString()
    router.replace(q ? `/benachrichtigungen?${q}` : '/benachrichtigungen')
  }, [router, searchParams])

  return null
}
