'use client'

/**
 * FestagPixelIntro — the full-screen entry preloader.
 *
 * A premium pixel motion: the "festag" wordmark assembles from scattered,
 * blurred pixels that fly in, converge, settle and pulse once — then the whole
 * overlay fades up and reveals the app gently animating in behind it
 * (jair.com-style entrance). ~3 seconds total.
 *
 * - Full-screen, solid themed background (Light / Dark / Read) — nothing of the
 *   app is visible while it plays.
 * - Plays once per app entry (sessionStorage) so a fresh login/visit always
 *   shows it, but internal navigation does not replay it.
 * - Respects prefers-reduced-motion.
 */

import { useEffect, useMemo, useState } from 'react'

// Hand-authored 5×8 pixel glyphs for the lowercase wordmark "festag".
// '1' = pixel on. Rows 0..7 (ascenders top, descender bottom for g).
const GLYPHS: Record<string, string[]> = {
  f: [
    '00110',
    '01000',
    '11100',
    '01000',
    '01000',
    '01000',
    '01000',
    '00000',
  ],
  e: [
    '00000',
    '00000',
    '01110',
    '10010',
    '11110',
    '10000',
    '01110',
    '00000',
  ],
  s: [
    '00000',
    '00000',
    '01110',
    '10000',
    '01100',
    '00010',
    '11100',
    '00000',
  ],
  t: [
    '01000',
    '01000',
    '11100',
    '01000',
    '01000',
    '01000',
    '00110',
    '00000',
  ],
  a: [
    '00000',
    '00000',
    '01110',
    '00010',
    '01110',
    '10010',
    '01110',
    '00000',
  ],
  g: [
    '00000',
    '00000',
    '01110',
    '10010',
    '10010',
    '01110',
    '00010',
    '11100',
  ],
}

const WORD = 'festag'
const GLYPH_W = 5
const GLYPH_H = 8
const GAP_COLS = 1
const COLS = WORD.length * GLYPH_W + (WORD.length - 1) * GAP_COLS // 35
const ROWS = GLYPH_H // 8

type Cell = {
  key: string
  r: number
  c: number
  accent: boolean
  sx: number
  sy: number
  delay: number
  dur: number
}

export default function FestagPixelIntro() {
  const [show, setShow] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [reduce, setReduce] = useState(false)

  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = []
    let colOffset = 0
    for (const ch of WORD) {
      const glyph = GLYPHS[ch]
      for (let r = 0; r < GLYPH_H; r++) {
        const row = glyph[r]
        for (let gc = 0; gc < GLYPH_W; gc++) {
          if (row[gc] !== '1') continue
          const c = colOffset + gc
          // Scatter origin: fly in from a random direction, fairly far out.
          const ang = Math.random() * Math.PI * 2
          const dist = 60 + Math.random() * 90
          out.push({
            key: `${ch}-${r}-${c}`,
            r,
            c,
            accent: Math.random() < 0.13,
            sx: Math.round(Math.cos(ang) * dist),
            sy: Math.round(Math.sin(ang) * dist),
            delay: Math.round(Math.random() * 620),
            dur: 760 + Math.round(Math.random() * 380),
          })
        }
      }
      colOffset += GLYPH_W + GAP_COLS
    }
    return out
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Once per app entry / session — fresh login or reload replays it,
    // internal navigation does not.
    try { if (sessionStorage.getItem('festag_intro_session')) return } catch {}
    const prefersReduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    setReduce(prefersReduce)
    setShow(true)

    const mark = () => { try { sessionStorage.setItem('festag_intro_session', '1') } catch {} }
    const revealAppEntrance = () => {
      try {
        document.body.classList.add('festag-intro-revealing')
        window.setTimeout(() => document.body.classList.remove('festag-intro-revealing'), 1000)
      } catch {}
    }

    const leaveAt = prefersReduce ? 700 : 2620
    const hideAt = prefersReduce ? 1050 : 3060

    const tLeave = window.setTimeout(() => { setLeaving(true); revealAppEntrance() }, leaveAt)
    const tHide = window.setTimeout(() => { setShow(false); mark() }, hideAt)
    return () => { window.clearTimeout(tLeave); window.clearTimeout(tHide) }
  }, [])

  function skip() {
    setLeaving(true)
    try {
      document.body.classList.add('festag-intro-revealing')
      window.setTimeout(() => document.body.classList.remove('festag-intro-revealing'), 1000)
      sessionStorage.setItem('festag_intro_session', '1')
    } catch {}
    window.setTimeout(() => setShow(false), 320)
  }

  if (!show) return null

  return (
    <div
      className={`fpi${leaving ? ' leaving' : ''}${reduce ? ' reduce' : ''}`}
      onClick={skip}
      role="presentation"
      aria-label="Festag"
    >
      <div className="fpi-stage">
        <div
          className="fpi-grid"
          aria-hidden
          style={{
            gridTemplateColumns: `repeat(${COLS}, var(--fpi-px))`,
            gridTemplateRows: `repeat(${ROWS}, var(--fpi-px))`,
          }}
        >
          {cells.map(cell => (
            <span
              key={cell.key}
              className={`fpi-px${cell.accent ? ' accent' : ''}`}
              style={{
                gridColumn: cell.c + 1,
                gridRow: cell.r + 1,
                ['--sx' as any]: `${cell.sx}px`,
                ['--sy' as any]: `${cell.sy}px`,
                ['--delay' as any]: `${cell.delay}ms`,
                ['--dur' as any]: `${cell.dur}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .fpi {
          position: fixed;
          inset: 0;
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          animation: fpiIn 0.3s ease both;
        }
        .fpi.leaving {
          animation: fpiOut 0.46s cubic-bezier(0.16, 1, 0.3, 1) both;
          pointer-events: none;
        }
        .fpi-stage {
          --fpi-px: clamp(5px, 2.1vw, 11px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fpiSettle 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1.55s both;
        }
        .fpi.reduce .fpi-stage { animation: none; }
        .fpi-grid {
          display: grid;
          gap: clamp(1px, 0.42vw, 3px);
        }
        .fpi-px {
          width: var(--fpi-px);
          height: var(--fpi-px);
          border-radius: 2px;
          background: var(--text);
          opacity: 0;
          transform: translate(var(--sx), var(--sy)) scale(0.25);
          filter: blur(2.5px);
          animation: fpiAssemble var(--dur) cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards;
        }
        .fpi-px.accent { background: #6a738c; }
        .fpi.reduce .fpi-px {
          opacity: 1;
          transform: none;
          filter: none;
          animation: none;
        }
        @keyframes fpiIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fpiOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(1.04); }
        }
        @keyframes fpiAssemble {
          to { opacity: 1; transform: translate(0, 0) scale(1); filter: blur(0); }
        }
        @keyframes fpiSettle {
          0% { transform: scale(0.992); }
          55% { transform: scale(1.018); }
          100% { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fpi, .fpi-stage, .fpi-px { animation-duration: 0.01ms !important; }
          .fpi-px { opacity: 1; transform: none; filter: none; }
        }
      `}</style>
    </div>
  )
}
