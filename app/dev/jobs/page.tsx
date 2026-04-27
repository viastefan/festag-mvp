'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Task = {
  id: string; title: string; description: string; status: string; priority: string;
  estimated_hours: number; acceptance_criteria: string[]; tags: string[];
  requires_approval: boolean; approved_by: string | null; dev_notes: string;
  project?: { title: string; user_id: string }
  epic?: { title: string }
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#F76060', high: 'var(--amber)', medium: 'var(--green)', low: 'var(--text-muted)'
}
const STATUS_LABEL: Record<string, string> = {
  todo: 'To Do', in_progress: 'In Arbeit', done: 'Erledigt', blocked: 'Blockiert'
}

export default function DevJobsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Task | null>(null)
  const [devNote, setDevNote] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<'all'|'pending'|'mine'>('pending')

  useEffect(() => { loadTasks() }, [filter])

  async function loadTasks() {
    setLoading(true)
    const sb = createClient()
    const { data: { session } } = await sb.auth.getSession()
    if (!session) return

    let q = sb.from('tasks')
      .select('*, project:projects(title,user_id), epic:epics(title)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (filter === 'pending') q = q.eq('status', 'todo')
    if (filter === 'mine') q = q.eq('assigned_to', session.user.id)

    const { data } = await q
    setTasks(data ?? [])
    setLoading(false)
  }

  async function updateStatus(taskId: string, status: string) {
    const sb = createClient()
    await sb.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId)
    setTasks(t => t.map(x => x.id === taskId ? { ...x, status } : x))
    if (selected?.id === taskId) setSelected(s => s ? { ...s, status } : null)
  }

  async function sendProgressUpdate() {
    if (!selected || !devNote.trim()) return
    setSending(true)
    try {
      await fetch('/api/ai/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selected.id,
          devNote: devNote.trim(),
          projectId: (selected as any).project_id,
        })
      })
      setDevNote('')
      await loadTasks()
      setSelected(null)
    } catch {}
    setSending(false)
  }

  async function approveTask(taskId: string) {
    const sb = createClient()
    const { data: { session } } = await sb.auth.getSession()
    await sb.from('tasks').update({ requires_approval: false, approved_by: session?.user.id }).eq('id', taskId)
    setTasks(t => t.map(x => x.id === taskId ? { ...x, requires_approval: false } : x))
  }

  return (
    <div style={{ padding:'32px 40px', maxWidth:1100 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:'var(--text)', letterSpacing:'-.5px', marginBottom:4 }}>Dev Board</h1>
        <p style={{ fontSize:14, color:'var(--text-secondary)', margin:0 }}>Alle Tasks aus AI-Projektzerlegung · Kundenupdate per Tagro</p>
      </div>

      {/* Filter */}
      <div style={{ display:'flex', gap:6, marginBottom:24, padding:4, background:'var(--card)', borderRadius:10, width:'fit-content' }}>
        {([['all','Alle'],['pending','Offen'],['mine','Meine']] as const).map(([k,l]) => (
          <button key={k} onClick={()=>setFilter(k)} style={{
            padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit',
            fontSize:13, fontWeight:filter===k?700:500,
            background:filter===k?'var(--surface)':'transparent',
            color:filter===k?'var(--text)':'var(--text-muted)',
            boxShadow:filter===k?'var(--shadow-xs)':'none',
          }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{display:'flex',justifyContent:'center',padding:48}}><div style={{width:24,height:24,border:'2px solid var(--border)',borderTopColor:'var(--text)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/></div>
      ) : tasks.length === 0 ? (
        <div style={{padding:'48px 24px',textAlign:'center',color:'var(--text-muted)',fontSize:14}}>Keine Tasks gefunden.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {tasks.map(t => (
            <div key={t.id} onClick={()=>{setSelected(t);setDevNote(t.dev_notes??'')}}
              style={{
                background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:12, padding:'14px 18px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:12,
                transition:'all .12s',
                borderLeft: `3px solid ${PRIORITY_COLOR[t.priority] ?? 'var(--border)'}`,
              }}
            >
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <span style={{fontSize:14,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</span>
                  {t.requires_approval && <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:5,background:'var(--amber-bg)',color:'var(--amber-dark)'}}>GENEHMIGUNG</span>}
                </div>
                <div style={{display:'flex',gap:8,fontSize:12,color:'var(--text-muted)'}}>
                  <span>{t.project?.title ?? '—'}</span>
                  {t.epic && <><span>·</span><span>{t.epic.title}</span></>}
                  {t.estimated_hours && <><span>·</span><span>{t.estimated_hours}h</span></>}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                <select value={t.status} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();updateStatus(t.id,e.target.value)}}
                  style={{padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--card)',color:'var(--text)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                  {Object.entries(STATUS_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
                {t.requires_approval && (
                  <button onClick={e=>{e.stopPropagation();approveTask(t.id)}}
                    style={{padding:'5px 10px',borderRadius:8,border:'none',background:'var(--green-bg)',color:'var(--green-dark)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    Genehmigen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Detail Sidebar */}
      {selected && (
        <div style={{position:'fixed',inset:0,zIndex:500,display:'flex'}}>
          <div onClick={()=>setSelected(null)} style={{flex:1,background:'rgba(0,0,0,.3)',backdropFilter:'blur(2px)'}}/>
          <div style={{width:420,background:'var(--bg)',borderLeft:'1px solid var(--border)',overflowY:'auto',padding:24,display:'flex',flexDirection:'column',gap:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <h2 style={{fontSize:18,fontWeight:700,color:'var(--text)',letterSpacing:'-.3px',margin:0}}>Task Detail</h2>
              <button onClick={()=>setSelected(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:20,padding:4}}>×</button>
            </div>

            <h3 style={{fontSize:15,fontWeight:700,color:'var(--text)',margin:0}}>{selected.title}</h3>
            {selected.description && <p style={{fontSize:14,color:'var(--text-secondary)',lineHeight:1.6,margin:0}}>{selected.description}</p>}

            {selected.acceptance_criteria?.length > 0 && (
              <div>
                <p style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.08em',margin:'0 0 8px'}}>AKZEPTANZKRITERIEN</p>
                {selected.acceptance_criteria.map((ac,i)=>(
                  <div key={i} style={{display:'flex',gap:8,marginBottom:6}}>
                    <span style={{color:'var(--green)',fontWeight:700}}>✓</span>
                    <span style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.5}}>{ac}</span>
                  </div>
                ))}
              </div>
            )}

            {selected.tags?.length > 0 && (
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {selected.tags.map(t=>(
                  <span key={t} style={{padding:'3px 9px',borderRadius:6,background:'var(--card)',border:'1px solid var(--border)',fontSize:12,color:'var(--text-secondary)'}}>#{t}</span>
                ))}
              </div>
            )}

            {/* Kundenupdate */}
            <div style={{borderTop:'1px solid var(--border)',paddingTop:16}}>
              <p style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.08em',margin:'0 0 8px'}}>KUNDENUPDATE VIA TAGRO</p>
              <textarea
                value={devNote}
                onChange={e=>setDevNote(e.target.value)}
                placeholder="Notiz für Tagro — wird automatisch kundenfr eundlich übersetzt…"
                rows={4}
                style={{
                  width:'100%', padding:'12px 14px', background:'var(--card)',
                  border:'1px solid var(--border)', borderRadius:10,
                  fontSize:13, color:'var(--text)', fontFamily:'inherit',
                  resize:'vertical', lineHeight:1.6, outline:'none',
                }}
              />
              <button onClick={sendProgressUpdate} disabled={!devNote.trim() || sending}
                style={{
                  marginTop:8, width:'100%', padding:'11px 16px',
                  background:'var(--btn-prim)', color:'var(--btn-prim-text)',
                  border:'none', borderRadius:10, fontSize:13, fontWeight:700,
                  cursor:devNote.trim()?'pointer':'default', fontFamily:'inherit',
                  opacity:devNote.trim()?1:.5,
                }}>
                {sending ? 'Tagro übersetzt…' : 'Update senden →'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )
}
