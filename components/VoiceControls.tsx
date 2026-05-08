'use client'

import { useMemo, useState } from 'react'
import { Pause, Play, Stop, SpeakerHigh } from '@phosphor-icons/react'
import { speechVoiceId, useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'

type VoiceControlsProps = {
  text: string
  compact?: boolean
}

export default function VoiceControls({ text, compact = false }: VoiceControlsProps) {
  const [showAllVoices, setShowAllVoices] = useState(false)
  const { supported, state, voices, selectedVoice, preferences, play, pause, stop, updatePreferences } = useSpeechSynthesis(text)

  const voiceOptions = useMemo(() => {
    const german = voices.filter((voice) => voice.lang.toLowerCase().startsWith('de'))
    const preferred = german.length ? german : voices.slice(0, 8)
    return showAllVoices ? voices : preferred
  }, [showAllVoices, voices])

  const selectedVoiceId = selectedVoice ? speechVoiceId(selectedVoice) : ''

  function voiceLabel(voice: SpeechSynthesisVoice) {
    const lang = voice.lang.toLowerCase().startsWith('de') ? 'Deutsch' : voice.lang
    return `${voice.name} · ${lang}`
  }

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
          <select
            value={selectedVoiceId}
            onChange={(event) => {
              const next = voices.find((voice) => speechVoiceId(voice) === event.target.value)
              updatePreferences({ voiceId: next ? speechVoiceId(next) : undefined, voiceName: next?.name })
            }}
          >
            <option value="">Beste deutsche Stimme</option>
            {voiceOptions.map((voice) => (
              <option key={speechVoiceId(voice)} value={speechVoiceId(voice)}>{voiceLabel(voice)}</option>
            ))}
          </select>
        </label>
      )}
      {voices.length > voiceOptions.length && (
        <button className="voice-text-btn" type="button" onClick={() => setShowAllVoices(true)}>
          Alle Stimmen
        </button>
      )}
      {showAllVoices && (
        <button className="voice-text-btn" type="button" onClick={() => setShowAllVoices(false)}>
          Nur Deutsch
        </button>
      )}
      {state === 'error' && <span className="voice-state">Konnte nicht gestartet werden.</span>}
    </div>
  )
}
