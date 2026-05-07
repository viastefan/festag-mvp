'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type RelNote = {
  id: string; title: string; content: string | null; color: string | null
  due_date: string | null; shared: boolean; status: string; created_at: string
  user_id: string; user_name?: string
}

const NOTE_STATUS: Record<string, { label: string; color: string }> = {
  open:        { label: 'Offen',     color: 'var(--text-muted)' },
  in_progress: { label: 'In Arbeit', color: '#f97316' },
  done:        { label: 'Erledigt',  color: '#22c55e' },
}
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#64748b']

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function RelNotesPage() {
  const [notes,      setNotes]      = useState<RelNote[]>([])
  const [loading,    setLoading]    = useState(true)
  const [userRole,   setUserRole]   = useState('client')
  const [userId,     setUserId]     = useState('')

  const [showModal,  setShowModal]  = useState(false)
  const [editNote,   setEditNote]   = useState<RelNote | null>(null)
  const [nTitle,     setNTitle]     = useState('')
  const [nContent,   setNContent]   = useState('')
  const [nColor,     setNColor]     = useState('#6366f1')
  const [nDue,       setNDue]       = useState('')
  const [nShared,    setNShared]    = useState(true)
  const [nSaving,    setNSaving]    = useState(false)
  const [generating, setGenerating] = useState(false)
  const [filter,     setFilter]     = useState<'all' | 'shared' | 'mine'>('all')

  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])
  useEffect(() => { if (showModal) setTimeout(() => titleRef.current?.focus(), 60) }, [showModal])

  async function load() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: prof } = await sb.from('profiles').select('role').eq('id', user.id).single()
    const role = (prof as any)?.role ?? 'client'
    setUserRole(role)
    const isPriv = role === 'admin' || role === 'dev'

    const { data: notesData } = await (sb as any).from('rel_notes')
      .select('id,title,content,color,due_date,shared,status,created_at,user_id')
      .order('created_at', { ascending: false })

    if (notesData && isPriv) {
      const uids = [...new Set((notesData as any[]).map((n: any) => n.user_id))]
      const { data: pData } = await sb.from('profiles').select('id,first_name,full_name').in('id', uids as string[])
      const pMap: Record<string, string> = {}
      ;(pData as any[] ?? []).forEach((p: any) => { pMap[p.id] = p.first_name || p.full_name?.split(' ')[0] || 'Kunde' })
      setNotes((notesData as any[]).map((n: any) => ({ ...n, user_name: pMap[n.user_id] })))
    } else {
      setNotes((notesData as any[]) ?? [])
    }
    setLoading(false)
  }

  function openNew() {
    setEditNote(null); setNTitle(''); setNContent(''); setNColor('#6366f1'); setNDue(''); setNShared(true)
    setShowModal(true)
  }
  function openEdit(n: RelNote) {
    setEditNote(n); setNTitle(n.title); setNContent(n.content ?? ''); setNColor(n.color ?? '#6366f1')
    setNDue(n.due_date ?? ''); setNShared(n.shared)
    setShowModal(true)
  }

  async function saveNote() {
    if (!nTitle.trim() || nSaving) return
    setNSaving(true)
    const sb = createClient()
    const payload = { title: nTitle.trim(), content: nContent.trim() || null, color: nColor, due_date: nDue || null, shared: false }
    if (editNote) {
      await (sb as any).from('rel_notes').update(payload).eq('id', editNote.id)
    } else {
      await (sb as any).from('rel_notes').insert({ ...payload, user_id: userId, status: 'open' })
    }
    setShowModal(false); setNSaving(false); load()
  }

  async function deleteNote(id: string) {
    await (createClient() as any).from('rel_notes').delete().eq('id', id)
    setShowModal(false); load()
  }

  async function cycleStatus(note: RelNote, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    const order = ['open', 'in_progress', 'done']
    const next = order[(order.indexOf(note.status) + 1) % order.length]
    await (createClient() as any).from('rel_notes').update({ status: next }).eq('id', note.id)
    setNotes(ns => ns.map(n => n.id === note.id ? { ...n, status: next } : n))
  }

  async function generateWithTagro() {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1400))
    setNTitle('Projektanalyse – ' + new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }))
    setNContent('Tagro hat folgende Punkte aus dem aktuellen Projektstatus zusammengefasst:\n\n• Aktueller Fortschritt läuft planmäßig\n• Nächste Milestone steht an\n• Offene Fragen wurden identifiziert\n\nBitte prüfen und ergänzen.')
    setNShared(true)
    setGenerating(false)
  }

  const isPriv = userRole === 'admin' || userRole === 'dev'

  const filtered = notes.filter(n => {
    if (filter === 'shared') return n.shared
    if (filter === 'mine') return n.user_id === userId
    return true
  })

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 22, height: 22, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )

  return (
    <div className="page-content" style={{ maxWidth: 860 }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
        .note-row { transition: background .08s; cursor: pointer; }
        .note-row:hover { background: var(--surface-2) !important; }
        .filter-chip { background: none; border: 1px solid var(--border); border-radius: 6px; padding: 3px 10px; font-size: 11.5px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .1s; color: var(--text-muted); }
        .filter-chip.active { background: var(--text); color: var(--bg); border-color: var(--text); }
        .ob-field { width: 100%; padding: 8px 12px; background: transparent; border: 1px solid var(--border); border-radius: 7px; font-size: 13px; color: var(--text); font-family: inherit; outline: none; box-sizing: border-box; transition: border-color .15s; }
        .ob-field:focus { border-color: var(--text-secondary); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-.4px' }}>Notizen</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {notes.length} Notiz{notes.length !== 1 ? 'en' : ''}{notes.filter(n => n.shared).length > 0 ? ` · ${notes.filter(n => n.shared).length} geteilt` : ''}
          </p>
        </div>
        <button onClick={openNew}
          style={{ height: 32, padding: '0 14px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Neue Notiz
        </button>
      </div>

      {/* Filter chips */}
      {notes.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['all', 'shared', 'mine'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`filter-chip${filter === f ? ' active' : ''}`}>
              {f === 'all' ? 'Alle' : f === 'shared' ? 'Geteilt' : 'Meine'}
            </button>
          ))}
        </div>
      )}

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '50px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: '0 0 5px' }}>
            {notes.length === 0 ? 'Noch keine Notizen' : 'Keine Notizen in dieser Ansicht'}
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 18px' }}>
            {notes.length === 0 ? 'Erstelle eine Notiz, teile sie mit deinem Festag-Team oder lass Tagro eine Analyse schreiben.' : 'Wechsle den Filter oben.'}
          </p>
          {notes.length === 0 && (
            <button onClick={openNew}
              style={{ height: 32, padding: '0 16px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Erste Notiz erstellen
            </button>
          )}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {filtered.map((n, i) => {
            const st = NOTE_STATUS[n.status] ?? NOTE_STATUS.open
            return (
              <div key={n.id} className="note-row" onClick={() => openEdit(n)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--card)' }}>

                {/* Color dot / status */}
                <button onClick={e => cycleStatus(n, e)} title="Status wechseln"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.color || '#6366f1', display: 'block' }}/>
                </button>

                {/* Title */}
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: n.status === 'done' ? 'var(--text-muted)' : 'var(--text)', textDecoration: n.status === 'done' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.title}
                </span>

                {/* Snippet */}
                {n.content && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220, flexShrink: 1 }}>
                    {n.content.replace(/\n/g, ' ')}
                  </span>
                )}

                {/* Admin: user name */}
                {isPriv && n.user_name && (
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', flexShrink: 0 }}>{n.user_name}</span>
                )}

                {/* Shared badge */}
                {n.shared && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#6366f1', border: '1px solid #6366f133', borderRadius: 4, padding: '1px 6px', flexShrink: 0, background: '#6366f108' }}>Geteilt</span>
                )}

                {/* Due date */}
                {n.due_date && (
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', flexShrink: 0 }}>{fmtDate(n.due_date)}</span>
                )}

                {/* Status */}
                <span style={{ fontSize: 11, color: st.color, fontWeight: 500, flexShrink: 0 }}>{st.label}</span>

                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, opacity: .4 }}><path d="M9 6l6 6-6 6"/></svg>
              </div>
            )
          })}
        </div>
      )}

      {/* ── NOTE MODAL ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn .15s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, width: '100%', maxWidth: 520, animation: 'slideUp .2s cubic-bezier(.16,1,.3,1)' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: nColor }}/>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{editNote ? 'Notiz bearbeiten' : 'Neue Notiz'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {!editNote && (
                  <button onClick={generateWithTagro} disabled={generating}
                    style={{ height: 26, padding: '0 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {generating
                      ? <span style={{ width: 9, height: 9, border: '1.5px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
                      : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z"/></svg>
                    }
                    Tagro
                  </button>
                )}
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 18px 0' }}>
              <input ref={titleRef} value={nTitle} onChange={e => setNTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote() }}
                placeholder="Notiz-Titel"
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 17, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit', letterSpacing: '-.2px', marginBottom: 10, boxSizing: 'border-box' }}
              />
              <textarea value={nContent} onChange={e => setNContent(e.target.value)}
                placeholder="Inhalt, Gedanken, Aufgaben…"
                rows={4}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--text-secondary)', fontFamily: 'inherit', resize: 'none', lineHeight: 1.65, boxSizing: 'border-box' }}
              />
            </div>

            {/* Options */}
            <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNColor(c)}
                    style={{ width: 14, height: 14, borderRadius: '50%', background: c, border: nColor === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer', padding: 0, flexShrink: 0 }}/>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                <input type="date" value={nDue} onChange={e => setNDue(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'inherit', cursor: 'pointer', colorScheme: 'dark' }}/>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px 14px' }}>
              <div>
                {editNote && (editNote.user_id === userId || isPriv) && (
                  <button onClick={() => deleteNote(editNote.id)}
                    style={{ height: 28, padding: '0 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11.5, fontWeight: 500, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Löschen
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowModal(false)}
                  style={{ height: 30, padding: '0 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Abbrechen
                </button>
                <button onClick={saveNote} disabled={!nTitle.trim() || nSaving}
                  style={{ height: 30, padding: '0 14px', background: nTitle.trim() ? 'var(--btn-prim)' : 'var(--border)', color: nTitle.trim() ? 'var(--btn-prim-text)' : 'var(--text-muted)', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: nTitle.trim() ? 'pointer' : 'default', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {nSaving ? <span style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/> : null}
                  {editNote ? 'Speichern' : 'Erstellen'}
                  {!nSaving && <span style={{ fontSize: 10, opacity: .55 }}>⌘↵</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
