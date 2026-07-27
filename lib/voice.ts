export type BriefingType =
  | 'dashboard_briefing'
  | 'project_briefing'
  | 'status_report_briefing'
  | 'decision_briefing'
  | 'risk_briefing'
  | 'weekly_briefing'

export type VoicePreferences = {
  enabled: boolean
  statusReportsEnabled: boolean
  projectBriefingsEnabled: boolean
  speechInputEnabled: boolean
  autoBriefings: 'off' | 'manual' | 'daily_prepared'
  voiceId?: string
  voiceName?: string
  rate: number
  pitch: number
}

const VOICE_PREF_KEY = 'festag_voice_preferences'

export const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  enabled: true,
  statusReportsEnabled: true,
  projectBriefingsEnabled: true,
  speechInputEnabled: false,
  autoBriefings: 'manual',
  rate: 0.95,
  pitch: 1,
}

export function getVoicePreferences(): VoicePreferences {
  if (typeof window === 'undefined') return DEFAULT_VOICE_PREFERENCES
  try {
    const raw = window.localStorage.getItem(VOICE_PREF_KEY)
    if (!raw) return DEFAULT_VOICE_PREFERENCES
    const parsed = JSON.parse(raw) as Partial<VoicePreferences>
    return {
      ...DEFAULT_VOICE_PREFERENCES,
      ...parsed,
      rate: Number.isFinite(Number(parsed.rate)) ? Number(parsed.rate) : DEFAULT_VOICE_PREFERENCES.rate,
      pitch: Number.isFinite(Number(parsed.pitch)) ? Number(parsed.pitch) : DEFAULT_VOICE_PREFERENCES.pitch,
    }
  } catch {
    return DEFAULT_VOICE_PREFERENCES
  }
}

export function setVoicePreferences(next: Partial<VoicePreferences>) {
  if (typeof window === 'undefined') return DEFAULT_VOICE_PREFERENCES
  const merged = { ...getVoicePreferences(), ...next }
  try {
    window.localStorage.setItem(VOICE_PREF_KEY, JSON.stringify(merged))
    window.dispatchEvent(new CustomEvent('festag-voice-preferences', { detail: merged }))
  } catch {
    // Private-mode or locked storage should never crash client/dev boards.
  }
  return merged
}

/** Shared German TTS voice picker for Statusbericht / Tagro players. */
export function pickGermanVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  const prefs = getVoicePreferences()
  if (prefs.voiceId) {
    const exact = voices.find((v) => `${v.name}__${v.lang}` === prefs.voiceId)
    if (exact) return exact
  }
  if (prefs.voiceName) {
    const byName = voices.find((v) => v.name === prefs.voiceName)
    if (byName) return byName
  }
  return [...voices]
    .filter((v) => v.lang.toLowerCase().startsWith('de'))
    .sort((a, b) => Number(b.localService) - Number(a.localService))[0] ?? null
}

export const STATUS_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const
export type StatusPlaybackRate = (typeof STATUS_PLAYBACK_RATES)[number]

export function nearestStatusPlaybackRate(rate: number): StatusPlaybackRate {
  return STATUS_PLAYBACK_RATES.reduce((best, candidate) => (
    Math.abs(candidate - rate) < Math.abs(best - rate) ? candidate : best
  ))
}
