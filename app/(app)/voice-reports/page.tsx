'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import VoiceControls from '@/components/VoiceControls'
import {
  ArrowRight,
  Clock,
  DownloadSimple,
  EnvelopeSimple,
  Headphones,
  MagicWand,
  Microphone,
  ReadCvLogo,
  Sparkle,
  Waveform,
} from '@phosphor-icons/react'
import {
  buildVoiceBriefingData,
  VoiceBriefingService,
  type VoiceBriefingMode,
  type VoiceBriefingProject,
  type VoiceBriefingReport,
  type VoiceBriefingTask,
} from '@/lib/voice/voice-briefing-service'

type DeliveryCadence = 'off' | 'daily' | 'weekly' | 'biweekly'
type DeliveryFormat = 'email' | 'audio' | 'both'

function dateLabel(value?: string | null) {
  if (!value) return 'Noch nicht generiert'
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function estimateDuration(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(25, Math.round((words / 145) * 60))
}

function durationLabel(seconds: number) {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  if (min <= 0) return `${sec} Sekunden`
  return `${min}:${String(sec).padStart(2, '0')} Min.`
}

export default function VoiceReportsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<VoiceBriefingProject[]>([])
  const [reports, setReports] = useState<VoiceBriefingReport[]>([])
  const [tasks, setTasks] = useState<VoiceBriefingTask[]>([])
  const [devUpdates, setDevUpdates] = useState<string[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [mode, setMode] = useState<VoiceBriefingMode>('full')
  const [cadence, setCadence] = useState<DeliveryCadence>('off')
  const [format, setFormat] = useState<DeliveryFormat>('email')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = '/login'
        return
      }

      const [{ data: projectRows }, { data: reportRows }, { data: taskRows }, { data: devRows }, { data: subRows }] = await Promise.all([
        (supabase as any).from('projects').select('id,title,status,description,color').order('created_at', { ascending: false }),
        (supabase as any).from('ai_updates').select('id,project_id,content,created_at').eq('type', 'status_report').order('created_at', { ascending: false }).limit(100),
        (supabase as any).from('tasks').select('id,project_id,title,status,priority,updated_at').order('updated_at', { ascending: false }),
        (supabase as any).from('ai_updates').select('project_id,content,created_at').eq('type', 'dev_progress_update').order('created_at', { ascending: false }).limit(40),
        (supabase as any).from('briefing_subscriptions').select('cadence,format').eq('user_id', sessionData.session.user.id).maybeSingle(),
      ])
      if (cancelled) return
      const list = (projectRows as VoiceBriefingProject[]) ?? []
      setProjects(list)
      setReports(((reportRows as any[]) ?? []).map((row) => ({ id: row.id, content: row.content, created_at: row.created_at, project_id: row.project_id })) as any)
      setTasks(((taskRows as any[]) ?? []).map((row) => ({ id: row.id, title: row.title, status: row.status, priority: row.priority, updated_at: row.updated_at, project_id: row.project_id })) as any)
      setDevUpdates(((devRows as any[]) ?? []).map((row) => row.content))
      setSelectedProjectId(list[0]?.id ?? '')
      if (subRows) {
        setCadence((subRows as any).cadence ?? 'off')
        setFormat((subRows as any).format ?? 'email')
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null
  const projectReports = useMemo(() => {
    if (!selectedProject) return []
    return (reports as any[]).filter((report) => report.project_id === selectedProject.id)
  }, [reports, selectedProject])
  const projectTasks = useMemo(() => {
    if (!selectedProject) return []
    return (tasks as any[]).filter((task) => task.project_id === selectedProject.id)
  }, [tasks, selectedProject])

  const briefingData = useMemo(() => buildVoiceBriefingData({
    project: selectedProject,
    latestReport: projectReports[0] ?? null,
    tasks: projectTasks,
    devUpdates,
  }), [selectedProject, projectReports, projectTasks, devUpdates])

  const service = useMemo(() => new VoiceBriefingService(), [])
  const voiceText = useMemo(() => service.generateVoiceBriefingText(briefingData, mode), [briefingData, mode, service])
  const hasVoiceReport = Boolean(selectedProject && projectReports[0] && voiceText)
  const duration = estimateDuration(voiceText)

  async function saveDelivery(nextCadence: DeliveryCadence, nextFormat: DeliveryFormat) {
    setCadence(nextCadence)
    setFormat(nextFormat)
    setSaved(false)
    try {
      await fetch('/api/briefings/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject?.id ?? null, cadence: nextCadence, format: nextFormat }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1600)
    } catch {}
  }

  function downloadTranscript() {
    if (!voiceText) return
    const blob = new Blob([voiceText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tagro-voice-report-${selectedProject?.title ?? 'projekt'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div style={{ padding: 52, color: 'var(--text-muted)' }}>Voice Reports werden geladen…</div>

  return (
    <main className="voice-reports-page">
      <style>{`
        .voice-reports-page { width:100%; height:100%; min-height:0; color:var(--text); display:flex; flex-direction:column; overflow:hidden; }
        .vr-sticky { position:sticky; top:0; z-index:8; flex:0 0 auto; padding:30px 36px 20px; background:linear-gradient(180deg, var(--surface) 82%, color-mix(in srgb, var(--surface) 0%, transparent)); border-bottom:1px solid color-mix(in srgb, var(--border) 48%, transparent); }
        .vr-head { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; }
        .vr-kicker { margin:0 0 8px; color:var(--text-muted); font-size:11px; font-weight:680; letter-spacing:.11em; text-transform:uppercase; }
        .vr-title { margin:0; font-size:clamp(32px, 4vw, 48px); letter-spacing:-.065em; line-height:.96; font-weight:760; }
        .vr-sub { margin:13px 0 0; max-width:690px; color:var(--text-secondary); font-size:15px; line-height:1.52; font-weight:400; }
        .vr-actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
        .vr-btn { height:36px; border-radius:999px; border:1px solid color-mix(in srgb, var(--border) 72%, transparent); background:transparent; color:var(--text); padding:0 14px; font:inherit; font-size:12.5px; font-weight:650; display:inline-flex; align-items:center; gap:8px; text-decoration:none; }
        .vr-btn.primary { background:var(--text); color:var(--bg); border-color:var(--text); }
        .vr-scroll { flex:1 1 auto; min-height:0; overflow:auto; padding:28px 36px 104px; scrollbar-gutter:stable; }
        .vr-hero { position:relative; overflow:hidden; display:grid; grid-template-columns:minmax(0,1.1fr) minmax(260px,.72fr); gap:28px; padding:28px; border:1px solid color-mix(in srgb, var(--border) 68%, transparent); border-radius:24px; background:radial-gradient(circle at 22% 0%, color-mix(in srgb, var(--accent) 11%, transparent), transparent 38%), color-mix(in srgb, var(--surface) 82%, transparent); box-shadow:0 34px 90px -52px rgba(0,0,0,.38); }
        .vr-hero::before { content:''; position:absolute; inset:auto 40px -80px 40px; height:160px; border-radius:999px; background:color-mix(in srgb, var(--accent) 9%, transparent); filter:blur(42px); pointer-events:none; }
        .vr-panel { position:relative; z-index:1; min-width:0; }
        .vr-card-kicker { display:inline-flex; align-items:center; gap:8px; color:var(--text-muted); font-size:11px; letter-spacing:.1em; text-transform:uppercase; font-weight:720; }
        .vr-card-title { margin:18px 0 10px; font-size:clamp(24px, 3vw, 38px); line-height:1.04; letter-spacing:-.055em; font-weight:760; }
        .vr-card-sub { margin:0; max-width:690px; color:var(--text-secondary); font-size:14.5px; line-height:1.58; font-weight:400; }
        .vr-meta { margin:18px 0 0; display:flex; flex-wrap:wrap; gap:8px; color:var(--text-muted); font-size:12px; font-weight:540; }
        .vr-meta span { height:28px; display:inline-flex; align-items:center; gap:6px; padding:0 10px; border:1px solid color-mix(in srgb, var(--border) 64%, transparent); border-radius:999px; background:color-mix(in srgb, var(--surface) 46%, transparent); }
        .vr-player { margin-top:24px; padding-top:18px; border-top:1px solid color-mix(in srgb, var(--border) 46%, transparent); }
        .vr-mode-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
        .vr-chip { height:32px; padding:0 12px; border-radius:999px; border:1px solid color-mix(in srgb, var(--border) 70%, transparent); background:transparent; color:var(--text-secondary); font:inherit; font-size:12px; font-weight:640; }
        .vr-chip.on { background:var(--text); color:var(--bg); border-color:var(--text); }
        .vr-empty { padding:18px; border:1px solid color-mix(in srgb, var(--border) 64%, transparent); border-radius:18px; color:var(--text-secondary); background:color-mix(in srgb, var(--surface-2) 44%, transparent); font-size:13.5px; line-height:1.55; }
        .vr-avatar { min-height:310px; display:flex; flex-direction:column; align-items:center; justify-content:center; border:1px solid color-mix(in srgb, var(--border) 62%, transparent); border-radius:22px; background:linear-gradient(180deg, color-mix(in srgb, var(--surface-2) 62%, transparent), color-mix(in srgb, var(--surface) 22%, transparent)); }
        .vr-orb { width:132px; height:132px; border-radius:42px; display:grid; place-items:center; background:linear-gradient(140deg, #717b99, #3c4459); color:white; box-shadow:inset 0 1px rgba(255,255,255,.16), 0 28px 70px -36px #707b99; }
        .vr-avatar strong { margin-top:18px; font-size:16px; letter-spacing:-.02em; }
        .vr-avatar span { margin-top:6px; color:var(--text-muted); font-size:12px; font-weight:500; }
        .vr-grid { margin-top:18px; display:grid; grid-template-columns:minmax(0,1fr) minmax(320px,.55fr); gap:18px; }
        .vr-box { border:1px solid color-mix(in srgb, var(--border) 66%, transparent); border-radius:20px; background:color-mix(in srgb, var(--surface) 76%, transparent); padding:20px; }
        .vr-box h2 { margin:0 0 8px; font-size:17px; letter-spacing:-.025em; }
        .vr-box p { margin:0; color:var(--text-secondary); font-size:13px; line-height:1.58; font-weight:400; }
        .vr-delivery { display:grid; gap:14px; }
        .vr-delivery-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .vr-label { min-width:92px; color:var(--text-muted); font-size:12px; font-weight:650; }
        .vr-transcript { white-space:pre-wrap; color:var(--text-secondary); font-size:14px; line-height:1.72; font-weight:400; }
        .vr-billing { display:grid; gap:10px; margin-top:12px; }
        .vr-billing-row { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:10px 0; border-top:1px solid color-mix(in srgb, var(--border) 45%, transparent); color:var(--text-secondary); font-size:13px; }
        .vr-billing-row strong { color:var(--text); font-weight:620; }
        @media(max-width:920px){ .vr-sticky,.vr-scroll{padding-left:20px;padding-right:20px}.vr-head{flex-direction:column}.vr-actions{justify-content:flex-start}.vr-hero,.vr-grid{grid-template-columns:1fr}.vr-avatar{min-height:220px}.vr-title{font-size:34px} }
      `}</style>

      <section className="vr-sticky">
        <div className="vr-head">
          <div>
            <p className="vr-kicker">Tagro Kontrollsystem</p>
            <h1 className="vr-title">Voice Reports</h1>
            <p className="vr-sub">Höre, was in deinen Projekten passiert — als ruhiges Executive Briefing von Tagro. Text bleibt die Quelle, Voice ist die hochwertige Kurzfassung für unterwegs.</p>
          </div>
          <div className="vr-actions">
            <Link className="vr-btn" href="/reports"><ReadCvLogo size={15} /> Projektbriefings lesen</Link>
            <button className="vr-btn primary" type="button" disabled={!hasVoiceReport}><MagicWand size={15} /> Report aktualisieren</button>
          </div>
        </div>
      </section>

      <div className="vr-scroll">
        <section className="vr-hero" aria-label="Tagro Voice Report">
          <div className="vr-panel">
            <span className="vr-card-kicker"><Sparkle size={14} /> Tagro Voice Report</span>
            <h2 className="vr-card-title">Höre den aktuellen Projektstand als ruhiges Executive Update.</h2>
            <p className="vr-card-sub">Tagro verdichtet Projekt, Tasks, Blocker und Entscheidungen zu einem klaren Voice Report. Keine erfundenen Updates: Wenn kein Projektbriefing existiert, bleibt der Report leer.</p>
            <div className="vr-meta">
              <span><Clock size={13} /> {hasVoiceReport ? `Heute generiert · ${durationLabel(duration)}` : 'Noch kein Voice Report verfügbar'}</span>
              <span>{selectedProject?.title ?? 'Kein Projekt'}</span>
              <span>KI-generierte Stimme</span>
            </div>

            <div className="vr-player">
              <div className="vr-mode-row">
                <button className={`vr-chip${mode === 'full' ? ' on' : ''}`} type="button" onClick={() => setMode('full')}>Report abspielen</button>
                <button className={`vr-chip${mode === 'short' ? ' on' : ''}`} type="button" onClick={() => setMode('short')}>60 Sekunden</button>
                <button className={`vr-chip${mode === 'decision_only' ? ' on' : ''}`} type="button" onClick={() => setMode('decision_only')}>Entscheidungen</button>
                <button className="vr-chip" type="button" disabled><Microphone size={13} /> Mit Tagro sprechen · bald</button>
              </div>
              {hasVoiceReport ? (
                <VoiceControls text={voiceText} />
              ) : (
                <div className="vr-empty">Noch kein Voice Report verfügbar. Erstelle zuerst ein Projekt oder aktualisiere dein Projektbriefing. Tagro spielt keinen Fake-Status ab.</div>
              )}
            </div>
          </div>

          <aside className="vr-avatar" aria-label="Tagro Voice Persona">
            <div className="vr-orb"><Headphones size={48} weight="light" /></div>
            <strong>Tagro hört mit.</strong>
            <span>ruhig, knapp, entscheidungsorientiert</span>
          </aside>
        </section>

        <section className="vr-grid">
          <article className="vr-box">
            <h2>Transkript</h2>
            <p style={{ marginBottom: 14 }}>Jeder Voice Report bleibt lesbar. In der App kannst du jederzeit zwischen Anhören, Lesen und Download wechseln.</p>
            <div className="vr-mode-row">
              <button className="vr-chip" type="button" onClick={downloadTranscript} disabled={!voiceText}><DownloadSimple size={13} /> Transkript laden</button>
              <Link className="vr-chip" href="/reports" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:7 }}>Zum Projektbriefing <ArrowRight size={12} /></Link>
            </div>
            <div className="vr-transcript">{voiceText || 'Noch kein Projektstatus verfügbar. Aktualisiere zuerst dein Briefing.'}</div>
          </article>

          <aside className="vr-box">
            <h2>Morning Report</h2>
            <p>Jeden Morgen automatisch als Voice Report erhalten. Voice Reports und automatische Zustellung sind Teil von Business, Growth Care oder Agency OS.</p>
            <div className="vr-delivery" style={{ marginTop: 16 }}>
              <div className="vr-delivery-row">
                <span className="vr-label">Rhythmus</span>
                {([
                  ['off', 'Aus'], ['daily', 'Täglich'], ['weekly', 'Wöchentlich'], ['biweekly', '2-wöchentlich'],
                ] as const).map(([id, label]) => (
                  <button key={id} className={`vr-chip${cadence === id ? ' on' : ''}`} type="button" onClick={() => saveDelivery(id, format)}>{label}</button>
                ))}
              </div>
              <div className="vr-delivery-row">
                <span className="vr-label">Format</span>
                {([
                  ['email', 'E-Mail'], ['audio', 'Voice'], ['both', 'Beides'],
                ] as const).map(([id, label]) => (
                  <button key={id} className={`vr-chip${format === id ? ' on' : ''}`} type="button" onClick={() => saveDelivery(cadence, id)} disabled={cadence === 'off'}>{label}</button>
                ))}
                {saved && <span style={{ color:'#15803D', fontSize:12, fontWeight:650 }}>Gespeichert</span>}
              </div>
            </div>

            <div className="vr-billing">
              <div className="vr-billing-row"><strong>Projektbriefings</strong><span>Im Projekt enthalten</span></div>
              <div className="vr-billing-row"><strong>Voice Reports</strong><span>Growth Care / Business</span></div>
              <div className="vr-billing-row"><strong>Automatische Zustellung</strong><span>{cadence === 'off' ? 'Nicht aktiv' : 'Aktiv vorbereitet'}</span></div>
              <div className="vr-billing-row"><strong>Weekly Executive Summary</strong><span>Nicht aktiv</span></div>
            </div>
            <p style={{ marginTop: 12, fontSize: 12 }}>API-basierte Audiofunktionen werden separat kalkuliert. Ein ChatGPT-Abo deckt die Festag-App-API nicht automatisch ab.</p>
          </aside>
        </section>
      </div>
    </main>
  )
}
