'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = { id: string; email: string; full_name: string | null; role: string }

export default function TeamPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({})
  const [currentUserId, setCurrentUserId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? ''))
    supabase.from('profiles').select('*').then(async ({ data }) => {
      if (data) {
        setProfiles(data)
        const counts: Record<string, number> = {}
        for (const p of data) {
          const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assigned_to', p.id)
          counts[p.id] = count ?? 0
        }
        setTaskCounts(counts)
      }
    })
  }, [])

  const roleColor: Record<string, { color: string; bg: string }> = {
    client: { color: '#1D4ED8', bg: '#DBEAFE' },
    dev: { color: '#065F46', bg: '#D1FAE5' },
    admin: { color: '#92400E', bg: '#FEF3C7' },
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Team</h1>
      <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 28 }}>Mitglieder & Workload</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {profiles.map(p => {
          const rc = roleColor[p.role] ?? roleColor.client
          const isMe = p.id === currentUserId
          return (
            <div key={p.id} style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={s.avatar}>
                  {(p.full_name ?? p.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={s.name}>{p.full_name ?? p.email.split('@')[0]} {isMe && <span style={s.me}>Du</span>}</p>
                  <p style={s.email}>{p.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ ...s.badge, color: rc.color, background: rc.bg }}>
                  {p.role.charAt(0).toUpperCase() + p.role.slice(1)}
                </span>
                <span style={{ fontSize: 13, color: '#6B7280' }}>
                  {taskCounts[p.id] ?? 0} Tasks
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  card: { background: '#fff', border: '1px solid #E6E8EE', borderRadius: 12, padding: '20px' },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: '#EEF3FF', color: '#2F6BFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 },
  name: { fontSize: 14, fontWeight: 600, margin: 0 },
  email: { fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  me: { fontSize: 11, background: '#F3F4F6', color: '#9CA3AF', padding: '1px 6px', borderRadius: 4, marginLeft: 6, fontWeight: 500 },
}
