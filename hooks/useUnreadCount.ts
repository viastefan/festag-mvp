'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Live unread count for Benachrichtigungen (inbox_items).
 * Falls back to inbox_threads when items are unavailable.
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

      const { count: itemCount, error: itemError } = await supabase
        .from('inbox_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('category', 'team')
        .is('read_at', null)

      if (!itemError && itemCount != null) {
        if (!cancelled) setCount(itemCount)
        return
      }

      const { count: threadCount } = await supabase
        .from('inbox_threads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (!cancelled) setCount(threadCount ?? 0)
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
