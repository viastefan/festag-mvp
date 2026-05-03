'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Tag, Funnel, ArrowUp, ArrowDown, Plus,
  PencilSimple, PaperPlaneTilt, Check, X as XIcon, Clock,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

type Quote = {
  id: string
  project_id: string
  title: string
  total: number
  currency: string
  status: string
  created_at: string
  valid_until: string | null
  project_title?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
  draft:    { label: 'Entwurf',     color: 'var(--text-muted)',      bg: 'var(--surface-2)',  icon: PencilSimple },
  sent:     { label: 'Gesendet',    color: 'var(--amber)',           bg: 'var(--amber-bg)',   icon: PaperPlaneTilt },
  accepted: { label: 'Angenommen', color: 'var(--green)',           bg: 'var(--green-bg)',   icon: Check },
  rejected: { label: 'Abgelehnt',  color: 'var(--red)',             bg: 'var(--red-bg)',     icon: XIcon },
  expired:  { label: 'Abgelaufen', color: 'var(--text-muted)',      bg: 'var(--surface-2)',  icon: Clock },
}

const ALL_STATUSES = ['all', 'draft', 'sent', 'accepted', 'rejected', 'expired']

const fmtCur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })

export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => { loadQuotes() }, [])

  async function loadQuotes() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return

    const { data } = await sb
      .from('rel_quotes')
      .select('id, project_id, title, total, currency, status, created_at, valid_until')
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    // Fetch project titles
    const projectIds = [...new Set(data.map(q => q.project_id))]
    const { data: projects } = await sb
      .from('rel_projects')
      .select('id, title')
      .in('id', projectIds)

    const projectMap = new Map(projects?.map(p => [p.id, p.title]) ?? [])

    setQuotes(data.map(q => ({
      ...q,
      project_title: projectMap.get(q.project_id) ?? 'Unbekanntes Projekt',
    })))
    setLoading(false)
  }

  const filtered = quotes
    .filter(q => filter === 'all' || q.status === filter)
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'date') return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      return dir * (a.total - b.total)
    })

  function toggleSort(field: 'date' | 'amount') {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const SortIcon = sortDir === 'asc' ? ArrowUp : ArrowDown

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>
  )

  return (
    <div className="page-content">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .3, ease: [.16, 1, .3, 1] }}
      >
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1>Angebote</h1>
            <p>Alle Angebote über alle Projekte hinweg.</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          {ALL_STATUSES.map(s => {
            const isActive = filter === s
            const cfg = s === 'all' ? { label: 'Alle', color: 'var(--text)', bg: 'var(--surface-2)' } : STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  background: isActive ? 'var(--text)' : 'var(--surface)',
                  color: isActive ? 'var(--bg)' : 'var(--text-secondary)',
                  border: isActive ? 'none' : '1px solid var(--border)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                  transition: 'all .12s',
                }}
              >
                {cfg.label}
                {s !== 'all' && (
                  <span style={{ marginLeft: 4, opacity: .7 }}>
                    {quotes.filter(q => q.status === s).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Sort controls */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => toggleSort('date')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 7,
              background: sortBy === 'date' ? 'var(--surface-2)' : 'transparent',
              border: '1px solid var(--border)', fontSize: 11, fontWeight: 600,
              color: sortBy === 'date' ? 'var(--text)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Datum {sortBy === 'date' && <SortIcon size={10} weight="bold" />}
          </button>
          <button
            onClick={() => toggleSort('amount')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 7,
              background: sortBy === 'amount' ? 'var(--surface-2)' : 'transparent',
              border: '1px solid var(--border)', fontSize: 11, fontWeight: 600,
              color: sortBy === 'amount' ? 'var(--text)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Betrag {sortBy === 'amount' && <SortIcon size={10} weight="bold" />}
          </button>
        </div>

        {/* Quote list */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 20px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
          }}>
            <Tag size={32} weight="duotone" color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Keine Angebote</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              {filter === 'all' ? 'Erstelle dein erstes Angebot in einem Projekt.' : 'Keine Angebote mit diesem Status gefunden.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence>
              {filtered.map((q, i) => {
                const st = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.draft
                const StIcon = st.icon
                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: .2, delay: i * .03 }}
                  >
                    <button
                      onClick={() => router.push(`/relations/projects/${q.project_id}?tab=offers&quote=${q.id}`)}
                      style={{
                        width: '100%', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 18px', borderRadius: 12,
                        background: 'var(--card)', border: '1px solid var(--border)',
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'border-color .12s, box-shadow .12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <StIcon size={16} weight="bold" color={st.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.title}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                          {q.project_title} · {fmtDate(q.created_at)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtCur(q.total)}
                        </p>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 6,
                          background: st.bg, color: st.color,
                          fontSize: 10.5, fontWeight: 600,
                        }}>
                          {st.label}
                        </span>
                      </div>
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Summary */}
        {filtered.length > 0 && (
          <div style={{
            marginTop: 20, padding: '14px 18px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, display: 'flex', justifyContent: 'space-between',
            fontSize: 13,
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>{filtered.length} Angebote</span>
            <span style={{ fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
              Gesamt: {fmtCur(filtered.reduce((s, q) => s + q.total, 0))}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  )
}
