'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getVoicePreferences, setVoicePreferences, VoicePreferences } from '@/lib/voice'

type SpeechState = 'idle' | 'playing' | 'paused' | 'unsupported' | 'error'

export function useSpeechSynthesis(text: string) {
  const [state, setState] = useState<SpeechState>('idle')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [preferences, setPreferencesState] = useState<VoicePreferences>(() => getVoicePreferences())
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  const selectedVoice = useMemo(() => {
    if (!preferences.voiceName) return null
    return voices.find((voice) => voice.name === preferences.voiceName) ?? null
  }, [preferences.voiceName, voices])

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
  }, [preferences.enabled, preferences.pitch, preferences.rate, selectedVoice, supported, text])

  useEffect(() => stop, [stop])

  return {
    supported,
    state,
    voices,
    preferences,
    play,
    pause,
    stop,
    updatePreferences,
  }
}
