'use client'

import { useMemo } from 'react'
import { Pause, Play, Stop, SpeakerHigh } from '@phosphor-icons/react'
import { speechVoiceId, useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'

type VoiceControlsProps = {
  text: string
  compact?: boolean
}

function voiceScore(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()
  let score = 0
  if (lang.startsWith('de')) score += 100
  if (name.includes('flo') || name.includes('anna') || name.includes('shelley') || name.includes('siri')) score += 18
  if (name.includes('premium') || name.includes('enhanced')) score += 12
  if (voice.localService) score += 4
  return score
}

function shortVoiceLabel(voice: SpeechSynthesisVoice) {
  const lang = voice.lang.toLowerCase().startsWith('de') ? 'Deutsch' : voice.lang.split('-')[0]?.toUpperCase() || voice.lang
  const cleanName = voice.name.replace(/\s*\([^)]*\)/g, '').trim()
  return `${cleanName} · ${lang}`
}

export default function VoiceControls({ text, compact = false }: VoiceControlsProps) {
  const { supported, state, voices, selectedVoice, preferences, play, pause, stop, updatePreferences } = useSpeechSynthesis(text)

  const voiceOptions = useMemo(() => {
    const map = new Map<string, SpeechSynthesisVoice>()
    voices
      .slice()
      .sort((a, b) => voiceScore(b) - voiceScore(a))
      .forEach((voice) => {
        const key = `${voice.name}-${voice.lang}`
        if (!map.has(key)) map.set(key, voice)
      })
    const curated = Array.from(map.values()).slice(0, 8)
    if (selectedVoice && !curated.some((voice) => speechVoiceId(voice) === speechVoiceId(selectedVoice))) {
      return [selectedVoice, ...curated].slice(0, 8)
    }
    return curated
  }, [voices, selectedVoice])

  const selectedVoiceId = selectedVoice ? speechVoiceId(selectedVoice) : ''

  if (!supported) {
    return <p className="voice-note">Audio-Briefings werden von diesem Browser nicht unterstützt.</p>
  }

  return (
    <div className={`voice-controls${compact ? ' voice-controls--compact' : ''}`}>
      <button className="voice-icon-btn" type="button" onClick={state === 'playing' ? pause : play} disabled={!preferences.enabled || !text.trim()}>
        {state === 'playing' ? <Pause size={14} weight="bold" /> : <Play size={14} weight="bold" />}
        <span>{state === 'playing' ? 'Pause' : state === 'paused' ? 'Weiter' : 'Play'}</span>
      </button>
      <button className="voice-icon-btn" type="button" onClick={stop} disabled={state === 'idle'}>
        <Stop size={14} weight="bold" />
        <span>Stop</span>
      </button>
      <label className="voice-field">
        <span>Tempo</span>
        <select value={preferences.rate} onChange={(event) => updatePreferences({ rate: Number(event.target.value) })}>
          <option value={0.8}>0.8x</option>
          <option value={0.95}>0.95x</option>
          <option value={1}>1x</option>
          <option value={1.15}>1.15x</option>
          <option value={1.3}>1.3x</option>
        </select>
      </label>
      {voiceOptions.length > 0 && (
        <label className="voice-field voice-field--voice">
          <SpeakerHigh size={13} />
          <select
            value={selectedVoiceId}
            onChange={(event) => {
              const next = voices.find((voice) => speechVoiceId(voice) === event.target.value)
              updatePreferences({ voiceId: next ? speechVoiceId(next) : undefined, voiceName: next?.name })
            }}
          >
            <option value="">Beste Stimme</option>
            {voiceOptions.map((voice) => (
              <option key={speechVoiceId(voice)} value={speechVoiceId(voice)}>{shortVoiceLabel(voice)}</option>
            ))}
          </select>
        </label>
      )}
      {state === 'error' && <span className="voice-state">Konnte nicht gestartet werden.</span>}
    </div>
  )
}
