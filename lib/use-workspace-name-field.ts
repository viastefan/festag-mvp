'use client'

/**
 * Shared live workspace-name uniqueness for AuthLanding + create-workspace.
 */
import { useEffect, useRef, useState } from 'react'
import {
  normalizeWorkspaceName,
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
  const [confirmedSlug, setConfirmedSlug] = useState('')
  const checkSeq = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayName = normalizeWorkspaceName(workspaceName)
  const ready = availability === 'available' && !!displayName && !!confirmedSlug

  async function checkAvailability(raw: string): Promise<{ ok: boolean; reason?: string }> {
    const trimmed = normalizeWorkspaceName(raw)
    const seq = ++checkSeq.current
    if (!trimmed) {
      setAvailability('idle')
      setAvailabilityMsg('')
      setConfirmedSlug('')
      return { ok: false, reason: 'Bitte einen Workspace-Namen eingeben.' }
    }
    setAvailability('checking')
    setAvailabilityMsg('')
    setConfirmedSlug('')
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
        setConfirmedSlug('')
        return { ok: false, reason }
      }
      if (data.available) {
        const slug = typeof data.slug === 'string' ? data.slug : ''
        setAvailability('available')
        setAvailabilityMsg('')
        setConfirmedSlug(slug)
        setPendingWorkspaceName(trimmed)
        return { ok: true }
      }
      const reason = 'Bereits vergeben'
      setAvailability('taken')
      setAvailabilityMsg(reason)
      setConfirmedSlug('')
      return { ok: false, reason: 'Dieser Workspace-Name ist bereits vergeben.' }
    } catch {
      if (seq !== checkSeq.current) return { ok: false }
      const reason = 'Prüfung nicht möglich.'
      setAvailability('invalid')
      setAvailabilityMsg(reason)
      setConfirmedSlug('')
      return { ok: false, reason }
    }
  }

  function setWorkspaceName(nextRaw: string) {
    const next = normalizeWorkspaceName(nextRaw)
    setWorkspaceNameState(next)
    const trimmed = next
    if (trimmed) {
      setPendingWorkspaceName(trimmed)
      if (enabled) {
        setAvailability('checking')
        setAvailabilityMsg('')
        setConfirmedSlug('')
      }
    } else {
      setPendingWorkspaceName('')
      setAvailability('idle')
      setAvailabilityMsg('')
      setConfirmedSlug('')
    }
  }

  function hydrate(seed: string) {
    const next = normalizeWorkspaceName(seed)
    if (!next) return
    setWorkspaceNameState(next)
    setPendingWorkspaceName(next)
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
    confirmedSlug,
    ready,
    inputRef,
    setWorkspaceName,
    hydrate,
    checkAvailability,
  }
}
