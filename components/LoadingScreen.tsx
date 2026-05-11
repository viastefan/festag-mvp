'use client'

import { useEffect, useState } from 'react'

const HEADLINES = [
  ['Projektstruktur wird', 'vorbereitet.'],
  ['Tagro analysiert', 'Kontext.'],
  ['Kommunikationsschicht', 'wird aufgebaut.'],
  ['Workspace wird', 'initialisiert.'],
  ['Planung und Ausführung', 'verbinden sich.'],
  ['Live-Projektstatus', 'wird vorbereitet.'],
]

const SYSTEM_LINES = [
  'AI orchestration active',
  'Execution layer initializing',
  'Visibility layer enabled',
  'Production context loading',
]

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const headlineTimer = window.setInterval(() => {
      setIndex((value) => (value + 1) % HEADLINES.length)
    }, 980)
    const doneTimer = window.setTimeout(onDone, 3800)
    return () => {
      window.clearInterval(headlineTimer)
      window.clearTimeout(doneTimer)
    }
  }, [onDone])

  const [primary, secondary] = HEADLINES[index]
  const systemLine = SYSTEM_LINES[index % SYSTEM_LINES.length]

  return (
    <div className="festag-loader" aria-live="polite">
      <style>{`
        .festag-loader {
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow: hidden;
          background: #05070a;
          color: #f4f5f4;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: clamp(32px, 7vw, 110px);
          isolation: isolate;
        }
        .festag-loader::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(5,7,10,.08) 0%, rgba(5,7,10,.48) 62%, rgba(5,7,10,.94) 100%),
            url('/brand/login-bg-dark.png') center bottom / cover no-repeat;
          opacity: .78;
          z-index: -2;
        }
        .festag-loader::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 16% 24%, rgba(255,255,255,.10), transparent 31%), linear-gradient(90deg, rgba(5,7,10,.20), rgba(5,7,10,.72));
          z-index: -1;
        }
        .festag-loader-mark {
          position: absolute;
          top: clamp(28px, 4vw, 54px);
          left: clamp(32px, 7vw, 110px);
          height: 22px;
          filter: brightness(0) invert(1);
          opacity: .88;
        }
        .festag-loader-copy {
          width: min(980px, 92vw);
          transform: translateY(-2vh);
        }
        .festag-loader-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(255,255,255,.045);
          border: 1px solid rgba(255,255,255,.075);
          color: rgba(255,255,255,.54);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
          margin-bottom: 22px;
          backdrop-filter: blur(12px);
        }
        .festag-loader-dot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255,255,255,.76);
          box-shadow: 0 0 22px rgba(255,255,255,.36);
        }
        .festag-loader-title {
          margin: 0;
          font-family: var(--font-aeonik);
          font-size: clamp(44px, 8vw, 112px);
          line-height: .96;
          letter-spacing: -.072em;
          font-weight: 760;
          max-width: 940px;
          animation: festagLoaderText .96s cubic-bezier(.16,1,.3,1) both;
        }
        .festag-loader-title span:last-child {
          display: block;
          color: rgba(255,255,255,.48);
        }
        .festag-loader-sub {
          margin-top: 28px;
          color: rgba(255,255,255,.46);
          font-size: 14px;
          font-weight: 650;
          letter-spacing: .045em;
          animation: festagLoaderText .96s .06s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes festagLoaderText {
          from { opacity: 0; transform: translateY(12px); filter: blur(7px); }
          to { opacity: 1; transform: none; filter: blur(0); }
        }
        @media (max-width: 720px) {
          .festag-loader { padding: 32px 26px; align-items: flex-end; padding-bottom: 18vh; }
          .festag-loader-mark { left: 26px; top: 28px; }
          .festag-loader-title { font-size: clamp(42px, 14vw, 70px); }
        }
      `}</style>
      <img className="festag-loader-mark" src="/brand/logo.svg" alt="festag" />
      <div className="festag-loader-copy" key={index}>
        <div className="festag-loader-kicker"><span className="festag-loader-dot" /> Festag OS</div>
        <h1 className="festag-loader-title">
          <span>{primary}</span>
          <span>{secondary}</span>
        </h1>
        <p className="festag-loader-sub">{systemLine}</p>
      </div>
    </div>
  )
}
