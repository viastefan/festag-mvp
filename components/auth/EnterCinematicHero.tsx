'use client'

import { useEffect, useState } from 'react'
import type { AuthThemeMode } from '@/lib/auth-theme'

const TYPE_LINES = [
  'Status für Acme klar formulieren',
  'Checkout-Risiko client-tauglich machen',
  'Nächste Schritte für den Kunden',
]

const TYPE_CHAR_MS = 38
const HOLD_MS = 1600
const EXIT_MS = 480

type Props = {
  theme?: AuthThemeMode
}

/**
 * Mobile-only cinematic hero for `/enter` — phone mock with Tagro compose
 * and always-visible translate control. CSS motion, no video assets.
 */
export default function EnterCinematicHero({ theme = 'light' }: Props) {
  const isDark = theme === 'dark'
  const [lineIndex, setLineIndex] = useState(0)
  const [chars, setChars] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'hold' | 'exit'>('typing')
  const [reduced, setReduced] = useState(false)

  const line = TYPE_LINES[lineIndex % TYPE_LINES.length]
  const visible = reduced ? line : phase === 'exit' ? '' : line.slice(0, chars)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (reduced) return
    if (phase === 'typing') {
      if (chars < line.length) {
        const id = window.setTimeout(() => setChars(c => c + 1), TYPE_CHAR_MS)
        return () => window.clearTimeout(id)
      }
      setPhase('hold')
      return
    }
    if (phase === 'hold') {
      const id = window.setTimeout(() => setPhase('exit'), HOLD_MS)
      return () => window.clearTimeout(id)
    }
    const id = window.setTimeout(() => {
      setChars(0)
      setLineIndex(i => (i + 1) % TYPE_LINES.length)
      setPhase('typing')
    }, EXIT_MS)
    return () => window.clearTimeout(id)
  }, [phase, chars, line, reduced])

  return (
    <div className={`ae-cine${isDark ? ' is-dark' : ''}`} aria-hidden>
      <div className="ae-cine-glow" />
      <div className="ae-cine-phone">
        <div className="ae-cine-bezel">
          <div className="ae-cine-island" />
          <div className="ae-cine-screen">
            <div className="ae-cine-status">
              <span>9:41</span>
              <span className="ae-cine-bars"><i /><i /><i /></span>
            </div>
            <div className="ae-cine-app">
              <div className="ae-cine-top">
                <p className="ae-cine-title">Gesamtbericht</p>
                <p className="ae-cine-sub">Heute, Acme Portal</p>
              </div>
              <div className="ae-cine-card ae-cine-card--a">
                <span className="ae-cine-card-label">Status</span>
                <span className="ae-cine-card-val">Stabil</span>
              </div>
              <div className="ae-cine-card ae-cine-card--b">
                <span className="ae-cine-card-label">Offen</span>
                <span className="ae-cine-card-val">2 Freigaben</span>
              </div>
              <div className="ae-cine-translate">
                <div className="ae-cine-tfc">
                  <span className="ae-cine-ctx">@Acme</span>
                  <span className="ae-cine-type">
                    {visible}
                    <i className={`ae-cine-caret${phase === 'hold' ? ' is-blink' : ''}`} />
                  </span>
                  <span className="ae-cine-xlate">Mit Tagro übersetzen</span>
                </div>
              </div>
            </div>
            <div className="ae-cine-home" />
          </div>
        </div>
      </div>

      <style jsx>{`
        .ae-cine {
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          width: 100%;
          height: 100%;
          min-height: 0;
          padding: 8px 24px 0;
          overflow: hidden;
          pointer-events: none;
        }
        .ae-cine-glow {
          position: absolute;
          inset: 8% 12% 18%;
          border-radius: 50%;
          background: radial-gradient(ellipse at 50% 40%, rgba(91, 100, 125, 0.18), transparent 70%);
          filter: blur(18px);
          animation: aeCineGlow 7.2s ease-in-out infinite alternate;
        }
        .ae-cine.is-dark .ae-cine-glow {
          background: radial-gradient(ellipse at 50% 40%, rgba(255, 255, 255, 0.08), transparent 72%);
        }
        .ae-cine-phone {
          position: relative;
          z-index: 1;
          width: min(72vw, 248px);
          padding: 10px;
          border-radius: 40px;
          background: linear-gradient(145deg, #3a3a3c 0%, #1c1c1e 42%, #2c2c2e 100%);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.1) inset,
            0 28px 64px rgba(15, 23, 42, 0.22);
          transform: translateY(18px) rotate(-2.2deg);
          animation: aeCineFloat 6.4s cubic-bezier(.45,.05,.55,.95) infinite alternate;
        }
        .ae-cine.is-dark .ae-cine-phone {
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.08) inset,
            0 32px 72px rgba(0, 0, 0, 0.5);
        }
        .ae-cine-bezel {
          border-radius: 32px;
          overflow: hidden;
          background: #000;
          position: relative;
        }
        .ae-cine-island {
          position: absolute;
          top: 9px;
          left: 50%;
          transform: translateX(-50%);
          width: 68px;
          height: 20px;
          border-radius: 999px;
          background: #000;
          z-index: 3;
        }
        .ae-cine-screen {
          min-height: 420px;
          background: #f5f5f7;
          display: flex;
          flex-direction: column;
        }
        .ae-cine.is-dark .ae-cine-screen { background: #1a1a24; }
        .ae-cine-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px 6px;
          font-size: 10px;
          color: #1e1e20;
          font-family: var(--font-aeonik, 'Aeonik'), Inter, sans-serif;
        }
        .ae-cine.is-dark .ae-cine-status { color: #f5f5f7; }
        .ae-cine-bars {
          display: inline-flex;
          gap: 2px;
          align-items: flex-end;
        }
        .ae-cine-bars i {
          display: block;
          background: currentColor;
          border-radius: 1px;
        }
        .ae-cine-bars i:nth-child(1) { width: 12px; height: 6px; opacity: 0.85; }
        .ae-cine-bars i:nth-child(2) { width: 8px; height: 6px; opacity: 0.65; }
        .ae-cine-bars i:nth-child(3) { width: 15px; height: 6px; }
        .ae-cine-app {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 6px 14px 12px;
          background: #ffffff;
          border-radius: 22px 22px 0 0;
          position: relative;
        }
        .ae-cine.is-dark .ae-cine-app { background: #2e2e3a; }
        .ae-cine-top { margin-bottom: 2px; }
        .ae-cine-title {
          margin: 0;
          font-family: var(--font-aeonik, 'Aeonik'), Inter, sans-serif;
          font-size: 20px;
          font-weight: 400;
          letter-spacing: -0.03em;
          color: #1e1e20;
          line-height: 1.15;
        }
        .ae-cine.is-dark .ae-cine-title { color: #f5f5f7; }
        .ae-cine-sub {
          margin: 4px 0 0;
          font-size: 11px;
          color: #8891a0;
          letter-spacing: -0.01em;
        }
        .ae-cine.is-dark .ae-cine-sub { color: rgba(186, 194, 210, 0.88); }
        .ae-cine-card {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          padding: 12px 14px;
          border-radius: 16px;
          background: var(--festag-glass-bg, rgba(255, 255, 255, 0.58));
          border: 1px solid var(--festag-glass-border, rgba(255, 255, 255, 0.62));
          box-shadow: var(--festag-glass-shadow-soft, 0 1px 0 rgba(255,255,255,0.5) inset);
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          animation: aeCineCardIn 0.7s cubic-bezier(.16,1,.3,1) both;
        }
        .ae-cine-card--b { animation-delay: 0.12s; }
        .ae-cine.is-dark .ae-cine-card {
          background: rgba(255, 255, 255, 0.06);
          border-color: transparent;
          box-shadow: none;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }
        .ae-cine-card-label {
          font-size: 11px;
          color: #8891a0;
          letter-spacing: -0.01em;
        }
        .ae-cine.is-dark .ae-cine-card-label { color: rgba(186, 194, 210, 0.88); }
        .ae-cine-card-val {
          font-size: 13px;
          color: #1e1e20;
          letter-spacing: -0.015em;
        }
        .ae-cine.is-dark .ae-cine-card-val { color: #f5f5f7; }
        .ae-cine-translate {
          margin-top: auto;
          padding-top: 8px;
        }
        .ae-cine-tfc {
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 44px;
          padding: 6px 8px 6px 8px;
          border-radius: 999px;
          background: #1a1a24;
          color: #f5f5f7;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.08) inset,
            0 12px 28px rgba(0, 0, 0, 0.28);
          animation: aeCineBarIn 0.9s cubic-bezier(.16,1,.3,1) 0.2s both;
        }
        .ae-cine-ctx {
          flex-shrink: 0;
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(91, 100, 125, 0.28);
          color: #d7dbe5;
          font-size: 10px;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }
        .ae-cine-type {
          flex: 1;
          min-width: 0;
          font-size: 10.5px;
          letter-spacing: -0.01em;
          color: rgba(245, 245, 247, 0.88);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }
        .ae-cine-caret {
          display: inline-block;
          width: 1.5px;
          height: 11px;
          margin-left: 1px;
          background: rgba(245, 245, 247, 0.85);
          vertical-align: -1px;
          border-radius: 1px;
        }
        .ae-cine-caret.is-blink {
          animation: aeCineBlink 1s steps(1, end) infinite;
        }
        .ae-cine-xlate {
          flex-shrink: 0;
          height: 28px;
          padding: 0 9px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          color: #f5f5f7;
          font-size: 9.5px;
          letter-spacing: -0.01em;
          white-space: nowrap;
          animation: aeCinePulse 2.8s ease-in-out infinite;
        }
        .ae-cine-home {
          width: 86px;
          height: 4px;
          border-radius: 999px;
          background: rgba(30, 30, 32, 0.22);
          margin: 8px auto 10px;
        }
        .ae-cine.is-dark .ae-cine-home { background: rgba(245, 245, 247, 0.22); }

        @keyframes aeCineFloat {
          from { transform: translateY(18px) rotate(-2.2deg); }
          to { transform: translateY(6px) rotate(-1.4deg); }
        }
        @keyframes aeCineGlow {
          from { opacity: 0.55; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1.04); }
        }
        @keyframes aeCineCardIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes aeCineBarIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes aeCineBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes aeCinePulse {
          0%, 100% { background: rgba(255, 255, 255, 0.1); }
          50% { background: rgba(255, 255, 255, 0.16); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ae-cine-phone,
          .ae-cine-glow,
          .ae-cine-card,
          .ae-cine-tfc,
          .ae-cine-xlate,
          .ae-cine-caret.is-blink {
            animation: none !important;
          }
          .ae-cine-phone { transform: translateY(12px) rotate(-1.6deg); }
        }
      `}</style>
    </div>
  )
}
