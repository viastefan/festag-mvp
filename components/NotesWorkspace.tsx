'use client'

import { useEffect, useRef, useState } from 'react'
import { FunnelSimple, Plus, SlidersHorizontal, Sparkle, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

type RelNote = {
  id: string
  title: string
  content: string | null
  color: string | null
  due_date: string | null
  shared: boolean
  status: string
  created_at: string
  user_id: string
  user_name?: string
}

const NOTE_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: 'Offen', color: 'var(--notes-soft-text)' },
  in_progress: { label: 'In Arbeit', color: '#f97316' },
  done: { label: 'Erledigt', color: '#22c55e' },
}

const COLORS = ['#6a738c', '#6a738c', '#8790a5', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#64748b']
const FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'mine', label: 'Meine' },
  { id: 'shared', label: 'Geteilt' },
] as const

function dateShort(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

function dateLong(value: string | null) {
  if (!value) return 'Kein Datum'
  return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function noteSnippet(content: string | null) {
  const text = content?.replace(/\s+/g, ' ').trim()
  return text || 'Keine Beschreibung'
}

export default function NotesWorkspace() {
  const [notes, setNotes] = useState<RelNote[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('client')
  const [userId, setUserId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editNote, setEditNote] = useState<RelNote | null>(null)
  const [nTitle, setNTitle] = useState('')
  const [nContent, setNContent] = useState('')
  const [nColor, setNColor] = useState('#6a738c')
  const [nDue, setNDue] = useState('')
  const [nShared, setNShared] = useState(false)
  const [nSaving, setNSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'shared' | 'mine'>('all')
  const [toolsOpen, setToolsOpen] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])
  useEffect(() => { if (showModal) setTimeout(() => titleRef.current?.focus(), 60) }, [showModal])

  async function load() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    setUserId(user.id)
    const { data: prof } = await sb.from('profiles').select('role').eq('id', user.id).single()
    const role = (prof as any)?.role ?? 'client'
    const isPriv = role === 'admin' || role === 'dev'
    setUserRole(role)

    const { data: notesData } = await (sb as any).from('rel_notes')
      .select('id,title,content,color,due_date,shared,status,created_at,user_id')
      .order('created_at', { ascending: false })

    if (notesData && isPriv) {
      const uids = Array.from(new Set((notesData as any[]).map((note: any) => note.user_id)))
      const { data: pData } = await sb.from('profiles').select('id,first_name,full_name').in('id', uids as string[])
      const pMap: Record<string, string> = {}
      ;(pData as any[] ?? []).forEach((profile: any) => {
        pMap[profile.id] = profile.first_name || profile.full_name?.split(' ')[0] || 'Kunde'
      })
      setNotes((notesData as any[]).map((note: any) => ({ ...note, user_name: pMap[note.user_id] })))
    } else {
      setNotes((notesData as any[]) ?? [])
    }

    setLoading(false)
  }

  function openNew() {
    setEditNote(null)
    setNTitle('')
    setNContent('')
    setNColor('#6a738c')
    setNDue('')
    setNShared(false)
    setShowModal(true)
  }

  function openEdit(note: RelNote) {
    setEditNote(note)
    setNTitle(note.title)
    setNContent(note.content ?? '')
    setNColor(note.color ?? '#6a738c')
    setNDue(note.due_date ?? '')
    setNShared(note.shared)
    setShowModal(true)
  }

  async function saveNote() {
    if (!nTitle.trim() || nSaving) return
    setNSaving(true)
    const sb = createClient()
    const payload = {
      title: nTitle.trim(),
      content: nContent.trim() || null,
      color: nColor,
      due_date: nDue || null,
      shared: nShared,
    }

    if (editNote) {
      await (sb as any).from('rel_notes').update(payload).eq('id', editNote.id)
    } else {
      await (sb as any).from('rel_notes').insert({ ...payload, user_id: userId, status: 'open' })
    }

    setShowModal(false)
    setNSaving(false)
    load()
  }

  async function deleteNote(id: string) {
    await (createClient() as any).from('rel_notes').delete().eq('id', id)
    setShowModal(false)
    load()
  }

  async function cycleStatus(note: RelNote, event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    const order = ['open', 'in_progress', 'done']
    const next = order[(order.indexOf(note.status) + 1) % order.length]
    await (createClient() as any).from('rel_notes').update({ status: next }).eq('id', note.id)
    setNotes(current => current.map(item => item.id === note.id ? { ...item, status: next } : item))
  }

  async function generateWithVeyra() {
    setGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 900))
    setNTitle('Projektanalyse - ' + new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }))
    setNContent('Veyra hat folgende Punkte aus dem aktuellen Projektstatus zusammengefasst:\n\n- Aktueller Fortschritt läuft planmäßig\n- Nächster Milestone steht an\n- Offene Fragen wurden identifiziert\n\nBitte prüfen und ergänzen.')
    setNShared(false)
    setGenerating(false)
  }

  const isPriv = userRole === 'admin' || userRole === 'dev'
  const sharedCount = notes.filter(note => note.shared).length
  const mineCount = notes.filter(note => note.user_id === userId).length
  const visibleNotes = notes.filter(note => {
    if (filter === 'shared') return note.shared
    if (filter === 'mine') return note.user_id === userId
    return true
  })

  return (
    <div className="notes-os">
      <style>{`
        .notes-os {
          --notes-soft-text:#4E5567;
          width:100%;
          height:100%;
          min-height:0;
          color:var(--text);
          padding:20px 0 0;
          display:flex;
          flex-direction:column;
          overflow:hidden;
          letter-spacing:.012em;
        }
        [data-theme="dark"] .notes-os,
        [data-theme="classic-dark"] .notes-os,
        [data-theme="read"] .notes-os {
          --notes-soft-text:var(--text-secondary);
        }
        .notes-static-top {
          flex:0 0 auto;
          position:relative;
          z-index:8;
        }
        .notes-top {
          display:flex;
          align-items:center;
          justify-content:space-between;
          min-height:34px;
          border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
          padding:0 18px 12px;
        }
        .notes-title {
          margin:0;
          font-size:14.5px;
          font-weight:500;
          letter-spacing:0;
        }
        .notes-create {
          height:30px;
          padding:0 9px 0 12px;
          border:1px solid transparent;
          border-radius:8px;
          background:transparent;
          color:var(--notes-soft-text);
          display:flex;
          align-items:center;
          gap:8px;
          font:inherit;
          font-size:12px;
          font-weight:500;
          cursor:pointer;
        }
        .notes-create:hover { background:var(--surface-2); color:var(--text); }
        .notes-create-plus {
          width:14px;
          height:14px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
        }
        .notes-toolbar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:14px 18px 12px;
        }
        .notes-filters {
          display:flex;
          align-items:center;
          gap:6px;
          min-width:0;
          flex-wrap:wrap;
        }
        .notes-filter {
          height:27px;
          padding:0 11px;
          border:1px solid var(--border);
          border-radius:999px;
          background:transparent;
          color:var(--notes-soft-text);
          font:inherit;
          font-size:11.5px;
          font-weight:500;
          white-space:nowrap;
          cursor:pointer;
          letter-spacing:.02em;
        }
        .notes-filter.on {
          background:var(--surface-2);
          color:var(--text);
        }
        .notes-count-summary {
          color:var(--notes-soft-text);
          font-size:11.5px;
          font-weight:500;
          margin-left:8px;
          white-space:nowrap;
        }
        .notes-tools {
          display:flex;
          align-items:center;
          gap:8px;
          flex-shrink:0;
        }
        .notes-tool-wrap { position:relative; }
        .notes-tool {
          width:34px;
          height:34px;
          border:0;
          border-radius:999px;
          background:#fff;
          color:var(--notes-soft-text);
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          box-shadow:0 1px 2px rgba(15,23,42,.08), 0 7px 18px rgba(15,23,42,.08);
          transition:background .12s ease, color .12s ease, box-shadow .12s ease, transform .12s ease;
        }
        .notes-tool:hover,
        .notes-tool.on {
          background:#fff;
          color:var(--text);
          box-shadow:0 1px 2px rgba(15,23,42,.10), 0 9px 22px rgba(15,23,42,.11);
          transform:translateY(-1px);
        }
        [data-theme="dark"] .notes-tool,
        [data-theme="classic-dark"] .notes-tool {
          background:color-mix(in srgb, var(--surface) 92%, #fff 8%);
          box-shadow:0 1px 2px rgba(0,0,0,.28), 0 8px 20px rgba(0,0,0,.20);
        }
        .notes-menu {
          position:absolute;
          top:38px;
          right:0;
          width:188px;
          z-index:20;
          border:0;
          border-radius:12px;
          background:var(--surface);
          box-shadow:0 18px 44px rgba(0,0,0,.16);
          padding:6px;
        }
        .notes-menu button {
          width:100%;
          height:30px;
          border:0;
          border-radius:8px;
          background:transparent;
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:0 9px;
          color:var(--notes-soft-text);
          font:inherit;
          font-size:12px;
          font-weight:500;
          cursor:pointer;
        }
        .notes-menu button:hover,
        .notes-menu button.on { background:var(--surface-2); color:var(--text); }
        .notes-scroll-body {
          flex:1 1 auto;
          min-height:0;
          overflow-y:auto;
          overflow-x:hidden;
          padding:0 18px 76px;
          overscroll-behavior:contain;
        }
        .notes-table {
          width:100%;
          animation:notesTableIn .24s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes notesTableIn {
          from { opacity:0; transform:translateY(7px); }
          to { opacity:1; transform:none; }
        }
        .notes-head,
        .notes-row {
          display:grid;
          grid-template-columns:42px minmax(220px,1.45fr) minmax(150px,1fr) 96px 76px 92px 88px 28px;
          align-items:center;
          gap:10px;
          margin:0 -12px;
          padding:0 16px;
          box-sizing:border-box;
        }
        .notes-head {
          position:sticky;
          top:0;
          z-index:5;
          min-height:36px;
          color:var(--notes-soft-text);
          font-size:11.5px;
          font-weight:500;
          background:var(--surface);
          letter-spacing:.02em;
        }
        .notes-head > *,
        .notes-row > * { min-width:0; }
        .notes-row {
          min-height:52px;
          border:0;
          border-radius:8px;
          background:transparent;
          color:var(--notes-soft-text);
          font-size:12px;
          cursor:pointer;
          transition:background .12s ease;
          animation:notesRowIn .22s cubic-bezier(.16,1,.3,1) both;
          animation-delay:calc(var(--row-index, 0) * 24ms);
        }
        @keyframes notesRowIn {
          from { opacity:0; transform:translateY(5px); }
          to { opacity:1; transform:none; }
        }
        .notes-row:hover {
          background:color-mix(in srgb, var(--surface-2) 60%, transparent);
        }
        .notes-dot-btn {
          width:24px;
          height:24px;
          border:0;
          background:transparent;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          justify-self:center;
          border-radius:999px;
          padding:0;
        }
        .notes-dot-btn:hover { background:color-mix(in srgb, var(--surface-2) 75%, transparent); }
        .notes-dot {
          width:12px;
          height:12px;
          border-radius:999px;
          border:2px solid var(--note-color, #64748b);
          background:transparent;
          box-sizing:border-box;
        }
        .notes-title-cell {
          display:flex;
          flex-direction:column;
          gap:3px;
          min-width:0;
        }
        .notes-title-cell strong {
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          color:var(--text);
          font-size:12.8px;
          font-weight:500;
          letter-spacing:.012em;
        }
        .notes-title-cell span,
        .notes-muted-cell {
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          color:var(--notes-soft-text);
          font-size:11.5px;
          font-weight:500;
        }
        .notes-pill {
          width:max-content;
          max-width:100%;
          height:22px;
          padding:0 9px;
          border-radius:5px;
          display:inline-flex;
          align-items:center;
          gap:5px;
          color:var(--text-secondary);
          background:color-mix(in srgb, var(--surface-2) 70%, transparent);
          font-size:11px;
          font-weight:500;
          letter-spacing:.015em;
        }
        .notes-pill.empty {
          background:transparent;
          color:var(--notes-soft-text);
          border:1px solid color-mix(in srgb, var(--border) 70%, transparent);
        }
        .notes-status {
          font-size:11.5px;
          font-weight:500;
          white-space:nowrap;
        }
        .notes-chevron {
          justify-self:center;
          color:var(--notes-soft-text);
          font-size:20px;
          line-height:1;
        }
        .notes-empty {
          min-height:64px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          color:var(--notes-soft-text);
          font-size:12px;
          font-weight:500;
          border-radius:8px;
        }
        .notes-empty button {
          height:28px;
          padding:0 11px;
          border:0;
          border-radius:999px;
          background:var(--surface-2);
          color:var(--text);
          display:inline-flex;
          align-items:center;
          gap:6px;
          font:inherit;
          font-size:11.5px;
          font-weight:500;
          cursor:pointer;
        }
        .notes-modal-bg {
          position:fixed;
          inset:0;
          z-index:500;
          background:rgba(10,13,20,.42);
          backdrop-filter:blur(3px);
          -webkit-backdrop-filter:blur(3px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
          animation:notesFade .15s ease both;
        }
        @keyframes notesFade { from { opacity:0; } to { opacity:1; } }
        .notes-modal {
          width:min(560px, 94vw);
          max-height:90vh;
          overflow:auto;
          border:1px solid var(--border);
          border-radius:14px;
          background:var(--surface);
          box-shadow:0 20px 60px rgba(0,0,0,.14);
          animation:notesPop .18s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes notesPop {
          from { opacity:0; transform:translateY(8px) scale(.98); }
          to { opacity:1; transform:none; }
        }
        .notes-modal-top {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:14px 16px 8px;
        }
        .notes-modal-kicker {
          color:var(--notes-soft-text);
          font-size:11px;
          font-weight:500;
          letter-spacing:.12em;
          text-transform:uppercase;
        }
        .notes-modal-close {
          width:26px;
          height:26px;
          border:0;
          border-radius:7px;
          background:transparent;
          color:var(--notes-soft-text);
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        }
        .notes-modal-close:hover { background:var(--surface-2); color:var(--text); }
        .notes-modal-body {
          padding:12px 16px 10px;
          display:flex;
          flex-direction:column;
          gap:10px;
        }
        .notes-input-title,
        .notes-input-content {
          width:100%;
          border:0;
          outline:none;
          box-sizing:border-box;
          background:transparent;
          color:var(--text);
          font:inherit;
        }
        .notes-input-title {
          font-size:18px;
          font-weight:500;
          letter-spacing:-.02em;
        }
        .notes-input-content {
          min-height:132px;
          resize:vertical;
          color:var(--text-secondary);
          font-size:13px;
          line-height:1.65;
        }
        .notes-modal-options {
          display:flex;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
          padding:10px 16px;
          border-top:1px solid color-mix(in srgb, var(--border) 52%, transparent);
        }
        .notes-color-row {
          display:flex;
          align-items:center;
          gap:5px;
          flex-wrap:wrap;
        }
        .notes-color {
          width:15px;
          height:15px;
          border-radius:999px;
          background:var(--swatch);
          border:2px solid transparent;
          padding:0;
          cursor:pointer;
        }
        .notes-color.on { border-color:var(--text); }
        .notes-option {
          height:28px;
          border:0;
          border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 62%, transparent);
          color:var(--text-secondary);
          display:inline-flex;
          align-items:center;
          gap:7px;
          padding:0 10px;
          font:inherit;
          font-size:11.5px;
          font-weight:500;
          cursor:pointer;
        }
        .notes-option.on { color:var(--text); background:color-mix(in srgb, var(--surface-2) 82%, transparent); }
        .notes-date {
          height:28px;
          border:0;
          border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 62%, transparent);
          color:var(--text-secondary);
          padding:0 10px;
          font:inherit;
          font-size:11.5px;
          font-weight:500;
          color-scheme:light;
        }
        .notes-modal-footer {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:10px 16px 14px;
        }
        .notes-footer-actions {
          display:flex;
          gap:8px;
          margin-left:auto;
        }
        .notes-text-btn {
          height:30px;
          padding:0 12px;
          border:0;
          border-radius:8px;
          background:#fff;
          color:var(--text-secondary);
          display:inline-flex;
          align-items:center;
          gap:7px;
          font:inherit;
          font-size:12px;
          font-weight:500;
          cursor:pointer;
          box-shadow:0 1px 2px rgba(15,23,42,.07), 0 7px 18px rgba(15,23,42,.08);
        }
        .notes-text-btn.primary { color:var(--text); }
        .notes-text-btn.danger { background:transparent; box-shadow:none; color:#c0362e; }
        .notes-text-btn:disabled { opacity:.45; cursor:default; }
        @media(max-width:820px) {
          .notes-toolbar { align-items:flex-start; flex-direction:column; }
          .notes-tools { align-self:flex-end; margin-top:-46px; }
          .notes-count-summary { width:100%; margin-left:0; }
          .notes-head { display:none; }
          .notes-row {
            grid-template-columns:34px minmax(0,1fr) 28px;
            gap:8px;
            min-height:62px;
          }
          .notes-row > span:nth-child(3),
          .notes-row > span:nth-child(4),
          .notes-row > span:nth-child(5),
          .notes-row > span:nth-child(6),
          .notes-row > span:nth-child(7) { display:none; }
          .notes-chevron { display:block; }
        }
      `}</style>

      <div className="notes-static-top">
        <div className="notes-top">
          <h1 className="notes-title">Notizen</h1>
          <button className="notes-create" type="button" onClick={openNew} aria-label="Neue Notiz">
            <span>Neue Notiz</span>
            <span className="notes-create-plus" aria-hidden="true"><Plus size={13} weight="bold" /></span>
          </button>
        </div>

        <div className="notes-toolbar">
          <div className="notes-filters" role="tablist" aria-label="Notizenfilter">
            {FILTERS.map(item => (
              <button
                key={item.id}
                type="button"
                className={`notes-filter${filter === item.id ? ' on' : ''}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
            <span className="notes-count-summary">
              {notes.length} Notiz{notes.length === 1 ? '' : 'en'} · {mineCount} meine · {sharedCount} geteilt
            </span>
          </div>
          <div className="notes-tools">
            <div className="notes-tool-wrap">
              <button className={`notes-tool${toolsOpen ? ' on' : ''}`} type="button" aria-label="Notizen filtern" onClick={() => setToolsOpen(open => !open)}>
                <FunnelSimple size={15} />
              </button>
              {toolsOpen && (
                <div className="notes-menu">
                  {FILTERS.map(item => (
                    <button key={item.id} type="button" className={filter === item.id ? 'on' : ''} onClick={() => { setFilter(item.id); setToolsOpen(false) }}>
                      <span>{item.label}</span>
                      {filter === item.id ? <span>✓</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="notes-tool" type="button" aria-label="Notizen sortieren" title="Neueste zuerst">
              <SlidersHorizontal size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="notes-scroll-body">
        <div className="notes-table" role="table" aria-label="Notizen-Liste">
          <div className="notes-head" role="row">
            <span style={{ textAlign:'center' }}>Farbe</span>
            <span>Titel</span>
            <span>Inhalt</span>
            <span>{isPriv ? 'Erstellt von' : 'Tags'}</span>
            <span>Geteilt</span>
            <span>Fällig</span>
            <span>Aktualisiert</span>
            <span />
          </div>

          {loading ? (
            <div className="notes-empty">Lade Notizen…</div>
          ) : visibleNotes.length === 0 ? (
            <div className="notes-empty">
              <span>{notes.length === 0 ? 'Noch keine Notizen in dieser Ansicht.' : 'Keine Notizen in diesem Filter.'}</span>
              {notes.length === 0 ? <button type="button" onClick={openNew}><Plus size={12} weight="bold" /> Erste Notiz anlegen</button> : null}
            </div>
          ) : visibleNotes.map((note, index) => {
            const status = NOTE_STATUS[note.status] ?? NOTE_STATUS.open
            return (
              <div
                key={note.id}
                className="notes-row"
                role="row"
                tabIndex={0}
                style={{ ['--row-index' as string]: index }}
                onClick={() => openEdit(note)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openEdit(note)
                  }
                }}
              >
                <button className="notes-dot-btn" type="button" title="Status wechseln" onClick={(event) => cycleStatus(note, event)}>
                  <span className="notes-dot" style={{ ['--note-color' as string]: note.color || '#64748b' }} />
                </button>
                <span className="notes-title-cell">
                  <strong style={{ textDecoration: note.status === 'done' ? 'line-through' : 'none', color: note.status === 'done' ? 'var(--notes-soft-text)' : undefined }}>
                    {note.title}
                  </strong>
                  <span className="notes-status" style={{ color: status.color }}>{status.label}</span>
                </span>
                <span className="notes-muted-cell">{noteSnippet(note.content)}</span>
                <span className="notes-muted-cell">{isPriv ? (note.user_name || 'Kunde') : (note.content ? 'Text' : '—')}</span>
                <span><span className={`notes-pill${note.shared ? '' : ' empty'}`}>{note.shared ? 'Geteilt' : 'Privat'}</span></span>
                <span className="notes-muted-cell">{dateLong(note.due_date)}</span>
                <span className="notes-muted-cell">{dateShort(note.created_at)}</span>
                <span className="notes-chevron" aria-hidden="true">›</span>
              </div>
            )
          })}
        </div>
      </div>

      {showModal && (
        <div className="notes-modal-bg" onClick={event => { if (event.target === event.currentTarget) setShowModal(false) }}>
          <div className="notes-modal">
            <div className="notes-modal-top">
              <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                <span className="notes-dot" style={{ ['--note-color' as string]: nColor }} />
                <span className="notes-modal-kicker">{editNote ? 'Notiz bearbeiten' : 'Neue Notiz'}</span>
              </div>
              <button className="notes-modal-close" type="button" onClick={() => setShowModal(false)} aria-label="Schließen">
                <X size={14} />
              </button>
            </div>

            <div className="notes-modal-body">
              <input
                ref={titleRef}
                className="notes-input-title"
                value={nTitle}
                onChange={event => setNTitle(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) saveNote() }}
                placeholder="Notiz-Titel"
              />
              <textarea
                className="notes-input-content"
                value={nContent}
                onChange={event => setNContent(event.target.value)}
                placeholder="Inhalt, Gedanken, Kontext..."
              />
            </div>

            <div className="notes-modal-options">
              <div className="notes-color-row" aria-label="Notizfarbe">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`notes-color${nColor === color ? ' on' : ''}`}
                    style={{ ['--swatch' as string]: color }}
                    onClick={() => setNColor(color)}
                    aria-label={`Farbe ${color}`}
                  />
                ))}
              </div>
              <button className={`notes-option${nShared ? ' on' : ''}`} type="button" onClick={() => setNShared(shared => !shared)}>
                {nShared ? 'Geteilt' : 'Privat'}
              </button>
              <input className="notes-date" type="date" value={nDue} onChange={event => setNDue(event.target.value)} />
              {!editNote && (
                <button className="notes-option" type="button" onClick={generateWithVeyra} disabled={generating}>
                  <Sparkle size={12} weight="regular" />
                  {generating ? 'Veyra schreibt...' : 'Veyra'}
                </button>
              )}
            </div>

            <div className="notes-modal-footer">
              {editNote && (editNote.user_id === userId || isPriv) ? (
                <button className="notes-text-btn danger" type="button" onClick={() => deleteNote(editNote.id)}>Löschen</button>
              ) : <span />}
              <div className="notes-footer-actions">
                <button className="notes-text-btn" type="button" onClick={() => setShowModal(false)}>Abbrechen</button>
                <button className="notes-text-btn primary" type="button" onClick={saveNote} disabled={!nTitle.trim() || nSaving}>
                  {nSaving ? 'Speichert...' : editNote ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
