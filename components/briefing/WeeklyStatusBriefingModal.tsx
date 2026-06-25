'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CaretDown,
  CaretRight,
  Clock,
  FastForward,
  Folders,
  Pause,
  Play,
  Rewind,
  PaperPlaneTilt,
  SpeakerHigh,
  SpeakerSlash,
  X,
} from '@phosphor-icons/react'
import BriefingDeliveryConnectSheet from '@/components/briefing/BriefingDeliveryConnectSheet'
import WhatsAppBrandIcon from '@/components/briefing/WhatsAppBrandIcon'
import {
  buildBriefingSharePayload,
  type BriefingDeliveryChannels,
  waMeDigits,
} from '@/lib/briefing/delivery-channels'
import Modal from '@/components/Modal'
import { openTagro } from '@/components/TagroOverlay'
import BriefingTagroComposer from '@/components/briefing/BriefingTagroComposer'
import BriefingIntelligenceModal from '@/components/briefing/BriefingIntelligenceModal'
import BriefingLyricsFlow from '@/components/briefing/BriefingLyricsFlow'
import BriefingIntelligenceRulesMenu from '@/components/briefing/BriefingIntelligenceRulesMenu'
import { WEEKLY_BRIEFING_CSS } from '@/components/briefing/weekly-briefing-styles'
import {
  briefingScopeLabel,
  briefingTimeLabel,
  buildBriefingNarrativeSentences,
  deriveBriefingHeadline,
  type BriefingScope,
  type BriefingTimeRange,
} from '@/components/briefing/briefing-center-utils'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import {
  normalizeClientReport,
  type ClientStatusReport,
} from '@/lib/client/status-briefing'
import { OPEN_WEEKLY_BRIEFING_EVENT } from '@/lib/weekly-briefing'
import { getVoicePreferences } from '@/lib/voice'
import { createClient } from '@/lib/supabase/client'

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

function briefingKickerLabel(title: string): string {
  if (/wöchentlich/i.test(title)) return 'Wöchentlicher Überblick'
  if (/heute/i.test(title)) return 'Täglicher Überblick'
  return 'Statusüberblick'
}

function briefingDurationClock(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const seconds = Math.max(20, Math.round((words / 150) * 60))
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function nearestPlaybackRate(rate: number): (typeof PLAYBACK_RATES)[number] {
  return PLAYBACK_RATES.reduce((best, candidate) => (
    Math.abs(candidate - rate) < Math.abs(best - rate) ? candidate : best
  ))
}

function BriefingPickerDropdown({
  open,
  anchorRef,
  children,
}: {
  open: boolean
  anchorRef: RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' })

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    const menuW = 240
    let left = r.left
    if (left + menuW > window.innerWidth - 12) left = window.innerWidth - menuW - 12
    setStyle({
      position: 'fixed',
      top: r.bottom + 6,
      left: Math.max(12, left),
      minWidth: 200,
      zIndex: 9700,
      visibility: 'visible',
    })
  }, [open, anchorRef])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="wsb-picker-menu wsb-picker-menu--portal"
      style={style}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  )
}

function BriefingCapsuleWave({ live }: { live: boolean }) {
  return (
    <span
      className={['wsb-capsule-wave', live ? 'wsb-capsule-wave--live' : ''].filter(Boolean).join(' ')}
      aria-hidden
    >
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} />
      ))}
    </span>
  )
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
  const [deliveryChannels, setDeliveryChannels] = useState<BriefingDeliveryChannels>({
    whatsapp: null,
    message: null,
  })
  const [deliveryDefaults, setDeliveryDefaults] = useState<{ email: string | null; phone: string | null }>({
    email: null,
    phone: null,
  })
  const [connectChannel, setConnectChannel] = useState<'whatsapp' | 'message' | null>(null)
  const [deliveryNotice, setDeliveryNotice] = useState('')

  const timeRef = useRef<HTMLDivElement>(null)
  const scopeRef = useRef<HTMLDivElement>(null)
  const tagroAskRef = useRef<HTMLTextAreaElement>(null)
  const wordTimerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const pausedRef = useRef(false)
  const busyRef = useRef(false)
  const mutedRef = useRef(false)
  const volumeRef = useRef(1)
  const playbackRateRef = useRef<(typeof PLAYBACK_RATES)[number]>(
    nearestPlaybackRate(getVoicePreferences().rate ?? 1),
  )

  const briefingText = (summary?.trim() || liveSummary?.trim() || report?.summary?.trim() || DEFAULT_SUMMARY).trim()
  const headlineInput = useMemo(
    () => ({
      report,
      timeRange,
      openDecisionsCount,
      unreadNotifications,
      pendingApprovals,
    }),
    [report, timeRange, openDecisionsCount, unreadNotifications, pendingApprovals],
  )
  const headline = useMemo(
    () => deriveBriefingHeadline(headlineInput),
    [headlineInput],
  )
  const sentences = useMemo(
    () => buildBriefingNarrativeSentences({
      headlineInput,
      report,
      summaryFallback: briefingText,
    }),
    [briefingText, headlineInput, report],
  )
  const narrativeText = useMemo(() => sentences.join(' '), [sentences])
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const scopeLabel = scope === 'company'
    ? 'Alle Projekte'
    : SCOPE_OPTIONS.find(s => s.id === scope)?.sample ?? briefingScopeLabel(scope)
  const speaking = playing || paused

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
    pausedRef.current = false
    clearWordTimer()
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    setPlaying(false)
    setPaused(false)
    setActive(-1)
    setActiveWord(-1)
  }, [clearWordTimer])

  const pauseSpeech = useCallback(() => {
    pausedRef.current = true
    clearWordTimer()
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    setPaused(true)
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

  const refreshDeliveryChannels = useCallback(async (): Promise<BriefingDeliveryChannels | null> => {
    try {
      const res = await fetch('/api/briefing/delivery-channels', { credentials: 'include' })
      if (!res.ok) return null
      const data = await res.json().catch(() => null)
      if (data?.channels) {
        setDeliveryChannels(data.channels)
        if (data?.defaults) setDeliveryDefaults(data.defaults)
        return data.channels as BriefingDeliveryChannels
      }
    } catch { /* optional */ }
    return null
  }, [])

  useEffect(() => {
    if (!open) return
    void refreshDeliveryChannels()
  }, [open, refreshDeliveryChannels])

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

  useEffect(() => {
    if (!open || showSummary) return
    const timer = window.setTimeout(() => tagroAskRef.current?.focus(), 160)
    return () => window.clearTimeout(timer)
  }, [open, showSummary])

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
    pausedRef.current = false
    clearWordTimer()
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    try { window.speechSynthesis.getVoices() } catch { /* noop */ }
    const voice = pickGermanVoice()
    const prefs = getVoicePreferences()
    const rate = playbackRateRef.current

    const queue = (i: number) => {
      if (pausedRef.current) return
      if (cancelledRef.current || i >= sentences.length) {
        clearWordTimer()
        if (!cancelledRef.current && !pausedRef.current) {
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
        if (pausedRef.current || cancelledRef.current) return
        clearWordTimer()
        const words = sentence.split(/\s+/).filter(Boolean)
        setActiveWord(words.length)
        window.setTimeout(() => {
          if (!pausedRef.current && !cancelledRef.current) queue(i + 1)
        }, boundarySeen ? 120 : 280)
      }
      u.onerror = (event) => {
        const code = (event as SpeechSynthesisErrorEvent).error
        if (code === 'interrupted' || code === 'canceled') return
        if (pausedRef.current) return
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
      pauseSpeech()
      return
    }
    if (playing && paused) {
      setPaused(false)
      pausedRef.current = false
      speakFrom(active >= 0 ? active : 0)
      return
    }
    setShowSummary(false)
    speakFrom(0)
  }, [active, pauseSpeech, paused, playing, sentences, speakFrom, supported])

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

  const onVolumeChange = useCallback((next: number, applyPlayback = false) => {
    const clamped = Math.max(0, Math.min(1, next))
    volumeRef.current = clamped
    setVolume(clamped)
    if (clamped > 0 && muted) {
      mutedRef.current = false
      setMuted(false)
    }
    if (applyPlayback && (playing || paused) && active >= 0) {
      const idx = active
      stopSpeech()
      window.setTimeout(() => speakFrom(idx), 0)
    }
  }, [active, muted, paused, playing, speakFrom, stopSpeech])

  const pauseForHover = useCallback(() => {
    if (!playing || paused) return
    pauseSpeech()
  }, [pauseSpeech, paused, playing])

  const displayActive = speaking && active >= 0 ? active : -1
  const durationClock = useMemo(() => briefingDurationClock(narrativeText), [narrativeText])
  const listenCapsuleLabel = playing && !paused
    ? 'Pausieren'
    : paused
      ? 'Fortsetzen'
      : 'Wöchentliches Briefing anhören'

  const sendLinkedBriefing = useCallback(async (
    channel: 'whatsapp' | 'message',
    channels: BriefingDeliveryChannels = deliveryChannels,
  ): Promise<{ ok: boolean; error?: string }> => {
    const payload = buildBriefingSharePayload(headline.title, narrativeText)
    if (channel === 'whatsapp' && channels.whatsapp) {
      const digits = waMeDigits(channels.whatsapp.phone)
      window.open(
        `https://wa.me/${digits}?text=${encodeURIComponent(payload)}`,
        '_blank',
        'noopener,noreferrer',
      )
      return { ok: true }
    }
    if (channel === 'message' && channels.message) {
      const linked = channels.message
      if (linked.channel === 'sms') {
        const digits = waMeDigits(linked.destination)
        window.location.href = `sms:${digits}?body=${encodeURIComponent(payload)}`
        return { ok: true }
      }
      const res = await fetch('/api/briefings/send-offline', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline: headline.title, summary: narrativeText }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        return { ok: false, error: data?.error || 'send_failed' }
      }
      return { ok: true }
    }
    return { ok: false, error: 'not_linked' }
  }, [deliveryChannels, headline.title, narrativeText])

  const onDeliveryChipClick = useCallback((channel: 'whatsapp' | 'message') => {
    setDeliveryNotice('')
    if (channel === 'whatsapp' && deliveryChannels.whatsapp) return
    if (channel === 'message' && deliveryChannels.message) return
    setConnectChannel(channel)
  }, [deliveryChannels])

  const onDeliveryLinked = useCallback(async (
    channel: 'whatsapp' | 'message',
    channels: BriefingDeliveryChannels,
  ) => {
    setConnectChannel(null)
    setDeliveryChannels(channels)
    const result = await sendLinkedBriefing(channel, channels)
    if (!result.ok) {
      setDeliveryNotice(
        result.error === 'send_failed'
          ? 'Verknüpft, aber der Versand ist fehlgeschlagen. Bitte in den Einstellungen prüfen.'
          : 'Verknüpft, Versand konnte nicht gestartet werden.',
      )
    } else {
      setDeliveryNotice('')
    }
  }, [sendLinkedBriefing])

  const showWhatsAppChip = !deliveryChannels.whatsapp
  const showMessageChip = !deliveryChannels.message
  const showOfflineHint = showWhatsAppChip || showMessageChip

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

  const submitBriefingTagro = useCallback(async (text: string) => {
    openBriefingTagro(text)
  }, [openBriefingTagro])

  const briefingTagroComposer = (
    <BriefingTagroComposer
      placeholder="Mit Tagro bearbeiten oder @ für Kontext"
      value={tagroAsk}
      onChange={setTagroAsk}
      onSubmit={submitBriefingTagro}
      inputRef={tagroAskRef}
    />
  )

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
        <BriefingPickerDropdown open={timeOpen} anchorRef={timeRef}>
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
        </BriefingPickerDropdown>
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
        <BriefingPickerDropdown open={scopeOpen} anchorRef={scopeRef}>
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
        </BriefingPickerDropdown>
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
      >
        <style>{WEEKLY_BRIEFING_CSS}</style>
        <div className="wsb-composer">
          <div
            className={[
              'wsb-shell',
              isMobile ? 'wsb-shell--mobile' : '',
              speaking ? 'wsb-shell--playing' : '',
              showSummary ? 'wsb-shell--summary' : '',
            ].filter(Boolean).join(' ')}
            aria-label={headline.ariaLabel}
          >
            <button type="button" className="wsb-close" onClick={dismiss} aria-label="Schließen">
              <X size={16} weight="bold" />
            </button>

            {!showSummary ? (
              <div className="wsb-shell-kicker">
                <span className="wsb-shell-kicker-label">{briefingKickerLabel(headline.title)}</span>
              </div>
            ) : null}

            <div className="wsb-stage">
              {showSummary ? (
                <p className="wsb-summary">{narrativeText}</p>
              ) : (
                <BriefingLyricsFlow
                  sentences={sentences}
                  activeIndex={displayActive}
                  activeWordIndex={activeWord}
                  animating={playing && !paused}
                  onHoverPause={pauseForHover}
                />
              )}
            </div>

            <div className={`wsb-footer${isMobile ? ' wsb-footer--mobile' : ''}`}>
              {showSummary ? (
                <button type="button" className="wsb-back" onClick={exitSummary} aria-label="Zurück">
                  <ArrowLeft size={18} weight="regular" />
                  <span>Zurück</span>
                </button>
              ) : null}

              {!showSummary ? (
                <div className="wsb-audio-block">
                  <button
                    type="button"
                    className={`wsb-audio-capsule${speaking ? ' wsb-audio-capsule--live' : ''}`}
                    onClick={togglePlay}
                    disabled={!supported || sentences.length === 0}
                  >
                    <span className="wsb-audio-capsule-play" aria-hidden>
                      {speaking && !paused ? (
                        <Pause size={18} weight="fill" />
                      ) : (
                        <Play size={18} weight="fill" />
                      )}
                    </span>
                    <span className="wsb-audio-capsule-label">{listenCapsuleLabel}</span>
                    {!speaking ? (
                      <span className="wsb-audio-capsule-duration">{durationClock}</span>
                    ) : null}
                    <BriefingCapsuleWave live={playing && !paused} />
                  </button>

                  {speaking ? (
                    <div className="wsb-controls-row wsb-controls-row--live">
                      <div
                        className="wsb-transport wsb-transport--minimal wsb-transport--compact"
                        role="group"
                        aria-label="Wiedergabe"
                      >
                      <button
                        type="button"
                        className="wsb-tool wsb-tool--inline"
                        onClick={skipBack}
                        disabled={!speaking}
                        aria-label="Vorheriger Satz"
                        title="Vorheriger Satz"
                      >
                        <Rewind size={16} weight="regular" />
                      </button>
                      <button
                        type="button"
                        className="wsb-tool wsb-tool--inline"
                        onClick={skipForward}
                        disabled={!speaking}
                        aria-label="Nächster Satz"
                        title="Nächster Satz"
                      >
                        <FastForward size={16} weight="regular" />
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
                        className="wsb-volume-mute"
                        onClick={toggleMute}
                        aria-label={muted ? 'Ton einschalten' : 'Stumm schalten'}
                        aria-pressed={muted}
                      >
                        {muted ? <SpeakerSlash size={16} weight="regular" /> : <SpeakerHigh size={16} weight="regular" />}
                      </button>
                      <input
                        type="range"
                        className="wsb-volume-slider"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(volume * 100)}
                        onChange={e => onVolumeChange(Number(e.target.value) / 100)}
                        onMouseUp={e => onVolumeChange(Number(e.currentTarget.value) / 100, true)}
                        onTouchEnd={e => onVolumeChange(Number(e.currentTarget.value) / 100, true)}
                        aria-label="Lautstärke"
                      />
                      <span className="wsb-volume-value">{Math.round(volume * 100)}%</span>
                    </div>
                    </div>
                  ) : null}

                  <div className={`wsb-footer-meta${isMobile ? ' wsb-footer-meta--mobile' : ''}`}>
                    {filterRow}
                    <button
                      type="button"
                      className="wsb-summary-link"
                      onClick={() => { stopSpeech(); setShowSummary(true) }}
                    >
                      <span>Zusammenfassung lesen</span>
                      <CaretRight size={14} weight="bold" aria-hidden />
                    </button>
                  </div>

                  {showOfflineHint ? (
                    <div className="wsb-offline-hint">
                      <span className="wsb-offline-hint-label">Auch ohne App anhören</span>
                      <div className="wsb-offline-actions">
                        {showWhatsAppChip ? (
                          <button
                            type="button"
                            className="wsb-offline-chip"
                            onClick={() => onDeliveryChipClick('whatsapp')}
                          >
                            <WhatsAppBrandIcon size={15} />
                            <span>WhatsApp</span>
                          </button>
                        ) : null}
                        {showMessageChip ? (
                          <button
                            type="button"
                            className="wsb-offline-chip"
                            onClick={() => onDeliveryChipClick('message')}
                          >
                            <PaperPlaneTilt size={15} weight="regular" aria-hidden />
                            <span>Nachricht</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {deliveryNotice ? (
                    <p className="wsb-delivery-notice" role="status">{deliveryNotice}</p>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  className="wsb-audio-capsule wsb-audio-capsule--solo"
                  onClick={togglePlay}
                  disabled={!supported || sentences.length === 0}
                >
                  <span className="wsb-audio-capsule-play" aria-hidden>
                    <Play size={18} weight="fill" />
                  </span>
                  <span className="wsb-audio-capsule-label">Briefing vorlesen</span>
                  <BriefingCapsuleWave live={false} />
                </button>
              )}

              {!showSummary ? (
                <div className="wsb-inline-tagro">
                  {briefingTagroComposer}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Modal>
      <BriefingDeliveryConnectSheet
        open={connectChannel != null}
        channel={connectChannel}
        defaultEmail={deliveryDefaults.email}
        defaultPhone={deliveryDefaults.phone}
        onClose={() => setConnectChannel(null)}
        onLinked={onDeliveryLinked}
      />
      <BriefingIntelligenceModal
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
