'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getStoredDevSession } from '@/lib/dev-session'

type Member = { id: string; email?: string | null; full_name?: string | null; role?: string | null; created_at?: string | null }

export default function DevTeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getStoredDevSession()) { window.location.href = '/login'; return }
    const supabase = createClient()
    supabase.from('profiles').select('id, email, full_name, role, created_at').in('role', ['dev', 'admin']).order('created_at').then(({ data }) => {
      setMembers((data as Member[]) ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="dev-page">
      <header className="dev-page-header compact">
        <div>
          <p className="dev-eyebrow">Delivery Team</p>
          <h1>Team Layer.</h1>
          <p className="meta">{members.length} operative Mitglieder · clientseitige Developer bleiben workspace-gebunden</p>
        </div>
      </header>

      <section className="team-list dev-surface">
        <div className="team-head"><span>Name</span><span>Rolle</span><span>Status</span><span>Kontext</span></div>
        {loading ? <p className="empty">Team wird geladen…</p> : members.map((member) => {
          const name = member.full_name || member.email?.split('@')[0] || 'Developer'
          return (
            <div className="team-row" key={member.id}>
              <div className="avatar">{name.slice(0, 2).toUpperCase()}</div>
              <div><strong>{name}</strong><small>{member.email || 'Keine E-Mail'}</small></div>
              <span>{member.role === 'admin' ? 'Admin' : 'Developer'}</span>
              <span className="dev-chip">Aktiv</span>
              <span>Assigned Projects only</span>
            </div>
          )
        })}
      </section>

      <style jsx>{`
        .compact { margin-bottom:22px; }
        .team-list { padding:8px; }
        .team-head { display:grid; grid-template-columns:minmax(240px,1fr) 120px 100px 180px; gap:12px; padding:10px 12px 8px 54px; color:var(--text-muted); font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
        .team-row { display:grid; grid-template-columns:36px minmax(240px,1fr) 120px 100px 180px; gap:12px; align-items:center; min-height:58px; padding:9px 12px; border-radius:13px; transition:background .18s ease, transform .18s ease; }
        .team-row:hover { background:color-mix(in srgb, var(--surface-2) 70%, transparent); transform:translateY(-1px); }
        .avatar { width:32px; height:32px; border-radius:10px; display:grid; place-items:center; background:var(--surface-2); color:var(--text); border:1px solid var(--border); font-size:11px; font-weight:800; }
        .team-row strong { display:block; font-size:13.5px; }
        .team-row small { display:block; margin-top:3px; color:var(--text-muted); font-size:11.5px; }
        .team-row > span { color:var(--text-secondary); font-size:12px; font-weight:700; }
        .empty { padding:32px; color:var(--text-muted); font-size:13px; }
        @media (max-width: 840px) { .team-head { display:none; } .team-row { grid-template-columns:36px minmax(0,1fr); } .team-row > span { display:none; } }
      `}</style>
    </div>
  )
}
