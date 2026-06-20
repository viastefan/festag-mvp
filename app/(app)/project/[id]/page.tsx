'use client'

import { Suspense, useEffect, useMemo, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Bell, CaretRight, Check, CheckCircle, Circle, DotsThree, LinkSimple,
  CaretDown, CaretUp, Copy, EnvelopeSimple, FilePdf, Plus, Sparkle, Star, Target, Trash, UserPlus,
  ListChecks, ShieldCheck, Receipt, ClockClockwise, PencilSimple, Wrench, Microphone,
} from '@phosphor-icons/react'
import { projectColor } from '@/components/Sidebar'
import { effectiveRole, isDevOrAdmin } from '@/lib/role'
import { taskStatusPatch } from '@/lib/tasks/status'
import { computeControlStatus, ageInDays } from '@/lib/trust/control-status'
import { computeReportReadiness } from '@/lib/trust/nexora'
import { Milestone } from '@/components/MilestoneChart'
import ProjectCompletionCelebration from '@/components/ProjectCompletionCelebration'
import DeleteProjectModal from '@/components/DeleteProjectModal'
import AssignDevModal from '@/components/AssignDevModal'
import NewTaskModal from '@/components/NewTaskModal'
import ProjectDevAvatars from '@/components/ProjectDevAvatars'
import ProofGridSection from '@/components/ProofGridSection'
import AssetsPanel from '@/components/AssetsPanel'
import TagroMobileBar from '@/components/TagroMobileBar'
import MobileObjectMenu from '@/components/MobileObjectMenu'
import { openTagro } from '@/components/TagroOverlay'
import { openCapture } from '@/components/CaptureRecorder'
import ProjectUrlBar from '@/components/ProjectUrlBar'
import TagroQueueSection from '@/components/TagroQueueSection'
import MarketingPanelSection from '@/components/MarketingPanelSection'
import ChatMarkdown from '@/components/ChatMarkdown'
import { getProjectPreset, type ExecutorRole, type ProjectType } from '@/lib/project-modules'
import { autoAvatarColor, avatarTextColor } from '@/lib/avatar'
import { getRememberedProfileAvatarColor, subscribeProfileSync } from '@/lib/profile-sync'

type Project = {
  id: string; title: string; description: string|null; status: string;
  project_type?: ProjectType | null;
  /** Set by the dev when there is something the client can review. The
   *  Capture-Loop recorder is locked until this is non-empty. */
  staging_url?: string | null;
  live_url?: string | null;
}
type Task = { id: string; title: string; status: string; priority?: string }
type Msg = { id: string; message: string; created_at: string; sender_id: string; is_ai?: boolean }
type ReportActionItem = {
  type?: string
  title: string
  description?: string | null
  priority?: string | null
  owner_type?: string | null
  client_visible?: boolean
  related_reason?: string | null
}

const PHASES = ['intake','planning','active','testing','done']
const PHASE_LABEL: Record<string,string> = { intake:'Intake', planning:'Planung', active:'In Arbeit', testing:'Testing', done:'Abgeschlossen' }
const PHASE_TONE: Record<string,'good'|'amber'|'muted'> = { intake:'muted', planning:'muted', active:'amber', testing:'amber', done:'good' }
const PRIORITY_COLOR: Record<string,string> = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#22c55e' }
// Curated project color palette — calm, Festag-aligned (no neon).
const PROJECT_COLORS = ['#5B647D','#6E8FB8','#5BA88C','#C18409','#C0744C','#B5566B','#6a738c','#5F7A8A','#94A0AE']

function fmtDate(value?: string | null) {
  if (!value) return null
  try { return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return null }
}

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
  const [evidenceStats, setEvidenceStats] = useState<{ total: number; client: number }>({ total: 0, client: 0 })
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
  // Workspace identity — the breadcrumb mark must always carry the colour
  // the user picks for themselves (profiles.avatar_color), so the project
  // header and the sidebar switcher read as one workspace, not two.
  const [brandColor, setBrandColor] = useState<string|null>(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const searchParams = useSearchParams()
  // Linear-style 3-tab layout. Legacy ?tab values map to the closest match:
  // decisions / risks / briefings / assets are surfaced as right-sidebar
  // sections + deep links from inside Overview; they no longer have their
  // own primary tab.
  const initialTab = searchParams?.get('tab') as null
    | 'overview' | 'tasks' | 'milestones' | 'activity' | 'decisions' | 'risks' | 'briefings' | 'assets' | 'updates'
  const [activeLeft, setActiveLeft] = useState<'overview'|'tasks'|'milestones'|'evidence'|'queue'|'marketing'>(() => {
    if (initialTab === 'tasks') return 'tasks'
    if (initialTab === 'milestones') return 'milestones'
    return 'overview'
  })
  // Property popovers + task modal — all interactive now.
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [colorMenuOpen, setColorMenuOpen] = useState(false)
  const [targetOpen, setTargetOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [reportExpanded, setReportExpanded] = useState(true)
  const [reportActionItems, setReportActionItems] = useState<ReportActionItem[]>([])
  const [reportActionState, setReportActionState] = useState<'idle'|'extracting'|'ready'|'creating'|'created'|'error'>('idle')
  const [reportActionNotice, setReportActionNotice] = useState('')
  const [sendingReport, setSendingReport] = useState(false)
  const [online, setOnline] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [assignDevOpen, setAssignDevOpen] = useState(false)
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
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
      setBrandColor(getRememberedProfileAvatarColor(uid))
      const { data: prof } = await supabase.from('profiles').select('role,avatar_color').eq('id', uid).single()
      const role = (prof as any)?.role
      if (role === 'admin' || role === 'dev' || role === 'client') setUserRole(role)
      const ac = (prof as any)?.avatar_color
      if (ac) setBrandColor(ac)
      // Workspace name → the breadcrumb mark shows the workspace, mirroring
      // the sidebar switcher (one identity, not a per-page email guess).
      try {
        const { data: ws } = await supabase
          .from('workspaces').select('name')
          .eq('primary_owner_id', uid).eq('is_personal', true).maybeSingle()
        const wn = (ws as any)?.name
        if (wn && typeof wn === 'string') setWorkspaceName(wn.trim())
      } catch {}
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

  // Live colour sync — if the user changes their workspace colour in Settings
  // or the sidebar, the breadcrumb mark follows without a reload.
  useEffect(() => {
    return subscribeProfileSync((payload) => {
      if (payload.avatarColor) setBrandColor(payload.avatarColor)
    })
  }, [])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`project-report-expanded-${id}`)
      if (stored !== null) setReportExpanded(stored === 'true')
    } catch {}
    setReportActionItems([])
    setReportActionState('idle')
    setReportActionNotice('')
  }, [id])

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, aiThinking])

  async function loadEvidenceCount() {
    const { data } = await (supabase as any).from('evidence').select('id,client_visible').eq('project_id', id)
    const rows = (data as any[]) ?? []
    setEvidenceStats({ total: rows.length, client: rows.filter(r => r.client_visible).length })
  }

  async function loadAll() {
    const [{ data: proj }, { data: t }, { data: m }, { data: ai }, { data: ms }, { data: ev }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*').eq('project_id', id).order('created_at'),
      supabase.from('messages').select('*').eq('project_id', id).order('created_at'),
      supabase.from('ai_updates').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('milestones').select('*').eq('project_id', id).order('order_index', { ascending: true }),
      (supabase as any).from('evidence').select('id,client_visible').eq('project_id', id),
    ])
    if (proj) setProject(proj)
    const evRows = (ev as any[]) ?? []
    setEvidenceStats({ total: evRows.length, client: evRows.filter(r => r.client_visible).length })
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
    setStatusMenuOpen(false)
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

  // ── Project color — editable from the title dot + sidebar ──────────
  async function updateColor(color: string) {
    setColorMenuOpen(false)
    await supabase.from('projects').update({ color }).eq('id', id)
    setProject(p => p ? ({ ...p, color } as any) : p)
    // Keep the sidebar project dots in sync.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('festag-project-color-change', { detail: { id, color } }))
    }
  }

  // ── Target date — date picker in Properties ───────────────────────
  async function updateTargetDate(value: string | null) {
    setTargetOpen(false)
    await supabase.from('projects').update({ target_date: value }).eq('id', id)
    setProject(p => p ? ({ ...p, target_date: value } as any) : p)
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

Regeln: Schreibe ausschließlich auf Deutsch mit lateinischen Buchstaben — niemals chinesische, japanische, kyrillische oder andere fremde Schriftzeichen. Keine Emojis. Knapp und konkret. Beziehe dich auf konkrete Tasks wenn möglich.`,
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
      const { data: inserted, error } = await supabase.from('ai_updates').insert({ project_id: id, content, type: 'status_report' }).select().single()
      if (error) { alert(`Speicherfehler: ${error.message}`); setGeneratingAI(false); return }
      if (inserted) {
        setAiUpdates(prev => [inserted, ...prev])
        setReportExpandedPreference(true)
        setReportActionItems([])
        setReportActionState('idle')
        setReportActionNotice('')
      }
    } catch (e: any) {
      alert(`Fehler: ${e?.message ?? 'Verbindungsproblem'}`)
    }
    setGeneratingAI(false)
  }

  function setReportExpandedPreference(next: boolean) {
    setReportExpanded(next)
    try {
      window.localStorage.setItem(`project-report-expanded-${id}`, String(next))
    } catch {}
  }

  function escapeHtml(input: string) {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  function stripMarkdown(input: string) {
    return input
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim()
  }

  function buildStatusReportExportText() {
    if (!project || !latestUpdate) return ''
    return [
      `Statusbericht — ${project.title}`,
      `Stand: ${fmtDate(latestUpdate.created_at) || new Date().toLocaleDateString('de-DE')}`,
      '',
      stripMarkdown(latestUpdate.content || ''),
    ].join('\n')
  }

  function openStatusReportMailto() {
    if (!latestUpdate || !project) return
    const subject = encodeURIComponent(`Statusbericht: ${project.title}`)
    const body = encodeURIComponent(buildStatusReportExportText())
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  function downloadStatusReportPdf() {
    if (!latestUpdate || !project) return
    const content = buildStatusReportExportText()
    const title = `Statusbericht — ${project.title}`
    const win = window.open('', '_blank', 'width=840,height=1020')
    if (!win) {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${project.title.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, '-').slice(0, 48) || 'projekt'}-statusbericht.txt`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      return
    }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
      <style>
        @page { margin: 28mm 22mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:#1A1F2B; max-width:690px; margin:0 auto; line-height:1.72; font-size:13.5px; }
        h1 { margin:0 0 6px; font-size:22px; line-height:1.2; font-weight:600; letter-spacing:-.01em; }
        .meta { color:#6a738c; font-size:12px; margin:0 0 24px; }
        pre { white-space:pre-wrap; font:inherit; margin:0; }
        .brand { margin-top:34px; padding-top:14px; border-top:1px solid #E7EBF0; color:#8B94A7; font-size:11px; }
      </style></head><body>
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">${escapeHtml(fmtDate(latestUpdate.created_at) || new Date().toLocaleDateString('de-DE'))} · Festag · Tagro AI</p>
        <pre>${escapeHtml(stripMarkdown(latestUpdate.content || ''))}</pre>
        <p class="brand">Erstellt mit Festag.</p>
      </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 350)
  }

  async function copyStatusReport() {
    if (!latestUpdate) return
    try {
      await navigator.clipboard.writeText(buildStatusReportExportText())
      setReportActionNotice('Statusbericht kopiert.')
    } catch {
      setReportActionNotice('Kopieren wurde vom Browser blockiert.')
    }
  }

  async function sendStatusReportByEmail() {
    if (!latestUpdate) return
    setSendingReport(true)
    setReportActionNotice('')
    try {
      const res = await fetch('/api/briefings/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.ok) {
        setReportActionNotice('Statusbericht wurde per E-Mail gesendet.')
      } else {
        setReportActionNotice('E-Mail-Dienst nicht bereit. Mail-Entwurf wurde geöffnet.')
        openStatusReportMailto()
      }
    } catch {
      setReportActionNotice('E-Mail-Dienst nicht erreichbar. Mail-Entwurf wurde geöffnet.')
      openStatusReportMailto()
    } finally {
      setSendingReport(false)
    }
  }

  async function extractReportActionItems() {
    if (!latestUpdate) return
    setReportActionState('extracting')
    setReportActionNotice('')
    try {
      const res = await fetch('/api/tagro/status-report-action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, content: latestUpdate.content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        setReportActionState('error')
        setReportActionNotice('Tagro konnte gerade keine Aufgaben ableiten.')
        return
      }
      const items = Array.isArray(data.action_items) ? data.action_items : []
      setReportActionItems(items)
      setReportActionState(items.length ? 'ready' : 'idle')
      setReportActionNotice(items.length ? '' : 'Tagro sieht im Bericht gerade keine konkrete Aufgabe.')
    } catch {
      setReportActionState('error')
      setReportActionNotice('Tagro konnte gerade keine Aufgaben ableiten.')
    }
  }

  async function createReportActionItems() {
    if (!latestUpdate || reportActionItems.length === 0 || reportActionState === 'created') return
    setReportActionState('creating')
    setReportActionNotice('')
    try {
      const res = await fetch('/api/tagro/status-report-action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          content: latestUpdate.content,
          actionItems: reportActionItems,
          autoProcess: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        setReportActionState('error')
        setReportActionNotice('Die Aufgaben konnten gerade nicht angelegt werden.')
        return
      }
      setReportActionState('created')
      setReportActionNotice(`${(data.created || []).length || reportActionItems.length} Eintrag${((data.created || []).length || reportActionItems.length) === 1 ? '' : 'e'} übernommen.`)
      await loadAll()
    } catch {
      setReportActionState('error')
      setReportActionNotice('Die Aufgaben konnten gerade nicht angelegt werden.')
    }
  }

  // ─── Activity feed: messages + AI updates merged chronologically ───
  // useMemo MUST run unconditionally on every render (Rules of Hooks),
  // so it lives BEFORE the project-loading guard. It safely handles
  // empty arrays during the initial load.
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

  // Display name + colour for the breadcrumb workspace mark. The workspace
  // name (set in onboarding) wins, then the email local-part. The mark
  // always carries the user's chosen colour so it matches the sidebar.
  const displayName = workspaceName
    || (userEmail ? userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1) : 'Workspace')
  const displayInitial = (displayName.charAt(0) || 'W').toUpperCase()
  const crumbColor = brandColor || autoAvatarColor(userId || userEmail)
  const crumbFg = avatarTextColor(crumbColor)

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

  // Consolidated Control Status — the visible "AI control layer" line. One
  // status + one-line reason, derived from existing signals (no 2nd score).
  const controlStatus = computeControlStatus({
    taskCount: tasks.length,
    blockedCount: riskTasks.length,
    decisionCount: decisionTasks.length,
    approvalCount: approvalTasks.length,
    hasReport: Boolean(latestUpdate),
    reportAgeDays: ageInDays(latestUpdate?.created_at),
    phase: project.status,
    nextActionTitle: riskTasks[0]?.title ?? null,
    clientVisibleEvidenceCount: evidenceStats.client,
  })

  // Nexora — can the current status report go to the client?
  const reportReadiness = latestUpdate
    ? computeReportReadiness({
        reportContent: latestUpdate.content,
        blockedCount: riskTasks.length,
        decisionCount: decisionTasks.length,
        approvalCount: approvalTasks.length,
        clientVisibleEvidenceCount: evidenceStats.client,
      })
    : null

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

  return (
    <div className="pv">
      <style>{`
        .pv {
          --pv-muted: var(--text-muted, #7B8294);
          --pv-soft:  var(--text-secondary, #4E5567);
          --pv-slate: var(--accent, #5B647D);
          --pv-page-bg: var(--surface);
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
          /* colour is applied inline from the user's avatar_color */
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
        .pv-topbar-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .pv-devlink {
          display: inline-flex; align-items: center; gap: 6px;
          height: 28px; padding: 0 11px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
          background: transparent;
          color: var(--pv-soft, var(--text-secondary));
          font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .012em;
          text-decoration: none; white-space: nowrap;
          transition: background .14s, color .14s, border-color .14s;
        }
        .pv-devlink:hover {
          background: color-mix(in srgb, var(--surface-2) 70%, transparent);
          color: var(--text); border-color: var(--border);
        }
        .pv-capture-btn,
        .pv-tagro-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 28px; padding: 0 12px;
          border-radius: 999px;
          border: 0;
          font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .012em;
          cursor: pointer; white-space: nowrap;
          transition: background .14s, transform .14s;
        }
        .pv-capture-btn:active,
        .pv-tagro-btn:active { transform: scale(.98); }
        .pv-tagro-btn {
          background: #5B647D; color: #fff;
          box-shadow: 0 8px 18px -10px rgba(91,100,125,0.6);
        }
        .pv-tagro-btn:hover { background: #4d566c; }
        .pv-capture-btn {
          background: transparent; color: var(--text);
          border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
        }
        .pv-capture-btn:hover {
          background: color-mix(in srgb, var(--surface-2) 70%, transparent);
        }
        .pv-capture-btn--locked {
          opacity: .5; cursor: not-allowed;
          color: var(--text-muted);
        }
        .pv-capture-btn--locked:hover { background: transparent; }

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
          cursor: pointer; text-decoration: none;
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
          line-height: 1.12;
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

        /* Verantwortlich row — show the dev avatar stack right-aligned; the
           "Noch offen" fallback hides itself as soon as avatars render. */
        .pv-side-row--dev .pv-side-row-val { display: flex; justify-content: flex-end; align-items: center; overflow: visible; }
        .pv-side-dev-empty { color: var(--pv-muted); }
        .pv-side-row--dev .pv-side-row-val:has(.pda-wrap) .pv-side-dev-empty { display: none; }

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

        /* ── v2 rebuild: color dot, popovers, notepad report, tabs ─── */
        .pv-crumb-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

        .pv-title-head { display: flex; align-items: center; gap: 13px; }
        .pv-color-wrap { position: relative; display: flex; align-items: center; flex-shrink: 0; }
        /* Vertical accent bar (editable) — centered to the title, not a dot. */
        .pv-color-bar {
          width: 5px; height: 26px; border-radius: 3px;
          border: 0; padding: 0; cursor: pointer; flex-shrink: 0;
          transition: opacity .15s ease;
        }
        .pv-color-bar:hover { opacity: .82; }
        .pv-color-pop {
          position: absolute; left: 0; top: calc(100% + 8px); z-index: 60;
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
          padding: 10px; border-radius: 12px;
          background: var(--surface); border: 1px solid var(--border);
          box-shadow: 0 16px 40px rgba(0,0,0,.3);
        }
        .pv-color-swatch {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid transparent; cursor: pointer; padding: 0;
          transition: transform .12s ease;
        }
        .pv-color-swatch:hover { transform: scale(1.12); }
        .pv-color-swatch.on { border-color: var(--text); }

        /* Popover primitives */
        .pv-pop-wrap { position: relative; }
        .pv-pop-backdrop { position: fixed; inset: 0; z-index: 55; }
        .pv-menu {
          position: absolute; left: 0; top: calc(100% + 6px); z-index: 60;
          min-width: 190px; padding: 5px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; box-shadow: 0 16px 40px rgba(0,0,0,.3);
          display: flex; flex-direction: column; gap: 1px;
        }
        .pv-menu-pad { padding: 10px; gap: 8px; }
        .pv-menu-item {
          display: flex; align-items: center; gap: 8px;
          min-height: 32px; padding: 0 9px;
          border: 0; background: transparent; border-radius: 7px;
          color: var(--text); font: inherit; font-size: 12.5px;
          letter-spacing: var(--ls-body, .017em); cursor: pointer;
          text-align: left;
        }
        .pv-menu-item:hover { background: var(--surface-2); }
        .pv-menu-item.on { color: var(--text); }
        .pv-menu-check { margin-left: auto; color: var(--pv-muted); }
        .pv-date-input {
          width: 100%; height: 36px; padding: 0 10px;
          border: 1px solid var(--border); border-radius: 8px;
          background: var(--card); color: var(--text);
          font: inherit; font-size: 13px; outline: none;
          color-scheme: dark;
        }

        .pv-chip-btn { cursor: pointer; }
        .pv-chip-btn:disabled { cursor: default; opacity: .8; }
        .pv-chip-btn:hover:not(:disabled) { background: var(--surface-2); border-color: var(--border); }

        /* Status report — notepad, no box */
        .pv-report {
          display: flex; flex-direction: column; gap: 12px;
          padding-top: 8px;
          border-top: 1px solid color-mix(in srgb, var(--border) 45%, transparent);
        }
        .pv-report-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .pv-report-label {
          font-size: 13px; color: var(--text);
          letter-spacing: var(--ls-body, .017em);
        }
        .pv-report-title-row {
          display: inline-flex; align-items: center; gap: 8px;
          min-width: 0;
        }
        .pv-report-actions {
          display: inline-flex; align-items: center; justify-content: flex-end;
          gap: 6px; flex-wrap: wrap;
        }
        .pv-report-btn {
          height: 28px; padding: 0 10px;
          display: inline-flex; align-items: center; justify-content: center; gap: 5px;
          border: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
          border-radius: 8px;
          background: transparent;
          color: var(--pv-soft);
          font: inherit; font-size: 11.5px;
          cursor: pointer;
          transition: background .12s ease, border-color .12s ease, color .12s ease;
        }
        .pv-report-btn:hover:not(:disabled) {
          background: color-mix(in srgb, var(--surface-2) 72%, transparent);
          border-color: color-mix(in srgb, var(--border-strong) 56%, var(--border));
          color: var(--text);
        }
        .pv-report-btn:disabled {
          cursor: default; opacity: .58;
        }
        .pv-report-btn.icon-only {
          width: 28px; padding: 0; gap: 0;
        }
        .pv-report-btn.primary {
          border-color: color-mix(in srgb, var(--pv-slate) 42%, var(--border));
          background: color-mix(in srgb, var(--pv-slate) 12%, transparent);
          color: var(--text);
        }
        .pv-report-meta {
          display: flex; align-items: center; gap: 6px;
          font-size: 11.5px; color: var(--pv-muted);
        }
        .pv-report-collapsed {
          max-width: 680px;
          padding: 10px 0 2px;
          color: var(--pv-muted);
          font-size: 13px;
          line-height: 1.55;
        }
        .pv-report-collapsed p {
          margin: 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .pv-report-body {
          font-size: 14.5px; line-height: 1.75; color: var(--text);
          letter-spacing: var(--ls-body, .017em);
          max-width: 680px;
        }
        .pv-report-body p { margin: 0 0 12px; color: var(--pv-soft); }
        .pv-report-body strong { color: var(--text); font-weight: 500; }
        .pv-report-body h1, .pv-report-body h2, .pv-report-body h3 {
          font-size: 14.5px; color: var(--text); margin: 18px 0 8px;
          letter-spacing: var(--ls-header, .012em);
        }
        .pv-report-body ul, .pv-report-body ol { margin: 0 0 12px; padding-left: 18px; color: var(--pv-soft); }
        .pv-report-body li { margin: 0 0 5px; }
        .pv-report-empty {
          margin: 0; font-size: 13.5px; line-height: 1.6;
          color: var(--pv-muted); max-width: 560px;
          letter-spacing: var(--ls-body, .017em);
        }
        .pv-report-ai-panel {
          max-width: 680px;
          border: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
          border-radius: 10px;
          padding: 12px;
          background: color-mix(in srgb, var(--surface-2) 44%, transparent);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pv-report-ai-head {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          font-size: 12px; color: var(--pv-muted);
        }
        .pv-report-ai-head strong {
          color: var(--text);
          font-size: 12.5px;
        }
        .pv-report-ai-list {
          display: flex; flex-direction: column; gap: 8px;
        }
        .pv-report-ai-item {
          display: grid; grid-template-columns: 24px minmax(0, 1fr);
          gap: 9px;
          padding: 9px;
          border-radius: 8px;
          background: color-mix(in srgb, var(--card) 72%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 48%, transparent);
        }
        .pv-report-ai-icon {
          width: 24px; height: 24px;
          border-radius: 8px;
          display: inline-flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--pv-slate) 14%, transparent);
          color: var(--pv-slate);
        }
        .pv-report-ai-item strong {
          display: block;
          color: var(--text);
          font-size: 12.5px;
          margin-bottom: 3px;
        }
        .pv-report-ai-item p {
          margin: 0;
          color: var(--pv-soft);
          font-size: 12px;
          line-height: 1.5;
        }
        .pv-report-ai-foot {
          display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
        }
        .pv-report-ai-foot span {
          color: var(--pv-muted); font-size: 11.5px;
        }
        .pv-spin {
          display: inline-block; width: 11px; height: 11px; margin-right: 6px;
          border: 1.5px solid currentColor; border-top-color: transparent;
          border-radius: 50%; animation: spin .7s linear infinite; vertical-align: -1px;
        }

        /* Tasks tab bar */
        .pv-tasks-bar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }
        .pv-tasks-count { font-size: 12.5px; color: var(--pv-muted); letter-spacing: var(--ls-body, .017em); }
        .pv-tasks-add-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 14px; border-radius: 8px;
          border: 0; background: var(--btn-prim, #5B647D); color: var(--btn-prim-text, #fff);
          font: inherit; font-size: 12.5px; font-weight: 500; letter-spacing: var(--ls-body, .017em);
          cursor: pointer; transition: opacity .15s ease, transform .15s ease;
        }
        .pv-tasks-add-btn:hover:not(:disabled) { opacity: .92; transform: translateY(-1px); }
        .pv-tasks-add-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* Milestones tab */
        .pv-ms-tab { max-width: 760px; display: flex; flex-direction: column; gap: 18px; }
        .pv-ms-tab-head {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;
        }
        .pv-ms-tab-title { margin: 0; font-size: 18px; font-weight: 500; color: var(--text); letter-spacing: var(--ls-header, .012em); }
        .pv-ms-tab-sub { margin: 4px 0 0; font-size: 12.5px; color: var(--pv-muted); letter-spacing: var(--ls-body, .017em); }
        .pv-ms-tab-total { text-align: right; flex-shrink: 0; }
        .pv-ms-tab-total-num { display: block; font-size: 22px; font-weight: 500; color: var(--text); letter-spacing: var(--ls-header, .012em); font-variant-numeric: tabular-nums; }
        .pv-ms-tab-total-label { font-size: 11px; color: var(--pv-muted); letter-spacing: var(--ls-body, .017em); }
        .pv-ms-list { display: flex; flex-direction: column; gap: 8px; }
        .pv-ms-card {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 16px 18px; border-radius: 14px;
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          background: color-mix(in srgb, var(--surface-2) 28%, transparent);
          flex-wrap: wrap;
        }
        .pv-ms-card.locked { opacity: .62; }
        .pv-ms-card .pv-status-dot { margin-top: 5px; }
        .pv-ms-card-main { flex: 1; min-width: 180px; }
        .pv-ms-card-title { margin: 0; font-size: 14px; color: var(--text); letter-spacing: var(--ls-body, .017em); }
        .pv-ms-card-desc { margin: 3px 0 0; font-size: 12.5px; color: var(--pv-muted); line-height: 1.5; }
        .pv-ms-card-gate { display: inline-block; margin-top: 8px; font-size: 11px; color: var(--pv-muted); }
        .pv-ms-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        .pv-ms-card-amount { font-size: 15px; color: var(--text); font-variant-numeric: tabular-nums; letter-spacing: var(--ls-header, .012em); }
        .pv-ms-pay {
          height: 30px; padding: 0 14px; border-radius: 8px;
          border: 0; background: var(--btn-prim, #5B647D); color: var(--btn-prim-text, #fff);
          font: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
          align-self: center;
        }
        .pv-ms-pay:hover { opacity: .92; }

        /* Sidebar clickable values */
        .pv-side-btn {
          border: 0; background: transparent; cursor: pointer;
          font: inherit; padding: 2px 0; text-align: right;
          transition: color .12s ease;
        }
        .pv-side-btn:hover:not(:disabled) { color: var(--text); text-decoration: underline; text-underline-offset: 2px; }
        .pv-side-btn:disabled { cursor: default; }

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
        onContinue={() => { setCelebrationOpen(false); setActiveLeft('overview'); generateAIUpdate() }}
      />

      <DeleteProjectModal
        open={deleteOpen}
        projectId={project.id}
        projectTitle={project.title}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => { setDeleteOpen(false); window.location.href = '/dashboard' }}
      />

      <AssignDevModal
        open={assignDevOpen}
        projectId={project.id}
        projectTitle={project.title}
        onClose={() => setAssignDevOpen(false)}
      />

      {/* ─── TOP BAR — workspace breadcrumb ─── */}
      <header className="pv-topbar">
        <div className="pv-crumbs">
          <Link href="/dashboard" className="pv-crumb">
            <span className="pv-crumb-mark" style={{ background: crumbColor, color: crumbFg }}>{displayInitial}</span>
            <span>{displayName}</span>
          </Link>
          <CaretRight size={11} weight="bold" className="pv-crumb-sep" />
          <Link href="/dashboard" className="pv-crumb">Projects</Link>
          <CaretRight size={11} weight="bold" className="pv-crumb-sep" />
          <span className="pv-crumb pv-crumb-current">
            <span className="pv-crumb-dot" style={{ background: pCol }} />
            {project.title}
          </span>
          <button className="pv-icon-btn" title="Favorit"><Star size={13} /></button>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              className="pv-icon-btn"
              title="Mehr"
              aria-haspopup="menu"
              aria-expanded={projectMenuOpen}
              onClick={() => setProjectMenuOpen(o => !o)}
            ><DotsThree size={14} weight="bold" /></button>
            {projectMenuOpen && (
              <>
                <div
                  onClick={() => setProjectMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 60 }}
                />
                <div
                  role="menu"
                  style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 61,
                    minWidth: 184, padding: 5,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, boxShadow: '0 16px 40px rgba(0,0,0,.18)',
                  }}
                >
                  <button
                    role="menuitem"
                    onClick={() => { setProjectMenuOpen(false); setAssignDevOpen(true) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 10px', borderRadius: 7, border: 0, background: 'transparent',
                      color: 'var(--text)', font: 'inherit', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <UserPlus size={14} /> Entwickler zuweisen
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { setProjectMenuOpen(false); setDeleteOpen(true) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 10px', borderRadius: 7, border: 0, background: 'transparent',
                      color: 'var(--red,#D14343)', font: 'inherit', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--red,#D14343) 10%, transparent)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <Trash size={14} /> Projekt löschen
                  </button>
                </div>
              </>
            )}
          </span>
        </div>
        <div className="pv-topbar-right">
          {/* Tagro overlay — primary AI entry on every project. */}
          <button
            type="button"
            className="pv-tagro-btn"
            title="Mit Tagro bearbeiten"
            onClick={() => openTagro({ contextType: 'project', id, title: project.title, projectId: id })}
          >
            <Sparkle size={13} weight="fill" /> Mit Tagro
          </button>
          {/* Capture Loop entry — disabled until the project has a staging
              URL set. The button shows a different label + tooltip in each
              state so the client never wonders why nothing happens. */}
          {project.staging_url ? (
            <button
              type="button"
              className="pv-capture-btn"
              title={`Live-Feedback aufnehmen — Tagro hört zu, während du durch ${project.staging_url} gehst.`}
              onClick={() => openCapture({
                projectId: id,
                projectTitle: project.title,
                defaultUrl: project.staging_url || undefined,
              })}
            >
              <Microphone size={13} /> Live-Feedback
            </button>
          ) : (
            <span
              className="pv-capture-btn pv-capture-btn--locked"
              title="Live-Feedback ist aktiv, sobald dein Developer eine Staging-URL hinterlegt hat."
              aria-disabled="true"
            >
              <Microphone size={13} /> Live-Feedback · gesperrt
            </span>
          )}
          {/* Bidirectional link: dev/admin jump to the SAME project in the
              Dev Panel (execution side). Hidden for clients. */}
          {canEdit && (
            <Link href={`/dev/projects/${id}`} className="pv-devlink" title="Im Dev-Panel öffnen">
              <Wrench size={13} /> Dev-Panel
            </Link>
          )}
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
        >Übersicht</button>
        <button
          role="tab" aria-selected={activeLeft === 'tasks'}
          className={`pv-tab${activeLeft === 'tasks' ? ' on' : ''}`}
          onClick={() => setActiveLeft('tasks')}
        >
          Tasks
          {tasks.length > 0 && <span className="pv-tab-count">{tasks.length}</span>}
        </button>
        <button
          role="tab" aria-selected={activeLeft === 'milestones'}
          className={`pv-tab${activeLeft === 'milestones' ? ' on' : ''}`}
          onClick={() => setActiveLeft('milestones')}
        >
          Meilensteine
          {milestones.length > 0 && <span className="pv-tab-count">{milestones.length}</span>}
        </button>
        <button
          role="tab" aria-selected={activeLeft === 'evidence'}
          className={`pv-tab${activeLeft === 'evidence' ? ' on' : ''}`}
          onClick={() => setActiveLeft('evidence')}
        >Belege</button>
        <button
          role="tab" aria-selected={activeLeft === 'queue'}
          className={`pv-tab${activeLeft === 'queue' ? ' on' : ''}`}
          onClick={() => setActiveLeft('queue')}
        >Zeitplan</button>
        <Link
          href={`/decisions?project=${project.id}`}
          className="pv-tab"
        >
          Entscheidungen
          {decisionTasks.length > 0 && <span className="pv-tab-count">{decisionTasks.length}</span>}
        </Link>
        {projectType === 'marketing' && (
          <button
            role="tab" aria-selected={activeLeft === 'marketing'}
            className={`pv-tab${activeLeft === 'marketing' ? ' on' : ''}`}
            onClick={() => setActiveLeft('marketing')}
          >Marketing</button>
        )}
      </nav>

      {/* ─── BODY: main + right sidebar ─── */}
      <div className="pv-body">
        <main className="pv-main">

          {/* OVERVIEW */}
          {activeLeft === 'overview' && (
            <div className="pv-overview">
              {/* Title row — color dot (editable) replaces the cube icon */}
              <div className="pv-title-head">
                <div className="pv-color-wrap">
                  <button
                    type="button"
                    className="pv-color-bar"
                    style={{ background: pCol }}
                    onClick={() => canEdit && setColorMenuOpen((v) => !v)}
                    title={canEdit ? 'Projektfarbe ändern' : undefined}
                    aria-label="Projektfarbe"
                  />
                  {colorMenuOpen && (
                    <>
                      <div className="pv-pop-backdrop" onClick={() => setColorMenuOpen(false)} />
                      <div className="pv-color-pop" role="menu">
                        {PROJECT_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`pv-color-swatch${(project as any).color === c ? ' on' : ''}`}
                            style={{ background: c }}
                            onClick={() => updateColor(c)}
                            aria-label={`Farbe ${c}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <h1 className="pv-hero-title">{project.title}</h1>
              </div>

              {project.description && <p className="pv-hero-summary">{project.description}</p>}

              {/* Properties — every chip is interactive */}
              <div className="pv-prop-row">
                <span className="pv-prop-label">Eigenschaften</span>

                {/* Status */}
                <div className="pv-pop-wrap">
                  <button
                    type="button"
                    className="pv-chip pv-chip-btn"
                    onClick={() => canEdit && setStatusMenuOpen((v) => !v)}
                    disabled={!canEdit}
                  >
                    <span className={`pv-status-dot tone-${PHASE_TONE[project.status] || 'muted'}`} />
                    {PHASE_LABEL[project.status] ?? project.status}
                  </button>
                  {statusMenuOpen && (
                    <>
                      <div className="pv-pop-backdrop" onClick={() => setStatusMenuOpen(false)} />
                      <div className="pv-menu" role="menu">
                        {PHASES.map((ph) => (
                          <button
                            key={ph}
                            type="button"
                            className={`pv-menu-item${project.status === ph ? ' on' : ''}`}
                            onClick={() => updateStatus(ph)}
                          >
                            <span className={`pv-status-dot tone-${PHASE_TONE[ph] || 'muted'}`} />
                            {PHASE_LABEL[ph]}
                            {project.status === ph && <Check size={12} weight="bold" className="pv-menu-check" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {projectType && (
                  <span className="pv-chip pv-chip-mute">{typePreset?.label || projectType}</span>
                )}

                {/* Target date */}
                <div className="pv-pop-wrap">
                  <button
                    type="button"
                    className="pv-chip pv-chip-btn"
                    onClick={() => canEdit && setTargetOpen((v) => !v)}
                    disabled={!canEdit}
                  >
                    <Target size={11} />
                    {fmtDate((project as any).target_date) || 'Zieldatum'}
                  </button>
                  {targetOpen && (
                    <>
                      <div className="pv-pop-backdrop" onClick={() => setTargetOpen(false)} />
                      <div className="pv-menu pv-menu-pad" role="menu">
                        <input
                          type="date"
                          className="pv-date-input"
                          defaultValue={(project as any).target_date || ''}
                          onChange={(e) => updateTargetDate(e.target.value || null)}
                          autoFocus
                        />
                        {(project as any).target_date && (
                          <button type="button" className="pv-menu-item" onClick={() => updateTargetDate(null)}>
                            Zieldatum entfernen
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Vorschau-URL — small chip, URL lives in the popover. */}
                <ProjectUrlBar
                  projectId={id}
                  stagingUrl={project.staging_url || null}
                  liveUrl={project.live_url || null}
                  canEdit={canEdit}
                  onSaved={(patch) => setProject(p => p ? { ...p, ...patch } as Project : p)}
                />

                <span className="pv-chip pv-chip-mute">{displayName}</span>
              </div>

              {/* Statusbericht — notepad style, no box. When a report exists
                  it stands alone; the rest of overview stays minimal. */}
              <section className="pv-report">
                <div className="pv-report-head">
                  <span className="pv-report-title-row">
                    <span className="pv-report-label">Statusbericht</span>
                    {latestUpdate ? (
                      <button
                        type="button"
                        className="pv-report-btn icon-only"
                        onClick={() => setReportExpandedPreference(!reportExpanded)}
                        title={reportExpanded ? 'Einklappen' : 'Ausklappen'}
                        aria-label={reportExpanded ? 'Einklappen' : 'Ausklappen'}
                      >
                        {reportExpanded ? <CaretUp size={13} /> : <CaretDown size={13} />}
                      </button>
                    ) : null}
                  </span>
                  <div className="pv-report-actions">
                    {latestUpdate ? (
                      <>
                        <button type="button" className="pv-report-btn icon-only" onClick={downloadStatusReportPdf} title="Als PDF herunterladen" aria-label="Als PDF herunterladen">
                          <FilePdf size={14} />
                        </button>
                        <button type="button" className="pv-report-btn icon-only" onClick={sendStatusReportByEmail} disabled={sendingReport} title="Per E-Mail senden" aria-label="Per E-Mail senden">
                          {sendingReport ? <span className="pv-spin" aria-hidden /> : <EnvelopeSimple size={14} />}
                        </button>
                        <button type="button" className="pv-report-btn icon-only" onClick={copyStatusReport} title="Kopieren" aria-label="Kopieren">
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          className="pv-report-btn primary"
                          onClick={extractReportActionItems}
                          disabled={reportActionState === 'extracting' || reportActionState === 'creating'}
                        >
                          {reportActionState === 'extracting' ? <span className="pv-spin" aria-hidden /> : <Sparkle size={13} />}
                          Tasks ableiten
                        </button>
                      </>
                    ) : null}
                    <button className="pv-update-btn" onClick={generateAIUpdate} disabled={generatingAI}>
                      {generatingAI
                        ? <><span className="pv-spin" aria-hidden />Tagro schreibt…</>
                        : latestUpdate ? 'Aktualisieren' : 'Statusbericht erstellen'}
                    </button>
                    <button
                      type="button"
                      className="pv-report-btn primary"
                      onClick={() => openTagro({
                        contextType: latestUpdate ? 'status_report' : 'project',
                        id,
                        title: project.title,
                        subtitle: latestUpdate ? 'Statusbericht' : 'Projekt',
                        projectId: id,
                      })}
                    >
                      <Sparkle size={13} /> Mit Tagro bearbeiten
                    </button>
                  </div>
                </div>

                {latestUpdate ? (
                  <>
                    <div className="pv-report-meta">
                      <span className="pv-status-dot tone-good" />
                      <span>{displayName}</span>
                      <span className="pv-sep">·</span>
                      <span>{fmtAgo(latestUpdate.created_at)}</span>
                    </div>
                    {reportReadiness && (
                      <div
                        title={reportReadiness.checks.map(c => `${c.ok ? '✓' : '•'} ${c.label}`).join('\n')}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          margin: '2px 0 2px', padding: '5px 11px 5px 9px',
                          borderRadius: 999, width: 'fit-content',
                          background: `color-mix(in srgb, ${reportReadiness.color} 12%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${reportReadiness.color} 30%, transparent)`,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: reportReadiness.color, flexShrink: 0 }} aria-hidden />
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', letterSpacing: '.01em' }}>
                          Nexora: {reportReadiness.label}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '.01em' }}>
                          {reportReadiness.reason}
                        </span>
                      </div>
                    )}
                    {reportExpanded ? (
                      <div className="pv-report-body">
                        <ChatMarkdown text={latestUpdate.content || ''} />
                      </div>
                    ) : (
                      <div className="pv-report-collapsed">
                        <p>{stripMarkdown(latestUpdate.content || '').slice(0, 260)}{(latestUpdate.content || '').length > 260 ? '…' : ''}</p>
                      </div>
                    )}
                    {(reportActionItems.length > 0 || reportActionNotice || reportActionState === 'extracting' || reportActionState === 'creating') ? (
                      <div className="pv-report-ai-panel">
                        <div className="pv-report-ai-head">
                          <div>
                            <strong>Tagro Aufgaben-Vorschläge</strong>
                            <span> · aus diesem Statusbericht</span>
                          </div>
                          {(reportActionState === 'extracting' || reportActionState === 'creating') ? <span><span className="pv-spin" aria-hidden />arbeitet…</span> : null}
                        </div>
                        {reportActionItems.length > 0 ? (
                          <div className="pv-report-ai-list">
                            {reportActionItems.map((item, index) => (
                              <article className="pv-report-ai-item" key={`${item.title}-${index}`}>
                                <span className="pv-report-ai-icon"><Sparkle size={13} weight="bold" /></span>
                                <div>
                                  <strong>{item.title}</strong>
                                  {item.description ? <p>{item.description}</p> : null}
                                  <p>{item.priority ? `Priorität: ${item.priority}` : 'Priorität: mittel'} · {item.owner_type === 'client' ? 'Kundenseitig' : item.type === 'decision' ? 'Entscheidung' : 'Projektteam'}</p>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : null}
                        <div className="pv-report-ai-foot">
                          <span>{reportActionNotice || 'Prüfe die Vorschläge, bevor Tagro sie in den Workflow übernimmt.'}</span>
                          {reportActionItems.length > 0 ? (
                            <div className="pv-report-actions">
                              <button type="button" className="pv-report-btn" onClick={() => { setReportActionItems([]); setReportActionState('idle'); setReportActionNotice('Vorschläge verworfen.') }}>
                                Ablehnen
                              </button>
                              <button type="button" className="pv-report-btn" onClick={extractReportActionItems} disabled={reportActionState === 'extracting' || reportActionState === 'creating'}>
                                Neu prüfen
                              </button>
                              <button type="button" className="pv-report-btn primary" onClick={createReportActionItems} disabled={reportActionState === 'creating' || reportActionState === 'created'}>
                                {reportActionState === 'created' ? 'Übernommen' : 'Übernehmen'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="pv-report-empty">
                    Tagro verdichtet den aktuellen Projektstand in einen ruhigen Bericht — Fortschritt, offene Punkte, nächste Schritte. Klick auf „Statusbericht erstellen".
                  </p>
                )}
              </section>

            </div>
          )}

          {/* TASKS */}
          {activeLeft === 'tasks' && (
            <div className="pv-tasks">
              <div className="pv-tasks-bar">
                <span className="pv-tasks-count">{tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}</span>
                <button
                  className="pv-tasks-add-btn"
                  onClick={() => setTaskModalOpen(true)}
                  disabled={eff === 'client' && clientRemaining === 0}
                >
                  <Plus size={13} weight="bold" />
                  {eff === 'client' && clientRemaining === 0 ? 'Wochenlimit erreicht' : 'Task hinzufügen'}
                </button>
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

          {/* MEILENSTEINE */}
          {activeLeft === 'milestones' && (
            <div className="pv-ms-tab">
              <div className="pv-ms-tab-head">
                <div>
                  <h2 className="pv-ms-tab-title">Meilensteine & Zahlungen</h2>
                  <p className="pv-ms-tab-sub">Mollie · SEPA · DSGVO-konform abgewickelt.</p>
                </div>
                <div className="pv-ms-tab-total">
                  <span className="pv-ms-tab-total-num">€{milestones.reduce((s, m) => s + (m.amount || 0), 0).toLocaleString('de')}</span>
                  <span className="pv-ms-tab-total-label">Gesamtbudget</span>
                </div>
              </div>

              {milestones.length === 0 ? (
                <p className="pv-empty">Noch keine Meilensteine angelegt.</p>
              ) : (
                <div className="pv-ms-list">
                  {milestones.map((m) => {
                    const isPaid = m.status === 'paid'
                    const isPending = m.status === 'pending'
                    const isLocked = m.status === 'locked'
                    const tone = isPaid ? 'good' : isPending ? 'amber' : 'muted'
                    const gateLabel = isPaid ? 'Freigegeben' : isPending ? 'Freischalten zum Start' : 'Vorheriger Schritt nötig'
                    return (
                      <div key={m.id} className={`pv-ms-card${isLocked ? ' locked' : ''}`}>
                        <span className={`pv-status-dot tone-${tone}`} />
                        <div className="pv-ms-card-main">
                          <p className="pv-ms-card-title">{m.title}</p>
                          {m.description && <p className="pv-ms-card-desc">{m.description}</p>}
                          <span className="pv-ms-card-gate">{gateLabel}</span>
                        </div>
                        <div className="pv-ms-card-right">
                          <span className="pv-ms-card-amount">€{m.amount.toLocaleString('de')}</span>
                          <span className={`pv-pill tone-${tone}`}>
                            {isPaid ? 'Bezahlt' : isPending ? 'Fällig' : 'Gesperrt'}
                          </span>
                        </div>
                        {isPending && !canEdit && (
                          <button className="pv-ms-pay" onClick={() => payMilestone(m)}>
                            Freischalten →
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeLeft === 'evidence' && (
            <div className="pv-pane">
              <ProofGridSection projectId={id} canEdit={canEdit} onChange={loadEvidenceCount} />
              {canEdit && (
                <div style={{ marginTop: 28 }}>
                  <AssetsPanel projectId={id} workspaceId={null} />
                </div>
              )}
            </div>
          )}

          {activeLeft === 'queue' && (
            <div className="pv-pane">
              <TagroQueueSection projectId={id} canEdit={canEdit} />
            </div>
          )}

          {activeLeft === 'marketing' && (
            <div className="pv-pane">
              <MarketingPanelSection projectId={id} canEdit={canEdit} />
            </div>
          )}

        </main>

        {/* ─── RIGHT SIDEBAR — Properties only (clickable) ─── */}
        <aside className="pv-sidebar">
          <section className="pv-side-section">
            <header><span>Eigenschaften</span></header>
            {/* Control Status — the consolidated "is this under control + why" line */}
            <div
              title={controlStatus.reason}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '2px 0 13px', marginBottom: 9,
                borderBottom: '1px solid color-mix(in srgb, var(--border) 45%, transparent)',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: controlStatus.color, marginTop: 5, flexShrink: 0 }} aria-hidden />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <strong style={{ fontSize: 13, color: 'var(--text)', letterSpacing: '.01em' }}>{controlStatus.label}</strong>
                <small style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--pv-muted)', letterSpacing: '.01em' }}>{controlStatus.reason}</small>
              </span>
            </div>
            <div className="pv-side-rows">
              {/* Status — jumps to Overview where the phase menu is anchored */}
              <div className="pv-side-row">
                <span className="pv-side-row-key">Status</span>
                <button
                  type="button"
                  className="pv-side-row-val pv-side-btn"
                  onClick={() => { if (canEdit) { setActiveLeft('overview'); setStatusMenuOpen(true) } }}
                  disabled={!canEdit}
                >
                  <span className={`pv-status-dot tone-${PHASE_TONE[project.status] || 'muted'}`} style={{ display: 'inline-block', marginRight: 6 }} />
                  {PHASE_LABEL[project.status] ?? project.status}
                </button>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Typ</span>
                <span className="pv-side-row-val">{typePreset?.label || projectType || '—'}</span>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Owner</span>
                <span className="pv-side-row-val">{displayName}</span>
              </div>
              {/* Verantwortlicher Dev — wer baut das, unabhängig vom Workspace.
                  Rendert nichts, solange kein Dev eingetragen ist. */}
              <div className="pv-side-row pv-side-row--dev">
                <span className="pv-side-row-key">Verantwortlich</span>
                <span className="pv-side-row-val">
                  <ProjectDevAvatars projectId={id} max={3} />
                  <span className="pv-side-dev-empty">Noch offen</span>
                </span>
              </div>
              {/* Target date — jumps to Overview where the picker is anchored */}
              <div className="pv-side-row">
                <span className="pv-side-row-key">Zieldatum</span>
                <button
                  type="button"
                  className="pv-side-row-val pv-side-btn"
                  onClick={() => { if (canEdit) { setActiveLeft('overview'); setTargetOpen(true) } }}
                  disabled={!canEdit}
                  style={{ color: (project as any).target_date ? 'var(--text)' : 'var(--pv-muted)' }}
                >
                  {fmtDate((project as any).target_date) || 'Festlegen'}
                </button>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Risiko</span>
                <span className="pv-side-row-val"><span className={`pv-pill tone-${riskState.tone}`}>{riskState.label}</span></span>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Zahlung</span>
                <span className="pv-side-row-val"><span className={`pv-pill tone-${paymentState.tone}`}>{paymentState.label}</span></span>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Qualität</span>
                <span className="pv-side-row-val"><span className={`pv-pill tone-${qualityGate.tone}`}>{qualityGate.label}</span></span>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Belege</span>
                <button type="button" className="pv-side-row-val pv-side-btn" onClick={() => setActiveLeft('evidence')}>
                  {evidenceStats.total === 0 ? 'Hinzufügen' : `${evidenceStats.total} · ${evidenceStats.client} für Kunde`}
                </button>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Entscheidungen</span>
                <Link href={`/decisions?project=${id}`} className="pv-side-row-val pv-side-link">
                  {decisionTasks.length > 0 ? `${decisionTasks.length} offen` : 'Keine offen'}
                </Link>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Website-Inhalte</span>
                <Link href={`/project/${id}/inhalte`} className="pv-side-row-val pv-side-link">Öffnen</Link>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Meilensteine</span>
                <button type="button" className="pv-side-row-val pv-side-btn" onClick={() => setActiveLeft('milestones')}>
                  {milestones.length} · ansehen
                </button>
              </div>
              <div className="pv-side-row">
                <span className="pv-side-row-key">Tasks</span>
                <button type="button" className="pv-side-row-val pv-side-btn" onClick={() => setActiveLeft('tasks')}>
                  {tasks.length}
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* Task creation — opens with this project pre-assigned + locked. */}
      {taskModalOpen && (
        <NewTaskModal
          defaultProjectId={project.id}
          onClose={() => setTaskModalOpen(false)}
          onCreated={() => { setTaskModalOpen(false); loadAll() }}
        />
      )}

      {/* Mobile floating action bar: 2 buttons (edit + Mit Tagro bearbeiten).
          Renders only on mobile; hides under the chat composer focus signal. */}
      <TagroMobileBar
        context={{ type: 'project', id, title: project.title }}
        leftLabel="Projekt bearbeiten"
        leftIcon={<PencilSimple size={17} weight="regular" />}
        onLeft={canEdit ? () => setActiveLeft('overview') : undefined}
      />

      {/* Mobile top-right 3-dot menu: context-aware project actions. Hidden on
          desktop. Never duplicates 'Mit Tagro bearbeiten' (that stays in the
          bottom floating bar). */}
      <MobileObjectMenu
        title={`Projekt · ${project.title}`}
        items={[
          { label: 'Neue Aufgabe', icon: <Plus size={16} />, onClick: () => setTaskModalOpen(true) },
          { label: 'Statusbericht erstellen', icon: <Sparkle size={16} />, onClick: generateAIUpdate },
          { label: 'Tasks öffnen', icon: <ListChecks size={16} />, onClick: () => setActiveLeft('tasks') },
          { label: 'Belege öffnen', icon: <ShieldCheck size={16} />, onClick: () => setActiveLeft('evidence') },
          { label: 'Meilensteine öffnen', icon: <Receipt size={16} />, onClick: () => setActiveLeft('milestones') },
          { label: 'Zeitplan öffnen', icon: <ClockClockwise size={16} />, onClick: () => setActiveLeft('queue') },
          ...(canEdit ? [{ label: 'Projekt löschen', icon: <Trash size={16} />, onClick: () => setDeleteOpen(true), destructive: true }] : []),
        ]}
      />
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
