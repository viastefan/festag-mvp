'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Dev = {
  id: string
  full_name: string | null
  avatar_url: string | null
  github_avatar_url: string | null
  github_username: string | null
  email: string | null
}

interface Props {
  projectId: string
  accentColor?: string
  max?: number
}

/**
 * ProjectDevAvatars — small, calm avatar stack of the developers that have
 * self-enrolled onto the project. Used on the client project header so the
 * client can see "who's on it" without any technical noise.
 *
 * Reads project_assignments + profiles; RLS gates non-members.
 * Subscribes to inserts on project_assignments so a new dev fades in
 * live when they tick "Eintragen" in the dev panel.
 */
export default function ProjectDevAvatars({ projectId, accentColor, max = 4 }: Props) {
  const [devs, setDevs] = useState<Dev[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supa = createClient()
    let cancelled = false

    async function load() {
      const { data: assigns } = await (supa as any)
        .from('project_assignments')
        .select('user_id,created_at')
        .eq('project_id', projectId)
        .eq('active', true)
        .order('created_at', { ascending: true })
      const ids = Array.from(new Set(((assigns ?? []) as any[]).map(a => a.user_id))).filter(Boolean)
      if (!ids.length) {
        if (!cancelled) { setDevs([]); setLoaded(true) }
        return
      }
      const { data: profiles } = await (supa as any)
        .from('profiles')
        .select('id,full_name,avatar_url,github_avatar_url,github_username,email')
        .in('id', ids)
      if (cancelled) return
      // Keep assignment order — first to join shows first.
      const byId = new Map<string, Dev>(((profiles ?? []) as Dev[]).map(p => [p.id, p]))
      const ordered = ids.map(id => byId.get(id)).filter(Boolean) as Dev[]
      setDevs(ordered)
      setLoaded(true)
    }

    load()

    const channel = (supa as any)
      .channel(`pa-${projectId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_assignments', filter: `project_id=eq.${projectId}` },
        () => load(),
      )
      .subscribe()

    return () => {
      cancelled = true
      try { (supa as any).removeChannel(channel) } catch {}
    }
  }, [projectId])

  if (!loaded || devs.length === 0) return null

  const shown = devs.slice(0, max)
  const overflow = devs.length - shown.length

  return (
    <div className="pda-wrap" aria-label={`${devs.length} Developer auf diesem Projekt`}>
      <span className="pda-label">Devs</span>
      <span className="pda-names">
        {shown.map((d, i) => {
          const title = d.full_name
            || (d.github_username ? `@${d.github_username}` : null)
            || d.email
            || 'Developer'
          return (
            <span key={d.id}>
              {i > 0 ? ', ' : ''}
              {title}
            </span>
          )
        })}
        {overflow > 0 ? ` +${overflow}` : ''}
      </span>

      <style jsx>{`
        .pda-wrap {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface-2) 50%, transparent);
          animation: pdaIn .25s cubic-bezier(.16,1,.3,1) both;
        }
        .pda-label {
          font-size: 10.5px; font-weight: 500;
          letter-spacing: .12em; text-transform: uppercase;
          color: var(--text-muted);
        }
        .pda-names {
          font-size: 12.5px; font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.01em;
        }
        @keyframes pdaIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}
