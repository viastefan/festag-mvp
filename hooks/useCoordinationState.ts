'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CoordinationState } from '@/lib/delivery/coordination-types'

export function useCoordinationState(projectId?: string | null, taskId?: string | null) {
  const [state, setState] = useState<CoordinationState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!projectId) {
      setState(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ projectId })
      if (taskId) qs.set('taskId', taskId)
      const res = await fetch(`/api/delivery/coordinate/state?${qs}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Laden fehlgeschlagen')
        setState(null)
        return
      }
      setState(data.state ?? null)
    } catch {
      setError('Netzwerkfehler')
      setState(null)
    } finally {
      setLoading(false)
    }
  }, [projectId, taskId])

  useEffect(() => { void reload() }, [reload])

  return { state, loading, error, reload }
}
