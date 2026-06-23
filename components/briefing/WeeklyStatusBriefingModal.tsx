'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CaretDown,
  Clock,
  Folders,
  Pause,
  Play,
  SpeakerHigh,
  SpeakerSlash,
  X,
} from '@phosphor-icons/react'
import Modal from '@/components/Modal'
import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import TagroContentFab from '@/components/TagroContentFab'
import { openTagro } from '@/components/TagroOverlay'
import { WEEKLY_BRIEFING_CSS } from '@/components/briefing/weekly-briefing-styles'
import {
  briefingScopeLabel,
  briefingTimeLabel,
  deriveExecutiveMetrics,
  type BriefingScope,
  type BriefingTimeRange,
} from '@/components/briefing/briefing-center-utils'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import {
  briefingDurationLabel,
  normalizeClientReport,
  splitBriefingSentences,
  type ClientStatusReport,
} from '@/lib/client/status-briefing'
import { OPEN_WEEKLY_BRIEFING_EVENT } from '@/lib/weekly-briefing'
import { getVoicePreferences } from '@/lib/voice'

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

function metricsLine(metrics: ReturnType<typeof deriveExecutiveMetrics>, compact = false): string {
  if (compact) {
    return `${metrics.tasksCompleted} Aufgaben, ${metrics.releases} Releases, ${metrics.blockers} Blocker, ${metrics.health}% Gesundheit`
  }
  return `${metrics.tasksCompleted} Aufgaben abgeschlossen, ${metrics.releases} Releases veröffentlicht, ${metrics.blockers} Kritische Blocker, ${metrics.health}% Projektgesundheit.`
}

export default function WeeklyStatusBriefingModal({ summary, onListenComplete }: Props) {
  const isMobile = useFestagMobile()
  const [open, setOpen] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [report, setReport] = useState<ClientStatusReport | null>(null)
  const [liveSummary, setLiveSummary] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(false)
  const [active, setActive] = useState(-1)
  const [timeRange, setTimeRange] = useState<BriefingTimeRange>('7d')
  const [scope, setScope] = useState<BriefingScope>('company')
  const [timeOpen, setTimeOpen] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)

  const timeRef = useRef<HTMLDivElement>(null)
  const scopeRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const flowRef = useRef<HTMLDivElement>(null)
  const cancelledRef = useRef(false)
  const busyRef = useRef(false)
  const mutedRef = useRef(false)

  const briefingText = (summary?.trim() || liveSummary?.trim() || report?.summary?.trim() || DEFAULT_SUMMARY).trim()
  const sentences = useMemo(() => splitBriefingSentences(briefingText), [briefingText])
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const durationLabel = briefingDurationLabel(briefingText)
  const metrics = useMemo(() => deriveExecutiveMetrics(report, briefingText), [report, briefingText])
  const scopeLabel = scope === 'company'
    ? 'Alle Projekte'
    : SCOPE_OPTIONS.find(s => s.id === scope)?.sample ?? briefingScopeLabel(scope)

  const speaking = playing || paused
  const displayActive = speaking && active >= 0 ? active : -1

  useEffect(() => { mutedRef.current = muted }, [muted])

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
    setShowSummary(false)
  }, [stopSpeech])

  const refreshReport = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
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
      setShowSummary(false)
      setOpen(true)
    }
    window.addEventListener(OPEN_WEEKLY_BRIEFING_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_WEEKLY_BRIEFING_EVENT, onOpen)
  }, [stopSpeech])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (timeRef.current && !timeRef.current.contains(t)) setTimeOpen(false)
      if (scopeRef.current && !scopeRef.current.contains(t)) setScopeOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    const body = transcriptRef.current
    const flow = flowRef.current
    if (!body || !flow || displayActive < 0) return
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
    const prefs = getVoicePreferences()

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
      u.rate = prefs.rate ?? 0.95
      u.pitch = prefs.pitch ?? 1
      u.volume = mutedRef.current ? 0 : 1
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
  }, [onListenComplete, sentences, supported])

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
    setShowSummary(false)
    speakFrom(0)
  }, [paused, playing, sentences.length, speakFrom, supported])

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    if (playing || paused) {
      const idx = active >= 0 ? active : 0
      stopSpeech()
      window.setTimeout(() => speakFrom(idx), 0)
    }
  }, [active, paused, playing, speakFrom, stopSpeech])

  const waveClass = useMemo(() => {
    if (playing && !paused) return 'wsb-wave playing'
    if (paused) return 'wsb-wave paused'
    return 'wsb-wave'
  }, [paused, playing])

  if (!open) return null

  const metricsText = metricsLine(metrics, isMobile)

  const filterRow = (
    <div className={`wsb-filter-row${isMobile ? ' wsb-filter-row--mobile' : ''}`}>
      <div className="wsb-picker-wrap" ref={timeRef}>
        <button
          type="button"
          className={`wsb-picker${isMobile ? ' wsb-picker--compact' : ''}`}
          onClick={() => { setTimeOpen(v => !v); setScopeOpen(false) }}
          aria-expanded={timeOpen}
          aria-label={`Analysezeitraum, ${briefingTimeLabel(timeRange)}`}
        >
          <Clock size={14} weight="regular" />
          <span className="wsb-picker-label">{briefingTimeLabel(timeRange)}</span>
          <CaretDown size={12} weight="bold" />
        </button>
        {timeOpen && (
          <div className="wsb-picker-menu">
            {TIME_RANGES.map(range => (
              <button
                key={range}
                type="button"
                className={timeRange === range ? 'on' : ''}
                onClick={() => { setTimeRange(range); setTimeOpen(false) }}
              >
                {briefingTimeLabel(range)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="wsb-picker-wrap" ref={scopeRef}>
        <button
          type="button"
          className={`wsb-picker${isMobile ? ' wsb-picker--compact' : ''}`}
          onClick={() => { setScopeOpen(v => !v); setTimeOpen(false) }}
          aria-expanded={scopeOpen}
          aria-label={scopeLabel}
        >
          <Folders size={14} weight="regular" />
          <span className="wsb-picker-label">{scopeLabel}</span>
          <CaretDown size={12} weight="bold" />
        </button>
        {scopeOpen && (
          <div className="wsb-picker-menu">
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
    </div>
  )

  return (
    <Modal
      open
      onClose={dismiss}
      bare
      noPadding
      size="lg"
      surfaceClassName={`festag-modal-surface--briefing${isMobile ? ' festag-modal-surface--briefing-mobile' : ''}`}
      dragHandle={isMobile}
      noBackdropClose={speaking}
      title="Wöchentliches Status-Briefing"
    >
      <style>{WEEKLY_BRIEFING_CSS}</style>
      <div
        className={[
          'wsb-shell',
          isMobile ? 'wsb-shell--mobile' : '',
          speaking ? 'wsb-shell--playing' : '',
          showSummary ? 'wsb-shell--summary' : '',
        ].filter(Boolean).join(' ')}
      >
        <button type="button" className="wsb-close" onClick={dismiss} aria-label="Schließen">
          <X size={12} weight="bold" />
        </button>

        <div className="wsb-intro" aria-hidden={speaking}>
          <h2 className="wsb-title">Wöchentliches Status-Briefing</h2>
          <p className="wsb-metrics">{metricsText}</p>
          <p className="wsb-teaser">{briefingText}</p>
          {filterRow}
        </div>

        <div className="wsb-stage">
          {speaking && !showSummary ? (
            <div className="wsb-lyrics-mask">
              <div className="wsb-lyrics" ref={transcriptRef}>
                <div className="wsb-flow" ref={flowRef}>
                  {sentences.map((s, i) => (
                    <p
                      key={i}
                      data-i={i}
                      className={`wsb-line${
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
          ) : showSummary ? (
            <p className="wsb-summary">{briefingText}</p>
          ) : (
            <div className="wsb-idle-visual">
              <div className={waveClass} aria-hidden>
                {Array.from({ length: 12 }, (_, i) => <span key={i} />)}
              </div>
              <p className="wsb-duration">{durationLabel}</p>
            </div>
          )}
        </div>

        <div className={`wsb-toolbar${isMobile ? ' wsb-toolbar--mobile' : ''}`}>
          <button
            type="button"
            className="wsb-tool"
            onClick={toggleMute}
            aria-label={muted ? 'Ton einschalten' : 'Stumm schalten'}
            aria-pressed={muted}
          >
            {muted ? <SpeakerSlash size={18} weight="regular" /> : <SpeakerHigh size={18} weight="regular" />}
          </button>

          <button
            type="button"
            className="wsb-btn-play"
            onClick={togglePlay}
            disabled={!supported || sentences.length === 0}
            aria-label={playing && !paused ? 'Pausieren' : 'Briefing anhören'}
          >
            {playing && !paused ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
            <span>
              {playing && !paused ? 'Pausieren' : paused ? 'Fortsetzen' : 'Briefing anhören'}
            </span>
          </button>

          <button
            type="button"
            className="wsb-btn-ghost"
            onClick={() => { stopSpeech(); setShowSummary(v => !v) }}
          >
            {showSummary ? 'Zurück' : 'Zusammenfassung lesen'}
          </button>

          {isMobile ? (
            <button
              type="button"
              className="wsb-tagro-mobile festag-tagro-compose-btn"
              aria-label="Mit Tagro bearbeiten"
              onClick={() => openTagro({ contextType: 'briefing', title: 'Wöchentliches Status-Briefing' })}
            >
              <TagroComposeIcon size={20} />
            </button>
          ) : null}
        </div>

        {!isMobile && (
          <TagroContentFab
            className="wsb-tagro-fab"
            context={{ contextType: 'briefing', title: 'Wöchentliches Status-Briefing' }}
          />
        )}
      </div>
    </Modal>
  )
}
