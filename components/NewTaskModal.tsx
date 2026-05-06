'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const STATUS_OPTIONS = [
  { value: 'todo',  label: 'Todo',         dot: 'var(--text-muted)'  },
  { value: 'doing', label: 'In Progress',  dot: '#f59e0b'             },
  { value: 'done',  label: 'Done',         dot: '#22c55e'             },
]
const PRIORITY_OPTIONS = [
  { value: 'none',     label: 'No priority' },
  { value: 'critical', label: 'Urgent'      },
  { value: 'high',     label: 'High'        },
  { value: 'medium',   label: 'Medium'      },
  { value: 'low',      label: 'Low'         },
]

type Project = { id: string; title: string; color: string | null }

interface Props {
  onClose: () => void
  onCreated?: (taskId: string) => void
  defaultProjectId?: string
  defaultDescription?: string
  source?: string  // e.g. 'status_report', 'manual'
}

export default function NewTaskModal({ onClose, onCreated, defaultProjectId, defaultDescription, source }: Props) {
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState(defaultDescription || '')
  const [status, setStatus] = useState('todo')
  const [priority, setPriority] = useState('none')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    supabase.from('projects').select('id,title,color').order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as any[]) || []
        setProjects(list)
        if (!projectId && list.length) setProjectId(list[0].id)
      })
  }, [])

  const currentProject = projects.find(p => p.id === projectId)

  async function handleCreate() {
    if (!title.trim() || !projectId || creating) return
    setCreating(true)
    try {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .insert({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority: priority === 'none' ? null : priority,
          tags: tags.length ? tags : null,
          source: source || 'manual',
        })
        .select('id')
        .single()
      if (!error && data) {
        onCreated?.((data as any).id)
        onClose()
      }
    } finally {
      setCreating(false)
    }
  }

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  return (
    <>
      <style>{`
        .nt-overlay {
          position:fixed; inset:0;
          background:rgba(0,0,0,.55);
          backdrop-filter:blur(10px) saturate(140%);
          -webkit-backdrop-filter:blur(10px) saturate(140%);
          z-index:1000;
          display:flex; align-items:center; justify-content:center;
          padding:24px;
          animation:ntFadeIn .15s ease;
        }
        .nt-modal {
          background:var(--card);
          border:1px solid var(--border);
          border-radius:14px;
          width:100%; max-width:640px;
          max-height:calc(100vh - 48px); overflow:hidden;
          box-shadow:0 28px 80px rgba(0,0,0,.32), 0 2px 8px rgba(0,0,0,.12);
          animation:ntSlideUp .22s cubic-bezier(.16,1,.3,1);
          display:flex; flex-direction:column;
        }
        @keyframes ntFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes ntSlideUp { from{opacity:0;transform:translateY(6px) scale(.985)} to{opacity:1;transform:translateY(0) scale(1)} }
        .nt-input { background:transparent; border:none; outline:none; font-family:inherit; color:var(--text); width:100%; }
        .nt-chip { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:5px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:11.5px; font-weight:500; cursor:pointer; font-family:inherit; transition:background .1s, border-color .1s; white-space:nowrap; height:24px; }
        .nt-chip:hover { background:var(--surface-2); border-color:var(--border-strong); }
        .nt-chip select, .nt-chip input { background:transparent; border:none; outline:none; color:inherit; font-size:11.5px; font-weight:500; font-family:inherit; cursor:pointer; padding:0; }
        .nt-chip.has-value { color:var(--text); }
      `}</style>

      <div className="nt-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="nt-modal">

          {/* Top bar — project context + close */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {currentProject && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 8px', borderRadius:5, background:'var(--surface-2)' }}>
                  <span style={{ width:8, height:8, borderRadius:2, background: currentProject.color || 'var(--text-muted)', flexShrink:0 }}/>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)}
                    style={{ background:'transparent', border:'none', outline:'none', color:'var(--text)', fontSize:11.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', padding:0 }}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              )}
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>›</span>
              <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>New task</span>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, borderRadius:4, display:'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Title + description */}
          <div style={{ padding:'14px 18px 4px' }}>
            <input
              className="nt-input"
              placeholder="Task-Titel"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate() } }}
              style={{ fontSize:18, fontWeight:600, letterSpacing:'-.2px', marginBottom:8, display:'block' }}
              autoFocus
            />
            <textarea
              className="nt-input"
              placeholder="Beschreibung hinzufügen…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleCreate() } }}
              rows={4}
              style={{ fontSize:13.5, lineHeight:1.6, color:'var(--text-secondary)', resize:'none', minHeight:80 }}
            />
          </div>

          {/* Chips row */}
          <div style={{ padding:'10px 18px 14px', display:'flex', flexWrap:'wrap', gap:5 }}>
            <label className={`nt-chip ${status !== 'todo' ? 'has-value' : ''}`}>
              <span style={{ width:7, height:7, borderRadius:'50%', background: STATUS_OPTIONS.find(s=>s.value===status)?.dot, flexShrink:0 }}/>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>

            <label className={`nt-chip ${priority !== 'none' ? 'has-value' : ''}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M3 21V3M9 14V3M15 19V3M21 10V3"/></svg>
              <select value={priority} onChange={e => setPriority(e.target.value)}>
                {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>

            <button className="nt-chip" type="button">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Assignee
            </button>

            <button className="nt-chip" type="button">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/></svg>
              Labels
            </button>

            <button className="nt-chip" type="button">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Due date
            </button>

            {tags.map(t => (
              <span key={t} className="nt-chip has-value" style={{ paddingRight:4 }}>
                {t}
                <button onClick={() => setTags(tags.filter(x => x !== t))} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:0, marginLeft:2, display:'flex' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </span>
            ))}
          </div>

          {/* Footer */}
          <div style={{ borderTop:'1px solid var(--border)', padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>
              {source === 'status_report' ? 'Aus Statusbericht' : 'Manuell erstellt'}
            </span>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={onClose}
                style={{ padding:'5px 12px', background:'transparent', border:'1px solid var(--border)', borderRadius:6,
                  color:'var(--text-secondary)', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', height:28 }}>
                Abbrechen
              </button>
              <button onClick={handleCreate} disabled={!title.trim() || !projectId || creating}
                style={{
                  padding:'5px 14px', height:28,
                  background: title.trim() && projectId ? 'var(--btn-prim)' : 'var(--surface-2)',
                  color: title.trim() && projectId ? 'var(--btn-prim-text)' : 'var(--text-muted)',
                  border:'none', borderRadius:6, fontSize:12, fontWeight:600,
                  cursor: title.trim() && projectId ? 'pointer' : 'default',
                  fontFamily:'inherit', opacity: creating ? .7 : 1,
                  display:'flex', alignItems:'center', gap:6,
                }}>
                {creating ? 'Erstelle…' : 'Task erstellen'}
                {!creating && <span style={{ fontSize:10, opacity:.6 }}>↵</span>}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
