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

      const { data: projs } = await supabase
        .from('projects')
        .select('id, title, status')
        .order('created_at', { ascending: false })

      if (!projs || projs.length === 0) { setLoading(false); return }

      const enriched = await Promise.all(projs.map(async (p) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('message, created_at, is_ai')
          .eq('project_id', p.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return { ...p, lastMsg }
      }))
      setProjects(enriched)
      setLoading(false)
    })
  }, [])

  const PHASE_LABEL: Record<string, string> = {
    intake: 'Intake', planning: 'Planning', active: 'Development',
    testing: 'Testing', done: 'Delivered',
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4 }}>Messages</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Projekt-Konversationen mit Tagro & Developern
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="animate-fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z"/>
            </svg>
          </div>
          <h2 style={{ marginBottom: 8 }}>Noch keine Konversationen</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            Starte ein Projekt um mit Tagro und Developern zu kommunizieren.
          </p>
          <Link href="/onboarding">
            <button className="tap-scale" style={{ marginTop: 20, padding: '10px 20px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Projekt starten
            </button>
          </Link>
        </div>
      ) : (
        <div className="animate-fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {projects.map((p, i) => {
            const title = p.title || 'Unbenanntes Projekt'
            const initial = title.charAt(0).toUpperCase()
            return (
              <Link key={p.id} href={`/project/${p.id}`}>
                <div
                  className="tap-scale"
                  style={{
                    padding: '16px 20px',
                    borderBottom: i < projects.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    display: 'flex', gap: 14, alignItems: 'center',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 11,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: 'var(--text)', flexShrink: 0,
                  }}>
                    {initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {title}
                      </span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                          {PHASE_LABEL[p.status] ?? p.status}
                        </span>
                        {p.lastMsg?.created_at && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(p.lastMsg.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.lastMsg
                        ? (p.lastMsg.is_ai ? '✦ Tagro: ' : '') + p.lastMsg.message
                        : 'Noch keine Nachrichten — Gespräch starten'}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M9 6l6 6-6 6"/>
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
