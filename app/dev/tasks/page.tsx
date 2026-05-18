'use client'

/**
 * /dev/tasks — Operatives Kontrollzentrum für jeden Developer.
 *
 * Drei Layer:
 *   1. Liste / Board / Focus — drei Sichten auf dieselben Daten
 *   2. Filter — Projekt, Client, Status, Priorität, Arbeitstyp, Verification
 *   3. Drawer — Beschreibung, Tagro-Context, Checklist, Proof, Work-Log,
 *               Activity, Status-Step-Bar, Mark-as-Finished, Approve
 *
 * Status-Mapping erfolgt 1:1 nach `lib/tasks/work-types.ts`. Schreibwege
 * gehen ausschließlich über die /api/dev/tasks/* Endpoints, damit Tagro
 * Spiegelung + Activity-Log konsistent geschrieben werden.
 *
 * Mobile: Tabellenzeilen werden zu Cards, Drawer wird Fullscreen.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRight, ArrowsClockwise, ArrowSquareOut, CheckCircle, CheckSquare, Circle,
  Clock, Copy, FunnelSimple, GitBranch, GitCommit, GitPullRequest, Image as ImageIcon,
  Lightning, Link as LinkIcon, ListChecks, MagnifyingGlass, Paperclip,
  PaperPlaneTilt, Pause, Play, PlusCircle, Robot, Sparkle, Square, TrashSimple,
  WarningCircle, X,
} from '@phosphor-icons/react'

import {
  DEV_FLOW_LABEL, type DevFlow, devFlowFromLegacy, progressFromDevFlow,
  clientStatusFromDevFlow, CLIENT_VISIBLE_LABEL,
  PROOF_LABELS, WORK_TYPES, workTypeOf, type ProofType,
} from '@/lib/tasks/work-types'

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

type Task = {
  id: string
  title: string
  description?: string | null
  dev_description?: string | null
  client_description?: string | null
  status?: string | null
  dev_status?: string | null
  client_status?: string | null
  client_visible_status?: string | null
  priority?: string | null
  project_id?: string | null
  parent_task_id?: string | null
  assigned_to?: string | null
  estimated_hours?: number | null
  branch_name?: string | null
  work_type?: string | null
  definition_of_done?: string | null
  expected_outcome?: string | null
  required_proof_types?: string[] | null
  tagro_verification_status?: string | null
  tagro_confidence?: number | null
  tagro_verification_summary?: string | null
  tagro_internal_notes?: string | null
  tagro_client_summary?: string | null
  finished_by_dev_at?: string | null
  verified_by_tagro_at?: string | null
  approved_by_owner_at?: string | null
  last_dev_action_at?: string | null
  updated_at?: string | null
  deadline?: string | null
  due_date?: string | null
  projects?: { title?: string | null; color?: string | null; user_id?: string | null; client_id?: string | null } | null
}

type Proof = {
  id: string; proof_type: string; url: string | null; description: string | null;
  source: string | null; source_ref: string | null; created_at: string;
}
type ChecklistItem = { id: string; label: string; done: boolean; position: number }
type Commit = {
  id: string; commit_sha: string; message: string | null;
  commit_url: string | null; committed_at: string | null; task_id: string | null;
}
type Pull = {
  id: string; pr_number: number; title: string | null; state: string | null;
  merged: boolean | null; pr_url: string | null; updated_at_github: string | null;
}
type Update = { id: string; update_text: string; status: string | null; blocker: boolean; created_at: string }
type Activity = { id: string; actor_kind: string; event: string; metadata: any; created_at: string }
type Verification = {
  id: string; status: string; confidence: number | null;
  summary: string | null; client_summary: string | null;
  issues_json: any; evidence_json: any; recommended_next_action: string | null;
  created_at: string;
}
type WorkSession = {
  id: string; task_id: string | null; started_at: string;
  ended_at: string | null; duration_seconds: number | null;
}
type ProjectLite = { id: string; title: string; color?: string | null }

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

const DEV_STEPS: DevFlow[] = ['new','assigned','in_progress','needs_review','finished_by_dev','verified_by_tagro','approved_by_owner','completed']
const SETTABLE_BY_DEV: DevFlow[] = ['new','assigned','in_progress','needs_review','blocked','cancelled']

function dotColor(flow: DevFlow) {
  switch (flow) {
    case 'in_progress': return '#22c55e'
    case 'needs_review':
    case 'finished_by_dev': return '#f59e0b'
    case 'verified_by_tagro': return 'var(--accent)'
    case 'approved_by_owner':
    case 'completed': return '#16A34A'
    case 'blocked': return '#ef4444'
    case 'cancelled': return '#64748b'
    case 'assigned': return 'var(--text-secondary)'
    default: return 'var(--text-muted)'
  }
}

function verificationTone(s?: string | null) {
  switch (s) {
    case 'verified': return { color: '#16A34A', label: 'Tagro Verified' }
    case 'needs_review': return { color: '#f59e0b', label: 'Needs Review' }
    case 'proof_missing': return { color: '#ef4444', label: 'Proof Missing' }
    case 'quality_issue': return { color: '#ef4444', label: 'Quality Issue' }
    case 'blocked': return { color: '#ef4444', label: 'Blocked' }
    case 'cannot_verify': return { color: 'var(--text-muted)', label: 'Manual Review' }
    default: return null
  }
}

function priorityLabel(p?: string | null) {
  if (p === 'critical') return 'Kritisch'
  if (p === 'high')     return 'Hoch'
  if (p === 'low')      return 'Niedrig'
  return 'Mittel'
}

function dateLabel(v?: string | null) {
  if (!v) return '—'
  try { return new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(v)) }
  catch { return '—' }
}
function dueLabel(v?: string | null) {
  if (!v) return null
  try { return new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'short' }).format(new Date(v)) }
  catch { return null }
}
function shortSha(s?: string | null) { return (s || '').slice(0, 7) }
function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 56)
}
function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`
  if (m > 0) return `${m}m ${String(sec).padStart(2,'0')}s`
  return `${sec}s`
}

// ────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────

type View = 'list' | 'board' | 'focus'

export default function DevTasksPage() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')

  // filters
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<DevFlow | ''>('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [filterWorkType, setFilterWorkType] = useState<string>('')
  const [filterVerification, setFilterVerification] = useState<string>('')
  const [filterMine, setFilterMine] = useState(true)

  // drawer
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = tasks.find(t => t.id === selectedId) || null
  const [proofs, setProofs]     = useState<Proof[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [commits, setCommits]   = useState<Commit[]>([])
  const [pulls, setPulls]       = useState<Pull[]>([])
  const [updates, setUpdates]   = useState<Update[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [openSession, setOpenSession] = useState<WorkSession | null>(null)
  const [taskSessions, setTaskSessions] = useState<WorkSession[]>([])
  const [tick, setTick] = useState(0)

  // editors
  const [noteText, setNoteText] = useState('')
  const [blockerText, setBlockerText] = useState('')
  const [branchInput, setBranchInput] = useState('')
  const [newProofType, setNewProofType] = useState<ProofType>('comment')
  const [newProofUrl, setNewProofUrl] = useState('')
  const [newProofDesc, setNewProofDesc] = useState('')
  const [newChecklistLabel, setNewChecklistLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [proofMissingHint, setProofMissingHint] = useState<string[] | null>(null)

  const closeDrawer = useCallback(() => {
    setSelectedId(null); setNoteText(''); setBlockerText(''); setBranchInput('')
    setProofMissingHint(null)
  }, [])

  // ──────── initial load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const uid = session.user.id
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle()
      if (cancelled) return
      setUserId(uid); setRole((prof as any)?.role ?? null)
      await reload(uid)
      try {
        const res = await fetch('/api/dev/work-sessions?open=1&limit=1')
        const d = await res.json().catch(() => ({}))
        if (!cancelled) setOpenSession(d?.sessions?.[0] ?? null)
      } catch {}
      try {
        const url = new URL(window.location.href)
        const id = url.searchParams.get('id')
        if (id && !cancelled) setSelectedId(id)
      } catch {}
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // tick timer
  useEffect(() => {
    if (!openSession) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [openSession])
  void tick

  // ──────── tasks fetch
  async function reload(uid: string | null = userId) {
    if (!uid) return
    setLoading(true)
    const { data: pa } = await supabase
      .from('project_assignments').select('project_id,projects(id,title,color)')
      .eq('user_id', uid).eq('active', true)
    const projList = ((pa as any[]) ?? []).map(r => r.projects).filter(Boolean) as ProjectLite[]
    setProjects(projList)
    const projIds = projList.map(p => p.id)

    let q = supabase
      .from('tasks')
      .select('id,title,description,dev_description,client_description,status,dev_status,client_status,client_visible_status,priority,project_id,parent_task_id,assigned_to,estimated_hours,branch_name,work_type,definition_of_done,expected_outcome,required_proof_types,tagro_verification_status,tagro_confidence,tagro_verification_summary,tagro_internal_notes,tagro_client_summary,finished_by_dev_at,verified_by_tagro_at,approved_by_owner_at,last_dev_action_at,updated_at,due_date,projects(title,color,user_id,client_id)')
      .order('last_dev_action_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false }).limit(300)
    if (projIds.length > 0) {
      q = q.or(`assigned_to.eq.${uid},project_id.in.(${projIds.join(',')})`)
    } else {
      q = q.eq('assigned_to', uid)
    }
    const { data } = await q
    setTasks((data as Task[] | null) ?? [])
    setLoading(false)
  }

  // ──────── drawer data load
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    ;(async () => {
      try {
        const [p, c, gh, wl, vs, ws] = await Promise.all([
          fetch(`/api/dev/tasks/proofs?taskId=${selectedId}`).then(r => r.json()),
          fetch(`/api/dev/tasks/checklist?taskId=${selectedId}`).then(r => r.json()),
          fetch(`/api/github/activity?taskId=${selectedId}&limit=20`).then(r => r.json()),
          fetch(`/api/dev/tasks/work-log?taskId=${selectedId}`).then(r => r.json()),
          (supabase as any).from('tagro_verifications')
            .select('id,status,confidence,summary,client_summary,issues_json,evidence_json,recommended_next_action,created_at')
            .eq('task_id', selectedId).order('created_at', { ascending: false }).limit(6),
          fetch(`/api/dev/work-sessions?taskId=${selectedId}&limit=10`).then(r => r.json()),
        ])
        if (cancelled) return
        setProofs(p?.proofs ?? [])
        setChecklist(c?.items ?? [])
        setCommits(gh?.commits ?? [])
        setPulls(gh?.pulls ?? [])
        setUpdates(wl?.updates ?? [])
        setActivity(wl?.activity ?? [])
        setVerifications((vs?.data as Verification[]) ?? [])
        setTaskSessions(ws?.sessions ?? [])
      } catch {}
    })()
    return () => { cancelled = true }
  }, [selectedId, supabase])

  // ──────── reset drawer editors on selection change
  useEffect(() => {
    if (!selected) return
    setNoteText('')
    setBlockerText('')
    setBranchInput(selected.branch_name || `feature/${slugify(selected.title || 'task')}-${selected.id.slice(0,8)}`)
    setProofMissingHint(null)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ──────── derived
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterMine && t.assigned_to !== userId) return false
      if (filterProject && t.project_id !== filterProject) return false
      if (filterStatus && devFlowFromLegacy(t.status, t.dev_status) !== filterStatus) return false
      if (filterPriority && (t.priority ?? 'medium') !== filterPriority) return false
      if (filterWorkType && (t.work_type ?? 'other') !== filterWorkType) return false
      if (filterVerification && (t.tagro_verification_status ?? '') !== filterVerification) return false
      if (search) {
        const q = search.toLowerCase()
        const blob = [t.title, t.description, t.dev_description, t.projects?.title].join(' ').toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [tasks, filterMine, filterProject, filterStatus, filterPriority, filterWorkType, filterVerification, search, userId])

  const stats = useMemo(() => {
    const all = filteredTasks
    const active   = all.filter(t => devFlowFromLegacy(t.status, t.dev_status) === 'in_progress').length
    const review   = all.filter(t => ['needs_review','finished_by_dev'].includes(devFlowFromLegacy(t.status, t.dev_status))).length
    const verified = all.filter(t => devFlowFromLegacy(t.status, t.dev_status) === 'verified_by_tagro').length
    const blocked  = all.filter(t => devFlowFromLegacy(t.status, t.dev_status) === 'blocked').length
    return { active, review, verified, blocked, total: all.length }
  }, [filteredTasks])

  // ──────── actions
  const isOwnerRole = role === 'admin' || role === 'project_owner'
  const liveSeconds = openSession ? Math.floor((Date.now() - new Date(openSession.started_at).getTime()) / 1000) : 0

  async function setStatus(devStatus: DevFlow) {
    if (!selected) return
    if (!SETTABLE_BY_DEV.includes(devStatus)) {
      setToast('Diesen Status kann nur Tagro / Project Owner setzen.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/dev/tasks/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selected.id, devStatus,
          note: noteText.trim() || undefined,
          blockerDescription: devStatus === 'blocked' ? (blockerText.trim() || undefined) : undefined,
          branchName: branchInput.trim() || undefined,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setToast(d?.error || 'Status nicht setzbar.'); return }
      setTasks(prev => prev.map(t => t.id === selected.id
        ? { ...t, dev_status: devStatus, status: d?.task?.status ?? t.status, client_visible_status: d?.task?.client_visible_status ?? t.client_visible_status, branch_name: branchInput.trim() || null, last_dev_action_at: new Date().toISOString() }
        : t))
      setNoteText(''); setBlockerText('')
      setToast(`Status: ${DEV_FLOW_LABEL[devStatus]}`)
    } finally { setBusy(false) }
  }

  async function claim() {
    if (!selected || !userId) return
    setBusy(true)
    try {
      await supabase.from('tasks').update({
        assigned_to: userId, dev_status: 'assigned',
        last_dev_action_at: new Date().toISOString(),
      }).eq('id', selected.id)
      setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, assigned_to: userId, dev_status: 'assigned' } : t))
      setToast('Task übernommen.')
    } finally { setBusy(false) }
  }

  async function addProof() {
    if (!selected || !newProofType) return
    setBusy(true)
    try {
      const res = await fetch('/api/dev/tasks/proofs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selected.id, proofType: newProofType,
          url: newProofUrl.trim() || null,
          description: newProofDesc.trim() || null,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setToast(d?.error || 'Proof nicht gespeichert.'); return }
      setProofs(prev => [d.proof, ...prev])
      setNewProofType('comment'); setNewProofUrl(''); setNewProofDesc('')
      setToast('Nachweis hinzugefügt.')
    } finally { setBusy(false) }
  }
  async function removeProof(id: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/dev/tasks/proofs', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proofId: id }),
      })
      if (res.ok) setProofs(prev => prev.filter(p => p.id !== id))
    } finally { setBusy(false) }
  }

  async function addChecklistItem() {
    if (!selected || !newChecklistLabel.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/dev/tasks/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selected.id, label: newChecklistLabel.trim() }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d?.item) setChecklist(prev => [...prev, d.item])
      setNewChecklistLabel('')
    } finally { setBusy(false) }
  }
  async function toggleChecklist(item: ChecklistItem) {
    setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i))
    await fetch('/api/dev/tasks/checklist', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, done: !item.done }),
    })
  }
  async function removeChecklist(item: ChecklistItem) {
    setChecklist(prev => prev.filter(i => i.id !== item.id))
    await fetch('/api/dev/tasks/checklist', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id }),
    })
  }

  async function postWorkLog() {
    if (!selected || !noteText.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/dev/tasks/work-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selected.id, text: noteText.trim() }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        setUpdates(prev => [d.log, ...prev])
        setNoteText('')
        setToast('Work Log gespeichert.')
      }
    } finally { setBusy(false) }
  }

  async function markFinished() {
    if (!selected) return
    setBusy(true); setProofMissingHint(null)
    try {
      const res = await fetch('/api/dev/tasks/finish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selected.id }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setToast(d?.error || 'Fehler beim Abschließen.'); return }
      const ver = d?.verification
      // refresh data
      setVerifications(prev => [{ ...ver, id: 'tmp-' + Date.now() }, ...prev])
      setTasks(prev => prev.map(t => t.id === selected.id ? {
        ...t,
        dev_status: d.task?.dev_status,
        client_visible_status: d.task?.client_visible_status,
        tagro_verification_status: ver?.status,
        tagro_confidence: ver?.confidence,
        tagro_verification_summary: ver?.summary,
        tagro_client_summary: ver?.clientSummary,
      } : t))
      if (ver?.status === 'proof_missing') {
        setProofMissingHint(ver.evidence?.requiredMissing || [])
        setToast('Tagro: Nachweise fehlen.')
      } else if (ver?.status === 'verified') {
        setToast('Tagro hat verifiziert.')
      } else {
        setToast(`Tagro: ${ver?.status}`)
      }
    } finally { setBusy(false) }
  }

  async function reVerify() {
    if (!selected) return
    setBusy(true)
    try {
      const res = await fetch('/api/tagro/verify-task', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selected.id }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        const ver = d?.verification
        setVerifications(prev => [{ ...ver, id: 'tmp-' + Date.now() }, ...prev])
        setTasks(prev => prev.map(t => t.id === selected.id ? {
          ...t,
          tagro_verification_status: ver?.status,
          tagro_confidence: ver?.confidence,
          tagro_verification_summary: ver?.summary,
        } : t))
        setToast(`Tagro: ${ver?.status}`)
      }
    } finally { setBusy(false) }
  }

  async function ownerDecision(decision: 'approve' | 'reject', reason?: string) {
    if (!selected) return
    setBusy(true)
    try {
      const res = await fetch('/api/dev/tasks/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selected.id, decision, reason }),
      })
      if (res.ok) {
        await reload()
        setToast(decision === 'approve' ? 'Approved · Client wird informiert' : 'Zurück an Developer')
      }
    } finally { setBusy(false) }
  }

  async function startTimer() {
    if (!selected) return
    const res = await fetch('/api/dev/work-sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: selected.id }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok) {
      setOpenSession(d.session)
      setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, dev_status: 'in_progress' } : t))
    }
  }
  async function stopTimer() {
    if (!openSession) return
    const res = await fetch('/api/dev/work-sessions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: openSession.id, end: true }),
    })
    if (res.ok) setOpenSession(null)
  }
  async function copyBranch() {
    if (!branchInput) return
    try { await navigator.clipboard.writeText(branchInput); setToast('Branch in Zwischenablage.') } catch {}
  }

  // ──────── render
  return (
    <div className="dev-page">
      {/* Header */}
      <header className="t-head">
        <div>
          <p className="dev-eyebrow">DEV · Tasks</p>
          <h1>Tasks</h1>
          <p className="meta">Your assigned work, verified by Tagro and synced with the client workspace.</p>
        </div>
        <div className="head-stats">
          <StatPill value={stats.active}  label="In Progress" tone="green" />
          <StatPill value={stats.review}  label="Needs Review" tone="amber" />
          <StatPill value={stats.verified} label="Verified" tone="accent" />
          <StatPill value={stats.blocked} label="Blocked" tone="red" />
        </div>
      </header>

      {/* Toolbar */}
      <div className="t-toolbar">
        <div className="t-search">
          <MagnifyingGlass size={13} />
          <input placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="t-filters">
          <Pill active={filterMine} onClick={() => setFilterMine(v => !v)}>Mine</Pill>
          <Select value={filterProject} onChange={setFilterProject} placeholder="Projekt">
            <option value="">Alle Projekte</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Select value={filterStatus} onChange={v => setFilterStatus(v as DevFlow | '')} placeholder="Status">
            <option value="">Alle Status</option>
            {DEV_STEPS.map(s => <option key={s} value={s}>{DEV_FLOW_LABEL[s]}</option>)}
          </Select>
          <Select value={filterPriority} onChange={setFilterPriority} placeholder="Priorität">
            <option value="">Alle Prioritäten</option>
            <option value="critical">Kritisch</option>
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </Select>
          <Select value={filterWorkType} onChange={setFilterWorkType} placeholder="Arbeitstyp">
            <option value="">Alle Typen</option>
            {WORK_TYPES.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
          </Select>
          <Select value={filterVerification} onChange={setFilterVerification} placeholder="Verification">
            <option value="">Alle</option>
            <option value="verified">Verified</option>
            <option value="needs_review">Needs Review</option>
            <option value="proof_missing">Proof Missing</option>
            <option value="quality_issue">Quality Issue</option>
          </Select>
        </div>
        <div className="t-view-switch">
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>Liste</button>
          <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>Board</button>
          <button className={view === 'focus' ? 'on' : ''} onClick={() => setView('focus')}>Focus</button>
        </div>
        <button className="t-refresh" onClick={() => reload()} title="Aktualisieren" aria-label="Aktualisieren">
          <ArrowsClockwise size={13} />
        </button>
      </div>

      {/* Festag Quality Layer hint */}
      <div className="quality-banner">
        <Robot size={13} />
        <span>
          Tasks werden nicht sofort als abgeschlossen angezeigt. Jede fertige Aufgabe wird über Nachweise,
          Kontext und Tagro-Verifizierung geprüft, bevor sie im Client Workspace als erledigt erscheint.
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <p className="t-empty">Tasks werden geladen…</p>
      ) : filteredTasks.length === 0 ? (
        <p className="t-empty">
          Keine Tasks in dieser Sicht. Tagro legt neue Aufgaben an, sobald ein Projekt in die Execution geht.
        </p>
      ) : view === 'list' ? (
        <TaskList tasks={filteredTasks} onSelect={t => setSelectedId(t.id)} userId={userId} />
      ) : view === 'board' ? (
        <TaskBoard tasks={filteredTasks} onSelect={t => setSelectedId(t.id)} userId={userId} />
      ) : (
        <FocusView tasks={filteredTasks} onSelect={t => setSelectedId(t.id)} userId={userId} />
      )}

      {/* Drawer */}
      {selected && (
        <div className="task-drawer" role="dialog" aria-modal="true">
          <button className="drawer-backdrop" onClick={closeDrawer} aria-label="Schließen" />
          <aside className="drawer-panel">
            <DrawerHeader
              task={selected}
              onClose={closeDrawer}
              userId={userId}
              isOwner={isOwnerRole}
              onClaim={claim}
              onMarkFinished={markFinished}
              onReVerify={reVerify}
              onOwnerApprove={() => ownerDecision('approve')}
              onOwnerReject={() => ownerDecision('reject')}
              busy={busy}
            />

            {/* status step bar */}
            <SectionTitle icon={<Sparkle size={11} />} label="Status" />
            <StepBar current={devFlowFromLegacy(selected.status, selected.dev_status)} />
            <div className="row-actions">
              {SETTABLE_BY_DEV.map(s => (
                <button
                  key={s}
                  className={`pill ${devFlowFromLegacy(selected.status, selected.dev_status) === s ? 'on' : ''} ${s === 'blocked' ? 'warn' : ''}`}
                  onClick={() => setStatus(s)}
                  disabled={busy}
                >
                  {DEV_FLOW_LABEL[s]}
                </button>
              ))}
            </div>

            {/* description / DoD */}
            <SectionTitle icon={<ListChecks size={11} />} label="Beschreibung" />
            <p className="prose">
              {selected.dev_description || selected.description ||
                'Keine Dev-Beschreibung. Bitte Klärung via Work Log anfordern, wenn der Auftrag unklar ist.'}
            </p>
            {(selected.expected_outcome || selected.definition_of_done) && (
              <div className="meta-box">
                {selected.expected_outcome && (
                  <p><strong>Erwartetes Ergebnis</strong><br/>{selected.expected_outcome}</p>
                )}
                {selected.definition_of_done && (
                  <p><strong>Definition of Done</strong><br/>{selected.definition_of_done}</p>
                )}
              </div>
            )}

            {/* Tagro context */}
            <SectionTitle icon={<Robot size={11} />} label="Tagro Context" />
            <TagroContext task={selected} verifications={verifications} />

            {/* Checklist */}
            <SectionTitle icon={<CheckSquare size={11} />} label="Checklist" />
            <div className="checklist">
              {checklist.length === 0 ? (
                <p className="hint">Noch keine Punkte. Tagro empfiehlt Akzeptanzkriterien hier hinzuzufügen.</p>
              ) : checklist.map(item => (
                <button key={item.id} className="check-row" onClick={() => toggleChecklist(item)}>
                  {item.done ? <CheckSquare size={14} weight="fill" /> : <Square size={14} />}
                  <span className={item.done ? 'done' : ''}>{item.label}</span>
                  <span className="x" onClick={e => { e.stopPropagation(); removeChecklist(item) }} aria-label="Entfernen">
                    <TrashSimple size={12} />
                  </span>
                </button>
              ))}
              <div className="check-add">
                <input
                  placeholder="Neuen Punkt hinzufügen…"
                  value={newChecklistLabel}
                  onChange={e => setNewChecklistLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addChecklistItem() }}
                />
                <button onClick={addChecklistItem} disabled={!newChecklistLabel.trim() || busy}>
                  <PlusCircle size={13} /> Hinzufügen
                </button>
              </div>
            </div>

            {/* Proof area */}
            <SectionTitle icon={<Paperclip size={11} />} label="Proof of Work" trailing={
              proofMissingHint && proofMissingHint.length > 0 ? (
                <span className="pm-hint"><WarningCircle size={11} /> Fehlt: {proofMissingHint.join(', ')}</span>
              ) : null
            }/>
            <ProofArea
              workType={selected.work_type ?? null}
              proofs={proofs}
              commits={commits}
              pulls={pulls}
              onRemove={removeProof}
              newProofType={newProofType}
              setNewProofType={setNewProofType}
              newProofUrl={newProofUrl}
              setNewProofUrl={setNewProofUrl}
              newProofDesc={newProofDesc}
              setNewProofDesc={setNewProofDesc}
              onAdd={addProof}
              busy={busy}
            />

            {/* Branch + Timer */}
            <SectionTitle icon={<GitBranch size={11} />} label="Branch & Session" />
            <div className="grid-2">
              <div className="branch-input">
                <GitBranch size={13} />
                <input value={branchInput} onChange={e => setBranchInput(e.target.value)} placeholder="feature/…"/>
                <button onClick={copyBranch} title="Kopieren"><Copy size={13} /></button>
              </div>
              <div>
                {openSession && openSession.task_id === selected.id ? (
                  <button className="t-btn stop" onClick={stopTimer} disabled={busy}>
                    <Pause size={13} /> Stop · {formatDuration(liveSeconds)}
                  </button>
                ) : (
                  <button className="t-btn" onClick={startTimer} disabled={busy}>
                    <Play size={13} weight="fill" /> Start Timer
                  </button>
                )}
                {taskSessions.length > 0 && (
                  <p className="hint" style={{ marginTop: 6 }}>
                    Heute: {formatDuration(
                      taskSessions.reduce((s, sess) => s + (sess.duration_seconds || 0), 0)
                      + (openSession && openSession.task_id === selected.id ? liveSeconds : 0),
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Work Log composer */}
            <SectionTitle icon={<PaperPlaneTilt size={11} />} label="Work Log" />
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Was wurde gemacht? Was ist offen? Gibt es Blocker?"
            />
            {devFlowFromLegacy(selected.status, selected.dev_status) === 'blocked' && (
              <input
                className="blocker-input"
                value={blockerText}
                onChange={e => setBlockerText(e.target.value)}
                placeholder="Worauf wartet die Arbeit?"
              />
            )}
            <div className="row-actions">
              <button className="t-btn" onClick={postWorkLog} disabled={busy || !noteText.trim()}>
                <PaperPlaneTilt size={13} /> Update posten
              </button>
            </div>

            {/* Activity */}
            <SectionTitle icon={<Lightning size={11} />} label="Verlauf" />
            <Timeline activity={activity} updates={updates} verifications={verifications} />

            <p className="drawer-foot">
              Tagro spiegelt verständliche Updates ins Client Panel — interne Notizen bleiben hier.
            </p>
          </aside>
        </div>
      )}

      {toast && (
        <div className="toast" onAnimationEnd={() => setToast(null)} role="status">
          <Sparkle size={12} /> {toast}
        </div>
      )}

      <style jsx>{`
        /* Header */
        .t-head { display: flex; justify-content: space-between; gap: 22px; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; }
        .t-head h1 { margin: 0; font-size: 22px; font-weight: 500; letter-spacing: -.012em; line-height: 1.15; }
        .t-head .meta { margin: 6px 0 0; color: var(--text-muted); font-size: 13px; max-width: 540px; }
        .head-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; min-width: 320px; }

        /* Toolbar */
        .t-toolbar {
          display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap;
        }
        .t-search {
          display: inline-flex; align-items: center; gap: 6px;
          height: 28px; padding: 0 10px;
          border: 1px solid var(--border); border-radius: 8px;
          background: transparent; min-width: 220px;
        }
        .t-search svg { color: var(--text-muted); }
        .t-search input {
          flex: 1; border: 0; outline: 0; background: transparent;
          font: inherit; font-size: 12.5px; color: var(--text);
        }
        .t-filters { display: flex; gap: 6px; flex-wrap: wrap; }
        .t-view-switch { display: inline-flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .t-view-switch button {
          height: 28px; padding: 0 11px; background: transparent; color: var(--text-muted);
          border: 0; border-right: 1px solid var(--border); font: inherit; font-size: 11.5px; font-weight: 500;
          cursor: pointer;
        }
        .t-view-switch button:last-child { border-right: 0; }
        .t-view-switch button.on { color: var(--text); background: var(--surface-2); }
        .t-refresh {
          width: 28px; height: 28px; border: 1px solid var(--border); border-radius: 8px;
          background: transparent; color: var(--text-muted); cursor: pointer;
        }

        .quality-banner {
          display: flex; gap: 9px; align-items: flex-start;
          padding: 9px 12px;
          margin-bottom: 14px;
          border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border));
          background: color-mix(in srgb, var(--accent) 5%, transparent);
          border-radius: 9px;
          color: var(--text-secondary);
          font-size: 11.5px; line-height: 1.5;
        }
        .quality-banner svg { color: var(--accent); margin-top: 2px; flex: 0 0 auto; }

        .t-empty { padding: 28px; text-align: center; color: var(--text-muted); font-size: 13px; }

        /* Drawer */
        .task-drawer { position: fixed; inset: 0; z-index: 9000; display: flex; justify-content: flex-end; }
        .drawer-backdrop { flex: 1; border: 0; background: rgba(0,0,0,.28); backdrop-filter: blur(2px); cursor: pointer; }
        .drawer-panel {
          width: min(640px, 100vw); height: 100%; overflow: auto;
          background: var(--bg);
          border-left: 1px solid var(--border);
          padding: 22px 22px 60px;
          box-shadow: -22px 0 70px rgba(0,0,0,.16);
          display: flex; flex-direction: column; gap: 12px;
        }

        .prose { margin: 0; font-size: 13px; line-height: 1.55; color: var(--text-secondary); white-space: pre-wrap; }
        .meta-box {
          margin-top: 4px;
          padding: 10px 12px; border-radius: 9px;
          background: color-mix(in srgb, var(--surface-2) 55%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
        }
        .meta-box p { margin: 0; font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; }
        .meta-box p + p { margin-top: 8px; }
        .meta-box strong { color: var(--text); font-weight: 500; }

        .row-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .pill {
          display: inline-flex; align-items: center; gap: 6px;
          height: 26px; padding: 0 10px; border-radius: 999px;
          border: 1px solid var(--border); background: transparent;
          color: var(--text-secondary); font: inherit; font-size: 11.5px; font-weight: 500;
          cursor: pointer;
        }
        .pill.on { background: var(--surface-2); color: var(--text); border-color: color-mix(in srgb, var(--accent) 30%, var(--border)); }
        .pill.warn { color: var(--red); border-color: color-mix(in srgb, var(--red) 35%, var(--border)); }
        .pill:disabled { opacity: .5; cursor: default; }

        .pm-hint {
          display: inline-flex; align-items: center; gap: 4px;
          color: var(--red); font-size: 10.5px; font-weight: 500;
        }

        .checklist { display: flex; flex-direction: column; gap: 2px; }
        .check-row {
          display: grid; grid-template-columns: 16px 1fr 18px; align-items: center; gap: 8px;
          padding: 6px 8px; border-radius: 7px;
          border: 0; background: transparent; cursor: pointer;
          color: var(--text); font: inherit; font-size: 12.5px; text-align: left;
        }
        .check-row:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .check-row svg:first-child { color: var(--accent); }
        .check-row span.done { color: var(--text-muted); text-decoration: line-through; }
        .check-row .x { color: var(--text-muted); display: inline-flex; align-items: center; }
        .check-row .x:hover { color: var(--red); }
        .check-add { display: flex; gap: 6px; margin-top: 4px; }
        .check-add input {
          flex: 1; height: 28px; padding: 0 10px;
          background: transparent; border: 1px solid var(--border); border-radius: 7px;
          font: inherit; font-size: 12.5px; color: var(--text);
        }
        .check-add button {
          display: inline-flex; align-items: center; gap: 5px;
          height: 28px; padding: 0 10px; border-radius: 7px;
          background: transparent; border: 1px solid var(--border);
          color: var(--text-secondary); font: inherit; font-size: 12px; cursor: pointer;
        }
        .check-add button:disabled { opacity: .5; cursor: default; }

        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .branch-input {
          display: flex; align-items: center; gap: 8px;
          border: 1px solid var(--border); border-radius: 8px; padding: 5px 9px;
        }
        .branch-input svg { color: var(--text-muted); }
        .branch-input input {
          flex: 1; border: 0; outline: 0; background: transparent;
          font: inherit; font-size: 12px; color: var(--text);
        }
        .branch-input button { border: 0; background: transparent; color: var(--text-muted); cursor: pointer; padding: 3px 6px; border-radius: 6px; }
        .branch-input button:hover { background: var(--surface-2); color: var(--text); }

        .t-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 28px; padding: 0 11px; border-radius: 8px;
          border: 1px solid var(--border); background: transparent; color: var(--text);
          font: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
        }
        .t-btn:hover { background: var(--surface-2); }
        .t-btn.stop { color: var(--red); border-color: color-mix(in srgb, var(--red) 35%, var(--border)); }
        .t-btn:disabled { opacity: .5; cursor: default; }

        textarea {
          width: 100%; min-height: 80px; resize: vertical;
          background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px;
          padding: 10px 11px; font: inherit; font-size: 13px; color: var(--text); line-height: 1.5;
        }
        .blocker-input {
          width: 100%; background: transparent; border: 1px solid var(--border); border-radius: 8px;
          padding: 7px 10px; font: inherit; font-size: 12.5px; color: var(--text); margin-top: 6px;
        }
        .hint { margin: 0; font-size: 11.5px; color: var(--text-muted); line-height: 1.45; }

        .drawer-foot { margin: 8px 0 0; font-size: 11px; color: var(--text-muted); line-height: 1.5; }

        .toast {
          position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);
          background: var(--text); color: var(--bg);
          padding: 8px 14px; border-radius: 999px;
          font-size: 12px; font-weight: 500;
          display: inline-flex; align-items: center; gap: 7px;
          animation: toast-in .25s ease-out both, toast-out .4s 1.8s forwards;
          z-index: 9999;
        }
        @keyframes toast-in { from { transform: translate(-50%, 12px); opacity: 0; } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes toast-out { to { opacity: 0; transform: translate(-50%, 8px); } }

        @media (max-width: 980px) {
          .head-stats { grid-template-columns: repeat(2, 1fr); }
          .t-search { min-width: 0; flex: 1; }
          .grid-2 { grid-template-columns: 1fr; }
          .drawer-panel { width: 100vw; padding: 18px 14px 80px; }
        }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────

function StatPill({ value, label, tone }: { value: number; label: string; tone: 'green'|'amber'|'red'|'accent' }) {
  const color =
    tone === 'green' ? '#22c55e' :
    tone === 'amber' ? '#f59e0b' :
    tone === 'red' ? '#ef4444' :
    'var(--accent)'
  return (
    <div className="stat-pill">
      <strong style={{ color }}>{value}</strong>
      <span>{label}</span>
      <style jsx>{`
        .stat-pill {
          display: flex; flex-direction: column; gap: 1px;
          padding: 7px 10px; border-radius: 9px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface) 70%, transparent);
        }
        .stat-pill strong { font-size: 16px; font-weight: 500; line-height: 1.1; letter-spacing: -.01em; }
        .stat-pill span { font-size: 10.5px; color: var(--text-muted); letter-spacing: .02em; }
      `}</style>
    </div>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="filter-pill" data-on={active}>
      {children}
      <style jsx>{`
        .filter-pill {
          height: 28px; padding: 0 11px; border-radius: 999px;
          background: transparent; border: 1px solid var(--border);
          color: var(--text-muted); font: inherit; font-size: 11.5px; font-weight: 500;
          cursor: pointer;
        }
        .filter-pill[data-on="true"] { background: var(--surface-2); color: var(--text); }
      `}</style>
    </button>
  )
}

function Select({ value, onChange, placeholder, children }: { value: string; onChange: (v: string) => void; placeholder: string; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} aria-label={placeholder}>
      {children}
      <style jsx>{`
        select {
          height: 28px; padding: 0 9px; border: 1px solid var(--border); border-radius: 8px;
          background: transparent; color: var(--text);
          font: inherit; font-size: 12px;
        }
      `}</style>
    </select>
  )
}

function SectionTitle({ icon, label, trailing }: { icon: React.ReactNode; label: string; trailing?: React.ReactNode }) {
  return (
    <div className="sec-title">
      <span className="left">{icon} {label}</span>
      {trailing && <span className="right">{trailing}</span>}
      <style jsx>{`
        .sec-title {
          display: flex; justify-content: space-between; align-items: center;
          margin: 14px 0 4px;
          font-size: 9.5px; letter-spacing: .12em;
          color: var(--text-muted); text-transform: uppercase; font-weight: 500;
        }
        .sec-title .left { display: inline-flex; align-items: center; gap: 5px; }
      `}</style>
    </div>
  )
}

function StepBar({ current }: { current: DevFlow }) {
  const idx = DEV_STEPS.indexOf(current)
  return (
    <div className="step-bar">
      {DEV_STEPS.map((s, i) => {
        const reached = idx >= 0 && i <= idx
        const cur = s === current
        return (
          <div key={s} className={`step ${reached ? 'reached' : ''} ${cur ? 'current' : ''}`}>
            <span className="dot" />
            <span className="label">{DEV_FLOW_LABEL[s]}</span>
          </div>
        )
      })}
      <style jsx>{`
        .step-bar { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }
        .step { display: flex; align-items: center; gap: 5px; padding: 4px 6px; border-radius: 6px; }
        .step .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); flex: 0 0 auto; }
        .step .label { font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .step.reached .dot { background: var(--accent); }
        .step.reached .label { color: var(--text-secondary); }
        .step.current { background: color-mix(in srgb, var(--accent) 14%, transparent); }
        .step.current .label { color: var(--text); }
        @media (max-width: 980px) {
          .step-bar { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  )
}

function DrawerHeader({
  task, onClose, userId, isOwner, onClaim, onMarkFinished, onReVerify, onOwnerApprove, onOwnerReject, busy,
}: {
  task: Task; onClose: () => void; userId: string | null; isOwner: boolean;
  onClaim: () => void; onMarkFinished: () => void; onReVerify: () => void;
  onOwnerApprove: () => void; onOwnerReject: () => void; busy: boolean;
}) {
  const flow = devFlowFromLegacy(task.status, task.dev_status)
  const wt = workTypeOf(task.work_type)
  const vt = verificationTone(task.tagro_verification_status)
  const cv = task.client_visible_status as any || clientStatusFromDevFlow(flow)
  return (
    <div className="dh">
      <div className="dh-top">
        <div>
          <p className="dev-eyebrow">Dev Task · {wt.label}</p>
          <h2>{task.title}</h2>
          <p className="dh-sub">
            {task.projects?.title || 'kein Projekt'}
            {' · '}<span style={{ color: dotColor(flow) }}>● {DEV_FLOW_LABEL[flow]}</span>
            {' · '}{priorityLabel(task.priority)}
            {task.due_date ? ` · Deadline ${dueLabel(task.due_date)}` : ''}
          </p>
        </div>
        <button className="icon-close" onClick={onClose}><X size={16} /></button>
      </div>

      {/* progress meter */}
      <div className="dh-progress">
        <span className="bar"><span style={{ width: `${progressFromDevFlow(flow)}%` }} /></span>
        <span className="pct">{progressFromDevFlow(flow)}%</span>
      </div>

      {/* badges */}
      <div className="dh-badges">
        {vt && (
          <span className="ver" style={{ color: vt.color, borderColor: vt.color }}>
            <Robot size={10} /> {vt.label}
            {typeof task.tagro_confidence === 'number' ? ` · ${Math.round(task.tagro_confidence * 100)}%` : ''}
          </span>
        )}
        <span className="cv">Client: <strong>{CLIENT_VISIBLE_LABEL[cv as keyof typeof CLIENT_VISIBLE_LABEL] ?? cv}</strong></span>
      </div>

      {/* primary actions */}
      <div className="dh-actions">
        {task.assigned_to !== userId && (
          <button className="dh-btn primary" onClick={onClaim} disabled={busy}>
            <PlusCircle size={13} /> Übernehmen
          </button>
        )}
        {!['finished_by_dev','verified_by_tagro','approved_by_owner','completed','cancelled'].includes(flow) && (
          <button className="dh-btn primary" onClick={onMarkFinished} disabled={busy}>
            <CheckCircle size={13} /> Mark as Finished
          </button>
        )}
        {['finished_by_dev','needs_review','verified_by_tagro'].includes(flow) && (
          <button className="dh-btn" onClick={onReVerify} disabled={busy}>
            <Robot size={13} /> Re-verify
          </button>
        )}
        {isOwner && flow === 'verified_by_tagro' && (
          <>
            <button className="dh-btn primary" onClick={onOwnerApprove} disabled={busy}>
              <CheckCircle size={13} /> Approve & sync to Client
            </button>
            <button className="dh-btn" onClick={onOwnerReject} disabled={busy}>
              Reject
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        .dh { display: flex; flex-direction: column; gap: 10px; }
        .dh-top { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; }
        .dh-top h2 { margin: 4px 0 0; font-size: 19px; font-weight: 500; line-height: 1.2; letter-spacing: -.012em; }
        .dh-sub { margin: 4px 0 0; font-size: 11.5px; color: var(--text-muted); }
        .icon-close { width: 28px; height: 28px; border: 0; background: transparent; cursor: pointer; color: var(--text-muted); border-radius: 7px; }
        .icon-close:hover { background: var(--surface-2); color: var(--text); }

        .dh-progress { display: grid; grid-template-columns: 1fr auto; gap: 9px; align-items: center; }
        .bar {
          height: 5px; border-radius: 3px;
          background: color-mix(in srgb, var(--surface-2) 70%, transparent); overflow: hidden;
        }
        .bar > span { display: block; height: 100%; background: var(--accent); transition: width .3s ease; }
        .pct { font-size: 11px; color: var(--text-muted); }

        .dh-badges { display: flex; gap: 8px; flex-wrap: wrap; }
        .dh-badges .ver, .dh-badges .cv {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 9px; border-radius: 999px; border: 1px solid var(--border);
          font-size: 10.5px; color: var(--text-secondary);
        }
        .dh-badges .cv strong { color: var(--text); font-weight: 500; margin-left: 4px; }

        .dh-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .dh-btn {
          display: inline-flex; align-items: center; gap: 5px;
          height: 30px; padding: 0 12px; border-radius: 8px;
          border: 1px solid var(--border); background: transparent;
          color: var(--text); font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer;
        }
        .dh-btn:hover { background: var(--surface-2); }
        .dh-btn.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
        .dh-btn.primary:hover { filter: brightness(1.05); }
        .dh-btn:disabled { opacity: .5; cursor: default; }
      `}</style>
    </div>
  )
}

function TagroContext({ task, verifications }: { task: Task; verifications: Verification[] }) {
  const latest = verifications[0]
  const wt = workTypeOf(task.work_type)
  const required = (task.required_proof_types && task.required_proof_types.length > 0
    ? task.required_proof_types
    : wt.requiredProofs) as ProofType[]
  return (
    <div className="tc">
      {task.tagro_internal_notes && (
        <p className="tc-line"><strong>Empfehlung:</strong> {task.tagro_internal_notes}</p>
      )}
      <p className="tc-line">
        <strong>Erwartete Nachweise:</strong>{' '}
        {required.length > 0 ? required.map(r => PROOF_LABELS[r] || r).join(', ') : 'Frei wählbar'}
      </p>
      {latest && (
        <div className="tc-card">
          <p className="tc-status">
            <Robot size={11} /> Letzter Tagro-Lauf: <strong>{latest.status}</strong>
            {typeof latest.confidence === 'number' ? ` · ${Math.round(latest.confidence * 100)}%` : ''}
          </p>
          {latest.summary && <p className="tc-text">{latest.summary}</p>}
          {Array.isArray(latest.issues_json) && latest.issues_json.length > 0 && (
            <ul>{latest.issues_json.map((i: string, idx: number) => <li key={idx}>{i}</li>)}</ul>
          )}
        </div>
      )}
      {!latest && (
        <p className="tc-line muted">
          Tagro hat diesen Task noch nicht verifiziert. „Mark as Finished" startet die Prüfung.
        </p>
      )}
      <style jsx>{`
        .tc { display: flex; flex-direction: column; gap: 6px; }
        .tc-line { margin: 0; font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; }
        .tc-line.muted { color: var(--text-muted); }
        .tc-line strong { color: var(--text); font-weight: 500; }
        .tc-card {
          padding: 10px 12px; border-radius: 9px;
          background: color-mix(in srgb, var(--accent) 7%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
        }
        .tc-status { margin: 0; font-size: 12px; color: var(--text); display: inline-flex; align-items: center; gap: 6px; }
        .tc-status strong { font-weight: 500; }
        .tc-text { margin: 4px 0 0; font-size: 12px; line-height: 1.5; color: var(--text-secondary); }
        .tc-card ul { margin: 6px 0 0 16px; padding: 0; }
        .tc-card li { font-size: 11.5px; color: var(--text-secondary); line-height: 1.5; }
      `}</style>
    </div>
  )
}

function ProofArea({
  workType, proofs, commits, pulls, onRemove,
  newProofType, setNewProofType, newProofUrl, setNewProofUrl, newProofDesc, setNewProofDesc,
  onAdd, busy,
}: {
  workType: string | null
  proofs: Proof[]; commits: Commit[]; pulls: Pull[]
  onRemove: (id: string) => void
  newProofType: ProofType; setNewProofType: (v: ProofType) => void
  newProofUrl: string; setNewProofUrl: (v: string) => void
  newProofDesc: string; setNewProofDesc: (v: string) => void
  onAdd: () => void; busy: boolean
}) {
  const wt = workTypeOf(workType)
  const allowed: ProofType[] = (() => {
    const seen = new Set<ProofType>()
    const out: ProofType[] = []
    for (const p of [...wt.requiredProofs, ...wt.optionalProofs, 'comment' as const, 'work_log' as const]) {
      if (!seen.has(p)) { seen.add(p); out.push(p) }
    }
    return out
  })()
  return (
    <div className="pa">
      {/* proof list */}
      {(proofs.length === 0 && commits.length === 0 && pulls.length === 0) ? (
        <p className="empty">Noch keine Nachweise verknüpft.</p>
      ) : (
        <div className="proof-list">
          {commits.map(c => (
            <div key={`c-${c.id}`} className="proof-row inferred">
              <GitCommit size={12} />
              <div className="pr-text">
                <a href={c.commit_url || '#'} target="_blank" rel="noreferrer">{(c.message || c.commit_sha).split('\n')[0].slice(0, 80)}</a>
                <small>commit · {shortSha(c.commit_sha)} · {dateLabel(c.committed_at)}</small>
              </div>
              <span className="auto-tag">auto</span>
            </div>
          ))}
          {pulls.map(p => (
            <div key={`pr-${p.id}`} className="proof-row inferred">
              <GitPullRequest size={12} />
              <div className="pr-text">
                <a href={p.pr_url || '#'} target="_blank" rel="noreferrer">#{p.pr_number} {p.title}</a>
                <small>{p.state}{p.merged ? ' · merged' : ''} · {dateLabel(p.updated_at_github)}</small>
              </div>
              <span className="auto-tag">auto</span>
            </div>
          ))}
          {proofs.map(p => (
            <div key={p.id} className="proof-row">
              <ProofIcon type={p.proof_type as ProofType} />
              <div className="pr-text">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer">{p.description || p.url}</a>
                ) : (
                  <span>{p.description || PROOF_LABELS[p.proof_type as ProofType] || p.proof_type}</span>
                )}
                <small>{PROOF_LABELS[p.proof_type as ProofType] || p.proof_type} · {dateLabel(p.created_at)}</small>
              </div>
              <button className="rm" onClick={() => onRemove(p.id)} aria-label="Entfernen">
                <TrashSimple size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* add proof composer */}
      <div className="proof-add">
        <select value={newProofType} onChange={e => setNewProofType(e.target.value as ProofType)}>
          {allowed.map(p => <option key={p} value={p}>{PROOF_LABELS[p]}</option>)}
        </select>
        <input
          value={newProofUrl}
          onChange={e => setNewProofUrl(e.target.value)}
          placeholder="URL (commit / preview / screenshot / file)"
        />
        <input
          value={newProofDesc}
          onChange={e => setNewProofDesc(e.target.value)}
          placeholder="Kurzbeschreibung"
        />
        <button onClick={onAdd} disabled={busy || (!newProofUrl.trim() && !newProofDesc.trim())}>
          <PlusCircle size={13} /> Hinzufügen
        </button>
      </div>

      <style jsx>{`
        .pa { display: flex; flex-direction: column; gap: 8px; }
        .empty { margin: 0; padding: 10px 0; font-size: 11.5px; color: var(--text-muted); }
        .proof-list { display: flex; flex-direction: column; gap: 4px; }
        .proof-row {
          display: grid; grid-template-columns: 14px 1fr auto; gap: 9px; align-items: center;
          padding: 7px 9px; border-radius: 7px;
          background: color-mix(in srgb, var(--surface-2) 55%, transparent);
        }
        .proof-row.inferred { background: color-mix(in srgb, var(--accent) 6%, transparent); }
        .pr-text { min-width: 0; }
        .pr-text a, .pr-text span {
          display: block; font-size: 12.5px; color: var(--text); text-decoration: none;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pr-text a:hover { text-decoration: underline; }
        .pr-text small { display: block; font-size: 10.5px; color: var(--text-muted); margin-top: 2px; }
        .proof-row svg { color: var(--text-muted); }
        .rm { border: 0; background: transparent; color: var(--text-muted); cursor: pointer; padding: 2px; border-radius: 6px; }
        .rm:hover { color: var(--red); }
        .auto-tag { font-size: 9px; color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); padding: 2px 6px; border-radius: 999px; }

        .proof-add {
          display: grid; grid-template-columns: 130px 1fr 28px; gap: 6px;
        }
        .proof-add select, .proof-add input {
          height: 28px; padding: 0 9px; border: 1px solid var(--border); border-radius: 7px;
          background: transparent; color: var(--text); font: inherit; font-size: 12px;
        }
        .proof-add input { min-width: 0; }
        .proof-add input:last-of-type { grid-column: 2 / -1; }
        .proof-add button {
          height: 28px; padding: 0 10px; border-radius: 7px; border: 1px solid var(--border);
          background: transparent; color: var(--text-secondary);
          font: inherit; font-size: 11.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;
          grid-column: 1 / -1;
        }
        .proof-add button:disabled { opacity: .5; cursor: default; }
        @media (max-width: 540px) {
          .proof-add { grid-template-columns: 1fr; }
          .proof-add input:last-of-type { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  )
}

function ProofIcon({ type }: { type: ProofType }) {
  if (type === 'commit') return <GitCommit size={12} />
  if (type === 'pull_request') return <GitPullRequest size={12} />
  if (type === 'screenshot' || type === 'screenshot_before' || type === 'screenshot_after' || type === 'mobile_screenshot') return <ImageIcon size={12} />
  if (type === 'preview_url' || type === 'website_url' || type === 'deployment') return <ArrowSquareOut size={12} />
  if (type === 'figma' || type === 'video' || type === 'loom') return <LinkIcon size={12} />
  if (type === 'file' || type === 'document' || type === 'analytics' || type === 'seo_report' || type === 'lighthouse' || type === 'test_result' || type === 'log' || type === 'check_result') return <Paperclip size={12} />
  return <Paperclip size={12} />
}

function Timeline({ activity, updates, verifications }: { activity: Activity[]; updates: Update[]; verifications: Verification[] }) {
  const items = useMemo(() => {
    const out: Array<{ key: string; when: string; kind: string; text: string }> = []
    for (const a of activity) out.push({ key: `a-${a.id}`, when: a.created_at, kind: a.actor_kind, text: eventLabel(a) })
    for (const u of updates) out.push({ key: `u-${u.id}`, when: u.created_at, kind: 'human', text: u.update_text })
    for (const v of verifications) out.push({ key: `v-${v.id}`, when: v.created_at, kind: 'tagro', text: `Verification: ${v.status}` + (v.summary ? ` — ${v.summary}` : '') })
    out.sort((a, b) => String(b.when).localeCompare(String(a.when)))
    return out.slice(0, 20)
  }, [activity, updates, verifications])

  if (items.length === 0) return <p className="hint">Noch kein Verlauf.</p>
  return (
    <ul className="tl">
      {items.map(i => (
        <li key={i.key}>
          <span className={`dot ${i.kind}`} />
          <div className="tl-text">
            <p>{i.text}</p>
            <small>{i.kind === 'tagro' ? 'Tagro' : i.kind === 'system' ? 'System' : 'Developer'} · {dateLabel(i.when)}</small>
          </div>
        </li>
      ))}
      <style jsx>{`
        .tl { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
        .tl li { display: grid; grid-template-columns: 12px 1fr; gap: 9px; align-items: flex-start; padding: 6px 8px; border-radius: 7px; }
        .tl li:hover { background: color-mix(in srgb, var(--surface-2) 50%, transparent); }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); margin-top: 7px; }
        .dot.tagro { background: var(--accent); }
        .dot.human { background: var(--text-secondary); }
        .dot.system { background: var(--text-muted); }
        .tl-text p { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--text); }
        .tl-text small { display: block; margin-top: 2px; font-size: 10.5px; color: var(--text-muted); }
        .hint { margin: 0; font-size: 11.5px; color: var(--text-muted); }
      `}</style>
    </ul>
  )
}

function eventLabel(a: Activity): string {
  const m = a.metadata ?? {}
  switch (a.event) {
    case 'status_changed': return `Status ${m.from || '?'} → ${m.to}`
    case 'proof_added':    return `Proof hinzugefügt: ${m.proof_type}`
    case 'proof_removed':  return `Proof entfernt: ${m.proof_type}`
    case 'checklist_toggled': return `Checklist: „${m.item}" ${m.done ? 'erledigt' : 'wieder offen'}`
    case 'finished_by_dev':return 'Dev hat als finished markiert'
    case 'tagro_verified': return `Tagro verified · ${Math.round((m.confidence ?? 0) * 100)}%`
    case 'needs_review':   return `Tagro: Needs Review`
    case 'proof_missing':  return `Tagro: Proof Missing`
    case 'tagro_check':    return `Tagro Re-Check`
    case 'approved_by_owner': return 'Project Owner approved'
    case 'owner_changes_requested': return `Owner fordert Änderungen${m.reason ? ': ' + m.reason : ''}`
    case 'work_log':       return m.preview ? `Update: „${m.preview}"` : 'Update gepostet'
    default: return a.event
  }
}

// ────────────────────────────────────────────────────────────────────────
// Views: List, Board, Focus
// ────────────────────────────────────────────────────────────────────────

function TaskList({ tasks, onSelect, userId }: { tasks: Task[]; onSelect: (t: Task) => void; userId: string | null }) {
  return (
    <div className="t-list dev-surface">
      <div className="t-list-head">
        <span>Task</span>
        <span>Projekt</span>
        <span>Priorität</span>
        <span>Status</span>
        <span>Verification</span>
        <span>Deadline</span>
      </div>
      {tasks.map((t, i) => {
        const flow = devFlowFromLegacy(t.status, t.dev_status)
        const vt = verificationTone(t.tagro_verification_status)
        return (
          <button key={t.id} className={`t-row ${t.parent_task_id ? 'sub' : ''}`} onClick={() => onSelect(t)}
            style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
            <span className="dot" style={{ background: dotColor(flow) }} />
            <div className="tt">
              <strong>{t.title}</strong>
              <small>
                {workTypeOf(t.work_type).label}
                {t.estimated_hours ? ` · ~${t.estimated_hours}h` : ''}
                {t.branch_name ? ` · ${t.branch_name}` : ''}
              </small>
            </div>
            <span className="t-project">{t.projects?.title || '—'}</span>
            <span className="t-prio">{priorityLabel(t.priority)}</span>
            <span className="t-status">{DEV_FLOW_LABEL[flow]}</span>
            <span className="t-ver">
              {vt ? <span style={{ color: vt.color }}>● {vt.label}</span> : <span className="muted">—</span>}
            </span>
            <span className="t-deadline">{dueLabel(t.due_date) || '—'}</span>
          </button>
        )
      })}
      <style jsx>{`
        .t-list { padding: 4px; overflow: hidden; }
        .t-list-head {
          display: grid;
          grid-template-columns: 12px minmax(260px, 1.5fr) minmax(140px, .9fr) 90px 140px 130px 100px;
          gap: 12px;
          padding: 9px 12px 6px 36px;
          font-size: 10px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; color: var(--text-muted);
        }
        .t-row {
          width: 100%; text-align: left; border: 0; background: transparent; color: var(--text);
          font: inherit;
          display: grid;
          grid-template-columns: 12px minmax(260px, 1.5fr) minmax(140px, .9fr) 90px 140px 130px 100px;
          gap: 12px; align-items: center;
          min-height: 50px; padding: 8px 12px; border-radius: 7px; cursor: pointer;
          transition: background .12s ease;
        }
        .t-row:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }
        .tt { min-width: 0; }
        .tt strong { display: block; font-size: 12.8px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tt small { display: block; margin-top: 2px; color: var(--text-muted); font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .t-project, .t-prio, .t-status, .t-deadline { font-size: 11.5px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .t-ver { font-size: 11px; }
        .t-ver .muted { color: var(--text-muted); }
        .t-row.sub { padding-left: 32px; }
        @media (max-width: 980px) {
          .t-list-head { display: none; }
          .t-row {
            grid-template-columns: 12px 1fr;
            gap: 8px;
            min-height: auto; padding: 10px 12px;
          }
          .t-row > span:not(.dot), .t-row .t-prio { display: none; }
        }
      `}</style>
    </div>
  )
}

function TaskBoard({ tasks, onSelect, userId }: { tasks: Task[]; onSelect: (t: Task) => void; userId: string | null }) {
  const cols: { id: DevFlow; label: string }[] = [
    { id: 'new', label: 'New' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'needs_review', label: 'Needs Review' },
    { id: 'finished_by_dev', label: 'Finished by Dev' },
    { id: 'verified_by_tagro', label: 'Verified' },
    { id: 'blocked', label: 'Blocked' },
  ]
  return (
    <div className="board">
      {cols.map(c => {
        const list = tasks.filter(t => devFlowFromLegacy(t.status, t.dev_status) === c.id)
        return (
          <div key={c.id} className="col">
            <div className="col-head">
              <span className="col-dot" style={{ background: dotColor(c.id) }} />
              <span>{c.label}</span>
              <span className="col-count">{list.length}</span>
            </div>
            <div className="col-list">
              {list.length === 0 && <p className="col-empty">—</p>}
              {list.map(t => {
                const vt = verificationTone(t.tagro_verification_status)
                return (
                  <button key={t.id} className="card" onClick={() => onSelect(t)}>
                    <strong>{t.title}</strong>
                    <p className="card-meta">
                      {t.projects?.title || '—'}{' · '}{priorityLabel(t.priority)}
                    </p>
                    {vt && (
                      <span className="card-ver" style={{ color: vt.color }}>● {vt.label}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <style jsx>{`
        .board {
          display: grid; grid-auto-columns: 220px; grid-auto-flow: column;
          gap: 10px; overflow-x: auto; padding-bottom: 8px;
        }
        .col { display: flex; flex-direction: column; min-width: 0; }
        .col-head {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 4px; font-size: 11px; color: var(--text-secondary); font-weight: 500;
        }
        .col-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }
        .col-count { margin-left: auto; color: var(--text-muted); font-size: 10.5px; }
        .col-list { display: flex; flex-direction: column; gap: 5px; }
        .col-empty { margin: 6px 0; font-size: 11px; color: var(--text-muted); }
        .card {
          width: 100%; text-align: left; border: 1px solid var(--border);
          background: var(--surface); border-radius: 8px; padding: 9px 10px;
          color: var(--text); font: inherit; cursor: pointer;
          transition: background .12s, transform .12s;
        }
        .card:hover { background: color-mix(in srgb, var(--surface-2) 50%, var(--surface)); transform: translateY(-1px); }
        .card strong { display: block; font-size: 12.5px; font-weight: 500; line-height: 1.35; }
        .card-meta { margin: 4px 0 0; font-size: 10.5px; color: var(--text-muted); }
        .card-ver { display: inline-block; margin-top: 5px; font-size: 10px; }
        @media (max-width: 980px) {
          .board { grid-auto-columns: 78vw; }
        }
      `}</style>
    </div>
  )
}

function FocusView({ tasks, onSelect, userId }: { tasks: Task[]; onSelect: (t: Task) => void; userId: string | null }) {
  const today = tasks.filter(t => {
    const f = devFlowFromLegacy(t.status, t.dev_status)
    return !['completed','approved_by_owner','cancelled'].includes(f)
  }).sort((a, b) => {
    const pa = a.priority === 'critical' ? 4 : a.priority === 'high' ? 3 : a.priority === 'low' ? 1 : 2
    const pb = b.priority === 'critical' ? 4 : b.priority === 'high' ? 3 : b.priority === 'low' ? 1 : 2
    if (pa !== pb) return pb - pa
    return String(b.last_dev_action_at || b.updated_at).localeCompare(String(a.last_dev_action_at || a.updated_at))
  }).slice(0, 6)

  return (
    <div className="focus">
      {today.map(t => {
        const flow = devFlowFromLegacy(t.status, t.dev_status)
        const wt = workTypeOf(t.work_type)
        return (
          <button key={t.id} className="focus-card" onClick={() => onSelect(t)}>
            <p className="fc-eyebrow">{wt.label} · {t.projects?.title || '—'}</p>
            <h3>{t.title}</h3>
            {t.dev_description && <p className="fc-desc">{String(t.dev_description).slice(0, 200)}</p>}
            <p className="fc-meta">
              <span style={{ color: dotColor(flow) }}>● {DEV_FLOW_LABEL[flow]}</span>
              {' · '}{priorityLabel(t.priority)}
              {t.due_date ? ` · Deadline ${dueLabel(t.due_date)}` : ''}
            </p>
          </button>
        )
      })}
      {today.length === 0 && (
        <p className="empty">Nichts dringend offen. Tagro plant deinen nächsten Block.</p>
      )}
      <style jsx>{`
        .focus { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
        .focus-card {
          text-align: left; border: 1px solid var(--border); background: var(--surface);
          border-radius: 10px; padding: 12px 14px; color: var(--text); font: inherit; cursor: pointer;
          display: flex; flex-direction: column; gap: 4px;
          transition: background .12s, transform .12s;
        }
        .focus-card:hover { background: color-mix(in srgb, var(--surface-2) 50%, var(--surface)); transform: translateY(-1px); }
        .fc-eyebrow { margin: 0; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--text-muted); font-weight: 500; }
        .focus-card h3 { margin: 0; font-size: 14px; font-weight: 500; line-height: 1.35; letter-spacing: -.012em; }
        .fc-desc { margin: 0; font-size: 12px; color: var(--text-secondary); line-height: 1.45; }
        .fc-meta { margin: 4px 0 0; font-size: 11px; color: var(--text-muted); }
        .empty { padding: 30px; text-align: center; color: var(--text-muted); font-size: 12.5px; }
      `}</style>
    </div>
  )
}
