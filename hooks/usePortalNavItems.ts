'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  portalNavItemsForViewMode,
  type PortalNavItem,
  type PortalWorkspaceMode,
} from '@/lib/portal-nav'
import {
  DEFAULT_WORKSPACE_MODE,
  loadWorkspaceMode,
  onWorkspaceModeChange,
  type WorkspaceMode,
} from '@/lib/workspace-mode'
import { onWorkspaceDbModeChange } from '@/lib/sidebar-prefs'

const DEFAULT_WS_MODE: PortalWorkspaceMode = 'delivery'

/**
 * Workspace-aware portal navigation — sidebar + mobile sheet share this hook.
 */
export function usePortalNavItems(): {
  items: PortalNavItem[]
  wsMode: PortalWorkspaceMode
  operatingMode: WorkspaceMode
  profileRole: string | null
  loaded: boolean
} {
  const [wsMode, setWsMode] = useState<PortalWorkspaceMode>(DEFAULT_WS_MODE)
  const [operatingMode, setOperatingMode] = useState<WorkspaceMode>(DEFAULT_WORKSPACE_MODE)
  const [profileRole, setProfileRole] = useState<string | null>(null)
  const [symbolKey, setSymbolKey] = useState('festag')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    return onWorkspaceDbModeChange(m => setWsMode(m))
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const u = sessionData.session?.user
        if (!u || !alive) {
          setLoaded(true)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', u.id)
          .maybeSingle()

        const { data: ws } = await supabase
          .from('workspaces')
          .select('id, name, mode')
          .eq('primary_owner_id', u.id)
          .eq('is_personal', true)
          .maybeSingle()

        if (!alive) return

        const role = (profile as { role?: string } | null)?.role ?? null
        setProfileRole(role)

        const mode = (ws as { mode?: string } | null)?.mode
        if (mode === 'team' || mode === 'agency' || mode === 'delivery') {
          setWsMode(mode)
        }

        const wn = typeof (ws as { name?: string } | null)?.name === 'string'
          ? (ws as { name: string }).name.trim()
          : ''
        const key = (wn || mode || u.email || 'festag').trim().toLowerCase()
        setSymbolKey(key)
        setOperatingMode(loadWorkspaceMode(key))
      } catch {
        /* noop */
      } finally {
        if (alive) setLoaded(true)
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const off = onWorkspaceModeChange((key, mode) => {
      if (key === symbolKey) setOperatingMode(mode)
    })
    return off
  }, [symbolKey])

  const items = useMemo(
    () => portalNavItemsForViewMode(wsMode, operatingMode, profileRole),
    [wsMode, operatingMode, profileRole],
  )

  return { items, wsMode, operatingMode, profileRole, loaded }
}
