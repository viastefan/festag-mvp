'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy full-page create route → Festag OS Overview + popup wizard.
 * Deep links and bookmarks keep working via ?create=1.
 */
export default function CreateWorkspacePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/overview?create=1')
  }, [router])

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #070708)',
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '2px solid rgba(168,176,188,.25)',
          borderTopColor: 'rgba(168,176,188,.9)',
          animation: 'cwspin .8s linear infinite',
        }}
      />
      <style>{`@keyframes cwspin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )
}
