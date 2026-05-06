'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type RelProject = {
  id: string; title: string; description: string | null
  status: string; created_at: string; color?: string | null
}

type RelNote = {
  id: string; title: string; content: string | null; color: string | null
  due_date: string | null; shared: boolean; status: string; created_at: string
  user_id: string; user_name?: string
}

type MainProject = { id: string; title: string; description: string | null; status: string; color: string | null }
type RelUser    = { id: string; email: string; first_name: string | null; full_name: string | null }

const PHASE_LABEL: Record<string, string> = {
  intake:'Intake', planning:'Planung', active:'In Arbeit', testing:'Testing',
  done:'Abgeschlossen', draft:'Entwurf', active_rel:'Aktiv',
  paused:'Pausiert', completed:'Abgeschlossen', archived:'Archiviert',
}
const NOTE_STATUS: Record<string, { label:string; color:string }> = {
  open:        { label:'Offen',        color:'var(--text-muted)' },
  in_progress: { label:'In Arbeit',    color:'#f97316' },
  done:        { label:'Erledigt',     color:'#22c55e' },
}
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#64748b']

function fmt(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'short' })
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day:'2-digit', month:'short', year:'numeric' })
}

export default function RelProjectsPage() {
  const [projects,     setProjects]     = useState<RelProject[]>([])
  const [notes,        setNotes]        = useState<RelNote[]>([])
  const [loading,      setLoading]      = useState(true)
  const [userRole,     setUserRole]     = useState('client')
  const [userId,       setUserId]       = useState('')

  // Note modal
  const [showNote,     setShowNote]     = useState(false)
  const [nTitle,       setNTitle]       = useState('')
  const [nContent,     setNContent]     = useState('')
  const [nColor,       setNColor]       = useState('#6366f1')
  const [nDue,         setNDue]         = useState('')
  const [nShared,      setNShared]      = useState(true)
  const [nSaving,      setNSaving]      = useState(false)
  const [editNote,     setEditNote]     = useState<RelNote|null>(null)

  // Assign modal (admin/dev)
  const [showAssign,   setShowAssign]   = useState(false)
  const [mainProjects, setMainProjects] = useState<MainProject[]>([])
  const [relUsers,     setRelUsers]     = useState<RelUser[]>([])
  const [aProject,     setAProject]     = useState('')
  const [aUser,        setAUser]        = useState('')
  const [aSaving,      setASaving]      = useState(false)
  const [aMsg,         setAMsg]         = useState('')

  // Tagro generate
  const [generating,   setGenerating]   = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])
  useEffect(() => { if (showNote) setTimeout(() => titleRef.current?.focus(), 60) }, [showNote])

  async function load() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: prof } = await sb.from('profiles').select('role').eq('id', user.id).single()
    const role = (prof as any)?.role ?? 'client'
    setUserRole(role)
    const isPriv = role === 'admin' || role === 'dev'

    // Assigned projects (from Festag team)
    const assignQ = (sb as any).from('projects').select('id,title,description,status,color,created_at')
    const { data: assignedData } = await (isPriv
      ? assignQ.not('rel_user_id', 'is', null).order('created_at', { ascending: false })
      : assignQ.eq('rel_user_id', user.id).order('created_at', { ascending: false }))
    setProjects((assignedData as any[]) ?? [])

    // Notes
    const { data: notesData } = await (sb as any).from('rel_notes')
      .select('id,title,content,color,due_date,shared,status,created_at,user_id')
      .order('created_at', { ascending: false })
    if (notesData && isPriv) {
      const uids = [...new Set((notesData as any[]).map((n:any) => n.user_id))]
      const { data: pData } = await sb.from('profiles').select('id,first_name,full_name').in('id', uids as string[])
      const pMap: Record<string,string> = {}
      ;(pData as any[] ?? []).forEach((p:any) => { pMap[p.id] = p.first_name || p.full_name?.split(' ')[0] || 'Kunde' })
      setNotes((notesData as any[]).map((n:any) => ({ ...n, user_name: pMap[n.user_id] })))
    } else {
      setNotes((notesData as any[]) ?? [])
    }

    if (isPriv) {
      const { data: mp } = await (sb as any).from('projects').select('id,title,description,status,color').order('created_at', { ascending: false })
      setMainProjects((mp as any[]) ?? [])
      const { data: ru } = await sb.from('profiles').select('id,email,first_name,full_name').neq('id', user.id)
      setRelUsers((ru as any[]) ?? [])
    }
    setLoading(false)
  }

  function openNew() {
    setEditNote(null); setNTitle(''); setNContent(''); setNColor('#6366f1'); setNDue(''); setNShared(true)
    setShowNote(true)
  }
  function openEdit(n: RelNote) {
    setEditNote(n); setNTitle(n.title); setNContent(n.content ?? ''); setNColor(n.color ?? '#6366f1')
    setNDue(n.due_date ?? ''); setNShared(n.shared)
    setShowNote(true)
  }

  async function saveNote() {
    if (!nTitle.trim() || nSaving) return
    setNSaving(true)
    const sb = createClient()
    const payload = { title: nTitle.trim(), content: nContent.trim() || null, color: nColor, due_date: nDue || null, shared: nShared }
    if (editNote) {
      await (sb as any).from('rel_notes').update(payload).eq('id', editNote.id)
    } else {
      await (sb as any).from('rel_notes').insert({ ...payload, user_id: userId, status: 'open' })
    }
    setShowNote(false); setNSaving(false); load()
  }

  async function deleteNote(id: string) {
    await (createClient() as any).from('rel_notes').delete().eq('id', id)
    setShowNote(false); load()
  }

  async function cycleStatus(note: RelNote, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    const order = ['open','in_progress','done']
    const next = order[(order.indexOf(note.status) + 1) % order.length]
    await (createClient() as any).from('rel_notes').update({ status: next }).eq('id', note.id)
    setNotes(ns => ns.map(n => n.id === note.id ? { ...n, status: next } : n))
  }

  async function generateWithTagro() {
    setGenerating(true)
    // Simulate Tagro generating a note from project context
    await new Promise(r => setTimeout(r, 1400))
    setNTitle('Projektanalyse – ' + new Date().toLocaleDateString('de-DE', { day:'2-digit', month:'short' }))
    setNContent('Tagro hat folgende Punkte aus dem aktuellen Projektstatus zusammengefasst:\n\n• Aktueller Fortschritt läuft planmäßig\n• Nächste Milestone steht an\n• Offene Fragen wurden identifiziert\n\nBitte prüfen und ergänzen.')
    setNShared(true)
    setGenerating(false)
  }

  async function assignProject() {
    if (!aProject || !aUser || aSaving) return
    setASaving(true); setAMsg('')
    const { error } = await (createClient() as any).from('projects').update({ rel_user_id: aUser }).eq('id', aProject)
    setAMsg(error ? 'Fehler: ' + error.message : 'Projekt erfolgreich zugewiesen.')
    setASaving(false)
    if (!error) load()
  }

  const isPriv = userRole === 'admin' || userRole === 'dev'
  const sharedNotes = notes.filter(n => n.shared)
  const myNotes = notes.filter(n => !n.shared || n.user_id === userId)

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
        .rp-row { transition:background .08s; cursor:pointer; }
        .rp-row:hover { background:var(--surface-2) !important; }
        .ob-field { width:100%; padding:8px 12px; background:transparent; border:1px solid var(--border); border-radius:7px; font-size:13px; color:var(--text); font-family:inherit; outline:none; box-sizing:border-box; transition:border-color .15s; }
        .ob-field:focus { border-color:var(--text-secondary); }
        .note-status-btn { background:none; border:none; cursor:pointer; padding:0; display:flex; align-items:center; gap:3px; }
        .note-status-btn:hover { opacity:.7; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:600, letterSpacing:'-.4px' }}>Projekte & Notizen</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--text-muted)' }}>
            {projects.length} Projekt{projects.length !== 1 ? 'e' : ''} · {notes.length} Notiz{notes.length !== 1 ? 'en' : ''}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isPriv && (
            <button onClick={() => setShowAssign(true)}
              style={{ height:32, padding:'0 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:7, fontSize:12, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>
              Projekt zuweisen
            </button>
          )}
          <button onClick={openNew}
            style={{ height:32, padding:'0 14px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Neue Notiz
          </button>
        </div>
      </div>

      {/* ── Zugewiesene Projekte ── */}
      <div style={{ marginBottom:32 }}>
        <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, letterSpacing:'.06em', color:'var(--text-muted)', textTransform:'uppercase' }}>
          Deine Projekte
        </p>
        {projects.length === 0 ? (
          <div style={{ border:'1px solid var(--border)', borderRadius:10, padding:'40px 0', textAlign:'center' }}>
            <p style={{ fontSize:13.5, fontWeight:600, color:'var(--text)', margin:'0 0 5px' }}>Noch kein Projekt zugewiesen</p>
            <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0 }}>
              {isPriv ? 'Weise einem Kunden ein Projekt zu.' : 'Dein Festag-Team wird dein Projekt hier eintragen.'}
            </p>
          </div>
        ) : (
          <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
            {projects.map((p, i) => (
              <Link key={p.id} href={isPriv ? `/project/${p.id}` : `/relations/projects/${p.id}`} style={{ textDecoration:'none', color:'inherit' }}>
                <div className="rp-row" style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 16px', borderBottom: i < projects.length-1 ? '1px solid var(--border)' : 'none', background:'var(--card)' }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:p.color||'#64748b', flexShrink:0 }}/>
                  <span style={{ flex:1, fontSize:13.5, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</span>
                  <span style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', border:'1px solid var(--border)', borderRadius:4, padding:'1px 6px', flexShrink:0 }}>Festag</span>
                  <span style={{ fontSize:11.5, color:'var(--text-muted)', flexShrink:0 }}>{PHASE_LABEL[p.status] ?? p.status}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, opacity:.4 }}><path d="M9 6l6 6-6 6"/></svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Notizen ── */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <p style={{ margin:0, fontSize:11, fontWeight:700, letterSpacing:'.06em', color:'var(--text-muted)', textTransform:'uppercase' }}>
            Notizen{isPriv && sharedNotes.length > 0 ? ` · ${sharedNotes.length} geteilt` : ''}
          </p>
          <button onClick={openNew}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:11.5, color:'var(--text-muted)', fontFamily:'inherit', padding:'2px 0', display:'flex', alignItems:'center', gap:4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Neue Notiz
          </button>
        </div>

        {notes.length === 0 ? (
          <div style={{ border:'1px solid var(--border)', borderRadius:10, padding:'40px 0', textAlign:'center' }}>
            <p style={{ fontSize:13.5, fontWeight:600, color:'var(--text)', margin:'0 0 5px' }}>Noch keine Notizen</p>
            <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:'0 0 18px' }}>Erstelle eine Notiz, teile sie mit deinem Festag-Team oder lass Tagro eine Analyse erstellen.</p>
            <button onClick={openNew}
              style={{ height:32, padding:'0 16px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Erste Notiz erstellen
            </button>
          </div>
        ) : (
          <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
            {notes.map((n, i) => {
              const st = NOTE_STATUS[n.status] ?? NOTE_STATUS.open
              const isOwn = n.user_id === userId
              return (
                <div key={n.id} className="rp-row" onClick={() => openEdit(n)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom: i < notes.length-1 ? '1px solid var(--border)' : 'none', background:'var(--card)' }}>
                  {/* Status toggle */}
                  <button className="note-status-btn" onClick={e => cycleStatus(n, e)} title="Status wechseln">
                    <span style={{ width:8, height:8, borderRadius:'50%', background:n.color||'#6366f1', flexShrink:0 }}/>
                  </button>
                  <span style={{ flex:1, fontSize:13.5, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.title}</span>
                  {n.content && (
                    <span style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200, flexShrink:1 }}>{n.content.replace(/\n/g,' ')}</span>
                  )}
                  {isPriv && n.user_name && (
                    <span style={{ fontSize:10.5, color:'var(--text-muted)', flexShrink:0 }}>{n.user_name}</span>
                  )}
                  {n.shared && (
                    <span style={{ fontSize:10, fontWeight:600, color:'#6366f1', border:'1px solid #6366f133', borderRadius:4, padding:'1px 6px', flexShrink:0, background:'#6366f108' }}>Geteilt</span>
                  )}
                  {n.due_date && (
                    <span style={{ fontSize:11.5, color:'var(--text-muted)', flexShrink:0 }}>{fmtDate(n.due_date)}</span>
                  )}
                  <span style={{ fontSize:11, color:st.color, flexShrink:0, fontWeight:500 }}>{st.label}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, opacity:.4 }}><path d="M9 6l6 6-6 6"/></svg>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── NOTE MODAL ── */}
      {showNote && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.65)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, animation:'fadeIn .15s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setShowNote(false) }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:520, animation:'slideUp .2s cubic-bezier(.16,1,.3,1)' }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:9, height:9, borderRadius:'50%', background:nColor }}/>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{editNote ? 'Notiz bearbeiten' : 'Neue Notiz'}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {!editNote && (
                  <button onClick={generateWithTagro} disabled={generating}
                    style={{ height:26, padding:'0 10px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:6, fontSize:11, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
                    {generating
                      ? <span style={{ width:9, height:9, border:'1.5px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                      : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z"/></svg>
                    }
                    Tagro
                  </button>
                )}
                <button onClick={() => setShowNote(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding:'16px 18px 0' }}>
              <input ref={titleRef} value={nTitle} onChange={e => setNTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote() }}
                placeholder="Notiz-Titel"
                style={{ width:'100%', background:'transparent', border:'none', outline:'none', fontSize:17, fontWeight:600, color:'var(--text)', fontFamily:'inherit', letterSpacing:'-.2px', marginBottom:10, boxSizing:'border-box' }}
              />
              <textarea value={nContent} onChange={e => setNContent(e.target.value)}
                placeholder="Inhalt, Gedanken, Aufgaben…"
                rows={4}
                style={{ width:'100%', background:'transparent', border:'none', outline:'none', fontSize:13.5, color:'var(--text-secondary)', fontFamily:'inherit', resize:'none', lineHeight:1.65, boxSizing:'border-box' }}
              />
            </div>

            {/* Options row */}
            <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', gap:16, borderTop:'1px solid var(--border)', flexWrap:'wrap' }}>
              {/* Color */}
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNColor(c)}
                    style={{ width:14, height:14, borderRadius:'50%', background:c, border: nColor===c?'2px solid var(--text)':'2px solid transparent', cursor:'pointer', padding:0, flexShrink:0 }}/>
                ))}
              </div>

              {/* Due date */}
              <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                <input type="date" value={nDue} onChange={e => setNDue(e.target.value)}
                  style={{ background:'transparent', border:'none', outline:'none', fontSize:11.5, color:'var(--text-muted)', fontFamily:'inherit', cursor:'pointer', colorScheme:'dark' }}/>
              </div>

              {/* Share toggle */}
              <button onClick={() => setNShared(s => !s)}
                style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>
                <div style={{ width:28, height:16, borderRadius:8, background: nShared ? '#6366f1' : 'var(--border)', position:'relative', transition:'background .15s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2, left: nShared ? 14 : 2, width:12, height:12, borderRadius:'50%', background:'white', transition:'left .15s' }}/>
                </div>
                <span style={{ fontSize:11.5, color: nShared ? '#6366f1' : 'var(--text-muted)', fontWeight:500 }}>Mit Team teilen</span>
              </button>
            </div>

            {/* Footer */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'10px 18px 14px' }}>
              <div>
                {editNote && (editNote.user_id === userId || isPriv) && (
                  <button onClick={() => deleteNote(editNote.id)}
                    style={{ height:28, padding:'0 10px', background:'transparent', border:'1px solid var(--border)', borderRadius:6, fontSize:11.5, fontWeight:500, color:'#ef4444', cursor:'pointer', fontFamily:'inherit' }}>
                    Löschen
                  </button>
                )}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowNote(false)}
                  style={{ height:30, padding:'0 12px', background:'transparent', border:'1px solid var(--border)', borderRadius:6, fontSize:12, fontWeight:500, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>
                  Abbrechen
                </button>
                <button onClick={saveNote} disabled={!nTitle.trim() || nSaving}
                  style={{ height:30, padding:'0 14px', background:nTitle.trim()?'var(--btn-prim)':'var(--border)', color:nTitle.trim()?'var(--btn-prim-text)':'var(--text-muted)', border:'none', borderRadius:6, fontSize:12, fontWeight:600, cursor:nTitle.trim()?'pointer':'default', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                  {nSaving ? <span style={{ width:10, height:10, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> : null}
                  {editNote ? 'Speichern' : 'Erstellen'}
                  {!nSaving && <span style={{ fontSize:10, opacity:.55 }}>⌘↵</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSIGN MODAL (admin/dev only) ── */}
      {showAssign && isPriv && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.65)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, animation:'fadeIn .15s ease' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAssign(false); setAMsg('') } }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:460, animation:'slideUp .2s cubic-bezier(.16,1,.3,1)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Projekt zuweisen</span>
              <button onClick={() => { setShowAssign(false); setAMsg('') }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding:'18px 18px 0', display:'flex', flexDirection:'column', gap:14 }}>
              <p style={{ margin:0, fontSize:12.5, color:'var(--text-muted)', lineHeight:1.55 }}>
                Weise ein bestehendes Festag-Projekt einem Kunden zu. Es erscheint dann in seinem Relations-Panel.
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
              {aMsg && <p style={{ margin:0, fontSize:12, color: aMsg.startsWith('Fehler') ? '#ef4444' : '#22c55e', fontWeight:500 }}>{aMsg}</p>}
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
