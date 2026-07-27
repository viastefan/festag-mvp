/** Global Statusbericht player — open/expand from anywhere in the Client Panel. */

export const OPEN_STATUS_PLAYER_EVENT = 'festag:open-status-player'

export type OpenStatusPlayerDetail = {
  /** Expand the player sheet immediately (default true). */
  expand?: boolean
  /** Start or resume playback. */
  play?: boolean
  /** Open directly in fullscreen (mobile page handoff). */
  fullscreen?: boolean
}

export function openStatusPlayer(detail: OpenStatusPlayerDetail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_STATUS_PLAYER_EVENT, {
    detail: {
      expand: detail.expand !== false,
      play: !!detail.play,
    },
  }))
}
