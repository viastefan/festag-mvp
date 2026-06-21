'use client'

/** Linear-inspired isometric stack — quiet stroke animation for empty Freigaben. */
export default function CapturesEmptyIllustration() {
  return (
    <div className="cap-empty-art" aria-hidden>
      <style>{`
        @keyframes capCubeFloat {
          0%, 100% { transform: translateY(0); opacity: .5; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes capCubeDraw {
          0%, 100% { stroke-dashoffset: 0; }
          50% { stroke-dashoffset: 6; }
        }
        .cap-empty-art {
          width: 112px;
          height: 88px;
          margin: 0 auto 28px;
          color: var(--dec-soft, var(--portal-muted, #8e8e93));
        }
        .cap-empty-art svg {
          display: block;
          width: 100%;
          height: 100%;
        }
        .cap-cube--1 {
          animation: capCubeFloat 4.2s ease-in-out infinite;
        }
        .cap-cube--2 {
          animation: capCubeFloat 4.2s ease-in-out infinite .18s;
        }
        .cap-cube--3 {
          animation: capCubeFloat 4.2s ease-in-out infinite .36s;
        }
        .cap-cube-face {
          stroke: currentColor;
          stroke-width: 1.15;
          fill: none;
          stroke-linejoin: round;
          vector-effect: non-scaling-stroke;
        }
        .cap-cube-face--fill {
          fill: color-mix(in srgb, currentColor 8%, transparent);
          stroke: none;
        }
        [data-theme="dark"] .cap-empty-art,
        [data-theme="classic-dark"] .cap-empty-art {
          color: var(--portal-muted, #9aa0ac);
        }
      `}</style>
      <svg viewBox="0 0 112 88" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g className="cap-cube--1">
          <path className="cap-cube-face--fill" d="M18 52 L38 42 L58 52 L38 62 Z" />
          <path className="cap-cube-face" d="M18 52 L38 42 L58 52 L38 62 Z" />
          <path className="cap-cube-face" d="M38 42 L38 22 L58 32 L58 52" />
          <path className="cap-cube-face" d="M38 42 L38 22 L18 32 L18 52" />
        </g>
        <g className="cap-cube--2">
          <path className="cap-cube-face--fill" d="M34 62 L54 52 L74 62 L54 72 Z" />
          <path className="cap-cube-face" d="M34 62 L54 52 L74 62 L54 72 Z" />
          <path className="cap-cube-face" d="M54 52 L54 32 L74 42 L74 62" />
          <path className="cap-cube-face" d="M54 52 L54 32 L34 42 L34 62" />
        </g>
        <g className="cap-cube--3">
          <path className="cap-cube-face--fill" d="M50 38 L70 28 L90 38 L70 48 Z" />
          <path className="cap-cube-face" d="M50 38 L70 28 L90 38 L70 48 Z" />
          <path className="cap-cube-face" d="M70 28 L70 8 L90 18 L90 38" />
          <path className="cap-cube-face" d="M70 28 L70 8 L50 18 L50 38" />
        </g>
      </svg>
    </div>
  )
}
