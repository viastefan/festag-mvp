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
import VoiceControls from '@/components/VoiceControls'
import ObserverWelcomeModal from '@/components/ObserverWelcomeModal'
import { generateBriefingText } from '@/lib/briefings'

// ─────────────────────────────────────────────────────────────────────
// Greeting + Pulse helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Day-stable greeting. Same wording within a calendar day, fresh on the
 * next one. Variant pool depends on whether we know the first name; if
 * not, we fall back to "Chef" / "Boss" for a calm, slightly playful tone.
 */
function pickGreeting(hour: number, first: string): string {
  const partOfDay = hour < 12 ? 'Morgen' : hour < 18 ? 'Tag' : 'Abend'
  const name = first ? first.charAt(0).toUpperCase() + first.slice(1) : 'Chef'
  const variants = first
    ? [
        `Guten ${partOfDay}, ${name}.`,
        `Hallo ${name}.`,
        `Schön, dass du da bist, ${name}.`,
        `Bereit für heute, ${name}?`,
        `${partOfDay}, ${name}.`,
      ]
    : [
        `Guten ${partOfDay}, Chef.`,
        `Hallo Chef.`,
        `Schön, dass du da bist.`,
        `Bereit für heute, Chef?`,
        `${partOfDay}, Chef.`,
      ]
  const today = new Date()
  const seed = today.getFullYear() * 1000 + (today.getMonth() + 1) * 50 + today.getDate()
  return variants[seed % variants.length]
}

type PulseTone = 'green' | 'amber' | 'red'
type Pulse = { tone: PulseTone; label: string; explanation: string }

function buildPulse(args: { blockers: number; decisions: number; activeProjects: number; mainTitle: string | undefined; phaseLabel: string | undefined; openTasks: number }): Pulse {
  const { blockers, decisions, activeProjects, mainTitle, phaseLabel, openTasks } = args
  if (blockers > 0) {
    return {
      tone: 'red',
      label: blockers === 1 ? 'Risiko erkannt' : `${blockers} Risiken erkannt`,
      explanation:
        `Tagro hat ${blockers === 1 ? 'einen Blocker' : `${blockers} Blocker`} erkannt, ` +
        `der den Zeitplan beeinflusst. Ich priorisiere die nächsten Schritte und halte Entscheidungen, ` +
        `Risiken und Zustellungen in der Übersicht.`,
    }
  }
  if (decisions > 0) {
    return {
      tone: 'amber',
      label: decisions === 1 ? 'Entscheidung offen' : `${decisions} Entscheidungen offen`,
      explanation:
        `${decisions === 1 ? 'Eine offene Entscheidung wartet' : `${decisions} offene Entscheidungen warten`} auf deine Freigabe. ` +
        `Sobald geklärt, aktualisiere ich Projektstatus, Risiken und nächste Schritte automatisch.`,
    }
  }
  if (activeProjects > 0 && mainTitle) {
    return {
      tone: 'green',
      label: 'Alles im Plan',
      explanation:
        `${mainTitle} ist aktuell in ${phaseLabel ?? 'Bearbeitung'}. ` +
        `${openTasks === 0 ? 'Keine offenen Tasks' : `${openTasks} offene Tasks`}, keine Blocker. ` +
        `Du kannst durchatmen.`,
    }
  }
  return {
    tone: 'green',
    label: 'Heute ist nichts dringend',
    explanation:
      'Keine Blocker, keine offenen Entscheidungen, kein aktives Projekt im Stress. ' +
      'Sobald sich etwas ändert, melde ich mich hier mit konkreten nächsten Schritten.',
  }
}

type Project   = { id: string; title: string; description: string | null; status: string; created_at: string; color: string | null }
type Task      = { id: string; title: string; status: string; priority?: string; project_id: string; updated_at?: string }
type Activity  = { id: string; type: string; message: string; created_at: string; project_id?: string }
type Milestone = { id: string; project_id: string; title: string; amount: number | null; currency: string | null; status: string | null; due_date: string | null; paid_at: string | null; order_index: number | null }
type BriefingChannels = { whatsapp: boolean; audioFeed: boolean; spotify: boolean }

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
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewTask,    setShowNewTask]    = useState(false)
  const [channels, setChannels] = useState<BriefingChannels>({ whatsapp: false, audioFeed: false, spotify: false })
  const supabase = useMemo(() => createClient(), [])
  void activity

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      const [{ data: p }, { data: briefingSub }] = await Promise.all([
        supabase.from('profiles').select('first_name,full_name,notif_whatsapp,whatsapp_number').eq('id', uid).single(),
        (supabase as any).from('briefing_subscriptions').select('format,cadence').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (p) setFirstName((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')
      setChannels({
        whatsapp: Boolean((p as any)?.notif_whatsapp || (p as any)?.whatsapp_number),
        audioFeed: Boolean(briefingSub && ['audio', 'both'].includes(String((briefingSub as any).format)) && String((briefingSub as any).cadence ?? 'off') !== 'off'),
        spotify: false,
      })

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

  const greeting = useMemo(() => pickGreeting(new Date().getHours(), firstName), [firstName])

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

  const pulse = useMemo(() => buildPulse({
    blockers: blockersOpen,
    decisions: decisionsOpen,
    activeProjects: activeProjects.length,
    mainTitle: main?.title,
    phaseLabel: phase?.label,
    openTasks: activeTasks.length,
  }), [blockersOpen, decisionsOpen, activeProjects.length, main?.title, phase?.label, activeTasks.length])

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

  const agencyMode = projects.length >= 5
  const projectSegments = projects.slice(0, agencyMode ? 3 : 4).map(project => {
    const projectTaskCount = allTasks.filter(task => task.project_id === project.id).length
    const phaseLabel = PHASE[project.status]?.label ?? 'Intake'
    return `${project.title}: ${phaseLabel}${projectTaskCount ? `, ${projectTaskCount} Tasks` : ''}`
  })
  const nextStep = focusItems[0]?.text ?? (main ? `${main.title} kurz prüfen` : 'erstes Projekt anlegen')
  const briefingLines = [
    agencyMode
      ? `${projects.length} Projekte im Blick. Tagro fasst nur das Wichtigste als Portfolio-Pulse zusammen.`
      : projects.length > 1
        ? `${projects.length} Projekte im Blick. Das Briefing bleibt kurz und teilt sich nach Projekten.`
        : main
          ? `${main.title} ist aktuell ${phase?.label ?? 'im Intake'}.`
          : 'Noch kein aktives Projekt. Tagro wartet auf erste Projektsignale.',
    blockersOpen > 0 ? `${blockersOpen} Risiko${blockersOpen === 1 ? '' : 'en'} brauchen Aufmerksamkeit.` : 'Keine akuten Risiken sichtbar.',
    decisionsOpen > 0 ? `${decisionsOpen} Entscheidung${decisionsOpen === 1 ? '' : 'en'} warten auf dich.` : 'Keine offene Entscheidung wartet auf dich.',
    `Nächster Schritt: ${nextStep}.`,
  ]
  const briefingText = generateBriefingText({
    type: 'dashboard_briefing',
    projectTitle: agencyMode ? 'dein Portfolio' : main?.title,
    report: briefingLines.join(' '),
    projectStatus: agencyMode ? 'Portfolio Pulse' : phase?.label,
    progress: completePct,
    blockerCount: blockersOpen,
    decisionCount: decisionsOpen,
    nextSteps: [nextStep],
  })
  const attentionItems = [
    {
      label: 'Risiken',
      value: blockersOpen === 0 ? 'keine' : String(blockersOpen),
      tone: blockersOpen > 0 ? 'warn' : 'calm',
      href: blockersOpen > 0 ? '/tasks?status=blocked' : '/tasks',
    },
    {
      label: 'Entscheidungen',
      value: decisionsOpen === 0 ? 'keine' : String(decisionsOpen),
      tone: decisionsOpen > 0 ? 'warn' : 'calm',
      href: decisionsOpen > 0 ? '/tasks?status=waiting' : '/tasks',
    },
    {
      label: 'Nächster Schritt',
      value: nextStep,
      tone: 'neutral',
      href: focusItems[0]?.href ?? (main ? `/project/${main.id}` : '/projects'),
    },
  ]

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

        /* ── Hero — 24px top breathing room, calm headline ──── */
        .ed-hero {
          padding: 24px 0 28px;
          animation: dashFade .3s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-hero-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .ed-title {
          margin: 0;
          color: var(--text);
          font-size: clamp(18px, 1.7vw, 21px);
          line-height: 1.25;
          letter-spacing: -.005em;
          flex: 1;
          min-width: 0;
        }
        .ed-hero-actions { margin-top: 18px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        /* ── Status pulse — floating badge in the corner ────── */
        .ed-pulse-wrap { position: relative; flex-shrink: 0; }
        .ed-pulse {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 28px;
          padding: 0 12px 0 10px;
          border-radius: 999px;
          border: 0;
          background: #fff;
          color: var(--ed-secondary);
          font: inherit;
          font-size: 12px;
          letter-spacing: .005em;
          cursor: default;
          box-shadow: 0 1px 2px rgba(15,23,42,.08), 0 7px 18px rgba(15,23,42,.08);
          transition: box-shadow .14s ease, transform .14s ease, color .14s ease;
        }
        .ed-pulse:hover { color: var(--text); transform: translateY(-1px); box-shadow: 0 1px 2px rgba(15,23,42,.10), 0 9px 22px rgba(15,23,42,.11); }
        [data-theme="dark"] .ed-pulse,
        [data-theme="classic-dark"] .ed-pulse {
          background: color-mix(in srgb, var(--surface) 92%, #fff 8%);
          box-shadow: 0 1px 2px rgba(0,0,0,.28), 0 8px 20px rgba(0,0,0,.20);
        }
        [data-theme="dark"] .ed-pulse:hover,
        [data-theme="classic-dark"] .ed-pulse:hover { box-shadow: 0 1px 2px rgba(0,0,0,.34), 0 10px 24px rgba(0,0,0,.26); }
        .ed-pulse-dot {
          width: 8px; height: 8px; border-radius: 999px;
          background: currentColor;
          flex-shrink: 0;
          animation: pulseGlow 2.4s ease-in-out infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
          50%      { box-shadow: 0 0 0 5px transparent;  opacity: .55; }
        }
        .ed-pulse.tone-green .ed-pulse-dot { color: #22c55e; }
        .ed-pulse.tone-amber .ed-pulse-dot { color: #f59e0b; }
        .ed-pulse.tone-red   .ed-pulse-dot { color: #ef4444; }
        .ed-pulse-label { white-space: nowrap; }

        /* ── Tagro status briefing — dashboard core surface ───── */
        .ed-briefing {
          margin-top: 18px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(270px, .46fr);
          gap: 22px;
          padding: 18px;
          border-radius: 12px;
          background:
            radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--text) 5%, transparent), transparent 42%),
            color-mix(in srgb, var(--surface) 92%, transparent);
          box-shadow:
            0 1px 2px rgba(15,23,42,.05),
            0 18px 46px rgba(15,23,42,.08);
        }
        [data-theme="dark"] .ed-briefing,
        [data-theme="classic-dark"] .ed-briefing {
          background:
            radial-gradient(circle at 16% 0%, color-mix(in srgb, #fff 8%, transparent), transparent 42%),
            color-mix(in srgb, var(--surface) 92%, #fff 4%);
          box-shadow:
            0 1px 2px rgba(0,0,0,.28),
            0 20px 56px rgba(0,0,0,.24);
        }
        .ed-briefing-main,
        .ed-briefing-side { min-width: 0; }
        .ed-briefing-kicker {
          margin: 0 0 7px;
          color: var(--ed-muted);
          font-size: 10.5px;
          letter-spacing: .15em;
          text-transform: uppercase;
        }
        .ed-briefing-title {
          margin: 0;
          color: var(--text);
          font-size: clamp(17px, 1.5vw, 20px);
          line-height: 1.22;
          letter-spacing: -.008em;
        }
        .ed-briefing-copy {
          margin: 10px 0 14px;
          display: grid;
          gap: 4px;
          color: var(--ed-secondary);
          font-size: 13px;
          line-height: 1.45;
        }
        .ed-briefing-copy p { margin: 0; }
        .ed-briefing-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .dash-editorial .ed-briefing .voice-controls { gap: 8px; }
        .dash-editorial .ed-briefing .voice-icon-btn,
        .dash-editorial .ed-briefing .voice-field {
          height: 32px;
          border: 0;
          border-radius: 8px;
          background: #fff;
          color: var(--text);
          box-shadow: 0 1px 2px rgba(15,23,42,.08), 0 7px 18px rgba(15,23,42,.08);
          font-size: 11.5px;
        }
        [data-theme="dark"] .dash-editorial .ed-briefing .voice-icon-btn,
        [data-theme="dark"] .dash-editorial .ed-briefing .voice-field,
        [data-theme="classic-dark"] .dash-editorial .ed-briefing .voice-icon-btn,
        [data-theme="classic-dark"] .dash-editorial .ed-briefing .voice-field {
          background: color-mix(in srgb, var(--surface) 88%, #fff 8%);
          box-shadow: 0 1px 2px rgba(0,0,0,.28), 0 8px 20px rgba(0,0,0,.20);
        }
        .ed-briefing-link {
          height: 32px;
          padding: 0 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: #fff;
          color: var(--text);
          text-decoration: none;
          font-size: 11.5px;
          box-shadow: 0 1px 2px rgba(15,23,42,.08), 0 7px 18px rgba(15,23,42,.08);
        }
        [data-theme="dark"] .ed-briefing-link,
        [data-theme="classic-dark"] .ed-briefing-link {
          background: color-mix(in srgb, var(--surface) 88%, #fff 8%);
          box-shadow: 0 1px 2px rgba(0,0,0,.28), 0 8px 20px rgba(0,0,0,.20);
        }
        .ed-attention {
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
        }
        .ed-attention-row {
          min-height: 43px;
          display: grid;
          grid-template-columns: 86px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          padding: 8px 10px;
          border-radius: 8px;
          background: color-mix(in srgb, var(--surface-2) 42%, transparent);
          text-decoration: none;
          color: inherit;
          transition: background .14s ease, transform .14s ease;
        }
        .ed-attention-row:hover { background: color-mix(in srgb, var(--surface-2) 68%, transparent); transform: translateY(-1px); }
        .ed-attention-label {
          color: var(--ed-muted);
          font-size: 10.5px;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .ed-attention-value {
          min-width: 0;
          color: var(--text);
          font-size: 12.5px;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ed-attention-row.warn .ed-attention-value { color: var(--text); }
        .ed-channel-row {
          margin-top: 10px;
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }
        .ed-channel {
          height: 28px;
          padding: 0 9px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 8px;
          background: color-mix(in srgb, var(--surface-2) 48%, transparent);
          color: var(--ed-secondary);
          font-size: 11px;
          text-decoration: none;
        }
        .ed-channel-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--ed-muted);
        }
        .ed-channel.on .ed-channel-dot { background: #2f7df6; }
        .ed-segments {
          margin-top: 11px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .ed-segment {
          max-width: 100%;
          height: 25px;
          display: inline-flex;
          align-items: center;
          border-radius: 8px;
          padding: 0 9px;
          background: color-mix(in srgb, var(--surface-2) 44%, transparent);
          color: var(--ed-muted);
          font-size: 10.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
          .ed-briefing { grid-template-columns: 1fr; }
        }
        @media (max-width:760px) {
          .dash-editorial { padding: 0 14px 88px; }
          .ed-hero { padding: 20px 0 22px; }
          .ed-title { font-size: 17px; }
          .ed-pulse-label { display: none; }
          .ed-pulse { padding: 0; width: 28px; justify-content: center; }
          .ed-status-row { grid-template-columns:1fr 1fr; gap:18px; padding:14px 0 22px; }
          .ed-project-row { grid-template-columns:1fr 1fr; gap:18px; }
          .ed-focus-row { grid-template-columns: 70px 6px minmax(0,1fr); }
          .ed-focus-sub { display:none; }
          .ed-briefing { padding: 14px; gap: 14px; }
          .ed-attention-row { grid-template-columns: 1fr; gap: 2px; }
        }
      `}</style>

      <section className="ed-hero" aria-label="Tägliche Statusabfrage">
        <div className="ed-hero-top">
          <h1 className="ed-title">{greeting}</h1>
          <div className="ed-pulse-wrap">
            <div className={`ed-pulse tone-${pulse.tone}`} aria-label={loading ? 'Status wird geprüft' : pulse.label}>
              <span className="ed-pulse-dot" />
              <span className="ed-pulse-label">{loading ? 'wird geprüft…' : pulse.label}</span>
            </div>
          </div>
        </div>
        <section className="ed-briefing" aria-label="Heute von Tagro">
          <div className="ed-briefing-main">
            <p className="ed-briefing-kicker">Heute von Tagro · {agencyMode ? 'Portfolio Pulse' : 'Statusbriefing'} · {agencyMode ? '45–60 Sek.' : '30–60 Sek.'}</p>
            <h2 className="ed-briefing-title">{agencyMode ? 'Die wichtigsten Signale, ohne jedes Projekt einzeln aufzublähen.' : 'Ein kurzer Status, damit du nicht in jedes Detail springen musst.'}</h2>
            <div className="ed-briefing-copy">
              {briefingLines.map(line => <p key={line}>{line}</p>)}
            </div>
            <div className="ed-briefing-controls">
              <VoiceControls text={briefingText} compact />
              <Link className="ed-briefing-link" href="/reports">Lesen</Link>
              <Link className="ed-briefing-link" href={main ? `/project/${main.id}` : '/projects'}>Projekt öffnen</Link>
            </div>
            {projectSegments.length > 0 && (
              <div className="ed-segments" aria-label="Projektsegmente im Briefing">
                {projectSegments.map(segment => <span className="ed-segment" key={segment}>{segment}</span>)}
              </div>
            )}
          </div>
          <aside className="ed-briefing-side" aria-label="Status und Kanäle">
            <div className="ed-attention">
              {attentionItems.map(item => (
                <Link key={item.label} className={`ed-attention-row ${item.tone}`} href={item.href}>
                  <span className="ed-attention-label">{item.label}</span>
                  <span className="ed-attention-value">{item.value}</span>
                </Link>
              ))}
            </div>
            <div className="ed-channel-row" aria-label="Briefing-Kanäle">
              <Link className={`ed-channel${channels.whatsapp ? ' on' : ''}`} href="/connectors">
                <span className="ed-channel-dot" /> {channels.whatsapp ? 'WhatsApp aktiv' : 'WhatsApp verbinden'}
              </Link>
              <Link className={`ed-channel${channels.audioFeed || channels.spotify ? ' on' : ''}`} href="/voice-reports">
                <span className="ed-channel-dot" /> {channels.audioFeed || channels.spotify ? 'Audio-Feed aktiv' : 'Audio-Feed verbinden'}
              </Link>
            </div>
          </aside>
        </section>
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
