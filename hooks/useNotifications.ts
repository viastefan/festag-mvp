'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Lightweight notifications inbox hook.
 *
 *   • Pulls the latest entries via /api/notifications
 *   • Subscribes to Postgres changes on `notifications` filtered by
 *     user_id, so new rows arrive instantly without polling.
 *   • Exposes mark-as-read helpers.
 *
 * Designed to be cheap: only one channel per user, the component that
 * mounts the hook can re-render at most once per second by virtue of
 * React batching.
 */

export type Notification = {
  id: string
  project_id: string | null
  task_id: string | null
  audience: string | null
  kind: string | null
  type?: string | null
  title: string
  body: string | null
  message?: string | null
  link: string | null
  payload: any
  read: boolean
  read_at: string | null
  created_at: string
}

type Options = {
  limit?: number
  projectId?: string
  unreadOnly?: boolean
}

export function useNotifications(opts: Options = {}) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const userIdRef = useRef<string | null>(null)

  const reload = useCallback(async () => {
    const params = new URLSearchParams()
    if (opts.limit) params.set('limit', String(opts.limit))
    if (opts.projectId) params.set('projectId', opts.projectId)
    if (opts.unreadOnly) params.set('unread', '1')
    const res = await fetch('/api/notifications' + (params.toString() ? `?${params}` : ''))
    if (!res.ok) { setLoading(false); return }
    const d = await res.json().catch(() => ({}))
    setItems(d?.notifications ?? [])
    setUnread(d?.unread ?? 0)
    setLoading(false)
  }, [opts.limit, opts.projectId, opts.unreadOnly])

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      userIdRef.current = user.id
      await reload()
      if (cancelled) return

      channel = supabase
        .channel(`notif:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            const n = payload.new as Notification
            if (opts.projectId && n.project_id !== opts.projectId) return
            setItems(prev => [n, ...prev].slice(0, opts.limit ?? 30))
            if (!n.read) setUnread(c => c + 1)
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            const n = payload.new as Notification
            setItems(prev => prev.map(it => it.id === n.id ? n : it))
            if (payload.old?.read === false && n.read === true) {
              setUnread(c => Math.max(0, c - 1))
            }
          },
        )
        .subscribe()
    })()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, reload, opts.projectId, opts.limit])

  const markRead = useCallback(async (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
    setUnread(c => Math.max(0, c - 1))
    await fetch('/api/notifications', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }, [])

  const markAllRead = useCallback(async () => {
    setItems(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })))
    setUnread(0)
    await fetch('/api/notifications', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
  }, [])

  return { items, unread, loading, reload, markRead, markAllRead }
}
