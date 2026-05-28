'use client'

/**
 * Client Dashboard — Festag „Statusabfrage".
 *
 * Designziel (verbindlich): ein ruhiger Notizblock, kein Cockpit.
 *   • Links steht der Statusblock — ein Notion-artiges Notizfeld. Es ist
 *     leer, bis der Client rechts auf „Status abrufen" tippt; dann
 *     schreibt Tagro den aktuellen Stand Wort für Wort hinein.
 *   • Rechts sitzt eine Linear-artige Box: Puls, der eine Button
 *     „Status abrufen", „Bericht anhören" — plus Entscheidungen & Risiken.
 *   • Kein „Heute im Fokus", keine KPI-Leiste, kein „Aktives Projekt".
 *   • Aeonik Medium (500) durchgehend, Header 1.5% / Texte 1.7%
 *     letter-spacing im Figma-Stil, keine
 *     Trennlinien zwischen Sektionen, keine schwarzen Buttons.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ObserverWelcomeModal from '@/components/ObserverWelcomeModal'
import WelcomeTour from '@/components/WelcomeTour'
import TagroLogo from '@/components/TagroLogo'
import { speechVoiceId, useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import {
  ArrowClockwise, CalendarCheck, CaretDown, CaretRight, Check, CheckCircle,
  Cube, DotsThree, DownloadSimple, EnvelopeSimple, Lightbulb, Pause, PencilSimple,
  Play, Plus, Pulse as PulseIcon, SlidersHorizontal, Stop,
} from '@phosphor-icons/react'

// ── Left-side contextual layer ─────────────────────────────────────────
// One calm line by time of day + one rotating "Wusstest du…" fact. Both
// resolve once per mount so they don't flicker on re-render.
function daytimeLine(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Guten Morgen. Ein ruhiger Überblick hilft dir, klar in den Tag zu starten.'
  if (hour >= 12 && hour < 18) return 'Ein kurzer Statusblick zur Mittagszeit kann Entscheidungen leichter machen.'
  if (hour >= 18 && hour < 24) return 'Am Abend lohnt sich ein klarer Überblick über offene Themen und nächste Schritte.'
  return 'Späte Stunde. Ein letzter ruhiger Blick auf den Stand — dann Feierabend.'
}

const FUN_FACTS = [
  'Die Erde dreht sich am Äquator mit etwa 1.670 km/h.',
  'Honig ist eines der wenigen Lebensmittel, das nahezu unbegrenzt haltbar ist.',
  'Ein Oktopus hat drei Herzen.',
  'Es gibt mehr Sterne im Universum als Sandkörner auf der Erde.',
  'Licht von der Sonne braucht etwa 8 Minuten bis zur Erde.',
  'Bananen sind botanisch gesehen Beeren — Erdbeeren hingegen nicht.',
  'Das menschliche Gehirn verbraucht rund 20 % der gesamten Körperenergie.',
  'Ein Tag auf der Venus ist länger als ein Jahr auf der Venus.',
  'Wombat-Kot ist würfelförmig — einzigartig im Tierreich.',
  'Es gibt mehr mögliche Schachpartien als Atome im beobachtbaren Universum.',
  'Die Eiffelturm-Höhe wächst im Sommer durch Wärmeausdehnung um bis zu 15 cm.',
  'Ein Blitz ist rund fünfmal heißer als die Oberfläche der Sonne.',
  'Tintenfische können ihre Hautfarbe in Millisekunden ändern.',
  'Wasser kann gleichzeitig kochen und gefrieren — am sogenannten Tripelpunkt.',
  'Der kürzeste Krieg der Geschichte dauerte etwa 38 Minuten.',
  'Ein Löffel eines Neutronensterns würde auf der Erde Milliarden Tonnen wiegen.',
]

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/** Day-stable greeting — same wording within a calendar day. */
function pickGreeting(hour: number, first: string, seed: number): string {
  const partOfDay = hour < 12 ? 'Morgen' : hour < 18 ? 'Tag' : 'Abend'
  const name = first ? first.charAt(0).toUpperCase() + first.slice(1) : 'Chef'
  const variants = first
    ? [`Guten ${partOfDay}, ${name}.`, `Hallo ${name}.`, `Schön, dass du da bist, ${name}.`, `${partOfDay}, ${name}.`]
    : [`Guten ${partOfDay}, Chef.`, `Hallo Chef.`, `Schön, dass du da bist.`, `${partOfDay}, Chef.`]
  return variants[Math.abs(seed) % variants.length]
}

function fallbackGreeting(first: string): string {
  const name = first ? first.charAt(0).toUpperCase() + first.slice(1) : ''
  return name ? `Hallo ${name}.` : 'Hallo Chef.'
}

type PulseTone = 'green' | 'amber' | 'red'
type Pulse = { tone: PulseTone; label: string }

function buildPulse(args: { blockers: number; decisions: number }): Pulse {
  const { blockers, decisions } = args
  if (blockers > 0) return { tone: 'red', label: blockers === 1 ? 'Ein Risiko erkannt' : `${blockers} Risiken erkannt` }
  if (decisions > 0) return { tone: 'amber', label: decisions === 1 ? 'Eine Entscheidung offen' : `${decisions} Entscheidungen offen` }
  return { tone: 'green', label: 'Heute ist nichts dringend' }
}

type Project = { id: string; title: string; status: string; created_at: string; color: string | null }
type Task    = { id: string; title: string; status: string; priority?: string; project_id: string; updated_at?: string }

type NoteReport = {
  summary: string
  currentWork: string[]
  nextSteps: string[]
  blockers: string[]
  createdAt?: string
}

type BriefingLogEntry = {
  id: string
  kind: 'report'
  title: string
  scope: string
  createdAt: string
  body: string
}

function normalizeReport(raw: any): NoteReport {
  const arr = (v: any): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [])
  return {
    summary: String(raw?.summary ?? raw?.content ?? '').trim(),
    currentWork: arr(raw?.current_work_json),
    nextSteps: arr(raw?.next_steps_json),
    blockers: arr(raw?.blockers_json),
    createdAt: raw?.created_at,
  }
}

function formatVoiceLabel(voice: SpeechSynthesisVoice) {
  const language = voice.lang.toLowerCase().startsWith('de') ? 'Deutsch' : voice.lang
  return `${voice.name.replace(/\s*\(.*?\)\s*/g, '')} · ${language}`
}

const PHASE: Record<string, string> = {
  intake: 'Intake', planning: 'Planung', active: 'In Arbeit', testing: 'Testing', done: 'Abgeschlossen',
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), [])

  const [projects, setProjects] = useState<Project[]>([])
  const [main, setMain] = useState<Project | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(true)

  // Notepad state
  const [noteReport, setNoteReport] = useState<NoteReport | null>(null)
  const [noteRevealed, setNoteRevealed] = useState('')
  const [noteWriting, setNoteWriting] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [briefingSettingsOpen, setBriefingSettingsOpen] = useState(false)
  const [taskState, setTaskState] = useState<Record<string, 'idle' | 'busy' | 'done'>>({})
  const [allTasksBusy, setAllTasksBusy] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)
  const [greetingClock, setGreetingClock] = useState<{ hour: number; seed: number } | null>(null)
  const writeToken = useRef(0)

  useEffect(() => {
    const now = new Date()
    setGreetingClock({
      hour: now.getHours(),
      seed: now.getFullYear() * 1000 + (now.getMonth() + 1) * 50 + now.getDate(),
    })
  }, [])

  // ── Load projects + tasks ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (!data.session) { window.location.href = '/login'; return }

        const uid = data.session.user.id
        const { data: p } = await supabase
          .from('profiles').select('first_name,full_name').eq('id', uid).maybeSingle()
        if (cancelled) return
        if (p) setFirstName((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')

        const { data: projs } = await supabase
          .from('projects').select('id,title,status,created_at,color')
          .order('created_at', { ascending: false })
        if (cancelled) return

        if (projs?.length) {
          setProjects(projs as Project[])
          const prio: Record<string, number> = { active: 0, testing: 1, planning: 2, intake: 3, done: 4 }
          const m = [...(projs as any[])].sort((a, b) => (prio[a.status] ?? 9) - (prio[b.status] ?? 9))[0]
          setMain(m)
          const ids = (projs as any[]).map((pr) => pr.id).filter(Boolean)
          const { data: at } = ids.length
            ? await supabase.from('tasks').select('id,title,status,priority,project_id,updated_at').in('project_id', ids)
            : { data: [] }
          if (cancelled) return
          setAllTasks((at as Task[]) ?? [])
        }
      } catch (error) {
        console.error('Dashboard failed to load', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [supabase])

  // ── Load the latest status note (no animation on first paint) ───
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/client/status-now', { method: 'GET' })
        const d = await res.json().catch(() => ({}))
        if (cancelled || !d?.report) return
        const r = normalizeReport(d.report)
        if (!r.summary) return
        setNoteReport(r)
        setNoteRevealed(r.summary)
        addBriefingLogEntry({
          id: `report-latest-${r.createdAt ?? 'initial'}`,
          kind: 'report',
          title: 'Statusbericht – Heute',
          scope: 'Gesamtbericht für alle Projekte',
          body: r.summary,
          createdAt: r.createdAt,
        })
      } catch { /* notepad simply stays empty */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Open decisions count for the current user — feeds the "Heute im Fokus"
  // block + matches the sidebar badge. Realtime so newly-requested
  // decisions show up immediately.
  const [openDecisionsCount, setOpenDecisionsCount] = useState(0)
  useEffect(() => {
    let cancelled = false
    const sb = createClient()
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user || cancelled) return
      const refresh = async () => {
        const { count } = await (sb as any).from('decisions')
          .select('id', { count: 'exact', head: true })
          .eq('requested_for', user.id)
          .in('status', ['open', 'waiting_for_client', 'in_progress'])
        if (!cancelled) setOpenDecisionsCount(count ?? 0)
      }
      refresh()
      const ch = (sb as any)
        .channel(`dashboard-decisions-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'decisions' }, refresh)
        .subscribe()
      return () => { (sb as any).removeChannel(ch) }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Derived ─────────────────────────────────────────────────────
  const greeting = useMemo(() => {
    if (!greetingClock) return fallbackGreeting(firstName)
    return pickGreeting(greetingClock.hour, firstName, greetingClock.seed)
  }, [firstName, greetingClock])

  const decisionTasks = allTasks.filter((t) => t.status === 'waiting')
  const riskTasks = allTasks.filter((t) => t.status === 'blocked')

  const activeProjectCount = projects.filter((p) => {
    const s = (p.status || '').toLowerCase()
    return s === 'active' || s === 'testing' || s === 'planning'
  }).length
  const openTaskCount = allTasks.filter((t) => t.status !== 'done').length
  const doneTaskCount = allTasks.filter((t) => t.status === 'done').length
  const overview = [
    { label: 'Projekte', value: projects.length },
    { label: 'Aktiv', value: activeProjectCount },
    { label: 'Offene Aufgaben', value: openTaskCount },
    { label: 'Erledigt', value: doneTaskCount },
  ]

  const pulse = useMemo(
    () => buildPulse({ blockers: riskTasks.length, decisions: decisionTasks.length }),
    [riskTasks.length, decisionTasks.length],
  )

  // Contextual left-side layer — resolved once per mount.
  const contextLine = useMemo(() => daytimeLine(new Date().getHours()), [])
  const funFact = useMemo(() => FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)], [])

  // ── Scope: overall report vs single-project report ──────────────
  // Drives the briefing card header label, audio text and duration
  // estimate. Defaults to 'overall' — explicit clarity per spec, the
  // user must never wonder if they're hearing one project or all.
  const [scope, setScope] = useState<'overall' | string>('overall')
  const [scopeOpen, setScopeOpen] = useState(false)
  const [period, setPeriod] = useState<'Heute' | 'Letzte 7 Tage' | 'Letzte 30 Tage' | 'Letzte 90 Tage'>('Heute')
  const [dailyDeliveryEnabled, setDailyDeliveryEnabled] = useState(false)
  const [briefingLog, setBriefingLog] = useState<BriefingLogEntry[]>([])
  const [activeLogId, setActiveLogId] = useState<string | null>(null)

  // Reset to overall if the picked project disappears.
  useEffect(() => {
    if (scope === 'overall') return
    if (!projects.find(p => p.id === scope)) setScope('overall')
  }, [projects, scope])

  const activeProjects = useMemo(() => projects.filter(p => {
    const s = (p.status || '').toLowerCase()
    return s !== 'done' && s !== 'archived'
  }), [projects])

  const selectedProject = scope === 'overall' ? null : projects.find(p => p.id === scope) ?? null
  const isOverall = scope === 'overall'
  const scopeLabel = isOverall ? 'Gesamtbericht' : selectedProject?.title ?? 'Projektbericht'

  // ── Audio text — the note when present, a calm fallback otherwise ─
  function buildProjectBriefing(p: typeof projects[number]) {
    const phase = PHASE[p.status] ?? 'Intake'
    const projTasks = allTasks.filter(t => t.project_id === p.id)
    const risks = projTasks.filter(t => t.status === 'blocked').length
    const decisions = projTasks.filter(t => t.status === 'waiting').length
    const open = projTasks.filter(t => t.status !== 'done').length
    return (
      `Statusbericht: ${p.title}. ` +
      `Aktuell in Phase ${phase}. ${open} offene Aufgabe${open === 1 ? '' : 'n'}. ` +
      `${risks > 0 ? `${risks} Risiken brauchen Aufmerksamkeit. ` : 'Keine akuten Risiken sichtbar. '}` +
      `${decisions > 0 ? `${decisions} Entscheidung${decisions === 1 ? '' : 'en'} warten auf dich.` : 'Keine offene Entscheidung wartet auf dich.'}`
    )
  }

  function buildOverallBriefing() {
    if (activeProjects.length === 0) return 'Noch kein aktives Projekt. Sobald jemand am Projekt arbeitet, fasse ich den Stand hier ruhig zusammen.'
    const lead = `Gesamtbericht. Du hast ${activeProjects.length} aktive Projekt${activeProjects.length === 1 ? '' : 'e'}. `
    const open = allTasks.filter(t => t.status !== 'done').length
    const risks = riskTasks.length
    const decisions = decisionTasks.length
    return (
      lead +
      `${open} offene Aufgaben insgesamt. ` +
      `${risks > 0 ? `${risks} Risiken brauchen Aufmerksamkeit. ` : 'Keine akuten Risiken über alle Projekte. '}` +
      `${decisions > 0 ? `${decisions} Entscheidungen warten auf dich.` : 'Keine offene Entscheidung wartet auf dich.'}`
    )
  }

  const fallbackBriefing = isOverall
    ? buildOverallBriefing()
    : selectedProject ? buildProjectBriefing(selectedProject) : buildOverallBriefing()
  const audioText = noteReport?.summary?.trim() && isOverall
    ? noteReport.summary
    : fallbackBriefing

  const activeLog = useMemo(
    () => briefingLog.find((entry) => entry.id === activeLogId) ?? briefingLog[0] ?? null,
    [activeLogId, briefingLog],
  )

  function addBriefingLogEntry(entry: Omit<BriefingLogEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
    const id = entry.id ?? `${entry.kind}-${scope}-${Date.now()}`
    const next: BriefingLogEntry = {
      id,
      kind: entry.kind,
      title: entry.title,
      scope: entry.scope,
      body: entry.body,
      createdAt: entry.createdAt ?? new Date().toISOString(),
    }
    setBriefingLog((items) => [next, ...items.filter((item) => item.id !== id)].slice(0, 24))
    setActiveLogId(id)
  }

  // German average ≈ 150 wpm → ~2.5 words per second.
  const briefingDurationLabel = useMemo(() => {
    const words = audioText.trim().split(/\s+/).filter(Boolean).length
    const seconds = Math.max(20, Math.round((words / 150) * 60))
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')} min`
  }, [audioText])

  const {
    supported: speechSupported,
    state: speechState,
    voices,
    selectedVoice,
    preferences,
    play: playBriefing,
    pause: pauseBriefing,
    stop: stopBriefing,
    updatePreferences,
  } = useSpeechSynthesis(audioText)
  const selectedVoiceId = selectedVoice ? speechVoiceId(selectedVoice) : ''
  const voiceChoices = useMemo(() => {
    const german = voices.filter((v) => v.lang.toLowerCase().startsWith('de'))
    return (german.length ? german : voices).slice(0, 12)
  }, [voices])
  const isBriefingPlaying = speechState === 'playing'
  const isBriefingActive = speechState === 'playing' || speechState === 'paused'
  const handleBriefingToggle = () => { if (isBriefingPlaying) pauseBriefing(); else playBriefing() }

  // Tagro is "active" while writing the note or reading it aloud — the
  // orb spins and the speech waveform dances during that time.
  const tagroActive = isBriefingPlaying || noteWriting || statusBusy
  const voiceLineActive = isBriefingActive || tagroActive

  const briefingStatusLabel = statusBusy
    ? 'Bericht wird vorbereitet'
    : isBriefingPlaying
      ? 'Wiedergabe läuft'
      : speechState === 'paused'
        ? 'Wiedergabe pausiert'
        : audioText.trim()
          ? 'Bereit zum Anhören'
          : 'Noch kein Bericht verfügbar'

  const currentReportTitle = isOverall
    ? 'Gesamtbericht für alle Projekte'
    : `Statusbericht: ${selectedProject?.title ?? 'Projekt'}`

  const currentReportSummary = isOverall
    ? 'Tagro fasst aktive Projekte, offene Aufgaben, Risiken und Entscheidungen in einem ruhigen Briefing zusammen.'
    : 'Tagro verdichtet Fortschritt, offene Punkte und nächste Schritte für diesen Projektkontext.'

  // Focus items ALWAYS render — even at zero. The user wants the daily
  // "0 Entscheidungen / 0 Risiken" pulse so the block reads as a calm
  // check-in: nothing dringend if both are 0. Both lines link to
  // /decisions — risks live there too, the table filters by tone.
  const combinedDecisionsCount = openDecisionsCount + decisionTasks.length
  type FocusItem = { count: number; label: string; tone: 'risk' | 'decision'; href: string }
  const executiveFocus: FocusItem[] = [
    {
      count: combinedDecisionsCount,
      label: combinedDecisionsCount === 1 ? 'Entscheidung wartet auf dich' : 'Entscheidungen warten auf dich',
      tone: 'decision',
      href: '/decisions',
    },
    {
      count: riskTasks.length,
      label: riskTasks.length === 1 ? 'Risiko braucht Aufmerksamkeit' : 'Risiken brauchen Aufmerksamkeit',
      tone: 'risk',
      href: '/decisions?tone=risk',
    },
  ]

  const periodOptions = ['Heute', 'Letzte 7 Tage', 'Letzte 30 Tage', 'Letzte 90 Tage'] as const
  const writtenReportText = noteRevealed.trim() || audioText.trim()

  function buildBriefingExportText() {
    return [
      currentReportTitle,
      `Zeitraum: ${period}`,
      `Erstellt: ${new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}`,
      '',
      currentReportSummary,
      '',
      'Heute im Fokus',
      ...executiveFocus.map((item) => `- ${item.count} ${item.label}`),
      '',
      'Statusbericht',
      writtenReportText || 'Noch kein Statusbericht vorhanden.',
    ].join('\n')
  }

  // Export as PDF — opens a clean print window. The browser's print
  // dialog offers "Als PDF speichern", so this is a dependency-free PDF
  // path that always works.
  function downloadBriefing() {
    const content = buildBriefingExportText()
    const title = currentReportTitle || 'Festag Statusbericht'
    const escaped = content
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const win = window.open('', '_blank', 'width=820,height=1000')
    if (!win) {
      // Pop-up blocked → fall back to a plain text download so the user
      // still gets the report.
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'tagro-bericht.txt'
      document.body.appendChild(link); link.click(); link.remove()
      URL.revokeObjectURL(url)
      return
    }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        @page { margin: 28mm 22mm; }
        body { font-family: 'Aeonik', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               color: #1A1F2B; line-height: 1.7; letter-spacing: .012em; font-size: 13.5px; max-width: 680px; margin: 0 auto; }
        h1 { font-size: 20px; font-weight: 500; letter-spacing: -.01em; margin: 0 0 6px; }
        .meta { color: #7B8294; font-size: 12px; margin: 0 0 24px; }
        pre { white-space: pre-wrap; font-family: inherit; font-size: 13.5px; margin: 0; }
        .brand { margin-top: 36px; padding-top: 14px; border-top: 1px solid #E7EBF0; color: #98A2B3; font-size: 11px; }
      </style></head>
      <body>
        <h1>${title}</h1>
        <p class="meta">${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })} · Festag · Tagro AI</p>
        <pre>${escaped}</pre>
        <p class="brand">Erstellt mit Festag — Delivery Intelligence Platform.</p>
      </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 350)
  }

  function sendBriefingToSelf() {
    const subject = encodeURIComponent(`Festag Bericht: ${currentReportTitle}`)
    const body = encodeURIComponent(buildBriefingExportText())
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  // ── Turn a line of Tagro's reading into a real task ─────────────
  async function createTaskFromText(key: string, text: string) {
    if (!main || (taskState[key] ?? 'idle') !== 'idle') return
    setTaskState((s) => ({ ...s, [key]: 'busy' }))
    try {
      const res = await fetch('/api/client/tasks/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: main.id, title: text.slice(0, 200) }),
      })
      const d = await res.json().catch(() => ({}))
      setTaskState((s) => ({ ...s, [key]: d?.ok ? 'done' : 'idle' }))
    } catch {
      setTaskState((s) => ({ ...s, [key]: 'idle' }))
    }
  }

  async function createAllTasks() {
    if (!main || !noteReport || allTasksBusy) return
    const steps = noteReport.nextSteps
    setAllTasksBusy(true)
    setBulkProgress(0)
    // Filed one after another — the rows check off in a calm cascade.
    for (let i = 0; i < steps.length; i++) {
      await createTaskFromText(`next-${i}`, steps[i])
      setBulkProgress(i + 1)
      if (i < steps.length - 1) await new Promise((r) => setTimeout(r, 200))
    }
    setAllTasksBusy(false)
  }

  // Renders one calm section of Tagro's structured reading.
  const renderSection = (label: string, items: string[], prefix: string, blocker = false) => {
    if (!items.length) return null
    return (
      <div className="dc-sec" key={prefix}>
        <p className="dc-sec-label">{label}</p>
        {items.slice(0, 6).map((it, i) => {
          const k = `${prefix}-${i}`
          const st = taskState[k] ?? 'idle'
          const done = st === 'done'
          return (
            <div className={`dc-sec-item${blocker ? ' blocker' : ''}${done ? ' done' : ''}`} key={k}>
              <span className="dc-sec-mark" aria-hidden>
                {done ? (
                  <svg className="dc-check" viewBox="0 0 16 16" fill="none">
                    <path d="M3.4 8.6l3 3 6.2-7.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="dot" />
                )}
              </span>
              <span className="dc-sec-text">{it}</span>
              {done ? (
                <span className="dc-task-done">Aufgabe angelegt</span>
              ) : (
                <button
                  type="button"
                  className={`dc-task-btn ${st}`}
                  onClick={() => createTaskFromText(k, it)}
                  disabled={st !== 'idle' || !main}
                  title={main ? 'Als Aufgabe anlegen' : 'Kein Projekt verknüpft'}
                >
                  {st === 'busy'
                    ? <span className="dc-task-spin" aria-hidden />
                    : <><Plus size={11} weight="bold" /> Aufgabe</>}
                </button>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const allNextDone =
    (noteReport?.nextSteps.length ?? 0) > 0 &&
    (noteReport?.nextSteps ?? []).every((_, i) => (taskState[`next-${i}`] ?? 'idle') === 'done')

  // ── Notepad writing animation ───────────────────────────────────
  async function streamNote(text: string) {
    const token = ++writeToken.current
    setNoteWriting(true)
    setNoteRevealed('')
    const words = text.split(/(\s+)/)
    let acc = ''
    for (const word of words) {
      if (writeToken.current !== token) return
      acc += word
      setNoteRevealed(acc)
      await new Promise((r) => setTimeout(r, word.trim() ? 24 : 10))
    }
    if (writeToken.current === token) setNoteWriting(false)
  }

  async function refreshStatus() {
    if (statusBusy) return
    setStatusBusy(true)
    try {
      // Honour the scope dropdown: 'overall' → no projectId, single → that project.
      const scopedBody = isOverall ? {} : { projectId: scope }
      const res = await fetch('/api/client/status-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scopedBody),
      })
      const d = await res.json().catch(() => ({}))
      if (d?.report) {
        const r = normalizeReport(d.report)
        setNoteReport(r)
        setTaskState({})
        addBriefingLogEntry({
          kind: 'report',
          title: isOverall ? 'Statusbericht – Heute' : `Statusbericht – ${scopeLabel}`,
          scope: isOverall ? 'Gesamtbericht für alle Projekte' : scopeLabel,
          body: r.summary || fallbackBriefing,
          createdAt: r.createdAt,
        })
        if (r.summary) await streamNote(r.summary)
      }
    } finally {
      setStatusBusy(false)
    }
  }

  function handleVoicePress() {
    if (statusBusy) return
    if (audioText.trim()) handleBriefingToggle()
    else void refreshStatus()
  }

  const noteStamp = noteReport?.createdAt
    ? new Date(noteReport.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="page-content dashboard-os dash-calm">
      <style>{`
        @keyframes dcFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes dcBlink { 0%,49% { opacity:1; } 50%,100% { opacity:0; } }
        @keyframes dcSpin { to { transform:rotate(360deg); } }
        @keyframes dcWave { 0%,100% { transform:scaleY(.22); } 50% { transform:scaleY(1); } }
        @keyframes dcCheckDraw { to { stroke-dashoffset:0; } }
        @keyframes dcPop { 0% { transform:scale(.55); opacity:0; } 62% { transform:scale(1.14); } 100% { transform:scale(1); opacity:1; } }
        @keyframes dcTaskFlash { 0% { background:color-mix(in srgb, var(--surface-2) 80%, transparent); } 100% { background:transparent; } }
        @keyframes dcRowIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }

        .dash-calm {
          height:100%;
          min-height:0;
          overflow:hidden;
          background:transparent;
          color:var(--text);
          padding: 0 clamp(18px, 2.2vw, 30px) 10px;
          --dc-muted: #5A6478;
          --dc-soft: #4E5567;
          --dc-slate: #5B647D;
        }
        [data-theme="dark"] .dash-calm,
        [data-theme="classic-dark"] .dash-calm {
          --dc-muted: #8D98A6;
          --dc-soft: #B7BDC8;
        }
        .dash-calm * { font-weight:500 !important; letter-spacing:.017em; }
        .dash-calm button,
        .dash-calm select {
          -webkit-tap-highlight-color:transparent;
        }
        .dash-calm button:focus,
        .dash-calm button:focus-visible,
        .dash-calm select:focus,
        .dash-calm select:focus-visible {
          outline:none;
        }

        /* ── Greeting full-width, then a calm two-column body ────── */
        /* ── New shell: greeting + audio briefing card, Linear-calm ── */
        .dc-shell {
          width:100%;
          max-width: 1320px;
          margin:0 auto;
          height:100%;
          min-height:0;
          display:flex;
          flex-direction:column;
          padding-top: 20px;
        }
        /* Status pill sits in its OWN top row, right-aligned — never
           overlapping the audio card anymore. */
        .dc-shell-top {
          display: flex;
          justify-content: flex-end;
          height: 30px;
          flex-shrink: 0;
        }
        .dc-shell-body {
          flex:1 1 auto;
          min-height:0;
          display:grid;
          grid-template-columns: minmax(0, 1fr) minmax(380px, 420px);
          column-gap: clamp(32px, 4vw, 60px);
          align-items:start;
          animation:dcFade .3s cubic-bezier(.16,1,.3,1) both;
        }
        .dc-left {
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        /* Contextual layer — daytime line + fun fact, subtle inline. */
        .dc-context { margin-top: 14px; display: flex; flex-direction: column; gap: 12px; }
        .dc-context-line {
          margin: 0;
          font-size: 13.5px; line-height: 1.6;
          color: var(--dc-soft);
          max-width: 540px;
          letter-spacing: var(--ls-body, .017em);
        }
        .dc-fact {
          margin: 0;
          display: flex; align-items: flex-start; gap: 8px;
          font-size: 12.5px; line-height: 1.55;
          color: var(--dc-muted);
          max-width: 540px;
          letter-spacing: var(--ls-body, .017em);
        }
        .dc-fact-ico {
          flex-shrink: 0; margin-top: 1px;
          color: var(--dc-muted); opacity: .8;
        }
        .dc-fact-lead { color: var(--dc-soft); }
        .dc-pulse-pill {
          display: inline-flex; align-items: center; gap: 8px;
          height: 26px; padding: 0 12px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--surface-2) 50%, transparent);
          color: var(--dc-soft);
          font-size: 12px; font-weight: 500; letter-spacing: .015em;
        }
        .dc-pulse-pill .dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: currentColor;
        }
        .dc-pulse-pill.tone-green { color: #22a06b; }
        .dc-pulse-pill.tone-amber { color: #d4882b; }
        .dc-pulse-pill.tone-red   { color: #d44b4b; }

        /* Backwards-compat wrappers for the old class names still used
           inside renderSection() and elsewhere in this page. */
        .dc-wrap { width:100%; max-width:1480px; margin:0 auto; height:100%; min-height:0; display:flex; flex-direction:column; }
        .dc-body { flex:1 1 auto; min-height:0; margin-top:12px; display:grid; grid-template-columns:minmax(0,1fr) minmax(360px,400px); column-gap:clamp(36px,4.6vw,70px); align-items:start; }
        .dc-head { flex-shrink:0; padding:32px 0 0; display:flex; align-items:flex-start; justify-content:space-between; gap:24px; }

        .dc-greeting {
          margin:0;
          color:var(--text);
          font-size: clamp(26px, 2.4vw, 33px);
          font-weight: 500;
          line-height:1.2;
          letter-spacing: var(--ls-header, .012em);
          max-width: 620px;
        }
        .dc-greeting-sub {
          margin:6px 0 0;
          max-width: 540px;
          color: var(--text);
          font-size: 14px;
          line-height: 1.55;
          font-weight: 500;
        }
        .dc-greeting-sub2 {
          margin: 10px 0 0;
          max-width: 540px;
          color: var(--dc-soft);
          font-size: 13.5px;
          line-height: 1.6;
        }
        .dc-empty-line {
          margin-top: 24px;
          display: flex; align-items: center; gap: 10px;
          color: var(--dc-muted);
          font-size: 13px;
          font-weight: 500;
        }
        .dc-empty-icon {
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--dc-muted);
          flex-shrink: 0;
        }
        .dc-note-inline { margin-top: 28px; padding: 0; background: transparent; box-shadow: none; border: 0; }
        .dc-head-actions {
          flex-shrink:0;
          display:flex;
          align-items:center;
          gap:10px;
          padding-top:2px;
        }
        .dc-head-status {
          appearance:none;
          height:40px;
          padding:0 15px;
          border:1px solid color-mix(in srgb, var(--border) 72%, transparent);
          border-radius:999px;
          background:rgba(255,255,255,.72);
          color:var(--text);
          box-shadow:
            0 12px 34px -24px color-mix(in srgb, var(--text) 32%, transparent),
            inset 0 1px 0 rgba(255,255,255,.72);
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          font:inherit;
          font-size:12.5px;
          cursor:pointer;
          transition:background .16s ease, border-color .16s ease, transform .14s ease, box-shadow .16s ease;
        }
        .dc-head-status:hover:not(:disabled) {
          background:#fff;
          border-color:color-mix(in srgb, var(--border) 92%, transparent);
          box-shadow:
            0 16px 42px -25px color-mix(in srgb, var(--text) 40%, transparent),
            inset 0 1px 0 rgba(255,255,255,.88);
        }
        .dc-head-status:active:not(:disabled) { transform:translateY(1px) scale(.99); }
        .dc-head-status:disabled { opacity:.58; cursor:default; }
        .dc-head-status .spin { animation:dcSpin 1s linear infinite; }
        [data-theme="dark"] .dc-head-status,
        [data-theme="classic-dark"] .dc-head-status {
          background:color-mix(in srgb, var(--card) 86%, #fff 5%);
          border-color:rgba(255,255,255,.07);
          box-shadow:
            0 16px 42px -24px rgba(0,0,0,.66),
            inset 0 1px 0 rgba(255,255,255,.05);
        }
        [data-theme="dark"] .dc-head-status:hover:not(:disabled),
        [data-theme="classic-dark"] .dc-head-status:hover:not(:disabled) {
          background:color-mix(in srgb, var(--card) 80%, #fff 9%);
        }
        .dc-head-pulse {
          display:inline-flex;
          align-items:center;
          gap:7px;
          height:32px;
          padding:0 11px;
          border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 46%, transparent);
          color:var(--dc-soft);
          font-size:11.5px;
          white-space:nowrap;
        }
        .dc-head-pulse span {
          width:7px;
          height:7px;
          border-radius:999px;
          background:currentColor;
          flex-shrink:0;
        }
        .dc-head-pulse.tone-green { color:#22a06b; }
        .dc-head-pulse.tone-amber { color:#d4882b; }
        .dc-head-pulse.tone-red { color:#d44b4b; }

        /* ── Notepad ──────────────────────────────────────────────── */
        /* The status note is NOT a card — it sits on the page like a
           written notebook page. Clean, calm, no frame. */
        .dc-note {
          grid-column:1; grid-row:1;
          min-width:0; min-height:0;
          max-height:100%;
          overflow:auto;
          padding-bottom:18px;
          scrollbar-width:thin;
          animation:dcFade .3s .04s cubic-bezier(.16,1,.3,1) both;
        }
        .dc-note-head {
          display:flex; align-items:baseline; justify-content:space-between;
          gap:12px; margin-bottom:16px;
        }
        .dc-note-label {
          color:var(--dc-muted);
          font-size:11.5px;
        }
        .dc-note-stamp { color:var(--dc-muted); font-size:11.5px; }
        .dc-note-text {
          margin:0;
          max-width:760px;
          color:var(--text);
          font-size:15.5px;
          line-height:1.74;
          white-space:pre-wrap;
        }
        .dc-caret {
          display:inline-block;
          width:2px; height:1.05em;
          margin-left:1.5px;
          vertical-align:-2px;
          background:var(--text);
          animation:dcBlink 1s steps(1) infinite;
        }
        .dc-note-empty {
          margin:0;
          max-width:560px;
          color:var(--dc-muted);
          font-size:14px;
          line-height:1.6;
        }
        .dc-note-empty-cue {
          margin-top:18px;
          display:inline-flex; align-items:center; gap:7px;
          color:var(--dc-muted);
          font-size:12px;
        }
        /* ── Note sections — Tagro's structured reading ───────────── */
        .dc-note-sections {
          margin-top:24px;
          display:flex; flex-direction:column; gap:22px;
          animation:dcFade .3s cubic-bezier(.16,1,.3,1) both;
        }
        .dc-sec-label { margin:0 0 6px; color:var(--dc-muted); font-size:11.5px; }
        .dc-sec-item {
          display:flex; align-items:flex-start; gap:9px;
          padding:6px 8px; margin:0 -8px;
          border-radius:8px; min-height:32px;
          color:var(--dc-soft); font-size:13.5px; line-height:1.5;
          transition:background .14s ease;
        }
        .dc-sec-item:hover { background:color-mix(in srgb, var(--surface-2) 38%, transparent); }
        .dc-sec-item.done { animation:dcTaskFlash 1.5s cubic-bezier(.16,1,.3,1); }
        .dc-sec-mark {
          width:13px; height:13px; margin-top:3px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
        }
        .dc-sec-mark .dot {
          width:5px; height:5px; border-radius:999px;
          background:var(--dc-muted);
        }
        .dc-sec-item.blocker .dc-sec-mark .dot { background:#ef4444; }
        .dc-check { width:13px; height:13px; color:var(--text); animation:dcPop .28s ease both; }
        .dc-check path {
          stroke-dasharray:17; stroke-dashoffset:17;
          animation:dcCheckDraw .42s .05s cubic-bezier(.16,1,.3,1) forwards;
        }
        .dc-sec-text { flex:1; min-width:0; transition:color .35s ease; }
        .dc-sec-item.done .dc-sec-text { color:var(--dc-muted); }
        .dc-task-done {
          flex-shrink:0; display:inline-flex; align-items:center; height:24px;
          color:var(--dc-muted); font-size:11px;
          animation:dcPop .32s .06s ease both;
        }
        .dc-task-btn {
          flex-shrink:0;
          display:inline-flex; align-items:center; justify-content:center; gap:5px;
          height:24px; min-width:82px; padding:0 9px;
          border:0; border-radius:6px;
          background:color-mix(in srgb, var(--surface-2) 60%, transparent);
          color:var(--dc-muted);
          font:inherit; font-size:11px; cursor:pointer;
          opacity:0; transform:translateX(4px);
          transition:opacity .15s ease, transform .15s ease, background .12s ease, color .12s ease;
        }
        .dc-sec-item:hover .dc-task-btn,
        .dc-task-btn.busy { opacity:1; transform:none; }
        .dc-task-btn:hover { background:color-mix(in srgb, var(--surface-2) 96%, transparent); color:var(--text); }
        .dc-task-btn:active { transform:scale(.94); }
        .dc-task-btn:disabled { cursor:default; }
        .dc-task-spin {
          width:11px; height:11px; border-radius:999px;
          border:2px solid color-mix(in srgb, var(--dc-muted) 30%, transparent);
          border-top-color:var(--dc-soft);
          animation:dcSpin .7s linear infinite;
        }
        .dc-note-actions { margin-top:20px; display:flex; gap:8px; flex-wrap:wrap; }
        .dc-note-action {
          display:inline-flex; align-items:center; gap:7px;
          height:34px; padding:0 14px;
          border:1px solid color-mix(in srgb, var(--border) 85%, transparent);
          border-radius:8px; background:transparent;
          color:var(--dc-soft); font:inherit; font-size:12px; cursor:pointer;
          transition:background .14s ease, color .14s ease, border-color .14s ease, transform .1s ease;
        }
        .dc-note-action:hover { background:color-mix(in srgb, var(--surface-2) 50%, transparent); color:var(--text); }
        .dc-note-action:active { transform:scale(.98); }
        .dc-note-action:disabled { cursor:default; }
        .dc-note-action.done {
          border-color:transparent;
          background:color-mix(in srgb, var(--surface-2) 55%, transparent);
          color:var(--dc-soft);
        }
        .dc-note-action.done svg { animation:dcPop .3s ease both; }

        /* ── Tagro voice — orb + speech waveform ──────────────────── */
        .dc-voice {
          display:flex; align-items:center; gap:13px;
          height:32px; margin-bottom:16px;
        }
        .dc-wave { display:flex; align-items:center; gap:3px; height:22px; flex:1; }
        .dc-wave-bar {
          flex:1; max-width:4px; height:100%;
          border-radius:2px;
          background:var(--dc-muted);
          opacity:.4;
          transform:scaleY(.2);
          transform-origin:center;
          transition:transform .3s ease, opacity .3s ease;
        }
        .dc-voice.playing .dc-wave-bar {
          opacity:.85;
          animation:dcWave .85s ease-in-out infinite;
        }

        /* ── Right column: action card + decisions/risks ─────────── */
        .dc-side {
          grid-column:2; grid-row:1;
          display:flex; flex-direction:column;
          gap:10px;
          height:100%;
          min-height:0;
          overflow:auto;
          padding:0 4px 20px 0;
          scrollbar-width:thin;
          animation:dcFade .3s .06s cubic-bezier(.16,1,.3,1) both;
        }

        /* Full-width "Schreib mir den Bericht" CTA — sits under .dc-brief.
           WHITE 3D Festag pill, same chrome as .task-tool: white card bg,
           two-stage shadow (1px contact + 8/22 ambient), translateY lift
           on hover. NO black buttons in light mode (Festag rule). */
        /* "Neuer Statusbericht" CTA — Festag PRIMARY action.
           Slate #5B647D solid, white text, no arrow glyph, calm 1 px
           contact shadow so it sits on the canvas without floating. */
        .dc-write-cta {
          appearance: none; border: 0;
          width: 100%;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 44px; padding: 0 18px;
          border-radius: 12px;
          background: var(--btn-prim);
          color: var(--btn-prim-text);
          font: inherit; font-size: 13px; font-weight: 500;
          letter-spacing: .017em;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(15,23,42,.10);
          transition: background .14s ease, box-shadow .14s ease;
        }
        .dc-write-cta:hover:not(:disabled) {
          background: color-mix(in srgb, var(--btn-prim) 88%, #000 12%);
          box-shadow: 0 1px 2px rgba(15,23,42,.16), 0 4px 12px rgba(15,23,42,.08);
        }
        .dc-write-cta:active:not(:disabled) {
          background: color-mix(in srgb, var(--btn-prim) 80%, #000 20%);
        }
        .dc-write-cta:disabled { opacity: .55; cursor: not-allowed; }
        .dc-write-cta.busy { background: color-mix(in srgb, var(--btn-prim) 85%, var(--surface-2) 15%); }
        .dc-write-cta .dc-write-arrow { display: none; }
        /* The right column is frameless too — no floating box, just a
           calm stack that mirrors the notebook on the left. */
        .dc-card { position:relative; }
        .dc-pulse {
          display:inline-flex; align-items:center; gap:7px;
          height:24px; padding:0 10px;
          margin-bottom:13px;
          border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 52%, transparent);
          color:var(--dc-soft);
          font-size:11.5px;
        }
        .dc-pulse-dot {
          width:7px; height:7px; border-radius:999px;
          background:currentColor; flex-shrink:0;
        }
        /* Calm = no colour. Colour only appears when something needs you. */
        .dc-pulse.tone-green .dc-pulse-dot { color:var(--dc-muted); }
        .dc-pulse.tone-amber .dc-pulse-dot { color:#f59e0b; }
        .dc-pulse.tone-red   .dc-pulse-dot { color:#ef4444; }

        .dc-primary {
          appearance:none; border:0; width:100%;
          height:42px; padding:0 16px;
          display:inline-flex; align-items:center; justify-content:center; gap:9px;
          border-radius:10px;
          background:#383C44;
          color:#fff;
          font:inherit; font-size:13px;
          cursor:pointer;
          transition:background .14s ease, opacity .14s ease;
        }
        .dc-primary:hover { background:#2c2f36; }
        .dc-primary:disabled { opacity:.5; cursor:default; }
        .dc-primary .spin { animation:dcSpin .9s linear infinite; }
        [data-theme="dark"] .dc-primary,
        [data-theme="classic-dark"] .dc-primary { background:#3f444e; }
        [data-theme="dark"] .dc-primary:hover,
        [data-theme="classic-dark"] .dc-primary:hover { background:#4a505b; }

        .dc-audio { margin-top:8px; display:flex; gap:7px; }
        .dc-audio-play {
          appearance:none; flex:1;
          height:38px; padding:0 12px;
          display:inline-flex; align-items:center; justify-content:center; gap:8px;
          border-radius:9px;
          border:1px solid color-mix(in srgb, var(--border) 85%, transparent);
          background:transparent;
          color:var(--text);
          font:inherit; font-size:12.5px;
          cursor:pointer;
          transition:background .13s ease, border-color .13s ease;
        }
        .dc-audio-play:hover {
          background:color-mix(in srgb, var(--surface-2) 50%, transparent);
          border-color:var(--border);
        }
        .dc-audio-play:disabled { opacity:.45; cursor:default; }
        .dc-audio-stop, .dc-audio-cfg {
          appearance:none;
          width:38px; height:38px;
          display:inline-flex; align-items:center; justify-content:center;
          border-radius:9px;
          border:1px solid color-mix(in srgb, var(--border) 85%, transparent);
          background:transparent;
          color:var(--dc-soft);
          cursor:pointer;
          transition:background .13s ease, color .13s ease;
        }
        .dc-audio-stop:hover, .dc-audio-cfg:hover {
          background:color-mix(in srgb, var(--surface-2) 50%, transparent);
          color:var(--text);
        }
        .dc-audio-cfg.open { background:color-mix(in srgb, var(--surface-2) 60%, transparent); color:var(--text); }

        .dc-settings {
          position:absolute; z-index:6;
          top:calc(100% + 8px); right:0;
          width:100%;
          padding:8px;
          border-radius:12px;
          background:var(--surface);
          box-shadow:0 1px 2px rgba(15,23,42,.07), 0 20px 50px rgba(15,23,42,.16);
        }
        [data-theme="dark"] .dc-settings,
        [data-theme="classic-dark"] .dc-settings {
          background:color-mix(in srgb, var(--surface) 95%, #fff 5%);
          box-shadow:0 1px 2px rgba(0,0,0,.34), 0 20px 50px rgba(0,0,0,.3);
        }
        .dc-setting-row {
          display:grid; grid-template-columns:62px minmax(0,1fr);
          gap:9px; align-items:center; padding:5px;
        }
        .dc-setting-label {
          color:var(--dc-muted); font-size:10px;
          letter-spacing:.11em; text-transform:uppercase;
        }
        .dc-setting-select {
          width:100%; height:32px;
          border:0; border-radius:8px; padding:0 9px;
          background:color-mix(in srgb, var(--surface-2) 58%, transparent);
          color:var(--text); font:inherit; font-size:11.5px;
          outline:none;
        }

        /* ── Audio Briefing Card (.dc-card) — premium, spacious ──── */
        .dc-card {
          position: relative;
          width: 100%;
          min-height: clamp(640px, 78vh, 760px);
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          border-radius: 24px;
          background: color-mix(in srgb, var(--card) 94%, transparent);
          padding: 26px 26px 22px;
          display: flex; flex-direction: column; gap: 20px;
          box-shadow: var(--content-shadow);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
        }
        [data-theme="dark"] .dc-card,
        [data-theme="classic-dark"] .dc-card {
          background: rgba(20, 28, 42, 0.82);
          border-color: rgba(255,255,255,0.08);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.04) inset,
            0 30px 80px -40px rgba(0,0,0,0.7);
        }
        .dc-card-head { display: flex; flex-direction: column; gap: 3px; }
        .dc-card-title {
          margin: 0;
          font-size: 19px; font-weight: 500;
          letter-spacing: var(--ls-header, .012em);
          color: var(--text);
        }
        .dc-card-sub {
          margin: 0;
          font-size: 13px; font-weight: 500;
          color: var(--dc-soft);
          line-height: 1.5;
          letter-spacing: var(--ls-body, .017em);
        }

        /* Period segmented control — rounded-rect segments, crisp + even. */
        .dc-period {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          padding: 4px;
          border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
          background: color-mix(in srgb, var(--surface-2) 30%, transparent);
          border-radius: 12px;
        }
        .dc-period-btn {
          height: 30px; padding: 0;
          display: inline-flex; align-items: center; justify-content: center;
          border: 0; background: transparent;
          color: var(--dc-soft);
          font: inherit; font-size: 12px; font-weight: 500; letter-spacing: var(--ls-body, .017em);
          border-radius: 8px;
          cursor: pointer;
          transition: background .18s ease, color .18s ease;
        }
        .dc-period-btn:hover { color: var(--text); }
        .dc-period-btn.on {
          background: var(--card);
          color: var(--text);
          box-shadow: 0 1px 2px rgba(15,23,42,.08);
        }
        [data-theme="dark"] .dc-period-btn.on,
        [data-theme="classic-dark"] .dc-period-btn.on {
          background: rgba(255,255,255,0.08);
          box-shadow: 0 1px 2px rgba(0,0,0,.4);
        }

        /* Orb wrapper — generous vertical room, the centerpiece. */
        .dc-orb-zone {
          flex: 1 1 auto;
          min-height: 220px;
          display: flex; align-items: center; justify-content: center;
        }

        /* Stat tiles — clean 2x2 grid, no divider lines. */
        .dc-stats {
          list-style: none; padding: 0; margin: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .dc-stat {
          display: grid;
          grid-template-columns: 22px auto 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 12px 10px;
          color: var(--text);
          text-decoration: none;
          font: inherit; font-size: 13px;
          transition: background .18s ease;
          border-radius: 10px;
        }
        .dc-stat:hover { background: color-mix(in srgb, var(--surface-2) 42%, transparent); }
        .dc-stat-ico {
          width: 22px; height: 22px;
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--dc-soft);
        }
        .dc-stat-num {
          font-size: 19px; font-weight: 500; color: var(--text);
          letter-spacing: var(--ls-header, .012em);
          font-variant-numeric: tabular-nums;
        }
        .dc-stat-label {
          color: var(--dc-soft);
          font-size: 12.5px; font-weight: 500;
          letter-spacing: var(--ls-body, .017em);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .dc-stat-arrow {
          color: var(--dc-muted);
          opacity: .35;
          transition: opacity .18s ease;
        }
        .dc-stat:hover .dc-stat-arrow { opacity: 1; }

        /* Play bar — primary action. Calm hover: only a gentle brighten. */
        .dc-play-bar {
          display: grid;
          grid-template-columns: 30px 1fr auto;
          align-items: center;
          gap: 12px;
          width: 100%;
          height: 52px; padding: 0 16px;
          border-radius: 14px;
          border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
          background: color-mix(in srgb, var(--surface-2) 35%, transparent);
          color: var(--text);
          font: inherit; font-size: 14px; font-weight: 500; letter-spacing: var(--ls-body, .017em);
          cursor: pointer;
          transition: background .18s ease, border-color .18s ease;
        }
        .dc-play-bar:hover:not(:disabled) {
          background: color-mix(in srgb, var(--surface-2) 55%, transparent);
          border-color: color-mix(in srgb, var(--border-strong) 60%, var(--border));
        }
        .dc-play-bar:disabled { opacity: .55; cursor: not-allowed; }
        .dc-play-ico {
          width: 30px; height: 30px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--card) 90%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
          color: var(--text);
        }
        .dc-play-label { text-align: left; }
        .dc-play-meta {
          color: var(--dc-muted);
          font-size: 12.5px;
          font-variant-numeric: tabular-nums;
        }
        .dc-play-bar .spin { animation: dcSpin 1s linear infinite; }

        /* Chip row */
        .dc-chip-row {
          display: flex; flex-wrap: wrap; align-items: center;
          gap: 4px;
          justify-content: space-between;
        }
        .dc-chip {
          display: inline-flex; align-items: center; gap: 6px;
          height: 30px; padding: 0 11px;
          border: 0; background: transparent;
          color: var(--dc-soft);
          font: inherit; font-size: 12px; font-weight: 500; letter-spacing: var(--ls-body, .017em);
          border-radius: 999px;
          cursor: pointer;
          transition: background .2s ease, color .2s ease, opacity .2s ease;
        }
        .dc-chip:hover { color: var(--text); background: color-mix(in srgb, var(--surface-2) 45%, transparent); }
        .dc-chip.on {
          background: color-mix(in srgb, var(--surface-2) 62%, transparent);
          color: var(--text);
        }
        .dc-chip-icon { width: 30px; padding: 0; justify-content: center; }

        /* Old brief class kept for any leftover references (audio settings popover) */
        .dc-brief {
          position:relative;
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          border-radius: 18px;
          background: #fff;
          padding: 22px 22px 18px;
          display: flex; flex-direction: column; gap: 14px;
          min-height:0;
          box-shadow: var(--content-shadow);
        }
        [data-theme="dark"] .dc-brief,
        [data-theme="classic-dark"] .dc-brief {
          background: color-mix(in srgb, var(--card) 94%, #fff 6%);
          border-color: color-mix(in srgb, var(--border) 80%, transparent);
        }
        [data-theme="light"] .dc-brief,
        [data-theme="pure-light"] .dc-brief {
          background: #fff;
          border-color: color-mix(in srgb, var(--border) 60%, transparent);
        }

        .dc-brief-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 14px;
        }
        .dc-brief-headline { min-width: 0; flex: 1; }
        .dc-brief-eyebrow {
          margin: 0; font-size: 10.5px; font-weight: 500 !important;
          letter-spacing: .14em !important; text-transform: uppercase;
          color: var(--dc-muted);
        }
        .dc-brief-title {
          margin: 4px 0 3px; font-size: 16px; line-height: 1.22;
          font-weight: 500 !important; letter-spacing: .015em !important;
          color: var(--text);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .dc-brief-sub {
          margin: 0; font-size: 11.5px; font-weight: 500 !important;
          color: var(--dc-muted); letter-spacing: .017em !important;
        }
        .dc-period {
          flex-shrink:0;
          display:inline-flex; align-items:center;
          min-height:26px; padding:0 2px;
          color:var(--dc-muted); font-size:11px;
        }

        .dc-brief-filterbar {
          display:flex; align-items:center; justify-content:space-between;
          gap:8px;
        }

        /* Scope dropdown */
        .dc-scope { position: relative; flex-shrink: 0; z-index: 18; }
        .dc-scope-trigger {
          display: inline-flex; align-items: center; gap: 7px;
          max-width: 152px;
          height: 30px; padding: 0 11px 0 12px;
          border-radius: 999px;
          border: 0;
          background: color-mix(in srgb, var(--surface-2) 42%, transparent);
          color: var(--text); font: inherit; font-size: 11.5px;
          font-weight: 500 !important; letter-spacing: .017em !important;
          cursor: pointer; transition: background .12s, border-color .12s;
        }
        .dc-scope-trigger:hover {
          background: color-mix(in srgb, var(--surface-2) 68%, transparent);
        }
        .dc-scope-trigger span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dc-scope-trigger svg { color: var(--dc-muted); flex-shrink: 0; }

        .dc-scope-backdrop {
          position: fixed; inset: 0; z-index: 16;
          background: transparent; border: 0; padding: 0; cursor: default;
        }
        .dc-scope-menu {
          position: absolute; top: calc(100% + 8px); left: 0; right: auto; z-index: 17;
          width: min(254px, calc(100vw - 40px));
          max-height: 268px;
          overflow-y: auto;
          padding: 6px;
          background: #fff;
          border: 1px solid rgba(15,23,42,.07);
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(15,23,42,.12), 0 1px 2px rgba(15,23,42,.05);
          display: flex; flex-direction: column; gap: 2px;
          animation: dcFade .14s ease both;
          scrollbar-width: thin;
        }
        [data-theme="dark"] .dc-scope-menu,
        [data-theme="classic-dark"] .dc-scope-menu {
          background: color-mix(in srgb, var(--surface) 95%, #fff 5%);
          border-color: rgba(255,255,255,.06);
          box-shadow: 0 1px 2px rgba(0,0,0,.35), 0 24px 60px rgba(0,0,0,.4);
        }
        .dc-scope-opt {
          display: grid; grid-template-columns: 8px 1fr auto;
          gap: 9px; align-items: center;
          width: 100%; padding: 8px 10px;
          border: 0; background: transparent; border-radius: 8px;
          color: var(--text); font: inherit; font-size: 12.5px;
          font-weight: 500 !important; letter-spacing: .017em !important;
          cursor: pointer; text-align: left;
          transition: background .1s;
        }
        .dc-scope-opt:hover { background: color-mix(in srgb, var(--surface-2) 55%, transparent); }
        .dc-scope-opt.on { background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
        [data-theme="light"] .dc-scope-opt:hover,
        [data-theme="pure-light"] .dc-scope-opt:hover {
          background: rgba(241,245,249,.86);
        }
        [data-theme="light"] .dc-scope-opt.on,
        [data-theme="pure-light"] .dc-scope-opt.on {
          background: rgba(238,242,247,.92);
        }
        .dc-scope-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--dc-muted);
        }
        .dc-scope-opt-main { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .dc-scope-opt-main strong {
          font-size: 12.5px; font-weight: 500 !important;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .dc-scope-opt-main small {
          font-size: 10.5px; color: var(--dc-muted);
          font-weight: 500 !important; letter-spacing: .017em !important;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .dc-scope-divider {
          height: 4px;
          margin: 2px 6px;
        }
        .dc-period-options {
          display:flex; align-items:center; justify-content:space-between; gap:2px;
          flex:1 1 auto;
          min-width:0;
          padding:3px;
          border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 34%, transparent);
        }
        .dc-period-options button {
          appearance:none; border:0; background:transparent;
          flex:1 1 0;
          min-width:0; height:24px; padding:0 7px;
          border-radius:999px; color:var(--dc-muted);
          font:inherit; font-size:10.5px; cursor:pointer;
          display:inline-flex; align-items:center; justify-content:center;
          white-space:nowrap; line-height:1;
          transition:background .14s ease, color .14s ease;
        }
        .dc-period-options button:hover,
        .dc-period-options button.on {
          background:color-mix(in srgb, var(--surface) 72%, transparent);
          color:var(--text);
        }

        .dc-current-report {
          display:flex; flex-direction:column; gap:8px;
          padding:2px 0 0;
        }
        .dc-current-kicker {
          color:var(--dc-muted);
          font-size:10.5px;
          letter-spacing:.13em !important;
          text-transform:uppercase;
        }
        .dc-current-report p {
          margin:0;
          color:var(--dc-soft);
          font-size:12.5px;
          line-height:1.48;
        }
        .dc-current-facts {
          display:grid;
          grid-template-columns:repeat(4, minmax(0,1fr));
          gap:7px;
          margin-top:0;
        }
        .dc-current-facts span {
          min-width:0;
          color:var(--dc-muted);
          font-size:10.5px;
          line-height:1.25;
        }
        .dc-current-facts strong {
          display:block;
          color:var(--text);
          font-size:14px;
          line-height:1.2;
          margin-bottom:2px;
        }

        /* ─── Tagro Voice Orb · play-button with stacked glass discs ─── */
        .dc-orb-stage {
          position: relative;
          width: 100%; aspect-ratio: 1.55 / 1; max-height: 240px; min-height: 200px;
          display: flex; align-items: center; justify-content: center;
          border: 0; background: transparent; padding: 0;
          font-family: inherit; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: transform .18s cubic-bezier(.16,1,.3,1);
        }
        .dc-orb-stage:disabled { cursor: default; opacity: .55; }
        .dc-orb-stage:not(:disabled):hover { transform: translateY(-1px); }
        .dc-orb-stage:not(:disabled):active { transform: scale(.97); }

        /* Ambient outer halo — soft white bleed behind everything */
        .dc-orb-halo {
          position: absolute; left: 50%; top: 50%;
          width: 180px; height: 180px;
          margin: -90px 0 0 -90px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 45%, rgba(255,255,255,.55), rgba(255,255,255,0) 62%),
            radial-gradient(circle at 50% 60%, color-mix(in srgb, #A8E6CF 22%, transparent), transparent 65%);
          filter: blur(2px);
          opacity: .55;
          z-index: 0;
          pointer-events: none;
          transition: opacity .35s ease;
        }
        [data-theme="dark"] .dc-orb-halo,
        [data-theme="classic-dark"] .dc-orb-halo {
          background:
            radial-gradient(circle at 50% 45%, rgba(255,255,255,.10), rgba(255,255,255,0) 62%),
            radial-gradient(circle at 50% 60%, rgba(168,230,207,.16), transparent 65%);
          opacity: .8;
        }
        .dc-orb-stage.speaking .dc-orb-halo { opacity: 1; }

        /* Three stacked glass discs — biggest at back, smallest with the
           mint→lavender gradient on top. Centred via absolute positioning
           so all three stay perfectly concentric regardless of stage size. */
        .dc-orb-disc {
          position: absolute; left: 50%; top: 50%;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 30%, rgba(255,255,255,.95), rgba(255,255,255,.55) 50%, rgba(255,255,255,.18) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.95),
            inset 0 -8px 18px -8px rgba(255,255,255,.6),
            0 14px 38px -16px rgba(60,80,110,.32);
          border: 1px solid rgba(255,255,255,.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 2;
        }
        .dc-orb-disc.disc-3 {
          width: 176px; height: 176px;
          margin: -88px 0 0 -88px;
          opacity: .55;
          background:
            radial-gradient(circle at 50% 35%, rgba(255,255,255,.7), rgba(255,255,255,.25) 60%, rgba(255,255,255,.05) 100%);
        }
        .dc-orb-disc.disc-2 {
          width: 134px; height: 134px;
          margin: -67px 0 0 -67px;
          opacity: .82;
        }
        .dc-orb-disc.disc-1 {
          width: 100px; height: 100px;
          margin: -50px 0 0 -50px;
          z-index: 3;
          overflow: hidden;
        }
        .dc-orb-gradient {
          position: absolute; inset: 0;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 28%, rgba(255,255,255,.9), transparent 32%),
            radial-gradient(circle at 50% 72%, rgba(199,182,255,.55), transparent 58%),
            radial-gradient(circle at 50% 50%, rgba(168,230,207,.65), rgba(255,255,255,.2) 75%);
          opacity: .85;
        }

        /* Dark-mode variants — quieter glass, deeper shadow */
        [data-theme="dark"] .dc-orb-disc,
        [data-theme="classic-dark"] .dc-orb-disc {
          background:
            radial-gradient(circle at 50% 30%, rgba(255,255,255,.16), rgba(255,255,255,.04) 60%, rgba(255,255,255,0) 100%);
          border-color: rgba(255,255,255,.10);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.10),
            inset 0 -8px 18px -8px rgba(255,255,255,.06),
            0 18px 50px -16px rgba(0,0,0,.6);
        }
        [data-theme="dark"] .dc-orb-gradient,
        [data-theme="classic-dark"] .dc-orb-gradient {
          background:
            radial-gradient(circle at 50% 28%, rgba(255,255,255,.18), transparent 36%),
            radial-gradient(circle at 50% 72%, rgba(166,148,232,.42), transparent 58%),
            radial-gradient(circle at 50% 50%, rgba(120,200,170,.40), rgba(255,255,255,.02) 78%);
          opacity: .92;
        }

        /* Centre core — the actual play surface */
        .dc-orb-core {
          position: relative;
          z-index: 4;
          width: 64px; height: 64px;
          border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          background:
            radial-gradient(circle at 50% 32%, rgba(255,255,255,1), rgba(255,255,255,.85) 55%, rgba(225,222,250,.95) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.95),
            inset 0 -4px 10px -3px rgba(190,180,230,.5),
            0 8px 20px -8px rgba(60,80,110,.28);
          border: 1px solid rgba(255,255,255,.85);
          color: #4A5168;
        }
        [data-theme="dark"] .dc-orb-core,
        [data-theme="classic-dark"] .dc-orb-core {
          background:
            radial-gradient(circle at 50% 32%, rgba(255,255,255,.22), rgba(255,255,255,.10) 55%, rgba(190,180,230,.22) 100%);
          border-color: rgba(255,255,255,.18);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.18),
            inset 0 -4px 10px -3px rgba(190,180,230,.20),
            0 10px 24px -8px rgba(0,0,0,.6);
          color: rgba(255,255,255,.85);
        }
        .dc-orb-play {
          display: inline-flex; align-items: center; justify-content: center;
        }
        .dc-orb-glyph { color: inherit; }

        /* Breathing — entire orb gently inflates while idle, faster when speaking */
        .dc-orb-disc.disc-1,
        .dc-orb-disc.disc-2,
        .dc-orb-disc.disc-3 {
          transform: translate(0, 0) scale(1);
          transform-origin: center center;
          animation: dcOrbBreathe 5.4s ease-in-out infinite;
        }
        .dc-orb-disc.disc-2 { animation-delay: .25s; animation-duration: 4.8s; }
        .dc-orb-disc.disc-3 { animation-delay: .5s;  animation-duration: 6.2s; }
        .dc-orb-stage.speaking .dc-orb-disc.disc-1 { animation-duration: 1.9s; }
        .dc-orb-stage.speaking .dc-orb-disc.disc-2 { animation-duration: 2.3s; }
        .dc-orb-stage.speaking .dc-orb-disc.disc-3 { animation-duration: 2.7s; }

        @keyframes dcOrbBreathe {
          0%,100% { transform: scale(1);    }
          50%     { transform: scale(1.025); }
        }
        @keyframes dcOrbSpin { to { transform: rotate(360deg); } }
        .dc-orb-stage.loading .dc-orb-disc.disc-3 { animation: dcOrbSpin 6s linear infinite; }

        /* ─── Pulsierende Welle — concentric rings bloom outward ───
           Three rings start at the inner disc size and expand to roughly
           2.3× while fading from ~50% opacity to 0. Staggered by ~1/3 of
           the cycle so the surface always shows one ring mid-flight.
           Visible at idle (subtle), strengthens while Tagro speaks. */
        .dc-orb-pulse {
          position: absolute; left: 50%; top: 50%;
          width: 100px; height: 100px;
          margin: -50px 0 0 -50px;
          border-radius: 50%;
          border: 1px solid color-mix(in srgb, var(--text) 16%, transparent);
          background: transparent;
          opacity: 0;
          transform: scale(0.85);
          z-index: 1;
          pointer-events: none;
          will-change: transform, opacity;
          animation: dcOrbPulseIdle 5.2s cubic-bezier(.22,.65,.35,1) infinite;
        }
        .dc-orb-pulse.pulse-2 { animation-delay: 1.73s; }
        .dc-orb-pulse.pulse-3 { animation-delay: 3.46s; }
        [data-theme="dark"] .dc-orb-pulse,
        [data-theme="classic-dark"] .dc-orb-pulse {
          border-color: rgba(255,255,255,.20);
        }
        .dc-orb-stage.speaking .dc-orb-pulse {
          animation: dcOrbPulse 3.2s cubic-bezier(.22,.65,.35,1) infinite;
        }
        .dc-orb-stage.speaking .dc-orb-pulse.pulse-2 { animation-delay: 1.07s; }
        .dc-orb-stage.speaking .dc-orb-pulse.pulse-3 { animation-delay: 2.14s; }

        @keyframes dcOrbPulseIdle {
          0%   { transform: scale(0.8); opacity: 0; }
          18%  { opacity: 0.3; }
          100% { transform: scale(1.85); opacity: 0; }
        }
        @keyframes dcOrbPulse {
          0%   { transform: scale(0.8); opacity: 0; }
          12%  { opacity: 0.55; }
          100% { transform: scale(2.0); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .dc-orb-stage.speaking .dc-orb-pulse { animation: none; opacity: 0; }
        }

        /* Focus outline — visible only on keyboard focus */
        .dc-orb-stage:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--btn-prim) 55%, transparent);
          outline-offset: 8px;
          border-radius: 24px;
        }
        /* Minimalist voice line — no equaliser bars */
        .dc-voice-line {
          width: 100%; height: 20px;
          stroke-width: 1.55; fill: none;
          stroke-linecap: round; stroke-linejoin: round;
          opacity: .92;
          transition: opacity .3s ease, stroke .3s ease;
          filter: drop-shadow(0 6px 12px color-mix(in srgb, var(--text) 6%, transparent));
        }
        .dc-voice-base {
          stroke: color-mix(in srgb, var(--dc-muted) 64%, transparent);
        }
        .dc-voice-live {
          stroke: color-mix(in srgb, var(--dc-slate, #5B647D) 74%, var(--text));
          opacity:.42;
          stroke-dasharray:58 182;
          stroke-dashoffset:0;
          animation:dcVoiceIdle 5.8s ease-in-out infinite;
        }
        .dc-voice-line.on {
          opacity: 1;
          animation: dcLineDrift 5s ease-in-out infinite;
        }
        .dc-voice-line.on .dc-voice-live {
          opacity:.95;
          animation:dcVoiceTrace 2.2s ease-in-out infinite;
        }
        .dc-voice-line.on .dc-voice-live.alt {
          animation-duration:2.8s;
          animation-delay:.18s;
          opacity:.58;
        }
        [data-theme="light"] .dc-voice-base,
        [data-theme="pure-light"] .dc-voice-base {
          stroke: rgba(71,85,105,.34);
        }
        [data-theme="light"] .dc-voice-live,
        [data-theme="pure-light"] .dc-voice-live {
          stroke: rgba(71,85,105,.58);
          opacity:.56;
        }
        [data-theme="light"] .dc-voice-line.on .dc-voice-live,
        [data-theme="pure-light"] .dc-voice-line.on .dc-voice-live {
          opacity:.86;
        }
        @keyframes dcVoiceIdle {
          0%,100% { stroke-dashoffset:0; opacity:.32; }
          50% { stroke-dashoffset:-46; opacity:.5; }
        }
        @keyframes dcVoiceTrace {
          0% { stroke-dashoffset:0; opacity:.45; }
          45% { opacity:.95; }
          100% { stroke-dashoffset:-220; opacity:.45; }
        }
        @keyframes dcLineDrift {
          0%,100% { transform: translateX(0); }
          50%     { transform: translateX(-3px); }
        }

        .dc-brief-meta {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
        }
        /* Pulse — chip dropped, just an inline dot + label. Reads as
           status text, not as a colored badge. */
        .dc-brief-pulse {
          display: inline-flex; align-items: center; gap: 6px;
          height: 20px; padding: 0;
          background: transparent;
          color: var(--dc-muted);
          font-size: 11.5px; font-weight: 500 !important; letter-spacing: .017em !important;
        }
        .dc-brief-pulse-dot {
          width: 6px; height: 6px; border-radius: 999px;
          background: currentColor; flex-shrink: 0;
        }
        .dc-brief-pulse.tone-green  { color: #22a06b; }
        .dc-brief-pulse.tone-amber  { color: #d4882b; }
        .dc-brief-pulse.tone-red    { color: #d44b4b; }
        .dc-brief-pulse.tone-green .dc-brief-pulse-dot { animation: dcOrbBreathe 1.8s ease-in-out infinite; }
        .dc-brief-duration {
          font-size: 11.5px; color: var(--dc-muted);
          font-weight: 500 !important; letter-spacing: .017em !important;
          font-variant-numeric: tabular-nums;
        }

        .dc-brief-body {
          margin: 0; font-size: 13px; line-height: 1.6;
          color: var(--dc-soft);
          font-weight: 500 !important; letter-spacing: .017em !important;
        }

        .dc-brief-focus {
          display:flex; flex-direction:column; gap:5px;
          margin-top:0;
        }
        .dc-brief-focus span {
          color:var(--dc-muted);
          font-size:10.5px;
          letter-spacing:.13em !important;
          text-transform:uppercase;
          margin-bottom:2px;
        }
        .dc-brief-focus p,
        .dc-brief-focus .dc-focus-line {
          margin:0;
          color:var(--text);
          font-size:12.5px;
          line-height:1.4;
          display:flex; align-items:center; gap:10px;
          text-decoration:none;
          padding:7px 10px;
          border-radius:8px;
          transition:background .12s, color .12s;
        }
        .dc-brief-focus .dc-focus-count {
          min-width:22px; text-align:right;
          font-size:14px; font-weight:500; letter-spacing:.017em;
          color:var(--text); font-variant-numeric:tabular-nums;
          flex-shrink:0;
        }
        .dc-brief-focus .dc-focus-text { flex:1 1 auto; min-width:0; color:var(--dc-soft); }
        a.dc-focus-line { cursor:pointer; }
        a.dc-focus-line:hover {
          background:color-mix(in srgb, var(--surface-2) 55%, transparent);
        }
        a.dc-focus-line:hover .dc-focus-text { color:var(--text); }
        /* Zero state: number greys out, link still works. */
        .dc-focus-line.zero .dc-focus-count { color:var(--dc-muted); }
        .dc-focus-line.zero .dc-focus-text { color:var(--dc-muted); }
        /* Tone accent — risk count goes red, decision count stays text. */
        .dc-focus-line.tone-risk:not(.zero) .dc-focus-count { color:#d44b4b; }

        .dc-brief-actions { position:relative; display: flex; flex-direction: column; gap: 8px; }
        /* Inline duration meta inside the play button label, separated
           by a soft middle-dot in the muted tone. Keeps the duration
           visible without a redundant status row above. */
        .dc-btn-meta {
          margin-left: 8px;
          padding-left: 9px;
          border-left: 1px solid color-mix(in srgb, var(--text) 14%, transparent);
          color: var(--dc-muted);
          font-size: 12px; font-weight: 500;
          font-variant-numeric: tabular-nums;
        }

        /* Play button — white 3D Festag pill. Two-stage shadow
           (1 px contact + 6/18 ambient), translateY(-1px) on hover.
           Secondary action next to the Slate primary CTA. */
        .dc-brief-primary {
          appearance: none; border: 0;
          width: 100%; height: 40px; padding: 0 16px;
          display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          border-radius: 10px;
          background: #fff;
          color: var(--text);
          font: inherit; font-size: 13px;
          font-weight: 500 !important; letter-spacing: .017em !important;
          cursor: pointer;
          box-shadow:
            0 1px 2px rgba(15,23,42,.08),
            0 6px 18px rgba(15,23,42,.07);
          transition: transform .14s ease, box-shadow .14s ease, background .14s ease;
        }
        .dc-brief-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 1px 2px rgba(15,23,42,.1),
            0 10px 24px rgba(15,23,42,.10);
        }
        .dc-brief-primary:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(15,23,42,.12), 0 4px 12px rgba(15,23,42,.10);
        }
        [data-theme="dark"] .dc-brief-primary,
        [data-theme="classic-dark"] .dc-brief-primary {
          background: color-mix(in srgb, var(--surface) 92%, #fff 8%);
          box-shadow:
            0 1px 2px rgba(0,0,0,.32),
            0 6px 18px rgba(0,0,0,.22);
        }
        [data-theme="dark"] .dc-brief-primary:hover:not(:disabled),
        [data-theme="classic-dark"] .dc-brief-primary:hover:not(:disabled) {
          box-shadow:
            0 1px 2px rgba(0,0,0,.36),
            0 12px 28px rgba(0,0,0,.32);
        }
        .dc-brief-primary:focus,
        .dc-brief-primary:focus-visible {
          outline:none;
          box-shadow:inset 0 1px 0 color-mix(in srgb, #fff 18%, transparent);
        }
        .dc-brief-primary:active:not(:disabled) { transform: scale(.985); }
        .dc-brief-primary:disabled { opacity: .45; cursor: default; }
        .dc-brief-primary .spin { animation: dcSpin 1s linear infinite; }

        .dc-brief-secondary-row {
          display: flex; align-items: center; justify-content:space-between; gap: 8px;
          flex-wrap:wrap;
        }
        .dc-brief-action-group {
          display:flex; align-items:center; gap:6px;
          flex-wrap:wrap; min-width:0;
        }
        .dc-brief-secondary {
          flex: 1;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          height: 34px; padding: 0 12px;
          border-radius: 10px;
          background: transparent;
          color: var(--dc-soft);
          font: inherit; font-size: 12px;
          font-weight: 500 !important; letter-spacing: .017em !important;
          cursor: pointer;
          transition: background .12s, color .12s;
        }
        .dc-brief-secondary:hover {
          background: color-mix(in srgb, var(--surface-2) 45%, transparent);
          color: var(--text);
        }
        .dc-brief-chip {
          height:34px;
          display:inline-flex; align-items:center; justify-content:center; gap:6px;
          padding:0 10px;
          border:0;
          border-radius:10px;
          background:transparent;
          color:var(--dc-soft);
          font:inherit;
          font-size:11.5px;
          cursor:pointer;
          transition:background .12s ease, color .12s ease;
        }
        .dc-brief-chip:hover,
        .dc-brief-chip.on {
          background:color-mix(in srgb, var(--surface-2) 48%, transparent);
          color:var(--text);
        }
        .dc-brief-chip:focus,
        .dc-brief-chip:focus-visible,
        .dc-brief-icon:focus,
        .dc-brief-icon:focus-visible,
        .dc-scope-trigger:focus,
        .dc-scope-trigger:focus-visible,
        .dc-period-options button:focus,
        .dc-period-options button:focus-visible {
          outline:none;
          box-shadow:none;
        }
        .dc-brief-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: transparent;
          color: var(--dc-soft);
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background .12s, color .12s;
        }
        .dc-brief-icon:hover:not(:disabled) {
          background: color-mix(in srgb, var(--surface-2) 50%, transparent);
          color: var(--text);
        }
        .dc-brief-icon.on {
          background: color-mix(in srgb, var(--surface-2) 70%, transparent);
          color: var(--text);
        }
        .dc-brief-icon:disabled { opacity: .45; cursor: default; }
        .dc-brief-icon .spin { animation: dcSpin 1s linear infinite; }

        .dc-brief-settings {
          position:absolute;
          right:0;
          bottom:42px;
          z-index:8;
          width:min(278px, 100%);
          padding:8px;
          border-radius:14px;
          background:color-mix(in srgb, var(--surface) 90%, var(--surface-2) 10%);
          box-shadow:0 18px 44px -28px color-mix(in srgb, var(--text) 42%, transparent), inset 0 1px 0 color-mix(in srgb, #fff 12%, transparent);
          animation:dcFade .14s ease both;
        }
        .dc-brief-settings .dc-setting-row {
          grid-template-columns:58px minmax(0,1fr);
          padding:4px;
        }

        .dc-history {
          margin-top:2px;
          display:flex;
          flex-direction:column;
          gap:8px;
        }
        .dc-history-head {
          display:flex;
          align-items:baseline;
          justify-content:space-between;
          gap:10px;
          color:var(--dc-muted);
          font-size:11px;
        }
        .dc-history-head small { font-size:10.5px; color:var(--dc-muted); }
        .dc-history-list {
          display:flex;
          flex-direction:column;
          gap:2px;
          max-height:132px;
          overflow:auto;
          scrollbar-width:thin;
        }
        .dc-history-row {
          appearance:none;
          border:0;
          width:100%;
          text-align:left;
          background:transparent;
          color:inherit;
          border-radius:12px;
          padding:8px 9px;
          cursor:pointer;
          transition:background .14s ease;
        }
        .dc-history-row:hover,
        .dc-history-row.active {
          background:color-mix(in srgb, var(--surface-2) 38%, transparent);
        }
        .dc-history-row span {
          display:block;
          color:var(--dc-muted);
          font-size:10px;
          letter-spacing:.12em !important;
          text-transform:uppercase;
          margin-bottom:2px;
        }
        .dc-history-row strong {
          display:block;
          color:var(--text);
          font-size:12.5px;
          line-height:1.32;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .dc-history-row small {
          display:block;
          color:var(--dc-muted);
          font-size:10.5px;
          line-height:1.35;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .dc-history-empty {
          margin:0;
          color:var(--dc-muted);
          font-size:12px;
          line-height:1.5;
          padding:6px 2px 2px;
        }

        @media (max-width: 920px) {
          .dc-brief { padding: 18px 16px 18px; }
          .dc-brief-head { flex-direction: column; align-items: stretch; }
          .dc-brief-filterbar { flex-direction:column; align-items:stretch; }
          .dc-period-options { justify-content:space-between; }
          .dc-scope-trigger { max-width: none; width: 100%; justify-content: space-between; }
          .dc-scope-menu { left: 0; right: 0; width:auto; min-width: 0; }
          .dc-orb-stage { aspect-ratio: 2 / 1; max-height: 148px; }
        }

        /* (legacy .dc-overview stats removed — the audio card owns stats now) */

        /* ── Blocks: decisions + risks ────────────────────────────── */
        .dc-blocks { margin-top:22px; }
        .dc-block { padding:14px 4px 4px; }
        .dc-block-head {
          display:flex; align-items:baseline; justify-content:space-between;
          gap:10px; margin-bottom:8px;
        }
        .dc-block-label {
          color:var(--dc-muted); font-size:11.5px;
        }
        .dc-block-count { color:var(--dc-muted); font-size:11.5px; }
        .dc-block-empty {
          margin:0; padding:2px 6px 6px;
          color:var(--dc-muted); font-size:12.5px; line-height:1.5;
        }
        .dc-block-list { display:flex; flex-direction:column; }
        .dc-block-row {
          display:grid;
          grid-template-columns:6px minmax(0,1fr) 14px;
          gap:9px; align-items:center;
          padding:8px 6px;
          border-radius:9px;
          text-decoration:none; color:inherit;
          transition:background .12s ease;
        }
        .dc-block-row:hover { background:color-mix(in srgb, var(--surface-2) 58%, transparent); }
        .dc-block-row:hover .dc-block-go { opacity:1; transform:none; }
        .dc-row-dot { width:6px; height:6px; border-radius:999px; flex-shrink:0; }
        .dc-row-dot.warn { background:#f59e0b; }
        .dc-row-dot.risk { background:#ef4444; }
        .dc-row-main { min-width:0; }
        .dc-row-title {
          color:var(--text); font-size:13px; line-height:1.35;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .dc-row-sub {
          color:var(--dc-muted); font-size:11px; line-height:1.3;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .dc-block-go { color:var(--dc-muted); opacity:0; transform:translateX(-2px); transition:opacity .12s ease, transform .12s ease; }
        .dc-block-more {
          display:inline-flex; align-items:center; gap:5px;
          margin:5px 6px 0;
          color:var(--dc-muted); font-size:11.5px;
          text-decoration:none;
        }
        .dc-block-more:hover { color:var(--text); }

        .dc-foot {
          display:flex; flex-wrap:wrap; gap:6px;
          margin:16px 4px 0;
        }
        .dc-foot-link {
          display:inline-flex; align-items:center; gap:6px;
          height:30px; padding:0 11px;
          border-radius:8px;
          background:color-mix(in srgb, var(--surface-2) 48%, transparent);
          color:var(--dc-soft);
          font-size:11.5px; text-decoration:none;
          transition:background .12s ease, color .12s ease;
        }
        .dc-foot-link:hover { background:color-mix(in srgb, var(--surface-2) 80%, transparent); color:var(--text); }

        /* ── Responsive ───────────────────────────────────────────── */
        @media (max-width:920px) {
          .dc-body { display:flex; flex-direction:column; margin-top:16px; }
          .dc-side { display:contents; }
          .dc-brief { order:1; }
          .dc-note { order:2; min-height:auto; margin-top:24px; }
          .dc-blocks { order:3; margin-top:22px; }
        }
        /* New shell: stack the audio card under the greeting on narrow
           widths so the card never gets crushed below its min width. */
        @media (max-width:980px) {
          .dc-shell-body {
            display:flex; flex-direction:column; gap:28px;
          }
          .dc-left { padding-top:24px; }
          .dc-card {
            order:-1;
            width:100%; max-width:520px; margin:0 auto;
            min-height:auto;
          }
          .dc-shell-top { position:static; align-self:flex-end; margin-bottom:4px; }
        }
        @media (max-width:760px) {
          .dash-calm { padding:0 14px 88px; }
          .dc-head { padding-top:20px; flex-direction:column; gap:14px; }
          .dc-head-actions { width:100%; justify-content:space-between; }
          .dc-head-status { flex:1; }
          .dc-card { padding:22px 18px 18px; border-radius:20px; }
        }
        @media (max-width:600px) {
          .dash-calm { padding:0 16px 92px; }
          .dc-greeting { font-size:24px; }
          .dc-greeting-sub { font-size:13.5px; }
          .dc-note-text { font-size:15px; line-height:1.7; }
          .dc-brief { padding:18px 16px; }
          .dc-card { max-width:100%; }
        }
      `}</style>

      <div className="dc-shell">

        {/* Top-right status pill — calm signal, no action. */}
        <div className="dc-shell-top">
          <span className={`dc-pulse-pill tone-${pulse.tone}`}>
            <span className="dot" />
            {pulse.label}
          </span>
        </div>

        <div className="dc-shell-body">
          {/* ── LEFT: daytime header + fact + report ── */}
          <main className="dc-left">
            <h1 className="dc-greeting">{contextLine}</h1>
            <p className="dc-fact">
              <span className="dc-fact-ico" aria-hidden><Lightbulb size={13} weight="regular" /></span>
              <span><span className="dc-fact-lead">Wusstest du?</span> {funFact}</span>
            </p>

            {noteRevealed ? (
              <article className="dc-note dc-note-inline" aria-label="Statusbericht" data-tour="status-note">
                {noteStamp && (
                  <div className="dc-note-head">
                    <span className="dc-note-stamp">Heute, {noteStamp} Uhr</span>
                  </div>
                )}
                <p className="dc-note-text">
                  {noteRevealed}
                  {noteWriting && <span className="dc-caret" aria-hidden />}
                </p>

                {!noteWriting && noteReport &&
                  (noteReport.currentWork.length + noteReport.blockers.length + noteReport.nextSteps.length) > 0 && (
                  <>
                    <div className="dc-note-sections">
                      {renderSection('Aktuell in Arbeit', noteReport.currentWork, 'work')}
                      {renderSection('Blocker', noteReport.blockers, 'blocker', true)}
                      {renderSection('Nächste Schritte', noteReport.nextSteps, 'next')}
                    </div>
                    {noteReport.nextSteps.length > 0 && main && (
                      <div className="dc-note-actions">
                        <button
                          type="button"
                          className={`dc-note-action${allNextDone ? ' done' : ''}`}
                          onClick={createAllTasks}
                          disabled={allTasksBusy || allNextDone}
                        >
                          {allTasksBusy ? (
                            <>
                              <span className="dc-task-spin" aria-hidden />
                              Tagro legt an… {bulkProgress}/{noteReport.nextSteps.length}
                            </>
                          ) : allNextDone ? (
                            <>
                              <Check size={13} weight="bold" />
                              Alle als Aufgaben angelegt
                            </>
                          ) : (
                            <>
                              <Plus size={12} weight="bold" />
                              Nächste Schritte als Aufgaben anlegen
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            ) : (
              <div className="dc-empty-line">
                <span className="dc-empty-icon" aria-hidden><PencilSimple size={14} /></span>
                <span>Tagro prüft deine Projekte und bereitet den aktuellen Status vor.</span>
              </div>
            )}
          </main>

          {/* ── RIGHT: Audio Briefing card ── */}
          <aside className="dc-card" aria-label="Tagro Audio Briefing" data-tour="voice-briefing">
            <header className="dc-card-head">
              <h2 className="dc-card-title">Audio Briefing</h2>
              <p className="dc-card-sub">Dein täglicher Überblick.</p>
            </header>

            <nav className="dc-period" aria-label="Zeitraum">
              {([
                { v: 'Heute',          l: 'Heute' },
                { v: 'Letzte 7 Tage',  l: '7 Tage' },
                { v: 'Letzte 30 Tage', l: '30 Tage' },
                { v: 'Letzte 90 Tage', l: '90 Tage' },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  className={`dc-period-btn${period === opt.v ? ' on' : ''}`}
                  onClick={() => setPeriod(opt.v)}
                >
                  {opt.l}
                </button>
              ))}
            </nav>

            <div className="dc-orb-zone">
              <button
                type="button"
                className={`dc-orb-stage${tagroActive ? ' speaking' : ''}${statusBusy ? ' loading' : ''}${isBriefingPlaying ? ' playing' : ''}`}
                onClick={handleVoicePress}
                disabled={statusBusy || (!speechSupported && audioText.trim().length > 0)}
                aria-label={
                  statusBusy
                    ? 'Statusbericht wird vorbereitet'
                    : isBriefingPlaying
                      ? 'Briefing pausieren'
                      : speechState === 'paused'
                        ? 'Briefing weiterhören'
                        : 'Briefing anhören'
                }
                aria-pressed={isBriefingPlaying}
              >
                {/* Pulsierende Welle — concentric rings always animate gently,
                    strengthen while Tagro speaks. Soft, never distracting. */}
                <span className="dc-orb-pulse pulse-1" aria-hidden />
                <span className="dc-orb-pulse pulse-2" aria-hidden />
                <span className="dc-orb-pulse pulse-3" aria-hidden />

                <span className="dc-orb-halo" aria-hidden />

                <span className="dc-orb-disc disc-3" aria-hidden />
                <span className="dc-orb-disc disc-2" aria-hidden />
                <span className="dc-orb-disc disc-1" aria-hidden>
                  <span className="dc-orb-gradient" aria-hidden />
                </span>

                <span className="dc-orb-core" aria-hidden>
                  <span className="dc-orb-play">
                    <TagroLogo size={30} thinking={tagroActive} />
                  </span>
                </span>
              </button>
            </div>

            <ul className="dc-stats" aria-label="Übersicht">
              <li>
                <a className="dc-stat" href="/tasks">
                  <span className="dc-stat-ico"><PulseIcon size={14} /></span>
                  <strong className="dc-stat-num">{openTaskCount}</strong>
                  <span className="dc-stat-label">Offene Aufgaben</span>
                  <CaretRight size={12} className="dc-stat-arrow" />
                </a>
              </li>
              <li>
                <a className="dc-stat" href="/projects">
                  <span className="dc-stat-ico"><Cube size={14} weight="duotone" /></span>
                  <strong className="dc-stat-num">{activeProjectCount}</strong>
                  <span className="dc-stat-label">Aktiv</span>
                  <CaretRight size={12} className="dc-stat-arrow" />
                </a>
              </li>
              <li>
                <a className="dc-stat" href="/tasks?filter=done">
                  <span className="dc-stat-ico"><CheckCircle size={14} weight="duotone" /></span>
                  <strong className="dc-stat-num">{doneTaskCount}</strong>
                  <span className="dc-stat-label">Erledigt</span>
                  <CaretRight size={12} className="dc-stat-arrow" />
                </a>
              </li>
              <li>
                <a className="dc-stat" href="/projects">
                  <span className="dc-stat-ico"><Cube size={14} /></span>
                  <strong className="dc-stat-num">{projects.length}</strong>
                  <span className="dc-stat-label">Projekte</span>
                  <CaretRight size={12} className="dc-stat-arrow" />
                </a>
              </li>
            </ul>

            <button
              type="button"
              className="dc-play-bar"
              onClick={audioText.trim() ? handleBriefingToggle : refreshStatus}
              disabled={statusBusy || (!speechSupported && audioText.trim().length > 0)}
            >
              <span className="dc-play-ico">
                {statusBusy ? (
                  <ArrowClockwise size={14} className="spin" />
                ) : isBriefingPlaying ? (
                  <Pause size={14} weight="fill" />
                ) : (
                  <Play size={14} weight="fill" />
                )}
              </span>
              <span className="dc-play-label">
                {statusBusy
                  ? 'Tagro generiert…'
                  : isBriefingPlaying
                    ? 'Pausieren'
                    : speechState === 'paused'
                      ? 'Weiterhören'
                      : 'Bericht anhören'}
              </span>
              <span className="dc-play-meta">{briefingDurationLabel}</span>
            </button>

            <div className="dc-chip-row">
              <button type="button" className="dc-chip" onClick={refreshStatus} disabled={statusBusy}>
                <ArrowClockwise size={12} className={statusBusy ? 'spin' : ''} />
                Aktualisieren
              </button>
              <button type="button" className="dc-chip" onClick={downloadBriefing}>
                <DownloadSimple size={12} />
                PDF
              </button>
              <button type="button" className="dc-chip" onClick={sendBriefingToSelf}>
                <EnvelopeSimple size={12} />
                An mich
              </button>
              <button
                type="button"
                className={`dc-chip${dailyDeliveryEnabled ? ' on' : ''}`}
                onClick={() => setDailyDeliveryEnabled((enabled) => !enabled)}
              >
                <CalendarCheck size={12} />
                Täglich
              </button>
              <button
                type="button"
                className={`dc-chip dc-chip-icon${briefingSettingsOpen ? ' on' : ''}`}
                onClick={() => setBriefingSettingsOpen((o) => !o)}
                title="Stimme & Tempo"
                aria-label="Stimme & Tempo"
                aria-expanded={briefingSettingsOpen}
              >
                <DotsThree size={14} weight="bold" />
              </button>
            </div>

            {briefingSettingsOpen && (
              <div className="dc-brief-settings" role="dialog" aria-label="Audioeinstellungen">
                <label className="dc-setting-row">
                  <span className="dc-setting-label">Tempo</span>
                  <select
                    className="dc-setting-select"
                    value={preferences.rate}
                    onChange={(e) => updatePreferences({ rate: Number(e.target.value) })}
                  >
                    <option value={0.85}>0.85x</option>
                    <option value={0.95}>0.95x</option>
                    <option value={1}>1.00x</option>
                    <option value={1.1}>1.10x</option>
                    <option value={1.15}>1.15x</option>
                  </select>
                </label>
                <label className="dc-setting-row">
                  <span className="dc-setting-label">Stimme</span>
                  <select
                    className="dc-setting-select"
                    value={selectedVoiceId}
                    onChange={(e) => updatePreferences({ voiceId: e.target.value || undefined, voiceName: undefined })}
                  >
                    {voiceChoices.length === 0 && <option value="">Systemstimme</option>}
                    {voiceChoices.map((voice) => (
                      <option key={speechVoiceId(voice)} value={speechVoiceId(voice)}>
                        {formatVoiceLabel(voice)}
                      </option>
                    ))}
                  </select>
                </label>
                {isBriefingActive && (
                  <button type="button" className="dc-chip" onClick={stopBriefing}>
                    <Stop size={12} weight="fill" /> Stopp
                  </button>
                )}
              </div>
            )}
          </aside>
        </div>

      </div>

      <ObserverWelcomeModal />
      <WelcomeTour />
    </div>
  )
}
