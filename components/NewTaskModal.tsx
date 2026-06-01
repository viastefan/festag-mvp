'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const STATUS_OPTIONS = [
  { value: 'suggested', label: 'Zur Prüfung',  dot: '#6a738c'            },
  { value: 'todo',      label: 'Geplant',      dot: 'var(--text-muted)'  },
  { value: 'doing',     label: 'In Entwicklung', dot: '#f59e0b'          },
  { value: 'review',    label: 'Bereit zur Prüfung', dot: '#6a738c'      },
  { value: 'done',      label: 'Erledigt',     dot: '#22c55e'            },
]
const PRIORITY_OPTIONS = [
  { value: 'none',     label: 'Keine Priorität' },
  { value: 'critical', label: 'Kritisch'        },
  { value: 'high',     label: 'Hoch'            },
  { value: 'medium',   label: 'Mittel'          },
  { value: 'low',      label: 'Niedrig'         },
]

type Project = { id: string; title: string; color: string | null }
type VeyraPreview = {
  client_summary?: string
  suggested_title?: string
  suggested_description?: string
  possible_dev_interpretation?: string
  open_questions?: string[]
  risks?: string[]
  priority?: string
  confidence_score?: number
}

interface Props {
  onClose: () => void
  onCreated?: (taskId: string) => void
  defaultProjectId?: string
  defaultDescription?: string
  source?: string  // e.g. 'status_report', 'manual'
  mode?: 'create' | 'suggest'
}

export default function NewTaskModal({ onClose, onCreated, defaultProjectId, defaultDescription, source, mode = 'create' }: Props) {
  const supabase = createClient()
  const isSuggestion = mode === 'suggest'
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState(defaultDescription || '')
  const [status, setStatus] = useState(isSuggestion ? 'suggested' : 'todo')
  const [priority, setPriority] = useState('none')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [entryMode, setEntryMode] = useState<'tagro' | 'manual'>(source === 'manual' ? 'manual' : 'tagro')
  const [veyraPreview, setVeyraPreview] = useState<VeyraPreview | null>(null)
  const [veyraNotice, setVeyraNotice] = useState('')

  useEffect(() => {
    supabase.from('projects').select('id,title,color').order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as any[]) || []
        setProjects(list)
        if (!projectId && list.length) setProjectId(list[0].id)
      })
  }, [])

  const currentProject = projects.find(p => p.id === projectId)

  async function requestVeyraPreview(regenerate = false) {
    const titleText = title.trim()
    const descriptionText = description.trim()
    if ((!titleText && !descriptionText) || !projectId || creating) return
    setCreating(true)
    setVeyraNotice('')
    try {
      const response = await fetch('/api/tagro/task-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          mode: 'tagro',
          title: titleText,
          description: regenerate
            ? `${descriptionText || titleText}\n\nBitte formuliere den Vorschlag noch kürzer, klarer und prüfbarer.`
            : descriptionText,
          priority: priority === 'none' ? null : priority,
          labels: tags,
          confirmCreate: false,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok || !result.proposal) {
        setVeyraNotice('Veyra konnte den Vorschlag gerade nicht prüfen.')
        return
      }
      setVeyraPreview(result.proposal)
      setVeyraNotice('')
    } catch {
      setVeyraNotice('Veyra konnte den Vorschlag gerade nicht prüfen.')
    } finally {
      setCreating(false)
    }
  }

  async function createFromVeyraPreview() {
    if (!veyraPreview || !projectId || creating) return
    setCreating(true)
    setVeyraNotice('')
    try {
      const response = await fetch('/api/tagro/task-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          mode: 'tagro',
          title: title.trim(),
          description: description.trim(),
          priority: priority === 'none' ? null : priority,
          labels: tags,
          proposal: veyraPreview,
          confirmCreate: true,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok || !result.task) {
        setVeyraNotice('Der Vorschlag konnte gerade nicht übernommen werden.')
        return
      }
      onCreated?.(result.task.id)
      onClose()
    } catch {
      setVeyraNotice('Der Vorschlag konnte gerade nicht übernommen werden.')
    } finally {
      setCreating(false)
    }
  }

  async function handleCreate() {
    if (!projectId || creating) return
    if (entryMode === 'tagro') {
      if (veyraPreview) {
        await createFromVeyraPreview()
      } else {
        await requestVeyraPreview(false)
      }
      return
    }

    if (!title.trim()) return
    setCreating(true)
    try {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .insert({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          status: isSuggestion ? 'suggested' : status,
          priority: priority === 'none' ? null : priority,
          tags: tags.length ? tags : null,
          source: isSuggestion ? 'client_suggestion_manual' : (source || 'manual'),
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

  function clearVeyraPreview(message = '') {
    setVeyraPreview(null)
    setVeyraNotice(message)
  }

  const hasDraft = Boolean(title.trim() || description.trim())
  const canSubmit = Boolean(projectId && (entryMode === 'tagro' ? (hasDraft || veyraPreview) : title.trim()) && !creating)

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
        .nt-input { background:transparent; border:none; outline:none !important; box-shadow:none !important; font-family:inherit; color:var(--text); width:100%; }
        .nt-input:focus, .nt-input:focus-visible { outline:none !important; box-shadow:none !important; }
        .nt-input::selection { background:color-mix(in srgb, var(--text) 14%, transparent); }
        .nt-mode { display:flex; gap:6px; padding:12px 18px 0; }
        .nt-mode button { height:30px; border:1px solid var(--border); border-radius:999px; padding:0 11px; color:var(--text-secondary); background:transparent; font-size:12px; font-weight:650; }
        .nt-mode button.on { background:var(--surface-2); color:var(--text); border-color:var(--border); }
        .nt-tagro-box { margin:10px 18px 0; padding:11px 12px; border:1px solid var(--border); border-radius:10px; background:color-mix(in srgb, var(--surface-2) 58%, transparent); color:var(--text-secondary); font-size:12.5px; line-height:1.45; }
        .nt-ai-thread { margin:10px 18px 0; display:flex; align-items:flex-start; gap:9px; }
        .nt-ai-avatar { width:24px; height:24px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex:0 0 auto; background:color-mix(in srgb, var(--accent, #6a738c) 14%, transparent); color:var(--accent, #6a738c); font-size:11px; font-weight:700; }
        .nt-ai-bubble { flex:1; min-width:0; border:1px solid var(--border); border-radius:10px; padding:11px 12px; background:color-mix(in srgb, var(--surface-2) 62%, transparent); color:var(--text-secondary); font-size:12.5px; line-height:1.5; }
        .nt-ai-bubble > span { display:block; margin-bottom:5px; color:var(--text-muted); font-size:11px; }
        .nt-ai-bubble strong { display:block; color:var(--text); font-size:13px; margin-bottom:4px; }
        .nt-ai-bubble p { margin:0 0 6px; }
        .nt-ai-bubble ul { margin:5px 0 0; padding-left:16px; }
        .nt-ai-actions { display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }
        .nt-ai-actions button { height:27px; border-radius:8px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); padding:0 10px; font:inherit; font-size:11.5px; cursor:pointer; }
        .nt-ai-actions button:hover:not(:disabled) { background:var(--surface-2); color:var(--text); }
        .nt-ai-actions button.primary { background:var(--btn-prim); border-color:var(--btn-prim); color:var(--btn-prim-text); }
        .nt-ai-actions button:disabled { opacity:.55; cursor:default; }
        .nt-notice { margin:8px 18px 0; color:var(--text-muted); font-size:12px; line-height:1.45; }
        .nt-chip { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:5px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:11.5px; font-weight:500; cursor:pointer; font-family:inherit; transition:background .1s, border-color .1s; white-space:nowrap; height:24px; }
        .nt-chip:hover { background:var(--surface-2); border-color:var(--border-strong); }
        .nt-chip select, .nt-chip input { background:transparent; border:none; outline:none; color:inherit; font-size:11.5px; font-weight:500; font-family:inherit; cursor:pointer; padding:0; }
        .nt-chip.has-value { color:var(--text); }
      `}</style>

      <div className="nt-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="nt-modal">

          {/* Top bar — project context + close */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {currentProject && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 7px', borderRadius:6, background:'color-mix(in srgb, var(--surface-2) 72%, transparent)', maxWidth:220, minWidth:0 }}>
                  <span style={{ width:8, height:8, borderRadius:2, background: currentProject.color || 'var(--text-muted)', flexShrink:0 }}/>
                  {defaultProjectId ? (
                    // Project is locked (opened from a project view) — show
                    // the name, no picker. The task is already assigned here.
                    <span style={{ color:'var(--text)', fontSize:11.5, fontWeight:500, maxWidth:170, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {currentProject.title}
                    </span>
                  ) : (
                    <select value={projectId} onChange={e => setProjectId(e.target.value)}
                      style={{ background:'transparent', border:'none', outline:'none', color:'var(--text)', fontSize:11.5, fontWeight:500, fontFamily:'inherit', cursor:'pointer', padding:0, maxWidth:170, minWidth:0, overflow:'hidden', textOverflow:'ellipsis' }}>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  )}
                </div>
              )}
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>›</span>
              <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>{isSuggestion ? 'Aufgabe vorschlagen' : 'Aufgabe erstellen'}</span>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, borderRadius:4, display:'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="nt-mode" role="tablist" aria-label="Task-Erstellung">
            <button type="button" className={entryMode === 'tagro' ? 'on' : ''} onClick={() => { setEntryMode('tagro'); clearVeyraPreview('') }}>{isSuggestion ? 'Veyra prüfen lassen' : 'Veyra generieren'}</button>
            <button type="button" className={entryMode === 'manual' ? 'on' : ''} onClick={() => { setEntryMode('manual'); clearVeyraPreview('') }}>Manuell</button>
          </div>

          {entryMode === 'tagro' && (
            <div className="nt-tagro-box">
              {isSuggestion
                ? 'Veyra ist Standard: Dein Vorschlag wird erst in Projektkontext übersetzt und zur Prüfung vorbereitet. Er geht nicht direkt ungeprüft in den Dev-Workflow.'
                : 'Veyra ist Standard: Beschreibe kurz das Ziel oder den Blocker. Daraus werden Titel, Priorität und nächste Schritte für den Developer ableitbar.'}
            </div>
          )}
          {veyraNotice ? <div className="nt-notice">{veyraNotice}</div> : null}
          {entryMode === 'tagro' && veyraPreview ? (
            <div className="nt-ai-thread">
              <div className="nt-ai-avatar">V</div>
              <div className="nt-ai-bubble">
                <span>Veyra Vorschlag</span>
                <strong>{veyraPreview.suggested_title || 'Geprüfte Aufgabe'}</strong>
                <p>{veyraPreview.client_summary || veyraPreview.suggested_description || 'Veyra hat deinen Vorschlag strukturiert.'}</p>
                {veyraPreview.possible_dev_interpretation ? <p>Mögliche Umsetzung: {veyraPreview.possible_dev_interpretation}</p> : null}
                {veyraPreview.open_questions?.length ? (
                  <ul>{veyraPreview.open_questions.slice(0, 3).map(question => <li key={question}>{question}</li>)}</ul>
                ) : null}
                {veyraPreview.risks?.length ? <p>Risiko: {veyraPreview.risks.slice(0, 2).join(' · ')}</p> : null}
                <div className="nt-ai-actions">
                  <button type="button" onClick={() => clearVeyraPreview('Vorschlag verworfen. Du kannst den Text anpassen oder neu prüfen lassen.')}>Ablehnen</button>
                  <button type="button" onClick={() => requestVeyraPreview(true)} disabled={creating}>Neu formulieren</button>
                  <button type="button" className="primary" onClick={createFromVeyraPreview} disabled={creating}>Vorschlag übernehmen</button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Title + description */}
          <div style={{ padding:'14px 18px 4px' }}>
            <input
              className="nt-input"
              placeholder={entryMode === 'tagro' ? (isSuggestion ? 'Welche Aufgabe möchtest du vorschlagen?' : 'Was soll Veyra als Aufgabe vorbereiten?') : 'Aufgabentitel'}
              value={title}
              onChange={e => { setTitle(e.target.value); clearVeyraPreview('') }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate() } }}
              style={{ fontSize:18, fontWeight:600, letterSpacing:'-.2px', marginBottom:8, display:'block' }}
              autoFocus
            />
            <textarea
              className="nt-input"
              placeholder={entryMode === 'tagro' ? (isSuggestion ? 'Beschreibe Ziel, Kontext oder gewünschte Änderung. Veyra formuliert daraus einen prüfbaren Vorschlag…' : 'Beschreibe Kontext, Ziel, Akzeptanzkriterien oder was der Developer wissen muss…') : 'Beschreibung hinzufügen…'}
              value={description}
              onChange={e => { setDescription(e.target.value); clearVeyraPreview('') }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleCreate() } }}
              rows={4}
              style={{ fontSize:13.5, lineHeight:1.6, color:'var(--text-secondary)', resize:'none', minHeight:80 }}
            />
          </div>

          {/* Chips row */}
          <div style={{ padding:'10px 18px 14px', display:'flex', flexWrap:'wrap', gap:5 }}>
            {isSuggestion ? (
              <span className="nt-chip has-value" title="Client-Vorschläge bleiben bis zur Prüfung gesperrt.">
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#6a738c', flexShrink:0 }}/>
                Zur Prüfung
              </span>
            ) : (
              <label className={`nt-chip ${status !== 'todo' ? 'has-value' : ''}`}>
                <span style={{ width:7, height:7, borderRadius:'50%', background: STATUS_OPTIONS.find(s=>s.value===status)?.dot, flexShrink:0 }}/>
                <select value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
            )}

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
              {isSuggestion ? 'Status: Zur Prüfung' : (entryMode === 'tagro' ? 'Veyra Auto-Generate' : (source === 'status_report' ? 'Aus Statusbericht' : 'Manuell erstellt'))}
            </span>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={onClose}
                style={{ padding:'5px 12px', background:'transparent', border:'1px solid var(--border)', borderRadius:6,
                  color:'var(--text-secondary)', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', height:28 }}>
                Abbrechen
              </button>
              <button onClick={handleCreate} disabled={!canSubmit}
                style={{
                  padding:'5px 14px', height:28,
                  background: canSubmit ? 'var(--btn-prim)' : 'var(--surface-2)',
                  color: canSubmit ? 'var(--btn-prim-text)' : 'var(--text-muted)',
                  border:'none', borderRadius:6, fontSize:12, fontWeight:600,
                  cursor: canSubmit ? 'pointer' : 'default',
                  fontFamily:'inherit', opacity: creating ? .7 : 1,
                  display:'flex', alignItems:'center', gap:6,
                }}>
                {creating
                  ? (veyraPreview ? 'Übernimmt…' : 'Veyra prüft…')
                  : (isSuggestion
                    ? (entryMode === 'tagro' ? (veyraPreview ? 'Vorschlag übernehmen' : 'Mit Veyra prüfen') : 'Vorschlag senden')
                    : (entryMode === 'tagro' ? (veyraPreview ? 'Vorschlag übernehmen' : 'Mit Veyra prüfen') : 'Task erstellen'))}
                {!creating && <span style={{ fontSize:10, opacity:.6 }}>↵</span>}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
