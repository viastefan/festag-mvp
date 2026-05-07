'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, X, CheckCircle, Eye, EyeSlash, Envelope, UserCircle,
  Code, Database, Globe, ShieldCheck, GitBranch, Rocket,
  ChatCircle, FileText, ListChecks, Wrench, Star,
  Users, Briefcase, Buildings, ArrowsClockwise,
  PencilSimple, CaretRight, Check, Cube, FunnelSimple, SlidersHorizontal,
} from '@phosphor-icons/react'

// ── Types ──────────────────────────────────────────────────────────────────

type Member = {
  id: string
  first_name?: string
  full_name?: string
  avatar_url?: string | null
  role?: string
  email?: string
}

type TaskArea = {
  id: string
  label: string
  desc: string
  Icon: React.ComponentType<any>
}

type Assignment = {
  areas: string[]          // task area ids the member controls
  createTasks: boolean     // should create tasks from assigned areas
  note: string
}

type TeamTab =
  | 'overview'
  | 'tasks'
  | 'members'
  | 'scenarios'
  | 'invitations'
  | 'roles'
  | 'seats'
  | 'assigned'
  | 'communication'

type TeamTaskRow = {
  id: string
  title: string
  status: string | null
  priority?: string | null
  project_id?: string | null
  assigned_to?: string | null
  owner?: string | null
  developer_name?: string | null
  sprint?: string | null
  updated_at?: string | null
  created_at?: string | null
}

type TeamProjectRow = {
  id: string
  title: string
  color?: string | null
}

// ── Task areas ────────────────────────────────────────────────────────────

const TASK_AREAS: TaskArea[] = [
  { id: 'frontend',  label: 'Frontend',         desc: 'UI, Komponenten, Styles',        Icon: Globe        },
  { id: 'backend',   label: 'Backend / API',     desc: 'Routes, Logik, Integrationen',   Icon: Code         },
  { id: 'database',  label: 'Datenbank',         desc: 'Schema, Migrationen, Queries',   Icon: Database     },
  { id: 'devops',    label: 'DevOps',            desc: 'CI/CD, Deployments, Infra',      Icon: Rocket       },
  { id: 'security',  label: 'Security',          desc: 'Auth, RLS, Audits',              Icon: ShieldCheck  },
  { id: 'review',    label: 'Code Reviews',      desc: 'PRs, Qualitätssicherung',        Icon: GitBranch    },
  { id: 'docs',      label: 'Dokumentation',     desc: 'Technische Docs, README',        Icon: FileText     },
  { id: 'sprint',    label: 'Sprint Planning',   desc: 'Roadmap, Prioritäten, Tasks',    Icon: ListChecks   },
  { id: 'support',   label: 'Client Support',    desc: 'Kommunikation, Rückfragen',      Icon: ChatCircle   },
  { id: 'bugfix',    label: 'Bug Tracking',      desc: 'Fehleranalyse, Hotfixes',        Icon: Wrench       },
]

// ── Scenarios (simplified for display) ───────────────────────────────────

const SCENARIOS = [
  {
    id: 'client',
    eyebrow: 'COLLABORATION',
    title: 'Client Team',
    subtitle: 'Founder & Co-Founder',
    desc: 'Maximale Kontrolle für die Führungsebene. 100 % Einsicht in AI-Kontext, Roadmap und tägliche Progress-Reports.',
    Icon: Star,
    access: ['AI-Kontext & Roadmap', 'Budget & Strategie', 'Progress-Reports', 'Alle Projekt-Chats'],
    denied: [],
    cta: 'Client Team erstellen',
  },
  {
    id: 'dev',
    eyebrow: 'EXECUTION',
    title: 'Developer Team',
    subtitle: 'Lead Dev & Dev-Partner',
    desc: 'Fokus auf Code-Produktion. Tasks, Deployments und Doku geteilt — Founder-Strategie bleibt unsichtbar.',
    Icon: Code,
    access: ['Tasks & Sprint-Board', 'Technische Dokumentation', 'Deployment-Status'],
    denied: ['Founder-Strategie-Chats'],
    badge: 'BELIEBT',
    cta: 'Developer Team einrichten',
  },
  {
    id: 'agency',
    eyebrow: 'MULTI-CLIENT',
    title: 'Agency Ecosystem',
    subtitle: 'Agentur & Clients (isoliert)',
    desc: 'Jeder Client = ein isolierter Team-Context. Kunde A sieht niemals Projekte von Kunde B.',
    Icon: Buildings,
    access: ['Team-Switcher für Admin', 'Eigener AI-Kontext pro Client', 'Container-Trennung'],
    denied: ['Andere Client-Workspaces'],
    cta: 'Als Agentur starten',
  },
  {
    id: 'corporate',
    eyebrow: 'ENTERPRISE',
    title: 'Corporate Integration',
    subtitle: 'Unternehmen & Inhouse-Dev',
    desc: 'Festangestellter Dev erhält dedizierten Zugang — nur zugewiesene Produkte. Read-Only für Strategie.',
    Icon: Briefcase,
    access: ['Zugewiesene Projekte', 'Technische Tasks'],
    denied: ['Öffentliche Marktplätze', 'Strategie-Dashboard'],
    badge: 'ENTERPRISE',
    cta: 'Corporate anfragen',
    mailto: 'mailto:stefandirnberger@viawen.com?subject=Corporate%20Integration',
  },
]

const TEAM_TABS: { id: TeamTab; label: string }[] = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'tasks', label: 'Aufgaben' },
  { id: 'members', label: 'Mitglieder' },
  { id: 'scenarios', label: 'Szenarien' },
  { id: 'invitations', label: 'Einladungen' },
  { id: 'roles', label: 'Rollen & Rechte' },
  { id: 'seats', label: 'Seats' },
  { id: 'assigned', label: 'Zugewiesene Projekte' },
  { id: 'communication', label: 'Team-Kommunikation' },
]

const TEAM_DONE_STATES = new Set(['done', 'completed', 'erledigt'])
const TEAM_ACTIVE_STATES = new Set(['doing', 'active', 'in_progress', 'review'])

function normalizeTeamTaskStatus(status?: string | null) {
  const value = (status || 'todo').toLowerCase()
  if (TEAM_DONE_STATES.has(value)) return 'done'
  if (TEAM_ACTIVE_STATES.has(value)) return 'active'
  return 'open'
}

function teamTaskStatusLabel(status?: string | null) {
  const normalized = normalizeTeamTaskStatus(status)
  if (normalized === 'done') return 'DONE'
  if (normalized === 'active') return 'IN PROGRESS'
  return 'OPEN'
}

function teamTaskPriorityLabel(priority?: string | null) {
  if (!priority) return '---'
  const value = priority.toLowerCase()
  if (value === 'critical') return 'CRITICAL'
  if (value === 'high') return 'HIGH'
  if (value === 'medium') return 'MEDIUM'
  if (value === 'low') return 'LOW'
  return priority.toUpperCase()
}

function teamTaskShortId(id: string, index: number) {
  const numeric = Number.parseInt(id.replace(/\D/g, '').slice(0, 5), 10)
  return `#${Number.isFinite(numeric) && numeric > 0 ? numeric : 10425 + index}`
}

function teamTaskHealthLabel(status?: string | null) {
  const normalized = normalizeTeamTaskStatus(status)
  if (normalized === 'done') return 'Vom Developer erledigt'
  if (normalized === 'active') return 'Update vorhanden'
  return 'No updates'
}

function teamTaskProgress(status?: string | null) {
  const normalized = normalizeTeamTaskStatus(status)
  if (normalized === 'done') return 100
  if (normalized === 'active') return 55
  return 0
}

function teamTaskDateLabel(value?: string | null) {
  if (!value) return '---'
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(value))
  } catch {
    return '---'
  }
}

function tabFromTeamView(view?: string): TeamTab {
  if (view === 'tasks') return 'tasks'
  if (view === 'projects') return 'assigned'
  if (view === 'messages') return 'communication'
  return 'overview'
}

function TeamTasksTable({
  tasks,
  projects,
  members,
  loading,
}: {
  tasks: TeamTaskRow[]
  projects: TeamProjectRow[]
  members: Member[]
  loading: boolean
}) {
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const activeCount = tasks.filter((task) => normalizeTeamTaskStatus(task.status) === 'active').length
  const doneCount = tasks.filter((task) => normalizeTeamTaskStatus(task.status) === 'done').length
  const openCount = tasks.filter((task) => normalizeTeamTaskStatus(task.status) === 'open').length

  const fallbackLead = members.find((member) => member.role === 'dev') ?? members[0] ?? null
  const leadFor = (task: TeamTaskRow) => {
    const assignedMember = task.assigned_to ? members.find((member) => member.id === task.assigned_to) : null
    const display = assignedMember ?? fallbackLead
    return {
      name: task.developer_name || display?.first_name || display?.full_name?.split(' ')[0] || task.owner || 'Developer',
      avatar: display?.avatar_url ?? null,
    }
  }

  return (
    <section className="team-task-shell" aria-label="Team Aufgaben">
      <div className="team-task-top">
        <h2>Aufgaben</h2>
        <button className="team-task-plus" type="button" aria-label="Neue Team-Aufgabe">+</button>
      </div>

      <div className="team-task-toolbar">
        <div className="team-task-filter">
          <span>All tasks</span>
        </div>
        <span className="team-task-counts">{openCount} offen · {activeCount} aktiv · {doneCount} erledigt</span>
        <div className="team-task-actions" aria-hidden="true">
          <span><FunnelSimple size={15} /></span>
          <span><SlidersHorizontal size={15} /></span>
        </div>
      </div>

      <div className="team-task-table-wrap">
        <div className="team-task-head">
          <span>Name</span>
          <span>Health</span>
          <span>Priority</span>
          <span>Lead</span>
          <span>Target date</span>
          <span>Issues</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="team-task-empty">Lade Team-Aufgaben…</div>
        ) : tasks.length === 0 ? (
          <div className="team-task-empty">Noch keine technischen Team-Aufgaben. Sobald Developer Tasks erledigen oder aktualisieren, erscheinen sie hier.</div>
        ) : tasks.map((task, index) => {
          const project = task.project_id ? projectById.get(task.project_id) : null
          const normalized = normalizeTeamTaskStatus(task.status)
          const lead = leadFor(task)
          const progress = teamTaskProgress(task.status)

          return (
            <div key={task.id} className="team-task-row">
              <div className="team-task-name">
                <span className="team-task-cube"><Cube size={16} weight="regular" /></span>
                <span>
                  <strong>{task.title}</strong>
                  <small>{teamTaskShortId(task.id, index)} · {project?.title || 'Kein Projekt zugeordnet'}</small>
                </span>
              </div>
              <div className={`team-task-health health-${normalized}`}>
                <i />
                <span>{teamTaskHealthLabel(task.status)}</span>
              </div>
              <div className={`team-task-priority priority-${(task.priority || '').toLowerCase() || 'none'}`}>
                {teamTaskPriorityLabel(task.priority)}
              </div>
              <div className="team-task-assigned">
                {lead.avatar ? (
                  <img src={lead.avatar} alt="" />
                ) : (
                  <span>{lead.name.charAt(0).toUpperCase()}</span>
                )}
                <em>{lead.name}</em>
              </div>
              <div className="team-task-date">{teamTaskDateLabel(task.updated_at || task.created_at)}</div>
              <div className="team-task-issues">0</div>
              <div className={`team-task-status status-${normalized}`}>
                <i />
                {normalized === 'active' ? teamTaskStatusLabel(task.status) : `${progress}%`}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TeamsTabPlaceholder({ title, description, rows }: { title: string; description: string; rows: string[] }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden', maxWidth:760 }}>
      <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--border)' }}>
        <h3 style={{ margin:0, fontSize:15, fontWeight:700, letterSpacing:'-.2px' }}>{title}</h3>
        <p style={{ margin:'4px 0 0', fontSize:12.5, color:'var(--text-muted)', lineHeight:1.5 }}>{description}</p>
      </div>
      <div>
        {rows.map((row) => (
          <div key={row} style={{ display:'flex', alignItems:'center', gap:10, minHeight:44, padding:'0 20px', borderBottom:'1px solid var(--border)' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-muted)', opacity:.42, flexShrink:0 }} />
            <span style={{ fontSize:12.5, fontWeight:600, color:'var(--text-secondary)' }}>{row}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────

export default function TeamsPage({ searchParams }: { searchParams?: { view?: string } }) {
  const [members,    setMembers]    = useState<Member[]>([])
  const [me,         setMe]         = useState<Member | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invEmail,   setInvEmail]   = useState('')
  const [invRole,    setInvRole]    = useState('collaborator')
  const [invSent,    setInvSent]    = useState(false)
  const [invSending, setInvSending] = useState(false)
  const [tab,        setTab]        = useState<TeamTab>(() => tabFromTeamView(searchParams?.view))
  const [teamTasks,  setTeamTasks]  = useState<TeamTaskRow[]>([])
  const [teamProjects, setTeamProjects] = useState<TeamProjectRow[]>([])
  const [teamTasksLoading, setTeamTasksLoading] = useState(true)

  // Assignment state
  const [assigningMember, setAssigningMember] = useState<Member | null>(null)
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({})
  const [editAssignment, setEditAssignment] = useState<Assignment>({ areas: [], createTasks: true, note: '' })

  // Load assignments from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('team_assignments')
      if (raw) setAssignments(JSON.parse(raw))
    } catch {}
  }, [])

  const saveAssignments = (next: Record<string, Assignment>) => {
    setAssignments(next)
    try { localStorage.setItem('team_assignments', JSON.stringify(next)) } catch {}
  }

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(async ({ data }) => {
      try {
        if (!data.session) { window.location.href = '/login'; return }
        const uid = data.session.user.id
        const { data: prof } = await sb.from('profiles').select('*').eq('id', uid).single()
        const myProf = prof as any
        setMe(myProf ?? null)
        const { data: tmRows } = await sb.from('team_members').select('member_id').eq('owner_id', uid)
        const ids = ((tmRows as any[]) ?? []).map((r: any) => r.member_id).filter(Boolean) as string[]
        if (ids.length > 0) {
          const { data: profs } = await sb.from('profiles').select('id,first_name,full_name,avatar_url,role,email').in('id', ids)
          const list: Member[] = (profs as any[]) ?? []
          if (myProf && !list.find(m => m.id === myProf.id)) list.unshift(myProf as Member)
          setMembers(list)
        } else {
          setMembers(myProf ? [myProf as Member] : [])
        }
      } catch (err) { console.error('[teams]', err) }
      finally { setLoading(false) }
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    setTab(tabFromTeamView(searchParams?.view))
  }, [searchParams?.view])

  useEffect(() => {
    const sb = createClient()
    let alive = true

    async function loadTeamTasks() {
      if (alive) setTeamTasksLoading(true)
      const [{ data: taskData }, { data: projectData }] = await Promise.all([
        (sb as any).from('tasks').select('*').order('created_at', { ascending: false }).limit(80),
        (sb as any).from('projects').select('id,title,color'),
      ])
      if (!alive) return
      setTeamTasks((taskData as TeamTaskRow[]) ?? [])
      setTeamProjects((projectData as TeamProjectRow[]) ?? [])
      setTeamTasksLoading(false)
    }

    loadTeamTasks()

    const channel = sb
      .channel('team-orchestration-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadTeamTasks()
      })
      .subscribe()

    return () => {
      alive = false
      sb.removeChannel(channel)
    }
  }, [])

  async function sendInvite() {
    if (!invEmail.includes('@')) return
    setInvSending(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      await fetch('/api/invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invEmail.trim().toLowerCase(),
          role: invRole,
          fromUserId: user?.id ?? null,
          fromUserEmail: user?.email ?? null,
          accessMode: 'team',
        }),
      })
      setInvSent(true); setInvEmail('')
      setTimeout(() => { setInvSent(false); setInviteOpen(false) }, 2500)
    } catch (e) { console.error(e) }
    setInvSending(false)
  }

  function openInvite(e?: React.MouseEvent) {
    e?.stopPropagation()
    setInvSent(false); setInvEmail(''); setInvRole('collaborator'); setInviteOpen(true)
  }

  function openAssign(m: Member) {
    setEditAssignment(assignments[m.id] ?? { areas: [], createTasks: true, note: '' })
    setAssigningMember(m)
  }

  function saveAssign() {
    if (!assigningMember) return
    saveAssignments({ ...assignments, [assigningMember.id]: editAssignment })
    setAssigningMember(null)
  }

  function toggleArea(id: string) {
    setEditAssignment(prev => ({
      ...prev,
      areas: prev.areas.includes(id) ? prev.areas.filter(a => a !== id) : [...prev.areas, id],
    }))
  }

  const nameOf = (m: Member) => m.first_name ?? m.full_name?.split(' ')[0] ?? 'Mitglied'
  const initOf = (m: Member) => nameOf(m).charAt(0).toUpperCase()
  const roleLabel = (r?: string) => r === 'dev' ? 'Developer' : r === 'admin' ? 'Admin' : 'Client'
  const roleColor = (r?: string) => r === 'dev' ? 'var(--green)' : r === 'admin' ? 'var(--amber)' : 'var(--text-muted)'
  const roleBg    = (r?: string) => r === 'dev' ? 'rgba(52,199,89,.12)' : r === 'admin' ? 'rgba(245,158,11,.12)' : 'var(--surface-2)'

  if (loading) return (
    <div style={{ padding: 60, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 22, height: 22, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )

  return (
    <div className="page-content animate-fade-up" style={{ maxWidth: undefined }}>
      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes popIn    { from { opacity:0; transform:scale(.96) translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes slideIn  { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:none; } }
        .tm-card { cursor:pointer; transition:border-color .15s, background .15s; }
        .tm-card:hover { border-color:var(--border-strong) !important; }
        .sc-card { transition:border-color .15s, transform .12s; }
        .sc-card:hover { transform:translateY(-1px); border-color:var(--border-strong) !important; }
        .area-chip { transition:border-color .12s, background .12s; cursor:pointer; }
        .area-chip:hover { border-color:var(--border-strong) !important; }
        .area-chip.on { background:var(--nav-on) !important; border-color:var(--text) !important; }
        .team-tabs { display:flex; gap:2px; margin-bottom:24px; padding:3px; background:var(--surface-2); border-radius:10px; width:fit-content; max-width:100%; overflow:auto; }
        .tab-btn { padding:6px 14px; border-radius:8px; font-size:13px; font-weight:600; border:none; background:transparent; color:var(--text-muted); cursor:pointer; font-family:inherit; transition:color .12s, background .12s; white-space:nowrap; }
        .tab-btn.on { background:var(--surface); color:var(--text); }
        .inv-overlay { position:fixed; inset:0; z-index:9000; display:flex; align-items:center; justify-content:center; padding:20px; }
        .inv-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.55); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); }
        .inv-panel { position:relative; width:100%; max-width:460px; background:var(--surface); border:1px solid var(--border); border-radius:20px; box-shadow:0 32px 80px rgba(0,0,0,.28); overflow:hidden; animation:popIn .22s cubic-bezier(.16,1,.3,1) both; }
        .assign-panel { position:fixed; top:0; right:0; bottom:0; width:100%; max-width:480px; z-index:8000; background:var(--surface); border-left:1px solid var(--border); box-shadow:-24px 0 64px rgba(0,0,0,.12); animation:slideIn .2s cubic-bezier(.16,1,.3,1) both; display:flex; flex-direction:column; }
        .assign-backdrop { position:fixed; inset:0; z-index:7999; background:rgba(0,0,0,.3); backdrop-filter:blur(4px); }
        .team-task-shell {
          width:100%;
          min-height:calc(100vh - 176px);
          color:var(--text);
          border:1px solid var(--border);
          border-radius:16px;
          background:var(--surface);
          overflow:hidden;
          box-shadow:0 18px 44px rgba(0,0,0,.07);
          display:flex;
          flex-direction:column;
        }
        .team-task-top {
          min-height:56px;
          padding:0 18px 0 22px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          border-bottom:1px solid var(--border);
          flex-shrink:0;
        }
        .team-task-top h2 {
          margin:0;
          font-size:15px;
          font-weight:700;
          letter-spacing:-.15px;
        }
        .team-task-plus {
          width:30px;
          height:30px;
          border:0;
          border-radius:9px;
          background:transparent;
          color:var(--text-muted);
          font:inherit;
          font-size:20px;
          line-height:1;
          cursor:pointer;
        }
        .team-task-plus:hover { background:var(--surface-2); color:var(--text); }
        .team-task-toolbar {
          min-height:58px;
          padding:0 18px 0 14px;
          display:flex;
          align-items:center;
          gap:10px;
          border-bottom:1px solid color-mix(in srgb, var(--border) 78%, transparent);
          flex-shrink:0;
        }
        .team-task-filter {
          height:32px;
          padding:0 14px;
          display:flex;
          align-items:center;
          border-radius:999px;
          background:var(--surface-2);
          border:1px solid var(--border);
          color:var(--text);
          font-size:12.5px;
          font-weight:700;
          white-space:nowrap;
        }
        .team-task-counts {
          color:var(--text-muted);
          font-size:12px;
          font-weight:650;
          white-space:nowrap;
        }
        .team-task-actions {
          margin-left:auto;
          display:flex;
          align-items:center;
          gap:8px;
        }
        .team-task-actions span {
          width:34px;
          height:34px;
          border-radius:999px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:var(--surface-2);
          border:1px solid var(--border);
          color:var(--text-muted);
        }
        .team-task-table-wrap {
          width:100%;
          overflow:auto;
          flex:1;
        }
        .team-task-head,
        .team-task-row {
          min-width:1080px;
          display:grid;
          grid-template-columns:minmax(360px,1.55fr) minmax(150px,.8fr) 100px 104px 130px 76px 110px;
          align-items:center;
          gap:22px;
        }
        .team-task-head {
          min-height:46px;
          padding:0 28px 0 42px;
          color:var(--text-muted);
          font-size:12.5px;
          font-weight:650;
        }
        .team-task-row {
          min-height:58px;
          padding:0 28px 0 42px;
          color:var(--text-secondary);
          border-bottom:0;
          font-size:12.5px;
        }
        .team-task-row:hover { background:color-mix(in srgb, var(--surface-2) 42%, transparent); }
        .team-task-name {
          min-width:0;
          display:flex;
          align-items:center;
          gap:10px;
        }
        .team-task-cube {
          width:22px;
          height:22px;
          display:flex;
          align-items:center;
          justify-content:center;
          color:var(--text-muted);
          flex-shrink:0;
        }
        .team-task-name span:last-child {
          min-width:0;
          display:block;
        }
        .team-task-name strong {
          display:block;
          color:var(--text);
          font-size:13px;
          font-weight:700;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .team-task-name small {
          display:block;
          margin-top:2px;
          color:var(--text-muted);
          font-size:11.5px;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .team-task-health {
          min-width:0;
          display:flex;
          align-items:center;
          gap:8px;
          color:var(--text-muted);
          font-weight:650;
        }
        .team-task-health i {
          width:15px;
          height:15px;
          border-radius:50%;
          border:2px dashed currentColor;
          opacity:.7;
          flex-shrink:0;
        }
        .team-task-health span {
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .team-task-health.health-done {
          color:var(--green);
        }
        .team-task-health.health-done i {
          border-style:solid;
          background:currentColor;
        }
        .team-task-health.health-active {
          color:var(--amber);
        }
        .team-task-priority {
          color:var(--text-muted);
          font-size:11.5px;
          font-weight:800;
          letter-spacing:.04em;
        }
        .team-task-priority.priority-critical,
        .team-task-priority.priority-high { color:var(--text); }
        .team-task-assigned {
          min-width:0;
          display:flex;
          align-items:center;
          gap:8px;
        }
        .team-task-assigned img,
        .team-task-assigned span {
          width:24px;
          height:24px;
          border-radius:50%;
          flex-shrink:0;
          object-fit:cover;
          background:var(--surface-2);
          border:1px solid var(--border);
          color:var(--text-secondary);
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:10.5px;
          font-weight:800;
          font-style:normal;
        }
        .team-task-assigned em {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          font-style:normal;
          color:var(--text-secondary);
          font-weight:650;
        }
        .team-task-date,
        .team-task-issues {
          color:var(--text-secondary);
          font-weight:700;
          font-variant-numeric:tabular-nums;
        }
        .team-task-status {
          width:max-content;
          max-width:100%;
          height:26px;
          padding:0 10px;
          display:flex;
          align-items:center;
          gap:7px;
          border-radius:999px;
          border:1px solid var(--border);
          background:var(--surface-2);
          color:var(--text-muted);
          font-size:10.5px;
          font-weight:850;
          letter-spacing:.03em;
          white-space:nowrap;
        }
        .team-task-status i {
          width:9px;
          height:9px;
          border-radius:50%;
          border:2px dotted currentColor;
          flex-shrink:0;
        }
        .team-task-status.status-active {
          color:#2f6fb2;
          background:color-mix(in srgb, #dcecff 52%, var(--surface));
          border-color:color-mix(in srgb, #8fb7e6 48%, var(--border));
        }
        .team-task-status.status-done {
          color:var(--green);
          background:color-mix(in srgb, var(--green) 12%, var(--surface));
          border-color:color-mix(in srgb, var(--green) 32%, var(--border));
        }
        .team-task-status.status-done i {
          border-style:solid;
          background:currentColor;
        }
        .team-task-empty {
          min-height:calc(100vh - 340px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:28px;
          color:var(--text-muted);
          font-size:13px;
          text-align:center;
          border-bottom:1px solid var(--border);
        }
        [data-theme="dark"] .team-task-status.status-active {
          color:#8dbfff;
          background:rgba(92, 140, 210, .14);
          border-color:rgba(141, 191, 255, .22);
        }
        [data-theme="dark"] .team-task-shell {
          background:#101010;
          border-color:#242424;
          box-shadow:0 18px 54px rgba(0,0,0,.42);
        }
      `}</style>

      {/* ── Invite Modal ── */}
      {inviteOpen && (
        <div className="inv-overlay" onClick={() => setInviteOpen(false)}>
          <div className="inv-backdrop" />
          <div className="inv-panel" onClick={e => e.stopPropagation()}>
            <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
              <div>
                <h2 style={{ margin:'0 0 3px', fontSize:17, fontWeight:700, letterSpacing:'-.3px' }}>Mitglied einladen</h2>
                <p style={{ margin:0, fontSize:12.5, color:'var(--text-muted)' }}>Zugang wird nach Prüfung freigeschaltet.</p>
              </div>
              <button onClick={() => setInviteOpen(false)} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexShrink:0 }}>
                <X size={13} weight="bold" />
              </button>
            </div>
            <div style={{ padding:'20px 24px 24px' }}>
              {invSent ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'20px 0', textAlign:'center' }}>
                  <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(52,199,89,.1)', border:'1px solid rgba(52,199,89,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Check size={20} weight="bold" color="var(--green)" />
                  </div>
                  <div>
                    <p style={{ fontSize:15, fontWeight:700, color:'var(--text)', margin:'0 0 4px' }}>Einladung gesendet</p>
                    <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0 }}>Wir senden den Zugang direkt zu.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', marginBottom:6, textTransform:'uppercase' }}>E-Mail-Adresse</label>
                    <input
                      value={invEmail} onChange={e => setInvEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendInvite()}
                      type="email" placeholder="name@firma.com" autoFocus
                      style={{ width:'100%', padding:'10px 13px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)', fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
                      onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                  <div style={{ marginBottom:20 }}>
                    <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', marginBottom:6, textTransform:'uppercase' }}>Rolle</label>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                      {[
                        { id:'collaborator', label:'Client', desc:'Strategische Sicht, Kommentare' },
                        { id:'dev',          label:'Developer', desc:'Execution Layer, Tasks, Code' },
                      ].map(r => (
                        <button key={r.id} onClick={() => setInvRole(r.id)}
                          style={{ padding:'10px 12px', borderRadius:10, border:`1.5px solid ${invRole===r.id?'var(--border-strong)':'var(--border)'}`, background:invRole===r.id?'var(--surface-2)':'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'border-color .12s, background .12s' }}>
                          <p style={{ fontSize:12.5, fontWeight:700, color:'var(--text)', margin:'0 0 2px' }}>{r.label}</p>
                          <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, lineHeight:1.4 }}>{r.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={sendInvite} disabled={!invEmail.includes('@') || invSending}
                    style={{ width:'100%', padding:'12px', background:invEmail.includes('@')?'var(--btn-prim)':'var(--surface-2)', color:invEmail.includes('@')?'var(--btn-prim-text)':'var(--text-muted)', border:'none', borderRadius:11, fontSize:13.5, fontWeight:700, cursor:invEmail.includes('@')?'pointer':'default', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7, transition:'background .15s, color .15s' }}>
                    {invSending
                      ? <><span style={{ width:13, height:13, border:'2px solid transparent', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }}/>Wird gesendet…</>
                      : <><Envelope size={14} weight="bold"/>Einladung senden</>
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Task Assignment Panel ── */}
      {assigningMember && (
        <>
          <div className="assign-backdrop" onClick={() => setAssigningMember(null)} />
          <div className="assign-panel">
            {/* Header */}
            <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', textTransform:'uppercase', margin:'0 0 2px' }}>Aufgaben zuweisen</p>
                <h2 style={{ fontSize:17, fontWeight:700, letterSpacing:'-.3px', margin:0 }}>{nameOf(assigningMember)}</h2>
              </div>
              <button onClick={() => setAssigningMember(null)} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexShrink:0 }}>
                <X size={13} weight="bold" />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>
              {/* Member info */}
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface-2)', borderRadius:12, border:'1px solid var(--border)' }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--surface)', border:'2px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, overflow:'hidden', flexShrink:0 }}>
                  {assigningMember.avatar_url
                    ? <img src={assigningMember.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : initOf(assigningMember)
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13.5, fontWeight:700, color:'var(--text)', margin:0 }}>{nameOf(assigningMember)}</p>
                  <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:'2px 0 0' }}>{assigningMember.email ?? ''}</p>
                </div>
                <span style={{ padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', background:roleBg(assigningMember.role), color:roleColor(assigningMember.role) }}>
                  {roleLabel(assigningMember.role)}
                </span>
              </div>

              {/* Task areas */}
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', textTransform:'uppercase', margin:'0 0 10px' }}>
                  Verantwortungsbereiche <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:500, letterSpacing:0, textTransform:'none' }}>— welche Bereiche kontrolliert diese Person?</span>
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                  {TASK_AREAS.map(({ id, label, desc, Icon }) => {
                    const on = editAssignment.areas.includes(id)
                    return (
                      <button key={id} className={`area-chip${on?' on':''}`} onClick={() => toggleArea(id)}
                        style={{ display:'flex', alignItems:'flex-start', gap:9, padding:'10px 11px', borderRadius:10, border:`1.5px solid ${on?'var(--text)':'var(--border)'}`, background:on?'var(--nav-on)':'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                        <div style={{ width:24, height:24, borderRadius:7, background:on?'var(--text)':'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, transition:'background .12s' }}>
                          <Icon size={12} weight={on?'bold':'regular'} color={on?'var(--bg)':'var(--text-muted)'} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', margin:0 }}>{label}</p>
                          <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'1px 0 0', lineHeight:1.35 }}>{desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Create tasks toggle */}
              <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', background:'var(--surface-2)', borderRadius:12, border:'1px solid var(--border)' }}>
                <button onClick={() => setEditAssignment(p => ({ ...p, createTasks: !p.createTasks }))}
                  style={{ width:38, height:22, borderRadius:999, background:editAssignment.createTasks?'var(--text)':'var(--border)', border:'none', cursor:'pointer', position:'relative', flexShrink:0, marginTop:2, transition:'background .15s' }}>
                  <span style={{ position:'absolute', top:3, width:16, height:16, borderRadius:'50%', background:'var(--bg)', transition:'left .15s', left:editAssignment.createTasks?19:3, display:'block' }}/>
                </button>
                <div>
                  <p style={{ fontSize:12.5, fontWeight:700, color:'var(--text)', margin:0 }}>Tasks erstellen</p>
                  <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:'2px 0 0', lineHeight:1.45 }}>
                    Dieses Mitglied kann in den zugewiesenen Bereichen eigenständig Tasks anlegen und verwalten.
                  </p>
                </div>
              </div>

              {/* Note */}
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:7 }}>Notiz (optional)</label>
                <textarea
                  value={editAssignment.note}
                  onChange={e => setEditAssignment(p => ({ ...p, note: e.target.value }))}
                  placeholder="z. B. Fokus auf Backend-Architektur und API-Design…"
                  rows={3}
                  style={{ width:'100%', padding:'10px 13px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--text)', fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', transition:'border-color .15s', lineHeight:1.5 }}
                  onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
              <button onClick={() => setAssigningMember(null)} style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'background .12s' }}>
                Abbrechen
              </button>
              <button onClick={saveAssign} style={{ flex:2, padding:'11px', borderRadius:10, border:'none', background:'var(--btn-prim)', color:'var(--btn-prim-text)', fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                <Check size={14} weight="bold" />
                Speichern
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom:24 }}>
        <h1>Teams</h1>
        <p>Mitglieder einladen, Aufgaben zuweisen und Zugriffsrechte strukturieren.</p>
      </div>

      {/* ── Tabs ── */}
      <div className="team-tabs" role="tablist" aria-label="Teams Ansichten">
        {TEAM_TABS.map(t => (
          <button key={t.id} className={`tab-btn${tab===t.id?' on':''}`} onClick={() => setTab(t.id)} role="tab" aria-selected={tab === t.id}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <TeamTasksTable
          tasks={teamTasks}
          projects={teamProjects}
          members={members}
          loading={teamTasksLoading}
        />
      )}

      {/* ────────────────────────────────────────────
          TAB — OVERVIEW / MEMBERS
      ──────────────────────────────────────────── */}
      {(tab === 'overview' || tab === 'members') && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14, alignItems:'start' }}>

          {/* Members grid */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ margin:0, fontSize:15, fontWeight:700, letterSpacing:'-.2px' }}>Dein Team</h3>
                <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--text-muted)' }}>{members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}</p>
              </div>
              <button onClick={() => openInvite()}
                style={{ display:'flex', alignItems:'center', gap:5, fontSize:12.5, fontWeight:700, padding:'7px 13px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:9, cursor:'pointer', fontFamily:'inherit' }}>
                <Plus size={12} weight="bold" />
                Einladen
              </button>
            </div>

            {members.length === 0 ? (
              <div style={{ padding:'48px 24px', textAlign:'center' }}>
                <div style={{ width:48, height:48, borderRadius:14, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                  <Users size={22} weight="regular" color="var(--text-muted)" />
                </div>
                <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:'0 0 5px' }}>Noch keine Mitglieder</p>
                <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:'0 0 18px', lineHeight:1.5 }}>Lade Entwickler oder Kollaboratoren ein, um zu starten.</p>
                <button onClick={() => openInvite()} style={{ padding:'9px 18px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  Erstes Mitglied einladen
                </button>
              </div>
            ) : (
              <div style={{ padding:'12px' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {members.map(m => {
                    const isMe = m.id === me?.id
                    const asgn = assignments[m.id]
                    const areaCount = asgn?.areas.length ?? 0
                    return (
                      <div key={m.id} className="tm-card"
                        onClick={() => openAssign(m)}
                        style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 13px', borderRadius:11, border:'1.5px solid transparent', background:'transparent' }}>
                        <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--surface-2)', border:'2px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, overflow:'hidden', flexShrink:0 }}>
                          {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initOf(m)}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <p style={{ fontSize:13.5, fontWeight:700, color:'var(--text)', margin:0 }}>{nameOf(m)}{isMe?' (Du)':''}</p>
                            <span style={{ padding:'2px 6px', borderRadius:5, fontSize:9.5, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', background:roleBg(m.role), color:roleColor(m.role) }}>
                              {roleLabel(m.role)}
                            </span>
                          </div>
                          <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {areaCount > 0
                              ? `${areaCount} Bereich${areaCount>1?'e':''} zugewiesen${asgn?.createTasks?' · Tasks aktiv':''}`
                              : (m.email ?? 'Keine Bereiche zugewiesen')
                            }
                          </p>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          {areaCount > 0 && (
                            <span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:6, background:'var(--surface-2)', color:'var(--text-secondary)' }}>
                              {areaCount} Bereiche
                            </span>
                          )}
                          <PencilSimple size={13} weight="regular" color="var(--text-muted)" />
                        </div>
                      </div>
                    )
                  })}

                  {/* Add slot */}
                  <div onClick={() => openInvite()}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 13px', borderRadius:11, border:'1.5px dashed var(--border)', cursor:'pointer', opacity:.6, transition:'opacity .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity='1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity='.6')}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Plus size={14} weight="bold" color="var(--text-muted)" />
                    </div>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)', margin:0 }}>Mitglied einladen…</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

            {/* Invite CTA */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
              <h3 style={{ margin:'0 0 4px', fontSize:14, fontWeight:700 }}>Team erweitern</h3>
              <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:'0 0 14px', lineHeight:1.5 }}>
                Founder, Developer oder Agency-Client einladen.
              </p>
              <button onClick={() => openInvite()}
                style={{ width:'100%', padding:'11px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:10, fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                <Envelope size={14} weight="bold" />
                Einladung senden
              </button>
            </div>

            {/* How assignment works */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
              <h3 style={{ margin:'0 0 12px', fontSize:13.5, fontWeight:700 }}>Aufgaben-Zuweisung</h3>
              {[
                { Icon: ListChecks, text:'Klicke ein Mitglied an, um Verantwortungsbereiche zuzuweisen.' },
                { Icon: CheckCircle, text:'Definiere, ob das Mitglied Tasks selbst anlegen darf.' },
                { Icon: ArrowsClockwise, text:'Zuweisungen werden lokal gespeichert und bleiben erhalten.' },
              ].map(({ Icon, text }, i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width:26, height:26, borderRadius:8, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={13} weight="regular" color="var(--text-muted)" />
                  </div>
                  <p style={{ fontSize:12, color:'var(--text-secondary)', margin:0, lineHeight:1.5, flex:1 }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Roles */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
              <h3 style={{ margin:'0 0 12px', fontSize:13.5, fontWeight:700 }}>Rollen & Zugriff</h3>
              {[
                { role:'Owner',          color:'var(--amber)', desc:'Vollzugriff: Strategie, Budget, AI' },
                { role:'Lead Developer', color:'var(--green)',  desc:'Execution Layer, Code, kein Budget' },
                { role:'Developer',      color:'var(--green)',  desc:'Tasks & Projekte — kein Strategie-Zugriff' },
                { role:'Client',         color:'var(--text-muted)', desc:'Strategische Sicht, Kommentare' },
              ].map(r => (
                <div key={r.role} style={{ padding:'7px 0', borderBottom:'1px solid var(--border)', display:'flex', gap:8, alignItems:'flex-start' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:r.color, flexShrink:0, marginTop:5 }}/>
                  <div>
                    <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', margin:0 }}>{r.role}</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)', margin:'1px 0 0', lineHeight:1.35 }}>{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────
          TAB — SZENARIEN
      ──────────────────────────────────────────── */}
      {tab === 'scenarios' && (
        <div>
          <div style={{ marginBottom:20, maxWidth:580 }}>
            <p style={{ fontSize:13.5, color:'var(--text-secondary)', margin:0, lineHeight:1.6 }}>
              Festag strukturiert Zusammenarbeit über kontextbasierte Team-Modelle. Wähle das Modell, das zu deiner Konstellation passt.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:10 }}>
            {SCENARIOS.map((sc, idx) => (
              <div key={sc.id} className="sc-card"
                style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'20px', display:'flex', flexDirection:'column', gap:0, position:'relative', animation:`fadeUp .3s ${idx*.06}s both` }}>
                {sc.badge && (
                  <span style={{ position:'absolute', top:14, right:14, padding:'2px 8px', borderRadius:999, background:'var(--surface-2)', color:'var(--text-muted)', fontSize:9, fontWeight:700, letterSpacing:'.1em' }}>
                    {sc.badge}
                  </span>
                )}
                <div style={{ width:36, height:36, borderRadius:10, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, flexShrink:0 }}>
                  <sc.Icon size={17} weight="regular" color="var(--text-secondary)" />
                </div>
                <p style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:'0 0 3px' }}>{sc.eyebrow}</p>
                <h3 style={{ fontSize:16, fontWeight:700, margin:'0 0 2px', letterSpacing:'-.3px' }}>{sc.title}</h3>
                <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:'0 0 10px', fontWeight:500 }}>{sc.subtitle}</p>
                <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:'0 0 14px', lineHeight:1.55, flex:1 }}>{sc.desc}</p>

                <div style={{ marginBottom:14, display:'flex', flexDirection:'column', gap:1 }}>
                  {sc.access.map(a => (
                    <div key={a} style={{ display:'flex', alignItems:'center', gap:7, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
                      <Eye size={11} weight="regular" color="var(--green)" />
                      <span style={{ fontSize:11.5, color:'var(--text-secondary)' }}>{a}</span>
                    </div>
                  ))}
                  {sc.denied.map(d => (
                    <div key={d} style={{ display:'flex', alignItems:'center', gap:7, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
                      <EyeSlash size={11} weight="regular" color="var(--text-muted)" />
                      <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>{d}</span>
                    </div>
                  ))}
                </div>

                {sc.mailto ? (
                  <a href={sc.mailto}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 14px', background:'var(--surface-2)', color:'var(--text)', borderRadius:10, fontSize:12.5, fontWeight:700, textDecoration:'none', border:'1px solid var(--border)', transition:'background .12s' }}>
                    {sc.cta} <CaretRight size={11} weight="bold" />
                  </a>
                ) : (
                  <button onClick={() => openInvite()}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, width:'100%', padding:'9px 14px', background:'var(--surface-2)', color:'var(--text)', borderRadius:10, fontSize:12.5, fontWeight:700, textAlign:'center', border:'1px solid var(--border)', cursor:'pointer', fontFamily:'inherit', transition:'background .12s' }}>
                    {sc.cta} <CaretRight size={11} weight="bold" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Architecture note */}
          <div style={{ marginTop:16, padding:'14px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <ArrowsClockwise size={14} weight="regular" color="var(--text-muted)" />
            </div>
            <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:0, lineHeight:1.6 }}>
              <strong style={{ color:'var(--text)' }}>Team → Projekte → User</strong> — nicht User → Projekte.
              Agenturen verwalten mehrere Teams, nicht mehrere Projekte. AI hält pro Team einen eigenständigen Kontext.
            </p>
          </div>
        </div>
      )}

      {tab === 'invitations' && (
        <TeamsTabPlaceholder
          title="Einladungen"
          description="Invite Flow, PIN-Zugang und ausstehende Einladungen liegen hier, nicht in der Hauptsidebar."
          rows={['E-Mail Einladung vorbereiten', 'PIN Einladung anzeigen', 'Ausstehende Einladungen', 'Einladung erneut senden oder widerrufen']}
        />
      )}

      {tab === 'roles' && (
        <TeamsTabPlaceholder
          title="Rollen & Rechte"
          description="Client-seitige Rollen, Sichtbarkeit und Projektzugriffe werden als Administration innerhalb der Teams-Seite geführt."
          rows={['Owner / Admin', 'Founder / Co-Founder', 'Developer / Lead Developer', 'Agency Developer', 'Viewer']}
        />
      )}

      {tab === 'seats' && (
        <TeamsTabPlaceholder
          title="Seats"
          description="Aktive Mitarbeit braucht Seats. Lesen und eingeschraenkter Zugriff bleiben sauber davon getrennt."
          rows={['Aktive Seats', 'Seat erforderlich', 'Free Viewer', 'Upgrade Hinweis']}
        />
      )}

      {tab === 'assigned' && (
        <TeamsTabPlaceholder
          title="Zugewiesene Projekte"
          description="Developer und Teammitglieder sehen nur die Projekte, die ihnen wirklich zugewiesen wurden."
          rows={['Systemische Beratung Praxis-Website', 'Praxis-Website', 'Festag Client Panel']}
        />
      )}

      {tab === 'communication' && (
        <TeamsTabPlaceholder
          title="Team-Kommunikation"
          description="Operative Abstimmung bleibt im Teams-Kontext. Die Sidebar bleibt trotzdem ruhig."
          rows={['Team Update', 'Technische Rueckfrage', 'Blocker Meldung', 'Tagro Zusammenfassung']}
        />
      )}
    </div>
  )
}
