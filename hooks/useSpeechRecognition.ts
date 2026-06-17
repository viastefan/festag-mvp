'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * useSpeechRecognition — thin wrapper around the browser Web Speech API
 * (SpeechRecognition / webkitSpeechRecognition).
 *
 * Live, on-device transcription: no audio upload, no API key, works
 * offline-ish in Chrome / Edge / Safari. Firefox has no support — there
 * `supported` stays false and the caller hides the mic button.
 *
 * Designed for the Festag dev daily-update card: the dev presses the
 * mic, speaks one or two sentences, the interim text streams into a
 * textarea they can still edit before sending.
 *
 *   const { supported, listening, start, stop } = useSpeechRecognition({
 *     lang: 'de-DE',
 *     onResult: (text, isFinal) => setDraft(text),
 *   })
 */

// Minimal typings — the DOM lib doesn't ship SpeechRecognition.
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

type Options = {
  lang?: string
  /** Called on every interim + final chunk. `isFinal` true when the engine commits. */
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

export function useSpeechRecognition(opts: Options = {}) {
  const { lang = 'de-DE' } = opts
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  // Keep latest callbacks without re-creating the recognition instance.
  const onResultRef = useRef(opts.onResult)
  const onErrorRef = useRef(opts.onError)
  onResultRef.current = opts.onResult
  onErrorRef.current = opts.onError

  useEffect(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) { setSupported(false); return }
    setSupported(true)

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i]
        if (chunk.isFinal) final += chunk[0].transcript
        else interim += chunk[0].transcript
      }
      if (final) onResultRef.current?.(final.trim(), true)
      else if (interim) onResultRef.current?.(interim.trim(), false)
    }
    recognition.onerror = (event: any) => {
      onErrorRef.current?.(String(event?.error ?? 'speech_error'))
      setListening(false)
    }
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    return () => {
      try { recognition.abort() } catch { /* noop */ }
      recognitionRef.current = null
    }
  }, [lang])

  function start() {
    const r = recognitionRef.current
    if (!r || listening) return
    try {
      r.start()
      setListening(true)
    } catch {
      // start() throws if already started — recover quietly.
      setListening(false)
    }
  }

  function stop() {
    const r = recognitionRef.current
    if (!r) return
    try { r.stop() } catch { /* noop */ }
    setListening(false)
  }

  return { supported, listening, start, stop }
}
