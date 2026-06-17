'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type InboxFeedItem = {
  id: string
  thread_id: string
  user_id: string
  project_id: string | null
  category: string
  type: string
  title: string
  body: string | null
  metadata: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

export type InboxProject = { title: string; color: string | null }

/** Client Posteingang — structured inbox_items (Visibility Layer). */
export function useClientInboxFeed(enabled = true) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<InboxFeedItem[]>([])
  const [projects, setProjects] = useState<Record<string, InboxProject>>({})
  const [loading, setLoading] = useState(true)
  const [unreadTotal, setUnreadTotal] = useState(0)

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const res = await fetch('/api/inbox/items?limit=120', { cache: 'no-store' })
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      setItems((data.items ?? []) as InboxFeedItem[])
      setProjects((data.projects ?? {}) as Record<string, InboxProject>)
      setUnreadTotal(Number(data.unread ?? 0))
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!enabled) return
    let userId: string | null = null
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      userId = session?.user.id ?? null
      if (!userId) return

      channel = supabase
        .channel(`client-inbox-${userId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'inbox_items',
          filter: `user_id=eq.${userId}`,
        }, payload => {
          const row = payload.new as InboxFeedItem
          if (row.category === 'team') return
          setItems(prev => [row, ...prev.filter(i => i.id !== row.id)])
          if (!row.read_at) setUnreadTotal(c => c + 1)
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'inbox_items',
          filter: `user_id=eq.${userId}`,
        }, payload => {
          const row = payload.new as InboxFeedItem
          setItems(prev => prev.map(i => i.id === row.id ? row : i))
        })
        .subscribe()
    })()

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [supabase, enabled])

  const markRead = useCallback(async (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, read_at: new Date().toISOString() } : i))
    setUnreadTotal(c => Math.max(0, c - 1))
    await fetch('/api/inbox/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => undefined)
  }, [])

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString()
    setItems(prev => prev.map(i => ({ ...i, read_at: i.read_at ?? now })))
    setUnreadTotal(0)
    await fetch('/api/inbox/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => undefined)
  }, [])

  return { items, projects, loading, unreadTotal, load, markRead, markAllRead }
}

/** Dev Execution Inbox — notifications table (Human Execution Layer). */
export function useDevExecutionFeed(enabled = true) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<InboxFeedItem[]>([])
  const [projects, setProjects] = useState<Record<string, InboxProject>>({})
  const [loading, setLoading] = useState(true)
  const [unreadTotal, setUnreadTotal] = useState(0)

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const res = await fetch('/api/dev/execution-inbox?limit=200', { cache: 'no-store' })
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      setItems((data.items ?? []) as InboxFeedItem[])
      setProjects((data.projects ?? {}) as Record<string, InboxProject>)
      setUnreadTotal(Number(data.unread ?? 0))
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!enabled) return
    let userId: string | null = null
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      userId = session?.user.id ?? null
      if (!userId) return

      channel = supabase
        .channel(`dev-execution-inbox-${userId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, payload => {
          const n = payload.new as Record<string, unknown>
          const row: InboxFeedItem = {
            id: String(n.id),
            thread_id: String(n.id),
            user_id: String(n.user_id),
            project_id: (n.project_id as string) ?? null,
            category: 'execution',
            type: String(n.kind ?? n.type ?? ''),
            title: String(n.title ?? 'Update'),
            body: (n.body ?? n.message) as string | null,
            metadata: {
              kind: n.kind ?? n.type,
              link: n.link,
              task_id: n.task_id,
              notification_id: n.id,
              source_label: 'Festag Ops',
              ...(n.payload as Record<string, unknown> ?? {}),
            },
            read_at: n.read ? String(n.read_at ?? n.created_at) : null,
            created_at: String(n.created_at),
          }
          setItems(prev => [row, ...prev.filter(i => i.id !== row.id)])
          if (!row.read_at) setUnreadTotal(c => c + 1)
        })
        .subscribe()
    })()

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [supabase, enabled])

  const markRead = useCallback(async (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, read_at: new Date().toISOString() } : i))
    setUnreadTotal(c => Math.max(0, c - 1))
    await fetch('/api/dev/execution-inbox', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => undefined)
  }, [])

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString()
    setItems(prev => prev.map(i => ({ ...i, read_at: i.read_at ?? now })))
    setUnreadTotal(0)
    await fetch('/api/dev/execution-inbox', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => undefined)
  }, [])

  return { items, projects, loading, unreadTotal, load, markRead, markAllRead }
}
