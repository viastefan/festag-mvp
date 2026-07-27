'use client'

/**
 * FestagLoadingScreen — calm logo boot.
 *
 * Logo only: fade in, one soft pulse, fade out. No wordmark, no orbit, no shine.
 * Total ≈ 1.2 s play + 0.35 s exit.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]
const PLAY_MS = 1200
const EXIT_MS = 350

export default function FestagLoadingScreen({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()
  const [exiting, setExiting] = useState(false)
  const calledRef = useRef(false)

  useEffect(() => {
    if (reduced) {
      if (!calledRef.current) { calledRef.current = true; onDone() }
      return
    }
    const exitTimer = window.setTimeout(() => setExiting(true), PLAY_MS - EXIT_MS)
    const doneTimer = window.setTimeout(() => {
      if (!calledRef.current) { calledRef.current = true; onDone() }
    }, PLAY_MS)
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer) }
  }, [onDone, reduced])

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

      <motion.div
        className="fls-logo-wrap"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={
          exiting
            ? { opacity: 0, scale: 0.98 }
            : { opacity: 1, scale: [0.94, 1, 1.024, 1, 1.012, 1] }
        }
        transition={
          exiting
            ? { duration: EXIT_MS / 1000, ease: 'easeOut' }
            : {
                duration: (PLAY_MS - EXIT_MS) / 1000,
                times: [0, 0.32, 0.52, 0.68, 0.84, 1],
                ease: EXPO,
              }
        }
      >
        <div className="fls-logo-frame">
          <img
            className="fls-logo fls-logo--light"
            src="/brand/auth-logo-light-3d.png?v=20260727"
            alt=""
            draggable={false}
          />
          <img
            className="fls-logo fls-logo--dark"
            src="/brand/auth-logo-dark.png?v=20260725-soft3d"
            alt=""
            draggable={false}
          />
          <span className="fls-pulse-ring" aria-hidden="true" />
        </div>
      </motion.div>
    </motion.div>
  )
}

const CSS = `
.fls-root {
  --fls-bg:     #f7f8f8;
  --fls-shadow: 0 12px 40px rgba(30,30,32,0.10), 0 2px 8px rgba(30,30,32,0.07);
  --fls-ring:   rgba(30,30,32,0.10);
}
html[data-theme="dark"] .fls-root,
html[data-theme="classic-dark"] .fls-root {
  --fls-bg:     #0B0F0D;
  --fls-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6);
  --fls-ring:   rgba(255,255,255,0.14);
}

.fls-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fls-bg);
  will-change: opacity;
}

.fls-logo-wrap {
  position: relative;
}

.fls-logo-frame {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 28px;
  overflow: visible;
  box-shadow: var(--fls-shadow);
}

.fls-logo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  border-radius: inherit;
  user-select: none;
  pointer-events: none;
}

.fls-logo--light { display: block; }
.fls-logo--dark  { display: none; }
html[data-theme="dark"] .fls-logo--light,
html[data-theme="classic-dark"] .fls-logo--light { display: none; }
html[data-theme="dark"] .fls-logo--dark,
html[data-theme="classic-dark"] .fls-logo--dark  { display: block; }

.fls-pulse-ring {
  position: absolute;
  inset: -10px;
  border-radius: 38px;
  border: 1px solid var(--fls-ring);
  opacity: 0;
  pointer-events: none;
  animation: flsPulseRing 0.95s 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes flsPulseRing {
  0%   { transform: scale(0.94); opacity: 0; }
  18%  { opacity: 0.55; }
  100% { transform: scale(1.14); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .fls-pulse-ring { animation: none !important; }
}
`
