'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Project = {
  id: string; title: string; status: string
  lastMsg?: { message: string; created_at: string; is_ai: boolean } | null
  unread?: number
}

const PHASE_LABEL: Record<string, string> = {
  intake: 'Intake', planning: 'Planning', active: 'In Arbeit', testing: 'Testing', done: 'Abgeschlossen',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Jetzt'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return new Date(iso).toLocaleDateString('de', { day: '2-digit', month: 'short' })
}

export default function MessagesPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: projs } = await sb.from('projects').select('id,title,status').order('created_at', { ascending: false })
      if (!projs?.length) { setLoading(false); return }
      const enriched = await Promise.all(projs.map(async p => {
        const { data: msg } = await sb.from('messages').select('message,created_at,is_ai').eq('project_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
        return { ...p, lastMsg: msg ?? null }
      }))
      enriched.sort((a, b) => {
        const ta = a.lastMsg?.created_at ?? a.id
        const tb = b.lastMsg?.created_at ?? b.id
        return tb > ta ? 1 : -1
      })
      setProjects(enriched)
      setLoading(false)
    })
  }, [])

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-content" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1>Nachrichten</h1>
        <p>Projekt-Konversationen mit Tagro &amp; dem Team</p>
      </div>

      {/* Search bar */}
      {projects.length > 2 && (
        <div className="animate-fade-up" style={{ position: 'relative', marginBottom: 16 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Konversationen durchsuchen…"
            style={{ width: '100%', height: 40, padding: '0 16px 0 34px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', fontWeight: 500 }}
          />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 && projects.length === 0 ? (
        <div className="animate-fade-up-1" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round">
              <path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z"/>
            </svg>
          </div>
          <h2 style={{ marginBottom: 8 }}>Noch keine Konversationen</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.6 }}>
            Starte ein Projekt um mit Tagro und dem Team zu kommunizieren.
          </p>
          <Link href="/onboarding">
            <button className="tap-scale" style={{ padding: '10px 22px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Projekt starten →
            </button>
          </Link>
        </div>
      ) : (
        <div className="animate-fade-up-1" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Kein Projekt gefunden für „{search}"</p>
            </div>
          ) : filtered.map((p, i) => {
            const initial = p.title.charAt(0).toUpperCase()
            const hasMsg  = !!p.lastMsg
            const preview = p.lastMsg
              ? (p.lastMsg.is_ai ? 'Tagro: ' : '') + p.lastMsg.message
              : 'Gespräch starten →'

            return (
              <Link key={p.id} href={`/project/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div
                  style={{ padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 14, alignItems: 'center', transition: 'background .1s', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  {/* Avatar */}
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
                    {initial}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '1px 7px', borderRadius: 5, letterSpacing: '.03em' }}>
                          {PHASE_LABEL[p.status] ?? p.status}
                        </span>
                        {p.lastMsg?.created_at && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(p.lastMsg.created_at)}</span>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: hasMsg ? 'var(--text-secondary)' : 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {preview}
                    </p>
                  </div>

                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
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
