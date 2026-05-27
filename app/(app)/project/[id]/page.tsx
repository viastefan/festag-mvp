'use client'

import { Suspense, useEffect, useMemo, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Bell, CaretRight, CheckCircle, Circle, Cube, DotsThree, LinkSimple,
  PaperPlaneTilt, Plus, Sparkle, Star, Target, Trash, Warning,
} from '@phosphor-icons/react'
import { projectColor } from '@/components/Sidebar'
import { effectiveRole, isDevOrAdmin } from '@/lib/role'
import { taskStatusPatch } from '@/lib/tasks/status'
import { Milestone } from '@/components/MilestoneChart'
import ProjectCompletionCelebration from '@/components/ProjectCompletionCelebration'
import DeleteProjectModal from '@/components/DeleteProjectModal'
import { getProjectPreset, type ExecutorRole, type ProjectType } from '@/lib/project-modules'

type Project = { id: string; title: string; description: string|null; status: string; project_type?: ProjectType | null }
type Task = { id: string; title: string; status: string; priority?: string }
type Msg = { id: string; message: string; created_at: string; sender_id: string; is_ai?: boolean }

const PHASES = ['intake','planning','active','testing','done']
const PHASE_LABEL: Record<string,string> = { intake:'Intake', planning:'Planung', active:'In Arbeit', testing:'Testing', done:'Abgeschlossen' }
const PRIORITY_COLOR: Record<string,string> = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#22c55e' }

export default function ProjectPage() {
  // useSearchParams() requires a Suspense boundary or Next 14 fails to
  // defer the page, prerenders it with null params, and the page crashes
  // on hydrate into the (app)/error.tsx wall.
  return (
    <Suspense fallback={<div style={{ padding:48, color:'var(--text-muted)' }}>Projekt wird geladen…</div>}>
      <ProjectPageInner />
    </Suspense>
  )
}

function ProjectPageInner() {
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
  // Linear-style 3-tab layout. Legacy ?tab values map to the closest match:
  // decisions / risks / briefings / assets are surfaced as right-sidebar
  // sections + deep links from inside Overview; they no longer have their
  // own primary tab.
  const initialTab = searchParams?.get('tab') as null
    | 'overview' | 'activity' | 'tasks' | 'decisions' | 'risks' | 'briefings' | 'assets' | 'updates'
  const [activeLeft, setActiveLeft] = useState<'overview'|'activity'|'tasks'>(() => {
    if (initialTab === 'activity' || initialTab === 'updates' || initialTab === 'briefings') return 'activity'
    if (initialTab === 'tasks') return 'tasks'
    return 'overview'
  })
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

    // Realtime — chat + task changes belonging to this project.
    // Tasks are already on the supabase_realtime publication
    // (migration 20260518_sync_realtime_policies.sql).
    const channel = supabase
      .channel(`proj-${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${id}`
      }, (payload) => {
        setMessages(prev => [...prev.filter(m => !m.id.startsWith('tmp-')), payload.new as Msg])
        setAiThinking(false)
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'tasks', filter: `project_id=eq.${id}`
      }, (payload: any) => {
        const row = payload?.new
        if (!row) return
        setTasks(prev => prev.some(t => t.id === row.id) ? prev : [...prev, row])
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'tasks', filter: `project_id=eq.${id}`
      }, (payload: any) => {
        const row = payload?.new
        if (!row) return
        setTasks(prev => prev.map(t => t.id === row.id ? { ...t, ...row } : t))
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'tasks', filter: `project_id=eq.${id}`
      }, (payload: any) => {
        const oldId = payload?.old?.id
        if (!oldId) return
        setTasks(prev => prev.filter(t => t.id !== oldId))
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

  // ─── Command Center derived signals ───────────────────────────
  // Decisions + risks come from task statuses; payment + quality gate
  // are mapped from milestones + project phase. Pure derivation, no DB.
  const decisionTasks = tasks.filter(t => t.status === 'waiting') as any[]
  const riskTasks = tasks.filter(t => t.status === 'blocked') as any[]

  // Tasks awaiting owner approval — dev finished or Tagro verified.
  // Only admins see the inline approve/reject buttons (the route
  // 403s anyone else anyway).
  const approvalTasks = tasks.filter((t: any) => {
    const flow = String(t.dev_status || '').toLowerCase()
    return flow === 'finished_by_dev' || flow === 'verified_by_tagro' || flow === 'needs_review'
  }) as any[]
  const canApprove = userRole === 'admin'

  async function reviewTask(taskId: string, decision: 'approve' | 'reject') {
    const reason = decision === 'reject' ? (prompt('Begründung für die Rückgabe (sichtbar für Dev und Owner):') || undefined) : undefined
    if (decision === 'reject' && !reason) return
    try {
      const res = await fetch('/api/dev/tasks/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, decision, reason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data?.error || 'Aktion fehlgeschlagen.')
        return
      }
      await loadAll()
    } catch {
      alert('Verbindungsfehler.')
    }
  }

  const paymentState: { tone: 'ok' | 'due' | 'locked'; label: string } = (() => {
    const pending = milestones.find(m => m.status === 'pending')
    if (pending) return { tone: 'due', label: `${pending.title} · €${pending.amount.toLocaleString('de')}` }
    if (milestones.every(m => m.status === 'paid')) return { tone: 'ok', label: 'Alle Gates bezahlt' }
    if (milestones.length === 0) return { tone: 'locked', label: '—' }
    return { tone: 'locked', label: 'Gesperrt' }
  })()

  const riskState: { tone: 'low' | 'medium' | 'critical'; label: string } = (() => {
    if (riskTasks.length === 0 && decisionTasks.length === 0) return { tone: 'low', label: 'Stabil' }
    if (riskTasks.length > 0) return { tone: 'critical', label: `${riskTasks.length} Blocker` }
    return { tone: 'medium', label: `${decisionTasks.length} offene Entscheidung${decisionTasks.length === 1 ? '' : 'en'}` }
  })()

  const qualityGate: { tone: 'pending' | 'review' | 'passed'; label: string } = (() => {
    if (project.status === 'done') return { tone: 'passed', label: 'Approved' }
    if (project.status === 'testing') return { tone: 'review', label: 'In Review' }
    if (doneTasks.length === 0) return { tone: 'pending', label: 'Pending Review' }
    return { tone: 'review', label: 'Tagro Check' }
  })()

  // Tagro Intelligence — calm executive summary derived from state.
  const tagroNextAction = (() => {
    if (decisionTasks.length > 0) return decisionTasks[0].title
    if (riskTasks.length > 0)     return `Blocker beheben: ${riskTasks[0].title}`
    if (todoTasks.length > 0)     return todoTasks[0].title
    if (doingTasks.length > 0)    return `Weiter an: ${doingTasks[0].title}`
    if (nextMilestone)            return `Meilenstein „${nextMilestone.title}" vorbereiten`
    return 'Projekt-Scope schärfen und nächsten Meilenstein definieren'
  })()
  const tagroSummary = (() => {
    if (tasks.length === 0) return `Das Projekt steht ganz am Anfang. Tagro wartet auf Scope und erste Aufgaben.`
    const sentenceA = `Aktuell ${PHASE_LABEL[project.status] ?? project.status} · ${pct}% Fortschritt · ${doingTasks.length} aktive Tasks.`
    const sentenceB = riskTasks.length > 0
      ? `${riskTasks.length} Blocker brauchen Aufmerksamkeit.`
      : decisionTasks.length > 0
        ? `${decisionTasks.length} offene Entscheidung wartet auf Freigabe.`
        : `Keine akuten Risiken im Blick.`
    return `${sentenceA} ${sentenceB}`
  })()

  // ─── Activity feed: messages + AI updates merged chronologically ───
  const feedEvents = useMemo(() => {
    const events: Array<{
      id: string
      ts: number
      kind: 'message' | 'ai_update' | 'milestone' | 'created'
      title: string
      body?: string
      tone?: 'good' | 'amber' | 'muted'
    }> = []
    for (const m of messages) {
      events.push({
        id: `m-${m.id}`, ts: new Date(m.created_at).getTime(),
        kind: 'message', title: m.is_ai ? 'Tagro' : 'Du',
        body: m.message,
      })
    }
    for (const u of aiUpdates) {
      events.push({
        id: `u-${u.id}`, ts: new Date(u.created_at).getTime(),
        kind: 'ai_update', title: 'Statusbericht',
        body: u.content, tone: 'good',
      })
    }
    return events.sort((a, b) => b.ts - a.ts)
  }, [messages, aiUpdates])

  const sidebarPreview = feedEvents.slice(0, 3)
  const latestUpdate = aiUpdates[0]

  // Display name for breadcrumb workspace mark.
  const displayName = userEmail
    ? userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1)
    : 'Workspace'
  const displayInitial = (displayName.charAt(0) || 'W').toUpperCase()

  return (
    <div className="pv">
      <style>{`
        .pv {
          --pv-muted: var(--text-muted, #7B8294);
          --pv-soft:  var(--text-secondary, #4E5567);
          --pv-slate: var(--accent, #5B647D);
          --pv-page-bg: var(--bg);
          height: 100%;
          min-height: 0;
          display: grid;
          grid-template-rows: 44px 44px minmax(0, 1fr);
          background: var(--pv-page-bg);
          color: var(--text);
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-weight: 500;
          letter-spacing: .015em;
          overflow: hidden;
        }
        .pv * { font-weight: 500; letter-spacing: .015em; }
        [data-theme="dark"] .pv, [data-theme="classic-dark"] .pv {
          --pv-muted: #8D98A6;
          --pv-soft:  #B7BDC8;
        }

        /* ── TOP BAR — breadcrumb + actions ───────────────────────── */
        .pv-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 14px;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          font-size: 12.5px;
        }
        .pv-crumbs {
          display: flex; align-items: center; gap: 6px;
          min-width: 0; flex: 1;
          overflow: hidden;
        }
        .pv-crumb {
          display: inline-flex; align-items: center; gap: 5px;
          color: var(--pv-soft);
          text-decoration: none;
          white-space: nowrap;
          padding: 4px 6px; border-radius: 6px;
          transition: background .12s, color .12s;
        }
        .pv-crumb:hover { color: var(--text); background: var(--surface-2); }
        .pv-crumb-current {
          color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          min-width: 0;
        }
        .pv-crumb-sep {
          color: var(--pv-muted);
          flex-shrink: 0; opacity: .55;
        }
        .pv-crumb-mark {
          display: inline-flex; align-items: center; justify-content: center;
          width: 17px; height: 17px; border-radius: 5px;
          background: #2EA053; color: #fff;
          font-size: 10px; font-weight: 500;
        }
        .pv-icon-square {
          display: inline-flex; align-items: center; justify-content: center;
          width: 18px; height: 18px; border-radius: 5px;
          flex-shrink: 0;
        }
        .pv-icon-btn {
          width: 26px; height: 26px;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent; border: 0; border-radius: 6px;
          color: var(--pv-muted); cursor: pointer; padding: 0;
          transition: background .12s, color .12s;
          flex-shrink: 0;
        }
        .pv-icon-btn:hover { background: var(--surface-2); color: var(--text); }
        .pv-topbar-right { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }

        /* ── TABS — pill-style segmented control ───────────────────── */
        .pv-tabs {
          display: flex; align-items: center; gap: 4px;
          padding: 0 14px;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
        }
        .pv-tab {
          display: inline-flex; align-items: center; gap: 6px;
          height: 28px; padding: 0 11px;
          border: 1px solid transparent; border-radius: 999px;
          background: transparent;
          color: var(--pv-soft);
          font: inherit; font-size: 12px; font-weight: 500;
          cursor: pointer;
          transition: background .1s, color .1s, border-color .1s;
        }
        .pv-tab:hover { color: var(--text); background: var(--surface-2); }
        .pv-tab.on {
          background: var(--surface-2);
          color: var(--text);
          border-color: color-mix(in srgb, var(--border) 50%, transparent);
        }
        .pv-tab-count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 16px; height: 15px; padding: 0 4px; border-radius: 999px;
          background: color-mix(in srgb, var(--text) 8%, transparent);
          font-size: 10px;
        }

        /* ── BODY — main + right sidebar, fixed-height ─────────────── */
        .pv-body {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          min-height: 0; overflow: hidden;
        }
        .pv-main {
          min-width: 0; min-height: 0;
          overflow-y: auto; overflow-x: hidden;
          padding: 40px clamp(20px, 4vw, 56px) 60px;
        }
        .pv-sidebar {
          border-left: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          min-width: 0; min-height: 0;
          overflow-y: auto;
          padding: 16px 18px 24px;
          display: flex; flex-direction: column; gap: 16px;
        }

        /* ── OVERVIEW ─────────────────────────────────────────────── */
        .pv-overview {
          max-width: 720px;
          display: flex; flex-direction: column; gap: 22px;
        }
        .pv-hero-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .pv-hero-title {
          margin: 0;
          font-size: 30px; font-weight: 500;
          letter-spacing: -.012em;
          color: var(--text);
        }
        .pv-hero-summary {
          margin: 0;
          font-size: 14px; line-height: 1.55;
          color: var(--pv-muted);
        }
        .pv-prop-row {
          display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
        }
        .pv-prop-label {
          width: 96px;
          color: var(--pv-muted);
          font-size: 12px;
        }
        .pv-chip {
          display: inline-flex; align-items: center; gap: 5px;
          height: 24px; padding: 0 9px; border-radius: 6px;
          background: color-mix(in srgb, var(--surface-2) 50%, transparent);
          color: var(--text);
          font-size: 11.5px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: background .1s, border-color .1s;
        }
        .pv-chip:hover { background: var(--surface-2); border-color: var(--border); }
        .pv-chip-mute { color: var(--pv-muted); }
        .pv-link-add {
          display: inline-flex; align-items: center; gap: 5px;
          height: 24px; padding: 0 8px; border-radius: 6px;
          background: transparent; border: 0;
          color: var(--pv-muted); font: inherit; font-size: 12px;
          cursor: pointer;
        }
        .pv-link-add:hover { background: var(--surface-2); color: var(--text); }

        .pv-latest {
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          border-radius: 10px;
          background: color-mix(in srgb, var(--surface-2) 22%, transparent);
          padding: 14px 16px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .pv-latest > header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }
        .pv-latest-label { font-size: 12px; color: var(--text); }
        .pv-update-btn {
          display: inline-flex; align-items: center; gap: 5px;
          height: 26px; padding: 0 10px; border-radius: 6px;
          border: 1px solid var(--border); background: var(--card);
          color: var(--text); font: inherit; font-size: 11.5px;
          cursor: pointer;
        }
        .pv-update-btn:hover:not(:disabled) { background: var(--surface-2); }
        .pv-update-btn:disabled { opacity: .5; cursor: not-allowed; }
        .pv-latest-meta {
          display: flex; align-items: center; gap: 5px;
          font-size: 11.5px; color: var(--pv-muted);
        }
        .pv-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .pv-status-dot.tone-good { background: #22c55e; }
        .pv-status-dot.tone-amber { background: #f59e0b; }
        .pv-status-dot.tone-red { background: #ef4444; }
        .pv-status-dot.tone-muted { background: var(--pv-muted); }
        .pv-sep { color: var(--pv-muted); opacity: .55; }
        .pv-latest-body {
          font-size: 13px; color: var(--text); line-height: 1.55;
          white-space: pre-wrap;
          max-height: 180px; overflow-y: auto;
        }

        .pv-section-title {
          margin: 0;
          font-size: 13.5px; color: var(--text);
        }
        .pv-desc-block { display: flex; flex-direction: column; gap: 8px; }
        .pv-desc-text { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text); }
        .pv-desc-placeholder { margin: 0; font-size: 13.5px; color: var(--pv-muted); }

        .pv-add-milestone-btn {
          align-self: flex-start;
          display: inline-flex; align-items: center; gap: 5px;
          height: 26px; padding: 0 10px; border-radius: 6px;
          border: 0; background: transparent;
          color: var(--pv-muted); font: inherit; font-size: 12px;
          cursor: pointer;
        }
        .pv-add-milestone-btn:hover { background: var(--surface-2); color: var(--text); }

        /* ── ACTIVITY ─────────────────────────────────────────────── */
        .pv-activity {
          max-width: 720px;
          display: flex; flex-direction: column; gap: 18px;
        }
        .pv-composer {
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--card);
          overflow: hidden;
          display: flex; flex-direction: column;
        }
        .pv-composer-tabs {
          display: flex; gap: 4px;
          padding: 8px 8px 0;
        }
        .pv-composer-tab {
          height: 24px; padding: 0 10px; border-radius: 999px;
          border: 0; background: transparent;
          color: var(--pv-muted); font: inherit; font-size: 11.5px;
          cursor: pointer;
        }
        .pv-composer-tab.on { background: var(--surface-2); color: var(--text); }
        .pv-composer-area {
          width: 100%; min-height: 100px; resize: vertical;
          border: 0; outline: 0; background: transparent;
          padding: 10px 14px;
          font: inherit; font-size: 13px;
          color: var(--text); line-height: 1.55;
        }
        .pv-composer-area::placeholder { color: var(--pv-muted); }
        .pv-composer-actions {
          display: flex; align-items: center; justify-content: flex-end; gap: 8px;
          padding: 6px 8px 8px;
          border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
        }
        .pv-composer-submit {
          height: 26px; padding: 0 12px; border-radius: 6px;
          border: 1px solid var(--border); background: var(--card);
          color: var(--text); font: inherit; font-size: 12px;
          cursor: pointer;
        }
        .pv-composer-submit:hover:not(:disabled) { background: var(--surface-2); }
        .pv-composer-submit:disabled { opacity: .5; cursor: not-allowed; }

        .pv-feed { display: flex; flex-direction: column; }
        .pv-feed-row {
          display: flex; flex-direction: column; gap: 6px;
          padding: 14px 0;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 35%, transparent);
        }
        .pv-feed-row:last-child { border-bottom: 0; }
        .pv-feed-meta {
          display: flex; align-items: center; gap: 6px;
          font-size: 11.5px; color: var(--pv-muted);
        }
        .pv-feed-meta strong { color: var(--text); font-weight: 500; }
        .pv-feed-body {
          font-size: 13px; color: var(--text); line-height: 1.55;
          white-space: pre-wrap;
        }

        /* ── TASKS ────────────────────────────────────────────────── */
        .pv-tasks {
          max-width: 760px;
          display: flex; flex-direction: column; gap: 16px;
        }
        .pv-tasks-add {
          display: flex; gap: 6px;
          padding: 6px;
          border: 1px solid var(--border); border-radius: 10px;
          background: var(--card);
        }
        .pv-tasks-input {
          flex: 1; border: 0; outline: 0; background: transparent;
          padding: 6px 10px;
          font: inherit; font-size: 13px;
          color: var(--text);
        }
        .pv-tasks-input::placeholder { color: var(--pv-muted); }
        .pv-tasks-input:disabled { opacity: .5; }
        .pv-tasks-btn {
          height: 30px; padding: 0 16px; border-radius: 7px;
          border: 0; background: var(--btn-prim, var(--pv-slate)); color: var(--btn-prim-text, #fff);
          font: inherit; font-size: 12px;
          cursor: pointer;
        }
        .pv-tasks-btn:hover:not(:disabled) { opacity: .92; }
        .pv-tasks-btn:disabled { opacity: .45; cursor: not-allowed; }
        .pv-quota {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11.5px; color: var(--pv-muted);
        }
        .pv-task-group { display: flex; flex-direction: column; }
        .pv-task-group-head {
          display: flex; align-items: center; gap: 7px;
          height: 28px; padding: 0 6px;
          font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase;
          color: var(--pv-muted);
        }
        .pv-task-row {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: background .1s;
        }
        .pv-task-row:hover { background: var(--surface-2); }
        .pv-task-check {
          width: 16px; height: 16px;
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--pv-muted);
          flex-shrink: 0;
        }
        .pv-task-row.done .pv-task-check { color: #22c55e; }
        .pv-task-title {
          flex: 1; min-width: 0;
          font-size: 13px; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pv-task-row.done .pv-task-title { color: var(--pv-muted); text-decoration: line-through; }
        .pv-task-priority {
          font-size: 10px; letter-spacing: .06em;
          padding: 1px 6px; border-radius: 4px;
          flex-shrink: 0;
        }
        .pv-task-actions {
          display: inline-flex; gap: 3px; flex-shrink: 0;
          opacity: 0; transition: opacity .12s;
        }
        .pv-task-row:hover .pv-task-actions { opacity: 1; }
        .pv-task-state-btn {
          height: 22px; padding: 0 8px; border-radius: 4px;
          border: 1px solid transparent; background: transparent;
          color: var(--pv-muted); font: inherit; font-size: 11px;
          cursor: pointer;
        }
        .pv-task-state-btn:hover {
          background: var(--card);
          border-color: var(--border);
          color: var(--text);
        }
        .pv-task-trash {
          width: 22px; height: 22px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 0; background: transparent;
          color: var(--pv-muted); cursor: pointer; border-radius: 4px;
        }
        .pv-task-trash:hover { background: color-mix(in srgb, #ef4444 14%, transparent); color: #ef4444; }
        .pv-empty {
          font-size: 13px; color: var(--pv-muted);
          padding: 22px 4px;
        }

        /* ── SIDEBAR — sections ───────────────────────────────────── */
        .pv-side-section { display: flex; flex-direction: column; gap: 6px; }
        .pv-side-section > header {
          display: flex; align-items: center; justify-content: space-between;
          height: 26px;
          font-size: 12px; color: var(--text);
        }
        .pv-side-section > header button {
          border: 0; background: transparent;
          color: var(--pv-muted); cursor: pointer;
          font: inherit; font-size: 11px;
        }
        .pv-side-section > header button:hover { color: var(--text); }
        .pv-side-rows { display: flex; flex-direction: column; }
        .pv-side-row {
          display: flex; align-items: center; justify-content: space-between;
          min-height: 28px;
          font-size: 12px;
          gap: 8px;
        }
        .pv-side-row-key { color: var(--pv-muted); flex-shrink: 0; }
        .pv-side-row-val {
          color: var(--text);
          text-align: right;
          min-width: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pv-side-link { color: var(--text); text-decoration: none; }
        .pv-side-link:hover { text-decoration: underline; }

        .pv-side-milestones {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 4px;
        }
        .pv-side-milestone {
          display: flex; align-items: center; gap: 7px;
          padding: 5px 0;
          font-size: 12px; color: var(--text);
          min-width: 0;
        }
        .pv-side-milestone .mtitle {
          flex: 1; min-width: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pv-side-milestone.locked .mtitle { color: var(--pv-muted); }
        .pv-side-milestone .mamount {
          color: var(--pv-muted); font-size: 11px; flex-shrink: 0;
        }

        .pv-side-activity {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 8px;
        }
        .pv-side-activity li {
          display: flex; align-items: flex-start; gap: 8px;
          font-size: 11.5px; color: var(--pv-muted);
        }
        .pv-side-activity li strong { color: var(--text); font-weight: 500; }
        .pv-side-activity li .dot {
          width: 6px; height: 6px; border-radius: 50%;
          margin-top: 6px; flex-shrink: 0;
          background: var(--pv-muted); opacity: .6;
        }
        .pv-side-activity li.tone-good .dot { background: #22c55e; opacity: 1; }
        .pv-side-activity li .body {
          min-width: 0; overflow: hidden;
          text-overflow: ellipsis; display: -webkit-box;
          -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }

        .pv-pill {
          display: inline-flex; align-items: center; gap: 4px;
          height: 19px; padding: 0 8px; border-radius: 999px;
          font-size: 10.5px;
        }
        .pv-pill.tone-good, .pv-pill.tone-low,
        .pv-pill.tone-ok, .pv-pill.tone-passed {
          background: color-mix(in srgb, #22c55e 14%, transparent); color: #16a34a;
        }
        .pv-pill.tone-medium, .pv-pill.tone-amber, .pv-pill.tone-due, .pv-pill.tone-review {
          background: color-mix(in srgb, #f59e0b 14%, transparent); color: #b45309;
        }
        .pv-pill.tone-critical, .pv-pill.tone-red {
          background: color-mix(in srgb, #ef4444 14%, transparent); color: #b91c1c;
        }
        .pv-pill.tone-locked, .pv-pill.tone-muted, .pv-pill.tone-pending {
          background: color-mix(in srgb, var(--pv-muted) 12%, transparent); color: var(--pv-muted);
        }

        /* ── Responsive ───────────────────────────────────────────── */
        @media (max-width: 920px) {
          .pv-body { grid-template-columns: 1fr; }
          .pv-sidebar { display: none; }
          .pv-main { padding: 24px 18px 60px; }
          .pv-tabs { overflow-x: auto; }
          .pv-tabs::-webkit-scrollbar { display: none; }
        }
        @media (max-width: 600px) {
          .pv-hero-title { font-size: 24px; }
          .pv-prop-label { width: 80px; font-size: 11.5px; }
        }
      `}</style>

      <ProjectCompletionCelebration
        open={celebrationOpen}
        projectTitle={project.title}
        deliveryDate={new Date().toISOString()}
        onClose={() => setCelebrationOpen(false)}
        onContinue={() => { setCelebrationOpen(false); setActiveLeft('activity'); generateAIUpdate() }}
      />

      <DeleteProjectModal
        open={deleteOpen}
        projectId={project.id}
        projectTitle={project.title}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => { setDeleteOpen(false); window.location.href = '/dashboard' }}
      />

      {/* ─── TOP BAR — workspace breadcrumb ─── */}
      <header className="pv-topbar">
        <div className="pv-crumbs">
          <Link href="/dashboard" className="pv-crumb">
            <span className="pv-crumb-mark">{displayInitial}</span>
            <span>{displayName}</span>
          </Link>
          <CaretRight size={11} weight="bold" className="pv-crumb-sep" />
          <Link href="/dashboard" className="pv-crumb">Projects</Link>
          <CaretRight size={11} weight="bold" className="pv-crumb-sep" />
          <span className="pv-crumb pv-crumb-current">
            <span className="pv-icon-square" style={{ background: `${pCol}24`, color: pCol }}>
              <Cube size={11} weight="duotone" />
            </span>
            {project.title}
          </span>
          <button className="pv-icon-btn" title="Favorit"><Star size={13} /></button>
          <button
            className="pv-icon-btn"
            title="Projekt löschen"
            onClick={() => setDeleteOpen(true)}
          ><DotsThree size={14} weight="bold" /></button>
        </div>
        <div className="pv-topbar-right">
          <button className="pv-icon-btn" title="Link kopieren"><LinkSimple size={13} /></button>
          <button className="pv-icon-btn" title="Benachrichtigungen"><Bell size={13} /></button>
        </div>
      </header>

      {/* ─── TABS ─── */}
      <nav className="pv-tabs" role="tablist">
        <button
          role="tab" aria-selected={activeLeft === 'overview'}
          className={`pv-tab${activeLeft === 'overview' ? ' on' : ''}`}
          onClick={() => setActiveLeft('overview')}
        >Overview</button>
        <button
          role="tab" aria-selected={activeLeft === 'activity'}
          className={`pv-tab${activeLeft === 'activity' ? ' on' : ''}`}
          onClick={() => setActiveLeft('activity')}
        >Activity</button>
        <button
          role="tab" aria-selected={activeLeft === 'tasks'}
          className={`pv-tab${activeLeft === 'tasks' ? ' on' : ''}`}
          onClick={() => setActiveLeft('tasks')}
        >
          Tasks
          {tasks.length > 0 && <span className="pv-tab-count">{tasks.length}</span>}
        </button>
      </nav>

      {/* ─── BODY: main + right sidebar ─── */}
      <div className="pv-body">
        <main className="pv-main">

          {/* OVERVIEW */}
          {activeLeft === 'overview' && (
            <div className="pv-overview">
              <div className="pv-hero-icon" style={{ background: `${pCol}26`, color: pCol }}>
                <Cube size={22} weight="duotone" />
              </div>

              <h1 className="pv-hero-title">{project.title}</h1>

              {project.description
                ? <p className="pv-hero-summary">{project.description}</p>
                : <p className="pv-hero-summary">Add a short summary…</p>}

              <div className="pv-prop-row">
                <span className="pv-prop-label">Properties</span>
                <span className="pv-chip">
                  <span className={`pv-status-dot tone-${project.status === 'done' ? 'good' : project.status === 'active' ? 'amber' : 'muted'}`} />
                  {PHASE_LABEL[project.status] ?? project.status}
                </span>
                {projectType && (
                  <span className="pv-chip pv-chip-mute">{typePreset?.label || projectType}</span>
                )}
                <span className="pv-chip pv-chip-mute">Lead</span>
                <span className="pv-chip pv-chip-mute"><Target size={11} /> Target date</span>
                <span className="pv-chip">{displayName}</span>
                <button className="pv-icon-btn" title="Mehr"><DotsThree size={13} weight="bold" /></button>
              </div>

              <div className="pv-prop-row">
                <span className="pv-prop-label">Resources</span>
                <button className="pv-link-add"><Plus size={11} weight="bold" /> Dokument oder Link hinzufügen…</button>
              </div>

              {latestUpdate && (
                <section className="pv-latest">
                  <header>
                    <span className="pv-latest-label">Letztes Update</span>
                    <button className="pv-update-btn" onClick={generateAIUpdate} disabled={generatingAI}>
                      {generatingAI ? 'Erstellt…' : 'Update'}
                    </button>
                  </header>
                  <div className="pv-latest-meta">
                    <span className="pv-status-dot tone-good" />
                    <span>On track</span>
                    <span className="pv-sep">·</span>
                    <span>{displayName}</span>
                    <span className="pv-sep">·</span>
                    <span>{fmtAgo(latestUpdate.created_at)}</span>
                  </div>
                  <div className="pv-latest-body">{latestUpdate.content?.slice(0, 800)}</div>
                </section>
              )}

              {!latestUpdate && (
                <section className="pv-latest">
                  <header>
                    <span className="pv-latest-label">Letztes Update</span>
                    <button className="pv-update-btn" onClick={generateAIUpdate} disabled={generatingAI}>
                      {generatingAI ? 'Erstellt…' : 'Update'}
                    </button>
                  </header>
                  <div className="pv-latest-meta">
                    <span className="pv-status-dot tone-muted" />
                    <span>Noch keine Updates</span>
                  </div>
                  <div className="pv-latest-body" style={{ color: 'var(--pv-muted)' }}>
                    Klick auf „Update", damit Tagro einen ruhigen Statusbericht aus dem aktuellen Projektstand erstellt.
                  </div>
                </section>
              )}

              <section className="pv-desc-block">
                <h2 className="pv-section-title">Beschreibung</h2>
                {project.description
                  ? <p className="pv-desc-text">{project.description}</p>
                  : <p className="pv-desc-placeholder">Beschreibung hinzufügen…</p>}
              </section>

              {canEdit && (
                <button className="pv-add-milestone-btn"><Plus size={11} weight="bold" /> Meilenstein</button>
              )}
            </div>
          )}

          {/* ACTIVITY */}
          {activeLeft === 'activity' && (
            <div className="pv-activity">
              <div className="pv-composer">
                <div className="pv-composer-tabs">
                  <button className="pv-composer-tab on">Kommentar</button>
                  <button className="pv-composer-tab" onClick={generateAIUpdate} disabled={generatingAI}>
                    {generatingAI ? 'Tagro schreibt…' : 'Update'}
                  </button>
                </div>
                <textarea
                  className="pv-composer-area"
                  placeholder="Kommentar hinterlassen…"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                />
                <div className="pv-composer-actions">
                  <button
                    className="pv-composer-submit"
                    onClick={sendMessage}
                    disabled={!newMsg.trim() || aiThinking}
                  >
                    {aiThinking ? 'Sende…' : 'Kommentar'}
                  </button>
                </div>
              </div>

              {feedEvents.length === 0 ? (
                <p className="pv-empty">Noch keine Aktivität. Schreibe einen Kommentar oder lass Tagro einen Statusbericht erzeugen.</p>
              ) : (
                <div className="pv-feed">
                  {feedEvents.map((ev) => (
                    <article key={ev.id} className="pv-feed-row">
                      <div className="pv-feed-meta">
                        <span className={`pv-status-dot tone-${ev.tone || 'muted'}`} />
                        <strong>{ev.title}</strong>
                        <span className="pv-sep">·</span>
                        <span>{fmtAgo(new Date(ev.ts).toISOString())}</span>
                      </div>
                      {ev.body && <div className="pv-feed-body">{ev.body.slice(0, 800)}</div>}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TASKS */}
          {activeLeft === 'tasks' && (
            <div className="pv-tasks">
              <div className="pv-tasks-add">
                <input
                  className="pv-tasks-input"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  placeholder={eff === 'client' && clientRemaining === 0 ? 'Wochenlimit erreicht' : 'Task hinzufügen…'}
                  disabled={eff === 'client' && clientRemaining === 0}
                />
                <button
                  className="pv-tasks-btn"
                  onClick={addTask}
                  disabled={!newTask.trim() || (eff === 'client' && clientRemaining === 0)}
                >Hinzufügen</button>
              </div>
              {eff === 'client' && (
                <p className="pv-quota">
                  <span className={`pv-status-dot tone-${clientRemaining > 5 ? 'good' : clientRemaining > 0 ? 'amber' : 'red'}`} />
                  {clientRemaining} von {TASK_WEEK_LIMIT} Tasks diese Woche übrig
                </p>
              )}

              {[
                { status: 'doing', label: 'In Arbeit', list: doingTasks },
                { status: 'todo',  label: 'To Do',     list: todoTasks  },
                { status: 'done',  label: 'Fertig',    list: doneTasks  },
              ].map((group) => group.list.length === 0 ? null : (
                <div key={group.status} className="pv-task-group">
                  <div className="pv-task-group-head">
                    <span>{group.label}</span>
                    <span style={{ opacity: .55 }}>{group.list.length}</span>
                  </div>
                  <div>
                    {group.list.map((task) => {
                      const showDelete = canEdit || (eff === 'client' && task.status === 'todo')
                      const isDone = task.status === 'done'
                      return (
                        <div
                          key={task.id}
                          className={`pv-task-row${isDone ? ' done' : ''}`}
                          onClick={() => router.push(`/projects/${id}/tasks/${task.id}`)}
                        >
                          <span className="pv-task-check">
                            {isDone ? <CheckCircle size={14} weight="fill" /> : <Circle size={14} />}
                          </span>
                          <span className="pv-task-title">{task.title}</span>
                          {task.priority && (
                            <span
                              className="pv-task-priority"
                              style={{ color: PRIORITY_COLOR[task.priority] || 'var(--pv-muted)' }}
                            >{task.priority.toUpperCase()}</span>
                          )}
                          {canEdit && (
                            <div className="pv-task-actions" onClick={(e) => e.stopPropagation()}>
                              {['todo', 'doing', 'done'].filter((s) => s !== task.status).map((s) => (
                                <button
                                  key={s}
                                  className="pv-task-state-btn"
                                  onClick={() => updateTask(task.id, s)}
                                >{({ todo: 'Todo', doing: 'Aktiv', done: 'Fertig' } as Record<string, string>)[s]}</button>
                              ))}
                            </div>
                          )}
                          {showDelete && (
                            <button
                              className="pv-task-trash"
                              onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }}
                              title="Task löschen"
                            ><Trash size={12} /></button>
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

        </main>

        {/* ─── RIGHT SIDEBAR — Properties / Milestones / Activity ─── */}
        <aside className="pv-sidebar">
          <section className="pv-side-section">
            <header>
              <span>Properties</span>
              <button title="Mehr">▾</button>
            </header>
            <div className="pv-side-rows">
              <div className="pv-side-row">
                <span className="pv-side-row-key">Status</span>
                <span className="pv-side-row-val">
                  <span className={`pv-status-dot tone-${project.status === 'done' ? 'good' : project.status === 'active' ? 'amber' : 'muted'}`} style={{ display: 'inline-block', marginRight: 5 }} />
                  {PHASE_LABEL[project.status] ?? project.status}
                </span>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Type</span>
                <span className="pv-side-row-val">{typePreset?.label || projectType || '—'}</span>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Owner</span>
                <span className="pv-side-row-val">{displayName}</span>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Target date</span>
                <span className="pv-side-row-val" style={{ color: 'var(--pv-muted)' }}>—</span>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Risk</span>
                <span className="pv-side-row-val">
                  <span className={`pv-pill tone-${riskState.tone}`}>{riskState.label}</span>
                </span>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Payment</span>
                <span className="pv-side-row-val">
                  <span className={`pv-pill tone-${paymentState.tone}`}>{paymentState.label}</span>
                </span>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Quality</span>
                <span className="pv-side-row-val">
                  <span className={`pv-pill tone-${qualityGate.tone}`}>{qualityGate.label}</span>
                </span>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Decisions</span>
                <span className="pv-side-row-val">
                  <Link href={`/decisions?project=${id}`} className="pv-side-link">
                    {decisionTasks.length > 0 ? `${decisionTasks.length} offen` : 'Keine offen'}
                  </Link>
                </span>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Issues</span>
                <span className="pv-side-row-val">{tasks.length}</span>
              </div>
            </div>
          </section>

          <section className="pv-side-section">
            <header>
              <span>Milestones</span>
              {canEdit && <button title="Meilenstein hinzufügen">+</button>}
            </header>
            {milestones.length === 0 ? (
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--pv-muted)', lineHeight: 1.5 }}>
                Meilensteine strukturieren die Lieferung in Phasen. Lege den ersten an, um Zahlungen freizugeben.
              </p>
            ) : (
              <ul className="pv-side-milestones">
                {milestones.slice(0, 5).map((m) => {
                  const isPaid = m.status === 'paid'
                  const isPending = m.status === 'pending'
                  const isLocked = m.status === 'locked'
                  return (
                    <li key={m.id} className={`pv-side-milestone ${m.status}`}>
                      <span className={`pv-status-dot tone-${isPaid ? 'good' : isPending ? 'amber' : 'muted'}`} />
                      <span className="mtitle">{m.title}</span>
                      <span className="mamount">€{m.amount.toLocaleString('de')}</span>
                      {isPending && !canEdit && (
                        <button
                          className="pv-update-btn"
                          style={{ height: 22, padding: '0 8px', fontSize: 11 }}
                          onClick={() => payMilestone(m)}
                        >Freischalten</button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="pv-side-section">
            <header>
              <span>Activity</span>
              <button onClick={() => setActiveLeft('activity')}>Alle</button>
            </header>
            {sidebarPreview.length === 0 ? (
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--pv-muted)' }}>Noch keine Aktivität.</p>
            ) : (
              <ul className="pv-side-activity">
                {sidebarPreview.map((ev) => (
                  <li key={ev.id} className={ev.tone === 'good' ? 'tone-good' : ''}>
                    <span className="dot" />
                    <div className="body">
                      <strong>{ev.title}</strong> · {fmtAgo(new Date(ev.ts).toISOString())}
                      {ev.body && <div style={{ marginTop: 2 }}>{ev.body.slice(0, 90)}{ev.body.length > 90 ? '…' : ''}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

// ─── Date formatter — used across the project view ──────────────────
function fmtAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d} Tag${d === 1 ? '' : 'en'}`
  return new Date(iso).toLocaleDateString('de-DE')
}
