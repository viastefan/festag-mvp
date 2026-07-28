'use client'

/**
 * FestagLoadingScreen — „Tagro Awakens“ (~2.2s)
 *
 * Connection metaphor (not a pulse): silence → focus → two halves connect
 * with a soft primary light → one breath → exit toward the shell mark.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

export type LoadingSurface = 'portal' | 'dev'

const EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]
const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number]
const BREATH = [0.45, 0, 0.55, 1] as [number, number, number, number]

const TOTAL_MS = 2300
const EXIT_MS = 480
const SESSION_KEY = 'festag_tagro_awake_v3'

const STATUS_LINES = [
  'Initializing workspace…',
  'Connecting developers…',
  'Synchronizing project…',
  'Tagro is ready.',
] as const

const STATUS_AT_MS = [280, 780, 1280, 1750] as const

type Phase = 'silence' | 'focus' | 'apart' | 'join' | 'energy' | 'breath' | 'exit'

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
  const [exiting, setExiting] = useState(false)
  const [statusIdx, setStatusIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('silence')
  const calledRef = useRef(false)

  const exitTarget = useMemo(() => {
    if (typeof window === 'undefined') return { x: -36, y: -48 }
    // Drift toward the top-left shell brand (Dev rail / portal sidebar).
    const brandX = surface === 'dev' ? 28 : 36
    const brandY = surface === 'dev' ? 24 : 28
    return {
      x: -(window.innerWidth / 2) + brandX,
      y: -(window.innerHeight / 2) + brandY,
    }
  }, [surface])

  useEffect(() => {
    const finish = () => {
      if (calledRef.current) return
      calledRef.current = true
      markAwakeThisSession()
      onDone()
    }

    if (reduced || alreadyAwakeThisSession()) {
      finish()
      return
    }

    const timers: number[] = []
    // 0–0.3 silence · 0.3–0.8 focus · 0.8–1.0 apart · 1.0–1.25 join · 1.15–1.5 energy · 1.5–2.2 breath · exit
    timers.push(window.setTimeout(() => setPhase('focus'), 300))
    timers.push(window.setTimeout(() => setPhase('apart'), 800))
    timers.push(window.setTimeout(() => setPhase('join'), 1000))
    timers.push(window.setTimeout(() => setPhase('energy'), 1120))
    timers.push(window.setTimeout(() => setPhase('breath'), 1500))
    STATUS_AT_MS.forEach((ms, i) => {
      timers.push(window.setTimeout(() => setStatusIdx(i), ms))
    })
    timers.push(window.setTimeout(() => {
      setPhase('exit')
      setExiting(true)
    }, TOTAL_MS - EXIT_MS))
    timers.push(window.setTimeout(finish, TOTAL_MS))

    return () => { timers.forEach(clearTimeout) }
  }, [onDone, reduced])

  if (reduced || alreadyAwakeThisSession()) return null

  const focused = phase !== 'silence'
  const joined =
    phase === 'join' || phase === 'energy' || phase === 'breath' || phase === 'exit'
  const apart = phase === 'apart'

  return (
    <motion.div
      className="fls-root"
      data-surface={surface}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: EASE_OUT }}
      aria-live="polite"
      aria-label="Festag wird geladen"
      role="status"
    >
      <style>{CSS}</style>
      <div className="fls-wash" aria-hidden="true" />

      <motion.div
        className="fls-stage"
        animate={
          exiting
            ? { opacity: 0, scale: 0.94, x: exitTarget.x * 0.18, y: exitTarget.y * 0.18, filter: 'blur(4px)' }
            : { opacity: 1, scale: 1, x: 0, y: 0, filter: 'blur(0px)' }
        }
        transition={
          exiting
            ? { duration: EXIT_MS / 1000, ease: EASE_OUT }
            : { duration: 0.5, ease: EXPO }
        }
      >
        <motion.div
          className="fls-logo-wrap"
          initial={{ opacity: 0.2, scale: 0.96 }}
          animate={
            exiting
              ? { opacity: 0, scale: 0.92 }
              : phase === 'breath'
                ? { opacity: 1, scale: [1, 1.015, 1] }
                : focused
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0.2, scale: 0.96 }
          }
          transition={
            phase === 'breath'
              ? { duration: 1, times: [0, 0.48, 1], ease: BREATH }
              : focused
                ? { duration: 0.5, ease: EASE_OUT }
                : { duration: 0.28, ease: 'linear' }
          }
          style={{
            filter: focused && !exiting ? 'blur(0px)' : exiting ? 'blur(1.5px)' : 'blur(8px)',
            transition: 'filter 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div className="fls-logo-frame" aria-hidden="true">
            {/* Left / major — appears first */}
            <motion.span
              className="fls-piece fls-piece--a"
              initial={{ x: -10, y: -7, opacity: 0.35 }}
              animate={
                joined
                  ? { x: 0, y: 0, opacity: 1 }
                  : apart
                    ? { x: -11, y: -8, opacity: 1 }
                    : focused
                      ? { x: -6, y: -4, opacity: 0.96 }
                      : { x: -10, y: -7, opacity: 0.4 }
              }
              transition={
                joined
                  ? { type: 'spring', stiffness: 210, damping: 26, mass: 0.95 }
                  : { type: 'spring', stiffness: 160, damping: 28, mass: 1.05, delay: focused ? 0 : 0 }
              }
            />

            {/* Right / minor — follows, then magnets in */}
            <motion.span
              className="fls-piece fls-piece--b"
              initial={{ x: 11, y: 9, opacity: 0.2 }}
              animate={
                joined
                  ? { x: 0, y: 0, opacity: 1 }
                  : apart
                    ? { x: 12, y: 10, opacity: 1 }
                    : focused
                      ? { x: 7, y: 6, opacity: 0.92 }
                      : { x: 11, y: 9, opacity: 0.28 }
              }
              transition={
                joined
                  ? { type: 'spring', stiffness: 220, damping: 24, mass: 0.9, delay: 0.03 }
                  : {
                      type: 'spring',
                      stiffness: 150,
                      damping: 28,
                      mass: 1,
                      delay: focused ? 0.12 : 0,
                    }
              }
            />

            {/* Diffuse primary light — top-left → bottom-right */}
            <motion.span
              className="fls-sweep"
              initial={{ opacity: 0, x: '-60%', y: '-45%' }}
              animate={
                phase === 'energy' || phase === 'breath'
                  ? {
                      opacity: [0, 0.62, 0.35, 0],
                      x: ['-60%', '-10%', '35%', '75%'],
                      y: ['-45%', '-8%', '20%', '55%'],
                    }
                  : { opacity: 0 }
              }
              transition={{ duration: 0.72, ease: EASE_OUT }}
            />

            {/* Soft join pulse at magnetic contact */}
            <motion.span
              className="fls-join-glow"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={
                phase === 'join' || phase === 'energy'
                  ? { opacity: [0, 0.5, 0], scale: [0.85, 1.08, 1.2] }
                  : { opacity: 0, scale: 1 }
              }
              transition={{ duration: 0.58, ease: EASE_OUT, delay: phase === 'join' ? 0.05 : 0 }}
            />
          </div>
        </motion.div>

        <div className="fls-status" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={STATUS_LINES[statusIdx]}
              className="fls-status-line"
              initial={{ opacity: 0, y: 6, filter: 'blur(6px)' }}
              animate={
                exiting
                  ? { opacity: 0, y: -6, filter: 'blur(5px)' }
                  : { opacity: 0.72, y: 0, filter: 'blur(0px)' }
              }
              exit={{ opacity: 0, y: -5, filter: 'blur(5px)' }}
              transition={{ duration: exiting ? 0.42 : 0.34, ease: EASE_OUT }}
            >
              {STATUS_LINES[statusIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

const CSS = `
.fls-root {
  --fls-bg: #E8E9ED;
  --fls-mark: linear-gradient(160deg, #3a3a40 0%, #1e1e20 58%, #2a2a2e 100%);
  --fls-depth:
    drop-shadow(0 0.5px 0 rgba(255,255,255,0.22))
    drop-shadow(0 2px 8px rgba(30,30,32,0.12));
  --fls-status: #5c574e;
  --fls-sweep: rgba(91, 100, 125, 0.42);
  --fls-join: rgba(91, 100, 125, 0.32);
}
.fls-root[data-surface="dev"] {
  --fls-bg: #F2F3F5;
  --fls-status: #5c5c62;
}
html[data-theme="dark"] .fls-root,
html[data-theme="classic-dark"] .fls-root {
  --fls-bg: #070708;
  --fls-mark: linear-gradient(160deg, #f7f8fa 0%, #dfe3ea 52%, #f0f2f5 100%);
  --fls-depth:
    drop-shadow(0 -0.4px 0 rgba(255,255,255,0.28))
    drop-shadow(0 4px 14px rgba(0,0,0,0.45));
  --fls-status: rgba(228, 228, 234, 0.62);
  --fls-sweep: rgba(91, 100, 125, 0.58);
  --fls-join: rgba(91, 100, 125, 0.4);
}
html[data-theme="dark"] .fls-root[data-surface="dev"],
html[data-theme="classic-dark"] .fls-root[data-surface="dev"] {
  --fls-bg: #070708;
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
  will-change: opacity;
}

.fls-wash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: transparent;
}
.fls-root[data-surface="dev"] .fls-wash {
  background: transparent;
}
html[data-theme="dark"] .fls-wash,
html[data-theme="classic-dark"] .fls-wash {
  background: transparent;
}
html[data-theme="dark"] .fls-root[data-surface="dev"] .fls-wash,
html[data-theme="classic-dark"] .fls-root[data-surface="dev"] .fls-wash {
  background: transparent;
}

.fls-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  will-change: transform, opacity;
}

.fls-logo-wrap {
  position: relative;
  will-change: transform, opacity, filter;
}

.fls-logo-frame {
  position: relative;
  width: 92px;
  height: 92px;
  overflow: visible;
}

.fls-piece {
  position: absolute;
  inset: 0;
  display: block;
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
  will-change: transform, opacity;
}

/* Diagonal split along the mark’s connection gap */
.fls-piece--a {
  clip-path: polygon(0% 0%, 100% 0%, 100% 40%, 50% 100%, 0% 100%);
}
.fls-piece--b {
  clip-path: polygon(58% 48%, 100% 44%, 100% 100%, 52% 100%);
}

.fls-sweep {
  position: absolute;
  inset: -28%;
  pointer-events: none;
  border-radius: 50%;
  background: radial-gradient(
    ellipse 48% 42% at 50% 50%,
    var(--fls-sweep) 0%,
    rgba(91, 100, 125, 0.14) 40%,
    transparent 70%
  );
  mix-blend-mode: soft-light;
  filter: blur(14px);
  will-change: transform, opacity;
}

.fls-join-glow {
  position: absolute;
  left: 54%;
  top: 58%;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle, var(--fls-join) 0%, transparent 72%);
  filter: blur(8px);
  will-change: transform, opacity;
}

.fls-status {
  position: relative;
  min-height: 1.4em;
  width: min(280px, 72vw);
  text-align: center;
}

.fls-status-line {
  margin: 0;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 13.5px;
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1.4;
  color: var(--fls-status);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .fls-sweep,
  .fls-join-glow { display: none !important; }
}
`
