'use client'

/**
 * FestagLoadingScreen — premium OS-style boot animation.
 *
 * Sequence (total ≈ 2.3 s play + 0.4 s exit = 2.7 s):
 *  00 – 700 ms   Logo fades in (opacity 0→1, scale 0.92→1, blur 8→0, easeOutExpo)
 *  600 – 1 700 ms Thin orbit arc + glow dot travel once around the logo
 *  1 050 – 1 600 ms Diagonal shine sweep
 *  1 700 – 2 000 ms Gentle pulse (scale 1→1.015→1)
 *  1 900 ms       Exit fade starts (opacity 1→0, scale 1→0.97, 400 ms)
 *  2 300 ms       onDone() — parent removes the overlay, app content appears
 *
 * Respects prefers-reduced-motion: collapses to a fast 300 ms fade.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/* easeOutExpo bezier */
const EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]
/* Orbit geometry */
const R = 88
const CIRC = +(2 * Math.PI * R).toFixed(1) // ≈ 552.9

const PLAY_MS = 2300 // total play time before onDone
const EXIT_MS = 400  // fade-out duration (overlaps last 400 ms of play)

/* ─── Component ────────────────────────────────────────────────── */

export default function FestagLoadingScreen({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()
  const [exiting, setExiting] = useState(false)
  const calledRef = useRef(false)

  useEffect(() => {
    if (reduced) {
      if (!calledRef.current) { calledRef.current = true; onDone() }
      return
    }
    const exitTimer  = window.setTimeout(() => setExiting(true), PLAY_MS - EXIT_MS)
    const doneTimer  = window.setTimeout(() => {
      if (!calledRef.current) { calledRef.current = true; onDone() }
    }, PLAY_MS)
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer) }
  }, [onDone, reduced])

  if (reduced) return null

  return (
    <motion.div
      className="fls-root"
      animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 0.97 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: 'easeOut' }}
      aria-live="polite"
      aria-label="Festag wird geladen"
      role="status"
    >
      <style>{CSS}</style>

      {/* ── Orbit ring (SVG arc + glow dot) ─────────────────────── */}
      <div className="fls-orbit-wrap" aria-hidden="true">
        <svg
          className="fls-orbit-svg"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Very faint track */}
          <circle cx="100" cy="100" r={R} className="fls-track" />
          {/* Traveling arc */}
          <circle
            cx="100" cy="100" r={R}
            className="fls-arc"
            style={{ '--circ': CIRC } as React.CSSProperties}
          />
          {/* Glow dot group — rotates around center */}
          <g className="fls-dot-group" style={{ transformOrigin: '100px 100px' }}>
            <circle cx="100" cy={100 - R} r="2.5" className="fls-dot" />
          </g>
        </svg>
      </div>

      {/* ── Logo ─────────────────────────────────────────────────── */}
      <motion.div
        className="fls-logo-outer"
        initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
        animate={{
          opacity:  [0, 1, 1, 1, 1.015, 1],
          scale:    [0.92, 1, 1, 1, 1.015, 1],
          filter:   ['blur(8px)', 'blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
        }}
        transition={{
          duration: PLAY_MS / 1000,
          times: [0, 0.3, 0.73, 0.8, 0.9, 1],
          ease: EXPO,
        }}
      >
        <div className="fls-logo-frame">
          {/* Light mode logo */}
          <img
            className="fls-logo fls-logo--light"
            src="/brand/auth-logo-light-3d.png?v=20260727"
            alt=""
            draggable={false}
          />
          {/* Dark mode logo */}
          <img
            className="fls-logo fls-logo--dark"
            src="/brand/auth-logo-dark.png?v=20260725-soft3d"
            alt=""
            draggable={false}
          />
          {/* Shine sweep */}
          <div className="fls-shine" aria-hidden="true" />
        </div>
      </motion.div>

      {/* ── Text ─────────────────────────────────────────────────── */}
      <motion.div
        className="fls-text"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.42, ease: EXPO }}
      >
        <span className="fls-wordmark">F E S T A G</span>
        <span className="fls-tagline">Building structure. Creating clarity.</span>
      </motion.div>
    </motion.div>
  )
}

/* ─── CSS ───────────────────────────────────────────────────────── */

const CSS = `
/* ── Tokens ─────────────────────────────────────────── */
.fls-root {
  --fls-bg:           #f7f8f8;
  --fls-text:         rgba(30,30,32,0.92);
  --fls-muted:        rgba(30,30,32,0.38);
  --fls-track:        rgba(30,30,32,0.06);
  --fls-arc:          rgba(30,30,32,0.18);
  --fls-arc-glow:     none;
  --fls-dot-fill:     rgba(30,30,32,0.22);
  --fls-dot-filter:   none;
  --fls-shine:        rgba(255,255,255,0.72);
  --fls-shadow:       0 12px 40px rgba(30,30,32,0.10), 0 2px 8px rgba(30,30,32,0.07);
}
html[data-theme="dark"] .fls-root,
html[data-theme="classic-dark"] .fls-root {
  --fls-bg:           #000000;
  --fls-text:         rgba(245,245,247,0.94);
  --fls-muted:        rgba(245,245,247,0.36);
  --fls-track:        rgba(255,255,255,0.05);
  --fls-arc:          rgba(255,255,255,0.55);
  --fls-arc-glow:     filter: drop-shadow(0 0 4px rgba(255,255,255,0.6));
  --fls-dot-fill:     #ffffff;
  --fls-dot-filter:   drop-shadow(0 0 4px rgba(255,255,255,0.9)) drop-shadow(0 0 10px rgba(255,255,255,0.45));
  --fls-shine:        rgba(255,255,255,0.28);
  --fls-shadow:       0 20px 60px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6);
}

/* ── Shell ───────────────────────────────────────────── */
.fls-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  background: var(--fls-bg);
  will-change: opacity, transform;
  /* Smooth transition away */
  transform-origin: center center;
}

/* ── Orbit ───────────────────────────────────────────── */
.fls-orbit-wrap {
  position: absolute;
  width: 224px;
  height: 224px;
  pointer-events: none;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.fls-orbit-svg {
  width: 100%;
  height: 100%;
  /* Start arc from 12 o'clock */
  transform: rotate(-90deg);
  overflow: visible;
}
.fls-track {
  stroke: var(--fls-track);
  stroke-width: 0.6;
  fill: none;
}
.fls-arc {
  stroke: var(--fls-arc);
  stroke-width: 1;
  fill: none;
  stroke-linecap: round;
  stroke-dasharray: var(--circ);
  stroke-dashoffset: var(--circ);
  animation: flsArc 1.1s 0.6s cubic-bezier(0.25,0,0.1,1) forwards;
}
html[data-theme="dark"] .fls-arc,
html[data-theme="classic-dark"] .fls-arc {
  filter: drop-shadow(0 0 3px rgba(255,255,255,0.55));
}
.fls-dot-group {
  animation: flsDotRot 1.1s 0.6s cubic-bezier(0.25,0,0.1,1) forwards;
}
.fls-dot {
  fill: var(--fls-dot-fill);
  filter: var(--fls-dot-filter);
  opacity: 0;
  animation: flsDotFade 1.1s 0.6s linear forwards;
}
@keyframes flsArc {
  to { stroke-dashoffset: 0; }
}
@keyframes flsDotRot {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes flsDotFade {
  0%   { opacity: 0; }
  8%   { opacity: 1; }
  86%  { opacity: 1; }
  100% { opacity: 0; }
}

/* ── Logo ────────────────────────────────────────────── */
.fls-logo-outer {
  position: relative;
  /* will-change managed by Framer Motion */
}
.fls-logo-frame {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: var(--fls-shadow);
  animation: flsPulseShadow 0.38s 1.72s ease-in-out forwards;
}
.fls-logo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  user-select: none;
  pointer-events: none;
}
/* Light: show 3D white icon */
.fls-logo--light { display: block; }
.fls-logo--dark  { display: none; }
html[data-theme="dark"] .fls-logo--light,
html[data-theme="classic-dark"] .fls-logo--light { display: none; }
html[data-theme="dark"] .fls-logo--dark,
html[data-theme="classic-dark"] .fls-logo--dark  { display: block; }

/* Shadow pulse in sync with scale pulse */
@keyframes flsPulseShadow {
  0%   { box-shadow: var(--fls-shadow); }
  50%  { box-shadow: var(--fls-shadow), 0 0 0 1px rgba(255,255,255,0.06); }
  100% { box-shadow: var(--fls-shadow); }
}

/* ── Shine sweep ─────────────────────────────────────── */
.fls-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    115deg,
    transparent 0%,
    transparent 28%,
    var(--fls-shine) 50%,
    transparent 72%,
    transparent 100%
  );
  border-radius: inherit;
  transform: translateX(-150%);
  pointer-events: none;
  animation: flsShine 0.55s 1.05s cubic-bezier(0.4,0,0.2,1) forwards;
}
@keyframes flsShine {
  from { transform: translateX(-150%); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 0.9; }
  to   { transform: translateX(150%); opacity: 0; }
}

/* ── Text ────────────────────────────────────────────── */
.fls-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 32px;
}
.fls-wordmark {
  font-family: var(--font-aeonik, "Aeonik", Inter, -apple-system, sans-serif);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.3em;
  color: var(--fls-text);
  text-transform: uppercase;
}
.fls-tagline {
  font-family: var(--font-aeonik, "Aeonik", Inter, -apple-system, sans-serif);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  color: var(--fls-muted);
}

/* ── Reduced motion ──────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .fls-arc, .fls-dot-group, .fls-dot, .fls-shine, .fls-logo-frame {
    animation: none !important;
  }
}
`
