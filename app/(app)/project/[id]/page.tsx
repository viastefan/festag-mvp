'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Project = { id: string; title: string; description: string | null; status: string }
type Task    = { id: string; title: string; status: string; priority?: string; description?: string }
type Msg     = { id: string; message: string; created_at: string; sender_id: string; is_ai?: boolean }
type UserRole = 'client' | 'dev' | 'admin'

const PHASES = ['intake', 'planning', 'active', 'testing', 'done']
const PHASE_LABEL: Record<string, string> = {
  intake: 'Intake', planning: 'Planning', active: 'Development', testing: 'Testing', done: 'Delivered',
}
const PHASE_PCT: Record<string, number> = {
  intake: 10, planning: 28, active: 62, testing: 85, done: 100,
}
const MILESTONES = [
  { label: 'Kickoff', pct: 10 }, { label: 'Design', pct: 28 },
  { label: 'MVP', pct: 62 }, { label: 'Testing', pct: 85 }, { label: 'Delivery', pct: 100 },
]

/* ── shared inline CSS ── */
const CSS = `
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(7px);}to{opacity:1;transform:none;}}
  .proj-grid{display:grid;grid-template-columns:1fr 340px;gap:14px;}
  .proj-grid-client{display:grid;grid-template-columns:1fr 300px;gap:14px;}
  @media(max-width:960px){.proj-grid,.proj-grid-client{grid-template-columns:1fr!important;}}
  .task-col-grid{display:grid;grid-template-columns:repeat(3,1fr);}
  @media(max-width:600px){.task-col-grid{grid-template-columns:1fr!important;}}
  .tab-btn{padding:8px 14px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:all .12s;}
  .tab-btn.active{background:var(--surface);color:var(--text);box-shadow:var(--shadow-xs);}
  .tab-btn:not(.active){background:transparent;color:var(--text-muted);}
  .task-card{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:9px 11px;}
  .task-card:hover{border-color:var(--border-strong);}
  .move-btn{padding:2px 8px;font-size:10px;border:1px solid var(--border);background:var(--surface);border-radius:5px;cursor:pointer;color:var(--text-secondary);font-family:inherit;font-weight:600;transition:background .1s;}
  .move-btn:hover{background:var(--surface-2);}
  .del-btn{padding:2px 6px;font-size:10px;border:1px solid var(--red-bg);background:var(--red-bg);border-radius:5px;cursor:pointer;color:var(--red);font-family:inherit;}
  .status-cta:hover{background:rgba(255,255,255,.15)!important;}
  .chat-input{flex:1;padding:9px 12px;background:var(--surface);border:1.5px solid var(--border-strong);border-radius:10px;font-size:13px;color:var(--text);outline:none;font-family:inherit;transition:border-color .15s;}
  .chat-input:focus{border-color:var(--btn-prim);}
`

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const [project,      setProject]      = useState<Project | null>(null)
  const [tasks,        setTasks]        = useState<Task[]>([])
  const [messages,     setMessages]     = useState<Msg[]>([])
  const [aiUpdates,    setAiUpdates]    = useState<any[]>([])
  const [userRole,     setUserRole]     = useState<UserRole>('client')
  const [userId,       setUserId]       = useState('')
  const [newTask,      setNewTask]      = useState('')
  const [newMsg,       setNewMsg]       = useState('')
  const [statusReport, setStatusReport] = useState('')
  const [statusLoading,setStatusLoading]= useState(false)
  const [aiThinking,   setAiThinking]   = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [online,       setOnline]       = useState(false)
  const [rightTab,     setRightTab]     = useState<'reports' | 'messages'>('messages')
  const msgEndRef = useRef<HTMLDivElement>(null)
  const supabase  = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      setUserId(uid)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', uid).single()
      setUserRole((profile?.role as UserRole) ?? 'client')
      loadAll()
    })

    const ch = supabase.channel(`proj-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${id}` }, (p) => {
        setMessages(prev => [...prev.filter(m => !m.id.startsWith('tmp-')), p.new as Msg])
        setAiThinking(false)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${id}` }, () => {
        supabase.from('tasks').select('*').eq('project_id', id).order('created_at').then(({ data: t }) => setTasks(t ?? []))
      })
      .subscribe(s => setOnline(s === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(ch) }
  }, [id])

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, aiThinking])

  async function loadAll() {
    const [{ data: proj }, { data: t }, { data: m }, { data: ai }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*').eq('project_id', id).order('created_at'),
      supabase.from('messages').select('*').eq('project_id', id).order('created_at'),
      supabase.from('ai_updates').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ])
    if (proj) setProject(proj)
    setTasks(t ?? [])
    setMessages(m ?? [])
    setAiUpdates(ai ?? [])
  }

  async function addTask() {
    if (!newTask.trim()) return
    const { data } = await supabase.from('tasks').insert({
      project_id: id, title: newTask.trim(), status: 'todo',
      ...(userRole === 'client' && { description: 'Vom Kunden angefragt' }),
    }).select().single()
    if (data) setTasks(prev => [...prev, data])
    setNewTask('')
  }

  async function updateTask(taskId: string, status: string) {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status } : t))
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(ts => ts.filter(t => t.id !== taskId))
  }

  async function updatePhase(status: string) {
    await supabase.from('projects').update({ status }).eq('id', id)
    setProject(p => p ? { ...p, status } : p)
  }

  async function sendMessage() {
    if (!newMsg.trim() || !userId) return
    const msg = newMsg; setNewMsg('')
    const tmpId = 'tmp-' + Date.now()
    setMessages(prev => [...prev, { id: tmpId, message: msg, created_at: new Date().toISOString(), sender_id: userId, is_ai: false }])
    await supabase.from('messages').insert({ project_id: id, sender_id: userId, message: msg, is_ai: false })
    setAiThinking(true)
    setTimeout(async () => {
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: `Du bist Tagro, AI-Assistent von Festag. Antworte klar, hilfreich, max 2 Sätze. Projekt: "${project?.title || ''}"`,
            max_tokens: 200,
            messages: [{ role: 'user', content: msg }],
          }),
        })
        const d = await res.json()
        const aiMsg = d.content?.[0]?.text
        if (aiMsg) await supabase.from('messages').insert({ project_id: id, sender_id: userId, message: aiMsg, is_ai: true })
        else setAiThinking(false)
      } catch { setAiThinking(false) }
    }, 800)
  }

  /* CLIENT: AI status query — the main feature */
  async function queryStatus() {
    if (statusLoading || !project) return
    setStatusLoading(true)
    const doneTasks_  = tasks.filter(t => t.status === 'done')
    const doingTasks_ = tasks.filter(t => t.status === 'doing')
    const todoTasks_  = tasks.filter(t => t.status === 'todo')
    const pPct        = PHASE_PCT[project.status] ?? 0

    const doingList = doingTasks_.slice(0, 5).map(t => `• ${t.title}`).join('\n') || '(keine)'
    const doneList  = doneTasks_.slice(0, 5).map(t => `• ${t.title}`).join('\n') || '(keine)'
    const todoList  = todoTasks_.slice(0, 5).map(t => `• ${t.title}`).join('\n') || '(keine)'

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `Du bist Tagro, der AI-Projektassistent von Festag. Du sprichst direkt mit dem Kunden.
Erkläre den Projektstatus klar und verständlich — kein Fachjargon, keine technischen Details.
Sei direkt, positiv und konkret. Maximal 4-5 Sätze. Nenne konkrete Tasks wenn sinnvoll. Sprache: Deutsch.`,
          max_tokens: 450,
          messages: [{ role: 'user', content: `Mein Projekt: "${project.title}"
Phase: ${PHASE_LABEL[project.status]} — ${pPct}% Gesamtfortschritt
Abgeschlossen (${doneTasks_.length}):\n${doneList}
Gerade in Bearbeitung (${doingTasks_.length}):\n${doingList}
Ausstehend (${todoTasks_.length}):\n${todoList}

Erkläre mir bitte: Was wurde bisher erreicht? Was passiert gerade? Was kommt als Nächstes?` }],
        }),
      })
      const d = await res.json()
      setStatusReport(d.content?.[0]?.text ?? 'Status konnte nicht abgerufen werden.')
    } catch { setStatusReport('Verbindungsfehler. Bitte erneut versuchen.') }
    setStatusLoading(false)
  }

  /* DEV: generate AI report */
  async function generateAIUpdate() {
    if (!project || generatingAI) return
    setGeneratingAI(true)
    const done = tasks.filter(t => t.status === 'done').length
    const pct  = tasks.length ? Math.round(done / tasks.length * 100) : 0
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'Du bist Tagro. Erstelle einen professionellen Tagesbericht auf Deutsch. Keine Emojis. 4-5 Sätze. Was wurde gemacht, was ist offen, nächste Schritte.',
          max_tokens: 350,
          messages: [{ role: 'user', content: `Projekt: "${project.title}". Phase: ${PHASE_LABEL[project.status]}. Fortschritt: ${pct}%. ${done}/${tasks.length} Tasks erledigt. Aktiv: ${tasks.filter(t => t.status === 'doing').map(t => t.title).join(', ') || 'keine'}.` }],
        }),
      })
      const d = await res.json()
      const content = d.content?.[0]?.text ?? `Update: ${pct}% abgeschlossen.`
      const { data: ins } = await supabase.from('ai_updates').insert({ project_id: id, content, type: 'daily_summary' }).select().single()
      if (ins) setAiUpdates(prev => [ins, ...prev])
    } catch {}
    setGeneratingAI(false)
  }

  if (!project) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )

  const doneTasks  = tasks.filter(t => t.status === 'done').length
  const doingTasks = tasks.filter(t => t.status === 'doing').length
  const todoTasks  = tasks.filter(t => t.status === 'todo').length
  const phasePct   = PHASE_PCT[project.status] ?? 0
  const phaseIdx   = PHASES.indexOf(project.status)
  const isClient   = userRole === 'client'

  /* ══════════════════════════════════════
     CHAT PANEL (shared between views)
  ══════════════════════════════════════ */
  const ChatPanel = () => (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: isClient ? 400 : 440 }}>
      <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Team Chat</p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>Tagro + Entwickler</p>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 7, letterSpacing: '.06em', background: online ? 'var(--green-bg)' : 'var(--surface-2)', color: online ? 'var(--green-dark)' : 'var(--text-muted)', border: `1px solid ${online ? 'var(--green-border)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: online ? 'var(--green)' : 'var(--text-muted)', animation: online ? 'pulse 1.5s infinite' : 'none' }} />
          {online ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && !aiThinking && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', margin: 0 }}>Starte eine Konversation…</p>
        )}
        {messages.map(m => {
          const isMine = m.sender_id === userId && !m.is_ai
          return (
            <div key={m.id} style={{ display: 'flex', gap: 8, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              {!isMine && (
                <div style={{ width: 24, height: 24, borderRadius: 7, background: m.is_ai ? 'var(--accent)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 9, color: m.is_ai ? 'var(--accent-text)' : 'var(--text-muted)', fontWeight: 700 }}>{m.is_ai ? '✦' : 'D'}</span>
                </div>
              )}
              <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: isMine ? '12px 3px 12px 12px' : '3px 12px 12px 12px', background: isMine ? 'var(--btn-prim)' : 'var(--surface)', border: isMine ? 'none' : '1px solid var(--border)', color: isMine ? 'var(--btn-prim-text)' : 'var(--text)' }}>
                <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0, wordBreak: 'break-word' }}>{m.message}</p>
              </div>
            </div>
          )
        })}
        {aiThinking && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 9, color: 'var(--accent-text)', fontWeight: 700 }}>✦</span>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px 12px 12px 12px', display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.2s ${j * .2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={msgEndRef} />
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input className="chat-input" value={newMsg} onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }}}
          placeholder="Nachricht schreiben…" />
        <button onClick={sendMessage} disabled={!newMsg.trim()} style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: newMsg.trim() ? 'var(--btn-prim)' : 'var(--surface-2)', color: newMsg.trim() ? 'var(--btn-prim-text)' : 'var(--text-muted)', cursor: newMsg.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  )

  /* ══════════════════════════════════════════
     ██  CLIENT VIEW
  ══════════════════════════════════════════ */
  if (isClient) return (
    <div className="page-content animate-fade-up" style={{ maxWidth: 1060 }}>
      <style>{CSS}</style>

      {/* Breadcrumb */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)' }}>Dashboard</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>{project.title}</span>
      </p>

      {/* Project header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.title}</h1>
          {project.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{project.description}</p>}
        </div>
        <span style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, flexShrink: 0, color: project.status === 'active' ? 'var(--green-dark)' : project.status === 'done' ? 'var(--text-muted)' : 'var(--amber-dark)', background: project.status === 'active' ? 'var(--green-bg)' : project.status === 'done' ? 'var(--surface-2)' : 'var(--amber-bg)', border: `1px solid ${project.status === 'active' ? 'var(--green-border)' : 'var(--border)'}`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {project.status === 'active' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />}
          {PHASE_LABEL[project.status] ?? project.status}
        </span>
      </div>

      {/* ════ TAGRO STATUS — HAUPTFEATURE ════ */}
      <div style={{ background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', borderRadius: 22, padding: '28px 32px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        {/* decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.03)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, left: '30%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.02)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>✦</span>
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1, color: 'inherit' }}>Tagro Status-Assistent</p>
                <p style={{ fontSize: 11, margin: '4px 0 0', opacity: .55, lineHeight: 1, color: 'inherit' }}>Ihr persönlicher Projektbegleiter — rund um die Uhr</p>
              </div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: 'rgba(255,255,255,.08)', letterSpacing: '.1em', color: 'inherit', opacity: .7, border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: online ? '#4ade80' : 'currentColor', animation: online ? 'pulse 1.5s infinite' : 'none' }} />
              {online ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Status text */}
          <div style={{ minHeight: 72, marginBottom: 24 }}>
            {statusLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: .7 }}>
                {[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', animation: `pulse 1s ${i * .15}s ease-in-out infinite` }} />)}
                <span style={{ fontSize: 13, marginLeft: 6, color: 'inherit', opacity: .6 }}>Tagro analysiert Ihr Projekt…</span>
              </div>
            ) : statusReport ? (
              <p style={{ fontSize: 15, lineHeight: 1.75, margin: 0, color: 'inherit', opacity: .92 }}>{statusReport}</p>
            ) : (
              <p style={{ fontSize: 14, fontStyle: 'italic', margin: 0, color: 'inherit', opacity: .42, lineHeight: 1.65 }}>
                Klicken Sie auf „Status abfragen" — Tagro AI liest Ihren Projektfortschritt aus und erklärt Ihnen klar, wo das Projekt steht.
              </p>
            )}
          </div>

          {/* Stats + Progress row */}
          <div style={{ display: 'flex', gap: 28, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,.10)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[
              { label: 'ERLEDIGT',    count: doneTasks,  symbol: '✓' },
              { label: 'IN ARBEIT',   count: doingTasks, symbol: '●' },
              { label: 'AUSSTEHEND',  count: todoTasks,  symbol: '○' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.09em', opacity: .48, color: 'inherit' }}>{s.symbol} {s.label}</span>
                <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: 'inherit' }}>{s.count}</span>
              </div>
            ))}
            <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.09em', opacity: .48, color: 'inherit' }}>GESAMTFORTSCHRITT</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'inherit', opacity: .8 }}>{phasePct}%</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,.12)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${phasePct}%`, background: 'rgba(255,255,255,.72)', borderRadius: 5, transition: 'width 1.2s cubic-bezier(.16,1,.3,1)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {MILESTONES.map(ms => (
                  <span key={ms.label} style={{ fontSize: 8, fontWeight: 700, opacity: phasePct >= ms.pct ? .65 : .25, letterSpacing: '.04em', color: 'inherit' }}>{ms.label.toUpperCase()}</span>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <button onClick={queryStatus} disabled={statusLoading} className="status-cta" style={{ width: '100%', height: 48, background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 13, fontSize: 14, fontWeight: 700, color: 'inherit', cursor: statusLoading ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'background .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {statusLoading
              ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Tagro analysiert…</>
              : <>{statusReport ? '↺ Status neu abfragen' : '→ Status jetzt abfragen'}</>
            }
          </button>
        </div>
      </div>

      {/* Bottom grid: read-only tasks + chat */}
      <div className="proj-grid-client">

        {/* LEFT: Read-only task board */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Meine Tasks</p>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>{tasks.length} gesamt</span>
          </div>

          <div className="task-col-grid">
            {[
              { status: 'todo',  label: 'Offen',    color: 'var(--text-muted)' },
              { status: 'doing', label: 'In Arbeit', color: 'var(--amber)' },
              { status: 'done',  label: 'Erledigt',  color: 'var(--green)' },
            ].map((col, ci) => {
              const colTasks = tasks.filter(t => t.status === col.status)
              return (
                <div key={col.status} style={{ borderRight: ci < 2 ? '1px solid var(--border)' : 'none', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.color, flexShrink: 0, ...(col.status === 'doing' && { animation: 'pulse 2s infinite' }) }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.08em' }}>
                      {col.label.toUpperCase()} · {colTasks.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {colTasks.map(task => (
                      <div key={task.id} style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderLeft: `2.5px solid ${col.color}`, borderRadius: 10, padding: '8px 11px' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.4 }}>{task.title}</p>
                        {col.status === 'doing' && (
                          <p style={{ fontSize: 10, color: 'var(--amber-dark)', margin: '4px 0 0', fontWeight: 700 }}>Wird umgesetzt…</p>
                        )}
                        {col.status === 'done' && (
                          <p style={{ fontSize: 10, color: 'var(--green-dark)', margin: '4px 0 0', fontWeight: 700 }}>✓ Abgeschlossen</p>
                        )}
                      </div>
                    ))}
                    {colTasks.length === 0 && (
                      <div style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Leer</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Task request input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Task anfragen oder Hinweis geben…"
              style={{ flex: 1, padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
            />
            <button onClick={addTask} disabled={!newTask.trim()} style={{ padding: '9px 14px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: newTask.trim() ? 'pointer' : 'default', opacity: newTask.trim() ? 1 : .4, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              + Anfragen
            </button>
          </div>
        </div>

        {/* RIGHT: Chat */}
        <ChatPanel />
      </div>
    </div>
  )

  /* ══════════════════════════════════════════
     ██  DEV / ADMIN VIEW
  ══════════════════════════════════════════ */
  return (
    <div className="page-content animate-fade-up" style={{ maxWidth: 1160 }}>
      <style>{CSS}</style>

      {/* Breadcrumb */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)' }}>Dashboard</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>{project.title}</span>
      </p>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.title}</h1>
          {project.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{project.description}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Phase dots */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {PHASES.map((phase, i) => (
              <button key={phase} onClick={() => updatePhase(phase)} title={PHASE_LABEL[phase]} style={{ width: 9, height: 9, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: i <= phaseIdx ? 'var(--text)' : 'var(--border)', transition: 'background .2s' }} />
            ))}
          </div>
          <span style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: project.status === 'active' ? 'var(--green-dark)' : project.status === 'done' ? 'var(--text-muted)' : 'var(--amber-dark)', background: project.status === 'active' ? 'var(--green-bg)' : project.status === 'done' ? 'var(--surface-2)' : 'var(--amber-bg)', border: `1px solid ${project.status === 'active' ? 'var(--green-border)' : 'var(--border)'}`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {project.status === 'active' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />}
            {PHASE_LABEL[project.status] ?? project.status}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Gesamtfortschritt</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{phasePct}%</span>
        </div>
        <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${phasePct}%`, background: 'var(--text)', borderRadius: 4, transition: 'width .6s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Offen',    count: todoTasks,  color: 'var(--text-muted)' },
            { label: 'Aktiv',    count: doingTasks, color: 'var(--amber)' },
            { label: 'Erledigt', count: doneTasks,  color: 'var(--green)' },
          ].map(s => (
            <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
              {s.label}: <strong style={{ color: 'var(--text)' }}>{s.count}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* 2-col grid */}
      <div className="proj-grid">

        {/* LEFT: Full editable kanban */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
          {/* Add task */}
          <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Task hinzufügen…"
              style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, outline: 'none', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit' }}
            />
            <button onClick={addTask} disabled={!newTask.trim()} style={{ padding: '9px 16px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: newTask.trim() ? 'pointer' : 'default', opacity: newTask.trim() ? 1 : .4, fontFamily: 'inherit' }}>
              + Hinzufügen
            </button>
          </div>

          {/* Kanban */}
          <div className="task-col-grid">
            {[
              { status: 'todo',  label: 'To Do',       color: 'var(--text-muted)' },
              { status: 'doing', label: 'In Progress',  color: 'var(--amber)' },
              { status: 'done',  label: 'Done',         color: 'var(--green)' },
            ].map((col, ci) => {
              const colTasks = tasks.filter(t => t.status === col.status)
              return (
                <div key={col.status} style={{ borderRight: ci < 2 ? '1px solid var(--border)' : 'none', padding: 14, minHeight: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, ...(col.status === 'doing' && { animation: 'pulse 2s infinite' }) }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.07em' }}>
                      {col.label.toUpperCase()} · {colTasks.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {colTasks.map(task => (
                      <div key={task.id} className="task-card" style={{ borderLeft: `2.5px solid ${col.color}` }}>
                        <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.4 }}>{task.title}</p>
                        {task.priority === 'critical' && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--red)', background: 'var(--red-bg)', padding: '1px 6px', borderRadius: 4, letterSpacing: '.05em', display: 'inline-block', marginBottom: 6 }}>KRITISCH</span>
                        )}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {col.status !== 'doing' && (
                            <button className="move-btn" onClick={() => updateTask(task.id, 'doing')}>→ In Progress</button>
                          )}
                          {col.status !== 'done' && (
                            <button className="move-btn" onClick={() => updateTask(task.id, 'done')}>✓ Done</button>
                          )}
                          {col.status !== 'todo' && (
                            <button className="move-btn" onClick={() => updateTask(task.id, 'todo')}>← Todo</button>
                          )}
                          <button className="del-btn" onClick={() => deleteTask(task.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                    {colTasks.length === 0 && (
                      <div style={{ border: '1px dashed var(--border)', borderRadius: 10, padding: '12px 8px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>Leer</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: AI Reports + Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Tab switcher */}
          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 12, padding: 3, gap: 2 }}>
            {([
              { key: 'messages', label: 'Team Chat' },
              { key: 'reports',  label: `Berichte (${aiUpdates.length})` },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setRightTab(tab.key)} className={`tab-btn${rightTab === tab.key ? ' active' : ''}`} style={{ flex: 1 }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chat */}
          {rightTab === 'messages' && <ChatPanel />}

          {/* AI Reports */}
          {rightTab === 'reports' && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', flex: 1 }}>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Tagro AI Berichte</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>Automatische Statusberichte</p>
                </div>
                <button onClick={generateAIUpdate} disabled={generatingAI} style={{ padding: '7px 13px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: generatingAI ? 'default' : 'pointer', opacity: generatingAI ? .5 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {generatingAI
                    ? <><span style={{ width: 11, height: 11, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Erstellt…</>
                    : '+ Bericht erstellen'
                  }
                </button>
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 440, overflowY: 'auto' }}>
                {aiUpdates.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Noch keine Berichte</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Klick „+ Bericht erstellen"</p>
                  </div>
                ) : aiUpdates.map(u => (
                  <div key={u.id} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.07em' }}>TAGRO · BERICHT</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString('de', { day: '2-digit', month: 'short' })} · {new Date(u.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{u.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
