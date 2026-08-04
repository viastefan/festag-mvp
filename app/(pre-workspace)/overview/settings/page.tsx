'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** OS Settings entry → full settings workspace (all sections). */
export default function OverviewSettingsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/settings')
  }, [router])
  return null
}
