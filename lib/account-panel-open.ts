/** Open the Festag OS account panel (docked beside the sidebar, like Search). */

export const OPEN_ACCOUNT_PANEL_EVENT = 'festag:open-account-panel'
export const CLOSE_ACCOUNT_PANEL_EVENT = 'festag:close-account-panel'
export const TOGGLE_ACCOUNT_PANEL_EVENT = 'festag:toggle-account-panel'

export function openAccountPanel() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_ACCOUNT_PANEL_EVENT))
}

export function closeAccountPanel() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CLOSE_ACCOUNT_PANEL_EVENT))
}

export function toggleAccountPanel() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TOGGLE_ACCOUNT_PANEL_EVENT))
}
