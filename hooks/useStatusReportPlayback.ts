'use client'

/**
 * Shared Statusbericht playback engine — word-level sync for Tagro lyrics players.
 * Used by StatusReportPlayer (home), mobile teleprompter, and briefing surfaces.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getVoicePreferences,
  nearestStatusPlaybackRate,
  pickGermanVoice,
  STATUS_PLAYBACK_RATES,
  type StatusPlaybackRate,
} from '@/lib/voice'

export type UseStatusReportPlaybackOptions = {
  sentences: string[]
  onComplete?: () => void
  /**
   * When false, this hook is inert (no TTS, no cancel on unmount).
   * Use when a shared StatusPlayerProvider owns playback instead.
   */
  enabled?: boolean
}

export function useStatusReportPlayback({
  sentences,
  onComplete,
  enabled = true,
}: UseStatusReportPlaybackOptions) {
  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [activeWordIndex, setActiveWordIndex] = useState(-1)
  const [muted, setMutedState] = useState(false)
  const [volume, setVolumeState] = useState(1)
  const [playbackRate, setPlaybackRateState] = useState<StatusPlaybackRate>(() => (
    typeof window === 'undefined'
      ? 1
      : nearestStatusPlaybackRate(getVoicePreferences().rate ?? 1)
  ))
  const [autoScroll, setAutoScroll] = useState(true)

  const wordTimerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const pausedRef = useRef(false)
  const mutedRef = useRef(false)
  const volumeRef = useRef(1)
  const playbackRateRef = useRef<StatusPlaybackRate>(playbackRate)
  const onCompleteRef = useRef(onComplete)
  const sentencesRef = useRef(sentences)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const speaking = playing || paused

  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  useEffect(() => { sentencesRef.current = sentences }, [sentences])
  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { playbackRateRef.current = playbackRate }, [playbackRate])

  const clearWordTimer = useCallback(() => {
    if (wordTimerRef.current != null) {
      window.clearInterval(wordTimerRef.current)
      wordTimerRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    if (!enabledRef.current) return
    cancelledRef.current = true
    pausedRef.current = false
    clearWordTimer()
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    setPlaying(false)
    setPaused(false)
    setActiveIndex(-1)
    setActiveWordIndex(-1)
    setAutoScroll(true)
  }, [clearWordTimer])

  const pause = useCallback(() => {
    if (!enabledRef.current) return
    pausedRef.current = true
    clearWordTimer()
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    setPaused(true)
  }, [clearWordTimer])

  const startWordFallback = useCallback((sentence: string, rate: number, fromWord = 0) => {
    clearWordTimer()
    const words = sentence.split(/\s+/).filter(Boolean)
    if (words.length === 0) return
    const start = Math.max(0, Math.min(fromWord, words.length - 1))
    const msPerWord = Math.max(180, Math.round((60 / (150 * rate)) * 1000))
    let idx = start
    setActiveWordIndex(start)
    wordTimerRef.current = window.setInterval(() => {
      idx += 1
      if (idx >= words.length) {
        clearWordTimer()
        setActiveWordIndex(words.length)
        return
      }
      setActiveWordIndex(idx)
    }, msPerWord)
  }, [clearWordTimer])

  const speakFrom = useCallback((startIdx: number) => {
    if (!enabledRef.current || !supported || sentencesRef.current.length === 0) return
    cancelledRef.current = false
    pausedRef.current = false
    clearWordTimer()
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    try { window.speechSynthesis.getVoices() } catch { /* noop */ }
    const voice = pickGermanVoice()
    const prefs = getVoicePreferences()
    const rate = playbackRateRef.current
    const list = sentencesRef.current

    const queue = (i: number) => {
      if (pausedRef.current) return
      if (cancelledRef.current || i >= list.length) {
        clearWordTimer()
        if (!cancelledRef.current && !pausedRef.current) {
          setPlaying(false)
          setPaused(false)
          setActiveIndex(-1)
          setActiveWordIndex(-1)
          setAutoScroll(true)
          onCompleteRef.current?.()
        }
        return
      }

      const sentence = list[i]
      const u = new SpeechSynthesisUtterance(sentence)
      u.lang = 'de-DE'
      u.rate = rate
      u.pitch = prefs.pitch ?? 1
      u.volume = mutedRef.current ? 0 : volumeRef.current
      if (voice) u.voice = voice

      let boundarySeen = false
      u.onstart = () => {
        setActiveIndex(i)
        setActiveWordIndex(0)
        startWordFallback(sentence, rate)
      }
      u.onboundary = (event) => {
        if (event.name !== 'word' || event.charIndex < 0) return
        boundarySeen = true
        clearWordTimer()
        const spoken = sentence.slice(0, event.charIndex).split(/\s+/).filter(Boolean).length
        setActiveWordIndex(spoken)
      }
      u.onend = () => {
        if (pausedRef.current || cancelledRef.current) return
        clearWordTimer()
        const words = sentence.split(/\s+/).filter(Boolean)
        setActiveWordIndex(words.length)
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
        setActiveWordIndex(-1)
      }
      window.speechSynthesis.speak(u)
    }

    setPlaying(true)
    setPaused(false)
    setActiveIndex(startIdx)
    setActiveWordIndex(0)
    setAutoScroll(true)
    queue(startIdx)
  }, [clearWordTimer, startWordFallback, supported])

  const play = useCallback(() => {
    if (!supported || sentencesRef.current.length === 0) return
    speakFrom(0)
  }, [speakFrom, supported])

  const resume = useCallback(() => {
    if (!supported) return
    setPaused(false)
    pausedRef.current = false
    speakFrom(activeIndex >= 0 ? activeIndex : 0)
  }, [activeIndex, speakFrom, supported])

  const toggle = useCallback(() => {
    if (!supported || sentencesRef.current.length === 0) return
    if (playing && !paused) {
      pause()
      return
    }
    if (playing && paused) {
      resume()
      return
    }
    play()
  }, [pause, paused, play, playing, resume, supported])

  const resumeFromSentence = useCallback((sentenceIdx: number) => {
    stop()
    window.setTimeout(() => speakFrom(sentenceIdx), 0)
  }, [speakFrom, stop])

  const skipBack = useCallback(() => {
    if (!speaking || sentencesRef.current.length === 0) return
    const idx = activeIndex >= 0 ? activeIndex : 0
    const target = activeWordIndex > 0 ? idx : Math.max(0, idx - 1)
    resumeFromSentence(target)
  }, [activeIndex, activeWordIndex, resumeFromSentence, speaking])

  const skipForward = useCallback(() => {
    if (!speaking || sentencesRef.current.length === 0) return
    const idx = activeIndex >= 0 ? activeIndex : 0
    if (idx >= sentencesRef.current.length - 1) {
      stop()
      onCompleteRef.current?.()
      return
    }
    resumeFromSentence(idx + 1)
  }, [activeIndex, resumeFromSentence, speaking, stop])

  const setMuted = useCallback((next: boolean) => {
    mutedRef.current = next
    setMutedState(next)
    if (playing || paused) {
      const idx = activeIndex >= 0 ? activeIndex : 0
      stop()
      window.setTimeout(() => speakFrom(idx), 0)
    }
  }, [activeIndex, paused, playing, speakFrom, stop])

  const setVolume = useCallback((next: number, applyPlayback = false) => {
    const clamped = Math.max(0, Math.min(1, next))
    volumeRef.current = clamped
    setVolumeState(clamped)
    if (clamped > 0 && mutedRef.current) {
      mutedRef.current = false
      setMutedState(false)
    }
    if (applyPlayback && (playing || paused) && activeIndex >= 0) {
      const idx = activeIndex
      stop()
      window.setTimeout(() => speakFrom(idx), 0)
    }
  }, [activeIndex, paused, playing, speakFrom, stop])

  const cyclePlaybackRate = useCallback(() => {
    const currentIdx = STATUS_PLAYBACK_RATES.indexOf(playbackRateRef.current)
    const next = STATUS_PLAYBACK_RATES[(currentIdx + 1) % STATUS_PLAYBACK_RATES.length]
    playbackRateRef.current = next
    setPlaybackRateState(next)
    if (speaking) {
      const idx = activeIndex >= 0 ? activeIndex : 0
      resumeFromSentence(idx)
    }
  }, [activeIndex, resumeFromSentence, speaking])

  const seekToRatio = useCallback((ratio: number) => {
    if (sentencesRef.current.length === 0) return
    const clamped = Math.max(0, Math.min(1, ratio))
    const idx = Math.min(
      sentencesRef.current.length - 1,
      Math.floor(clamped * sentencesRef.current.length),
    )
    if (speaking) resumeFromSentence(idx)
    else speakFrom(idx)
  }, [resumeFromSentence, speakFrom, speaking])

  const takeScrollControl = useCallback(() => {
    setAutoScroll(false)
  }, [])

  const progress = useMemo(() => {
    if (sentences.length === 0 || !speaking || activeIndex < 0) return 0
    const sentenceWords = sentences[activeIndex]?.split(/\s+/).filter(Boolean).length || 1
    const within = activeWordIndex >= 0 ? Math.min(1, activeWordIndex / sentenceWords) : 0
    return Math.min(1, (activeIndex + within) / sentences.length)
  }, [activeIndex, activeWordIndex, sentences, speaking])

  const displayActiveIndex = speaking && activeIndex >= 0 ? activeIndex : -1

  useEffect(() => () => {
    if (!enabledRef.current) return
    stop()
  }, [stop])

  // Reset when report text changes (avoid stop() identity in deps).
  const sentenceKey = sentences.join('\n')
  const prevKeyRef = useRef(sentenceKey)
  useEffect(() => {
    if (!enabledRef.current) return
    if (prevKeyRef.current === sentenceKey) return
    prevKeyRef.current = sentenceKey
    stop()
  }, [sentenceKey, stop])

  return {
    supported,
    playing,
    paused,
    speaking,
    activeIndex,
    activeWordIndex,
    displayActiveIndex,
    muted,
    volume,
    playbackRate,
    progress,
    autoScroll,
    play,
    pause,
    resume,
    toggle,
    stop,
    speakFrom,
    skipBack,
    skipForward,
    setMuted,
    setVolume,
    cyclePlaybackRate,
    seekToRatio,
    takeScrollControl,
    setAutoScroll,
  }
}
