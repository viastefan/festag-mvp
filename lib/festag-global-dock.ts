/** Body classes + events for shell-level mobile docks (portal / dev). */
export const PORTAL_DOCK_BODY_CLASS = 'festag-portal-dock'
export const DEV_DOCK_BODY_CLASS = 'festag-dev-dock'

export const OPEN_PORTAL_NAV_EVENT = 'festag:open-portal-nav'
export const OPEN_DEV_NAV_EVENT = 'festag:open-dev-nav'

export function openPortalNav() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_PORTAL_NAV_EVENT))
}

export function openDevNav() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_DEV_NAV_EVENT))
}

export function hasPortalDock() {
  if (typeof document === 'undefined') return false
  return document.body.classList.contains(PORTAL_DOCK_BODY_CLASS)
}

export function hasDevDock() {
  if (typeof document === 'undefined') return false
  return document.body.classList.contains(DEV_DOCK_BODY_CLASS)
}
