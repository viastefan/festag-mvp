'use client'

/**
 * Shared Festag OS overview fetch — respects active workspace + switch events.
 * Paints instantly from a short-lived session cache, then refreshes in background.
 */

import { useCallback, useEffect, useState } from 'react'
import { getActiveWorkspaceId, WORKSPACE_SWITCHED_EVENT } from '@/lib/active-workspace'
import {
  WORKSPACE_CREATED_EVENT,
  WORKSPACE_RENAMED_EVENT,
  WORKSPACE_SETUP_DONE_EVENT,
  WORKSPACE_DELETED_EVENT,
  WORKSPACE_UPDATED_EVENT,
} from '@/lib/workspace-create-open'
import { PROJECT_CREATED_EVENT } from '@/lib/new-project-open'
import type { OverviewPayload } from '@/components/app-shell/WorkspaceOverviewLive'

export type WorkspaceOverviewState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; data: OverviewPayload }
  | { status: 'error' }

const CACHE_KEY = 'festag-os-overview-v2'
const CACHE_TTL_MS = 60_000

type CacheEntry = {
  at: number
  workspaceId: string | null
  payload: OverviewPayload
}

function readCache(workspaceId: string | null): OverviewPayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (!parsed?.payload?.workspace?.id) return null
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null
    if ((parsed.workspaceId || null) !== (workspaceId || null)) return null
    return parsed.payload
  } catch {
    return null
  }
}

function writeCache(workspaceId: string | null, payload: OverviewPayload) {
  try {
    const entry: CacheEntry = { at: Date.now(), workspaceId, payload }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch { /* quota / private mode */ }
}

function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY) } catch { /* noop */ }
}

function initialState(): WorkspaceOverviewState {
  if (typeof window === 'undefined') return { status: 'loading' }
  const cached = readCache(getActiveWorkspaceId())
  return cached ? { status: 'ready', data: cached } : { status: 'loading' }
}

export function useWorkspaceOverview(): {
  state: WorkspaceOverviewState
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<WorkspaceOverviewState>(initialState)

  const refresh = useCallback(async () => {
    try {
      const wsId = getActiveWorkspaceId()
      const qs = wsId ? `?workspaceId=${encodeURIComponent(wsId)}` : ''
      const res = await fetch(`/api/workspaces/overview${qs}`, { cache: 'no-store' })
      if (!res.ok) {
        setState((prev) => (prev.status === 'ready' ? prev : { status: 'error' }))
        return
      }
      const json = await res.json()
      if (!json?.workspace?.id) {
        clearCache()
        setState({ status: 'empty' })
        return
      }
      const data: OverviewPayload = {
        workspace: json.workspace,
        workspaces: json.workspaces || [],
        summary: json.summary,
        briefing: json.briefing,
        projects: json.projects || [],
        tasks: json.tasks || [],
        decisions: json.decisions || [],
        activity: json.activity || [],
        team: json.team || [],
      }
      writeCache(wsId, data)
      setState({ status: 'ready', data })
    } catch {
      setState((prev) => (prev.status === 'ready' ? prev : { status: 'error' }))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    function onChanged() {
      clearCache()
      setState({ status: 'loading' })
      void refresh()
    }
    function onSoftChanged() {
      void refresh()
    }
    window.addEventListener(WORKSPACE_CREATED_EVENT, onChanged)
    window.addEventListener(WORKSPACE_DELETED_EVENT, onChanged)
    window.addEventListener(WORKSPACE_SWITCHED_EVENT, onChanged)
    window.addEventListener(WORKSPACE_RENAMED_EVENT, onSoftChanged)
    window.addEventListener(WORKSPACE_SETUP_DONE_EVENT, onSoftChanged)
    window.addEventListener(PROJECT_CREATED_EVENT, onSoftChanged)
    window.addEventListener(WORKSPACE_UPDATED_EVENT, onSoftChanged)
    return () => {
      window.removeEventListener(WORKSPACE_CREATED_EVENT, onChanged)
      window.removeEventListener(WORKSPACE_DELETED_EVENT, onChanged)
      window.removeEventListener(WORKSPACE_SWITCHED_EVENT, onChanged)
      window.removeEventListener(WORKSPACE_RENAMED_EVENT, onSoftChanged)
      window.removeEventListener(WORKSPACE_SETUP_DONE_EVENT, onSoftChanged)
      window.removeEventListener(PROJECT_CREATED_EVENT, onSoftChanged)
      window.removeEventListener(WORKSPACE_UPDATED_EVENT, onSoftChanged)
    }
  }, [refresh])

  return { state, refresh }
}
