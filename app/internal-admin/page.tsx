'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Tab = 'overview'|'projects'|'users'|'invites'|'invoices'|'create'|'sso'

type SsoProvider = {
  id: string
  domain: string
  display_name: string
  supabase_provider_id: string | null
  workspace_id: string | null
  default_member_role: string
  status: 'pending' | 'active' | 'disabled'
  enforce_sso?: boolean
  notes?: string | null
}

type SsoRequest = {
  id: string
  domain: string
  workspace_name: string | null
  contact_email: string | null
  idp_hint: string | null
  status: string
  created_at: string
}

type SsoAttempt = {
  id: string
  domain: string | null
  email_hint: string | null
  outcome: string
  error_message: string | null
  created_at: string
}

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
  // Create project for customer
  const [cpUserId, setCpUserId] = useState('')
  const [cpTitle, setCpTitle] = useState('')
  const [cpDesc, setCpDesc] = useState('')
  const [cpStatus, setCpStatus] = useState('intake')
  const [cpLoading, setCpLoading] = useState(false)
  const [cpMsg, setCpMsg] = useState('')
  const [ssoProviders, setSsoProviders] = useState<SsoProvider[]>([])
  const [ssoRequests, setSsoRequests] = useState<SsoRequest[]>([])
  const [ssoAttempts, setSsoAttempts] = useState<SsoAttempt[]>([])
  const [ssoDomain, setSsoDomain] = useState('')
  const [ssoDisplayName, setSsoDisplayName] = useState('')
  const [ssoProviderId, setSsoProviderId] = useState('')
  const [ssoWorkspaceId, setSsoWorkspaceId] = useState('')
  const [ssoStatus, setSsoStatus] = useState<'pending' | 'active' | 'disabled'>('pending')
  const [ssoEnforce, setSsoEnforce] = useState(false)
  const [ssoNotes, setSsoNotes] = useState('')
  const [ssoLoading, setSsoLoading] = useState(false)
  const [ssoMsg, setSsoMsg] = useState('')

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
    await loadSsoProviders()
  }

  async function loadSsoProviders() {
    try {
      const [provRes, reqRes, attRes] = await Promise.all([
        fetch('/api/admin/sso/providers', { credentials: 'include' }),
        fetch('/api/admin/sso/requests?status=all', { credentials: 'include' }),
        fetch('/api/admin/sso/attempts?limit=30', { credentials: 'include' }),
      ])
      const prov = await provRes.json().catch(() => null)
      const req = await reqRes.json().catch(() => null)
      const att = await attRes.json().catch(() => null)
      if (provRes.ok && prov?.ok) setSsoProviders(prov.providers ?? [])
      if (reqRes.ok && req?.ok) setSsoRequests(req.requests ?? [])
      if (attRes.ok && att?.ok) setSsoAttempts(att.attempts ?? [])
    } catch { /* ignore */ }
  }

  async function saveSsoProvider() {
    if (!ssoDomain.trim()) { setSsoMsg('Domain ist Pflicht'); return }
    setSsoLoading(true); setSsoMsg('')
    try {
      const res = await fetch('/api/admin/sso/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          domain: ssoDomain.trim(),
          displayName: ssoDisplayName.trim() || ssoDomain.trim(),
          supabaseProviderId: ssoProviderId.trim() || null,
          workspaceId: ssoWorkspaceId.trim() || null,
          status: ssoStatus,
          enforceSso: ssoEnforce,
          notes: ssoNotes.trim() || null,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setSsoMsg(data?.reason || 'Speichern fehlgeschlagen')
        return
      }
      setSsoMsg('SSO-Domain gespeichert')
      setSsoDomain('')
      setSsoDisplayName('')
      setSsoProviderId('')
      setSsoWorkspaceId('')
      setSsoNotes('')
      setSsoEnforce(false)
      await loadSsoProviders()
    } catch {
      setSsoMsg('Netzwerkfehler')
    } finally {
      setSsoLoading(false)
      setTimeout(() => setSsoMsg(''), 2500)
    }
  }

  async function setRequestStatus(id: string, status: string) {
    await fetch('/api/admin/sso/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, status }),
    })
    await loadSsoProviders()
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

  async function createProjectForUser() {
    if (!cpUserId || !cpTitle.trim()) { setCpMsg('Kunde und Projektname sind Pflichtfelder.'); return }
    setCpLoading(true); setCpMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('projects').insert({
      user_id: cpUserId,
      title: cpTitle.trim(),
      description: cpDesc.trim() || null,
      status: cpStatus,
    })
    setCpLoading(false)
    if (error) { setCpMsg('Fehler: ' + error.message); return }
    setCpMsg('✓ Projekt erfolgreich erstellt!')
    setCpTitle(''); setCpDesc(''); setCpUserId(''); setCpStatus('intake')
    setTimeout(() => setCpMsg(''), 3000)
    loadAll()
  }

  const logout = async () => { await createClient().auth.signOut(); window.location.href = '/login' }

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
  if (!authed) return null

  const TABS: { key: Tab; label: string; highlight?: boolean }[] = [
    { key: 'overview', label: 'Übersicht' },
    { key: 'create',   label: '+ Projekt erstellen', highlight: true },
    { key: 'projects', label: `Projekte (${stats.projects})` },
    { key: 'users', label: `Users (${users.length})` },
    { key: 'invites', label: `Einladungen (${invites.filter(i => i.status === 'pending').length})` },
    { key: 'sso', label: `SSO (${ssoProviders.filter(p => p.status === 'active').length})` },
    { key: 'invoices', label: 'Rechnungen' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/brand/logo-mark.png?v=20260724-split-mark" alt="festag" style={{ height: 22 }} />
          <span style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-text)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>ADMIN</span>
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
              fontWeight: tab === t.key ? 600 : 500,
              color: t.highlight ? (tab === t.key ? 'var(--green-dark)' : 'var(--green-dark)') : (tab === t.key ? 'var(--text)' : 'var(--text-muted)'),
              borderBottom: `2px solid ${tab === t.key ? (t.highlight ? 'var(--green)' : 'var(--text)') : 'transparent'}`,
              marginBottom: -1, fontFamily: 'inherit', whiteSpace: 'nowrap',
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

        {tab === 'create' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
            {/* Create form */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 24 }}>
              <h3 style={{ marginBottom: 6 }}>Projekt für Kunden erstellen</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Das Projekt wird direkt im Kundenkonto eingetragen — kein Onboarding notwendig.</p>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Kunde *</label>
                <select value={cpUserId} onChange={e => setCpUserId(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, background: 'var(--inp)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}>
                  <option value="">— Kunden auswählen —</option>
                  {users.filter(u => u.role === 'client').map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Projektname *</label>
                <input value={cpTitle} onChange={e => setCpTitle(e.target.value)} placeholder="z.B. Web-App für Buchungssystem"
                  style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, background: 'var(--inp)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Beschreibung</label>
                <textarea value={cpDesc} onChange={e => setCpDesc(e.target.value)} rows={3} placeholder="Kurze Projektbeschreibung für den Kunden…"
                  style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, background: 'var(--inp)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Phase</label>
                <select value={cpStatus} onChange={e => setCpStatus(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, background: 'var(--inp)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}>
                  <option value="intake">Intake</option>
                  <option value="planning">Planning</option>
                  <option value="active">In Arbeit (Active)</option>
                  <option value="testing">Testing</option>
                  <option value="done">Abgeschlossen</option>
                </select>
              </div>
              {cpMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: cpMsg.startsWith('✓') ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${cpMsg.startsWith('✓') ? 'var(--green-border)' : 'rgba(200,80,80,.2)'}`, fontSize: 13, color: cpMsg.startsWith('✓') ? 'var(--green-dark)' : 'var(--red)', marginBottom: 14 }}>
                  {cpMsg}
                </div>
              )}
              <button onClick={createProjectForUser} disabled={cpLoading || !cpUserId || !cpTitle.trim()}
                style={{ width: '100%', padding: '13px', background: cpLoading || !cpUserId || !cpTitle.trim() ? 'var(--surface-2)' : 'var(--btn-prim)', color: cpLoading || !cpUserId || !cpTitle.trim() ? 'var(--text-muted)' : 'var(--btn-prim-text)', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 700, cursor: cpLoading || !cpUserId || !cpTitle.trim() ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                {cpLoading ? 'Erstellt…' : 'Projekt erstellen →'}
              </button>
            </div>

            {/* Info panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>Wann nutzen?</p>
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {['Kunde hat kein Onboarding gemacht', 'Projekt wurde telefonisch/per E-Mail besprochen', 'Schnelles Setup für Enterprise Kunden', 'Interne Testprojekte anlegen'].map(i => (
                    <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.5 }}>{i}</li>
                  ))}
                </ul>
              </div>
              <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 'var(--r)', padding: 18 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-dark)', margin: '0 0 6px' }}>✓ Was passiert nach dem Erstellen?</p>
                <p style={{ fontSize: 12, color: 'var(--green-dark)', margin: 0, lineHeight: 1.6, opacity: .8 }}>Das Projekt erscheint sofort im Kunden-Dashboard. Der Kunde kann es über seinen normalen Login sehen und mit Tagro kommunizieren.</p>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>Zuletzt erstellt</p>
                {projects.slice(0, 4).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{p.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 5, flexShrink: 0 }}>{p.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
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
                <button onClick={sendInvite} disabled={inviteLoading} style={{ padding: '10px 18px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: inviteLoading ? 0.6 : 1 }}>
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

        {tab === 'sso' && (
          <div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20, marginBottom: 14 }}>
              <h3 style={{ marginBottom: 6 }}>Firmen-SSO Domain registrieren</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Zuerst SAML in Supabase Auth anlegen, dann Domain hier auf active setzen. Optional Workspace-ID für Auto-Join.
                Kein Self-Serve-IdP / SCIM — manuelles Festag-Setup.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <input value={ssoDomain} onChange={e => setSsoDomain(e.target.value)} placeholder="firma.de"
                  style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, outline: 'none' }} />
                <input value={ssoDisplayName} onChange={e => setSsoDisplayName(e.target.value)} placeholder="Anzeigename (optional)"
                  style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, outline: 'none' }} />
                <input value={ssoProviderId} onChange={e => setSsoProviderId(e.target.value)} placeholder="Supabase Provider ID (optional)"
                  style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, outline: 'none' }} />
                <input value={ssoWorkspaceId} onChange={e => setSsoWorkspaceId(e.target.value)} placeholder="Workspace UUID für Auto-Join (optional)"
                  style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={ssoStatus} onChange={e => setSsoStatus(e.target.value as any)}
                  style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, background: '#fff', cursor: 'pointer' }}>
                  <option value="pending">pending</option>
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={ssoEnforce} onChange={e => setSsoEnforce(e.target.checked)} />
                  SSO erzwingen (Magic-Link/Google umleiten)
                </label>
                <button onClick={saveSsoProvider} disabled={ssoLoading}
                  style={{ padding: '10px 18px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: ssoLoading ? 0.6 : 1 }}>
                  {ssoLoading ? 'Speichert…' : 'Speichern'}
                </button>
              </div>
              {ssoMsg && <p style={{ fontSize: 12, color: ssoMsg.includes('gespeichert') ? 'var(--green-dark)' : 'var(--red)', marginTop: 10 }}>{ssoMsg}</p>}
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['Domain', 'Name', 'Status', 'Enforce', 'Workspace', 'Provider'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {ssoProviders.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                      <td style={{ ...td, fontSize: 13, fontWeight: 600 }}>{p.domain}</td>
                      <td style={{ ...td, fontSize: 13 }}>{p.display_name || '—'}</td>
                      <td style={td}>
                        <span style={{
                          padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                          color: p.status === 'active' ? 'var(--green-dark)' : 'var(--text-muted)',
                          background: p.status === 'active' ? 'var(--green-bg)' : 'var(--surface-2)',
                        }}>{p.status.toUpperCase()}</span>
                      </td>
                      <td style={{ ...td, fontSize: 12 }}>{p.enforce_sso ? 'ja' : '—'}</td>
                      <td style={{ ...td, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.workspace_id ? `${p.workspace_id.slice(0, 8)}…` : '—'}</td>
                      <td style={{ ...td, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.supabase_provider_id || 'domain'}</td>
                    </tr>
                  ))}
                  {ssoProviders.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Noch keine SSO-Domains</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
                  Anfragen ({ssoRequests.filter(r => r.status === 'open' || r.status === 'in_progress').length} offen)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    {['Domain', 'IdP', 'Status', ''].map(h => <th key={h || 'a'} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {ssoRequests.slice(0, 20).map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                        <td style={{ ...td, fontSize: 12, fontWeight: 600 }}>
                          {r.domain}
                          <div style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>{r.contact_email || r.workspace_name || '—'}</div>
                        </td>
                        <td style={{ ...td, fontSize: 11 }}>{r.idp_hint || '—'}</td>
                        <td style={{ ...td, fontSize: 11 }}>{r.status}</td>
                        <td style={td}>
                          {(r.status === 'open' || r.status === 'in_progress') && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => setRequestStatus(r.id, 'in_progress')} style={{ fontSize: 10, padding: '4px 8px', cursor: 'pointer' }}>WIP</button>
                              <button onClick={() => setRequestStatus(r.id, 'done')} style={{ fontSize: 10, padding: '4px 8px', cursor: 'pointer' }}>Done</button>
                              <button onClick={() => setRequestStatus(r.id, 'declined')} style={{ fontSize: 10, padding: '4px 8px', cursor: 'pointer' }}>Nein</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {ssoRequests.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Keine Anfragen</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
                  Letzte Login-Versuche
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    {['Domain', 'Outcome', 'Zeit'].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {ssoAttempts.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                        <td style={{ ...td, fontSize: 12 }}>
                          {a.domain || '—'}
                          {a.email_hint && <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{a.email_hint}</div>}
                        </td>
                        <td style={{ ...td, fontSize: 11 }}>{a.outcome}{a.error_message ? ` — ${a.error_message.slice(0, 40)}` : ''}</td>
                        <td style={{ ...td, fontSize: 11, color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleString('de')}</td>
                      </tr>
                    ))}
                    {ssoAttempts.length === 0 && (
                      <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Noch keine Versuche</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
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
// PIN management is handled in invites tab above
