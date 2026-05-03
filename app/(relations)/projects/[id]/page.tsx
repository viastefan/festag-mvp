'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Briefcase, ChatCircle, FileText, Tag,
  Users, PencilSimple, Check, Trash, Plus, Brain,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import RelationsChat from '@/components/RelationsChat'
import RelationsDocuments from '@/components/RelationsDocuments'
import RelationsQuoteBuilder from '@/components/RelationsQuoteBuilder'
import RelationsQuoteView from '@/components/RelationsQuoteView'
import RelationsTagro from '@/components/RelationsTagro'

type Project = {
  id: string
  user_id: string
  title: string
  description: string | null
  status: string
  budget_min: number | null
  budget_max: number | null
  currency: string
  created_at: string
  updated_at: string
}

type Member = {
  id: string
  user_id: string | null
  role: string
  invited_email: string | null
  status: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Entwurf',       color: 'var(--text-muted)',     bg: 'var(--surface-2)' },
  active:    { label: 'Aktiv',         color: 'var(--green)',          bg: 'var(--green-bg)' },
  paused:    { label: 'Pausiert',      color: 'var(--amber)',          bg: 'var(--amber-bg)' },
  completed: { label: 'Abgeschlossen', color: 'var(--text-secondary)', bg: 'var(--surface-2)' },
  archived:  { label: 'Archiviert',    color: 'var(--text-muted)',     bg: 'var(--surface-2)' },
}

const ALL_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived']

const TABS = [
  { key: 'overview',  label: 'Übersicht',  icon: Briefcase },
  { key: 'chat',      label: 'Chat',       icon: ChatCircle },
  { key: 'documents', label: 'Dokumente',  icon: FileText },
  { key: 'offers',    label: 'Angebote',   icon: Tag },
  { key: 'tagro',     label: 'Tagro AI',   icon: Brain },
]

type Quote = {
  id: string
  project_id: string
  created_by: string
  title: string
  description: string | null
  items: any[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: string
  status: string
  valid_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function formatBudget(min: number | null, max: number | null, currency: string) {
  const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `ab ${fmt(min)}`
  if (max) return `bis ${fmt(max)}`
  return 'Kein Budget festgelegt'
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [statusOpen, setStatusOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [quoteView, setQuoteView] = useState<'list' | 'create' | 'edit' | 'view'>('list')
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)

  useEffect(() => {
    loadProject()
    loadQuotes()
  }, [projectId])

  // Open specific quote from URL param
  useEffect(() => {
    const qid = searchParams.get('quote')
    if (qid && quotes.length) {
      const found = quotes.find(q => q.id === qid)
      if (found) { setSelectedQuote(found); setQuoteView('view') }
    }
  }, [quotes, searchParams])

  async function loadProject() {
    const sb = createClient()
    const { data, error } = await sb
      .from('rel_projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error || !data) {
      setLoading(false)
      return
    }

    setProject(data as Project)

    const { data: memberData } = await sb
      .from('rel_project_members')
      .select('*')
      .eq('project_id', projectId)

    setMembers((memberData as Member[]) ?? [])
    setLoading(false)
  }

  async function loadQuotes() {
    setQuotesLoading(true)
    const sb = createClient()
    const { data } = await sb
      .from('rel_quotes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    setQuotes((data as Quote[]) ?? [])
    setQuotesLoading(false)
  }

  async function updateStatus(newStatus: string) {
    if (!project) return
    setUpdating(true)
    const sb = createClient()
    await sb.from('rel_projects').update({ status: newStatus }).eq('id', project.id)
    setProject({ ...project, status: newStatus })
    setStatusOpen(false)
    setUpdating(false)
  }

  async function deleteProject() {
    if (!project) return
    if (!confirm('Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return
    const sb = createClient()
    await sb.from('rel_projects').delete().eq('id', project.id)
    router.push('/relations/projects')
  }

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>
  )

  if (!project) return (
    <div className="page-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>Projekt nicht gefunden</p>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>Dieses Projekt existiert nicht oder du hast keinen Zugriff.</p>
      <Link href="/relations/projects" style={{
        padding: '10px 20px', borderRadius: 10,
        background: 'var(--btn-prim)', color: 'var(--btn-prim-text)',
        fontSize: 13, fontWeight: 700, textDecoration: 'none',
      }}>
        Zurück zu Projekte
      </Link>
    </div>
  )

  const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft

  return (
    <div className="page-content">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .3, ease: [.16, 1, .3, 1] }}
      >
        {/* Back */}
        <Link href="/relations/projects" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none',
          marginBottom: 20, transition: 'color .12s',
        }}>
          <ArrowLeft size={14} />
          Alle Projekte
        </Link>

        {/* Title + status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 8px' }}>{project.title}</h1>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button
                onClick={() => setStatusOpen(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 8,
                  background: status.bg, color: status.color,
                  border: '1px solid transparent',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'border-color .12s',
                }}
              >
                {status.label}
                <PencilSimple size={11} />
              </button>
              <AnimatePresence>
                {statusOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: .96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: .96 }}
                    transition={{ duration: .15 }}
                    style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: 6,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 12, boxShadow: 'var(--shadow-lg)',
                      padding: 6, zIndex: 100, minWidth: 160,
                    }}
                  >
                    {ALL_STATUSES.map(s => {
                      const cfg = STATUS_CONFIG[s]
                      const isActive = project.status === s
                      return (
                        <button
                          key={s}
                          onClick={() => updateStatus(s)}
                          disabled={updating}
                          style={{
                            width: '100%', padding: '8px 12px',
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: isActive ? 'var(--nav-on)' : 'transparent',
                            border: 'none', borderRadius: 8,
                            fontSize: 13, fontWeight: isActive ? 700 : 500,
                            color: isActive ? 'var(--text)' : 'var(--text-secondary)',
                            cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'background .1s',
                          }}
                        >
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: cfg.color, flexShrink: 0,
                          }} />
                          {cfg.label}
                          {isActive && <Check size={13} weight="bold" style={{ marginLeft: 'auto' }} />}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            onClick={deleteProject}
            style={{
              height: 36, padding: '0 14px', borderRadius: 9,
              background: 'var(--red-bg)', color: 'var(--red)',
              border: '1px solid var(--red)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: .8, transition: 'opacity .12s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '.8'}
          >
            <Trash size={13} weight="bold" />
            Löschen
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2, borderBottom: '1px solid var(--border)',
          marginBottom: 24, overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', border: 'none',
                  background: 'transparent',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--text)' : 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'inherit',
                  whiteSpace: 'nowrap', transition: 'color .12s',
                }}
              >
                <Icon size={15} weight={isActive ? 'bold' : 'regular'} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="project-tab-indicator"
                    style={{
                      position: 'absolute', bottom: -1, left: 0, right: 0,
                      height: 2, background: 'var(--text)', borderRadius: 1,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: .2 }}
          >
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {/* Details card */}
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r)', padding: '20px 22px',
                }}>
                  <h3 style={{ margin: '0 0 14px' }}>Details</h3>
                  {project.description && (
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>
                      {project.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Budget</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                        {formatBudget(project.budget_min, project.budget_max, project.currency)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Erstellt</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                        {new Date(project.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Währung</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{project.currency}</span>
                    </div>
                  </div>
                </div>

                {/* Members card */}
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r)', padding: '20px 22px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h3 style={{ margin: 0 }}>Mitglieder</h3>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                      background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 6,
                    }}>
                      {members.length + 1}
                    </span>
                  </div>

                  {/* Owner */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', borderBottom: members.length > 0 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', flexShrink: 0,
                    }}>
                      <Users size={14} weight="bold" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Du (Owner)</p>
                    </div>
                  </div>

                  {members.map(m => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0,
                      }}>
                        {(m.invited_email ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>
                          {m.invited_email ?? 'Mitglied'}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                          {m.role} · {m.status}
                        </p>
                      </div>
                    </div>
                  ))}

                  {members.length === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 0', fontStyle: 'italic' }}>
                      Noch keine weiteren Mitglieder eingeladen.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <RelationsChat projectId={projectId} />
            )}

            {activeTab === 'documents' && (
              <RelationsDocuments projectId={projectId} />
            )}

            {activeTab === 'offers' && (
              <>
                {quoteView === 'create' && (
                  <RelationsQuoteBuilder
                    projectId={projectId}
                    onSaved={() => { setQuoteView('list'); loadQuotes() }}
                    onCancel={() => setQuoteView('list')}
                  />
                )}

                {quoteView === 'edit' && selectedQuote && (
                  <RelationsQuoteBuilder
                    projectId={projectId}
                    initialData={{
                      id: selectedQuote.id,
                      title: selectedQuote.title,
                      description: selectedQuote.description ?? '',
                      items: (selectedQuote.items as any[]).map((it: any) => ({ ...it, id: Math.random().toString(36).slice(2, 10) })),
                      tax_rate: selectedQuote.tax_rate,
                      valid_until: selectedQuote.valid_until ?? '',
                      notes: selectedQuote.notes ?? '',
                    }}
                    onSaved={() => { setQuoteView('list'); setSelectedQuote(null); loadQuotes() }}
                    onCancel={() => { setQuoteView('list'); setSelectedQuote(null) }}
                  />
                )}

                {quoteView === 'view' && selectedQuote && (
                  <RelationsQuoteView
                    quote={selectedQuote}
                    onBack={() => { setQuoteView('list'); setSelectedQuote(null) }}
                    onEdit={() => setQuoteView('edit')}
                    onDeleted={() => { setQuoteView('list'); setSelectedQuote(null); loadQuotes() }}
                  />
                )}

                {quoteView === 'list' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ margin: 0 }}>Angebote ({quotes.length})</h3>
                      <button
                        onClick={() => setQuoteView('create')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 16px', borderRadius: 9,
                          background: 'var(--btn-prim)', color: 'var(--btn-prim-text)',
                          border: 'none', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'opacity .12s',
                        }}
                      >
                        <Plus size={13} weight="bold" />
                        Neues Angebot
                      </button>
                    </div>

                    {quotesLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                        <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                      </div>
                    ) : quotes.length === 0 ? (
                      <div style={{
                        textAlign: 'center', padding: '48px 20px',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--r-lg)',
                      }}>
                        <Tag size={32} weight="duotone" color="var(--text-muted)" style={{ marginBottom: 12 }} />
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Noch keine Angebote</p>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>Erstelle dein erstes Angebot für dieses Projekt.</p>
                        <button
                          onClick={() => setQuoteView('create')}
                          style={{
                            padding: '10px 20px', borderRadius: 10,
                            background: 'var(--btn-prim)', color: 'var(--btn-prim-text)',
                            border: 'none', fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          Angebot erstellen
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {quotes.map(q => {
                          const stCfg: Record<string, { label: string; color: string; bg: string }> = {
                            draft:    { label: 'Entwurf',     color: 'var(--text-muted)',  bg: 'var(--surface-2)' },
                            sent:     { label: 'Gesendet',    color: 'var(--amber)',       bg: 'var(--amber-bg)' },
                            accepted: { label: 'Angenommen',  color: 'var(--green)',       bg: 'var(--green-bg)' },
                            rejected: { label: 'Abgelehnt',   color: 'var(--red)',         bg: 'var(--red-bg)' },
                            expired:  { label: 'Abgelaufen',  color: 'var(--text-muted)',  bg: 'var(--surface-2)' },
                          }
                          const s = stCfg[q.status] ?? stCfg.draft
                          return (
                            <motion.button
                              key={q.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              onClick={() => { setSelectedQuote(q); setQuoteView('view') }}
                              style={{
                                width: '100%', textAlign: 'left',
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '14px 16px', borderRadius: 12,
                                background: 'var(--card)', border: '1px solid var(--border)',
                                cursor: 'pointer', fontFamily: 'inherit',
                                transition: 'border-color .12s, box-shadow .12s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {q.title}
                                </p>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                                  {new Date(q.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px', fontVariantNumeric: 'tabular-nums' }}>
                                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(q.total)}
                                </p>
                                <span style={{
                                  display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                                  background: s.bg, color: s.color,
                                  fontSize: 10.5, fontWeight: 600,
                                }}>
                                  {s.label}
                                </span>
                              </div>
                            </motion.button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {activeTab === 'tagro' && project && (
              <RelationsTagro project={{ id: project.id, title: project.title, description: project.description, status: project.status }} />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
