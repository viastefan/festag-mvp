'use client'

/**
 * Shared live workspace-name uniqueness for AuthLanding + create-workspace.
 */
import { useEffect, useRef, useState } from 'react'
import {
  normalizeWorkspaceName,
  rememberWorkspaceName,
  setPendingWorkspaceName,
} from '@/lib/pending-workspace'

export type WorkspaceNameAvailabilityState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'

export type UseWorkspaceNameFieldOpts = {
  /** Debounce ms for /api/workspaces/check-name (default 220). */
  debounceMs?: number
  /** When false, skip live checks (e.g. invite signup). */
  enabled?: boolean
  /** Exclude workspace id on rename flows. */
  excludeId?: string | null
}

export function useWorkspaceNameField(opts: UseWorkspaceNameFieldOpts = {}) {
  const { debounceMs = 220, enabled = true, excludeId = null } = opts
  const [workspaceName, setWorkspaceNameState] = useState('')
  const [availability, setAvailability] = useState<WorkspaceNameAvailabilityState>('idle')
  const [availabilityMsg, setAvailabilityMsg] = useState('')
  const checkSeq = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayName = normalizeWorkspaceName(workspaceName)
  const ready = availability === 'available' && !!displayName

  async function checkAvailability(raw: string): Promise<{ ok: boolean; reason?: string }> {
    const trimmed = normalizeWorkspaceName(raw)
    const seq = ++checkSeq.current
    if (!trimmed) {
      setAvailability('idle')
      setAvailabilityMsg('')
      return { ok: false, reason: 'Bitte einen Workspace-Namen eingeben.' }
    }
    setAvailability('checking')
    setAvailabilityMsg('')
    try {
      const qs = new URLSearchParams({ name: trimmed })
      if (excludeId) qs.set('excludeId', excludeId)
      const res = await fetch(`/api/workspaces/check-name?${qs.toString()}`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (seq !== checkSeq.current) return { ok: false }
      if (!data?.ok) {
        const reason = 'Prüfung nicht möglich.'
        setAvailability('invalid')
        setAvailabilityMsg(reason)
        return { ok: false, reason }
      }
      if (data.available) {
        setAvailability('available')
        setAvailabilityMsg('')
        setPendingWorkspaceName(trimmed)
        rememberWorkspaceName(trimmed)
        return { ok: true }
      }
      const reason = 'Bereits vergeben'
      setAvailability('taken')
      setAvailabilityMsg(reason)
      return { ok: false, reason: 'Dieser Workspace-Name ist bereits vergeben.' }
    } catch {
      if (seq !== checkSeq.current) return { ok: false }
      const reason = 'Prüfung nicht möglich.'
      setAvailability('invalid')
      setAvailabilityMsg(reason)
      return { ok: false, reason }
    }
  }

  function setWorkspaceName(nextRaw: string) {
    const next = nextRaw.slice(0, 64)
    setWorkspaceNameState(next)
    const trimmed = normalizeWorkspaceName(next)
    if (trimmed) {
      setPendingWorkspaceName(trimmed)
      if (enabled) {
        setAvailability('checking')
        setAvailabilityMsg('')
      }
    } else {
      setPendingWorkspaceName('')
      setAvailability('idle')
      setAvailabilityMsg('')
    }
  }

  function hydrate(seed: string) {
    const next = normalizeWorkspaceName(seed)
    if (!next) return
    setWorkspaceNameState(next)
    rememberWorkspaceName(next)
  }

  useEffect(() => {
    if (!enabled) return
    const trimmed = normalizeWorkspaceName(workspaceName)
    if (!trimmed) return
    const t = window.setTimeout(() => {
      void checkAvailability(trimmed)
    }, debounceMs)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceName, enabled, excludeId, debounceMs])

  return {
    workspaceName,
    displayName,
    availability,
    availabilityMsg,
    ready,
    inputRef,
    setWorkspaceName,
    hydrate,
    checkAvailability,
  }
}
