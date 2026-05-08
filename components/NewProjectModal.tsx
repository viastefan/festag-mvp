'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TagroLogo from '@/components/TagroLogo'

const PROJECT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#64748b']
const STATUS_OPTIONS = ['Backlog', 'In Planung', 'Aktiv', 'Testing', 'Fertig']
const PRIORITY_OPTIONS = ['Keine Priorität', 'Kritisch', 'Hoch', 'Mittel', 'Niedrig']

type Mode = 'tagro' | 'form'
type Milestone = { label: string; date: string }
type Message = { role: 'ai' | 'user'; text: string }

interface Props {
  onClose: () => void
  onCreated?: (projectId: string) => void
}

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const supabase = createClient()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [mode, setMode] = useState<Mode>('tagro')
  const [idea, setIdea] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Was möchtest du bauen — und welches Problem löst es konkret?' },
  ])
  const [creatingWithTagro, setCreatingWithTagro] = useState(false)
  const [tagroError, setTagroError] = useState('')

  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0])
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [status, setStatus] = useState('Backlog')
  const [priority, setPriority] = useState('Keine Priorität')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('')
  const [showMilestoneInput, setShowMilestoneInput] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 120)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  async function createWithTagro() {
    const cleanIdea = idea.trim()
    if (!cleanIdea || creatingWithTagro) return
    setTagroError('')
    setCreatingWithTagro(true)
    setMessages(prev => [...prev, { role: 'user', text: cleanIdea }])

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('Bitte melde dich erneut an.')

      const chatHistory: Message[] = [
        { role: 'ai', text: 'Was möchtest du bauen — und welches Problem löst es konkret?' },
        { role: 'user', text: cleanIdea },
      ]

      const res = await fetch('/api/ai/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory, userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Tagro konnte das Projekt nicht strukturieren.')

      if (data.projectId) {
        setMessages(prev => [...prev, { role: 'ai', text: 'Ich habe dein Projekt strukturiert und die ersten Workspace-Tasks vorbereitet.' }])
        onCreated?.(data.projectId)
        onClose()
        return
      }

      throw new Error('Projekt wurde analysiert, aber noch nicht gespeichert.')
    } catch (error: any) {
      setTagroError(error.message ?? 'Projektanlage fehlgeschlagen.')
      setMessages(prev => [...prev, { role: 'ai', text: 'Das hat noch nicht sauber funktioniert. Du kannst es erneut versuchen oder auf Formular wechseln.' }])
    } finally {
      setCreatingWithTagro(false)
    }
  }

  async function handleCreate() {
    if (!name.trim()) return
    setCreating(true)
    try {
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) return
      const { data, error } = await (supabase as any)
        .from('projects')
        .insert({
          user_id: sess.session.user.id,
          title: name.trim(),
          description: description.trim() || summary.trim() || null,
          scope_summary: summary.trim() || null,
          status: 'intake',
          color: selectedColor,
          timeline: targetDate || null,
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

  function addMilestone() {
    if (!newMilestoneLabel.trim()) return
    setMilestones(m => [...m, { label: newMilestoneLabel.trim(), date: '' }])
    setNewMilestoneLabel('')
    setShowMilestoneInput(false)
  }

  return (
    <div className="npm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <style>{`
        .npm-overlay {
          position:fixed; inset:0; z-index:1000;
          background:rgba(22,22,22,.82);
          backdrop-filter:blur(14px) saturate(125%);
          -webkit-backdrop-filter:blur(14px) saturate(125%);
          display:flex; align-items:center; justify-content:center;
          padding:24px;
          animation:npmFadeIn .16s ease both;
        }
        .npm-shell {
          width:min(920px, calc(100vw - 40px));
          max-height:min(760px, calc(100dvh - 48px));
          border:1px solid color-mix(in srgb, var(--border) 92%, transparent);
          background:var(--card);
          color:var(--text);
          border-radius:28px;
          box-shadow:0 34px 120px rgba(0,0,0,.34), 0 1px 0 rgba(255,255,255,.05) inset;
          overflow:hidden;
          animation:npmPop .26s cubic-bezier(.16,1,.3,1) both;
          display:flex;
          flex-direction:column;
        }
        .npm-shell.form { max-width:760px; }
        @keyframes npmFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes npmPop { from{opacity:0; transform:translateY(18px) scale(.985)} to{opacity:1; transform:none} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .npm-head {
          height:70px;
          border-bottom:1px solid var(--border);
          display:flex; align-items:center; justify-content:space-between;
          padding:0 28px;
          flex-shrink:0;
        }
        .npm-title { display:flex; align-items:center; gap:12px; min-width:0; }
        .npm-title strong { font-size:16px; letter-spacing:-.03em; }
        .npm-title span { color:var(--text-muted); font-size:13px; font-weight:700; }
        .npm-head-actions { display:flex; align-items:center; gap:10px; }
        .npm-ghost-btn {
          height:36px; padding:0 14px; border-radius:12px;
          border:1px solid var(--border); background:var(--surface);
          color:var(--text-secondary); font-family:inherit; font-weight:750;
          cursor:pointer;
        }
        .npm-icon-btn {
          width:36px; height:36px; border:0; background:transparent;
          color:var(--text-muted); border-radius:12px; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
        }
        .npm-icon-btn:hover, .npm-ghost-btn:hover { background:var(--surface-2); color:var(--text); }
        .npm-chat-body { display:grid; grid-template-rows:1fr auto; min-height:430px; }
        .npm-question {
          background:var(--surface);
          min-height:190px;
          padding:56px 52px;
          display:flex; align-items:center;
        }
        .npm-question h2 {
          margin:0;
          font-size:clamp(25px, 3vw, 34px);
          line-height:1.16;
          letter-spacing:-.055em;
          font-weight:800;
          color:var(--text-secondary);
          max-width:780px;
        }
        .npm-input-area {
          padding:32px 52px 36px;
          display:grid;
          grid-template-columns:1fr 64px;
          gap:18px;
          align-items:end;
        }
        .npm-idea {
          border:0; outline:0; resize:none; background:transparent;
          color:var(--text); font-family:inherit;
          font-size:24px; line-height:1.38; font-weight:650;
          min-height:92px; max-height:210px;
        }
        .npm-idea::placeholder { color:var(--text-muted); opacity:.48; }
        .npm-send {
          width:58px; height:58px; border:0; border-radius:17px;
          background:var(--surface-2); color:var(--text-muted);
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:all .15s ease;
        }
        .npm-send.ready { background:var(--text); color:var(--bg); }
        .npm-send:disabled { cursor:default; opacity:.62; }
        .npm-hint {
          text-align:center; margin-top:20px;
          color:rgba(255,255,255,.34); font-weight:750; font-size:13px;
          letter-spacing:.01em;
        }
        .npm-kbd { border:1px solid rgba(255,255,255,.14); border-radius:7px; padding:2px 8px; font-family:var(--font-mono); color:rgba(255,255,255,.45); }
        .npm-error { margin:0 52px 20px; color:#ef4444; font-size:13px; font-weight:750; }
        .npm-form-body { overflow:auto; padding:28px; }
        .npm-chip { display:flex; align-items:center; gap:5px; padding:5px 10px; border-radius:999px; border:1px solid var(--border); background:var(--surface); color:var(--text-muted); font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .npm-chip:hover { background:var(--surface-2); color:var(--text-secondary); }
        .npm-chip select { background:transparent; border:none; outline:none; color:inherit; font-size:12px; font-weight:700; font-family:inherit; cursor:pointer; padding:0; }
        .npm-input { background:transparent; border:none; outline:none; font-family:inherit; color:var(--text); width:100%; }
        .npm-form-divider { height:1px; background:var(--border); margin:0 0 22px; }
        .npm-milestone-row { display:flex; align-items:center; gap:8px; padding:6px 0; }
        .npm-milestone-row:hover .npm-ms-del { opacity:1; }
        .npm-ms-del { opacity:0; background:none; border:none; cursor:pointer; color:var(--text-muted); padding:2px; transition:opacity .1s; }
        @media (max-width: 700px) {
          .npm-overlay { padding:14px; align-items:flex-end; }
          .npm-shell { width:100%; max-height:calc(100dvh - 28px); border-radius:24px; }
          .npm-head { padding:0 18px; }
          .npm-question { padding:34px 24px; min-height:170px; }
          .npm-input-area { padding:24px; grid-template-columns:1fr 52px; }
          .npm-idea { font-size:20px; }
          .npm-send { width:50px; height:50px; border-radius:15px; }
        }
      `}</style>

      {mode === 'tagro' ? (
        <div className="npm-shell" onMouseDown={e => e.stopPropagation()}>
          <div className="npm-head">
            <div className="npm-title">
              <TagroLogo size={30} thinking={creatingWithTagro} />
              <strong>Tagro AI</strong>
              <span>· Neues Projekt</span>
            </div>
            <div className="npm-head-actions">
              <button className="npm-ghost-btn" onClick={() => setMode('form')} type="button">Formular</button>
              <button className="npm-icon-btn" onClick={onClose} type="button" aria-label="Schließen">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          <div className="npm-chat-body">
            <div>
              <section className="npm-question">
                <h2>{messages[messages.length - 1]?.role === 'ai' ? messages[messages.length - 1].text : 'Ich strukturiere dein Projekt und bereite die ersten Workspace-Tasks vor.'}</h2>
              </section>
              {tagroError && <p className="npm-error">{tagroError}</p>}
            </div>
            <div>
              <div className="npm-input-area">
                <textarea
                  ref={inputRef}
                  value={idea}
                  onChange={e => setIdea(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      createWithTagro()
                    }
                  }}
                  className="npm-idea"
                  placeholder="Beschreibe deine Idee..."
                  rows={3}
                />
                <button className={`npm-send ${idea.trim() ? 'ready' : ''}`} onClick={createWithTagro} disabled={!idea.trim() || creatingWithTagro} type="button" aria-label="Mit Tagro erstellen">
                  {creatingWithTagro ? (
                    <span style={{ width:20, height:20, border:'2px solid currentColor', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M9 7h8v8" /></svg>
                  )}
                </button>
              </div>
              <p className="npm-hint">Tagro · AI-Projektmanager von Festag · <span className="npm-kbd">Enter</span> zum Senden</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="npm-shell form" onMouseDown={e => e.stopPropagation()}>
          <div className="npm-head">
            <div className="npm-title">
              <button className="npm-icon-btn" onClick={() => setMode('tagro')} type="button" aria-label="Zurück zu Tagro">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <strong>Formular</strong>
              <span>· Neues Projekt</span>
            </div>
            <button className="npm-icon-btn" onClick={onClose} type="button" aria-label="Schließen">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="npm-form-body">
            <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:22 }}>
              <div style={{ position:'relative', flexShrink:0, marginTop:2 }}>
                <button onClick={() => setShowColorPicker(v => !v)} style={{ width:36, height:36, borderRadius:10, background:selectedColor + '22', border:`1.5px solid ${selectedColor}55`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }} type="button">
                  <span style={{ width:14, height:14, borderRadius:4, background:selectedColor, display:'block' }} />
                </button>
                {showColorPicker && (
                  <div style={{ position:'absolute', top:44, left:0, zIndex:10, background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:12, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, boxShadow:'0 8px 32px rgba(0,0,0,.25)' }}>
                    {PROJECT_COLORS.map(c => <button key={c} onClick={() => { setSelectedColor(c); setShowColorPicker(false) }} style={{ width:24, height:24, borderRadius:6, background:c, border:selectedColor === c ? '2px solid var(--text)' : '2px solid transparent', cursor:'pointer' }} type="button" />)}
                  </div>
                )}
              </div>
              <div style={{ flex:1 }}>
                <input className="npm-input" placeholder="Projektname" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }} style={{ fontSize:28, fontWeight:800, letterSpacing:'-.05em', marginBottom:7, display:'block' }} autoFocus />
                <input className="npm-input" placeholder="Kurze Beschreibung hinzufügen…" value={summary} onChange={e => setSummary(e.target.value)} style={{ fontSize:15, color:'var(--text-muted)', fontWeight:600 }} />
              </div>
            </div>

            <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:24 }}>
              <button className="npm-chip" type="button"><span style={{ width:8, height:8, borderRadius:'50%', background:'var(--text-muted)' }} /><select value={status} onChange={e => setStatus(e.target.value)}>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></button>
              <button className="npm-chip" type="button"><select value={priority} onChange={e => setPriority(e.target.value)}>{PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}</select></button>
              <button className="npm-chip" type="button">Lead</button>
              <button className="npm-chip" type="button">Mitglieder</button>
              <label className="npm-chip">{startDate || 'Start'}<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ position:'absolute', opacity:0, width:0, height:0 }} tabIndex={-1} /></label>
              <label className="npm-chip">{targetDate || 'Zieldatum'}<input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={{ position:'absolute', opacity:0, width:0, height:0 }} tabIndex={-1} /></label>
              <button className="npm-chip" type="button">Labels</button>
              <button className="npm-chip" type="button">Dependencies</button>
            </div>

            <div className="npm-form-divider" />
            <textarea className="npm-input" placeholder="Beschreibung, Projektbrief oder Ideen sammeln…" value={description} onChange={e => setDescription(e.target.value)} rows={8} style={{ fontSize:16, lineHeight:1.7, resize:'none', color:'var(--text-secondary)', fontWeight:600, marginBottom:26 }} />

            <div style={{ border:'1px solid var(--border)', borderRadius:14, padding:'13px 15px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <span style={{ fontSize:14, fontWeight:800, color:'var(--text-secondary)' }}>Milestones</span>
              <button onClick={() => setShowMilestoneInput(v => !v)} style={{ width:26, height:26, borderRadius:8, background:'none', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)' }} type="button">+</button>
            </div>
            {milestones.map((ms, i) => (
              <div key={i} className="npm-milestone-row"><span style={{ width:6, height:6, borderRadius:'50%', background:selectedColor }} /><span style={{ fontSize:13, color:'var(--text-secondary)', flex:1 }}>{ms.label}</span><button className="npm-ms-del" onClick={() => setMilestones(m => m.filter((_, j) => j !== i))} type="button">×</button></div>
            ))}
            {showMilestoneInput && (
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <input className="npm-input" autoFocus placeholder="Milestone Name…" value={newMilestoneLabel} onChange={e => setNewMilestoneLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addMilestone(); if (e.key === 'Escape') setShowMilestoneInput(false) }} style={{ flex:1, fontSize:13, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'8px 10px' }} />
                <button onClick={addMilestone} style={{ padding:'8px 14px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:10, fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }} type="button">Add</button>
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:28 }}>
              <button onClick={onClose} className="npm-ghost-btn" type="button">Abbrechen</button>
              <button onClick={handleCreate} disabled={!name.trim() || creating} style={{ height:38, padding:'0 18px', background:name.trim() ? selectedColor : 'var(--surface)', color:name.trim() ? '#fff' : 'var(--text-muted)', border:'none', borderRadius:12, fontSize:13, fontWeight:800, cursor:name.trim() ? 'pointer' : 'default', fontFamily:'inherit', opacity:creating ? .72 : 1 }} type="button">
                {creating ? 'Erstelle…' : 'Projekt erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
