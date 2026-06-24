'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowUp,
  CaretDown,
  Clock,
  FastForward,
  Folders,
  Pause,
  Play,
  Rewind,
  SpeakerHigh,
  SpeakerSlash,
  X,
} from '@phosphor-icons/react'
import Modal from '@/components/Modal'
import { openTagro } from '@/components/TagroOverlay'
import BriefingLyricsFlow from '@/components/briefing/BriefingLyricsFlow'
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
const BRIEFING_ANCHOR_SELECTOR = '.portal-nav-briefing-btn[data-briefing-anchor]'

type CloseFlyout = {
  centerX: number
  centerY: number
  width: number
  height: number
  deltaX: number
  deltaY: number
  scale: number
}

const DEFAULT_SUMMARY =
  'Diese Woche wurden 43 Aufgaben abgeschlossen. 2 Releases veröffentlicht. 1 kritischer Blocker erkannt. Geschätzte Projektgesundheit: 91 Prozent. 4 Projekte entwickeln sich normal. 1 Projekt braucht Aufmerksamkeit wegen verzögerter Rückmeldung. 2 strategische Entscheidungen warten auf dich.'

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const

function formatPlaybackRate(rate: number): string {
  return `${rate.toLocaleString('de-DE', { maximumFractionDigits: 2 })}×`
}

function nearestPlaybackRate(rate: number): (typeof PLAYBACK_RATES)[number] {
  return PLAYBACK_RATES.reduce((best, candidate) => (
    Math.abs(candidate - rate) < Math.abs(best - rate) ? candidate : best
  ))
}

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
  const [playbackRate, setPlaybackRate] = useState<(typeof PLAYBACK_RATES)[number]>(() => (
    typeof window === 'undefined'
      ? 1
      : nearestPlaybackRate(getVoicePreferences().rate ?? 1)
  ))
  const [active, setActive] = useState(-1)
  const [activeWord, setActiveWord] = useState(-1)
  const [timeRange, setTimeRange] = useState<BriefingTimeRange>('7d')
  const [scope, setScope] = useState<BriefingScope>('company')
  const [timeOpen, setTimeOpen] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [openDecisionsCount, setOpenDecisionsCount] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [workflowOpen, setWorkflowOpen] = useState(false)
  const [closeFlyout, setCloseFlyout] = useState<CloseFlyout | null>(null)
  const [tagroAsk, setTagroAsk] = useState('')

  const timeRef = useRef<HTMLDivElement>(null)
  const scopeRef = useRef<HTMLDivElement>(null)
  const tagroAskRef = useRef<HTMLInputElement>(null)
  const wordTimerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const busyRef = useRef(false)
  const mutedRef = useRef(false)
  const volumeRef = useRef(1)
  const playbackRateRef = useRef<(typeof PLAYBACK_RATES)[number]>(
    nearestPlaybackRate(getVoicePreferences().rate ?? 1),
  )

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

  const clearWordTimer = useCallback(() => {
    if (wordTimerRef.current != null) {
      window.clearInterval(wordTimerRef.current)
      wordTimerRef.current = null
    }
  }, [])

  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { playbackRateRef.current = playbackRate }, [playbackRate])

  const stopSpeech = useCallback(() => {
    cancelledRef.current = true
    clearWordTimer()
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    setPlaying(false)
    setPaused(false)
    setActive(-1)
    setActiveWord(-1)
  }, [clearWordTimer])

  const pulseBriefingAnchor = useCallback(() => {
    const btn = document.querySelector(BRIEFING_ANCHOR_SELECTOR)
    if (!btn) return
    btn.classList.add('portal-nav-briefing-btn--landed')
    window.setTimeout(() => btn.classList.remove('portal-nav-briefing-btn--landed'), 1000)
  }, [])

  const dismiss = useCallback(() => {
    try { sessionStorage.setItem(STORAGE_KEY, '1') } catch { /* noop */ }
    stopSpeech()
    setShowSummary(false)

    if (isMobile) {
      setOpen(false)
      return
    }

    const surface = document.querySelector('.festag-modal-surface--briefing')
    const anchor = document.querySelector(BRIEFING_ANCHOR_SELECTOR)
    if (!(surface instanceof HTMLElement) || !(anchor instanceof HTMLElement)) {
      setOpen(false)
      return
    }

    const from = surface.getBoundingClientRect()
    const to = anchor.getBoundingClientRect()
    const centerX = from.left + from.width / 2
    const centerY = from.top + from.height / 2
    const targetX = to.left + to.width / 2
    const targetY = to.top + to.height / 2
    const targetSize = Math.max(to.width, to.height) * 1.12
    setCloseFlyout({
      centerX,
      centerY,
      width: from.width,
      height: from.height,
      deltaX: targetX - centerX,
      deltaY: targetY - centerY,
      scale: targetSize / Math.max(from.width, from.height),
    })
    setOpen(false)
  }, [isMobile, stopSpeech])

  const exitPlayback = useCallback(() => {
    stopSpeech()
    setShowSummary(false)
  }, [stopSpeech])

  const exitSummary = useCallback(() => {
    setShowSummary(false)
  }, [])

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
    if (!open) setTagroAsk('')
  }, [open])

  const startWordFallback = useCallback((sentence: string, rate: number, fromWord = 0) => {
    clearWordTimer()
    const words = sentence.split(/\s+/).filter(Boolean)
    if (words.length === 0) return
    const start = Math.max(0, Math.min(fromWord, words.length - 1))
    const msPerWord = Math.max(180, Math.round((60 / (150 * rate)) * 1000))
    let idx = start
    setActiveWord(start)
    wordTimerRef.current = window.setInterval(() => {
      idx += 1
      if (idx >= words.length) {
        clearWordTimer()
        setActiveWord(words.length)
        return
      }
      setActiveWord(idx)
    }, msPerWord)
  }, [clearWordTimer])

  const speakFrom = useCallback((startIdx: number) => {
    if (!supported || sentences.length === 0) return
    cancelledRef.current = false
    clearWordTimer()
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    const voice = pickGermanVoice()
    const prefs = getVoicePreferences()
    const rate = playbackRateRef.current

    const queue = (i: number) => {
      if (cancelledRef.current || i >= sentences.length) {
        clearWordTimer()
        if (!cancelledRef.current) {
          setPlaying(false)
          setPaused(false)
          setActive(-1)
          setActiveWord(-1)
          onListenComplete?.()
        }
        return
      }

      const sentence = sentences[i]
      const u = new SpeechSynthesisUtterance(sentence)
      u.lang = 'de-DE'
      u.rate = rate
      u.pitch = prefs.pitch ?? 1
      u.volume = mutedRef.current ? 0 : volumeRef.current
      if (voice) u.voice = voice

      let boundarySeen = false
      u.onstart = () => {
        setActive(i)
        setActiveWord(0)
        startWordFallback(sentence, rate)
      }
      u.onboundary = (event) => {
        if (event.name !== 'word' || event.charIndex < 0) return
        boundarySeen = true
        clearWordTimer()
        const spoken = sentence.slice(0, event.charIndex).split(/\s+/).filter(Boolean).length
        setActiveWord(spoken)
      }
      u.onend = () => {
        clearWordTimer()
        const words = sentence.split(/\s+/).filter(Boolean)
        setActiveWord(words.length)
        window.setTimeout(() => queue(i + 1), boundarySeen ? 120 : 280)
      }
      u.onerror = () => {
        clearWordTimer()
        setPlaying(false)
        setPaused(false)
        setActiveWord(-1)
      }
      window.speechSynthesis.speak(u)
    }
    setPlaying(true)
    setPaused(false)
    setActive(startIdx)
    setActiveWord(0)
    queue(startIdx)
  }, [clearWordTimer, onListenComplete, sentences, startWordFallback, supported])

  const togglePlay = useCallback(() => {
    if (!supported || sentences.length === 0) return
    if (playing && !paused) {
      window.speechSynthesis.pause()
      clearWordTimer()
      setPaused(true)
      return
    }
    if (paused) {
      window.speechSynthesis.resume()
      setPaused(false)
      if (active >= 0) startWordFallback(sentences[active], playbackRateRef.current, activeWord)
      return
    }
    setShowSummary(false)
    speakFrom(0)
  }, [active, activeWord, clearWordTimer, paused, playing, sentences, speakFrom, startWordFallback, supported])

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

  const resumeFromSentence = useCallback((sentenceIdx: number) => {
    stopSpeech()
    window.setTimeout(() => speakFrom(sentenceIdx), 0)
  }, [speakFrom, stopSpeech])

  const skipBack = useCallback(() => {
    if (!speaking || sentences.length === 0) return
    const idx = active >= 0 ? active : 0
    const target = activeWord > 0 ? idx : Math.max(0, idx - 1)
    resumeFromSentence(target)
  }, [active, activeWord, resumeFromSentence, sentences.length, speaking])

  const skipForward = useCallback(() => {
    if (!speaking || sentences.length === 0) return
    const idx = active >= 0 ? active : 0
    if (idx >= sentences.length - 1) {
      stopSpeech()
      onListenComplete?.()
      return
    }
    resumeFromSentence(idx + 1)
  }, [active, onListenComplete, resumeFromSentence, sentences.length, speaking, stopSpeech])

  const cyclePlaybackRate = useCallback(() => {
    const currentIdx = PLAYBACK_RATES.indexOf(playbackRateRef.current)
    const next = PLAYBACK_RATES[(currentIdx + 1) % PLAYBACK_RATES.length]
    playbackRateRef.current = next
    setPlaybackRate(next)
    if (speaking) {
      const idx = active >= 0 ? active : 0
      resumeFromSentence(idx)
    }
  }, [active, resumeFromSentence, speaking])

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

  const openBriefingTagro = useCallback((message?: string) => {
    const text = (message ?? tagroAsk).trim()
    if (!text) {
      openTagro({ contextType: 'briefing', title: headline.title, fullscreen: true, workspace: true })
      return
    }
    stopSpeech()
    setShowSummary(false)
    setOpen(false)
    setTagroAsk('')
    openTagro({
      contextType: 'briefing',
      title: headline.title,
      prefill: text,
      submit: text,
      fullscreen: true,
      workspace: true,
    })
  }, [headline.title, stopSpeech, tagroAsk])

  const onTagroAskSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    openBriefingTagro()
  }, [openBriefingTagro])

  const filterRow = (
    <div className={`wsb-filter-row${isMobile ? ' wsb-filter-row--mobile' : ''}`}>
      <div className="wsb-picker-wrap" ref={timeRef}>
        <button
          type="button"
          className={`wsb-picker${isMobile ? ' wsb-picker--compact' : ''}`}
          onClick={e => { e.stopPropagation(); setTimeOpen(v => !v); setScopeOpen(false) }}
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
          onClick={e => { e.stopPropagation(); setScopeOpen(v => !v); setTimeOpen(false) }}
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
        onOpen={() => {
          setWorkflowOpen(true)
          setTimeOpen(false)
          setScopeOpen(false)
        }}
      />
    </div>
  )


  return (
    <>
      <Modal
        open={open}
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
            <X size={16} weight="bold" />
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
              <BriefingLyricsFlow
                sentences={sentences}
                activeIndex={displayActive}
                activeWordIndex={activeWord}
                animating={playing && !paused}
              />
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
            ) : showSummary ? (
              <button type="button" className="wsb-back" onClick={exitSummary} aria-label="Zurück">
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
                  <span>{showSummary ? 'Briefing vorlesen' : 'Briefing anhören'}</span>
                </>
              )}
            </button>

            {!showSummary ? (
              <button
                type="button"
                className="wsb-btn-ghost"
                onClick={() => { stopSpeech(); setShowSummary(true) }}
              >
                Zusammenfassung lesen
              </button>
            ) : null}

            <div className="wsb-playback-bar">
              <div className="wsb-transport" role="group" aria-label="Wiedergabe">
                <button
                  type="button"
                  className="wsb-tool wsb-tool--inline"
                  onClick={skipBack}
                  disabled={!speaking}
                  aria-label="Vorheriger Satz"
                  title="Vorheriger Satz"
                >
                  <Rewind size={18} weight="regular" />
                </button>
                <button
                  type="button"
                  className="wsb-tool wsb-tool--inline"
                  onClick={skipForward}
                  disabled={!speaking}
                  aria-label="Nächster Satz"
                  title="Nächster Satz"
                >
                  <FastForward size={18} weight="regular" />
                </button>
                <button
                  type="button"
                  className="wsb-tool wsb-tool--speed"
                  onClick={cyclePlaybackRate}
                  aria-label={`Wiedergabegeschwindigkeit, ${formatPlaybackRate(playbackRate)}`}
                  title="Geschwindigkeit wechseln"
                >
                  {formatPlaybackRate(playbackRate)}
                </button>
              </div>

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
            </div>
          </div>
        </div>
      </Modal>
      {open && typeof document !== 'undefined' ? createPortal(
        <div
          className={`wsb-tagro-dock-wrap${isMobile ? ' wsb-tagro-dock-wrap--mobile' : ''}`}
          onMouseDown={e => e.stopPropagation()}
        >
          <form className="wsb-tagro-dock" onSubmit={onTagroAskSubmit}>
            <input
              ref={tagroAskRef}
              type="text"
              className="wsb-tagro-ask-input"
              value={tagroAsk}
              onChange={e => setTagroAsk(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              placeholder="Mit Tagro bearbeiten"
              aria-label="Mit Tagro bearbeiten"
              autoComplete="off"
            />
            <button
              type="submit"
              className="wsb-tagro-ask-send"
              disabled={!tagroAsk.trim()}
              aria-label="An Tagro senden"
            >
              <ArrowUp size={16} weight="bold" />
            </button>
          </form>
        </div>,
        document.body,
      ) : null}
      <StatusWorkflowModal
        open={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
      />
      {closeFlyout && typeof document !== 'undefined' ? createPortal(
        <>
          <motion.div
            className="wsb-close-flyout-backdrop"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            className="wsb-close-flyout"
            style={{
              left: closeFlyout.centerX,
              top: closeFlyout.centerY,
              width: closeFlyout.width,
              height: closeFlyout.height,
              marginLeft: -closeFlyout.width / 2,
              marginTop: -closeFlyout.height / 2,
            }}
            initial={{
              x: 0,
              y: 0,
              scale: 1,
              borderRadius: 32,
              opacity: 1,
            }}
            animate={{
              x: closeFlyout.deltaX,
              y: closeFlyout.deltaY,
              scale: closeFlyout.scale,
              borderRadius: 999,
              opacity: 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 28,
              mass: 0.95,
              opacity: { duration: 0.62, ease: [0.33, 1, 0.68, 1], delay: 0.1 },
              borderRadius: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
            }}
            onAnimationComplete={() => {
              setCloseFlyout(null)
              pulseBriefingAnchor()
            }}
          />
        </>,
        document.body,
      ) : null}
    </>
  )
}
