'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PROJECT_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#64748b', label: 'Slate' },
]

const STATUS_OPTIONS = ['Backlog', 'In Planung', 'Aktiv', 'Testing', 'Fertig']
const PRIORITY_OPTIONS = ['Keine Priorität', 'Kritisch', 'Hoch', 'Mittel', 'Niedrig']

type Milestone = { label: string; date: string }

interface Props {
  onClose: () => void
  onCreated?: (projectId: string) => void
}

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const supabase = createClient()

  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0].value)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [status, setStatus] = useState('Backlog')
  const [priority, setPriority] = useState('Keine Priorität')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('')
  const [showMilestoneInput, setShowMilestoneInput] = useState(false)
  const [creating, setCreating] = useState(false)

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
    <>
      <style>{`
        .npm-overlay {
          position:fixed; inset:0;
          background:rgba(0,0,0,.55);
          backdrop-filter:blur(10px) saturate(140%);
          -webkit-backdrop-filter:blur(10px) saturate(140%);
          z-index:1000;
          display:flex; align-items:center; justify-content:center;
          padding:24px;
          animation:npmFadeIn .15s ease;
        }
        .npm-modal {
          background:var(--card);
          border:1px solid var(--border);
          border-radius:16px;
          width:100%; max-width:660px; max-height:90vh; overflow-y:auto;
          box-shadow:0 28px 80px rgba(0,0,0,.32), 0 2px 8px rgba(0,0,0,.12);
          animation:npmSlideUp .22s cubic-bezier(.16,1,.3,1);
        }
        @keyframes npmFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes npmSlideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .npm-chip { display:flex; align-items:center; gap:5px; padding:4px 10px; border-radius:6px; border:1px solid var(--border); background:transparent; color:var(--text-muted); font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; transition:all .1s; white-space:nowrap; }
        .npm-chip:hover { background:var(--surface); color:var(--text-secondary); }
        .npm-chip select { background:transparent; border:none; outline:none; color:inherit; font-size:12px; font-weight:500; font-family:inherit; cursor:pointer; padding:0; }
        .npm-input { background:transparent; border:none; outline:none; font-family:inherit; color:var(--text); width:100%; }
        .npm-divider { height:1px; background:var(--border); margin:0 24px; }
        .npm-milestone-row { display:flex; align-items:center; gap:8px; padding:6px 0; }
        .npm-milestone-row:hover .npm-ms-del { opacity:1; }
        .npm-ms-del { opacity:0; background:none; border:none; cursor:pointer; color:var(--text-muted); padding:2px; transition:opacity .1s; }
      `}</style>

      <div className="npm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="npm-modal">

          {/* Header: Icon + Name + Summary */}
          <div style={{ padding:'24px 24px 0' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
              {/* Color / Icon button */}
              <div style={{ position:'relative', flexShrink:0, marginTop:2 }}>
                <button
                  onClick={() => setShowColorPicker(v => !v)}
                  style={{
                    width:36, height:36, borderRadius:10,
                    background: selectedColor + '22',
                    border: `1.5px solid ${selectedColor}55`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', transition:'all .15s',
                  }}
                >
                  <span style={{ width:14, height:14, borderRadius:4, background:selectedColor, display:'block' }}/>
                </button>
                {showColorPicker && (
                  <div style={{
                    position:'absolute', top:44, left:0, zIndex:10,
                    background:'var(--card)', border:'1px solid var(--border)',
                    borderRadius:12, padding:12, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8,
                    boxShadow:'0 8px 32px rgba(0,0,0,.25)',
                  }}>
                    {PROJECT_COLORS.map(c => (
                      <button key={c.value} onClick={() => { setSelectedColor(c.value); setShowColorPicker(false) }}
                        title={c.label}
                        style={{
                          width:24, height:24, borderRadius:6, background:c.value,
                          border: selectedColor === c.value ? '2px solid var(--text)' : '2px solid transparent',
                          cursor:'pointer', transition:'transform .1s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform='scale(1.15)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform='scale(1)'}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div style={{ flex:1 }}>
                <input
                  className="npm-input"
                  placeholder="Projektname"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
                  style={{ fontSize:22, fontWeight:700, letterSpacing:'-.3px', marginBottom:6, display:'block' }}
                  autoFocus
                />
                <input
                  className="npm-input"
                  placeholder="Kurze Beschreibung hinzufügen…"
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
                  style={{ fontSize:14, color:'var(--text-muted)', fontWeight:400 }}
                />
              </div>

              {/* Close */}
              <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, marginTop:-2, borderRadius:6, flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Chips row */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:18, paddingBottom:18 }}>
              <button className="npm-chip">
                <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--text-muted)', flexShrink:0 }}/>
                <select value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </button>

              <button className="npm-chip">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8l4 4-4 4"/></svg>
                <select value={priority} onChange={e => setPriority(e.target.value)}>
                  {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                </select>
              </button>

              <button className="npm-chip">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Lead
              </button>

              <button className="npm-chip">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Mitglieder
              </button>

              <label className="npm-chip" style={{ cursor:'pointer' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                {startDate ? startDate : 'Start'}
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  style={{ position:'absolute', opacity:0, width:0, height:0, pointerEvents:'none' }}
                  tabIndex={-1}
                />
              </label>

              <label className="npm-chip" style={{ cursor:'pointer' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                {targetDate ? targetDate : 'Zieldatum'}
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                  style={{ position:'absolute', opacity:0, width:0, height:0, pointerEvents:'none' }}
                  tabIndex={-1}
                />
              </label>

              <button className="npm-chip">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                Labels
              </button>
            </div>
          </div>

          <div className="npm-divider"/>

          {/* Description */}
          <div style={{ padding:'20px 24px' }}>
            <textarea
              className="npm-input"
              placeholder="Beschreibung, Projektbrief oder Ideen sammeln…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              style={{ fontSize:14, lineHeight:1.65, resize:'none', color:'var(--text-secondary)', fontWeight:400 }}
            />
          </div>

          <div className="npm-divider"/>

          {/* Milestones */}
          <div style={{ padding:'16px 24px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)' }}>Milestones</span>
              <button onClick={() => setShowMilestoneInput(v => !v)}
                style={{ width:22, height:22, borderRadius:6, background:'none', border:'1px solid var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-muted)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>

            {milestones.map((ms, i) => (
              <div key={i} className="npm-milestone-row">
                <span style={{ width:6, height:6, borderRadius:'50%', background:selectedColor, flexShrink:0 }}/>
                <span style={{ fontSize:13, color:'var(--text-secondary)', flex:1 }}>{ms.label}</span>
                <button className="npm-ms-del" onClick={() => setMilestones(m => m.filter((_,j) => j !== i))}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}

            {showMilestoneInput && (
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                <input
                  className="npm-input"
                  autoFocus
                  placeholder="Milestone Name…"
                  value={newMilestoneLabel}
                  onChange={e => setNewMilestoneLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addMilestone(); if (e.key === 'Escape') setShowMilestoneInput(false) }}
                  style={{ flex:1, fontSize:13, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px' }}
                />
                <button onClick={addMilestone}
                  style={{ padding:'6px 14px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  Add
                </button>
              </div>
            )}

            {milestones.length === 0 && !showMilestoneInput && (
              <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>Noch keine Milestones</p>
            )}
          </div>

          <div className="npm-divider"/>

          {/* Footer */}
          <div style={{ padding:'16px 24px', display:'flex', justifyContent:'flex-end', gap:10 }}>
            <button onClick={onClose}
              style={{ padding:'8px 18px', background:'none', border:'1px solid var(--border)', borderRadius:8,
                color:'var(--text-secondary)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Abbrechen
            </button>
            <button onClick={handleCreate} disabled={!name.trim() || creating}
              style={{
                padding:'8px 20px',
                background: name.trim() ? selectedColor : 'var(--surface)',
                color: name.trim() ? '#fff' : 'var(--text-muted)',
                border:'none', borderRadius:8, fontSize:13, fontWeight:700,
                cursor: name.trim() ? 'pointer' : 'default',
                fontFamily:'inherit', transition:'all .15s',
                opacity: creating ? .7 : 1,
              }}>
              {creating ? 'Erstelle…' : 'Projekt erstellen'}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
