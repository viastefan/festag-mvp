'use client'

/**
 * Festag transitional loader — hex-cluster of 19 pulsing dots.
 * Mirrors Figma node 38:2. Calm, premium, no spinners.
 *
 * Usage:
 *   <FestagLoader />            // inline (fills parent)
 *   <FestagLoader fullscreen /> // covers viewport
 */

type Props = { fullscreen?: boolean; label?: string }

// Hex pattern: rows of 3, 4, 5, 4, 3 dots. Coordinates in a 6x5 grid.
const DOTS: Array<{ x: number; y: number; ring: 0 | 1 | 2 }> = [
  // ring 0: center
  { x: 3, y: 2.5, ring: 0 },
  // ring 1: 6 surrounding
  { x: 2, y: 2,   ring: 1 },
  { x: 4, y: 2,   ring: 1 },
  { x: 1.5, y: 2.5, ring: 1 },
  { x: 4.5, y: 2.5, ring: 1 },
  { x: 2, y: 3,   ring: 1 },
  { x: 4, y: 3,   ring: 1 },
  // ring 2: 12 outer
  { x: 1, y: 1.5, ring: 2 },
  { x: 2.5, y: 1.5, ring: 2 },
  { x: 3.5, y: 1.5, ring: 2 },
  { x: 5, y: 1.5, ring: 2 },
  { x: 0.5, y: 2,   ring: 2 },
  { x: 5.5, y: 2,   ring: 2 },
  { x: 0.5, y: 3,   ring: 2 },
  { x: 5.5, y: 3,   ring: 2 },
  { x: 1, y: 3.5, ring: 2 },
  { x: 2.5, y: 3.5, ring: 2 },
  { x: 3.5, y: 3.5, ring: 2 },
  { x: 5, y: 3.5, ring: 2 },
]

export default function FestagLoader({ fullscreen = false, label }: Props) {
  return (
    <div className={`fl-wrap${fullscreen ? ' fl-full' : ''}`} role="status" aria-live="polite">
      <style>{`
        .fl-wrap {
          width:100%; height:100%; min-height:240px;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:24px;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
        }
        .fl-full {
          position:fixed; inset:0;
          background:var(--legal-bg, #0A0D14);
          z-index:9999;
        }
        .fl-cluster {
          position:relative;
          width:96px; height:80px;
        }
        .fl-dot {
          position:absolute;
          width:7px; height:7px;
          border-radius:999px;
          background:#F3F5F7;
          transform:translate(-50%, -50%);
          animation: fl-pulse 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          will-change:opacity, transform;
        }
        .fl-dot[data-ring="0"] { animation-delay: 0ms; }
        .fl-dot[data-ring="1"] { animation-delay: 160ms; }
        .fl-dot[data-ring="2"] { animation-delay: 320ms; }

        @keyframes fl-pulse {
          0%   { opacity: 0.12; transform: translate(-50%, -50%) scale(0.9); }
          25%  { opacity: 1;    transform: translate(-50%, -50%) scale(1); }
          70%  { opacity: 0.12; transform: translate(-50%, -50%) scale(0.9); }
          100% { opacity: 0.12; transform: translate(-50%, -50%) scale(0.9); }
        }

        .fl-label {
          font-size:12px; font-weight:500; letter-spacing:0.02em;
          color:rgba(243,245,247,0.45);
        }

        /* Light theme overrides */
        :root[data-theme="light"] .fl-full { background:#fcfcfd; }
        :root[data-theme="light"] .fl-dot { background:#202532; }
        :root[data-theme="light"] .fl-label { color:rgba(32,37,50,0.45); }

        :root[data-theme="read"] .fl-full { background:#E6DFCE; }
        :root[data-theme="read"] .fl-dot { background:#1C1914; }
        :root[data-theme="read"] .fl-label { color:rgba(28,25,20,0.45); }
      `}</style>

      <div className="fl-cluster" aria-hidden="true">
        {DOTS.map((d, i) => (
          <span
            key={i}
            className="fl-dot"
            data-ring={d.ring}
            style={{ left: `${(d.x / 6) * 100}%`, top: `${(d.y / 5) * 100}%` }}
          />
        ))}
      </div>
      {label && <span className="fl-label">{label}</span>}
    </div>
  )
}
