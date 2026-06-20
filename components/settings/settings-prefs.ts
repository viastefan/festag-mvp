/** Client-only prefs that don't need a profiles column yet. */

export type UiDensity = 'comfortable' | 'compact'
export type ClarityMode = 'executive' | 'detailed' | 'minimal'
export type SignalPriority = 'balanced' | 'risks' | 'decisions' | 'progress'
export type BriefingStyle = 'narrative' | 'bullet' | 'dashboard'

const DENSITY_KEY = 'festag-ui-density'
const REDUCED_MOTION_KEY = 'festag-reduced-motion'
const ANALYTICS_KEY = 'festag-analytics-opt-in'
const PORTAL_PREVIEW_KEY = 'festag-portal-preview'

export function getUiDensity(): UiDensity {
  try {
    const v = localStorage.getItem(DENSITY_KEY)
    return v === 'compact' ? 'compact' : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

export function setUiDensity(mode: UiDensity) {
  try { localStorage.setItem(DENSITY_KEY, mode) } catch {}
  document.documentElement.dataset.festagDensity = mode
  window.dispatchEvent(new CustomEvent('festag-ui-density-change', { detail: { mode } }))
}

export function applyUiDensity(mode: UiDensity) {
  document.documentElement.dataset.festagDensity = mode
}

export function getReducedMotion(): boolean {
  try { return localStorage.getItem(REDUCED_MOTION_KEY) === '1' } catch { return false }
}

export function setReducedMotion(on: boolean) {
  try { localStorage.setItem(REDUCED_MOTION_KEY, on ? '1' : '0') } catch {}
  document.documentElement.dataset.festagReducedMotion = on ? '1' : '0'
}

export function getAnalyticsOptIn(): boolean {
  try { return localStorage.getItem(ANALYTICS_KEY) !== '0' } catch { return true }
}

export function setAnalyticsOptIn(on: boolean) {
  try { localStorage.setItem(ANALYTICS_KEY, on ? '1' : '0') } catch {}
}

export function getPortalPreview(): boolean {
  try { return localStorage.getItem(PORTAL_PREVIEW_KEY) === '1' } catch { return false }
}

export function setPortalPreview(on: boolean) {
  try { localStorage.setItem(PORTAL_PREVIEW_KEY, on ? '1' : '0') } catch {}
  window.dispatchEvent(new CustomEvent('festag-portal-preview', { detail: { active: on } }))
}
