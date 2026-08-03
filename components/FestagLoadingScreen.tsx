'use client'

/**
 * FestagLoadingScreen — emergency-only entry gate.
 * Prefer glassy portal assemble. When forced (?tagro-awake=1), show tiny diamonds.
 */

import { useLayoutEffect, useRef } from 'react'
import TagroDiamondDots from '@/components/dashboard/TagroDiamondDots'

export type LoadingSurface = 'portal' | 'dev'

const SESSION_KEY = 'festag_tagro_awake_v5'

function forceAwake(): boolean {
  try {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('tagro-awake') === '1'
  } catch {
    return false
  }
}

function alreadyAwakeThisSession(): boolean {
  try {
    if (forceAwake()) return false
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function markAwakeThisSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch { /* noop */ }
}

export default function FestagLoadingScreen({
  onDone,
  surface = 'portal',
}: {
  onDone: () => void
  surface?: LoadingSurface
}) {
  const calledRef = useRef(false)

  useLayoutEffect(() => {
    if (calledRef.current) return

    // Default: skip immediately — shells use glassy assemble instead.
    if (!forceAwake() || alreadyAwakeThisSession()) {
      calledRef.current = true
      markAwakeThisSession()
      onDone()
      return
    }

    const t = window.setTimeout(() => {
      if (calledRef.current) return
      calledRef.current = true
      markAwakeThisSession()
      onDone()
    }, 900)
    return () => window.clearTimeout(t)
  }, [onDone])

  if (!forceAwake() || alreadyAwakeThisSession()) return null

  return (
    <div className="fls-root" data-surface={surface} role="status" aria-label="Festag wird geladen">
      <style>{CSS}</style>
      <TagroDiamondDots active size={28} />
    </div>
  )
}

const CSS = `
.fls-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F7;
}
.fls-root[data-surface="dev"] { background: #F2F3F5; }
html[data-theme="dark"] .fls-root,
html[data-theme="classic-dark"] .fls-root {
  background: #070708;
}
.fls-root .tdd-dot {
  --dms-dot: #5B647D;
  background: var(--dms-dot);
  width: 5px;
  height: 5px;
}
html[data-theme="dark"] .fls-root .tdd-dot,
html[data-theme="classic-dark"] .fls-root .tdd-dot {
  --dms-dot: rgba(230, 230, 234, 0.72);
}
`
