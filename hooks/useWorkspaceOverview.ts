'use client'

/**
 * Shared Festag OS overview fetch — respects active workspace + switch events.
 */

import { useCallback, useEffect, useState } from 'react'
import { getActiveWorkspaceId, WORKSPACE_SWITCHED_EVENT } from '@/lib/active-workspace'
import {
  WORKSPACE_CREATED_EVENT,
  WORKSPACE_RENAMED_EVENT,
  WORKSPACE_SETUP_DONE_EVENT,
} from '@/lib/workspace-create-open'
import { PROJECT_CREATED_EVENT } from '@/lib/new-project-open'
import type { OverviewPayload } from '@/components/app-shell/WorkspaceOverviewLive'

export type WorkspaceOverviewState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; data: OverviewPayload }
  | { status: 'error' }

export function useWorkspaceOverview(): {
  state: WorkspaceOverviewState
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<WorkspaceOverviewState>({ status: 'loading' })

  const refresh = useCallback(async () => {
    try {
      const wsId = getActiveWorkspaceId()
      const qs = wsId ? `?workspaceId=${encodeURIComponent(wsId)}` : ''
      const res = await fetch(`/api/workspaces/overview${qs}`, { cache: 'no-store' })
      if (!res.ok) {
        setState({ status: 'error' })
        return
      }
      const json = await res.json()
      if (!json?.workspace?.id) {
        setState({ status: 'empty' })
        return
      }
      setState({
        status: 'ready',
        data: {
          workspace: json.workspace,
          workspaces: json.workspaces || [],
          summary: json.summary,
          briefing: json.briefing,
          projects: json.projects || [],
          tasks: json.tasks || [],
          decisions: json.decisions || [],
          activity: json.activity || [],
          team: json.team || [],
        },
      })
    } catch {
      setState({ status: 'error' })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    function onChanged() {
      void refresh()
    }
    window.addEventListener(WORKSPACE_CREATED_EVENT, onChanged)
    window.addEventListener(WORKSPACE_RENAMED_EVENT, onChanged)
    window.addEventListener(WORKSPACE_SETUP_DONE_EVENT, onChanged)
    window.addEventListener(PROJECT_CREATED_EVENT, onChanged)
    window.addEventListener(WORKSPACE_SWITCHED_EVENT, onChanged)
    return () => {
      window.removeEventListener(WORKSPACE_CREATED_EVENT, onChanged)
      window.removeEventListener(WORKSPACE_RENAMED_EVENT, onChanged)
      window.removeEventListener(WORKSPACE_SETUP_DONE_EVENT, onChanged)
      window.removeEventListener(PROJECT_CREATED_EVENT, onChanged)
      window.removeEventListener(WORKSPACE_SWITCHED_EVENT, onChanged)
    }
  }, [refresh])

  return { state, refresh }
}
