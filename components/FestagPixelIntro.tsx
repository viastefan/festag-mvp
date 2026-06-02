'use client'

/**
 * FestagPixelIntro — a calm, premium pixel mark that assembles once after the
 * user enters the app (first dashboard load). A modular Festag "F" forms from
 * scattered pixels, settles, pulses once, then fades into the app. Themed via
 * the app CSS vars (Light/Dark/Read). Skippable; respects reduced-motion;
 * shows only once (localStorage `festag_intro_seen`).
 */

import { useEffect, useMemo, useState } from 'react'

const PIXEL_MAP = [
  '1111000',
  '1000100',
  '1000000',
  '1110100',
  '1000000',
  '1000100',
  '1001000',
]
const ACCENT = new Set(['1,4', '3,4', '5,4', '6,3'])

export default function FestagPixelIntro() {
  const [show, setShow] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const cells = useMemo(() => {
    const out: { r: number; c: number; accent: boolean; sx: number; sy: number; delay: number; dur: number }[] = []
    PIXEL_MAP.forEach((row, r) => row.split('').forEach((v, c) => {
      if (v === '1') out.push({
        r, c, accent: ACCENT.has(`${r},${c}`),
        sx: Math.round(Math.random() * 26 - 13), sy: Math.round(Math.random() * 26 - 13),
        delay: Math.round(Math.random() * 300), dur: 620 + Math.round(Math.random() * 360),
      })
    }))
    return out
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { if (localStorage.getItem('festag_intro_seen')) return } catch {}
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setShow(true)
    const done = () => { try { localStorage.setItem('festag_intro_seen', '1') } catch {} }
    const tLeave = setTimeout(() => setLeaving(true), reduce ? 200 : 1500)
    const tHide = setTimeout(() => { setShow(false); done() }, reduce ? 450 : 1950)
    return () => { clearTimeout(tLeave); clearTimeout(tHide) }
  }, [])

  function skip() { setLeaving(true); setTimeout(() => { setShow(false); try { localStorage.setItem('festag_intro_seen', '1') } catch {} }, 240) }

  if (!show) return null
  return (
    <div className={`fpi${leaving ? ' leaving' : ''}`} onClick={skip} role="presentation">
      <div className="fpi-mark" aria-label="Festag">
        <div className="fpi-grid" style={{ gridTemplateColumns: `repeat(${PIXEL_MAP[0].length}, 12px)` }} aria-hidden>
          {PIXEL_MAP.map((row, r) => row.split('').map((v, c) => {
            if (v !== '1') return <span key={`${r}-${c}`} style={{ visibility: 'hidden' }} />
            const cell = cells.find(x => x.r === r && x.c === c)!
            return (
              <span
                key={`${r}-${c}`}
                className={`fpi-px${cell.accent ? ' accent' : ''}`}
                style={{ ['--sx' as any]: `${cell.sx}px`, ['--sy' as any]: `${cell.sy}px`, ['--delay' as any]: `${cell.delay}ms`, ['--dur' as any]: `${cell.dur}ms` }}
              />
            )
          }))}
        </div>
        <span className="fpi-word">festag</span>
      </div>
      <style jsx>{`
        .fpi {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg); animation: fpiIn .35s ease both;
        }
        .fpi.leaving { animation: fpiOut .42s cubic-bezier(.16,1,.3,1) both; }
        .fpi-mark { display: flex; flex-direction: column; align-items: center; gap: 22px; }
        .fpi-grid { display: grid; gap: 4px; }
        .fpi-px {
          width: 12px; height: 12px; border-radius: 2px; background: var(--text);
          opacity: 0; transform: translate(var(--sx), var(--sy)) scale(.3); filter: blur(2px);
          animation: fpiPx var(--dur) cubic-bezier(.16,1,.3,1) var(--delay) forwards;
        }
        .fpi-px.accent { background: #6a738c; }
        .fpi-word {
          font-size: 22px; font-weight: 500; letter-spacing: .04em; color: var(--text-muted);
          opacity: 0; animation: fpiWord .6s ease .55s forwards;
        }
        @keyframes fpiIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fpiOut { from { opacity: 1 } to { opacity: 0; transform: scale(1.01) } }
        @keyframes fpiPx { to { opacity: 1; transform: translate(0,0) scale(1); filter: blur(0) } }
        @keyframes fpiWord { to { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          .fpi, .fpi-px, .fpi-word { animation-duration: .01ms !important; }
          .fpi-px { opacity: 1; transform: none; filter: none; }
          .fpi-word { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
