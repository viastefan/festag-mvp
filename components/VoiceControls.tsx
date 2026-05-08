'use client'

import { Pause, Play, Stop, SpeakerHigh } from '@phosphor-icons/react'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'

type VoiceControlsProps = {
  text: string
  compact?: boolean
}

export default function VoiceControls({ text, compact = false }: VoiceControlsProps) {
  const { supported, state, voices, preferences, play, pause, stop, updatePreferences } = useSpeechSynthesis(text)

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
      {voices.length > 0 && (
        <label className="voice-field voice-field--voice">
          <SpeakerHigh size={13} />
          <select value={preferences.voiceName ?? ''} onChange={(event) => updatePreferences({ voiceName: event.target.value || undefined })}>
            <option value="">Systemstimme</option>
            {voices.map((voice) => (
              <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name}</option>
            ))}
          </select>
        </label>
      )}
      {state === 'error' && <span className="voice-state">Konnte nicht gestartet werden.</span>}
    </div>
  )
}
