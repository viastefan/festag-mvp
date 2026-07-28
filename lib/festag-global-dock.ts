/** Body class + events for Execution Panel mobile dock. */
export const DEV_DOCK_BODY_CLASS = 'festag-dev-dock'

export const OPEN_DEV_NAV_EVENT = 'festag:open-dev-nav'

export function openDevNav() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_DEV_NAV_EVENT))
}

export function hasDevDock() {
  if (typeof document === 'undefined') return false
  return document.body.classList.contains(DEV_DOCK_BODY_CLASS)
}
