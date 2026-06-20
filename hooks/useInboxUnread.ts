'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Unread count for Client Posteingang (inbox_items). */
export function useInboxUnread() {
  const supabase = useMemo(() => createClient(), [])
  const [unread, setUnread] = useState(0)

  const reload = useCallback(async () => {
    const res = await fetch('/api/inbox/items?limit=1', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json().catch(() => ({}))
    setUnread(Number(data.unread ?? 0))
  }, [])

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      await reload()
      if (cancelled) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel(`inbox-unread-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'inbox_items',
          filter: `user_id=eq.${user.id}`,
        }, payload => {
          const row = payload.new as { category?: string; read_at?: string | null }
          if (row.category === 'team') return
          if (!row.read_at) setUnread(c => c + 1)
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'inbox_items',
          filter: `user_id=eq.${user.id}`,
        }, () => { void reload() })
        .subscribe()
    })()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, reload])

  return { unread, reload }
}
