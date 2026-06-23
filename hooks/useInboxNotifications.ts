'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification, NotificationCategory } from '@/types/notification'

type InboxRow = {
  id: string
  thread_id: string
  project_id: string | null
  category: string
  title: string
  body: string | null
  metadata: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

function mapCategory(row: InboxRow): NotificationCategory {
  const meta = row.metadata ?? {}
  if (meta.via === 'client_reply' || meta.category_label === 'Kunde') return 'Kunde'
  if (row.category === 'billing') return 'Rechnung'
  if (row.category === 'tagro') return 'Tagro'
  return 'Projekt'
}

function mapRow(row: InboxRow, projects: Record<string, { title: string }>): Notification {
  const meta = row.metadata ?? {}
  const category = mapCategory(row)
  const preview = (row.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
  const projectName = row.project_id ? projects[row.project_id]?.title : undefined

  return {
    id: row.id,
    title: row.title,
    preview: preview || row.title,
    category,
    read: !!row.read_at,
    created_at: row.created_at,
    project_id: row.project_id,
    thread_id: row.thread_id,
    sender_name: typeof meta.sender_name === 'string' ? meta.sender_name
      : typeof meta.actor_name === 'string' ? meta.actor_name
        : category === 'Kunde' ? 'Kunde' : undefined,
    project_name: typeof meta.project_name === 'string' ? meta.project_name
      : typeof meta.thread_title === 'string' ? meta.thread_title
        : projectName,
    original_text: typeof meta.original_text === 'string' ? meta.original_text
      : category === 'Kunde' ? (row.body ?? undefined)
        : undefined,
    tagro_translation: typeof meta.tagro_translation === 'string' ? meta.tagro_translation
      : typeof meta.client_summary === 'string' ? meta.client_summary
        : undefined,
  }
}

export function useInboxNotifications() {
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<Notification[]>([])

  const load = useCallback(async () => {
    const res = await fetch('/api/inbox/items?limit=50', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json().catch(() => ({}))
    const rows = (data.items ?? []) as InboxRow[]
    const projects = (data.projects ?? {}) as Record<string, { title: string }>
    setNotifications(rows.map(row => mapRow(row, projects)))
  }, [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    async function init() {
      await load()
      if (cancelled) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel('notifications-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'inbox_items',
          filter: `user_id=eq.${user.id}`,
        }, () => { void load() })
        .subscribe()
    }

    void init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, load])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await fetch('/api/inbox/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => undefined)
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await fetch('/api/inbox/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => undefined)
  }, [])

  return { notifications, markAsRead, markAllRead }
}
