'use client'

/**
 * Client Dashboard — Festag „Statusabfrage".
 *
 * Designziele (verbindlich):
 *   • Aeonik Medium (500) durchgehend, kein Bold, kein Regular.
 *   • Keine Trennlinien zwischen Sektionen, keine Primary-Buttons.
 *   • Header sitzt knapp unter der Workspace-Kante. Rechts oben bleibt
 *     leer — keine Werkzeugleiste, keine Glocke, keine Filter.
 *   • Voice-Briefing („Statusabfrage anhören") sitzt direkt unter dem
 *     Hero-Text als einzige primäre Aktion auf der Seite.
 *   • Sprache: „Statusabfrage" ersetzt „Briefing" im sichtbaren Text.
 *   • Kein „Workspace wird vorbereitet" Splash — Hero degradiert inline.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import NewProjectModal from '@/components/NewProjectModal'
import NewTaskModal from '@/components/NewTaskModal'
import AudioBriefingButton from '@/components/AudioBriefingButton'
import ObserverWelcomeModal from '@/components/ObserverWelcomeModal'

type Project   = { id: string; title: string; description: string | null; status: string; created_at: string; color: string | null }
type Task      = { id: string; title: string; status: string; priority?: string; project_id: string; updated_at?: string }
type Activity  = { id: string; type: string; message: string; created_at: string; project_id?: string }
type Milestone = { id: string; project_id: string; title: string; amount: number | null; currency: string | null; status: string | null; due_date: string | null; paid_at: string | null; order_index: number | null }

const PHASE: Record<string, { label: string; pct: number }> = {
  intake:   { label: 'Intake',        pct: 10  },
  planning: { label: 'Planung',       pct: 28  },
  active:   { label: 'In Arbeit',     pct: 62  },
  testing:  { label: 'Testing',       pct: 85  },
  done:     { label: 'Abgeschlossen', pct: 100 },
}

export default function DashboardPage() {
  const [projects,  setProjects]  = useState<Project[]>([])
  const [main,      setMain]      = useState<Project|null>(null)
  const [tasks,     setTasks]     = useState<Task[]>([])
  const [allTasks,  setAllTasks]  = useState<Task[]>([])
  const [activity,  setActivity]  = useState<Activity[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [firstName, setFirstName] = useState('')
  const [loading,   setLoading]   = useState(true)
  const [report,    setReport]    = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewTask,    setShowNewTask]    = useState(false)
  const supabase = useMemo(() => createClient(), [])
  void activity; void setReport

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      const { data: p } = await supabase.from('profiles').select('first_name,full_name').eq('id', uid).single()
      if (p) setFirstName((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')

      const { data: projs } = await supabase.from('projects').select('*').order('created_at', { ascending:false })
      if (projs?.length) {
        setProjects(projs)
        const prio: Record<string,number> = { active:0, testing:1, planning:2, intake:3, done:4 }
        const m = [...(projs as any[])].sort((a,b) => (prio[a.status]??9)-(prio[b.status]??9))[0]
        setMain(m)
        const [{ data: t }, { data: at }, { data: ms }] = await Promise.all([
          supabase.from('tasks').select('*').eq('project_id', m.id),
          supabase.from('tasks').select('*').in('project_id', (projs as any[]).map(pr => pr.id)),
          supabase.from('milestones').select('id,project_id,title,amount,currency,status,due_date,paid_at,order_index').in('project_id', (projs as any[]).map(pr => pr.id)).order('order_index', { ascending: true }),
        ])
        setTasks(t ?? [])
        setAllTasks(at ?? [])
        setMilestones((ms as Milestone[] | null) ?? [])
      }
      const { data: feed } = await supabase.from('activity_feed').select('*').order('created_at',{ascending:false}).limit(8)
      setActivity(feed ?? [])
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ''

  const phase       = main ? (PHASE[main.status] ?? PHASE.intake) : null
  const done        = tasks.filter(t => t.status==='done').length
  const activeTasks = tasks.filter(t => t.status!=='done')
  const completePct = tasks.length ? Math.round(done/tasks.length*100) : 0

  // ── KPI bar values ────────────────────────────────────────────
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'testing' || p.status === 'planning')
  const decisionsOpen  = allTasks.filter(t => t.status === 'waiting').length
  const blockersOpen   = allTasks.filter(t => t.status === 'blocked').length
  const nextMilestone  = main
    ? milestones
        .filter(m => m.project_id === main.id && !m.paid_at && m.status !== 'completed' && m.status !== 'paid')
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))[0]
    : null
  const milestoneDue = nextMilestone?.due_date ? new Date(nextMilestone.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : null

  const person = displayName || ''
  const urgentLine = blockersOpen > 0
    ? `${blockersOpen === 1 ? 'Ein Blocker beeinflusst' : `${blockersOpen} Blocker beeinflussen`} den Zeitplan.`
    : decisionsOpen > 0
      ? `${decisionsOpen === 1 ? 'Eine Entscheidung wartet' : `${decisionsOpen} Entscheidungen warten`} auf dich.`
      : activeProjects.length > 0
        ? 'Heute braucht ein Projekt deine Aufmerksamkeit.'
        : 'Heute ist nichts dringend.'
  const executiveSummary = blockersOpen > 0
    ? `${blockersOpen === 1 ? 'Ein Blocker wurde' : `${blockersOpen} Blocker wurden`} erkannt. Tagro priorisiert die nächsten Schritte und hält Entscheidungen, Risiken und Zustellungen in der Übersicht.`
    : decisionsOpen > 0
      ? `${decisionsOpen === 1 ? 'Eine offene Entscheidung wartet' : `${decisionsOpen} offene Entscheidungen warten`} auf Freigabe. Sobald sie geklärt ${decisionsOpen === 1 ? 'ist' : 'sind'}, aktualisiert Tagro Projektstatus, Risiken und nächste Schritte.`
      : main
        ? `${main.title} ist aktuell in ${phase?.label ?? 'Bearbeitung'}. ${activeTasks.length === 0 ? 'Keine offenen Tasks' : `${activeTasks.length} offene Tasks`} und ${blockersOpen === 0 ? 'keine akuten Blocker' : `${blockersOpen} Blocker`} liegen vor.`
        : 'Kein aktives Projekt, keine offene Entscheidung, keine Blocker. Sobald die erste Statusabfrage vorliegt, fasst Tagro Fortschritt, Risiken und nächste Schritte hier zusammen.'

  const projectStatusValue = activeProjects.length === 0 ? 'ruhig' : `${activeProjects.length} aktiv`
  const projectStatusSub = activeProjects.length === 0
    ? 'kein aktives Projekt'
    : main ? `${main.title}${phase ? ` · ${phase.label}` : ''}` : 'Projektstatus wird geprüft'
  const decisionValue = decisionsOpen === 0 ? 'keine' : String(decisionsOpen)
  const decisionSub = decisionsOpen === 0 ? 'nichts wartet auf dich' : 'wartet auf Freigabe'
  const blockerValue = blockersOpen === 0 ? 'keine' : String(blockersOpen)
  const blockerSub = blockersOpen === 0 ? 'keine akute Verzögerung' : 'Zeitplan prüfen'
  const milestoneValue = nextMilestone ? nextMilestone.title : '—'
  const milestoneSub = nextMilestone
    ? milestoneDue ? `fällig ${milestoneDue}` : 'noch ohne Datum'
    : 'noch nicht geplant'

  // ── Today's Focus ─────────────────────────────────────────────
  type FocusItem = { tone: 'crit' | 'warn' | 'ok' | 'neutral'; tag: string; text: string; sub?: string; href: string; sortKey: number }
  const priorityScore: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
  const focusItems: FocusItem[] = (() => {
    const out: FocusItem[] = []
    allTasks.forEach(t => {
      const proj = projects.find(p => p.id === t.project_id)
      const subTitle = proj?.title
      if (t.status === 'blocked') {
        out.push({ tone: 'crit', tag: 'Blocker', text: t.title, sub: subTitle, href: proj ? `/project/${proj.id}` : '/tasks', sortKey: 100 })
      } else if (t.status === 'waiting') {
        out.push({ tone: 'warn', tag: 'Entscheidung', text: t.title, sub: subTitle, href: proj ? `/project/${proj.id}` : '/tasks', sortKey: 80 })
      } else if (t.status === 'doing') {
        out.push({ tone: 'ok', tag: 'Aktiv', text: t.title, sub: subTitle, href: proj ? `/project/${proj.id}` : '/tasks', sortKey: priorityScore[t.priority ?? 'medium'] ?? 2 })
      } else if (t.status === 'todo') {
        out.push({ tone: 'neutral', tag: 'Offen', text: t.title, sub: subTitle, href: proj ? `/project/${proj.id}` : '/tasks', sortKey: (priorityScore[t.priority ?? 'medium'] ?? 2) - 0.5 })
      }
    })
    return out.sort((a, b) => b.sortKey - a.sortKey).slice(0, 6)
  })()

  return (
    <div className="page-content dashboard-os dash-editorial" style={{ maxWidth: undefined }}>
      <style>{`
        @keyframes dashFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .dash-editorial {
          min-height:100%;
          background:transparent;
          color:var(--text);
          padding: 0 clamp(20px, 2.4vw, 32px) 56px;
          overflow:hidden;
          --ed-muted: #5A6478;
          --ed-secondary: #4E5567;
        }
        [data-theme="dark"] .dash-editorial,
        [data-theme="classic-dark"] .dash-editorial {
          --ed-muted: #8D98A6;
          --ed-secondary: #B7BDC8;
        }
        .dash-editorial * { font-weight: 500 !important; }

        /* ── Hero — sits flush to the top edge ───────────────── */
        .ed-hero {
          max-width:760px;
          padding: 6px 0 28px;
          animation:dashFade .3s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-title {
          margin:0;
          color:var(--text);
          font-size:clamp(24px, 2.4vw, 30px);
          line-height:1.12;
          letter-spacing:-.018em;
        }
        .ed-status-line {
          margin:6px 0 0;
          color:var(--ed-secondary);
          font-size:clamp(18px, 1.8vw, 22px);
          line-height:1.25;
          letter-spacing:-.01em;
        }
        .ed-summary {
          margin:18px 0 0;
          max-width:620px;
          color:var(--ed-secondary);
          font-size:14px;
          line-height:1.6;
        }
        .ed-hero-actions {
          margin-top: 20px;
          display:flex; align-items:center; gap:8px;
          flex-wrap: wrap;
        }
        /* Audio briefing button — single primary surface on the page,
           still neutral: floats with the Tasks-style shadow. */
        .dash-editorial .audio-briefing-button {
          height:36px;
          padding:0 16px 0 14px;
          border-radius:999px;
          border:0;
          background:#fff;
          color:var(--text);
          font-size:13px;
          letter-spacing:.005em;
          display:inline-flex; align-items:center; gap:8px;
          box-shadow:0 1px 2px rgba(15,23,42,.08), 0 7px 18px rgba(15,23,42,.08);
          transition: background .12s ease, color .12s ease, box-shadow .12s ease, transform .12s ease;
        }
        .dash-editorial .audio-briefing-button:hover {
          box-shadow:0 1px 2px rgba(15,23,42,.10), 0 9px 22px rgba(15,23,42,.11);
          transform:translateY(-1px);
        }
        [data-theme="dark"] .dash-editorial .audio-briefing-button,
        [data-theme="classic-dark"] .dash-editorial .audio-briefing-button {
          background: color-mix(in srgb, var(--surface) 92%, #fff 8%);
          color: var(--text);
          box-shadow:0 1px 2px rgba(0,0,0,.28), 0 8px 20px rgba(0,0,0,.20);
        }
        [data-theme="dark"] .dash-editorial .audio-briefing-button:hover,
        [data-theme="classic-dark"] .dash-editorial .audio-briefing-button:hover {
          box-shadow:0 1px 2px rgba(0,0,0,.34), 0 10px 24px rgba(0,0,0,.26);
        }

        /* ── Focus list ──────────────────────────────────────── */
        .ed-focus {
          padding: 12px 0 28px;
          animation:dashFade .3s .04s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-focus-head {
          display:flex; align-items:baseline; justify-content:space-between;
          margin:0 0 8px;
        }
        .ed-focus-title {
          margin:0;
          color:var(--text);
          font-size:13px;
          letter-spacing:-.002em;
        }
        .ed-focus-meta {
          color:var(--ed-muted);
          font-size:11px;
          letter-spacing:.04em;
        }
        .ed-focus-list { display:flex; flex-direction:column; gap:2px; }
        .ed-focus-row {
          display:grid;
          grid-template-columns:74px 6px minmax(0, 1fr) auto;
          gap:12px; align-items:center;
          padding:9px 10px; border-radius:9px;
          text-decoration:none; color:inherit;
          transition: background .12s ease;
        }
        .ed-focus-row:hover { background: color-mix(in srgb, var(--surface-2) 55%, transparent); }
        .ed-focus-tag {
          display:inline-flex; align-items:center; justify-content:center;
          height:20px; padding:0 9px; border-radius:5px;
          font-size:10.5px; letter-spacing:.06em; text-transform:uppercase;
          flex-shrink:0;
        }
        .ed-focus-tag.crit    { background: color-mix(in srgb, var(--red,    #d14343) 16%, transparent); color: var(--red, #c0362e); }
        .ed-focus-tag.warn    { background: color-mix(in srgb, var(--amber,  #b98700) 18%, transparent); color: var(--amber-dark, #8a6500); }
        .ed-focus-tag.ok      { background: color-mix(in srgb, var(--green,  #34c759) 14%, transparent); color: var(--green-dark, #28a745); }
        .ed-focus-tag.neutral { background: color-mix(in srgb, var(--ed-secondary) 12%, transparent); color: var(--ed-secondary); }
        .ed-focus-dot {
          width:6px; height:6px; border-radius:999px;
          background:var(--ed-muted); flex-shrink:0;
        }
        .ed-focus-text {
          min-width:0; color:var(--text); font-size:13.5px;
          line-height:1.35;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .ed-focus-sub {
          color:var(--ed-muted); font-size:11.5px;
          flex-shrink:0; letter-spacing:.005em;
        }
        .ed-focus-empty {
          padding:14px 10px; color:var(--ed-muted); font-size:13px;
        }

        /* ── KPI strip ───────────────────────────────────────── */
        .ed-status-row {
          display:grid;
          grid-template-columns:repeat(4, minmax(0, 1fr));
          gap:24px;
          padding: 10px 4px 32px;
          animation:dashFade .3s .06s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-status-label {
          margin:0 0 10px;
          color:var(--ed-muted);
          font-size:10.5px;
          letter-spacing:.16em;
          text-transform:uppercase;
        }
        .ed-status-value {
          margin:0 0 4px;
          color:var(--text);
          font-size:15px;
          line-height:1.25;
          letter-spacing:-.003em;
        }
        .ed-status-sub {
          margin:0;
          color:var(--ed-muted);
          font-size:12px;
          line-height:1.4;
        }

        /* ── Active project ──────────────────────────────────── */
        .ed-project { padding: 12px 0 24px; }
        .ed-project-head {
          display:flex; justify-content:space-between; align-items:flex-end;
          gap:20px; margin-bottom:18px;
        }
        .ed-section-label {
          margin:0 0 12px;
          color:var(--ed-muted);
          font-size:10.5px;
          letter-spacing:.16em;
          text-transform:uppercase;
        }
        .ed-project-title {
          margin:0; color:var(--text);
          font-size:20px; line-height:1.2; letter-spacing:-.02em;
        }
        .ed-progress {
          height:3px; width:100%;
          background: color-mix(in srgb, var(--surface-2) 60%, transparent);
          border-radius:999px; overflow:hidden;
        }
        .ed-progress span {
          display:block; height:100%;
          width:var(--progress);
          background: color-mix(in srgb, var(--ed-secondary) 60%, transparent);
        }
        .ed-project-row {
          display:grid;
          grid-template-columns:repeat(4, minmax(0,1fr));
          gap:24px;
          margin-top:18px;
        }

        .ed-button {
          height:32px; padding:0 14px;
          display:inline-flex; align-items:center; gap:7px;
          border-radius:999px;
          border:1px solid color-mix(in srgb, var(--border) 80%, transparent);
          background:transparent;
          color:var(--ed-secondary);
          font:inherit;
          font-size:12.5px;
          text-decoration:none;
          cursor:pointer;
          transition: background .12s ease, color .12s ease, border-color .12s ease;
        }
        .ed-button:hover {
          color:var(--text);
          background: color-mix(in srgb, var(--surface-2) 60%, transparent);
        }

        @media (max-width:960px) {
          .ed-status-row { grid-template-columns:repeat(2, minmax(0,1fr)); gap:22px; }
        }
        @media (max-width:760px) {
          .dash-editorial { padding: 0 14px 88px; }
          .ed-title { font-size:21px; }
          .ed-status-line { font-size:17.5px; }
          .ed-summary { font-size:13.5px; margin-top:14px; }
          .ed-status-row { grid-template-columns:1fr 1fr; gap:18px; padding:14px 0 22px; }
          .ed-project-row { grid-template-columns:1fr 1fr; gap:18px; }
          .ed-focus-row { grid-template-columns: 70px 6px minmax(0,1fr); }
          .ed-focus-sub { display:none; }
        }
      `}</style>

      <section className="ed-hero" aria-label="Tägliche Statusabfrage">
        <h1 className="ed-title">{greeting}{person ? `, ${person}` : ''}.</h1>
        <p className="ed-status-line">{loading ? 'Tagro verdichtet die Lage…' : urgentLine}</p>
        <p className="ed-summary">{loading ? '' : executiveSummary}</p>
        <div className="ed-hero-actions">
          <AudioBriefingButton
            type="dashboard_briefing"
            label="Statusabfrage anhören"
            projectTitle={main?.title}
            report={report || executiveSummary}
            projectStatus={main ? PHASE[main.status]?.label : undefined}
            progress={completePct}
            blockerCount={blockersOpen}
            decisionCount={decisionsOpen}
            nextSteps={[main ? `${main.title} prüfen` : 'erste Statusabfrage aufnehmen']}
          />
        </div>
      </section>

      <section className="ed-focus" aria-label="Heute im Fokus">
        <div className="ed-focus-head">
          <p className="ed-focus-title">Heute im Fokus</p>
          <span className="ed-focus-meta">
            {focusItems.length === 0 ? 'nichts dringend' : `${focusItems.length} ${focusItems.length === 1 ? 'Eintrag' : 'Einträge'}`}
          </span>
        </div>
        {focusItems.length === 0 ? (
          <p className="ed-focus-empty">Keine Blocker, keine offenen Entscheidungen. Tagro hält die Lage ruhig.</p>
        ) : (
          <div className="ed-focus-list">
            {focusItems.map((it, i) => (
              <Link key={`${it.tag}-${i}-${it.text}`} href={it.href} className="ed-focus-row">
                <span className={`ed-focus-tag ${it.tone}`}>{it.tag}</span>
                <span className="ed-focus-dot" />
                <span className="ed-focus-text">{it.text}</span>
                {it.sub && <span className="ed-focus-sub">{it.sub}</span>}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="ed-status-row" aria-label="Lage">
        {[
          ['Projektstatus',  projectStatusValue, projectStatusSub],
          ['Entscheidungen', decisionValue,      decisionSub],
          ['Blocker',        blockerValue,       blockerSub],
          ['Meilenstein',    milestoneValue,     milestoneSub],
        ].map(([label, value, sub]) => (
          <div key={label}>
            <p className="ed-status-label">{label}</p>
            <p className="ed-status-value">{value}</p>
            <p className="ed-status-sub">{sub}</p>
          </div>
        ))}
      </section>

      {main && (
        <section className="ed-project" aria-label="Aktives Projekt">
          <div className="ed-project-head">
            <div>
              <p className="ed-section-label">Aktives Projekt</p>
              <h2 className="ed-project-title">{main.title}</h2>
            </div>
            <Link href={`/project/${main.id}`} className="ed-button">Projekt öffnen</Link>
          </div>
          <div className="ed-progress" style={{ '--progress': `${completePct}%` } as CSSProperties}><span /></div>
          <div className="ed-project-row">
            {[
              ['Fortschritt', `${completePct}%`, `${done} von ${tasks.length} Tasks erledigt`],
              ['Phase',       phase?.label ?? 'Intake', 'aktueller Projektstatus'],
              ['Risiken',     blockersOpen === 0 ? 'keine' : String(blockersOpen), blockerSub],
              ['Tasks',       String(activeTasks.length), activeTasks.length === 0 ? 'nichts offen' : 'in Arbeit oder geplant'],
            ].map(([label, value, sub]) => (
              <div key={label}>
                <p className="ed-status-label">{label}</p>
                <p className="ed-status-value">{value}</p>
                <p className="ed-status-sub">{sub}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(id) => { setShowNewProject(false); window.location.href = `/project/${id}` }}
        />
      )}
      {showNewTask && main && (
        <NewTaskModal
          onClose={() => setShowNewTask(false)}
          onCreated={() => { setShowNewTask(false); window.location.reload() }}
          defaultProjectId={main.id}
          source="manual"
        />
      )}
      <ObserverWelcomeModal />
    </div>
  )
}
