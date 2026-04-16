'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'

type Project = {
  id: string; title: string; description: string | null
  status: string; created_at: string
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; done: number }>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data) {
      setProjects(data)
      const counts: Record<string, { total: number; done: number }> = {}
      for (const p of data) {
        const { data: tasks } = await supabase.from('tasks').select('status').eq('project_id', p.id)
        counts[p.id] = { total: tasks?.length ?? 0, done: tasks?.filter(t => t.status === 'done').length ?? 0 }
      }
      setTaskCounts(counts)
    }
    setLoading(false)
  }

  async function createProject() {
    if (!newTitle.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('projects').insert({ title: newTitle, description: newDesc, user_id: user!.id })
    setNewTitle(''); setNewDesc(''); setShowModal(false)
    await loadData()
    setSaving(false)
  }

  const totalTasks = Object.values(taskCounts).reduce((a, b) => a + b.total, 0)
  const doneTasks = Object.values(taskCounts).reduce((a, b) => a + b.done, 0)
  const activeProjects = projects.filter(p => p.status === 'active').length

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Dashboard</h1>
          <p style={s.subtitle}>Übersicht deiner Projekte & Tasks</p>
        </div>
        <button onClick={() => setShowModal(true)} style={s.btnPrimary}>+ Neues Projekt</button>
      </div>

      {/* Stats */}
      <div style={s.statsGrid}>
        {[
          { label: 'Projekte gesamt', value: projects.length },
          { label: 'Aktive Projekte', value: activeProjects },
          { label: 'Tasks gesamt', value: totalTasks },
          { label: 'Abgeschlossen', value: `${totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0}%` },
        ].map(stat => (
          <div key={stat.label} style={s.statCard}>
            <p style={s.statLabel}>{stat.label}</p>
            <p style={s.statValue}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Projects */}
      <h2 style={s.sectionTitle}>Projekte</h2>
      {loading ? (
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Lädt...</p>
      ) : projects.length === 0 ? (
        <div style={s.emptyState}>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Noch keine Projekte</p>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Erstelle dein erstes Projekt um loszulegen.</p>
          <button onClick={() => setShowModal(true)} style={{ ...s.btnPrimary, marginTop: 16 }}>+ Projekt erstellen</button>
        </div>
      ) : (
        <div style={s.projectGrid}>
          {projects.map(p => {
            const tc = taskCounts[p.id] ?? { total: 0, done: 0 }
            const pct = tc.total ? Math.round(tc.done / tc.total * 100) : 0
            return (
              <Link key={p.id} href={`/project/${p.id}`} style={{ textDecoration: 'none' }}>
                <div style={s.projectCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={s.projectTitle}>{p.title}</h3>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.description && <p style={s.projectDesc}>{p.description}</p>}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
                      <span>{tc.total} Tasks</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ height: 4, background: '#F3F4F6', borderRadius: 4 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#2F6BFF', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Neues Projekt</h3>
            <label style={s.label}>Titel *</label>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Projektname" style={s.input} autoFocus />
            <label style={{ ...s.label, marginTop: 12 }}>Beschreibung</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Kurze Projektbeschreibung..." style={{ ...s.input, height: 80, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={s.btnSecondary}>Abbrechen</button>
              <button onClick={createProject} disabled={saving || !newTitle.trim()} style={{ ...s.btnPrimary, flex: 1, opacity: saving || !newTitle.trim() ? 0.6 : 1 }}>
                {saving ? 'Erstellt...' : 'Projekt erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, color: '#111', margin: 0 },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  btnPrimary: { padding: '9px 18px', background: '#2F6BFF', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '9px 18px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 },
  statCard: { background: '#fff', border: '1px solid #E6E8EE', borderRadius: 12, padding: '20px 24px' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 6, fontWeight: 500 },
  statValue: { fontSize: 28, fontWeight: 700, color: '#111' },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 16 },
  emptyState: { background: '#fff', border: '1px dashed #D1D5DB', borderRadius: 12, padding: 40, textAlign: 'center' },
  projectGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 },
  projectCard: { background: '#fff', border: '1px solid #E6E8EE', borderRadius: 12, padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.15s', ':hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' } },
  projectTitle: { fontSize: 15, fontWeight: 600, color: '#111', margin: 0 },
  projectDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 6, lineHeight: 1.5 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#FAFAFA' },
}
