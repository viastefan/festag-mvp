'use client'

/**
 * FestagLoadingScreen — clean short boot.
 *
 * Single mark + calm German status. No half-assembly, no clip-path seams,
 * no wireframe rectangles inside the logo. Always finishes (hard timeout).
 */

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]
const PLAY_MS = 1400
const EXIT_MS = 320
const HARD_MAX_MS = 2200
const SESSION_KEY = 'festag-boot-seen'

const STATUS_LINES = ['Workspace einrichten…', 'Festag startet…'] as const

/** Survives React remounts so boot cannot hang if the parent re-creates the tree. */
let bootWallStartedAt = 0

export default function FestagLoadingScreen({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()
  const [exiting, setExiting] = useState(false)
  const [statusIdx, setStatusIdx] = useState(0)
  const onDoneRef = useRef(onDone)
  const finishedRef = useRef(false)

  onDoneRef.current = onDone

  function finish() {
    if (finishedRef.current) return
    finishedRef.current = true
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      /* noop */
    }
    onDoneRef.current()
  }

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        finish()
        return
      }
    } catch {
      /* noop */
    }

    if (reduced) {
      finish()
      return
    }

    if (!bootWallStartedAt) bootWallStartedAt = Date.now()
    const elapsed = Date.now() - bootWallStartedAt
    if (elapsed >= PLAY_MS) {
      finish()
      return
    }

    const remaining = Math.max(80, PLAY_MS - elapsed)
    const exitIn = Math.max(40, remaining - EXIT_MS)

    const statusTimer = window.setInterval(() => {
      setStatusIdx((i) => Math.min(i + 1, STATUS_LINES.length - 1))
    }, 620)

    const exitTimer = window.setTimeout(() => setExiting(true), exitIn)
    const doneTimer = window.setTimeout(finish, remaining)
    const hardTimer = window.setTimeout(finish, Math.max(remaining, HARD_MAX_MS - elapsed))

    return () => {
      clearInterval(statusTimer)
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
      clearTimeout(hardTimer)
    }
    // Intentionally empty deps: timers must not restart when parent recreates onDone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  if (reduced) return null

  return (
    <motion.div
      className="fls-root"
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: 'easeOut' }}
      aria-live="polite"
      aria-label="Festag wird geladen"
      role="status"
    >
      <style>{CSS}</style>
      <div className="fls-wash" aria-hidden="true" />

      <div className="fls-stage">
        <motion.div
          className="fls-logo-wrap"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={
            exiting
              ? { opacity: 0, scale: 1.02 }
              : { opacity: 1, scale: 1 }
          }
          transition={{ duration: exiting ? EXIT_MS / 1000 : 0.7, ease: EXPO }}
        >
          <span className="fls-logo-mark" aria-hidden="true" />
        </motion.div>

        <div className="fls-status" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={STATUS_LINES[statusIdx]}
              className="fls-status-line"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.32, ease: EXPO }}
            >
              {STATUS_LINES[statusIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

const CSS = `
.fls-root {
  --fls-bg: #F4F0E8;
  --fls-mark: linear-gradient(160deg, #3a3a40 0%, #1e1e20 58%, #2a2a2e 100%);
  --fls-status: #5c574e;
}
html[data-theme="dark"] .fls-root,
html[data-theme="classic-dark"] .fls-root {
  --fls-bg: #000000;
  --fls-mark: linear-gradient(160deg, #f7f8fa 0%, #dfe3ea 52%, #f0f2f5 100%);
  --fls-status: rgba(228, 228, 234, 0.62);
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
    radial-gradient(ellipse 90% 65% at 14% 8%, rgba(236, 176, 128, 0.20), transparent 58%),
    radial-gradient(ellipse 55% 45% at 84% 14%, rgba(91, 100, 125, 0.10), transparent 55%),
    radial-gradient(ellipse 75% 55% at 88% 88%, rgba(220, 154, 108, 0.12), transparent 60%);
}
html[data-theme="dark"] .fls-wash,
html[data-theme="classic-dark"] .fls-wash {
  background:
    radial-gradient(ellipse 100% 75% at 6% -8%, rgba(188, 128, 72, 0.22), transparent 56%),
    radial-gradient(ellipse 85% 60% at 94% 16%, rgba(150, 104, 62, 0.12), transparent 58%),
    radial-gradient(ellipse 55% 45% at 72% 58%, rgba(91, 100, 125, 0.08), transparent 60%);
}

.fls-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.fls-logo-wrap {
  width: 72px;
  height: 72px;
}

.fls-logo-mark {
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
}

.fls-status {
  min-height: 1.4em;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fls-status-line {
  margin: 0;
  font-family: 'Aeonik', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.4;
  color: var(--fls-status);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .fls-root { display: none; }
}
`
