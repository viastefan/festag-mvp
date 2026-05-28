'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getTaskGroup, type TaskGroupKey } from '@/lib/tasks/groups'
import { taskStatusPatch } from '@/lib/tasks/status'
import TagroLogo from '@/components/TagroLogo'
import NewTaskModal from '@/components/NewTaskModal'
import {
  ArrowLeft,
  Brain,
  CalendarBlank,
  CheckCircle,
  Clock,
  Code,
  FileText,
  Flag,
  Gauge,
  GitBranch,
  Globe,
  Link as LinkIcon,
  Pause,
  Palette,
  Plugs,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  Tag,
  Trash,
  UserCircle,
  UsersThree,
  WarningCircle,
} from '@phosphor-icons/react'

type TaskDetail = {
  id: string
  title: string
  description?: string | null
  client_description?: string | null
  dev_description?: string | null
  status?: string | null
  priority?: string | null
  project_id?: string | null
  assigned_to?: string | null
  created_by?: string | null
  approved_by?: string | null
  owner?: string | null
  developer_name?: string | null
  source?: string | null
  origin?: string | null
  task_type?: string | null
  group_key?: string | null
  audience?: string | null
  client_visible?: boolean | null
  client_status?: string | null
  dev_status?: string | null
  latest_client_update?: string | null
  latest_dev_update?: string | null
  customer_update?: string | null
  dev_notes?: string | null
  due_date?: string | null
  progress?: number | null
  label?: string | null
  tags?: string[] | null
  attachments_json?: unknown
  tagro_result_json?: any
  created_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
}

type Project = {
  id: string
  title: string
  description?: string | null
  status?: string | null
  color?: string | null
  client_id?: string | null
}

type Profile = {
  id: string
  email?: string | null
  full_name?: string | null
  first_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
  role?: string | null
}

type ActivityItem = {
  id: string
  title?: string | null
  message?: string | null
  event_type?: string | null
  actor_role?: string | null
  created_at?: string | null
}

type MessageItem = {
  id: string
  message?: string | null
  created_at?: string | null
  is_ai?: boolean | null
}

const DONE_STATES = new Set(['done', 'completed', 'delivered', 'erledigt'])
const ACTIVE_STATES = new Set(['doing', 'active', 'in_progress', 'development', 'in_development'])
const DECISION_STATES = new Set(['blocked', 'waiting', 'needs_decision', 'client_decision', 'waiting_for_client', 'waiting_for_assignment'])
const REVIEW_STATES = new Set(['review', 'ready_for_review', 'in_review', 'festag_review', 'suggested', 'zur_pruefung', 'verified', 'approved', 'festag_checked'])

const TASK_DETAIL_GROUP_ICONS: Record<TaskGroupKey, typeof FileText> = {
  legal: ShieldCheck,
  tech: Gauge,
  integration: Plugs,
  design: Palette,
  content: FileText,
  web: Globe,
  code: Code,
  process: SlidersHorizontal,
  decision: ShieldCheck,
  blocker: WarningCircle,
  client_action: UserCircle,
  follow_up: GitBranch,
  admin: UsersThree,
  planning: FileText,
}

function normalizeStatus(status?: string | null) {
  const value = (status || 'todo').toLowerCase()
  if (DONE_STATES.has(value)) return 'done'
  if (REVIEW_STATES.has(value)) return 'review'
  if (DECISION_STATES.has(value)) return 'decision'
  if (ACTIVE_STATES.has(value)) return 'active'
  return 'open'
}

function taskState(task?: TaskDetail | null) {
  if (!task) return 'submitted'
  return task.client_status || task.status || task.dev_status || 'submitted'
}

function statusLabel(status?: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === 'done') return 'Erledigt'
  if (normalized === 'review') return 'In Prüfung'
  if (normalized === 'decision') return 'Warten'
  if (normalized === 'active') return 'In Arbeit'
  return 'Offen'
}

function priorityLabel(priority?: string | null) {
  if (priority === 'critical') return 'Kritisch'
  if (priority === 'high') return 'Hoch'
  if (priority === 'medium') return 'Mittel'
  if (priority === 'low') return 'Niedrig'
  return 'Keine Priorität'
}

function sourceLabel(source?: string | null, origin?: string | null) {
  const value = source || origin
  if (value === 'client_manual') return 'Manuell erstellt'
  if (value === 'client_tagro') return 'Von Tagro vorgeschlagen'
  if (value === 'status_report' || value === 'ai_report') return 'Aus Statusbericht'
  if (value === 'decision') return 'Aus Entscheidung'
  if (value === 'briefing') return 'Aus Briefing'
  if (value === 'github_activity') return 'Aus GitHub importiert'
  if (value === 'admin' || value === 'developer') return 'Vom Projektteam erstellt'
  if (value === 'tagro_internal') return 'Von Tagro erstellt'
  if (value === 'system') return 'Vom System erstellt'
  return 'Manuell erstellt'
}

function sourceActor(source?: string | null) {
  if (source === 'client_tagro' || source === 'tagro_internal') return 'Tagro'
  if (source === 'github_activity') return 'GitHub Integration'
  if (source === 'briefing') return 'Tagro Briefing'
  if (source === 'status_report' || source === 'ai_report') return 'Statusbericht'
  if (source === 'client_manual') return 'Kundenportal'
  if (source === 'system') return 'System'
  return 'Projektteam'
}

function progressFor(task: TaskDetail) {
  if (typeof task.progress === 'number') return task.progress
  const normalized = normalizeStatus(taskState(task))
  if (normalized === 'done') return 100
  if (normalized === 'review') return 82
  if (normalized === 'decision') return 40
  if (normalized === 'active') return 55
  return 0
}

function dateLabel(value?: string | null) {
  if (!value) return 'Nicht gesetzt'
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  } catch {
    return 'Nicht gesetzt'
  }
}

function relativeDate(value?: string | null) {
  if (!value) return 'unknown'
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.round(diff / 60000))
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.round(hours / 24)
  return `vor ${days} Tagen`
}

function displayName(profile?: Profile | null, fallback = 'Nicht zugewiesen') {
  if (!profile) return fallback
  return profile.full_name || profile.first_name || profile.email || fallback
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U'
}

function hasDecisionNeed(task: TaskDetail) {
  const status = taskState(task).toLowerCase()
  const text = `${task.title} ${task.latest_client_update ?? ''} ${task.client_description ?? ''}`.toLowerCase()
  return DECISION_STATES.has(status) || /entscheidung|freigabe|approval|approve|client/.test(text)
}

function hasRisk(task: TaskDetail) {
  const status = taskState(task).toLowerCase()
  const text = `${task.title} ${task.latest_client_update ?? ''} ${task.dev_notes ?? ''} ${task.dev_description ?? ''}`.toLowerCase()
  return status === 'blocked' || /blocker|risiko|risk|delay|verzöger|wartet/.test(text)
}

function safeText(value?: string | null) {
  return value && value.trim() ? value.trim() : null
}

function buildFallbackExplanation(task: TaskDetail, project?: Project | null) {
  const status = statusLabel(taskState(task)).toLowerCase()
  const projectPart = project?.title ? ` im Projekt "${project.title}"` : ''
  const expected = safeText(task.client_description) || safeText(task.description) || safeText(task.latest_client_update) || 'Der genaue Arbeitsumfang wird aus dem Projektkontext weiter konkretisiert.'
  const risk = hasRisk(task) ? ' Es gibt ein mögliches Risiko oder einen Blocker, der aktiv beobachtet werden sollte.' : ' Aktuell ist kein klarer Blocker erkennbar.'
  const decision = hasDecisionNeed(task) ? ' Eine Entscheidung oder Rückmeldung eines Stakeholders kann erforderlich sein.' : ' Im Moment wirkt keine direkte Entscheidung erforderlich.'
  return `Diese Aufgabe${projectPart} beschreibt einen konkreten Arbeitsschritt mit dem Status ${status}. ${expected} Sie ist wichtig, weil sie Einfluss auf Projektfortschritt, Verantwortung und die nächsten kommunizierbaren Schritte hat.${risk}${decision}`
}

function avatarFor(profile: Profile | null, fallbackName: string) {
  const name = displayName(profile, fallbackName)
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" />
  }
  return <span>{initials(name)}</span>
}

type TaskWorkspaceDetailProps = {
  taskId: string
  projectId?: string
}

export default function TaskWorkspaceDetail({ taskId, projectId }: TaskWorkspaceDetailProps) {
  const router = useRouter()
  const supabase = createClient()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tagroExplanation, setTagroExplanation] = useState('')
  const [tagroLoading, setTagroLoading] = useState(false)
  const [tab, setTab] = useState<'overview' | 'tagro' | 'verlauf'>('overview')
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [decisionBusy, setDecisionBusy] = useState(false)
  const [decisionDone, setDecisionDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadTaskDetail() {
      setLoading(true)
      const { data: taskData } = await (supabase as any)
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle()

      if (!taskData) {
        if (!cancelled) {
          setTask(null)
          setLoading(false)
        }
        return
      }

      const loadedTask = taskData as TaskDetail
      const pid = projectId || loadedTask.project_id || null

      const profileIds = [loadedTask.assigned_to, loadedTask.created_by, loadedTask.approved_by]
        .filter(Boolean) as string[]

      const [projectResult, activityResult, messagesResult, profilesResult] = await Promise.all([
        pid ? (supabase as any).from('projects').select('*').eq('id', pid).maybeSingle() : Promise.resolve({ data: null }),
        pid ? (supabase as any).from('activity_feed').select('id,title,message,event_type,actor_role,created_at').eq('project_id', pid).order('created_at', { ascending: false }).limit(8).then((result: any) => result, () => ({ data: [] })) : Promise.resolve({ data: [] }),
        pid ? (supabase as any).from('messages').select('id,message,created_at,is_ai').eq('project_id', pid).order('created_at', { ascending: false }).limit(6).then((result: any) => result, () => ({ data: [] })) : Promise.resolve({ data: [] }),
        profileIds.length ? (supabase as any).from('profiles').select('id,email,full_name,first_name,avatar_url,avatar_color,role').in('id', profileIds).then((result: any) => result, () => ({ data: [] })) : Promise.resolve({ data: [] }),
      ])

      if (cancelled) return

      const profileMap = new Map<string, Profile>()
      ;((profilesResult.data as Profile[]) ?? []).forEach((profile) => profileMap.set(profile.id, profile))

      setTask(loadedTask)
      setProject((projectResult.data as Project | null) ?? null)
      setActivity((activityResult.data as ActivityItem[]) ?? [])
      setMessages((messagesResult.data as MessageItem[]) ?? [])
      setProfiles(Object.fromEntries(profileMap))
      setLoading(false)
    }

    loadTaskDetail()

    const channel = supabase
      .channel(`task-detail-${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${taskId}` }, () => {
        loadTaskDetail()
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [taskId, projectId])

  useEffect(() => {
    if (!task) return
    let cancelled = false
    const fallback = buildFallbackExplanation(task, project)
    setTagroExplanation(fallback)
    setTagroLoading(true)

    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: 'Du bist Tagro, die Verständlichkeitsschicht von Festag. Erkläre Tasks in ruhiger, einfacher, executive-freundlicher Sprache. Keine internen Annahmen, keine Fachbegriffe ohne kurze Einordnung. Antworte auf Deutsch in 3-5 kurzen Sätzen.',
        messages: [{
          role: 'user',
          content: `Projekt: ${project?.title ?? 'Unbekannt'}\nAufgabe: ${task.title}\nStatus: ${statusLabel(taskState(task))}\nPriorität: ${priorityLabel(task.priority)}\nBeschreibung: ${task.client_description || task.description || task.dev_description || 'Keine Beschreibung'}\nLetztes Update: ${task.latest_client_update || task.customer_update || task.latest_dev_update || 'Kein Update'}\n\nErkläre: worum es geht, warum es für das Projekt wichtig ist, was noch fehlt, ob Risiko/Blocker/Entscheidung sichtbar ist und was der nächste sinnvolle Schritt ist.`,
        }],
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setTagroExplanation(data.content?.[0]?.text || fallback)
      })
      .catch(() => {
        if (!cancelled) setTagroExplanation(fallback)
      })
      .finally(() => {
        if (!cancelled) setTagroLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [task?.id, project?.id])

  const assignedProfile = task?.assigned_to ? profiles[task.assigned_to] : null
  const createdProfile = task?.created_by ? profiles[task.created_by] : null
  const approvedProfile = task?.approved_by ? profiles[task.approved_by] : null
  const ownerName = task?.developer_name || task?.owner || displayName(assignedProfile, task?.assigned_to ? 'Zugewiesenes Teammitglied' : 'Nicht zugewiesen')
  const createdBy = displayName(createdProfile, sourceActor(task?.source))
  const requestedBy = task?.source === 'client_manual' || task?.source === 'client_tagro' ? 'Kunde' : task?.source === 'decision' ? 'Projektverantwortliche:r' : task?.source === 'github_activity' ? 'GitHub Integration' : 'Projektteam'
  const decisionNeeded = task ? hasDecisionNeed(task) : false
  const riskVisible = task ? hasRisk(task) : false
  const manageable = task?.source === 'client_manual' || task?.source === 'client_tagro'

  const timeline = useMemo(() => {
    if (!task) return []
    const items = [
      {
        id: 'created',
        label: `${sourceActor(task.source)} hat diese Aufgabe erstellt`,
        meta: dateLabel(task.created_at),
        kind: task.source === 'client_tagro' || task.source === 'tagro_internal' ? 'tagro' : 'source',
      },
      task.assigned_to || task.developer_name || task.owner ? {
        id: 'assigned',
        label: `${ownerName} verantwortet die Umsetzung`,
        meta: task.updated_at ? relativeDate(task.updated_at) : 'aktuell',
        kind: 'owner',
      } : null,
      task.latest_client_update ? {
        id: 'client-update',
        label: task.latest_client_update,
        meta: 'Client-sicheres Update',
        kind: 'update',
      } : null,
      ...activity.slice(0, 4).map((item) => ({
        id: item.id,
        label: item.title || item.message || item.event_type || 'Projektaktivität',
        meta: relativeDate(item.created_at),
        kind: 'activity',
      })),
    ].filter(Boolean)
    return items as { id: string; label: string; meta: string; kind: string }[]
  }, [task, activity, ownerName])

  function openCopilot(prompt: string) {
    window.dispatchEvent(new CustomEvent('open-copilot'))
    window.dispatchEvent(new CustomEvent('tagro-compose', { detail: { prompt } }))
  }

  // Raise a decision off this task — it flows through the engine and lands in
  // the Entscheidungen section, exactly like decisions from anywhere else.
  async function requestDecision() {
    const pid = project?.id ?? task?.project_id
    if (!task || !pid || decisionBusy) return
    setDecisionBusy(true)
    try {
      const res = await fetch('/api/decisions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: pid,
          task_id: task.id,
          question: `Entscheidung zu „${task.title}": Wie soll hier weiter vorgegangen werden?`,
        }),
      })
      if (res.ok) {
        setDecisionDone(true)
        setTimeout(() => router.push('/decisions'), 600)
      }
    } catch {
      /* keep calm — the button stays available */
    } finally {
      setDecisionBusy(false)
    }
  }

  async function pauseTask() {
    if (!task || busy || !manageable) return
    setBusy(true)
    try {
      await (supabase as any).from('tasks').update({
        ...taskStatusPatch('waiting'),
        client_status: 'waiting',
      }).eq('id', task.id)
    } finally {
      setBusy(false)
    }
  }

  async function deleteTask() {
    if (!task || busy || !manageable) return
    const confirmed = window.confirm('Diese eigene Aufgabe wirklich löschen?')
    if (!confirmed) return
    setBusy(true)
    try {
      await (supabase as any).from('tasks').delete().eq('id', task.id)
      router.push(project?.id ? `/project/${project.id}?tab=tasks` : '/tasks')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="task-detail-shell">
        <style>{detailStyles}</style>
        <div className="task-detail-loading">Lade Aufgabendetails...</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="task-detail-shell">
        <style>{detailStyles}</style>
        <div className="task-detail-empty">
          <h1>Task nicht gefunden</h1>
          <p>Diese Aufgabe existiert nicht mehr oder ist für deinen Arbeitsbereich nicht sichtbar.</p>
          <Link href="/tasks">Zurück zu Tasks</Link>
        </div>
      </div>
    )
  }

  const description = safeText(task.client_description) || safeText(task.description) || safeText(task.dev_description) || 'Noch keine ausführliche Beschreibung hinterlegt.'
  const latestUpdate = safeText(task.latest_client_update) || safeText(task.customer_update) || safeText(task.latest_dev_update) || safeText(task.dev_notes) || 'Noch kein belastbares Update vorhanden.'
  const tags = [...(task.tags ?? []), task.label].filter(Boolean) as string[]
  const source = sourceLabel(task.source, task.origin)
  const taskGroup = getTaskGroup(task)
  const TaskGroupIcon = TASK_DETAIL_GROUP_ICONS[taskGroup.key]

  return (
    <div className="task-detail-shell">
      <style>{detailStyles}</style>

      <div className="task-detail-topbar">
        <button type="button" onClick={() => router.back()} className="task-back">
          <ArrowLeft size={15} />
          Zurück
        </button>
        <div className="task-breadcrumb">
          <Link href="/tasks">Aufgaben</Link>
          {project ? <><span>/</span><Link href={`/project/${project.id}?tab=tasks`}>{project.title}</Link></> : null}
          <span>/</span>
          <strong>{task.title}</strong>
        </div>
      </div>

      {/* Tabs — pill-style, identical to the project view. */}
      <nav className="task-tabs" role="tablist" aria-label="Aufgaben-Ansicht">
        {([
          { id: 'overview', label: 'Übersicht' },
          { id: 'tagro', label: 'Tagro-Einordnung' },
          { id: 'verlauf', label: 'Verlauf' },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`task-tab${tab === t.id ? ' on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="task-detail-grid-page">
        <main className="task-detail-main">
          {tab === 'overview' && (
            <>
              <div className="task-overview-head">
                <div className="task-title-head">
                  <span className="task-title-icon" title={taskGroup.label} aria-label={taskGroup.label}>
                    <TaskGroupIcon size={18} weight="regular" />
                  </span>
                  <h1>{task.title}</h1>
                </div>
                <p className="task-attribution">Angefragt von {requestedBy} · Verantwortlich {ownerName}</p>
              </div>

              <section className="tagro-explanation-card">
                <div className="section-head">
                  <div className="tagro-title">
                    <TagroLogo size={28} thinking={tagroLoading} />
                    <div>
                      <p>Von Tagro erklärt</p>
                      <span>{tagroLoading ? 'Tagro schreibt eine klare Einordnung...' : `Aktualisiert ${relativeDate(task.updated_at || task.created_at)}`}</span>
                    </div>
                  </div>
                  <Sparkle size={17} weight="fill" />
                </div>
                <p>{tagroExplanation}</p>
              </section>

              <section className="task-section">
                <h2>Beschreibung</h2>
                <p>{description}</p>
              </section>

              <section className="task-section">
                <h2>Letztes Update</h2>
                <p>{latestUpdate}</p>
              </section>
            </>
          )}

          {tab === 'tagro' && (
            <>
              <section className="task-section">
                <div className="section-head">
                  <h2>Signale</h2>
                  <span>{progressFor(task)}% Fortschritt</span>
                </div>
                <div className="signal-row">
                  <span className={`signal ${riskVisible ? 'warn' : 'ok'}`}>
                    <WarningCircle size={14} />
                    {riskVisible ? 'Risiko sichtbar' : 'Kein klarer Blocker'}
                  </span>
                  <span className={`signal ${decisionNeeded ? 'warn' : 'ok'}`}>
                    <ShieldCheck size={14} />
                    {decisionNeeded ? 'Entscheidung nötig' : 'Keine Entscheidung nötig'}
                  </span>
                </div>
              </section>

              <section className="task-section">
                <div className="section-head">
                  <h2>Tagro Einordnung</h2>
                  <span>Berichtsebene</span>
                </div>
                <div className="insight-list">
                  <div><strong>Was hat sich geändert?</strong><span>{latestUpdate}</span></div>
                  <div><strong>Risiko oder Blocker</strong><span>{riskVisible ? 'Aus Status oder Formulierung ist ein mögliches Risiko erkennbar.' : 'Kein klarer Blocker erkennbar.'}</span></div>
                  <div><strong>Nächster Schritt</strong><span>{decisionNeeded ? 'Zuständige Stakeholder um Entscheidung oder Freigabe bitten.' : 'Verantwortliche Person weiterarbeiten lassen und beim nächsten Fortschritt ein kurzes Update anfordern.'}</span></div>
                  <div><strong>Wer sollte reagieren?</strong><span>{decisionNeeded ? requestedBy : ownerName}</span></div>
                  <div><strong>In den Statusbericht?</strong><span>{riskVisible || decisionNeeded ? 'Ja, im nächsten Statusbericht erwähnen.' : 'Nur erwähnen, wenn detaillierter Kontext gewünscht ist.'}</span></div>
                </div>
              </section>
            </>
          )}

          {tab === 'verlauf' && (
            <>
              <section className="task-section">
                <div className="section-head">
                  <h2>Verlauf</h2>
                  <span>{timeline.length} Einträge</span>
                </div>
                <div className="timeline">
                  {timeline.map((item) => (
                    <div key={item.id} className="timeline-item">
                      <div>
                        <strong>{item.label}</strong>
                        <p>{item.meta}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="task-section">
                <div className="section-head">
                  <h2>Kommentare und Kontext</h2>
                  <span>Projektkontext</span>
                </div>
                {messages.length ? (
                  <div className="discussion-list">
                    {messages.slice().reverse().map((message) => (
                      <article key={message.id}>
                        <strong>{message.is_ai ? 'Tagro' : 'Nachricht aus dem Arbeitsbereich'}</strong>
                        <p>{message.message || 'Keine Nachricht vorhanden'}</p>
                        <span>{relativeDate(message.created_at)}</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>Noch keine aufgabenspezifische Diskussion. Projektmeldungen und Tagro-Updates erscheinen hier, sobald mehr Signale vorliegen.</p>
                )}
              </section>
            </>
          )}
        </main>

        <aside className="task-properties">
          <section className="property-card">
            <div className="property-head">
              <h2>Eigenschaften</h2>
              <span>{source}</span>
            </div>
            <PropertyRow icon={<CheckCircle size={16} />} label="Status" value={statusLabel(taskState(task))} />
            <PropertyRow icon={<Flag size={16} />} label="Priorität" value={priorityLabel(task.priority)} />
            <PropertyRow
              icon={<span className="mini-avatar">{avatarFor(assignedProfile, ownerName)}</span>}
              label="Verantwortlich"
              value={`${ownerName}${assignedProfile?.role ? ` · ${assignedProfile.role}` : ''}`}
            />
            <PropertyRow icon={<CalendarBlank size={16} />} label="Fällig" value={dateLabel(task.due_date)} />
            <PropertyRow icon={<FileText size={16} />} label="Projekt" value={project?.title || 'Kein Projekt'} />
            <PropertyRow icon={<ShieldCheck size={16} />} label="Sichtbarkeit" value={task.client_visible === false ? 'Nur intern' : 'Für Client sichtbar'} />
            <PropertyRow icon={<WarningCircle size={16} />} label="Risiko" value={riskVisible ? 'Aufmerksamkeit nötig' : 'Niedrig'} />
            <PropertyRow icon={<Clock size={16} />} label="Entscheidung" value={decisionNeeded ? 'Ja' : 'Nein'} />
            <PropertyRow icon={<Plugs size={16} />} label="Quelle" value={source} />
            {tags.length ? <PropertyRow icon={<Tag size={16} />} label="Tags" value={tags.join(', ')} /> : null}
            <PropertyRow icon={<GitBranch size={16} />} label="Aktualisiert" value={dateLabel(task.updated_at || task.created_at)} />
          </section>

          <div className="task-actions">
            <button type="button" className="task-action task-action-primary" onClick={() => setNewTaskOpen(true)} disabled={!(project?.id ?? task.project_id)}>
              <Plus size={14} weight="bold" /> Folgeaufgabe anlegen
            </button>
            <button type="button" className="task-action" onClick={requestDecision} disabled={decisionBusy || decisionDone || !(project?.id ?? task.project_id)}>
              <ShieldCheck size={14} /> {decisionDone ? 'Entscheidung erstellt' : decisionBusy ? 'Wird angefragt…' : 'Entscheidung anfordern'}
            </button>
            <button type="button" className="task-action" onClick={() => openCopilot(`Erkläre diese Aufgabe für einen CEO oder Kunden und sage, was als nächstes entschieden oder kommuniziert werden sollte: "${task.title}"`)}>
              <Sparkle size={14} /> Tagro fragen
            </button>
            {manageable ? <button type="button" className="task-action" onClick={pauseTask} disabled={busy}><Pause size={14} /> Aussetzen</button> : null}
            {manageable ? <button type="button" className="task-action danger" onClick={deleteTask} disabled={busy}><Trash size={14} /> Löschen</button> : null}
          </div>
        </aside>
      </div>

      {newTaskOpen && (
        <NewTaskModal
          defaultProjectId={(project?.id ?? task.project_id) || undefined}
          defaultDescription={`Folgeaufgabe aus „${task.title}".`}
          onClose={() => setNewTaskOpen(false)}
          onCreated={() => setNewTaskOpen(false)}
        />
      )}
    </div>
  )
}

function PropertyRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="property-row">
      <span className="property-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function OriginBadge({ label, kind }: { label: string; kind: string }) {
  return (
    <div className={`origin-badge ${kind}`}>
      <span />
      {label}
    </div>
  )
}

const detailStyles = `
  .task-detail-shell {
    width:100%;
    min-height:100%;
    color:var(--text);
    padding:20px 24px 72px;
  }
  .task-detail-topbar {
    display:flex;
    align-items:center;
    justify-content:flex-start;
    gap:14px;
    margin-bottom:0;
    padding-bottom:14px;
    min-height:34px;
    border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .task-back {
    height:32px;
    display:inline-flex;
    align-items:center;
    gap:8px;
    padding:0 12px;
    border-radius:10px;
    border:1px solid color-mix(in srgb, var(--border) 58%, transparent);
    background:transparent;
    color:var(--text-secondary);
    font:inherit;
    font-size:12px;
    font-weight:500;
    cursor:pointer;
  }
  .task-back:hover { background:var(--surface-2); color:var(--text); }
  .task-breadcrumb {
    display:flex;
    align-items:center;
    justify-content:flex-end;
    min-width:0;
    gap:8px;
    color:var(--text-muted);
    font-size:12px;
  }
  .task-breadcrumb a {
    color:var(--text-muted);
    text-decoration:none;
  }
  .task-breadcrumb strong {
    max-width:260px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    color:var(--text-secondary);
  }
  .task-detail-grid-page {
    display:grid;
    grid-template-columns:minmax(0,1fr) minmax(300px,360px);
    gap:24px;
    align-items:start;
  }
  .task-detail-main {
    min-width:0;
    display:flex;
    flex-direction:column;
    gap:18px;
  }
  /* Title — sits below the tabs (like the project view's overview). */
  .task-overview-head { display:flex; flex-direction:column; gap:9px; }
  .task-title-head {
    display:flex;
    align-items:center;
    gap:12px;
  }
  .task-title-icon {
    width:34px;
    height:34px;
    border-radius:10px;
    flex:0 0 34px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    color:var(--text-secondary);
    background:color-mix(in srgb, var(--surface-2) 34%, transparent);
    border:1px solid color-mix(in srgb, var(--border) 58%, transparent);
  }
  .task-title-icon svg {
    display:block;
    width:18px;
    height:18px;
  }
  .status-pill {
    height:28px;
    display:inline-flex;
    align-items:center;
    gap:8px;
    padding:0 11px;
    border-radius:999px;
    color:var(--text-secondary);
    border:0;
    background:#fff;
    box-shadow:0 1px 2px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.05);
    font-size:11.5px;
    font-weight:500;
    letter-spacing:.03em;
    margin-bottom:0;
  }
  [data-theme="dark"] .status-pill,
  [data-theme="classic-dark"] .status-pill {
    background:color-mix(in srgb, var(--surface) 92%, #fff 8%);
    box-shadow:0 1px 2px rgba(0,0,0,.28), 0 2px 7px rgba(0,0,0,.16);
  }
  .status-pill span {
    width:8px;
    height:8px;
    border-radius:50%;
    background:var(--text-muted);
  }
  .status-pill.active span { background:var(--amber); }
  .status-pill.decision span { background:var(--amber); box-shadow:0 0 0 4px color-mix(in srgb, var(--amber) 14%, transparent); }
  .status-pill.review span { background:#6366f1; }
  .status-pill.done span { background:var(--green); }
  .task-title-head h1 {
    max-width:900px;
    margin:0;
    color:var(--text);
    font-size:clamp(22px, 2vw, 30px);
    line-height:1.16;
    letter-spacing:var(--ls-header,.012em);
    font-weight:500;
  }
  .task-attribution {
    margin:0;
    color:var(--text-secondary);
    font-size:12.5px;
    line-height:1.55;
    letter-spacing:var(--ls-body,.017em);
  }

  /* Tabs — pill-style segmented control, identical to the project view. */
  .task-tabs {
    display:flex;
    align-items:center;
    gap:4px;
    margin:16px 0 22px;
    padding-bottom:12px;
    border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .task-tab {
    display:inline-flex;
    align-items:center;
    gap:6px;
    height:28px;
    padding:0 12px;
    border:1px solid transparent;
    border-radius:999px;
    background:transparent;
    color:var(--text-secondary);
    font:inherit;
    font-size:12px;
    font-weight:500;
    letter-spacing:var(--ls-body,.017em);
    cursor:pointer;
    transition:background .1s, color .1s, border-color .1s;
  }
  .task-tab:hover { color:var(--text); background:var(--surface-2); }
  .task-tab.on {
    background:var(--surface-2);
    color:var(--text);
    border-color:color-mix(in srgb, var(--border) 50%, transparent);
  }

  /* Signal chips — compact, replace the old 3 big status cards. */
  .signal-row { display:flex; flex-wrap:wrap; gap:8px; }
  .signal {
    display:inline-flex;
    align-items:center;
    gap:7px;
    height:30px;
    padding:0 12px;
    border-radius:9px;
    border:1px solid color-mix(in srgb, var(--border) 60%, transparent);
    background:color-mix(in srgb, var(--surface-2) 24%, transparent);
    color:var(--text-secondary);
    font-size:12px;
    font-weight:500;
    letter-spacing:var(--ls-body,.017em);
  }
  .signal svg { color:var(--text-muted); }
  .signal.warn { color:var(--amber); }
  .signal.warn svg { color:var(--amber); }
  .tagro-explanation-card,
  .task-section,
  .property-card {
    border:0;
    border-radius:12px;
    background:transparent;
  }
  .tagro-explanation-card {
    padding:15px 16px;
    background:linear-gradient(135deg, color-mix(in srgb, var(--surface-2) 34%, transparent), color-mix(in srgb, var(--surface) 78%, transparent));
  }
  .section-head {
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:14px;
    margin-bottom:10px;
  }
  .section-head h2,
  .property-head h2,
  .task-section h2 {
    margin:0;
    color:var(--text);
    font-size:13px;
    font-weight:500;
    letter-spacing:.02em;
  }
  .section-head span,
  .property-head span {
    color:var(--text-muted);
    font-size:11px;
    font-weight:500;
    letter-spacing:.06em;
    text-transform:uppercase;
  }
  .tagro-title {
    display:flex;
    align-items:center;
    gap:11px;
    min-width:0;
  }
  .tagro-title p {
    margin:0;
    color:var(--text);
    font-size:13px;
    font-weight:500;
  }
  .tagro-title span {
    display:block;
    margin-top:2px;
    color:var(--text-muted);
    font-size:11.5px;
  }
  .tagro-explanation-card > p,
  .task-section > p,
  .property-copy {
    margin:0;
    color:var(--text-secondary);
    font-size:13.5px;
    line-height:1.68;
  }
  .task-section {
    padding:2px 0 0;
  }
  .status-grid {
    display:grid;
    grid-template-columns:repeat(3,minmax(0,1fr));
    gap:9px;
  }
  .status-grid article {
    min-height:88px;
    padding:12px;
    border-radius:10px;
    border:0;
    background:color-mix(in srgb, var(--surface-2) 26%, transparent);
    display:flex;
    flex-direction:column;
    gap:9px;
  }
  .status-grid svg { color:var(--text-muted); }
  .status-grid strong {
    color:var(--text);
    font-size:13px;
    font-weight:500;
  }
  .status-grid span {
    color:var(--text-secondary);
    font-size:12.5px;
    line-height:1.55;
  }
  .insight-list {
    display:grid;
    gap:8px;
  }
  .insight-list div {
    display:grid;
    grid-template-columns:166px minmax(0,1fr);
    gap:14px;
    padding:3px 0;
    border-top:0;
  }
  .insight-list div:first-child { padding-top:0; }
  .insight-list strong {
    color:var(--text);
    font-size:12.5px;
    font-weight:500;
  }
  .insight-list span,
  .timeline-item p,
  .discussion-list span {
    color:var(--text-muted);
    font-size:12px;
    line-height:1.55;
  }
  .timeline {
    display:grid;
    gap:10px;
  }
  .timeline-item {
    display:block;
    padding-left:0;
  }
  .timeline-item strong {
    color:var(--text-secondary);
    font-size:13px;
    font-weight:500;
    line-height:1.45;
  }
  .timeline-item p {
    margin:3px 0 0;
  }
  .discussion-list {
    display:grid;
    gap:10px;
  }
  .discussion-list article {
    padding:12px;
    border:0;
    border-radius:10px;
    background:color-mix(in srgb, var(--surface-2) 24%, transparent);
  }
  .discussion-list strong {
    display:block;
    color:var(--text);
    font-size:12.5px;
    margin-bottom:4px;
  }
  .discussion-list p {
    margin:0 0 8px;
    color:var(--text-secondary);
    font-size:12.5px;
    line-height:1.55;
  }
  .task-properties {
    position:sticky;
    top:18px;
    display:flex;
    flex-direction:column;
    gap:10px;
    min-width:0;
  }
  .property-card {
    padding:14px 14px;
    background:color-mix(in srgb, var(--surface-2) 20%, transparent);
  }
  .property-head {
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:10px;
    margin-bottom:10px;
  }
  .property-row {
    min-height:32px;
    display:grid;
    grid-template-columns:20px 104px minmax(0,1fr);
    align-items:center;
    gap:8px;
    color:var(--text-muted);
    font-size:12px;
  }
  .property-row strong {
    color:var(--text-secondary);
    font-size:12.5px;
    font-weight:500;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    text-align:right;
  }
  .property-icon {
    color:var(--text-muted);
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .mini-avatar,
  .mini-avatar img,
  .mini-avatar span {
    width:20px;
    height:20px;
    border-radius:50%;
    display:flex;
    align-items:center;
    justify-content:center;
    object-fit:cover;
  }
  .mini-avatar span {
    background:var(--surface-2);
    border:1px solid var(--border);
    color:var(--text-secondary);
    font-size:9px;
    font-weight:600;
  }
  .origin-stack {
    display:grid;
    gap:8px;
    margin-top:12px;
  }
  .origin-badge {
    min-height:30px;
    display:flex;
    align-items:center;
    gap:8px;
    color:var(--text-secondary);
    font-size:12px;
    font-weight:500;
  }
  .origin-badge span {
    width:18px;
    height:18px;
    border-radius:6px;
    background:var(--surface-2);
    border:0;
  }
  .origin-badge.client_tagro span,
  .origin-badge.tagro span,
  .origin-badge.tagro_internal span { background:var(--green-bg); border-color:color-mix(in srgb, var(--green) 28%, var(--border)); }
  .origin-badge.github_activity span { background:#111827; border-color:#111827; }
  .origin-badge.owner span { background:#eef2ff; border-color:#c7d2fe; }
  .property-card.actions {
    display:grid;
    gap:8px;
  }
  .property-card.actions button {
    min-height:38px;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    border:0;
    border-radius:10px;
    background:color-mix(in srgb, var(--surface-2) 44%, transparent);
    color:var(--text);
    font:inherit;
    font-size:12.5px;
    font-weight:500;
    cursor:pointer;
  }
  .property-card.actions button:hover { background:color-mix(in srgb, var(--surface-2) 66%, transparent); }
  .property-card.actions button.danger {
    color:var(--red);
    background:transparent;
  }
  .property-card.actions button:disabled {
    opacity:.5;
    cursor:not-allowed;
  }
  /* Actions — no card container, consistent Festag buttons. */
  .task-actions {
    display:flex;
    flex-direction:column;
    gap:8px;
    margin-top:2px;
  }
  .task-action {
    height:38px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    padding:0 14px;
    border:1px solid var(--border);
    border-radius:10px;
    background:var(--surface);
    color:var(--text);
    font:inherit;
    font-size:12.5px;
    font-weight:500;
    letter-spacing:var(--ls-body,.017em);
    cursor:pointer;
    transition:background .14s ease, border-color .14s ease, opacity .14s ease;
  }
  .task-action:hover:not(:disabled) { background:var(--surface-2); border-color:var(--border-strong); }
  .task-action-primary {
    background:var(--btn-prim);
    color:var(--btn-prim-text);
    border-color:var(--btn-prim);
  }
  .task-action-primary:hover:not(:disabled) {
    background:color-mix(in srgb, var(--btn-prim) 88%, #000);
    border-color:color-mix(in srgb, var(--btn-prim) 88%, #000);
  }
  .task-action.danger { color:var(--red); border-color:color-mix(in srgb, var(--red) 30%, var(--border)); }
  .task-action.danger:hover:not(:disabled) { background:color-mix(in srgb, var(--red) 8%, transparent); }
  .task-action:disabled { opacity:.5; cursor:not-allowed; }

  .task-detail-loading,
  .task-detail-empty {
    max-width:520px;
    margin:120px auto 0;
    padding:28px;
    border:1px solid var(--border);
    border-radius:16px;
    background:var(--surface);
    color:var(--text-secondary);
    text-align:center;
  }
  .task-detail-empty h1 {
    margin:0 0 8px;
    color:var(--text);
    font-size:24px;
  }
  .task-detail-empty a {
    display:inline-flex;
    margin-top:16px;
    color:var(--text);
    font-weight:500;
  }
  @media(max-width:1100px) {
    .task-detail-grid-page {
      grid-template-columns:minmax(0,1fr);
    }
    .task-properties {
      position:static;
    }
  }
  @media(max-width:760px) {
    .task-detail-shell {
      padding:14px 12px calc(96px + var(--safe-bottom));
    }
    .task-detail-topbar {
      align-items:flex-start;
      flex-direction:column;
    }
    .task-breadcrumb {
      justify-content:flex-start;
      width:100%;
    }
    .tagro-explanation-card,
    .task-section,
    .property-card {
      border-radius:14px;
    }
    .task-head {
      padding:18px 0 4px;
    }
    .task-tabs { overflow-x:auto; }
    .insight-list div {
      grid-template-columns:1fr;
      gap:5px;
    }
    .property-row {
      grid-template-columns:20px 92px minmax(0,1fr);
    }
  }
`
