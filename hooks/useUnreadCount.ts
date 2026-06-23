'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Live unread count for Benachrichtigungen (inbox_threads).
 * Falls back to inbox_items when thread read is unavailable.
 */
export function useUnreadCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    async function fetchCount() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { count: threadCount, error } = await supabase
        .from('inbox_threads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (!error && threadCount != null) {
        if (!cancelled) setCount(threadCount)
        return
      }

      const res = await fetch('/api/inbox/items?limit=1', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      if (!cancelled) setCount(Number(data.unread ?? 0))
    }

    void fetchCount()

    channel = supabase
      .channel('unread-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inbox_threads',
      }, () => { void fetchCount() })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inbox_items',
      }, () => { void fetchCount() })
      .subscribe()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  return count
}
