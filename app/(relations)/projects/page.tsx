'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, Briefcase, Users, Clock, FunnelSimple } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

type Project = {
  id: string
  title: string
  description: string | null
  status: string
  budget_min: number | null
  budget_max: number | null
  currency: string
  created_at: string
  updated_at: string
  member_count?: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Entwurf',       color: 'var(--text-muted)',  bg: 'var(--surface-2)' },
  active:    { label: 'Aktiv',         color: 'var(--green)',       bg: 'var(--green-bg)' },
  paused:    { label: 'Pausiert',      color: 'var(--amber)',       bg: 'var(--amber-bg)' },
  completed: { label: 'Abgeschlossen', color: 'var(--text-secondary)', bg: 'var(--surface-2)' },
  archived:  { label: 'Archiviert',    color: 'var(--text-muted)',  bg: 'var(--surface-2)' },
}

function formatBudget(min: number | null, max: number | null, currency: string) {
  const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `ab ${fmt(min)}`
  if (max) return `bis ${fmt(max)}`
  return null
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  if (days < 7) return `vor ${days} Tagen`
  return new Date(date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    const sb = createClient()
    const { data: user } = await sb.auth.getUser()
    if (!user.user) return

    const { data, error } = await sb
      .from('rel_projects')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!error && data) {
      // Fetch member counts
      const projectsWithCounts = await Promise.all(
        data.map(async (p: any) => {
          const { count } = await sb
            .from('rel_project_members')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', p.id)
          return { ...p, member_count: (count ?? 0) + 1 } // +1 for owner
        })
      )
      setProjects(projectsWithCounts)
    }
    setLoading(false)
  }

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1>Projekte</h1>
            <p>Verwalte deine Relations-Projekte.</p>
          </div>
          <Link href="/relations/projects/new" style={{ textDecoration: 'none' }}>
            <button className="tap-scale" style={{
              height: 40, padding: '0 18px',
              background: 'var(--btn-prim)', color: 'var(--btn-prim-text)',
              border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
            }}>
              <Plus size={14} weight="bold" />
              Neues Projekt
            </button>
          </Link>
        </div>

        {/* Filter bar */}
        {projects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
            <FunnelSimple size={14} color="var(--text-muted)" />
            {['all', 'active', 'draft', 'paused', 'completed', 'archived'].map(s => {
              const isActive = filter === s
              const label = s === 'all' ? 'Alle' : (STATUS_CONFIG[s]?.label ?? s)
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  style={{
                    padding: '5px 12px', borderRadius: 8,
                    fontSize: 12, fontWeight: isActive ? 700 : 500,
                    background: isActive ? 'var(--nav-on)' : 'transparent',
                    color: isActive ? 'var(--text)' : 'var(--text-muted)',
                    border: '1px solid ' + (isActive ? 'var(--border-strong)' : 'transparent'),
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all .12s',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Project cards */}
        {filtered.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((project, i) => {
              const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft
              const budget = formatBudget(project.budget_min, project.budget_max, project.currency)
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: .25, delay: i * .04, ease: [.16, 1, .3, 1] }}
                >
                  <Link href={`/relations/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: 'var(--r)', padding: '18px 20px',
                      display: 'flex', alignItems: 'center', gap: 16,
                      transition: 'border-color .15s, box-shadow .15s',
                      cursor: 'pointer',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: status.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Briefcase size={18} weight="duotone" color={status.color} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          {/* Status badge */}
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: status.color, background: status.bg,
                            padding: '2px 8px', borderRadius: 6,
                          }}>
                            {status.label}
                          </span>
                          {budget && (
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{budget}</span>
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                            <Users size={12} /> {project.member_count}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                            <Clock size={12} /> {timeAgo(project.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        ) : (
          /* Empty state */
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Briefcase size={24} weight="duotone" color="var(--text-muted)" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
              {filter !== 'all' ? 'Keine Projekte in dieser Kategorie' : 'Noch keine Projekte'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
              {filter !== 'all' ? 'Ändere den Filter oder erstelle ein neues Projekt.' : 'Erstelle dein erstes Projekt, um loszulegen.'}
            </p>
            <Link href="/relations/projects/new" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 10,
              background: 'var(--btn-prim)', color: 'var(--btn-prim-text)',
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>
              <Plus size={14} weight="bold" />
              Neues Projekt
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}
