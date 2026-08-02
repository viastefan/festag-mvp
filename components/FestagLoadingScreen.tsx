'use client'

/**
 * FestagLoadingScreen — workspace entry.
 *
 * Only the Festag mark in 3D: builds mirror-reversed, flips back to correct,
 * settles. No status copy, no rectangles, no extra chrome.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export type LoadingSurface = 'portal' | 'dev'

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]
const TOTAL_MS = 2600
const EXIT_MS = 420
const SESSION_KEY = 'festag_tagro_awake_v4'

type Phase = 'enter' | 'mirror' | 'correct' | 'settle' | 'exit'

function alreadyAwakeThisSession(): boolean {
  try {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search)
      if (q.get('tagro-awake') === '1') return false
    }
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
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('enter')
  const calledRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const finish = () => {
    if (calledRef.current) return
    calledRef.current = true
    markAwakeThisSession()
    onDoneRef.current()
  }

  // Skip path must not wait for useEffect — avoids a blank hang before onDone.
  useLayoutEffect(() => {
    if (reduced || alreadyAwakeThisSession()) finish()
  }, [reduced])

  useEffect(() => {
    if (reduced || alreadyAwakeThisSession()) return

    const timers: number[] = []
    timers.push(window.setTimeout(() => setPhase('mirror'), 80))
    timers.push(window.setTimeout(() => setPhase('correct'), 900))
    timers.push(window.setTimeout(() => setPhase('settle'), 1750))
    timers.push(window.setTimeout(() => setPhase('exit'), TOTAL_MS - EXIT_MS))
    timers.push(window.setTimeout(finish, TOTAL_MS))
    // Hard cap if cleanup raced mid-animation.
    timers.push(window.setTimeout(finish, TOTAL_MS + 800))

    return () => { timers.forEach(clearTimeout) }
    // Intentionally omit onDone — parent inline arrows remount timers forever.
  }, [reduced])

  if (reduced || alreadyAwakeThisSession()) return null

  const exiting = phase === 'exit'

  /* Mirror build → flip to face → settle. rotateY 180 = spiegelverkehrt. */
  const logoMotion =
    phase === 'enter'
      ? { opacity: 0, rotateY: 180, rotateX: 14, scale: 0.72 }
      : phase === 'mirror'
        ? { opacity: 1, rotateY: 180, rotateX: 8, scale: 1 }
        : phase === 'correct'
          ? { opacity: 1, rotateY: 0, rotateX: -5, scale: 1.05 }
          : phase === 'settle'
            ? { opacity: 1, rotateY: 0, rotateX: 0, scale: 1 }
            : { opacity: 0, rotateY: 0, rotateX: 0, scale: 0.94 }

  return (
    <motion.div
      className="fls-root"
      data-surface={surface}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: EASE }}
      aria-live="polite"
      aria-label="Festag wird geladen"
      role="status"
    >
      <style>{CSS}</style>
      <div className="fls-scene" aria-hidden="true">
        <motion.div
          className="fls-logo"
          initial={{ opacity: 0, rotateY: 180, rotateX: 16, scale: 0.68 }}
          animate={logoMotion}
          transition={
            phase === 'mirror'
              ? { duration: 0.82, ease: EASE }
              : phase === 'correct'
                ? { duration: 0.9, ease: EASE }
                : phase === 'settle'
                  ? { duration: 0.58, ease: EASE }
                  : { duration: EXIT_MS / 1000, ease: EASE }
          }
          style={{ transformStyle: 'preserve-3d', transformPerspective: 920 }}
        >
          <span className="fls-mark" />
        </motion.div>
      </div>
    </motion.div>
  )
}

const CSS = `
.fls-root {
  --fls-bg: #F5F5F7;
  --fls-mark: linear-gradient(160deg, #3a3a40 0%, #1e1e20 58%, #2a2a2e 100%);
  --fls-depth:
    drop-shadow(0 0.5px 0 rgba(255,255,255,0.22))
    drop-shadow(0 8px 22px rgba(30,30,32,0.16))
    drop-shadow(0 2px 6px rgba(30,30,32,0.1));
}
.fls-root[data-surface="dev"] {
  --fls-bg: #F2F3F5;
}
html[data-theme="dark"] .fls-root,
html[data-theme="classic-dark"] .fls-root {
  --fls-bg: #070708;
  --fls-mark: linear-gradient(160deg, #f7f8fa 0%, #dfe3ea 52%, #f0f2f5 100%);
  --fls-depth:
    drop-shadow(0 -0.4px 0 rgba(255,255,255,0.22))
    drop-shadow(0 10px 28px rgba(0,0,0,0.55))
    drop-shadow(0 2px 8px rgba(0,0,0,0.35));
}

.fls-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fls-bg);
  overflow: hidden;
  perspective: 920px;
  perspective-origin: 50% 46%;
}

.fls-scene {
  position: relative;
  width: 112px;
  height: 112px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
}

.fls-logo {
  width: 96px;
  height: 96px;
  transform-style: preserve-3d;
  will-change: transform, opacity;
  backface-visibility: hidden;
}

.fls-mark {
  display: block;
  width: 100%;
  height: 100%;
  -webkit-mask-image: url(/brand/festag-mark.png?v=20260727-cutout);
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-mode: alpha;
  mask-image: url(/brand/festag-mark.png?v=20260727-cutout);
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-mode: alpha;
  background: var(--fls-mark);
  filter: var(--fls-depth);
  transform: translateZ(0);
}

@media (prefers-reduced-motion: reduce) {
  .fls-logo { transform: none !important; }
}
`
