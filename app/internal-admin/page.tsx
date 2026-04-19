'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Tab = 'overview'|'projects'|'users'|'invites'|'invoices'

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState({ projects: 0, users: 0, devs: 0, activeProjects: 0, revenue: 0 })
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'dev'|'admin'>('dev')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
      if (p?.role !== 'admin') { window.location.href = '/dashboard'; return }
      setAuthed(true); setChecking(false); loadAll()
    })
  }, [])

  async function loadAll() {
    const supabase = createClient()
    const [p, u, inv, q] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('team_invites').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('project_quotes').select('total_price'),
    ])
    setProjects(p.data ?? [])
    setUsers(u.data ?? [])
    setInvites(inv.data ?? [])
    setStats({
      projects: p.data?.length ?? 0,
      activeProjects: p.data?.filter((x: any) => x.status === 'active' || x.status === 'testing').length ?? 0,
      users: u.data?.filter((x: any) => x.role === 'client').length ?? 0,
      devs: u.data?.filter((x: any) => x.role === 'dev' || x.role === 'admin').length ?? 0,
      revenue: q.data?.reduce((s: number, x: any) => s + Number(x.total_price ?? 0), 0) ?? 0,
    })
  }

  async function sendInvite() {
    if (!inviteEmail.includes('@')) { setInviteMsg('Ungültige E-Mail'); return }
    setInviteLoading(true); setInviteMsg('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('team_invites').insert({ email: inviteEmail, role: inviteRole, invited_by: user?.id })
    setInviteLoading(false)
    if (error) { setInviteMsg(error.message); return }
    setInviteMsg('Einladung erstellt'); setInviteEmail('')
    setTimeout(() => setInviteMsg(''), 2500); loadAll()
  }

  async function updateRole(userId: string, role: string) {
    await createClient().from('profiles').update({ role }).eq('id', userId); loadAll()
  }

  const logout = async () => { await createClient().auth.signOut(); window.location.href = '/login' }

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
  if (!authed) return null

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Übersicht' },
    { key: 'projects', label: `Projekte (${stats.projects})` },
    { key: 'users', label: `Users (${users.length})` },
    { key: 'invites', label: `Einladungen (${invites.filter(i => i.status === 'pending').length})` },
    { key: 'invoices', label: 'Rechnungen' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height: 18 }} />
          <span style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--text)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Client →</Link>
          <button onClick={logout} style={{ padding: '6px 12px', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Abmelden</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px' }}>
        <h1 style={{ marginBottom: 6 }}>Admin Panel</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 22 }}>Vollständige Kontrolle über die Festag Production Engine</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'PROJEKTE', value: stats.projects },
            { label: 'AKTIV', value: stats.activeProjects, color: 'var(--green-dark)' },
            { label: 'CLIENTS', value: stats.users },
            { label: 'TEAM', value: stats.devs },
            { label: 'REVENUE', value: `€${stats.revenue.toLocaleString('de')}` },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: s.color ?? 'var(--text)', lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 20, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t.key ? 600 : 500, color: tab === t.key ? 'var(--text)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === t.key ? 'var(--text)' : 'transparent'}`, marginBottom: -1, fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
              <h3 style={{ marginBottom: 14 }}>Aktive Projekte</h3>
              {projects.filter(p => ['active','testing','planning'].includes(p.status)).slice(0,8).map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--surface-2)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{p.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{new Date(p.created_at).toLocaleDateString('de')}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600, color: p.status === 'active' ? 'var(--green-dark)' : 'var(--text-secondary)', background: p.status === 'active' ? 'var(--green-bg)' : 'var(--surface-2)' }}>{p.status.toUpperCase()}</span>
                    <Link href={`/project/${p.id}`} style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>→</Link>
                  </div>
                </div>
              ))}
              {projects.filter(p => ['active','testing','planning'].includes(p.status)).length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>Keine aktiven Projekte</p>
              )}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
              <h3 style={{ marginBottom: 14 }}>Team</h3>
              {users.filter(u => u.role === 'dev' || u.role === 'admin').map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--surface-2)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    {(u.full_name ?? u.email).charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, textTransform: 'capitalize' }}>{u.role}</p>
                  </div>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'projects' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                {['Titel','Status','Erstellt','Aktion'].map(h => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                    <td style={td}><p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{p.title}</p>{p.description && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{(p.description as string).slice(0, 70)}</p>}</td>
                    <td style={td}><span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{p.status.toUpperCase()}</span></td>
                    <td style={{ ...td, fontSize: 12, color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleDateString('de')}</td>
                    <td style={td}><Link href={`/project/${p.id}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Öffnen →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'users' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                {['E-Mail','Name','Rolle','Seit'].map(h => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                    <td style={{ ...td, fontSize: 13 }}>{u.email}</td>
                    <td style={{ ...td, fontSize: 13, color: 'var(--text-muted)' }}>{u.full_name ?? '—'}</td>
                    <td style={td}>
                      <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} style={{ padding: '5px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', fontSize: 12, background: '#fff', cursor: 'pointer' }}>
                        <option value="client">Client</option>
                        <option value="dev">Developer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ ...td, fontSize: 12, color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString('de')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'invites' && (
          <div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20, marginBottom: 14 }}>
              <h3 style={{ marginBottom: 14 }}>Developer einladen</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="developer@beispiel.de" onKeyDown={e => e.key === 'Enter' && sendInvite()}
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, outline: 'none' }} />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)} style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, background: '#fff', cursor: 'pointer' }}>
                  <option value="dev">Developer</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={sendInvite} disabled={inviteLoading} style={{ padding: '10px 18px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: inviteLoading ? 0.6 : 1 }}>
                  {inviteLoading ? 'Sendet…' : 'Einladen'}
                </button>
              </div>
              {inviteMsg && <p style={{ fontSize: 12, color: inviteMsg.includes('erstellt') ? 'var(--green-dark)' : 'var(--red)', marginTop: 10 }}>{inviteMsg}</p>}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['E-Mail','Rolle','Status','Läuft ab'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {invites.map(i => (
                    <tr key={i.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                      <td style={{ ...td, fontSize: 13 }}>{i.email}</td>
                      <td style={{ ...td, fontSize: 12, textTransform: 'capitalize' }}>{i.role}</td>
                      <td style={td}><span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600, color: i.status === 'accepted' ? 'var(--green-dark)' : 'var(--text-muted)', background: i.status === 'accepted' ? 'var(--green-bg)' : 'var(--surface-2)' }}>{i.status.toUpperCase()}</span></td>
                      <td style={{ ...td, fontSize: 12, color: 'var(--text-muted)' }}>{new Date(i.expires_at).toLocaleDateString('de')}</td>
                    </tr>
                  ))}
                  {invites.length === 0 && <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Keine Einladungen</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'invoices' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Rechnungssystem in Entwicklung</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rechnungen werden hier verwaltet sobald Projekte abgeschlossen sind.</p>
          </div>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textAlign: 'left', textTransform: 'uppercase' }
const td: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle' }
