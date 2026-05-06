'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ChatMarkdown from '@/components/ChatMarkdown'
import { projectColor } from '@/components/Sidebar'
import { effectiveRole, isDevOrAdmin } from '@/lib/role'
import MilestoneChart, { Milestone } from '@/components/MilestoneChart'
import ProjectCompletionCelebration from '@/components/ProjectCompletionCelebration'
import DevTimer from '@/components/DevTimer'
import DeleteProjectModal from '@/components/DeleteProjectModal'

type Project = { id: string; title: string; description: string|null; status: string }
type Task = { id: string; title: string; status: string; priority?: string }
type Msg = { id: string; message: string; created_at: string; sender_id: string; is_ai?: boolean }

const PHASES = ['intake','planning','active','testing','done']
const PHASE_LABEL: Record<string,string> = { intake:'Intake', planning:'Planning', active:'Development', testing:'Testing', done:'Delivered' }
const PHASE_COLOR: Record<string,string> = { intake:'var(--text-muted)', planning:'#f59e0b', active:'#22c55e', testing:'#0ea5e9', done:'var(--border-strong)' }
const PRIORITY_COLOR: Record<string,string> = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#22c55e' }

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [aiUpdates, setAiUpdates] = useState<any[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [celebrationOpen, setCelebrationOpen] = useState(false)
  const [prevStatus, setPrevStatus] = useState<string|null>(null)
  const [newMsg, setNewMsg] = useState('')
  const [newTask, setNewTask] = useState('')
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState<'client'|'dev'|'admin'|''>('')
  const [activeLeft, setActiveLeft] = useState<'tasks'|'updates'>('tasks')
  const [aiThinking, setAiThinking] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [online, setOnline] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // canEdit = Devs/Admins: dürfen Status setzen, alles löschen, Phase ändern, kein Limit
  // Clients: dürfen Tasks NUR in "todo" anlegen und löschen — max 20 pro Woche
  // Hinweis: Frontend-Gating; für echten Schutz Supabase RLS zusätzlich konfigurieren.
  // Effective role: respects 'festag_view_as' localStorage so admin can test as client.
  const eff = effectiveRole(userRole || null)
  const canEdit = isDevOrAdmin(userRole || null)

  const TASK_WEEK_LIMIT = 20
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const logKey = userId ? `task_create_log_${userId}` : ''

  function getRecentCreations(): number[] {
    if (typeof window === 'undefined' || !logKey) return []
    try {
      const raw = window.localStorage.getItem(logKey)
      if (!raw) return []
      const arr: number[] = JSON.parse(raw)
      const cutoff = Date.now() - WEEK_MS
      const fresh = arr.filter(t => t > cutoff)
      if (fresh.length !== arr.length) window.localStorage.setItem(logKey, JSON.stringify(fresh))
      return fresh
    } catch { return [] }
  }

  function recordCreation() {
    if (typeof window === 'undefined' || !logKey) return
    const recent = getRecentCreations()
    recent.push(Date.now())
    window.localStorage.setItem(logKey, JSON.stringify(recent))
  }

  const [clientUsage, setClientUsage] = useState(0)
  useEffect(() => {
    if (eff === 'client') setClientUsage(getRecentCreations().length)
  }, [userRole, userId])
  const clientRemaining = Math.max(0, TASK_WEEK_LIMIT - clientUsage)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      setUserId(uid)
      setUserEmail(data.session.user.email ?? '')
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', uid).single()
      const role = (prof as any)?.role
      if (role === 'admin' || role === 'dev' || role === 'client') setUserRole(role)
      loadAll()
    })

    // Realtime
    const channel = supabase
      .channel(`proj-${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${id}`
      }, (payload) => {
        setMessages(prev => [...prev.filter(m => !m.id.startsWith('tmp-')), payload.new as Msg])
        setAiThinking(false)
      })
      .subscribe(status => setOnline(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [id])

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, aiThinking])

  async function loadAll() {
    const [{ data: proj }, { data: t }, { data: m }, { data: ai }, { data: ms }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*').eq('project_id', id).order('created_at'),
      supabase.from('messages').select('*').eq('project_id', id).order('created_at'),
      supabase.from('ai_updates').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('milestones').select('*').eq('project_id', id).order('order_index', { ascending: true }),
    ])
    if (proj) setProject(proj)
    setTasks((t as any[]) ?? [])
    setMessages((m as any[]) ?? [])
    setAiUpdates((ai as any[]) ?? [])
    // If no milestones table or empty: synthesize a default 4-milestone plan from project budget
    const mlist = (ms as any[]) ?? []
    if (mlist.length > 0) setMilestones(mlist as Milestone[])
    else {
      const budget = (proj as any)?.budget ?? 4000
      setMilestones([
        { id:'m1', title:'Projektstart & Discovery',  amount: Math.round(budget*0.25), status:'paid',    description:'Onboarding, Scope, Architektur' },
        { id:'m2', title:'MVP Build',                 amount: Math.round(budget*0.35), status:'pending', description:'Erste lauffähige Version' },
        { id:'m3', title:'Beta & Testing',            amount: Math.round(budget*0.25), status:'locked',  description:'QA, Bugfixes, Beta-Release' },
        { id:'m4', title:'Launch & Übergabe',         amount: Math.round(budget*0.15), status:'locked',  description:'Go-Live + Garantie startet' },
      ])
    }
  }

  async function payMilestone(m: Milestone) {
    if (!project) return
    try {
      const res = await fetch('/api/payments/mollie', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ amount: m.amount, description: `${project.title} — ${m.title}`, metadata: { projectId: project.id, milestoneId: m.id } }),
      })
      const d = await res.json()
      if (d.checkoutUrl) window.location.href = d.checkoutUrl
      else alert(d.error ?? 'Zahlung konnte nicht gestartet werden.')
    } catch { alert('Verbindungsfehler.') }
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
            max_tokens: 200,
            system: `Du bist Tagro, AI-System von Festag. Antworte klar, max 2 Sätze. Kein Smalltalk. Projekt: "${project?.title || 'Unbekannt'}"`,
            messages: [{ role: 'user', content: msg }],
          }),
        })
        const data = await res.json()
        const aiMsg = data.content?.[0]?.text
        if (aiMsg) await supabase.from('messages').insert({ project_id: id, sender_id: userId, message: aiMsg, is_ai: true })
        else setAiThinking(false)
      } catch { setAiThinking(false) }
    }, 900)
  }

  async function addTask() {
    if (!newTask.trim()) return
    if (eff === 'client') {
      const recent = getRecentCreations()
      if (recent.length >= TASK_WEEK_LIMIT) {
        alert(`Wochenlimit erreicht: max ${TASK_WEEK_LIMIT} neue Tasks pro 7 Tage.\nDas Limit setzt sich automatisch zurück, sobald ältere Einträge mehr als 7 Tage alt sind.`)
        return
      }
    }
    const { data, error } = await supabase.from('tasks').insert({ project_id: id, title: newTask.trim(), status: 'todo' }).select().single()
    if (error) { alert(`Konnte Task nicht anlegen: ${error.message}`); return }
    if (data) {
      setTasks(prev => [...prev, data])
      if (eff === 'client') {
        recordCreation()
        setClientUsage(getRecentCreations().length)
      }
    }
    setNewTask('')
  }

  async function updateTask(taskId: string, status: string) {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t))
  }

  async function deleteTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    if (!canEdit && task.status !== 'todo') {
      alert('Nur Tasks in der Spalte "To Do" können gelöscht werden.')
      return
    }
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  async function updateStatus(status: string) {
    await supabase.from('projects').update({ status }).eq('id', id)
    setProject(p => p ? { ...p, status } : p)
    // Trigger celebration when transitioning to 'done' (and previous wasn't 'done')
    if (status === 'done' && project && project.status !== 'done') {
      // Mark celebration shown so we don't re-show on every refresh
      const seenKey = `pcc_seen_${id}`
      if (typeof window !== 'undefined' && !window.localStorage.getItem(seenKey)) {
        setCelebrationOpen(true)
        window.localStorage.setItem(seenKey, '1')
      }
    }
  }

  // If project was already 'done' on first load and we haven't celebrated yet, show once
  useEffect(() => {
    if (!project) return
    if (prevStatus === null) { setPrevStatus(project.status); return }
    if (project.status === 'done' && prevStatus !== 'done') {
      const seenKey = `pcc_seen_${id}`
      if (typeof window !== 'undefined' && !window.localStorage.getItem(seenKey)) {
        setCelebrationOpen(true)
        window.localStorage.setItem(seenKey, '1')
      }
    }
    setPrevStatus(project.status)
  }, [project?.status])

  async function generateAIUpdate() {
    if (!project) return
    setGeneratingAI(true)
    const done = tasks.filter(t => t.status === 'done').length
    const doing = tasks.filter(t => t.status === 'doing').length
    const todo = tasks.filter(t => t.status === 'todo').length
    const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0

    const taskOverview = tasks.length
      ? `\nTasks im Detail:\n${tasks.slice(0, 20).map(t => `- [${t.status}] ${t.title}`).join('\n')}`
      : ''

    const userPrompt =
      `Projekt: "${project.title}"\n` +
      (project.description ? `Beschreibung: ${project.description}\n` : '') +
      `Phase: ${PHASE_LABEL[project.status]}\n` +
      `Fortschritt: ${pct}% (${done} erledigt, ${doing} aktiv, ${todo} offen)` +
      taskOverview +
      `\n\nErstelle jetzt einen professionellen Statusbericht.`

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 500,
          system: `Du bist Tagro, der AI-Projektmanager von Festag. Erstelle einen professionellen Statusbericht auf Deutsch.
Struktur (nutze Markdown):
**Erledigt:** Was wurde abgeschlossen
**In Arbeit:** Was läuft gerade
**Nächste Schritte:** Was kommt als Nächstes
**Risiken:** Falls erkennbar — sonst weglassen

Regeln: Keine Emojis. Knapp und konkret. Beziehe dich auf konkrete Tasks wenn möglich.`,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      const data = await res.json()
      if (data?.error) {
        alert(`Bericht konnte nicht erstellt werden: ${data.error}`)
        setGeneratingAI(false)
        return
      }
      const content = data.content?.[0]?.text
      if (!content) {
        alert('Tagro hat keinen Inhalt zurückgegeben. Bitte erneut versuchen.')
        setGeneratingAI(false)
        return
      }
      const { data: inserted, error } = await supabase.from('ai_updates').insert({ project_id: id, content, type: 'daily_summary' }).select().single()
      if (error) { alert(`Speicherfehler: ${error.message}`); setGeneratingAI(false); return }
      if (inserted) setAiUpdates(prev => [inserted, ...prev])
    } catch (e: any) {
      alert(`Fehler: ${e?.message ?? 'Verbindungsproblem'}`)
    }
    setGeneratingAI(false)
  }

  if (!project) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0
  const phaseIdx = PHASES.indexOf(project.status)
  const pCol = projectColor(project.id, (project as any).color)
  const phaseCol = PHASE_COLOR[project.status] ?? pCol

  const todoTasks  = tasks.filter(t => t.status === 'todo')
  const doingTasks = tasks.filter(t => t.status === 'doing')
  const doneTasks  = tasks.filter(t => t.status === 'done')

  return (
    <div className="page-content animate-fade-up" style={{ maxWidth: 1160 }}>
      <style>{`
        @keyframes spin  { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .task-row { display:flex; align-items:center; gap:10px; padding:8px 14px; border-bottom:1px solid var(--border); transition:background .08s; cursor:default; }
        .task-row:last-child { border-bottom:none; }
        .task-row:hover { background:var(--surface-2); }
        .tab-btn { background:transparent; border:none; padding:8px 0; font-family:inherit; font-size:13px; font-weight:500; cursor:pointer; color:var(--text-muted); position:relative; transition:color .12s; }
        .tab-btn.active { color:var(--text); font-weight:600; }
        .tab-btn.active::after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--text); border-radius:1px; }
        .ms-row { display:flex; align-items:center; gap:14px; padding:10px 0; border-bottom:1px solid var(--border); }
        .ms-row:last-child { border-bottom:none; }
        .ghost-sm { background:transparent; border:1px solid var(--border); color:var(--text-secondary); border-radius:6px; padding:4px 10px; font-size:11px; font-weight:500; cursor:pointer; font-family:inherit; transition:border-color .1s, color .1s; }
        .ghost-sm:hover { border-color:var(--border-strong); color:var(--text); }
      `}</style>

      <ProjectCompletionCelebration
        open={celebrationOpen}
        projectTitle={project.title}
        deliveryDate={new Date().toISOString()}
        onClose={() => setCelebrationOpen(false)}
        onContinue={() => { setCelebrationOpen(false); setActiveLeft('updates'); generateAIUpdate() }}
      />
      <DevTimer projectId={project.id} projectTitle={project.title}/>

      <DeleteProjectModal
        open={deleteOpen}
        projectId={project.id}
        projectTitle={project.title}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => { setDeleteOpen(false); window.location.href = '/dashboard' }}
      />

      {/* Breadcrumb */}
      <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>
        <Link href="/dashboard" style={{ color:'var(--text-muted)', textDecoration:'none' }}>Dashboard</Link>
        <span style={{ margin:'0 6px', opacity:.4 }}>/</span>
        <span>{project.title}</span>
      </p>

      {/* ── Header ── */}
      <div style={{ marginBottom:32 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            <span style={{ width:10, height:10, borderRadius:'50%', background:pCol, flexShrink:0 }}/>
            <h1 style={{ margin:0, fontSize:22, fontWeight:600, letterSpacing:'-.4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{project.title}</h1>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            {/* Phase stepper */}
            <div style={{ display:'flex', gap:3, alignItems:'center', padding:'4px 0' }}
              title={canEdit ? 'Phase ändern' : 'Phase wird vom Entwicklerteam gesteuert'}>
              {PHASES.map((phase, i) => {
                const isActive = i === phaseIdx
                const isPast   = i < phaseIdx
                return canEdit ? (
                  <button key={phase} onClick={() => updateStatus(phase)} title={PHASE_LABEL[phase]}
                    style={{ width:isActive?20:6, height:6, borderRadius:3, border:'none', cursor:'pointer', padding:0, transition:'all .2s',
                      background: isPast||isActive ? pCol : 'var(--border)' }}/>
                ) : (
                  <span key={phase} title={PHASE_LABEL[phase]}
                    style={{ width:isActive?20:6, height:6, borderRadius:3, display:'block', transition:'all .2s',
                      background: isPast||isActive ? pCol : 'var(--border)' }}/>
                )
              })}
            </div>
            <span style={{ padding:'4px 9px', borderRadius:6, fontSize:11, fontWeight:600,
              color: project.status==='active' ? '#16a34a' : project.status==='done' ? 'var(--text-muted)' : 'var(--text-secondary)',
              border:'1px solid var(--border)',
              display:'inline-flex', alignItems:'center', gap:5 }}>
              {project.status==='active' && <span style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite', flexShrink:0 }}/>}
              {PHASE_LABEL[project.status] ?? project.status}
            </span>
            {/* Subtiler Delete-Trigger — Sicherheits-Logik im Modal */}
            <button
              onClick={() => setDeleteOpen(true)}
              title="Projekt löschen"
              aria-label="Projekt löschen"
              style={{
                width:26, height:26, borderRadius:7,
                border:'1px solid var(--border)', background:'transparent',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--text-muted)', cursor:'pointer',
                transition:'color .12s, border-color .12s, background .12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red,#D14343)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,70,70,.35)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>
              </svg>
            </button>
          </div>
        </div>

        {project.description && (
          <p style={{ fontSize:13.5, color:'var(--text-muted)', margin:'0 0 16px', lineHeight:1.6, maxWidth:640 }}>{project.description}</p>
        )}

        {/* Progress + stats inline */}
        <div style={{ display:'flex', alignItems:'center', gap:18, borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'12px 0' }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1, height:3, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:pCol, transition:'width .6s ease' }}/>
            </div>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', flexShrink:0 }}>{pct}%</span>
          </div>
          <div style={{ display:'flex', gap:14, flexShrink:0 }}>
            {[
              { label:'Todo',    count: todoTasks.length,  dot:'var(--border-strong)' },
              { label:'Aktiv',   count: doingTasks.length, dot:'#f59e0b' },
              { label:'Fertig',  count: doneTasks.length,  dot:'#22c55e' },
            ].map(s => (
              <span key={s.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot }}/>
                <span style={{ color:'var(--text)', fontWeight:600 }}>{s.count}</span> {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Milestones ── compact list */}
      {milestones.length > 0 && (
        <div style={{ marginBottom:32 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <h3 style={{ margin:0, fontSize:13, fontWeight:600, color:'var(--text)' }}>Meilensteine & Zahlungen</h3>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>Mollie · SEPA · DSGVO</span>
          </div>
          <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
            {milestones.map((ms, i) => {
              const isPaid    = ms.status === 'paid'
              const isPending = ms.status === 'pending'
              const isLocked  = ms.status === 'locked'
              return (
                <div key={ms.id} className="ms-row" style={{ padding:'12px 16px', borderBottom: i < milestones.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', flexShrink:0,
                    background: isPaid ? '#22c55e' : isPending ? '#f59e0b' : 'var(--border-strong)' }}/>
                  <span style={{ flex:1, fontSize:13, fontWeight:500, color: isLocked ? 'var(--text-muted)' : 'var(--text)' }}>{ms.title}</span>
                  {ms.description && <span style={{ fontSize:11.5, color:'var(--text-muted)', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ms.description}</span>}
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text)', flexShrink:0, minWidth:60, textAlign:'right' }}>€{ms.amount.toLocaleString('de')}</span>
                  <span style={{ fontSize:10, fontWeight:600, flexShrink:0, padding:'2px 8px', borderRadius:5, letterSpacing:'.04em',
                    color: isPaid ? '#16a34a' : isPending ? '#d97706' : 'var(--text-muted)',
                    background: isPaid ? 'rgba(34,197,94,.08)' : isPending ? 'rgba(245,158,11,.08)' : 'transparent',
                    border: `1px solid ${isPaid ? 'rgba(34,197,94,.2)' : isPending ? 'rgba(245,158,11,.2)' : 'var(--border)'}`,
                  }}>
                    {isPaid ? 'Bezahlt' : isPending ? 'Fällig' : 'Gesperrt'}
                  </span>
                  {isPending && !canEdit && (
                    <button onClick={() => payMilestone(ms)} style={{ height:26, padding:'0 12px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                      Freischalten →
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Main 2-col ── */}
      <div className="grid-cols-2-mobile-1" style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:32 }}>

        {/* LEFT */}
        <div>
          {/* Tab bar */}
          <div style={{ display:'flex', gap:20, borderBottom:'1px solid var(--border)', marginBottom:20 }}>
            {([
              { key:'tasks',   label:`Tasks (${tasks.length})` },
              { key:'updates', label:'AI Statusbericht' },
            ] as const).map(tab => (
              <button key={tab.key} className={`tab-btn ${activeLeft===tab.key?'active':''}`} onClick={() => setActiveLeft(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* TASKS */}
          {activeLeft === 'tasks' && (
            <div>
              {/* Add task */}
              <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                <input
                  value={newTask} onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  placeholder={eff==='client' && clientRemaining===0 ? 'Wochenlimit erreicht' : 'Task hinzufügen…'}
                  disabled={eff==='client' && clientRemaining===0}
                  style={{ flex:1, padding:'8px 12px', border:'1px solid var(--border)', borderRadius:7, fontSize:13, outline:'none', background:'transparent', color:'var(--text)', opacity: eff==='client' && clientRemaining===0 ? 0.5 : 1 }}
                />
                <button onClick={addTask} disabled={!newTask.trim() || (eff==='client' && clientRemaining===0)}
                  style={{ height:34, padding:'0 14px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', opacity: !newTask.trim() ? .4 : 1 }}>
                  Hinzufügen
                </button>
              </div>
              {eff==='client' && (
                <p style={{ fontSize:11, color:'var(--text-muted)', margin:'-12px 0 16px', display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background: clientRemaining>5?'#22c55e':clientRemaining>0?'#f59e0b':'#ef4444' }}/>
                  {clientRemaining} von {TASK_WEEK_LIMIT} Tasks diese Woche übrig
                </p>
              )}

              {/* Grouped task list */}
              {[
                { status:'doing', label:'In Progress', dot:'#f59e0b',           list: doingTasks },
                { status:'todo',  label:'To Do',       dot:'var(--border-strong)', list: todoTasks  },
                { status:'done',  label:'Done',        dot:'#22c55e',           list: doneTasks  },
              ].map(group => group.list.length === 0 ? null : (
                <div key={group.status} style={{ marginBottom:24 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:group.dot }}/>
                    <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em' }}>{group.label}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)', opacity:.6 }}>{group.list.length}</span>
                  </div>
                  <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
                    {group.list.map(task => {
                      const showDelete = canEdit || (eff==='client' && task.status==='todo')
                      const priColor = task.priority ? PRIORITY_COLOR[task.priority] : null
                      return (
                        <div key={task.id} className="task-row">
                          <span style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background: group.dot }}/>
                          <span style={{ flex:1, fontSize:13, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task.title}</span>
                          {priColor && (
                            <span style={{ fontSize:10, fontWeight:600, color:priColor, flexShrink:0 }}>
                              {task.priority?.toUpperCase()}
                            </span>
                          )}
                          {canEdit && (
                            <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                              {['todo','doing','done'].filter(s => s !== task.status).map(s => (
                                <button key={s} onClick={() => updateTask(task.id, s)} className="ghost-sm">
                                  {{ todo:'Todo', doing:'Aktiv', done:'Fertig' }[s]}
                                </button>
                              ))}
                            </div>
                          )}
                          {showDelete && (
                            <button onClick={() => deleteTask(task.id)}
                              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'2px 4px', fontSize:12, opacity:.5, transition:'opacity .1s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity='1'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity='.5'}>
                              ✕
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <p style={{ fontSize:13, color:'var(--text-muted)', padding:'24px 0' }}>Noch keine Tasks angelegt.</p>
              )}
            </div>
          )}

          {/* AI UPDATES */}
          {activeLeft === 'updates' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <p style={{ margin:0, fontSize:13, color:'var(--text-muted)' }}>AI-generierte Zusammenfassungen des Projektstands</p>
                <button onClick={generateAIUpdate} disabled={generatingAI}
                  style={{ height:30, padding:'0 12px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:7, fontSize:11.5, fontWeight:600, cursor:'pointer', opacity:generatingAI?.5:1, display:'flex', alignItems:'center', gap:6 }}>
                  {generatingAI ? <><span style={{ width:10, height:10, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>Generiert…</> : '+ Bericht erstellen'}
                </button>
              </div>
              {aiUpdates.length === 0 ? (
                <p style={{ fontSize:13, color:'var(--text-muted)', padding:'24px 0' }}>Noch keine Berichte erstellt.</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  {aiUpdates.map(u => (
                    <div key={u.id}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                        <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em' }}>TAGRO AI</span>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                          {new Date(u.created_at).toLocaleDateString('de',{day:'2-digit',month:'short'})} · {new Date(u.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}
                        </span>
                      </div>
                      <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, fontSize:13.5, color:'var(--text)', lineHeight:1.7 }}>
                        <ChatMarkdown text={u.content} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Chat */}
        <div>
          <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column', height:520 }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:0 }}>Tagro AI</p>
                <p style={{ fontSize:11, color:'var(--text-muted)', margin:'1px 0 0' }}>Projektkommunikation</p>
              </div>
              <span style={{ fontSize:10, fontWeight:600, color: online?'#16a34a':'var(--text-muted)', display:'inline-flex', alignItems:'center', gap:4 }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:online?'#22c55e':'var(--border-strong)', animation:online?'pulse 1.5s infinite':'none' }}/>
                {online ? 'Live' : 'Offline'}
              </span>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:14 }}>
              {messages.length === 0 && !aiThinking && (
                <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0, paddingTop:8 }}>Starte eine Konversation mit Tagro…</p>
              )}
              {messages.map(m => {
                const isAI = m.is_ai
                return (
                  <div key={m.id} style={{ display:'flex', gap:9 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:isAI?'var(--text)':'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:isAI?'var(--bg)':'var(--text-secondary)', fontWeight:700, flexShrink:0 }}>
                      {isAI ? 'T' : (userEmail.charAt(0)||'U').toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', gap:6, alignItems:'baseline', marginBottom:2 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{isAI?'Tagro':'Du'}</span>
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>{new Date(m.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      <p style={{ fontSize:13, color:'var(--text-secondary)', margin:0, lineHeight:1.55 }}>{m.message}</p>
                    </div>
                  </div>
                )
              })}
              {aiThinking && (
                <div style={{ display:'flex', gap:9 }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--text)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'var(--bg)', fontWeight:700, flexShrink:0 }}>T</div>
                  <div style={{ paddingTop:8, display:'flex', gap:4 }}>
                    {[0,1,2].map(i => <span key={i} style={{ width:4, height:4, borderRadius:'50%', background:'var(--text-muted)', animation:`pulse 1s ${i*0.2}s infinite` }}/>)}
                  </div>
                </div>
              )}
              <div ref={msgEndRef}/>
            </div>

            <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:7 }}>
              <input
                value={newMsg} onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
                placeholder="Nachricht…"
                style={{ flex:1, background:'transparent', border:'1px solid var(--border)', borderRadius:7, padding:'7px 12px', fontSize:13, outline:'none', color:'var(--text)' }}
              />
              <button onClick={sendMessage} disabled={!newMsg.trim()}
                style={{ width:30, height:30, borderRadius:7, border:'none', flexShrink:0, background:newMsg.trim()?'var(--text)':'var(--border)', color:newMsg.trim()?'var(--bg)':'var(--text-muted)', cursor:newMsg.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
              </button>
            </div>
          </div>

          {/* Garantie */}
          <div style={{ marginTop:24 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em', margin:'0 0 10px' }}>FESTAG GARANTIE</p>
            {[
              { label:'AI Check',             done: pct>30 },
              { label:'Project Owner Review', done: pct>70 },
              { label:'Controlled Release',   done: project.status==='done' },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i<arr.length-1?'1px solid var(--border)':'none' }}>
                <span style={{ fontSize:12.5, color:'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize:10, fontWeight:600, color:item.done?'#16a34a':'var(--text-muted)', letterSpacing:'.04em' }}>
                  {item.done ? '✓ PASSED' : 'PENDING'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
