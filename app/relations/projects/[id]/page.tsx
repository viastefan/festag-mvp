'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Project = {
  id: string; title: string; description: string | null
  status: string; color: string | null; phase: string | null
  rel_user_id: string | null
}
type Task = {
  id: string; title: string; description: string | null
  status: string; priority: string; assigned_to: string | null
  created_by: string | null; source: string; due_date: string | null
  created_at: string; statusbericht_id: string | null
  assignee_name?: string
}
type Statusbericht = {
  id: string; content: string; summary: string | null
  source: string; created_at: string
}
type TeamMember = { id: string; email: string; name: string; role: string }

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: 'Offen',     color: '#94a3b8', bg: 'rgba(148,163,184,.12)' },
  in_progress: { label: 'In Arbeit', color: '#f97316', bg: 'rgba(249,115,22,.12)'  },
  review:      { label: 'Review',    color: '#8b5cf6', bg: 'rgba(139,92,246,.12)'  },
  done:        { label: 'Erledigt',  color: '#22c55e', bg: 'rgba(34,197,94,.12)'   },
}
const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low:    { label: 'Niedrig',  color: '#64748b' },
  medium: { label: 'Mittel',   color: '#f97316' },
  high:   { label: 'Hoch',     color: '#ef4444' },
  urgent: { label: 'Dringend', color: '#dc2626' },
}
const TABS = ['Übersicht', 'Tasks', 'Statusberichte'] as const
type Tab = typeof TABS[number]

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} Min.`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std.`
  return `vor ${Math.floor(h / 24)} Tagen`
}

export default function RelProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project,   setProject]   = useState<Project | null>(null)
  const [tasks,     setTasks]     = useState<Task[]>([])
  const [berichte,  setBerichte]  = useState<Statusbericht[]>([])
  const [team,      setTeam]      = useState<TeamMember[]>([])
  const [loading,   setLoading]   = useState(true)
  const [userRole,  setUserRole]  = useState('client')
  const [userId,    setUserId]    = useState('')
  const [tab,       setTab]       = useState<Tab>('Übersicht')

  // Task modal
  const [showTask,    setShowTask]    = useState(false)
  const [editTask,    setEditTask]    = useState<Task | null>(null)
  const [tTitle,      setTTitle]      = useState('')
  const [tDesc,       setTDesc]       = useState('')
  const [tStatus,     setTStatus]     = useState('open')
  const [tPriority,   setTPriority]   = useState('medium')
  const [tAssignee,   setTAssignee]   = useState('')
  const [tDue,        setTDue]        = useState('')
  const [tSaving,     setTSaving]     = useState(false)
  const [fromBericht, setFromBericht] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [genTasks,   setGenTasks]   = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [id])
  useEffect(() => { if (showTask) setTimeout(() => titleRef.current?.focus(), 60) }, [showTask])

  async function load() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: prof } = await sb.from('profiles').select('role').eq('id', user.id).single()
    const role = (prof as any)?.role ?? 'client'
    setUserRole(role)

    const { data: proj } = await (sb as any).from('projects')
      .select('id,title,description,status,color,phase,rel_user_id').eq('id', id).single()
    setProject(proj as Project)

    const { data: teamData } = await sb.from('profiles').select('id,email,first_name,full_name,role').in('role', ['admin', 'dev'])
    setTeam((teamData as any[] ?? []).map((p: any) => ({
      id: p.id, email: p.email, role: p.role,
      name: p.first_name || p.full_name?.split(' ')[0] || p.email.split('@')[0],
    })))

    const { data: taskData } = await (sb as any).from('rel_tasks')
      .select('id,title,description,status,priority,assigned_to,created_by,source,due_date,created_at,statusbericht_id')
      .eq('project_id', id).order('created_at', { ascending: false })

    const aIds = [...new Set((taskData as any[] ?? []).map((t: any) => t.assigned_to).filter(Boolean))]
    let aMap: Record<string, string> = {}
    if (aIds.length > 0) {
      const { data: aData } = await sb.from('profiles').select('id,first_name,full_name').in('id', aIds as string[])
      ;(aData as any[] ?? []).forEach((p: any) => { aMap[p.id] = p.first_name || p.full_name?.split(' ')[0] || '?' })
    }
    setTasks((taskData as any[] ?? []).map((t: any) => ({ ...t, assignee_name: t.assigned_to ? aMap[t.assigned_to] : null })))

    const { data: bData } = await (sb as any).from('rel_statusberichte')
      .select('id,content,summary,source,created_at').eq('project_id', id).order('created_at', { ascending: false })
    setBerichte((bData as any[]) ?? [])
    setLoading(false)
  }

  function openNewTask(berichtId?: string) {
    setEditTask(null); setTTitle(''); setTDesc(''); setTStatus('open')
    setTPriority('medium'); setTAssignee(team[0]?.id ?? ''); setTDue('')
    setFromBericht(berichtId ?? null); setShowTask(true)
  }
  function openEditTask(t: Task) {
    setEditTask(t); setTTitle(t.title); setTDesc(t.description ?? '')
    setTStatus(t.status); setTPriority(t.priority)
    setTAssignee(t.assigned_to ?? ''); setTDue(t.due_date ?? '')
    setFromBericht(t.statusbericht_id); setShowTask(true)
  }

  async function saveTask() {
    if (!tTitle.trim() || tSaving) return
    setTSaving(true)
    const sb = createClient()
    const payload = { title: tTitle.trim(), description: tDesc.trim() || null, status: tStatus, priority: tPriority, assigned_to: tAssignee || null, due_date: tDue || null }
    if (editTask) {
      await (sb as any).from('rel_tasks').update(payload).eq('id', editTask.id)
    } else {
      await (sb as any).from('rel_tasks').insert({ ...payload, project_id: id, created_by: userId, source: fromBericht ? 'statusbericht' : 'manual', statusbericht_id: fromBericht || null })
    }
    setShowTask(false); setTSaving(false); load()
  }

  async function deleteTask(tid: string) {
    await (createClient() as any).from('rel_tasks').delete().eq('id', tid)
    setShowTask(false); load()
  }

  async function cycleStatus(t: Task, e: React.MouseEvent) {
    e.stopPropagation()
    const order = ['open', 'in_progress', 'review', 'done']
    const next = order[(order.indexOf(t.status) + 1) % order.length]
    await (createClient() as any).from('rel_tasks').update({ status: next }).eq('id', t.id)
    setTasks(ts => ts.map(x => x.id === t.id ? { ...x, status: next } : x))
  }

  async function generateBericht() {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1800))
    const content = `**Tagro Statusbericht – ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}**

Das Projekt "${project?.title}" befindet sich aktuell in Phase "${project?.phase || project?.status}".

**Fortschritt:**
- Die Kernentwicklung schreitet planmäßig voran
- Identifizierte offene Punkte sind bereit zur Bearbeitung
- Nächste Meilensteine stehen bevor

**Empfohlene Maßnahmen:**
1. Review der aktuellen Implementierung durchführen
2. Testing der neuen Features abschließen
3. Kundenfeedback einarbeiten und priorisieren

**Nächste Schritte:**
Das Team sollte die offenen Punkte prüfen und konkrete Tasks zuweisen.`

    await (createClient() as any).from('rel_statusberichte').insert({
      project_id: id, content, summary: 'Automatischer Tagro-Statusbericht', source: 'tagro', created_by: userId,
    })
    setGenerating(false); load(); setTab('Statusberichte')
  }

  async function generateTasksFrom(b: Statusbericht) {
    setGenTasks(true)
    await new Promise(r => setTimeout(r, 1200))
    const sb = createClient()
    const items = [
      { title: 'Review der aktuellen Implementierung', priority: 'high' },
      { title: 'Testing der neuen Features', priority: 'medium' },
      { title: 'Kundenfeedback einarbeiten', priority: 'medium' },
    ]
    for (const t of items) {
      await (sb as any).from('rel_tasks').insert({
        project_id: id, title: t.title, priority: t.priority, status: 'open',
        source: 'tagro', statusbericht_id: b.id, created_by: userId,
        assigned_to: team[0]?.id || null,
      })
    }
    setGenTasks(false); load(); setTab('Tasks')
  }

  const isPriv = userRole === 'admin' || userRole === 'dev'
  const openTasks   = tasks.filter(t => t.status === 'open')
  const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'review')
  const doneTasks   = tasks.filter(t => t.status === 'done')
  const pColor      = project?.color || '#6366f1'

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 22, height: 22, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )
  if (!project) return <div className="page-content" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Projekt nicht gefunden.</div>

  return (
    <div className="page-content" style={{ maxWidth: 860, paddingBottom: 60 }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
        .rt-row { transition: background .08s; cursor: pointer; }
        .rt-row:hover { background: var(--surface-2) !important; }
        .tab-b { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500; color: var(--text-muted); padding: 8px 2px; position: relative; transition: color .12s; }
        .tab-b.on { color: var(--text); }
        .tab-b.on::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--text); border-radius: 2px; }
        .ob-field { width: 100%; padding: 8px 10px; background: transparent; border: 1px solid var(--border); border-radius: 7px; font-size: 12.5px; color: var(--text); font-family: inherit; outline: none; box-sizing: border-box; }
        .ob-field:focus { border-color: var(--text-secondary); }
        .b-card { border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; margin-bottom: 12px; background: var(--card); }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: pColor, flexShrink: 0 }}/>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-.4px' }}>{project.title}</h1>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 7px', flexShrink: 0 }}>{project.phase || project.status}</span>
        </div>
        {project.description && <p style={{ margin: '0 0 0 20px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{project.description}</p>}
        <div style={{ display: 'flex', gap: 18, marginTop: 10, marginLeft: 20 }}>
          {[
            { val: tasks.length,        label: 'Tasks',    col: 'var(--text)' },
            { val: activeTasks.length,  label: 'aktiv',    col: '#f97316' },
            { val: doneTasks.length,    label: 'erledigt', col: '#22c55e' },
            { val: berichte.length,     label: 'Berichte', col: 'var(--text-muted)' },
          ].map(s => (
            <span key={s.label} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <b style={{ color: s.col }}>{s.val}</b> {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab-b${tab === t ? ' on' : ''}`}>{t}</button>
        ))}
      </div>

      {/* ══ ÜBERSICHT ══ */}
      {tab === 'Übersicht' && (
        <div>
          {/* Tagro CTA */}
          <div style={{ border: `1px solid ${pColor}33`, borderRadius: 12, padding: '18px 20px', marginBottom: 24, background: `${pColor}07`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Tagro Statusbericht</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Tagro analysiert den Projektstatus und erstellt automatisch Tasks für dein Entwicklerteam.
              </p>
            </div>
            <button onClick={generateBericht} disabled={generating}
              style={{ flexShrink: 0, height: 33, padding: '0 15px', background: pColor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: generating ? .7 : 1 }}>
              {generating
                ? <><span style={{ width: 11, height: 11, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/> Analysiere…</>
                : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z"/></svg> Tagro starten</>
              }
            </button>
          </div>

          {/* Tasks preview */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Aktuelle Tasks</p>
              <button onClick={() => openNewTask()} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 9px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-secondary)' }}>+ Task</button>
            </div>
            {tasks.length === 0 ? (
              <div style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: '28px 0', textAlign: 'center' }}>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-muted)' }}>Noch keine Tasks — starte Tagro oder erstelle manuell.</p>
                <button onClick={() => openNewTask()} style={{ height: 30, padding: '0 14px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Task erstellen</button>
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {tasks.slice(0, 5).map((t, i) => (
                  <TaskRow key={t.id} task={t} last={i === Math.min(tasks.length - 1, 4)} onClick={() => openEditTask(t)} onCycle={e => cycleStatus(t, e)} />
                ))}
              </div>
            )}
            {tasks.length > 5 && (
              <button onClick={() => setTab('Tasks')} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'inherit' }}>
                Alle {tasks.length} Tasks →
              </button>
            )}
          </div>

          {/* Latest Bericht */}
          {berichte.length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Letzter Bericht</p>
              <div className="b-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={pColor} strokeWidth="2.2" strokeLinecap="round"><path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: pColor }}>Tagro</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(berichte[0].created_at)}</span>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                  {berichte[0].content.slice(0, 300)}{berichte[0].content.length > 300 ? '…' : ''}
                </p>
                <button onClick={() => setTab('Statusberichte')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'inherit', padding: 0 }}>
                  Alle Berichte →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TASKS ══ */}
      {tab === 'Tasks' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{openTasks.length} offen · {activeTasks.length} aktiv · {doneTasks.length} erledigt</p>
            <button onClick={() => openNewTask()}
              style={{ height: 30, padding: '0 12px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Task erstellen
            </button>
          </div>
          {tasks.length === 0 ? (
            <div style={{ border: '1px dashed var(--border)', borderRadius: 10, padding: '50px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: '0 0 5px' }}>Noch keine Tasks</p>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 16px' }}>Erstelle Tasks manuell oder lass Tagro aus einem Statusbericht Tasks generieren.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={() => openNewTask()} style={{ height: 32, padding: '0 14px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Manuell erstellen</button>
                <button onClick={generateBericht} style={{ height: 32, padding: '0 14px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Tagro starten</button>
              </div>
            </div>
          ) : (
            <>
              {activeTasks.length > 0 && <TaskGroup label="In Arbeit" tasks={activeTasks} onEdit={openEditTask} onCycle={cycleStatus} />}
              {openTasks.length > 0   && <TaskGroup label="Offen"     tasks={openTasks}   onEdit={openEditTask} onCycle={cycleStatus} />}
              {doneTasks.length > 0   && <TaskGroup label="Erledigt"  tasks={doneTasks}   onEdit={openEditTask} onCycle={cycleStatus} />}
            </>
          )}
        </div>
      )}

      {/* ══ STATUSBERICHTE ══ */}
      {tab === 'Statusberichte' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{berichte.length} Berichte</p>
            <button onClick={generateBericht} disabled={generating}
              style={{ height: 30, padding: '0 12px', background: pColor, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5, opacity: generating ? .7 : 1 }}>
              {generating ? <span style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z"/></svg>}
              Tagro Bericht
            </button>
          </div>
          {berichte.length === 0 ? (
            <div style={{ border: '1px dashed var(--border)', borderRadius: 10, padding: '50px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: '0 0 5px' }}>Noch keine Berichte</p>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 16px' }}>Tagro analysiert deinen Projektstatus und erstellt strukturierte Berichte mit konkreten Handlungsempfehlungen.</p>
              <button onClick={generateBericht} disabled={generating} style={{ height: 32, padding: '0 16px', background: pColor, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Ersten Bericht generieren
              </button>
            </div>
          ) : berichte.map(b => (
            <div key={b.id} className="b-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${pColor}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={pColor} strokeWidth="2.2" strokeLinecap="round"><path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z"/></svg>
                  </div>
                  <div>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>Tagro Analyse</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{timeAgo(b.created_at)}</span>
                  </div>
                </div>
                <button onClick={() => generateTasksFrom(b)} disabled={genTasks}
                  style={{ height: 26, padding: '0 10px', background: 'transparent', border: `1px solid ${pColor}55`, borderRadius: 6, fontSize: 11, fontWeight: 600, color: pColor, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {genTasks ? <span style={{ width: 9, height: 9, border: `1.5px solid ${pColor}44`, borderTopColor: pColor, borderRadius: '50%', animation: 'spin .7s linear infinite' }}/> : null}
                  Tasks generieren
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{b.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── TASK MODAL ── */}
      {showTask && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn .15s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setShowTask(false) }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, width: '100%', maxWidth: 520, animation: 'slideUp .2s cubic-bezier(.16,1,.3,1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{editTask ? 'Task bearbeiten' : 'Neue Task'}</span>
              <button onClick={() => setShowTask(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding: '16px 18px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input ref={titleRef} value={tTitle} onChange={e => setTTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveTask() }}
                placeholder="Task-Titel"
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 16, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit', letterSpacing: '-.2px', boxSizing: 'border-box' }}
              />
              <textarea value={tDesc} onChange={e => setTDesc(e.target.value)} placeholder="Beschreibung (optional)…" rows={2}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.04em', display: 'block', marginBottom: 4 }}>STATUS</label>
                  <select value={tStatus} onChange={e => setTStatus(e.target.value)} className="ob-field" style={{ cursor: 'pointer' }}>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.04em', display: 'block', marginBottom: 4 }}>PRIORITÄT</label>
                  <select value={tPriority} onChange={e => setTPriority(e.target.value)} className="ob-field" style={{ cursor: 'pointer' }}>
                    {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.04em', display: 'block', marginBottom: 4 }}>ZUGEWIESEN AN</label>
                  <select value={tAssignee} onChange={e => setTAssignee(e.target.value)} className="ob-field" style={{ cursor: 'pointer' }}>
                    <option value="">Niemand</option>
                    {team.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.04em', display: 'block', marginBottom: 4 }}>FÄLLIG AM</label>
                  <input type="date" value={tDue} onChange={e => setTDue(e.target.value)} className="ob-field" style={{ cursor: 'pointer', colorScheme: 'dark' }}/>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
              <div>{editTask && <button onClick={() => deleteTask(editTask.id)} style={{ height: 28, padding: '0 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11.5, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>Löschen</button>}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowTask(false)} style={{ height: 30, padding: '0 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>Abbrechen</button>
                <button onClick={saveTask} disabled={!tTitle.trim() || tSaving}
                  style={{ height: 30, padding: '0 14px', background: tTitle.trim() ? 'var(--btn-prim)' : 'var(--border)', color: tTitle.trim() ? 'var(--btn-prim-text)' : 'var(--text-muted)', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: tTitle.trim() ? 'pointer' : 'default', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {tSaving ? <span style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/> : null}
                  {editTask ? 'Speichern' : 'Erstellen'} {!tSaving && <span style={{ fontSize: 10, opacity: .5 }}>⌘↵</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskGroup({ label, tasks, onEdit, onCycle }: {
  label: string; tasks: Task[]
  onEdit: (t: Task) => void; onCycle: (t: Task, e: React.MouseEvent) => void
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ margin: '0 0 6px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label} · {tasks.length}</p>
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {tasks.map((t, i) => <TaskRow key={t.id} task={t} last={i === tasks.length - 1} onClick={() => onEdit(t)} onCycle={e => onCycle(t, e)} />)}
      </div>
    </div>
  )
}

function TaskRow({ task, last, onClick, onCycle }: { task: Task; last: boolean; onClick: () => void; onCycle: (e: React.MouseEvent) => void }) {
  const st = STATUS_META[task.status] ?? STATUS_META.open
  const pr = PRIORITY_META[task.priority] ?? PRIORITY_META.medium
  return (
    <div className="rt-row" onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: last ? 'none' : '1px solid var(--border)', background: 'var(--card)' }}>
      <button onClick={onCycle} title="Status wechseln"
        style={{ width: 16, height: 16, borderRadius: '50%', background: st.bg, border: `1.5px solid ${st.color}`, cursor: 'pointer', flexShrink: 0, padding: 0 }}/>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text)', textDecoration: task.status === 'done' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.title}
      </span>
      {task.source === 'tagro' && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" title="Von Tagro"><path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z"/></svg>
      )}
      {task.assignee_name && (
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '1px 7px', flexShrink: 0 }}>{task.assignee_name}</span>
      )}
      {task.due_date && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
          {new Date(task.due_date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
        </span>
      )}
      <span style={{ fontSize: 10.5, fontWeight: 600, color: pr.color, flexShrink: 0 }}>{pr.label}</span>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ opacity: .4 }}><path d="M9 6l6 6-6 6"/></svg>
    </div>
  )
}
