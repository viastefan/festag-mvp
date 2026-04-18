'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function MessagesPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: projs } = await supabase.from('projects').select('id,title,status').order('created_at', { ascending: false })
      const enriched = await Promise.all((projs ?? []).map(async p => {
        const { data: lastMsg } = await supabase.from('messages').select('message,created_at,is_ai').eq('project_id', p.id).order('created_at', { ascending: false }).limit(1).single()
        return { ...p, lastMsg }
      }))
      setProjects(enriched)
      setLoading(false)
    })
  }, [])

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4 }}>Messages</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Projekt-Konversationen mit Tagro & Developern</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="animate-fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '60px 24px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>Noch keine Konversationen</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Starte ein Projekt um mit Tagro und Developern zu kommunizieren.</p>
        </div>
      ) : (
        <div className="animate-fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {projects.map((p, i) => (
            <Link key={p.id} href={`/project/${p.id}`}>
              <div className="tap-scale" style={{
                padding: '16px 18px', borderBottom: i < projects.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', display: 'flex', gap: 12, transition: 'background 0.12s',
              }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                 onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                  {p.title.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{p.title}</span>
                    {p.lastMsg && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(p.lastMsg.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.lastMsg ? (p.lastMsg.is_ai ? '✦ Tagro: ' : '') + p.lastMsg.message : 'Noch keine Nachrichten'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
