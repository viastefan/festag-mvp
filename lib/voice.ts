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
    return { ...DEFAULT_VOICE_PREFERENCES, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_VOICE_PREFERENCES
  }
}

export function setVoicePreferences(next: Partial<VoicePreferences>) {
  if (typeof window === 'undefined') return DEFAULT_VOICE_PREFERENCES
  const merged = { ...getVoicePreferences(), ...next }
  window.localStorage.setItem(VOICE_PREF_KEY, JSON.stringify(merged))
  window.dispatchEvent(new CustomEvent('festag-voice-preferences', { detail: merged }))
  return merged
}
