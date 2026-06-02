'use client'

/**
 * Tagro AI — animiertes Logo.
 *
 * Verwendet `/brand/tagro-logo.png` (User-Asset). Während Tagro "denkt"/"schreibt"
 * rotiert das Logo sanft mit leichtem Glow. Im Idle-Zustand: still, leicht
 * pulsierend.
 *
 * Wenn das PNG nicht vorhanden ist, fällt die Komponente auf einen SVG-Ersatz
 * zurück (animiertes Hexagon-Wireframe) — also keine kaputten Bilder.
 */

import { useState } from 'react'

interface Props {
  size?: number
  thinking?: boolean   // aktiv = rotiert + glow
  className?: string
}

export default function TagroLogo({ size = 28, thinking = false, className = '' }: Props) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <span
      className={`tagro-logo ${thinking ? 'thinking' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size, height: size,
        position: 'relative',
        flexShrink: 0,
      }}
      aria-label="Tagro AI"
    >
      <style>{`
        .tagro-logo .tagro-img,
        .tagro-logo .tagro-svg {
          width: 100%; height: 100%;
          object-fit: contain;
          transition: filter .3s cubic-bezier(.16,1,.3,1);
        }
        @keyframes tagroSpin   { to   { transform: rotate(360deg); } }
        @keyframes tagroPulse  { 0%,100% { opacity: .85; transform: scale(1); }
                                 50%      { opacity: 1;   transform: scale(1.04); } }

        .tagro-logo .tagro-anim { animation: tagroPulse 3.6s ease-in-out infinite; }
        .tagro-logo.thinking .tagro-anim {
          animation: tagroSpin 6s linear infinite;
          filter: drop-shadow(0 0 6px rgba(140,170,255,.45)) drop-shadow(0 0 16px rgba(140,170,255,.20));
        }
      `}</style>

      {!imgFailed ? (
        <img
          src="/brand/tagro-logo.png"
          alt=""
          className="tagro-img tagro-anim"
          onError={() => setImgFailed(true)}
          draggable={false}
        />
      ) : (
        // SVG-Fallback: animiertes konzentrisches Hexagon
        <svg
          className="tagro-svg tagro-anim"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          {[26, 22, 18, 14, 10].map((r, i) => (
            <polygon
              key={r}
              points={hexPoints(32, 32, r)}
              opacity={0.20 + i * 0.16}
              strokeWidth={i === 0 ? 1.2 : 0.8}
            />
          ))}
        </svg>
      )}
    </span>
  )
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`)
  }
  return pts.join(' ')
}
