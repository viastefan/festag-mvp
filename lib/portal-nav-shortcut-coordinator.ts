/**
 * Single active nav shortcut tip — Linear-style.
 * Only one hover target can show a shortcut at a time.
 */

const HOVER_DELAY_MS = 2000
const VISIBLE_MS = 2000

type Listener = (activeHref: string | null) => void

const listeners = new Set<Listener>()
let hoverTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let armedHref: string | null = null
let activeHref: string | null = null

function emit() {
  listeners.forEach(fn => { fn(activeHref) })
}

function clearTimers() {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function resetAll() {
  clearTimers()
  armedHref = null
  activeHref = null
  emit()
}

export function subscribeNavShortcutTip(listener: Listener) {
  listeners.add(listener)
  listener(activeHref)
  return () => { listeners.delete(listener) }
}

export function getNavShortcutActiveHref() {
  return activeHref
}

/** Pointer entered a nav row — cancels any other pending/visible tip first. */
export function navShortcutPointerEnter(href: string) {
  clearTimers()
  armedHref = href
  activeHref = null
  emit()

  hoverTimer = setTimeout(() => {
    hoverTimer = null
    if (armedHref !== href) return
    activeHref = href
    emit()
    hideTimer = setTimeout(() => {
      hideTimer = null
      if (activeHref === href) resetAll()
    }, VISIBLE_MS)
  }, HOVER_DELAY_MS)
}

/** Pointer left a nav row — only clear if it owns the current arm/active state. */
export function navShortcutPointerLeave(href: string) {
  if (armedHref !== href && activeHref !== href) return
  resetAll()
}

export function navShortcutDismissAll() {
  resetAll()
}
