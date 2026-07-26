'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Live unread count for Benachrichtigungen (inbox_items).
 */
export function useUnreadCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    async function fetchCount(userId: string) {
      const { count: itemCount, error } = await supabase
        .from('inbox_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('category', 'team')
        .is('read_at', null)

      if (!cancelled) setCount(error ? 0 : (itemCount ?? 0))
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      await fetchCount(user.id)

      channel = supabase
        .channel(`unread-count-${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'inbox_items',
          filter: `user_id=eq.${user.id}`,
        }, () => { void fetchCount(user.id) })
        .subscribe()
    }

    void init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  return count
}
