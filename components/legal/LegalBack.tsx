'use client'

import { useRouter } from 'next/navigation'

export default function LegalBack() {
  const router = useRouter()

  return (
    <button
      type="button"
      className="legal-back"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) router.back()
        else router.push('/login')
      }}
    >
      ← Zurück
    </button>
  )
}
