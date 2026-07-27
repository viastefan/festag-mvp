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
        <div className="fls-logo-frame" aria-hidden="true">
          <span className="fls-logo-mark" />
          <span className="fls-pulse-ring" />
        </div>
      </motion.div>
    </motion.div>
  )
}

const CSS = `
.fls-root {
  --fls-bg:     #f7f8f8;
  --fls-ring:   rgba(30,30,32,0.10);
  --fls-mark:   linear-gradient(160deg, #3a3a40 0%, #1e1e20 58%, #2a2a2e 100%);
  --fls-depth:
    drop-shadow(0 0.5px 0 rgba(255,255,255,0.28))
    drop-shadow(0 2px 6px rgba(30,30,32,0.14));
}
html[data-theme="dark"] .fls-root,
html[data-theme="classic-dark"] .fls-root {
  --fls-bg:     #070708;
  --fls-ring:   rgba(255,255,255,0.14);
  --fls-mark:   linear-gradient(160deg, #f7f8fa 0%, #dfe3ea 52%, #f0f2f5 100%);
  --fls-depth:
    drop-shadow(0 -0.4px 0 rgba(255,255,255,0.35))
    drop-shadow(0 3px 10px rgba(0,0,0,0.5));
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
  width: 88px;
  height: 88px;
  overflow: visible;
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
  filter: var(--fls-depth);
}

.fls-pulse-ring {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
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
