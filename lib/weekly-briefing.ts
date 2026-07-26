export const OPEN_WEEKLY_BRIEFING_EVENT = 'festag:open-weekly-briefing'

export function openWeeklyBriefing() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_WEEKLY_BRIEFING_EVENT))
}
