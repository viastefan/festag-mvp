'use client'

/**
 * Portal-wide Statusbericht player state.
 * One playback engine survives route changes; mini-player + sheet + home share it.
 *
 * Mobile presentation: closed → sheet → fullscreen (drag-up handoff).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  briefingDurationLabel,
  normalizeClientReport,
  splitBriefingSentences,
} from '@/lib/client/status-briefing'
import {
  OPEN_STATUS_PLAYER_EVENT,
  type OpenStatusPlayerDetail,
} from '@/lib/status-player'
import { useStatusReportPlayback } from '@/hooks/useStatusReportPlayback'

export type StatusPlayerSource = {
  sentences: string[]
  projectLabel: string
  durationLabel?: string
  busy?: boolean
}

/** closed = fab/mini only · sheet = peek player · fullscreen = page handoff */
export type StatusPlayerPresentation = 'closed' | 'sheet' | 'fullscreen'

type StatusPlayerContextValue = {
  sentences: string[]
  projectLabel: string
  durationLabel: string
  busy: boolean
  presentation: StatusPlayerPresentation
  /** True when sheet or fullscreen is open. */
  expanded: boolean
  fullscreen: boolean
  setSource: (source: StatusPlayerSource) => void
  expand: () => void
  expandFullscreen: () => void
  collapse: () => void
  toggleExpanded: () => void
  setPresentation: (next: StatusPlayerPresentation) => void
  refreshReport: () => Promise<void>
  playback: ReturnType<typeof useStatusReportPlayback>
}

const StatusPlayerContext = createContext<StatusPlayerContextValue | null>(null)

export function useStatusPlayer(): StatusPlayerContextValue {
  const ctx = useContext(StatusPlayerContext)
  if (!ctx) {
    throw new Error('useStatusPlayer must be used within StatusPlayerProvider')
  }
  return ctx
}

export function useStatusPlayerOptional(): StatusPlayerContextValue | null {
  return useContext(StatusPlayerContext)
}

export function StatusPlayerProvider({ children }: { children: ReactNode }) {
  const [sentences, setSentences] = useState<string[]>([])
  const [projectLabel, setProjectLabel] = useState('Gesamtbericht')
  const [durationOverride, setDurationOverride] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [presentation, setPresentationState] = useState<StatusPlayerPresentation>('closed')
  const [loaded, setLoaded] = useState(false)

  const playback = useStatusReportPlayback({ sentences })

  const durationLabel = durationOverride
    || briefingDurationLabel(sentences.join(' '))

  const expanded = presentation !== 'closed'
  const fullscreen = presentation === 'fullscreen'

  const setSource = useCallback((source: StatusPlayerSource) => {
    setSentences(source.sentences)
    setProjectLabel(source.projectLabel || 'Gesamtbericht')
    setDurationOverride(source.durationLabel ?? null)
    if (typeof source.busy === 'boolean') setBusy(source.busy)
  }, [])

  const setPresentation = useCallback((next: StatusPlayerPresentation) => {
    setPresentationState(next)
  }, [])

  const expand = useCallback(() => setPresentationState('sheet'), [])
  const expandFullscreen = useCallback(() => setPresentationState('fullscreen'), [])
  const collapse = useCallback(() => setPresentationState('closed'), [])
  const toggleExpanded = useCallback(() => {
    setPresentationState((v) => (v === 'closed' ? 'sheet' : 'closed'))
  }, [])

  const refreshReport = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const cached = await fetch('/api/client/status-now?scope=overall', {
        method: 'GET',
        credentials: 'include',
      })
      if (cached.ok) {
        const data = await cached.json()
        const report = normalizeClientReport(data?.report ?? data)
        const text = report.summary.trim()
        if (text) {
          setSentences(splitBriefingSentences(text))
          setProjectLabel(report.title || 'Gesamtbericht')
          setDurationOverride(null)
          setLoaded(true)
          return
        }
      }

      const res = await fetch('/api/client/status-now', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'overall', period: 'Heute' }),
      })
      if (!res.ok) return
      const data = await res.json()
      const report = normalizeClientReport(data?.report ?? data)
      const text = report.summary.trim()
      if (text) {
        setSentences(splitBriefingSentences(text))
        setProjectLabel(report.title || 'Gesamtbericht')
        setDurationOverride(null)
      }
      setLoaded(true)
    } catch {
      /* keep previous */
    } finally {
      setBusy(false)
    }
  }, [busy])

  // Warm cache so mini-player works before visiting /dashboard.
  useEffect(() => {
    if (loaded || sentences.length > 0) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/client/status-now?scope=overall', {
          method: 'GET',
          credentials: 'include',
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        const report = normalizeClientReport(data?.report ?? data)
        const text = report.summary.trim()
        if (!text || cancelled) return
        setSentences(splitBriefingSentences(text))
        setProjectLabel(report.title || 'Gesamtbericht')
      } catch {
        /* noop */
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [loaded, sentences.length])

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<OpenStatusPlayerDetail>).detail || {}
      if (detail.expand !== false) {
        setPresentationState(detail.fullscreen ? 'fullscreen' : 'sheet')
      }
      if (!detail.play) return
      window.setTimeout(() => {
        const list = sentences
        if (list.length > 0) {
          if (!playback.speaking) playback.play()
          else if (playback.paused) playback.resume()
          return
        }
        void refreshReport().then(() => {
          window.setTimeout(() => playback.play(), 80)
        })
      }, 0)
    }
    window.addEventListener(OPEN_STATUS_PLAYER_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_STATUS_PLAYER_EVENT, onOpen)
  }, [playback, refreshReport, sentences])

  // Mark body so docks / chrome can yield to the player.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('festag-status-player-open', expanded)
    document.body.classList.toggle('festag-status-player-fullscreen', fullscreen)
    return () => {
      document.body.classList.remove('festag-status-player-open')
      document.body.classList.remove('festag-status-player-fullscreen')
    }
  }, [expanded, fullscreen])

  const value = useMemo<StatusPlayerContextValue>(() => ({
    sentences,
    projectLabel,
    durationLabel,
    busy,
    presentation,
    expanded,
    fullscreen,
    setSource,
    expand,
    expandFullscreen,
    collapse,
    toggleExpanded,
    setPresentation,
    refreshReport,
    playback,
  }), [
    sentences,
    projectLabel,
    durationLabel,
    busy,
    presentation,
    expanded,
    fullscreen,
    setSource,
    expand,
    expandFullscreen,
    collapse,
    toggleExpanded,
    setPresentation,
    refreshReport,
    playback,
  ])

  return (
    <StatusPlayerContext.Provider value={value}>
      {children}
    </StatusPlayerContext.Provider>
  )
}
