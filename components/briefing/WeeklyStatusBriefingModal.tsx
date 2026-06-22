'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from '@phosphor-icons/react'
import Modal from '@/components/Modal'
import { WEEKLY_BRIEFING_CSS } from '@/components/briefing/weekly-briefing-styles'
import { OPEN_WEEKLY_BRIEFING_EVENT } from '@/lib/weekly-briefing'
import { getVoicePreferences } from '@/lib/voice'

const STORAGE_KEY = 'festag-weekly-briefing-dismissed'

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

const DEFAULT_SUMMARY =
  '4 Projekte entwickeln sich normal. 1 Projekt braucht Aufmerksamkeit wegen verzögerter Rückmeldung. 2 strategische Entscheidungen warten auf dich.'

export default function WeeklyStatusBriefingModal({ summary, onListenComplete }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'intro' | 'summary'>('intro')
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [liveSummary, setLiveSummary] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const briefingText = (summary?.trim() || liveSummary?.trim() || DEFAULT_SUMMARY).trim()
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

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
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/client/status-now?scope=overall', { credentials: 'include' })
        const data = await res.json().catch(() => null)
        const text = String(data?.report?.summary ?? data?.report?.content ?? '').trim()
        if (!cancelled && text) setLiveSummary(text)
      } catch { /* fallback summary */ }
    })()
    return () => { cancelled = true }
  }, [open, summary])

  const stopSpeech = useCallback(() => {
    cancelledRef.current = true
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    setPlaying(false)
    setPaused(false)
  }, [])

  const dismiss = useCallback(() => {
    try { sessionStorage.setItem(STORAGE_KEY, '1') } catch { /* noop */ }
    setOpen(false)
    stopSpeech()
  }, [stopSpeech])

  const speak = useCallback(() => {
    if (!supported || !briefingText) return
    stopSpeech()
    cancelledRef.current = false
    const utter = new SpeechSynthesisUtterance(briefingText)
    const voice = pickGermanVoice()
    if (voice) utter.voice = voice
    utter.lang = 'de-DE'
    utter.rate = 0.95
    utter.onstart = () => { setPlaying(true); setPaused(false) }
    utter.onend = () => {
      setPlaying(false)
      setPaused(false)
      onListenComplete?.()
    }
    utter.onerror = () => { setPlaying(false); setPaused(false) }
    window.speechSynthesis.speak(utter)
  }, [briefingText, onListenComplete, stopSpeech, supported])

  const togglePlay = useCallback(() => {
    if (!supported) return
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
    speak()
  }, [paused, playing, speak, supported])

  useEffect(() => () => stopSpeech(), [stopSpeech])

  useEffect(() => {
    function onOpen() {
      stopSpeech()
      setMode('intro')
      setOpen(true)
    }
    window.addEventListener(OPEN_WEEKLY_BRIEFING_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_WEEKLY_BRIEFING_EVENT, onOpen)
  }, [stopSpeech])

  const waveClass = useMemo(() => {
    if (playing && !paused) return 'wsb-wave playing'
    if (paused) return 'wsb-wave paused'
    return 'wsb-wave'
  }, [paused, playing])

  if (!open) return null

  return (
    <Modal
      open
      onClose={dismiss}
      size="md"
      surfaceClassName="festag-modal-surface--briefing"
      closeIconSize={20}
      title={mode === 'intro' ? 'Wöchentliches Status-Briefing' : 'Zusammenfassung'}
      headline={mode === 'intro' ? (
        <p
          className="wsb-headline"
          aria-label="Wöchentliches Status-Briefing. Tagro hat eine kurze Executive Summary deiner Projekte vorbereitet."
        >
          <span className="wsb-headline-strong">Wöchentliches Status-Briefing</span>
          <span className="wsb-headline-muted"> Tagro hat eine kurze Executive Summary deiner Projekte vorbereitet.</span>
        </p>
      ) : undefined}
      dragHandle
      noBackdropClose={mode === 'intro' && playing}
    >
      <style>{WEEKLY_BRIEFING_CSS}</style>
      <div className="wsb-host">
        {mode === 'intro' ? (
          <>
            <div className="wsb-audio-card" aria-hidden={false}>
              <div className={waveClass} aria-hidden>
                {Array.from({ length: 12 }, (_, i) => <span key={i} />)}
              </div>
              <p className="wsb-duration">2 Min. Briefing</p>
            </div>
            <div className="wsb-actions">
              <button
                type="button"
                className="wsb-btn-primary"
                onClick={togglePlay}
              >
                {playing && !paused ? (
                  <>
                    <Pause size={18} weight="fill" />
                    Briefing pausieren
                  </>
                ) : paused ? (
                  <>
                    <Play size={18} weight="fill" />
                    Briefing fortsetzen
                  </>
                ) : (
                  <>
                    <Play size={18} weight="fill" />
                    Briefing anhören
                  </>
                )}
              </button>
              <button
                type="button"
                className="wsb-btn-secondary"
                onClick={() => { stopSpeech(); setMode('summary') }}
              >
                Zusammenfassung lesen
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="wsb-summary">{briefingText}</p>
            <div className="wsb-actions">
              <button type="button" className="wsb-btn-primary" onClick={dismiss}>
                Schließen
              </button>
              {supported && (
                <button type="button" className="wsb-btn-secondary" onClick={togglePlay}>
                  {playing && !paused ? 'Pausieren' : 'Anhören'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
