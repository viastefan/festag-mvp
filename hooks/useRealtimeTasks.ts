'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribe to `tasks` Postgres changes for one or more projects. Calls
 * `onChange` whenever any task in scope is inserted/updated/deleted.
 *
 * Intentionally simple: it doesn't fetch the row, it just lets the
 * component refetch its data. Server-side filtering is project-based,
 * so RLS still gates which rows the client actually sees.
 */
export function useRealtimeTasks(
  projectIds: string[] | null | undefined,
  onChange: (kind: 'INSERT' | 'UPDATE' | 'DELETE', row: any) => void,
) {
  const supabase = useMemo(() => createClient(), [])
  const key = (projectIds ?? []).slice().sort().join(',')

  useEffect(() => {
    if (!projectIds || projectIds.length === 0) return
    const channel = supabase
      .channel(`tasks:${key}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload: any) => {
        const row = payload.new ?? payload.old
        if (!row?.project_id) return
        if (!projectIds.includes(row.project_id)) return
        onChange(payload.eventType as any, row)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
