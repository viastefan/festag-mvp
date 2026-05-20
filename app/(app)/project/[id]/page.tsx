'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ChatMarkdown from '@/components/ChatMarkdown'
import { projectColor } from '@/components/Sidebar'
import { effectiveRole, isDevOrAdmin } from '@/lib/role'
import { taskStatusPatch } from '@/lib/tasks/status'
import { Milestone } from '@/components/MilestoneChart'
import ProjectCompletionCelebration from '@/components/ProjectCompletionCelebration'
import DevTimer from '@/components/DevTimer'
import DeleteProjectModal from '@/components/DeleteProjectModal'
import AudioBriefingButton from '@/components/AudioBriefingButton'
import AssetsPanel from '@/components/AssetsPanel'
import ProjectModulesStrip from '@/components/ProjectModulesStrip'
import ExecutorModulesStrip from '@/components/ExecutorModulesStrip'
import { getProjectPreset, type ExecutorRole, type ProjectType } from '@/lib/project-modules'

type Project = { id: string; title: string; description: string|null; status: string; project_type?: ProjectType | null }
type Task = { id: string; title: string; status: string; priority?: string }
type Msg = { id: string; message: string; created_at: string; sender_id: string; is_ai?: boolean }

const PHASES = ['intake','planning','active','testing','done']
const PHASE_LABEL: Record<string,string> = { intake:'Intake', planning:'Planung', active:'In Arbeit', testing:'Testing', done:'Abgeschlossen' }
const PRIORITY_COLOR: Record<string,string> = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#22c55e' }

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
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
  const searchParams = useSearchParams()
  const initialTab = (searchParams?.get('tab') as 'tasks' | 'assets' | 'updates' | null)
  const [activeLeft, setActiveLeft] = useState<'tasks'|'assets'|'updates'>(
    initialTab === 'assets' || initialTab === 'updates' ? initialTab : 'tasks'
  )
  const [aiThinking, setAiThinking] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [online, setOnline] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [myExecutorRole, setMyExecutorRole] = useState<ExecutorRole | null>(null)
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
      // Per-project executor role (best-effort; falls back to 'developer' for devs/admins)
      try {
        const { data: pm } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', id)
          .eq('user_id', uid)
          .maybeSingle()
        const pmRole = (pm as any)?.role as ExecutorRole | undefined
        if (pmRole) setMyExecutorRole(pmRole)
      } catch { /* table may not exist yet */ }
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
            userId,
            projectId: id,
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
    const current = tasks.find((task) => task.id === taskId) as any
    await supabase.from('tasks').update(taskStatusPatch(status, current?.completed_at)).eq('id', taskId)
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
          userId,
          projectId: id,
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

  const todoTasks  = tasks.filter(t => t.status === 'todo')
  const doingTasks = tasks.filter(t => t.status === 'doing')
  const doneTasks  = tasks.filter(t => t.status === 'done')

  const projectType = (project as any).project_type as ProjectType | null | undefined
  const typePreset  = getProjectPreset(projectType ?? null)

  // Derived KPI values for the type-strip. Only the cross-cutting + a
  // few task-driven ones — everything else stays "—" until real data
  // sources (Vercel, GSC, Meta Ads, …) are wired in Phase 3.
  const nextMilestone = milestones.find(m => m.status === 'pending') ?? milestones.find(m => m.status === 'locked')
  const stripValues = {
    progress_pct:        tasks.length ? `${pct}%` : null,
    features_done:       doneTasks.length || null,
    features_open:       (todoTasks.length + doingTasks.length) || null,
    bugs_open:           tasks.filter(t => /bug|fehler/i.test(t.title)).length || null,
    pages_ready:         doneTasks.length || null,
    milestone_amount:    nextMilestone ? `€${nextMilestone.amount.toLocaleString('de')}` : null,
    next_milestone_eta:  nextMilestone?.title ?? null,
    open_decisions:      tasks.filter(t => t.status === 'waiting').length || null,
    open_blockers:       tasks.filter(t => ['blocked','waiting'].includes(t.status)).length || null,
  } as const

  return (
    <div className="pv">
      <style>{`
        @keyframes spin  { to { transform:rotate(360deg); } }
        @keyframes pvPulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        @keyframes pvFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }

        .pv {
          --pv-muted:#5A6478;
          --pv-soft:#4E5567;
          --pv-slate:#5B647D;
          max-width:1080px;
          color:var(--text);
          padding:0 clamp(16px,2vw,28px) 72px;
          animation:pvFade .3s cubic-bezier(.16,1,.3,1) both;
        }
        [data-theme="dark"] .pv, [data-theme="classic-dark"] .pv {
          --pv-muted:#8D98A6; --pv-soft:#B7BDC8;
        }
        .pv * { font-weight:500; letter-spacing:.012em; }

        /* breadcrumb */
        .pv-crumb { margin:0 0 18px; font-size:12px; color:var(--pv-muted); }
        .pv-crumb a { color:var(--pv-muted); text-decoration:none; }
        .pv-crumb a:hover { color:var(--text); }
        .pv-crumb .sep { margin:0 7px; opacity:.45; }

        /* header */
        .pv-head { margin-bottom:26px; }
        .pv-head-top {
          display:flex; align-items:flex-start; justify-content:space-between;
          gap:16px; margin-bottom:14px;
        }
        .pv-title-row { display:flex; align-items:center; gap:11px; min-width:0; }
        .pv-dot { width:11px; height:11px; border-radius:50%; flex-shrink:0; box-sizing:border-box; }
        .pv-title {
          margin:0; font-size:21px; font-weight:500; letter-spacing:-.014em;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .pv-type {
          flex-shrink:0; font-size:10px; font-weight:400; letter-spacing:.06em;
          text-transform:uppercase; color:var(--pv-muted);
          padding:3px 8px; border-radius:6px;
          background:color-mix(in srgb, var(--surface-2) 60%, transparent);
          white-space:nowrap;
        }
        .pv-head-actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .pv-phase { display:flex; gap:3px; align-items:center; padding:4px 0; }
        .pv-phase-seg {
          height:6px; border-radius:3px; border:0; padding:0;
          transition:all .2s ease;
        }
        .pv-status {
          display:inline-flex; align-items:center; gap:6px;
          height:26px; padding:0 11px; border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 62%, transparent);
          color:var(--pv-soft); font-size:11.5px;
        }
        .pv-status-dot { width:6px; height:6px; border-radius:50%; }
        .pv-del {
          width:28px; height:28px; border-radius:8px; border:0;
          background:color-mix(in srgb, var(--surface-2) 56%, transparent);
          color:var(--pv-muted); cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:color .12s ease, background .12s ease;
        }
        .pv-del:hover { color:#d14343; background:rgba(209,67,67,.1); }

        .pv-desc {
          margin:0 0 18px; max-width:660px;
          font-size:13.5px; line-height:1.62; color:var(--pv-soft);
        }

        /* progress — no rules, just a soft bar */
        .pv-progress {
          display:flex; align-items:center; gap:20px; flex-wrap:wrap;
        }
        .pv-bar-wrap { flex:1; min-width:200px; display:flex; align-items:center; gap:11px; }
        .pv-bar {
          flex:1; height:4px; border-radius:999px; overflow:hidden;
          background:color-mix(in srgb, var(--surface-2) 70%, transparent);
        }
        .pv-bar span { display:block; height:100%; transition:width .6s ease; }
        .pv-pct { font-size:12px; color:var(--pv-soft); flex-shrink:0; }
        .pv-stats { display:flex; gap:16px; flex-shrink:0; }
        .pv-stat { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--pv-muted); }
        .pv-stat b { color:var(--text); font-weight:500; }
        .pv-stat .d { width:6px; height:6px; border-radius:50%; box-sizing:border-box; }

        /* generic section */
        .pv-section { margin-top:28px; }
        .pv-section-head {
          display:flex; align-items:center; justify-content:space-between;
          gap:12px; margin-bottom:11px;
        }
        .pv-section-title { margin:0; font-size:13px; font-weight:500; color:var(--text); }
        .pv-section-meta { font-size:11px; color:var(--pv-muted); }

        /* milestones — borderless rows */
        .pv-card {
          border-radius:14px; padding:6px;
          background:var(--surface);
          box-shadow:0 1px 2px rgba(15,23,42,.05), 0 10px 30px rgba(15,23,42,.05);
        }
        [data-theme="dark"] .pv-card, [data-theme="classic-dark"] .pv-card {
          background:color-mix(in srgb, var(--surface) 92%, #fff 8%);
          box-shadow:0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.22);
        }
        .pv-ms-row {
          display:flex; align-items:center; gap:14px;
          padding:11px 12px; border-radius:10px;
          transition:background .12s ease;
        }
        .pv-ms-row:hover { background:color-mix(in srgb, var(--surface-2) 50%, transparent); }
        .pv-ms-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; box-sizing:border-box; }
        .pv-ms-title { font-size:13px; color:var(--text); }
        .pv-ms-title.locked { color:var(--pv-muted); }
        .pv-ms-desc {
          flex:1; min-width:0; font-size:11.5px; color:var(--pv-muted);
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .pv-ms-amount { font-size:13px; color:var(--text); flex-shrink:0; min-width:64px; text-align:right; }
        .pv-chip {
          flex-shrink:0; font-size:10px; font-weight:400; letter-spacing:.04em;
          padding:3px 9px; border-radius:999px;
        }
        .pv-chip.paid    { color:#16a34a; background:rgba(34,197,94,.12); }
        .pv-chip.pending { color:#c2790b; background:rgba(245,158,11,.14); }
        .pv-chip.locked  { color:var(--pv-muted); background:color-mix(in srgb, var(--surface-2) 60%, transparent); }

        /* buttons */
        .pv-btn-primary {
          appearance:none; border:0; cursor:pointer;
          display:inline-flex; align-items:center; justify-content:center; gap:7px;
          height:34px; padding:0 14px; border-radius:9px;
          background:var(--pv-slate); color:#fff;
          font:inherit; font-size:12px;
          box-shadow:0 1px 2px rgba(15,23,42,.12), 0 6px 16px rgba(91,100,125,.22);
          transition:transform .12s ease, box-shadow .12s ease, opacity .12s ease;
        }
        .pv-btn-primary:hover { transform:translateY(-1px); }
        .pv-btn-primary:disabled { opacity:.55; cursor:default; transform:none; }
        .pv-btn-ghost {
          appearance:none; cursor:pointer;
          height:26px; padding:0 10px; border-radius:7px; border:0;
          background:color-mix(in srgb, var(--surface-2) 62%, transparent);
          color:var(--pv-soft); font:inherit; font-size:11px;
          transition:background .12s ease, color .12s ease;
        }
        .pv-btn-ghost:hover { background:color-mix(in srgb, var(--surface-2) 92%, transparent); color:var(--text); }

        /* tabs — pill style, no underline rule */
        .pv-tabs { display:flex; gap:6px; margin-bottom:18px; }
        .pv-tab {
          appearance:none; border:0; cursor:pointer;
          height:30px; padding:0 12px; border-radius:8px;
          background:transparent; color:var(--pv-muted);
          font:inherit; font-size:12.5px;
          transition:background .12s ease, color .12s ease;
        }
        .pv-tab:hover { color:var(--text); }
        .pv-tab.active {
          background:color-mix(in srgb, var(--surface-2) 70%, transparent);
          color:var(--text);
        }

        /* task list — borderless rows */
        .pv-add { display:flex; gap:8px; margin-bottom:14px; }
        .pv-input {
          flex:1; height:36px; padding:0 13px; border:0; border-radius:9px;
          background:color-mix(in srgb, var(--surface-2) 55%, transparent);
          color:var(--text); font:inherit; font-size:13px; outline:none;
        }
        .pv-input::placeholder { color:var(--pv-muted); }
        .pv-input:disabled { opacity:.55; }
        .pv-quota {
          display:flex; align-items:center; gap:6px;
          margin:-4px 0 16px; font-size:11px; color:var(--pv-muted);
        }
        .pv-quota .d { width:5px; height:5px; border-radius:50%; box-sizing:border-box; }
        .pv-task-group { margin-bottom:18px; }
        .pv-task-group-head {
          display:flex; align-items:center; gap:7px; margin:0 0 4px; padding:0 4px;
        }
        .pv-task-group-head .d { width:6px; height:6px; border-radius:50%; box-sizing:border-box; }
        .pv-task-group-head span.l { font-size:11px; color:var(--pv-muted); letter-spacing:.04em; }
        .pv-task-group-head span.c { font-size:11px; color:var(--pv-muted); opacity:.7; }
        .pv-task-row {
          display:flex; align-items:center; gap:10px;
          padding:9px 12px; border-radius:9px; cursor:pointer;
          transition:background .12s ease;
        }
        .pv-task-row:hover { background:color-mix(in srgb, var(--surface-2) 55%, transparent); }
        .pv-task-row .d { width:6px; height:6px; border-radius:50%; flex-shrink:0; box-sizing:border-box; }
        .pv-task-row .t {
          flex:1; font-size:13px; color:var(--text);
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .pv-task-actions { display:flex; gap:4px; flex-shrink:0; }
        .pv-task-del {
          background:none; border:0; cursor:pointer; color:var(--pv-muted);
          padding:2px 4px; font-size:12px; opacity:.5; transition:opacity .1s ease;
        }
        .pv-task-del:hover { opacity:1; }
        .pv-empty { font-size:13px; color:var(--pv-muted); padding:22px 4px; }

        /* updates */
        .pv-update { margin-bottom:18px; }
        .pv-update-head {
          display:flex; justify-content:space-between; align-items:baseline;
          margin-bottom:7px;
        }
        .pv-update-tag { font-size:10.5px; font-weight:400; letter-spacing:.08em; color:var(--pv-muted); text-transform:uppercase; }
        .pv-update-time { font-size:11px; color:var(--pv-muted); }
        .pv-update-body { font-size:13.5px; color:var(--text); line-height:1.7; }

        /* right column */
        .pv-grid { display:grid; grid-template-columns:1fr 332px; gap:30px; margin-top:26px; }
        .pv-chat {
          display:flex; flex-direction:column; height:512px;
          border-radius:14px; overflow:hidden;
          background:var(--surface);
          box-shadow:0 1px 2px rgba(15,23,42,.05), 0 10px 30px rgba(15,23,42,.05);
        }
        [data-theme="dark"] .pv-chat, [data-theme="classic-dark"] .pv-chat {
          background:color-mix(in srgb, var(--surface) 92%, #fff 8%);
          box-shadow:0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.22);
        }
        .pv-chat-head {
          display:flex; align-items:center; justify-content:space-between;
          padding:13px 16px 9px;
        }
        .pv-chat-head .ttl { margin:0; font-size:13px; font-weight:500; color:var(--text); }
        .pv-chat-head .sub { margin:1px 0 0; font-size:11px; color:var(--pv-muted); }
        .pv-chat-live { font-size:10px; display:inline-flex; align-items:center; gap:4px; }
        .pv-chat-body {
          flex:1; overflow-y:auto; padding:8px 16px 14px;
          display:flex; flex-direction:column; gap:14px;
        }
        .pv-msg { display:flex; gap:9px; }
        .pv-msg-av {
          width:24px; height:24px; border-radius:50%; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          font-size:10px; font-weight:500;
        }
        .pv-msg-av.ai { background:var(--pv-slate); color:#fff; }
        .pv-msg-av.me { background:color-mix(in srgb, var(--surface-2) 80%, transparent); color:var(--pv-soft); }
        .pv-msg-name { font-size:12px; font-weight:500; color:var(--text); }
        .pv-msg-time { font-size:10px; color:var(--pv-muted); }
        .pv-msg-text { font-size:13px; color:var(--pv-soft); margin:2px 0 0; line-height:1.55; }
        .pv-chat-foot { display:flex; gap:7px; padding:10px 12px 12px; }
        .pv-chat-input {
          flex:1; height:34px; padding:0 12px; border:0; border-radius:9px;
          background:color-mix(in srgb, var(--surface-2) 55%, transparent);
          color:var(--text); font:inherit; font-size:13px; outline:none;
        }
        .pv-chat-input::placeholder { color:var(--pv-muted); }
        .pv-chat-send {
          width:34px; height:34px; border-radius:9px; border:0; flex-shrink:0;
          display:flex; align-items:center; justify-content:center; cursor:pointer;
          background:var(--pv-slate); color:#fff;
          transition:opacity .12s ease;
        }
        .pv-chat-send:disabled {
          background:color-mix(in srgb, var(--surface-2) 75%, transparent);
          color:var(--pv-muted); cursor:default;
        }
        .pv-guarantee { margin-top:24px; }
        .pv-guarantee-label {
          margin:0 0 6px; font-size:10.5px; font-weight:400; letter-spacing:.08em;
          color:var(--pv-muted); text-transform:uppercase;
        }
        .pv-guarantee-row {
          display:flex; justify-content:space-between; align-items:center;
          padding:8px 4px;
        }
        .pv-guarantee-row .l { font-size:12.5px; color:var(--pv-soft); }
        .pv-guarantee-row .s { font-size:10px; font-weight:400; letter-spacing:.04em; }

        @media (max-width:880px) {
          .pv-grid { grid-template-columns:1fr; gap:24px; }
          .pv-head-top { flex-wrap:wrap; }
          .pv-head-actions { flex-wrap:wrap; justify-content:flex-end; }
        }
        @media (max-width:600px) {
          .pv { padding:0 14px 64px; }
          .pv-title { font-size:19px; }
          .pv-head { margin-bottom:22px; }
          .pv-head-top { gap:12px; }
          .pv-progress { gap:14px; }
          .pv-stats { gap:13px; }
          .pv-ms-row { flex-wrap:wrap; gap:7px 10px; padding:12px; }
          .pv-ms-desc { display:none; }
          .pv-ms-title { flex:1; min-width:120px; }
          .pv-ms-amount { min-width:auto; }
          .pv-tabs { flex-wrap:wrap; }
          .pv-section { margin-top:24px; }
          .pv-chat { height:440px; }
        }
        @media (max-width:420px) {
          .pv-section-head { flex-wrap:wrap; gap:8px; }
        }
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
      <p className="pv-crumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="sep">/</span>
        <span>{project.title}</span>
      </p>

      {/* ── Header ── */}
      <div className="pv-head">
        <div className="pv-head-top">
          <div className="pv-title-row">
            <span className="pv-dot" style={{ background:'transparent', border:`2px solid ${pCol}` }}/>
            <h1 className="pv-title">{project.title}</h1>
            {projectType && (
              <span className="pv-type" title={typePreset.positioning}>{projectType}</span>
            )}
          </div>
          <div className="pv-head-actions">
            <AudioBriefingButton
              type="project_briefing"
              label="Projektbriefing"
              projectTitle={project.title}
              report={aiUpdates[0]?.content || `${project.title}: ${done} von ${tasks.length} Tasks erledigt. Aktuelle Phase: ${PHASE_LABEL[project.status] ?? project.status}.`}
              projectStatus={PHASE_LABEL[project.status] ?? project.status}
              progress={pct}
              blockerCount={tasks.filter((task) => ['blocked', 'waiting'].includes(task.status)).length}
              decisionCount={tasks.filter((task) => task.status === 'waiting').length}
              nextSteps={[todoTasks[0]?.title ?? 'nächste Projektaufgaben prüfen']}
            />
            <div className="pv-phase" title={canEdit ? 'Phase ändern' : 'Phase wird vom Entwicklerteam gesteuert'}>
              {PHASES.map((phase, i) => {
                const isActive = i === phaseIdx
                const isPast   = i < phaseIdx
                const bg = isPast || isActive ? pCol : 'var(--border)'
                return canEdit ? (
                  <button key={phase} className="pv-phase-seg" onClick={() => updateStatus(phase)} title={PHASE_LABEL[phase]}
                    style={{ width:isActive?20:6, cursor:'pointer', background:bg }}/>
                ) : (
                  <span key={phase} className="pv-phase-seg" title={PHASE_LABEL[phase]}
                    style={{ width:isActive?20:6, display:'block', background:bg }}/>
                )
              })}
            </div>
            <span className="pv-status">
              {project.status==='active' && <span className="pv-status-dot" style={{ background:'#22c55e', animation:'pvPulse 2s infinite' }}/>}
              {PHASE_LABEL[project.status] ?? project.status}
            </span>
            <button className="pv-del" onClick={() => setDeleteOpen(true)} title="Projekt löschen" aria-label="Projekt löschen">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>
              </svg>
            </button>
          </div>
        </div>

        {project.description && <p className="pv-desc">{project.description}</p>}

        <div className="pv-progress">
          <div className="pv-bar-wrap">
            <div className="pv-bar"><span style={{ width:`${pct}%`, background:pCol }}/></div>
            <span className="pv-pct">{pct}%</span>
          </div>
          <div className="pv-stats">
            {[
              { label:'Todo',   count: todoTasks.length,  dot:'var(--border-strong)' },
              { label:'Aktiv',  count: doingTasks.length, dot:'#f59e0b' },
              { label:'Fertig', count: doneTasks.length,  dot:'#22c55e' },
            ].map(s => (
              <span key={s.label} className="pv-stat">
                <span className="d" style={{ background:'transparent', border:`1.5px solid ${s.dot}` }}/>
                <b>{s.count}</b> {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Type-specific module strip ── */}
      <ProjectModulesStrip projectType={projectType ?? null} values={stripValues} />

      {canEdit && (
        <ExecutorModulesStrip
          projectType={projectType ?? null}
          role={myExecutorRole ?? ('developer' as ExecutorRole)}
        />
      )}

      {/* ── Milestones ── */}
      {milestones.length > 0 && (
        <div className="pv-section">
          <div className="pv-section-head">
            <h3 className="pv-section-title">Meilensteine & Zahlungen</h3>
            <span className="pv-section-meta">Mollie · SEPA · DSGVO</span>
          </div>
          <div className="pv-card">
            {milestones.map((ms) => {
              const isPaid    = ms.status === 'paid'
              const isPending = ms.status === 'pending'
              const isLocked  = ms.status === 'locked'
              const dot = isPaid ? '#22c55e' : isPending ? '#f59e0b' : 'var(--border-strong)'
              return (
                <div key={ms.id} className="pv-ms-row">
                  <span className="pv-ms-dot" style={{ background:'transparent', border:`2px solid ${dot}` }}/>
                  <span className={`pv-ms-title${isLocked ? ' locked' : ''}`}>{ms.title}</span>
                  {ms.description && <span className="pv-ms-desc">{ms.description}</span>}
                  <span className="pv-ms-amount">€{ms.amount.toLocaleString('de')}</span>
                  <span className={`pv-chip ${isPaid ? 'paid' : isPending ? 'pending' : 'locked'}`}>
                    {isPaid ? 'Bezahlt' : isPending ? 'Fällig' : 'Gesperrt'}
                  </span>
                  {isPending && !canEdit && (
                    <button className="pv-btn-primary" style={{ height:26, padding:'0 12px' }} onClick={() => payMilestone(ms)}>
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
      <div className="pv-grid">

        {/* LEFT */}
        <div>
          <div className="pv-tabs">
            {([
              { key:'tasks',   label:`Tasks (${tasks.length})` },
              { key:'assets',  label:'Assets' },
              { key:'updates', label:'Status & Briefings' },
            ] as const).map(tab => (
              <button key={tab.key} className={`pv-tab ${activeLeft===tab.key?'active':''}`} onClick={() => setActiveLeft(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* TASKS */}
          {activeLeft === 'tasks' && (
            <div>
              <div className="pv-add">
                <input
                  className="pv-input"
                  value={newTask} onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  placeholder={eff==='client' && clientRemaining===0 ? 'Wochenlimit erreicht' : 'Task hinzufügen…'}
                  disabled={eff==='client' && clientRemaining===0}
                />
                <button className="pv-btn-primary" onClick={addTask} disabled={!newTask.trim() || (eff==='client' && clientRemaining===0)}>
                  Hinzufügen
                </button>
              </div>
              {eff==='client' && (
                <p className="pv-quota">
                  <span className="d" style={{ background:'transparent', border:`1.5px solid ${clientRemaining>5?'#22c55e':clientRemaining>0?'#f59e0b':'#ef4444'}` }}/>
                  {clientRemaining} von {TASK_WEEK_LIMIT} Tasks diese Woche übrig
                </p>
              )}

              {[
                { status:'doing', label:'In Arbeit', dot:'#f59e0b',              list: doingTasks },
                { status:'todo',  label:'To Do',     dot:'var(--border-strong)', list: todoTasks  },
                { status:'done',  label:'Fertig',    dot:'#22c55e',              list: doneTasks  },
              ].map(group => group.list.length === 0 ? null : (
                <div key={group.status} className="pv-task-group">
                  <div className="pv-task-group-head">
                    <span className="d" style={{ background:'transparent', border:`1.5px solid ${group.dot}` }}/>
                    <span className="l">{group.label}</span>
                    <span className="c">{group.list.length}</span>
                  </div>
                  <div>
                    {group.list.map(task => {
                      const showDelete = canEdit || (eff==='client' && task.status==='todo')
                      const priColor = task.priority ? PRIORITY_COLOR[task.priority] : null
                      return (
                        <div key={task.id} className="pv-task-row" onClick={() => router.push(`/projects/${id}/tasks/${task.id}`)} title="Task-Detail öffnen">
                          <span className="d" style={{ background:'transparent', border:`1.5px solid ${group.dot}` }}/>
                          <span className="t">{task.title}</span>
                          {priColor && (
                            <span style={{ fontSize:10, color:priColor, flexShrink:0 }}>{task.priority?.toUpperCase()}</span>
                          )}
                          {canEdit && (
                            <div className="pv-task-actions" onClick={e => e.stopPropagation()}>
                              {['todo','doing','done'].filter(s => s !== task.status).map(s => (
                                <button key={s} className="pv-btn-ghost" onClick={() => updateTask(task.id, s)}>
                                  {{ todo:'Todo', doing:'Aktiv', done:'Fertig' }[s]}
                                </button>
                              ))}
                            </div>
                          )}
                          {showDelete && (
                            <button className="pv-task-del" onClick={e => { e.stopPropagation(); deleteTask(task.id) }} aria-label="Task löschen">
                              ✕
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {tasks.length === 0 && <p className="pv-empty">Noch keine Tasks angelegt.</p>}
            </div>
          )}

          {/* ASSETS */}
          {activeLeft === 'assets' && (
            <AssetsPanel projectId={project.id} workspaceId={(project as any).workspace_id ?? null} />
          )}

          {/* AI UPDATES */}
          {activeLeft === 'updates' && (
            <div>
              <div className="pv-section-head">
                <span className="pv-section-meta">Tagro fasst den Projektstand verständlich zusammen.</span>
                <button className="pv-btn-primary" style={{ height:30 }} onClick={generateAIUpdate} disabled={generatingAI}>
                  {generatingAI ? (
                    <>
                      <span style={{ width:10, height:10, border:'2px solid rgba(255,255,255,.35)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                      Generiert…
                    </>
                  ) : '+ Bericht erstellen'}
                </button>
              </div>
              {aiUpdates.length === 0 ? (
                <p className="pv-empty">Noch keine Berichte erstellt.</p>
              ) : (
                <div style={{ marginTop:8 }}>
                  {aiUpdates.map(u => (
                    <div key={u.id} className="pv-update">
                      <div className="pv-update-head">
                        <span className="pv-update-tag">Tagro AI</span>
                        <span className="pv-update-time">
                          {new Date(u.created_at).toLocaleDateString('de',{day:'2-digit',month:'short'})} · {new Date(u.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}
                        </span>
                      </div>
                      <div className="pv-update-body"><ChatMarkdown text={u.content} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Chat + Garantie */}
        <div>
          <div className="pv-chat">
            <div className="pv-chat-head">
              <div>
                <p className="ttl">Tagro AI</p>
                <p className="sub">Projektkommunikation</p>
              </div>
              <span className="pv-chat-live" style={{ color: online?'#16a34a':'var(--pv-muted)' }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:online?'#22c55e':'var(--border-strong)', animation:online?'pvPulse 1.5s infinite':'none' }}/>
                {online ? 'Live' : 'Offline'}
              </span>
            </div>

            <div className="pv-chat-body">
              {messages.length === 0 && !aiThinking && (
                <p style={{ fontSize:12.5, color:'var(--pv-muted)', margin:0, paddingTop:6 }}>Starte eine Konversation mit Tagro…</p>
              )}
              {messages.map(m => {
                const isAI = m.is_ai
                return (
                  <div key={m.id} className="pv-msg">
                    <div className={`pv-msg-av ${isAI ? 'ai' : 'me'}`}>
                      {isAI ? 'T' : (userEmail.charAt(0)||'U').toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', gap:6, alignItems:'baseline' }}>
                        <span className="pv-msg-name">{isAI?'Tagro':'Du'}</span>
                        <span className="pv-msg-time">{new Date(m.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      <p className="pv-msg-text">{m.message}</p>
                    </div>
                  </div>
                )
              })}
              {aiThinking && (
                <div className="pv-msg">
                  <div className="pv-msg-av ai">T</div>
                  <div style={{ paddingTop:8, display:'flex', gap:4 }}>
                    {[0,1,2].map(i => <span key={i} style={{ width:4, height:4, borderRadius:'50%', background:'var(--pv-muted)', animation:`pvPulse 1s ${i*0.2}s infinite` }}/>)}
                  </div>
                </div>
              )}
              <div ref={msgEndRef}/>
            </div>

            <div className="pv-chat-foot">
              <input
                className="pv-chat-input"
                value={newMsg} onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
                placeholder="Nachricht…"
              />
              <button className="pv-chat-send" onClick={sendMessage} disabled={!newMsg.trim()} aria-label="Senden">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
              </button>
            </div>
          </div>

          {/* Garantie */}
          <div className="pv-guarantee">
            <p className="pv-guarantee-label">Festag Garantie</p>
            {[
              { label:'AI Check',             done: pct>30 },
              { label:'Project Owner Review', done: pct>70 },
              { label:'Controlled Release',   done: project.status==='done' },
            ].map((item) => (
              <div key={item.label} className="pv-guarantee-row">
                <span className="l">{item.label}</span>
                <span className="s" style={{ color:item.done?'#16a34a':'var(--pv-muted)' }}>
                  {item.done ? '✓ Geprüft' : 'Ausstehend'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
