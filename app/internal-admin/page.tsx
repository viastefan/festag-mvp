'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type User = { id: string; email: string; role: string; full_name: string | null; created_at: string }
type Project = { id: string; title: string; status: string; user_id: string }
type Task = { id: string; title: string; status: string; project_id: string }

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTab, setActiveTab] = useState<'overview'|'users'|'projects'|'tasks'>('overview')
  const [updatingRole, setUpdatingRole] = useState<string|null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      // Check admin role
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
      if (profile?.role === 'admin') {
        setAuthed(true)
        loadAll()
      }
      setChecking(false)
    })
  }, [])

  async function loadAll() {
    const [{ data: u }, { data: p }, { data: t }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    ])
    setUsers(u ?? [])
    setProjects(p ?? [])
    setTasks(t ?? [])
  }

  async function updateRole(userId: string, role: string) {
    setUpdatingRole(userId)
    await supabase.from('profiles').update({ role }).eq('id', userId)
    setUsers(users.map(u => u.id === userId ? { ...u, role } : u))
    setUpdatingRole(null)
  }

  async function makeAdmin(email: string) {
    await supabase.from('profiles').update({ role: 'admin' }).eq('email', email)
    loadAll()
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0B0E', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>AUTHENTIFIZIERUNG…</p>
      </div>
    </div>
  )

  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0B0E' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', margin: '0 auto 20px' }}>⊘</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Zugang verweigert</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Diese Seite ist nur für Festag-Administratoren zugänglich.</p>
        <button onClick={() => window.location.href = '/dashboard'} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Zurück zum Dashboard
        </button>
      </div>
    </div>
  )

  const doneTasks = tasks.filter(t => t.status === 'done').length
  const activePrj = projects.filter(p => p.status === 'active').length

  return (
    <div style={{ minHeight: '100vh', background: '#0A0B0E', color: '#fff', padding: '32px 40px', fontFamily: 'Aeonik, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>F</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>FESTAG · INTERNAL ADMIN</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>System Control Panel</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600, letterSpacing: '0.08em' }}>ADMIN AKTIV</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'NUTZER', value: users.length, color: '#2563EB' },
          { label: 'PROJEKTE', value: projects.length, color: '#7C3AED' },
          { label: 'AKTIV', value: activePrj, color: '#10B981' },
          { label: 'TASKS DONE', value: doneTasks, color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {['overview','users','projects','tasks'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
            fontSize: 12, fontWeight: activeTab === tab ? 600 : 400, fontFamily: 'inherit',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Recent Users */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 16 }}>NUTZER ÜBERSICHT</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {users.slice(0,5).map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{u.email}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{new Date(u.created_at).toLocaleDateString('de')}</p>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                    background: u.role === 'admin' ? 'rgba(220,38,38,0.2)' : u.role === 'dev' ? 'rgba(16,185,129,0.2)' : 'rgba(37,99,235,0.2)',
                    color: u.role === 'admin' ? '#F87171' : u.role === 'dev' ? '#34D399' : '#60A5FA',
                  }}>
                    {u.role.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Recent Projects */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 16 }}>PROJEKTE ÜBERSICHT</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {projects.slice(0,5).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 13, color: '#fff', flex: 1, paddingRight: 8 }}>{p.title}</p>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: p.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)', color: p.status === 'active' ? '#34D399' : 'rgba(255,255,255,0.4)' }}>
                    {p.status.toUpperCase()}
                  </span>
                </div>
              ))}
              {projects.length === 0 && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Keine Projekte</p>}
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
            {['E-Mail','Rolle','Erstellt'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{h}</span>
            ))}
          </div>
          {users.map(u => (
            <div key={u.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, color: '#fff' }}>{u.email}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{u.full_name || '–'}</p>
              </div>
              <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} disabled={updatingRole === u.id}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <option value="client">client</option>
                <option value="dev">dev</option>
                <option value="admin">admin</option>
              </select>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{new Date(u.created_at).toLocaleDateString('de')}</span>
            </div>
          ))}
          {users.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Keine Nutzer</div>}
        </div>
      )}

      {/* Projects */}
      {activeTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map(p => (
            <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 2 }}>{p.title}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>ID: {p.id.slice(0,8)}… · User: {p.user_id.slice(0,8)}…</p>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: p.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: p.status === 'active' ? '#34D399' : 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
                {p.status.toUpperCase()}
              </span>
            </div>
          ))}
          {projects.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Keine Projekte</div>}
        </div>
      )}

      {/* Tasks */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tasks.slice(0,50).map(t => (
            <div key={t.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{t.title}</p>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: t.status === 'done' ? 'rgba(16,185,129,0.15)' : t.status === 'doing' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)', color: t.status === 'done' ? '#34D399' : t.status === 'doing' ? '#FCD34D' : 'rgba(255,255,255,0.4)' }}>
                {t.status.toUpperCase()}
              </span>
            </div>
          ))}
          {tasks.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Keine Tasks</div>}
        </div>
      )}

      <div style={{ marginTop: 40, padding: '16px 20px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(220,38,38,0.8)', letterSpacing: '0.08em', marginBottom: 4 }}>⚠ INTERNER BEREICH</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Diese Seite ist nur für Festag-Administratoren. URL: /internal-admin</p>
      </div>
    </div>
  )
}
