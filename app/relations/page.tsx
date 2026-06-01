'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Briefcase, ChatCircle, ArrowRight, Plus, Tag, Brain,
  PaperPlaneTilt, Check,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'

type RecentMessage = {
  id: string
  content: string
  created_at: string
  project_id: string
  project_title: string
}

type RecentQuote = {
  id: string
  title: string
  total: number
  status: string
  project_id: string
  project_title: string
  created_at: string
}

const fmtCur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

const fmtTime = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `vor ${hrs} Std.`
  return new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Entwurf', sent: 'Gesendet', accepted: 'Angenommen', rejected: 'Abgelehnt', expired: 'Abgelaufen',
}

export default function RelationsPage() {
  const [name, setName] = useState('')
  const [projectCount, setProjectCount] = useState(0)
  const [messageCount, setMessageCount] = useState(0)
  const [quoteCount, setQuoteCount] = useState(0)
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([])
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([])

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return

      // Profile
      const { data: p } = await sb.from('profiles').select('first_name,full_name').eq('id', data.user.id).single()
      if (p) setName((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')

      // Count projects
      const { count: pc } = await sb.from('rel_projects').select('*', { count: 'exact', head: true }).eq('user_id', data.user.id)
      setProjectCount(pc ?? 0)

      // Get projects for join
      const { data: projects } = await sb.from('rel_projects').select('id, title').eq('user_id', data.user.id)
      const projectMap = new Map(projects?.map(p => [p.id, p.title]) ?? [])
      const projectIds = projects?.map(p => p.id) ?? []

      if (projectIds.length > 0) {
        // Recent messages
        const { data: msgs } = await sb
          .from('rel_messages')
          .select('id, content, created_at, project_id')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(3)

        if (msgs) {
          setRecentMessages(msgs.map(m => ({
            ...m,
            project_title: projectMap.get(m.project_id) ?? 'Projekt',
          })))
          setMessageCount(msgs.length)
        }

        // Recent quotes
        const { data: quotes } = await sb
          .from('rel_quotes')
          .select('id, title, total, status, project_id, created_at')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(3)

        if (quotes) {
          setRecentQuotes(quotes.map(q => ({
            ...q,
            project_title: projectMap.get(q.project_id) ?? 'Projekt',
          })))
          setQuoteCount(quotes.length)
        }
      }
    })
  }, [])

  return (
    <div className="page-content">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .3, ease: [.16, 1, .3, 1] }}
      >
        {/* Header */}
        <div className="page-header">
          <h1>Willkommen{name ? `, ${name}` : ''}</h1>
          <p>Dein Relations-Panel — verwalte Projekte, Dokumente und Kommunikation.</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
          {/* Active projects */}
          <Link href="/relations/projects" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--r)', padding: '18px 20px',
              transition: 'border-color .15s, box-shadow .15s', cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--green-bg)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={16} weight="duotone" color="var(--green)" />
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px', fontVariantNumeric: 'tabular-nums' }}>{projectCount}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Projekte</p>
            </div>
          </Link>

          {/* Messages */}
          <Link href="/relations/messages" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--r)', padding: '18px 20px',
              transition: 'border-color .15s, box-shadow .15s', cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChatCircle size={16} weight="duotone" color="var(--text-muted)" />
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px', fontVariantNumeric: 'tabular-nums' }}>{messageCount}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Nachrichten</p>
            </div>
          </Link>

          {/* Quotes */}
          <Link href="/relations/quotes" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--r)', padding: '18px 20px',
              transition: 'border-color .15s, box-shadow .15s', cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tag size={16} weight="duotone" color="var(--amber)" />
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px', fontVariantNumeric: 'tabular-nums' }}>{quoteCount}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Angebote</p>
            </div>
          </Link>
        </div>

        {/* Recent sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 28 }}>
          {/* Recent messages */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>Letzte Nachrichten</h3>
              <Link href="/relations/messages" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>
                Alle anzeigen
              </Link>
            </div>
            {recentMessages.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Noch keine Nachrichten.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentMessages.map(m => (
                  <Link key={m.id} href={`/relations/projects/${m.project_id}?tab=chat`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: '10px 12px', borderRadius: 9,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      transition: 'border-color .12s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{m.project_title}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtTime(m.created_at)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.content}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent quotes */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>Letzte Angebote</h3>
              <Link href="/relations/quotes" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>
                Alle anzeigen
              </Link>
            </div>
            {recentQuotes.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Noch keine Angebote.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentQuotes.map(q => (
                  <Link key={q.id} href={`/relations/projects/${q.project_id}?tab=offers&quote=${q.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: '10px 12px', borderRadius: 9,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'border-color .12s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.title}
                        </p>
                        <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: 0 }}>
                          {q.project_title} · {STATUS_LABEL[q.status] ?? q.status}
                        </p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {fmtCur(q.total)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Link href="/relations/projects/new" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '16px 18px', borderRadius: 'var(--r)',
              background: 'var(--btn-prim)', color: 'var(--btn-prim-text)',
              transition: 'opacity .12s', cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Plus size={18} weight="bold" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 1px', color: 'inherit' }}>Neues Projekt</p>
                <p style={{ fontSize: 11, opacity: .7, margin: 0, color: 'inherit' }}>Projekt erstellen & Team einladen</p>
              </div>
            </div>
          </Link>

          <Link href="/relations/messages" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '16px 18px', borderRadius: 'var(--r)',
              background: 'var(--card)', border: '1px solid var(--border)',
              transition: 'border-color .12s, box-shadow .12s', cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <PaperPlaneTilt size={18} weight="duotone" color="var(--text-muted)" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 1px' }}>Nachricht senden</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Projekt-Chat öffnen</p>
              </div>
            </div>
          </Link>

          <Link href="/relations/ai" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '16px 18px', borderRadius: 'var(--r)',
              background: 'var(--card)', border: '1px solid var(--border)',
              transition: 'border-color .12s, box-shadow .12s', cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <Brain size={18} weight="duotone" color="var(--text-muted)" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 1px' }}>Veyra AI</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>AI-Assistent starten</p>
              </div>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
