'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
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
import { openTagro } from '@/components/TagroOverlay'
import BriefingIntelligenceRulesMenu from '@/components/briefing/BriefingIntelligenceRulesMenu'
import { WEEKLY_BRIEFING_CSS } from '@/components/briefing/weekly-briefing-styles'
import {
  briefingScopeLabel,
  briefingTimeLabel,
  deriveBriefingHeadline,
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
import { createClient } from '@/lib/supabase/client'
import StatusWorkflowModal from '@/components/workflows/StatusWorkflowModal'

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

function BriefingLine({ text, state }: { text: string; state: 'past' | 'near' | 'on' | 'future' }) {
  const words = text.split(/\s+/).filter(Boolean)
  return (
    <p className={`wsb-line wsb-line--${state}`}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="wsb-word"
          style={state === 'on' ? { animationDelay: `${i * 0.065}s` } : undefined}
        >
          {word}{' '}
        </span>
      ))}
    </p>
  )
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
  const [volume, setVolume] = useState(1)
  const [active, setActive] = useState(-1)
  const [timeRange, setTimeRange] = useState<BriefingTimeRange>('7d')
  const [scope, setScope] = useState<BriefingScope>('company')
  const [timeOpen, setTimeOpen] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [openDecisionsCount, setOpenDecisionsCount] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [workflowOpen, setWorkflowOpen] = useState(false)
  const [intelOpen, setIntelOpen] = useState(false)

  const timeRef = useRef<HTMLDivElement>(null)
  const scopeRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const flowRef = useRef<HTMLDivElement>(null)
  const cancelledRef = useRef(false)
  const busyRef = useRef(false)
  const mutedRef = useRef(false)
  const volumeRef = useRef(1)

  const briefingText = (summary?.trim() || liveSummary?.trim() || report?.summary?.trim() || DEFAULT_SUMMARY).trim()
  const sentences = useMemo(() => splitBriefingSentences(briefingText), [briefingText])
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const durationLabel = briefingDurationLabel(briefingText)
  const scopeLabel = scope === 'company'
    ? 'Alle Projekte'
    : SCOPE_OPTIONS.find(s => s.id === scope)?.sample ?? briefingScopeLabel(scope)
  const headline = useMemo(
    () => deriveBriefingHeadline({
      report,
      timeRange,
      openDecisionsCount,
      unreadNotifications,
      pendingApprovals,
    }),
    [report, timeRange, openDecisionsCount, unreadNotifications, pendingApprovals],
  )

  const speaking = playing || paused
  const displayActive = speaking && active >= 0 ? active : -1

  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { volumeRef.current = volume }, [volume])

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

  const exitPlayback = useCallback(() => {
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
    if (!open) return
    void refreshReport()
  }, [open, summary, scope, timeRange, refreshReport])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/notifications?unread=1&limit=1', { credentials: 'include' })
        if (res.ok && !cancelled) {
          const data = await res.json().catch(() => null)
          setUnreadNotifications(Number(data?.unread ?? 0))
        }
      } catch { /* optional */ }

      try {
        const res = await fetch('/api/client/approvals', { credentials: 'include' })
        if (res.ok && !cancelled) {
          const data = await res.json().catch(() => null)
          setPendingApprovals(Number(data?.count ?? 0))
        }
      } catch { /* optional */ }

      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user || cancelled) return
      const { count } = await (sb as any).from('decisions')
        .select('id', { count: 'exact', head: true })
        .eq('requested_for', user.id)
        .in('status', ['open', 'waiting_for_client', 'in_progress'])
      if (!cancelled) setOpenDecisionsCount(count ?? 0)
    })()

    return () => { cancelled = true }
  }, [open, scope])

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
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
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
      u.volume = mutedRef.current ? 0 : volumeRef.current
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

  const onVolumeChange = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next))
    volumeRef.current = clamped
    setVolume(clamped)
    if (clamped > 0 && muted) {
      mutedRef.current = false
      setMuted(false)
    }
  }, [muted])

  const waveClass = useMemo(() => {
    if (playing && !paused) return 'wsb-wave playing'
    if (paused) return 'wsb-wave paused'
    return 'wsb-wave'
  }, [paused, playing])

  const openBriefingTagro = useCallback(() => {
    openTagro({ contextType: 'briefing', title: headline.title })
  }, [headline.title])

  if (!open) return null

  const filterRow = (
    <div className={`wsb-filter-row${isMobile ? ' wsb-filter-row--mobile' : ''}`}>
      <div className="wsb-picker-wrap" ref={timeRef}>
        <button
          type="button"
          className={`wsb-picker${isMobile ? ' wsb-picker--compact' : ''}`}
          onClick={e => { e.stopPropagation(); setTimeOpen(v => !v); setScopeOpen(false); setIntelOpen(false) }}
          aria-expanded={timeOpen}
          aria-label={`Analysezeitraum, ${briefingTimeLabel(timeRange)}`}
        >
          <Clock size={14} weight="regular" />
          <span className="wsb-picker-label">{briefingTimeLabel(timeRange)}</span>
          <CaretDown size={12} weight="bold" />
        </button>
        {timeOpen && (
          <div className="wsb-picker-menu" onClick={e => e.stopPropagation()}>
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
          onClick={e => { e.stopPropagation(); setScopeOpen(v => !v); setTimeOpen(false); setIntelOpen(false) }}
          aria-expanded={scopeOpen}
          aria-label={scopeLabel}
        >
          <Folders size={14} weight="regular" />
          <span className="wsb-picker-label">{scopeLabel}</span>
          <CaretDown size={12} weight="bold" />
        </button>
        {scopeOpen && (
          <div className="wsb-picker-menu" onClick={e => e.stopPropagation()}>
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
      <BriefingIntelligenceRulesMenu
        compact={isMobile}
        open={intelOpen}
        onOpenFullWorkflow={() => setWorkflowOpen(true)}
        onOpenChange={next => {
          setIntelOpen(next)
          if (next) {
            setTimeOpen(false)
            setScopeOpen(false)
          }
        }}
      />
    </div>
  )

  const tagroBackdropBtn = !isMobile && typeof document !== 'undefined' ? createPortal(
    <button
      type="button"
      className="wsb-tagro-backdrop festag-tagro-compose-btn"
      aria-label="Mit Tagro bearbeiten"
      title="Mit Tagro bearbeiten"
      onClick={openBriefingTagro}
    >
      <TagroComposeIcon size={24} />
    </button>,
    document.body,
  ) : null

  return (
    <>
      <Modal
        open
        onClose={dismiss}
        bare
        noPadding
        size="lg"
        surfaceClassName={`festag-modal-surface--briefing${isMobile ? ' festag-modal-surface--briefing-mobile' : ''}`}
        dragHandle={isMobile}
        noBackdropClose={speaking}
        title={headline.title}
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
            <p
              className="wsb-headline"
              aria-label={headline.ariaLabel}
            >
              <span className="wsb-headline-strong">{headline.title}</span>
              <span className="wsb-headline-muted"> {headline.subtitle}</span>
            </p>
            {filterRow}
          </div>

          <div className="wsb-stage">
            {speaking && !showSummary ? (
              <div className="wsb-lyrics-mask">
                <div className="wsb-lyrics" ref={transcriptRef}>
                  <div className="wsb-flow" ref={flowRef}>
                    {sentences.map((s, i) => {
                      const state = i === displayActive ? 'on'
                        : i === displayActive - 1 || i === displayActive + 1 ? 'near'
                        : i < displayActive ? 'past' : 'future'
                      return (
                        <div key={i} data-i={i}>
                          <BriefingLine text={s} state={state} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : showSummary ? (
              <p className="wsb-summary">{briefingText}</p>
            ) : (
              <div className="wsb-audio-card" aria-hidden={false}>
                <div className={waveClass} aria-hidden>
                  {Array.from({ length: 12 }, (_, i) => <span key={i} />)}
                </div>
                <p className="wsb-duration">{durationLabel}</p>
              </div>
            )}
          </div>

          <div className={`wsb-footer${isMobile ? ' wsb-footer--mobile' : ''}`}>
            {speaking ? (
              <button type="button" className="wsb-back" onClick={exitPlayback} aria-label="Zurück">
                <ArrowLeft size={18} weight="regular" />
                <span>Zurück</span>
              </button>
            ) : null}

            <button
              type="button"
              className="wsb-btn-play"
              onClick={togglePlay}
              disabled={!supported || sentences.length === 0}
            >
              {playing && !paused ? (
                <>
                  <Pause size={20} weight="fill" />
                  <span>Pausieren</span>
                </>
              ) : paused ? (
                <>
                  <Play size={20} weight="fill" />
                  <span>Fortsetzen</span>
                </>
              ) : (
                <>
                  <Play size={20} weight="fill" />
                  <span>Briefing anhören</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="wsb-btn-ghost"
              onClick={() => { stopSpeech(); setShowSummary(v => !v) }}
            >
              {showSummary ? 'Zurück zum Briefing' : 'Zusammenfassung lesen'}
            </button>

            <div className="wsb-volume-row">
              <button
                type="button"
                className="wsb-tool wsb-tool--inline"
                onClick={toggleMute}
                aria-label={muted ? 'Ton einschalten' : 'Stumm schalten'}
                aria-pressed={muted}
              >
                {muted ? <SpeakerSlash size={18} weight="regular" /> : <SpeakerHigh size={18} weight="regular" />}
              </button>
              <input
                type="range"
                className="wsb-volume-slider"
                min={0}
                max={100}
                step={1}
                value={Math.round(volume * 100)}
                onChange={e => onVolumeChange(Number(e.target.value) / 100)}
                aria-label="Lautstärke"
              />
              <span className="wsb-volume-value">{Math.round(volume * 100)}%</span>
            </div>

            {isMobile ? (
              <button
                type="button"
                className="wsb-btn-tagro"
                onClick={openBriefingTagro}
                aria-label="Mit Tagro bearbeiten"
              >
                <TagroComposeIcon size={20} />
                <span>Mit Tagro bearbeiten</span>
              </button>
            ) : null}
          </div>
        </div>
      </Modal>
      <StatusWorkflowModal
        open={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
      />
      {tagroBackdropBtn}
    </>
  )
}
