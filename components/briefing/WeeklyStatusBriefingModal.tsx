'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  DotsThree,
  DownloadSimple,
  Export,
  FastForward,
  LinkSimple,
  Pause,
  PencilSimple,
  Play,
  Plus,
  Rewind,
  ShareNetwork,
  Sparkle,
  Users,
  X,
} from '@phosphor-icons/react'
import Modal from '@/components/Modal'
import StatusWorkflowModal from '@/components/workflows/StatusWorkflowModal'
import { WEEKLY_BRIEFING_CSS } from '@/components/briefing/weekly-briefing-styles'
import {
  briefingScopeLabel,
  briefingTimeLabel,
  deriveDecisions,
  deriveExecutiveMetrics,
  deriveInsights,
  deriveTimeline,
  type BriefingScope,
  type BriefingTimeRange,
} from '@/components/briefing/briefing-center-utils'
import { openTagro } from '@/components/TagroOverlay'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import {
  briefingDurationLabel,
  normalizeClientReport,
  splitBriefingSentences,
  type ClientStatusReport,
} from '@/lib/client/status-briefing'
import { OPEN_WEEKLY_BRIEFING_EVENT } from '@/lib/weekly-briefing'
import { getVoicePreferences, setVoicePreferences } from '@/lib/voice'

const STORAGE_KEY = 'festag-weekly-briefing-dismissed'

const DEFAULT_SUMMARY =
  'Diese Woche wurden 43 Aufgaben abgeschlossen. 2 Releases veröffentlicht. 1 kritischer Blocker erkannt. Geschätzte Projektgesundheit: 91 Prozent. 4 Projekte entwickeln sich normal. 1 Projekt braucht Aufmerksamkeit wegen verzögerter Rückmeldung. 2 strategische Entscheidungen warten auf dich.'

const TIME_RANGES: BriefingTimeRange[] = ['hour', 'today', '24h', '7d', '30d', 'custom']
const SCOPE_OPTIONS: { id: BriefingScope; sample?: string }[] = [
  { id: 'company', sample: 'Alle Projekte' },
  { id: 'project', sample: 'Mobile App Redesign' },
  { id: 'team', sample: 'Festag Core Platform' },
  { id: 'developer' },
  { id: 'workspace' },
  { id: 'client' },
  { id: 'feature' },
  { id: 'release' },
]

const MOBILE_TABS = [
  { id: 'summary', label: 'Zusammenfassung' },
  { id: 'transcript', label: 'Transkript' },
  { id: 'insights', label: 'Insights' },
  { id: 'timeline', label: 'Timeline' },
] as const

type MobileTab = (typeof MOBILE_TABS)[number]['id']

type Props = {
  summary?: string
  onListenComplete?: () => void
}

function pickGermanVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  const prefs = getVoicePreferences()
  if (prefs.voiceId) {
    const exact = voices.find(v => `${v.name}__${v.lang}` === prefs.voiceId)
    if (exact) return exact
  }
  return [...voices]
    .filter(v => v.lang.toLowerCase().startsWith('de'))
    .sort((a, b) => Number(b.localService) - Number(a.localService))[0] ?? null
}

export default function WeeklyStatusBriefingModal({ summary, onListenComplete }: Props) {
  const isMobile = useFestagMobile()
  const [open, setOpen] = useState(false)
  const [report, setReport] = useState<ClientStatusReport | null>(null)
  const [liveSummary, setLiveSummary] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [active, setActive] = useState(-1)
  const [timeRange, setTimeRange] = useState<BriefingTimeRange>('7d')
  const [scope, setScope] = useState<BriefingScope>('company')
  const [scopeOpen, setScopeOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [workflowOpen, setWorkflowOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('summary')
  const [speechRate, setSpeechRate] = useState(() => getVoicePreferences().rate)
  const [voiceOpen, setVoiceOpen] = useState(false)

  const scopeRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const shareRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const flowRef = useRef<HTMLDivElement>(null)
  const cancelledRef = useRef(false)
  const busyRef = useRef(false)

  const briefingText = (summary?.trim() || liveSummary?.trim() || report?.summary?.trim() || DEFAULT_SUMMARY).trim()
  const sentences = useMemo(() => splitBriefingSentences(briefingText), [briefingText])
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const displayActive = (playing || paused) && active >= 0 ? active : -1
  const durationLabel = briefingDurationLabel(briefingText)
  const metrics = useMemo(() => deriveExecutiveMetrics(report, briefingText), [report, briefingText])
  const insights = useMemo(() => deriveInsights(report, briefingText), [report, briefingText])
  const decisions = useMemo(() => deriveDecisions(report, briefingText), [report, briefingText])
  const timeline = useMemo(() => deriveTimeline(report, timeRange), [report, timeRange])
  const scopeLabel = scope === 'company'
    ? 'Alle Projekte'
    : SCOPE_OPTIONS.find(s => s.id === scope)?.sample ?? briefingScopeLabel(scope)

  const voices = useMemo(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
    return window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('de'))
  }, [open, voiceOpen])

  const stopSpeech = useCallback(() => {
    cancelledRef.current = true
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    setPlaying(false)
    setPaused(false)
    setActive(-1)
  }, [])

  const dismiss = useCallback(() => {
    try { sessionStorage.setItem(STORAGE_KEY, '1') } catch { /* noop */ }
    setOpen(false)
    stopSpeech()
    setEditOpen(false)
  }, [stopSpeech])

  const refreshReport = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    stopSpeech()
    try {
      const scopeParam = scope === 'company' ? 'overall' : 'project'
      const res = await fetch(`/api/client/status-now?scope=${scopeParam}`, { credentials: 'include' })
      const data = await res.json().catch(() => null)
      const text = String(data?.report?.summary ?? data?.report?.content ?? '').trim()
      if (data?.report) setReport(normalizeClientReport(data.report))
      if (text) setLiveSummary(text)
    } catch { /* fallback summary */ }
    finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [scope, stopSpeech])

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY)
      if (!dismissed) setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [])

  useEffect(() => {
    if (!open || summary?.trim()) return
    void refreshReport()
  }, [open, summary, scope, timeRange, refreshReport])

  useEffect(() => () => stopSpeech(), [stopSpeech])

  useEffect(() => {
    function onOpen() {
      stopSpeech()
      setOpen(true)
      setMobileTab('summary')
    }
    window.addEventListener(OPEN_WEEKLY_BRIEFING_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_WEEKLY_BRIEFING_EVENT, onOpen)
  }, [stopSpeech])

  useEffect(() => {
    if (!open || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const load = () => { window.speechSynthesis.getVoices() }
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (scopeRef.current && !scopeRef.current.contains(t)) setScopeOpen(false)
      if (actionsRef.current && !actionsRef.current.contains(t)) setActionsOpen(false)
      if (shareRef.current && !shareRef.current.contains(t)) setShareOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    const body = transcriptRef.current
    const flow = flowRef.current
    if (!body || !flow) return
    const line = flow.querySelector<HTMLElement>(`[data-i="${displayActive}"]`)
    if (!line) return
    const target = line.offsetTop + line.offsetHeight / 2 - body.clientHeight / 2
    body.scrollTo({ top: Math.max(0, target), behavior: playing ? 'smooth' : 'auto' })
  }, [displayActive, playing])

  const speakFrom = useCallback((startIdx: number) => {
    if (!supported || sentences.length === 0) return
    cancelledRef.current = false
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    const voice = pickGermanVoice()

    const queue = (i: number) => {
      if (cancelledRef.current || i >= sentences.length) {
        if (!cancelledRef.current) {
          setPlaying(false)
          setPaused(false)
          setActive(-1)
          onListenComplete?.()
        }
        return
      }
      const u = new SpeechSynthesisUtterance(sentences[i])
      u.lang = 'de-DE'
      u.rate = speechRate
      u.pitch = getVoicePreferences().pitch ?? 1
      if (voice) u.voice = voice
      u.onstart = () => setActive(i)
      u.onend = () => queue(i + 1)
      u.onerror = () => { setPlaying(false); setPaused(false) }
      window.speechSynthesis.speak(u)
    }
    setPlaying(true)
    setPaused(false)
    setActive(startIdx)
    queue(startIdx)
  }, [onListenComplete, sentences, speechRate, supported])

  const togglePlay = useCallback(() => {
    if (!supported || sentences.length === 0) return
    if (playing && !paused) {
      window.speechSynthesis.pause()
      setPaused(true)
      return
    }
    if (paused) {
      window.speechSynthesis.resume()
      setPaused(false)
      return
    }
    speakFrom(0)
  }, [paused, playing, sentences.length, speakFrom, supported])

  const skipSentence = useCallback((delta: number) => {
    if (!supported || sentences.length === 0) return
    const next = Math.max(0, Math.min(sentences.length - 1, (active >= 0 ? active : 0) + delta))
    stopSpeech()
    speakFrom(next)
  }, [active, sentences.length, speakFrom, stopSpeech, supported])

  const cycleRate = useCallback(() => {
    const rates = [0.85, 0.95, 1.05, 1.2]
    const idx = rates.indexOf(speechRate)
    const next = rates[(idx + 1) % rates.length]
    setSpeechRate(next)
    setVoicePreferences({ rate: next })
  }, [speechRate])

  const selectVoice = useCallback((v: SpeechSynthesisVoice) => {
    setVoicePreferences({ voiceId: `${v.name}__${v.lang}`, voiceName: v.name })
    setVoiceOpen(false)
  }, [])

  if (!open) return null

  const speaking = playing || paused

  return (
    <>
      <Modal
        open
        onClose={dismiss}
        size="full"
        bare
        noPadding
        surfaceClassName="festag-modal-surface--briefing-center"
        dragHandle={isMobile}
        noBackdropClose={speaking}
        title="Executive Briefing"
      >
        <style>{WEEKLY_BRIEFING_CSS}</style>
        <div className={`tbc-shell${editOpen ? ' tbc-shell--edit' : ''}`}>
          <header className="tbc-head">
            <div className="tbc-head-main">
              <div className="tbc-head-copy">
                <p className="tbc-kicker">TAGRO</p>
                <h2 className="tbc-title">Executive Briefing</h2>
                <div className="tbc-time-row">
                  <span className="tbc-time-label">Analysezeitraum</span>
                  <div className="tbc-pills" role="tablist" aria-label="Analysezeitraum">
                    {TIME_RANGES.map(range => (
                      <button
                        key={range}
                        type="button"
                        role="tab"
                        aria-selected={timeRange === range}
                        className={`tbc-pill${timeRange === range ? ' on' : ''}`}
                        onClick={() => setTimeRange(range)}
                      >
                        {briefingTimeLabel(range)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="tbc-head-actions">
                <button type="button" className="tbc-action" onClick={() => { void refreshReport() }} disabled={busy}>
                  <Plus size={14} weight="bold" />
                  Neues Briefing
                </button>
                <button type="button" className="tbc-action" onClick={() => setWorkflowOpen(true)}>
                  <Sparkle size={14} weight="bold" />
                  Workflow erstellen
                </button>
                <div className="tbc-menu-wrap" ref={shareRef}>
                  <button
                    type="button"
                    className="tbc-action"
                    onClick={() => { setShareOpen(v => !v); setActionsOpen(false) }}
                  >
                    <ShareNetwork size={14} weight="bold" />
                    Teilen
                  </button>
                  {shareOpen && (
                    <div className="tbc-menu">
                      <button type="button" onClick={() => setShareOpen(false)}>Gesamtes Team</button>
                      <button type="button" onClick={() => setShareOpen(false)}>Projektleiter</button>
                      <button type="button" onClick={() => setShareOpen(false)}>Kunden</button>
                      <button type="button" onClick={() => setShareOpen(false)}>Per Link</button>
                      <button type="button" onClick={() => setShareOpen(false)}>Per E-Mail</button>
                    </div>
                  )}
                </div>
                <div className="tbc-menu-wrap" ref={actionsRef}>
                  <button
                    type="button"
                    className="tbc-action tbc-action--icon"
                    aria-label="Aktionen"
                    onClick={() => { setActionsOpen(v => !v); setShareOpen(false) }}
                  >
                    <DotsThree size={18} weight="bold" />
                  </button>
                  {actionsOpen && (
                    <div className="tbc-menu">
                      <button type="button" onClick={() => { setEditOpen(true); setActionsOpen(false) }}>
                        Tagro bearbeiten
                      </button>
                      <button type="button" onClick={() => { void refreshReport(); setActionsOpen(false) }}>
                        Briefing aktualisieren
                      </button>
                      <button type="button" onClick={() => setActionsOpen(false)}>Als PDF exportieren</button>
                      <button type="button" onClick={() => setActionsOpen(false)}>Als Audio exportieren</button>
                    </div>
                  )}
                </div>
                <button type="button" className="tbc-close" onClick={dismiss} aria-label="Schließen">
                  <X size={14} weight="bold" />
                </button>
              </div>
            </div>

            <div className="tbc-filter-row">
              <div className="tbc-scope-wrap" ref={scopeRef}>
                <button
                  type="button"
                  className="tbc-scope"
                  onClick={() => setScopeOpen(v => !v)}
                  aria-expanded={scopeOpen}
                >
                  {scopeLabel}
                  <CaretDown size={12} weight="bold" />
                </button>
                {scopeOpen && (
                  <div className="tbc-scope-menu">
                    {SCOPE_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        className={scope === opt.id ? 'on' : ''}
                        onClick={() => { setScope(opt.id); setScopeOpen(false) }}
                      >
                        {opt.sample ?? briefingScopeLabel(opt.id)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" className="tbc-edit-link" onClick={() => setEditOpen(true)}>
                <PencilSimple size={14} />
                Tagro bearbeiten
              </button>
            </div>
          </header>

          {isMobile && (
            <div className="tbc-mobile-tabs" role="tablist">
              {MOBILE_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={mobileTab === tab.id}
                  className={mobileTab === tab.id ? 'on' : ''}
                  onClick={() => setMobileTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="tbc-body">
            <div className="tbc-main">
              {(!isMobile || mobileTab === 'summary') && (
                <section className="tbc-block tbc-hero" aria-label="Executive Summary">
                  <div className="tbc-hero-grid">
                    <div className="tbc-stat">
                      <span className="tbc-stat-num">{metrics.tasksCompleted}</span>
                      <span className="tbc-stat-label">Aufgaben abgeschlossen</span>
                    </div>
                    <div className="tbc-stat">
                      <span className="tbc-stat-num">{metrics.releases}</span>
                      <span className="tbc-stat-label">Releases veröffentlicht</span>
                    </div>
                    <div className="tbc-stat">
                      <span className="tbc-stat-num">{metrics.blockers}</span>
                      <span className="tbc-stat-label">Kritische Blocker</span>
                    </div>
                    <div className="tbc-stat tbc-stat--health">
                      <span className="tbc-stat-num">{metrics.health}%</span>
                      <span className="tbc-stat-label">Projektgesundheit</span>
                    </div>
                  </div>
                  <p className="tbc-hero-copy">{briefingText}</p>
                </section>
              )}

              {(!isMobile || mobileTab === 'transcript') && (
                <section className="tbc-block tbc-player-block" aria-label="Audio Briefing">
                  <div className="tbc-player">
                    <div className="tbc-player-controls">
                      <button type="button" className="tbc-ctrl" onClick={() => skipSentence(-1)} disabled={!supported} aria-label="Zurück">
                        <Rewind size={18} weight="fill" />
                      </button>
                      <button
                        type="button"
                        className="tbc-ctrl tbc-ctrl--play"
                        onClick={togglePlay}
                        disabled={!supported || sentences.length === 0}
                        aria-label={playing && !paused ? 'Pausieren' : 'Abspielen'}
                      >
                        {playing && !paused ? <Pause size={22} weight="fill" /> : <Play size={22} weight="fill" />}
                      </button>
                      <button type="button" className="tbc-ctrl" onClick={() => skipSentence(1)} disabled={!supported} aria-label="Vor">
                        <FastForward size={18} weight="fill" />
                      </button>
                    </div>
                    <div className="tbc-player-meta">
                      <span>{durationLabel}</span>
                      <button type="button" className="tbc-rate" onClick={cycleRate}>
                        {speechRate.toFixed(2).replace('.', ',')}×
                      </button>
                      <div className="tbc-voice-wrap">
                        <button type="button" className="tbc-rate" onClick={() => setVoiceOpen(v => !v)}>
                          Stimme
                        </button>
                        {voiceOpen && voices.length > 0 && (
                          <div className="tbc-voice-menu">
                            {voices.map(v => (
                              <button key={`${v.name}-${v.lang}`} type="button" onClick={() => selectVoice(v)}>
                                {v.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" className="tbc-rate" aria-label="Audio herunterladen">
                        <DownloadSimple size={14} />
                      </button>
                      <button type="button" className="tbc-rate" onClick={() => setShareOpen(true)} aria-label="Audio teilen">
                        <LinkSimple size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="tbc-transcript-mask">
                    <div className="tbc-transcript" ref={transcriptRef}>
                      <div className="tbc-flow" ref={flowRef}>
                        {sentences.map((s, i) => (
                          <p
                            key={i}
                            data-i={i}
                            className={`tbc-line${
                              i === displayActive ? ' on'
                              : i === displayActive - 1 || i === displayActive + 1 ? ' near'
                              : i < displayActive ? ' past' : ' future'
                            }`}
                          >
                            {s}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {(!isMobile || mobileTab === 'insights') && (
                <>
                  <section className="tbc-block" aria-label="Tagro Insights">
                    <h3 className="tbc-block-title">Tagro Insights</h3>
                    <div className="tbc-insights">
                      {insights.map(item => (
                        <article key={item.id} className={`tbc-insight tbc-insight--${item.tone}`}>
                          <p className="tbc-insight-title">{item.title}</p>
                          <p className="tbc-insight-detail">{item.detail}</p>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="tbc-block" aria-label="Entscheidungs-Center">
                    <h3 className="tbc-block-title">Entscheidungs-Center</h3>
                    <div className="tbc-decisions">
                      {decisions.map(d => (
                        <button
                          key={d.id}
                          type="button"
                          className="tbc-decision"
                          onClick={() => openTagro({ contextType: 'briefing', id: d.id, title: d.label })}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>

            {(!isMobile || mobileTab === 'timeline') && (
              <aside className="tbc-timeline" aria-label="Zeitleiste">
                <h3 className="tbc-block-title">Zeitleiste</h3>
                <ol className="tbc-timeline-list">
                  {timeline.map(ev => (
                    <li key={ev.id}>
                      <span className="tbc-timeline-time">{ev.time}</span>
                      <span className="tbc-timeline-label">{ev.label}</span>
                    </li>
                  ))}
                </ol>
              </aside>
            )}
          </div>

          {isMobile && (
            <footer className="tbc-mobile-bar">
              <div className="tbc-mobile-active-line" aria-live="polite">
                {displayActive >= 0 ? sentences[displayActive] : sentences[0] ?? 'Briefing bereit'}
              </div>
              <div className="tbc-mobile-controls">
                <button type="button" className="tbc-ctrl" onClick={() => skipSentence(-1)} disabled={!supported}>
                  <CaretLeft size={16} weight="bold" />
                </button>
                <button type="button" className="tbc-ctrl tbc-ctrl--play" onClick={togglePlay} disabled={!supported}>
                  {playing && !paused ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
                </button>
                <button type="button" className="tbc-ctrl" onClick={() => skipSentence(1)} disabled={!supported}>
                  <CaretRight size={16} weight="bold" />
                </button>
                <button type="button" className="tbc-ctrl" onClick={cycleRate}>{speechRate.toFixed(2).replace('.', ',')}×</button>
              </div>
            </footer>
          )}

          {editOpen && (
            <aside className="tbc-edit" aria-label="Briefing bearbeiten">
              <header className="tbc-edit-head">
                <h3>Tagro bearbeiten</h3>
                <button type="button" onClick={() => setEditOpen(false)} aria-label="Schließen">
                  <X size={14} weight="bold" />
                </button>
              </header>
              <div className="tbc-edit-body">
                <button type="button" onClick={() => openTagro({ contextType: 'briefing', title: 'Executive Briefing' })}>
                  Briefing bearbeiten
                </button>
                <button type="button" onClick={() => openTagro({ contextType: 'status_report', title: 'Zusammenfassung anpassen' })}>
                  Zusammenfassung anpassen
                </button>
                <button type="button" onClick={() => openTagro({ contextType: 'briefing', prefill: 'Zusätzliche Anweisungen: ' })}>
                  Zusätzliche Anweisungen
                </button>
                <button type="button" onClick={() => openTagro({ contextType: 'decision', title: 'Neue Entscheidung' })}>
                  Neue Entscheidungen
                </button>
                <button type="button"><Users size={14} /> An Team senden</button>
                <button type="button"><Export size={14} /> An Entwickler senden</button>
                <button type="button"><ShareNetwork size={14} /> An Kunde senden</button>
                <button type="button"><DownloadSimple size={14} /> Als PDF exportieren</button>
                <button type="button"><DownloadSimple size={14} /> Als Audio exportieren</button>
                <button type="button" onClick={() => { setWorkflowOpen(true); setEditOpen(false) }}>
                  <Sparkle size={14} /> Workflow daraus erstellen
                </button>
              </div>
            </aside>
          )}
        </div>
      </Modal>

      <StatusWorkflowModal
        open={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
      />
    </>
  )
}
