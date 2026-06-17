'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UsersThree, X, ArrowRight } from '@phosphor-icons/react'

type TeamNotif = {
  notifId: string
  projectId: string
  projectTitle: string
}

export default function ProjectTeamCompleteCelebration() {
  const [data, setData] = useState<TeamNotif | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const sb = createClient()
    sb.from('notifications')
      .select('id,payload,project_id')
      .eq('kind', 'dev_team_complete')
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data: notifs }) => {
        const n = notifs?.[0]
        if (!n) return
        const p = n.payload as any
        setData({
          notifId: n.id,
          projectId: p?.project_id || n.project_id,
          projectTitle: p?.project_title || 'Dein Projekt',
        })
        setTimeout(() => setVisible(true), 200)
      })
  }, [])

  const dismiss = async () => {
    setVisible(false)
    if (data) {
      const sb = createClient()
      await sb.from('notifications').update({ read: true }).eq('id', data.notifId)
    }
    setTimeout(() => setData(null), 400)
  }

  if (!data) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: visible ? 'rgba(0,0,0,.35)' : 'transparent',
      transition: 'background .4s ease',
      pointerEvents: visible ? 'auto' : 'none',
    }} onClick={dismiss}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 24, padding: '48px 40px',
          maxWidth: 400, textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,.08)',
          transform: visible ? 'scale(1)' : 'scale(0.92)',
          opacity: visible ? 1 : 0,
          transition: 'all .4s cubic-bezier(.16,1,.3,1)',
          fontFamily: 'var(--font-aeonik, Aeonik, system-ui, sans-serif)',
        }}
      >
        <button
          onClick={dismiss}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer', color: '#8E8E93',
          }}
        >
          <X size={18} />
        </button>

        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <UsersThree size={28} weight="regular" style={{ color: '#5B647D' }} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 500, color: '#0F0F10', margin: '0 0 8px', letterSpacing: '0.012em' }}>
          Dein Team ist komplett
        </h2>
        <p style={{ fontSize: 14, color: '#6E717E', margin: '0 0 28px', lineHeight: 1.55, letterSpacing: '0.017em' }}>
          Alle Entwickler haben für „{data.projectTitle}" zugesagt. Der nächste Schritt ist der Zahlungsplan.
        </p>

        <a
          href={`/project/${data.projectId}`}
          onClick={dismiss}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 44, padding: '0 24px', borderRadius: 12,
            background: '#5B647D', color: '#fff', textDecoration: 'none',
            fontSize: 14, fontWeight: 500, letterSpacing: '0.017em',
          }}
        >
          Projekt öffnen <ArrowRight size={16} />
        </a>
      </div>
    </div>
  )
}
