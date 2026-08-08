/**
 * Flow constellation mark — three points, two connections (one left open).
 * Quiet molecular / logo feel for focused Overview nodes.
 */

import type { FlowTone } from '@/components/app-shell/overview/overview-nodes'
import { TONE_HEX } from '@/components/app-shell/overview/overview-nodes'

type Props = {
  tone?: FlowTone
  size?: number
  className?: string
}

export default function FlowConstellation({ tone = 'ink', size = 52, className }: Props) {
  const fill = TONE_HEX[tone] || TONE_HEX.ink
  const line = 'rgba(58, 58, 66, 0.28)'
  const dust = 'rgba(58, 58, 66, 0.22)'

  /* A (medium, NW) · B (large, center) · C (small, SE) — connect A–B and A–C, leave B–C open */
  const A = { x: 14, y: 16 }
  const B = { x: 28, y: 28 }
  const C = { x: 40, y: 40 }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 56 56"
      aria-hidden
    >
      {/* faint orbital hints */}
      <circle cx={B.x} cy={B.y} r={18} fill="none" stroke={dust} strokeWidth={0.6} opacity={0.45} />
      <circle cx={B.x} cy={B.y} r={12} fill="none" stroke={dust} strokeWidth={0.5} opacity={0.35} />

      {/* A → B straight */}
      <line
        x1={A.x}
        y1={A.y}
        x2={B.x}
        y2={B.y}
        stroke={line}
        strokeWidth={0.9}
        strokeLinecap="round"
      />

      {/* A → C arc under B (no B–C link) */}
      <path
        d={`M ${A.x} ${A.y} Q 22 44, ${C.x} ${C.y}`}
        fill="none"
        stroke={line}
        strokeWidth={0.85}
        strokeLinecap="round"
      />

      {/* micro dust along the arc */}
      <circle cx={18} cy={30} r={0.9} fill={dust} />
      <circle cx={24} cy={38} r={0.7} fill={dust} />
      <circle cx={32} cy={42} r={0.8} fill={dust} />
      <circle cx={10} cy={18} r={0.65} fill={dust} />

      {/* trail left from A */}
      <line
        x1={2}
        y1={A.y}
        x2={A.x - 1}
        y2={A.y}
        stroke={line}
        strokeWidth={0.7}
        strokeLinecap="round"
        opacity={0.7}
      />

      {/* three points */}
      <circle cx={A.x} cy={A.y} r={3.2} fill={fill} />
      <circle cx={B.x} cy={B.y} r={5.2} fill={fill} />
      <circle cx={C.x} cy={C.y} r={2.4} fill={fill} />
    </svg>
  )
}
