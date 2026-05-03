'use client'

import { useState, useEffect, useCallback } from 'react'

type SetupStatus = 'idle' | 'checking' | 'ready' | 'error'

interface SetupResult {
  status: SetupStatus
  error: string | null
  retry: () => void
}

const SESSION_KEY = 'rel_setup_done'

export function useRelationsSetup(): SetupResult {
  const [status, setStatus] = useState<SetupStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const runSetup = useCallback(async () => {
    // Check sessionStorage Cache
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(SESSION_KEY)
      if (cached === 'true') {
        setStatus('ready')
        return
      }
    }

    setStatus('checking')
    setError(null)

    try {
      const res = await fetch('/api/relations/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (res.ok && (data.status === 'ready' || data.status === 'partial')) {
        setStatus('ready')
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SESSION_KEY, 'true')
        }
      } else {
        const msg = data.error || data.message || 'Unbekannter Fehler beim Setup'
        setStatus('error')
        setError(msg)
        console.error('[useRelationsSetup] Fehler:', data)
      }
    } catch (err) {
      setStatus('error')
      setError(String(err))
      console.error('[useRelationsSetup] Netzwerkfehler:', err)
    }
  }, [])

  useEffect(() => {
    runSetup()
  }, [runSetup])

  return { status, error, retry: runSetup }
}
