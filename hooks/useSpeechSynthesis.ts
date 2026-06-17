'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getVoicePreferences, setVoicePreferences, VoicePreferences } from '@/lib/voice'

type SpeechState = 'idle' | 'playing' | 'paused' | 'unsupported' | 'error'

export function speechVoiceId(voice: SpeechSynthesisVoice) {
  return `${voice.name}__${voice.lang}`
}

function scoreVoice(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()
  let score = 0
  if (lang === 'de-de') score += 100
  else if (lang.startsWith('de')) score += 80
  if (voice.localService) score += 8
  if (/flo|anna|markus|siri|marlene|shelley|ellen/.test(name)) score += 6
  if (/google|premium|enhanced|natural/.test(name)) score += 4
  return score
}

function pickDefaultGermanVoice(voices: SpeechSynthesisVoice[]) {
  return [...voices]
    .filter((voice) => voice.lang.toLowerCase().startsWith('de'))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null
}

export function useSpeechSynthesis(text: string) {
  const [state, setState] = useState<SpeechState>('idle')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [preferences, setPreferencesState] = useState<VoicePreferences>(() => getVoicePreferences())
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  const selectedVoice = useMemo(() => {
    if (preferences.voiceId) {
      const exact = voices.find((voice) => speechVoiceId(voice) === preferences.voiceId)
      if (exact) return exact
    }
    if (preferences.voiceName) {
      const legacy = voices.find((voice) => voice.name === preferences.voiceName)
      if (legacy) return legacy
    }
    return pickDefaultGermanVoice(voices)
  }, [preferences.voiceId, preferences.voiceName, voices])

  useEffect(() => {
    if (!supported) {
      setState('unsupported')
      return
    }

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices())
    loadVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices)
  }, [supported])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (event: Event) => {
      if (event instanceof CustomEvent) setPreferencesState(event.detail as VoicePreferences)
    }
    window.addEventListener('festag-voice-preferences', handler)
    return () => window.removeEventListener('festag-voice-preferences', handler)
  }, [])

  const updatePreferences = useCallback((next: Partial<VoicePreferences>) => {
    const merged = setVoicePreferences(next)
    setPreferencesState(merged)
  }, [])

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setState('idle')
  }, [supported])

  const pause = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.pause()
    setState('paused')
  }, [supported])

  const play = useCallback(() => {
    if (!supported) {
      setState('unsupported')
      return
    }
    if (!preferences.enabled) return

    if (window.speechSynthesis.paused && utteranceRef.current) {
      window.speechSynthesis.resume()
      setState('playing')
      return
    }

    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'de-DE'
      utterance.rate = preferences.rate
      utterance.pitch = preferences.pitch
      if (selectedVoice) utterance.voice = selectedVoice
      utterance.onstart = () => setState('playing')
      utterance.onpause = () => setState('paused')
      utterance.onend = () => {
        utteranceRef.current = null
        setState('idle')
      }
      utterance.onerror = () => setState('error')
      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    } catch {
      utteranceRef.current = null
      setState('error')
    }
  }, [preferences.enabled, preferences.pitch, preferences.rate, selectedVoice, supported, text])

  useEffect(() => stop, [stop])

  return {
    supported,
    state,
    voices,
    selectedVoice,
    preferences,
    play,
    pause,
    stop,
    updatePreferences,
  }
}
