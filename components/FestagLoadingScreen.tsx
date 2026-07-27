'use client'

/**
 * FestagLoadingScreen — „Tagro Awakens“
 *
 * Calm system-awakening boot (≈2.2s), not a generic pulse:
 * silence → focus → connect (two mark halves) → soft light → one breath → exit.
 * Status line replaces in place. Exit: 92% scale + fade toward the shell.
 */

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]
const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number]
const BREATH = [0.45, 0, 0.55, 1] as [number, number, number, number]

const TOTAL_MS = 2200
const EXIT_MS = 420
const SESSION_KEY = 'festag_tagro_awake_v1'

const STATUS_LINES = [
  'Initializing workspace…',
  'Connecting developers…',
  'Synchronizing project…',
  'Tagro is ready.',
] as const

const STATUS_AT_MS = [280, 780, 1280, 1700] as const

function alreadyAwakeThisSession(): boolean {
  try {
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

export default function FestagLoadingScreen({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()
  const [exiting, setExiting] = useState(false)
  const [statusIdx, setStatusIdx] = useState(0)
  const [phase, setPhase] = useState<'silence' | 'focus' | 'connect' | 'breath' | 'exit'>('silence')
  const calledRef = useRef(false)

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
    timers.push(window.setTimeout(() => setPhase('focus'), 300))
    timers.push(window.setTimeout(() => setPhase('connect'), 800))
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

  const joined = phase === 'connect' || phase === 'breath' || phase === 'exit'
  const focused = phase !== 'silence'

  return (
    <motion.div
      className="fls-root"
      animate={{
        opacity: exiting ? 0 : 1,
      }}
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
            ? { opacity: 0, scale: 0.92, y: -12, x: -18 }
            : { opacity: 1, scale: 1, y: 0, x: 0 }
        }
        transition={
          exiting
            ? { duration: EXIT_MS / 1000, ease: EASE_OUT }
            : { duration: 0.45, ease: EXPO }
        }
      >
        <motion.div
          className="fls-logo-wrap"
          initial={{ opacity: 0.2, scale: 0.96 }}
          animate={
            exiting
              ? { opacity: 0, scale: 0.92 }
              : focused
                ? {
                    opacity: 1,
                    scale: phase === 'breath' ? [1, 1.015, 1] : 1,
                  }
                : { opacity: 0.2, scale: 0.96 }
          }
          transition={
            phase === 'breath'
              ? { duration: 1, times: [0, 0.5, 1], ease: BREATH }
              : focused
                ? { duration: 0.5, ease: EASE_OUT }
                : { duration: 0.25, ease: 'linear' }
          }
          style={{
            filter: focused && !exiting ? 'blur(0px)' : exiting ? 'blur(2px)' : 'blur(8px)',
            transition: 'filter 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div className="fls-logo-frame" aria-hidden="true">
            {/* Major half — top-left mass */}
            <motion.span
              className="fls-piece fls-piece--a"
              initial={{ x: -7, y: -5, opacity: 0.55 }}
              animate={
                joined
                  ? { x: 0, y: 0, opacity: 1 }
                  : focused
                    ? { x: -5, y: -4, opacity: 0.92 }
                    : { x: -7, y: -5, opacity: 0.55 }
              }
              transition={{
                type: 'spring',
                stiffness: 180,
                damping: 28,
                mass: 1.05,
                delay: joined ? 0 : 0,
              }}
            />
            {/* Minor half — bottom-right connector */}
            <motion.span
              className="fls-piece fls-piece--b"
              initial={{ x: 8, y: 7, opacity: 0.45 }}
              animate={
                joined
                  ? { x: 0, y: 0, opacity: 1 }
                  : focused
                    ? { x: 6, y: 5, opacity: 0.88 }
                    : { x: 8, y: 7, opacity: 0.45 }
              }
              transition={{
                type: 'spring',
                stiffness: 190,
                damping: 30,
                mass: 1,
                delay: joined ? 0.04 : 0.08,
              }}
            />

            {/* Soft primary light sweep — diffuse, not chrome shine */}
            <motion.span
              className="fls-sweep"
              initial={{ opacity: 0, x: '-55%', y: '-40%' }}
              animate={
                phase === 'connect' || phase === 'breath'
                  ? { opacity: [0, 0.55, 0], x: ['-55%', '10%', '70%'], y: ['-40%', '0%', '45%'] }
                  : { opacity: 0 }
              }
              transition={{ duration: 0.7, ease: EASE_OUT, delay: phase === 'connect' ? 0.12 : 0 }}
            />

            {/* Brief connection pulse at join */}
            <motion.span
              className="fls-join-glow"
              initial={{ opacity: 0, scale: 0.86 }}
              animate={
                phase === 'connect'
                  ? { opacity: [0, 0.42, 0], scale: [0.9, 1.06, 1.12] }
                  : { opacity: 0, scale: 1 }
              }
              transition={{ duration: 0.55, ease: EASE_OUT, delay: 0.18 }}
            />
          </div>
        </motion.div>

        <div className="fls-status" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={STATUS_LINES[statusIdx]}
              className="fls-status-line"
              initial={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
              animate={{ opacity: 0.72, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -3, filter: 'blur(3px)' }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
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
  --fls-bg: #F4F0E8;
  --fls-mark: linear-gradient(160deg, #3a3a40 0%, #1e1e20 58%, #2a2a2e 100%);
  --fls-depth:
    drop-shadow(0 0.5px 0 rgba(255,255,255,0.22))
    drop-shadow(0 2px 8px rgba(40,34,28,0.12));
  --fls-status: #5c574e;
  --fls-sweep: rgba(91, 100, 125, 0.38);
  --fls-join: rgba(91, 100, 125, 0.28);
}
html[data-theme="dark"] .fls-root,
html[data-theme="classic-dark"] .fls-root {
  --fls-bg: #070708;
  --fls-mark: linear-gradient(160deg, #f7f8fa 0%, #dfe3ea 52%, #f0f2f5 100%);
  --fls-depth:
    drop-shadow(0 -0.4px 0 rgba(255,255,255,0.28))
    drop-shadow(0 4px 14px rgba(0,0,0,0.45));
  --fls-status: rgba(228, 228, 234, 0.62);
  --fls-sweep: rgba(91, 100, 125, 0.55);
  --fls-join: rgba(188, 128, 72, 0.22);
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
  background:
    radial-gradient(ellipse 90% 65% at 14% 8%, rgba(236, 176, 128, 0.22), transparent 58%),
    radial-gradient(ellipse 55% 45% at 84% 14%, rgba(91, 100, 125, 0.12), transparent 55%),
    radial-gradient(ellipse 75% 55% at 88% 88%, rgba(220, 154, 108, 0.14), transparent 60%);
}
html[data-theme="dark"] .fls-wash,
html[data-theme="classic-dark"] .fls-wash {
  background:
    radial-gradient(ellipse 100% 75% at 6% -8%, rgba(188, 128, 72, 0.28), transparent 56%),
    radial-gradient(ellipse 85% 60% at 94% 16%, rgba(150, 104, 62, 0.16), transparent 58%),
    radial-gradient(ellipse 55% 45% at 72% 58%, rgba(91, 100, 125, 0.12), transparent 60%),
    linear-gradient(145deg, rgba(52, 38, 26, 0.55) 0%, transparent 42%, transparent 58%, rgba(32, 24, 18, 0.35) 100%);
}

.fls-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  will-change: transform, opacity, filter;
}

.fls-logo-wrap {
  position: relative;
  will-change: transform, opacity, filter;
}

.fls-logo-frame {
  position: relative;
  width: 88px;
  height: 88px;
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
  clip-path: polygon(0% 0%, 100% 0%, 100% 46%, 54% 100%, 0% 100%);
}
.fls-piece--b {
  clip-path: polygon(58% 52%, 100% 52%, 100% 100%, 52% 100%);
}

.fls-sweep {
  position: absolute;
  inset: -20%;
  pointer-events: none;
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    var(--fls-sweep) 0%,
    rgba(91, 100, 125, 0.12) 38%,
    transparent 68%
  );
  mix-blend-mode: soft-light;
  filter: blur(10px);
  will-change: transform, opacity;
}

.fls-join-glow {
  position: absolute;
  left: 52%;
  top: 58%;
  width: 36px;
  height: 36px;
  margin: -18px 0 0 -18px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle, var(--fls-join) 0%, transparent 70%);
  filter: blur(6px);
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
