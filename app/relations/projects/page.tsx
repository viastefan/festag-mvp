'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type RelProject = {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
  source: 'rel' | 'assigned'
  color?: string | null
  phase?: string | null
}

type MainProject = { id: string; title: string; description: string | null; status: string; color: string | null }
type RelUser = { id: string; email: string; first_name: string | null; full_name: string | null }

const PHASE_LABEL: Record<string, string> = {
  intake: 'Intake', planning: 'Planung', active: 'In Arbeit', testing: 'Testing', done: 'Abgeschlossen',
  draft: 'Entwurf', active_rel: 'Aktiv', paused: 'Pausiert', completed: 'Abgeschlossen', archived: 'Archiviert',
}

const PROJECT_COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#64748b']

export default function RelProjectsPage() {
  const [projects,    setProjects]    = useState<RelProject[]>([])
  const [loading,     setLoading]     = useState(true)
  const [userRole,    setUserRole]    = useState<string>('client')
  const [userId,      setUserId]      = useState<string>('')
  const [showModal,   setShowModal]   = useState(false)
  const [showAssign,  setShowAssign]  = useState(false)

  // New project form
  const [nTitle,      setNTitle]      = useState('')
  const [nDesc,       setNDesc]       = useState('')
  const [nColor,      setNColor]      = useState('#6366f1')
  const [nSaving,     setNSaving]     = useState(false)

  // Assign modal
  const [mainProjects, setMainProjects] = useState<MainProject[]>([])
  const [relUsers,     setRelUsers]     = useState<RelUser[]>([])
  const [aProject,     setAProject]     = useState('')
  const [aUser,        setAUser]        = useState('')
  const [aSaving,      setASaving]      = useState(false)
  const [aMsg,         setAMsg]         = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: prof } = await sb.from('profiles').select('role').eq('id', user.id).single()
    const role = (prof as any)?.role ?? 'client'
    setUserRole(role)

    const isPrivileged = role === 'admin' || role === 'dev'

    // Fetch rel_projects (created by this user, or all if admin/dev)
    const relQ = sb.from('rel_projects').select('id,title,description,status,created_at')
    const { data: relData } = await (isPrivileged ? relQ.order('created_at', { ascending: false }) : relQ.eq('user_id', user.id).order('created_at', { ascending: false }))

    // Fetch main projects assigned to this user (or all assigned ones if admin/dev)
    const assignQ = (sb as any).from('projects').select('id,title,description,status,color,created_at')
    const { data: assignedData } = await (isPrivileged
      ? assignQ.not('rel_user_id', 'is', null).order('created_at', { ascending: false })
      : assignQ.eq('rel_user_id', user.id).order('created_at', { ascending: false }))

    const combined: RelProject[] = [
      ...((relData as any[]) ?? []).map((p: any) => ({ ...p, source: 'rel' as const, color: null })),
      ...((assignedData as any[]) ?? []).map((p: any) => ({ ...p, source: 'assigned' as const, color: p.color })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setProjects(combined)

    if (isPrivileged) {
      const { data: mp } = await (sb as any).from('projects').select('id,title,description,status,color').order('created_at', { ascending: false })
      setMainProjects((mp as any[]) ?? [])
      const { data: ru } = await sb.from('profiles').select('id,email,first_name,full_name').neq('id', user.id)
      setRelUsers((ru as any[]) ?? [])
    }

    setLoading(false)
  }

  async function createProject() {
    if (!nTitle.trim() || nSaving) return
    setNSaving(true)
    const sb = createClient()
    await (sb as any).from('rel_projects').insert({ user_id: userId, title: nTitle.trim(), description: nDesc.trim() || null, status: 'draft', color: nColor })
    setNTitle(''); setNDesc(''); setNColor('#6366f1'); setShowModal(false); setNSaving(false)
    load()
  }

  async function assignProject() {
    if (!aProject || !aUser || aSaving) return
    setASaving(true); setAMsg('')
    const sb = createClient()
    const { error } = await (sb as any).from('projects').update({ rel_user_id: aUser }).eq('id', aProject)
    if (error) { setAMsg('Fehler: ' + error.message) }
    else { setAMsg('Projekt erfolgreich zugewiesen.'); load() }
    setASaving(false)
  }

  const isPrivileged = userRole === 'admin' || userRole === 'dev'

  if (loading) return (
    <div className="page-content" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div style={{ width:22, height:22, border:'2px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )

  return (
    <div className="page-content" style={{ maxWidth:900 }}>
      <style>{`
        @keyframes spin    { to{transform:rotate(360deg);} }
        @keyframes fadeIn  { from{opacity:0;} to{opacity:1;} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px) scale(.98);}to{opacity:1;transform:none;} }
        .proj-row-hover { transition:background .08s; }
        .proj-row-hover:hover { background:var(--surface-2) !important; }
        .ob-field { width:100%; padding:8px 12px; background:transparent; border:1px solid var(--border); border-radius:7px; font-size:13px; color:var(--text); font-family:inherit; outline:none; box-sizing:border-box; transition:border-color .15s; }
        .ob-field:focus { border-color:var(--text-secondary); }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:600, letterSpacing:'-.4px' }}>Projekte</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--text-muted)' }}>
            {projects.length} Projekt{projects.length !== 1 ? 'e' : ''}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isPrivileged && (
            <button onClick={() => setShowAssign(true)}
              style={{ height:32, padding:'0 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:7, fontSize:12, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>
              Projekt zuweisen
            </button>
          )}
          <button onClick={() => setShowModal(true)}
            style={{ height:32, padding:'0 14px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Neues Projekt
          </button>
        </div>
      </div>

      {/* Project list */}
      {projects.length === 0 ? (
        <div style={{ borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'60px 0', textAlign:'center' }}>
          <p style={{ fontSize:15, fontWeight:600, color:'var(--text)', margin:'0 0 6px' }}>Noch keine Projekte</p>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 20px' }}>
            {isPrivileged ? 'Weise ein bestehendes Projekt zu oder erstelle ein neues.' : 'Dein Projektteam wird dein Projekt hier eintragen.'}
          </p>
          {isPrivileged && (
            <button onClick={() => setShowModal(true)}
              style={{ height:34, padding:'0 16px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Neues Projekt erstellen
            </button>
          )}
        </div>
      ) : (
        <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          {projects.map((p, i) => {
            const dot = p.color || '#64748b'
            const label = PHASE_LABEL[p.status] ?? p.status
            const href = p.source === 'assigned' ? `/project/${p.id}` : `/relations/projects/${p.id}`
            return (
              <Link key={p.id} href={href} style={{ textDecoration:'none', color:'inherit' }}>
                <div className="proj-row-hover" style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 16px', borderBottom: i < projects.length-1 ? '1px solid var(--border)' : 'none', background:'var(--card)' }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:dot, flexShrink:0 }}/>
                  <span style={{ flex:1, fontSize:13.5, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</span>
                  {p.description && (
                    <span style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:260, display:'none' }} className="proj-desc">{p.description}</span>
                  )}
                  {p.source === 'assigned' && (
                    <span style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', border:'1px solid var(--border)', borderRadius:4, padding:'1px 6px', flexShrink:0 }}>Festag</span>
                  )}
                  <span style={{ fontSize:11.5, color:'var(--text-muted)', flexShrink:0 }}>{label}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, opacity:.4 }}><path d="M9 6l6 6-6 6"/></svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* ── NEW PROJECT MODAL ── */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.65)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, animation:'fadeIn .15s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:500, animation:'slideUp .2s cubic-bezier(.16,1,.3,1)' }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:nColor }}/>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Neues Projekt</span>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding:'18px 18px 0' }}>
              <input
                value={nTitle}
                onChange={e => setNTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) createProject() }}
                placeholder="Projektname"
                autoFocus
                style={{ width:'100%', background:'transparent', border:'none', outline:'none', fontSize:18, fontWeight:600, color:'var(--text)', fontFamily:'inherit', letterSpacing:'-.2px', marginBottom:10, boxSizing:'border-box' }}
              />
              <textarea
                value={nDesc}
                onChange={e => setNDesc(e.target.value)}
                placeholder="Beschreibung hinzufügen…"
                rows={3}
                style={{ width:'100%', background:'transparent', border:'none', outline:'none', fontSize:13.5, color:'var(--text-secondary)', fontFamily:'inherit', resize:'none', lineHeight:1.6, boxSizing:'border-box' }}
              />
            </div>

            {/* Color picker row */}
            <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500, marginRight:4 }}>Farbe</span>
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => setNColor(c)}
                  style={{ width:16, height:16, borderRadius:'50%', background:c, border: nColor===c?'2px solid var(--text)':'2px solid transparent', cursor:'pointer', padding:0, flexShrink:0 }}/>
              ))}
            </div>

            {/* Footer */}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'10px 18px 14px', borderTop:'1px solid var(--border)' }}>
              <button onClick={() => setShowModal(false)}
                style={{ height:30, padding:'0 12px', background:'transparent', border:'1px solid var(--border)', borderRadius:6, fontSize:12, fontWeight:500, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>
                Abbrechen
              </button>
              <button onClick={createProject} disabled={!nTitle.trim() || nSaving}
                style={{ height:30, padding:'0 14px', background:nTitle.trim()?'var(--btn-prim)':'var(--border)', color:nTitle.trim()?'var(--btn-prim-text)':'var(--text-muted)', border:'none', borderRadius:6, fontSize:12, fontWeight:600, cursor:nTitle.trim()?'pointer':'default', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                {nSaving ? <span style={{ width:10, height:10, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> : null}
                Erstellen
                {!nSaving && <span style={{ fontSize:10, opacity:.55 }}>⌘↵</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSIGN MODAL (admin/dev only) ── */}
      {showAssign && isPrivileged && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.65)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, animation:'fadeIn .15s ease' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAssign(false); setAMsg('') } }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:480, animation:'slideUp .2s cubic-bezier(.16,1,.3,1)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Projekt zuweisen</span>
              <button onClick={() => { setShowAssign(false); setAMsg('') }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding:'18px 18px 0', display:'flex', flexDirection:'column', gap:14 }}>
              <p style={{ margin:0, fontSize:12.5, color:'var(--text-muted)', lineHeight:1.55 }}>
                Weise ein bestehendes Festag-Projekt einem Relations-Kunden zu. Es erscheint dann in seinem Panel.
              </p>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em', display:'block', marginBottom:5 }}>PROJEKT</label>
                <select value={aProject} onChange={e => setAProject(e.target.value)} className="ob-field" style={{ cursor:'pointer' }}>
                  <option value="">Projekt wählen…</option>
                  {mainProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em', display:'block', marginBottom:5 }}>KUNDE</label>
                <select value={aUser} onChange={e => setAUser(e.target.value)} className="ob-field" style={{ cursor:'pointer' }}>
                  <option value="">Kunde wählen…</option>
                  {relUsers.map(u => <option key={u.id} value={u.id}>{u.first_name || u.full_name || u.email}</option>)}
                </select>
              </div>
              {aMsg && (
                <p style={{ margin:0, fontSize:12, color: aMsg.startsWith('Fehler') ? '#ef4444' : '#22c55e', fontWeight:500 }}>{aMsg}</p>
              )}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'14px 18px', borderTop:'1px solid var(--border)', marginTop:18 }}>
              <button onClick={() => { setShowAssign(false); setAMsg('') }}
                style={{ height:30, padding:'0 12px', background:'transparent', border:'1px solid var(--border)', borderRadius:6, fontSize:12, fontWeight:500, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>
                Schließen
              </button>
              <button onClick={assignProject} disabled={!aProject || !aUser || aSaving}
                style={{ height:30, padding:'0 14px', background:aProject&&aUser?'var(--btn-prim)':'var(--border)', color:aProject&&aUser?'var(--btn-prim-text)':'var(--text-muted)', border:'none', borderRadius:6, fontSize:12, fontWeight:600, cursor:aProject&&aUser?'pointer':'default', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                {aSaving ? <span style={{ width:10, height:10, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> : null}
                Zuweisen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
