'use client'

/**
 * TagroDiamondDots — four nodes in a diamond, Codex voice mark.
 * Animates softly while Tagro speaks or the status report plays.
 */

type Props = {
  active?: boolean
  size?: number
}

export default function TagroDiamondDots({ active = false, size = 56 }: Props) {
  return (
    <div
      className={`tdd${active ? ' tdd-on' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="tdd-dot tdd-t" />
      <span className="tdd-dot tdd-l" />
      <span className="tdd-dot tdd-r" />
      <span className="tdd-dot tdd-b" />
      <style jsx>{`
        .tdd {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .tdd-dot {
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--dms-dot, #fff);
          opacity: 0.92;
          transition: opacity 0.3s ease;
        }
        .tdd-t { top: 0; left: 50%; transform: translateX(-50%); }
        .tdd-b { bottom: 0; left: 50%; transform: translateX(-50%); }
        .tdd-l { left: 0; top: 50%; transform: translateY(-50%); }
        .tdd-r { right: 0; top: 50%; transform: translateY(-50%); }

        .tdd-on .tdd-t { animation: tddPulse 1.4s ease-in-out infinite; }
        .tdd-on .tdd-r { animation: tddPulse 1.4s ease-in-out infinite 0.12s; }
        .tdd-on .tdd-b { animation: tddPulse 1.4s ease-in-out infinite 0.24s; }
        .tdd-on .tdd-l { animation: tddPulse 1.4s ease-in-out infinite 0.36s; }

        @keyframes tddPulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.55; }
          50% { transform: translateX(-50%) scale(1.35); opacity: 1; }
        }
        .tdd-on .tdd-b {
          animation-name: tddPulseB;
        }
        .tdd-on .tdd-l {
          animation-name: tddPulseL;
        }
        .tdd-on .tdd-r {
          animation-name: tddPulseR;
        }
        @keyframes tddPulseB {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.55; }
          50% { transform: translateX(-50%) scale(1.35); opacity: 1; }
        }
        @keyframes tddPulseL {
          0%, 100% { transform: translateY(-50%) scale(1); opacity: 0.55; }
          50% { transform: translateY(-50%) scale(1.35); opacity: 1; }
        }
        @keyframes tddPulseR {
          0%, 100% { transform: translateY(-50%) scale(1); opacity: 0.55; }
          50% { transform: translateY(-50%) scale(1.35); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .tdd-dot { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
