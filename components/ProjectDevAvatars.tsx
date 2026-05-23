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
      <div className="pda-stack">
        {shown.map((d, i) => {
          const src = d.avatar_url || d.github_avatar_url
          const initials = (d.full_name || d.github_username || d.email || '·')
            .replace(/^@/, '')
            .split(/[\s._-]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(s => s[0]?.toUpperCase())
            .join('') || '·'
          const title = d.full_name
            || (d.github_username ? `@${d.github_username}` : null)
            || d.email
            || 'Developer'
          return (
            <span
              key={d.id}
              className="pda-avatar"
              style={{ zIndex: shown.length - i, borderColor: accentColor || 'var(--card)' }}
              title={title}
            >
              {src
                ? <img src={src} alt="" />
                : <span className="pda-initials">{initials}</span>}
            </span>
          )
        })}
        {overflow > 0 && (
          <span className="pda-avatar pda-more" style={{ zIndex: 0 }}>+{overflow}</span>
        )}
      </div>

      <style jsx>{`
        .pda-wrap {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 4px 8px 4px 10px;
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
        .pda-stack { display: inline-flex; }
        .pda-avatar {
          width: 22px; height: 22px; border-radius: 50%;
          border: 1.5px solid var(--card);
          background: var(--surface-2);
          overflow: hidden;
          display: inline-flex; align-items: center; justify-content: center;
          margin-left: -6px;
          color: var(--text-secondary);
          font-size: 9.5px; font-weight: 500;
          letter-spacing: .015em;
          animation: pdaPop .35s cubic-bezier(.16,1,.3,1) both;
        }
        .pda-avatar:first-child { margin-left: 0; }
        .pda-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pda-initials { line-height: 1; }
        .pda-more { background: var(--card); color: var(--text-muted); }
        @keyframes pdaIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pdaPop {
          from { opacity: 0; transform: scale(.6) }
          60% { opacity: 1; transform: scale(1.08) }
          to { opacity: 1; transform: scale(1) }
        }
      `}</style>
    </div>
  )
}
