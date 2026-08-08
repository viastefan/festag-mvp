/**
 * Flow node mark — soft tone disc with a quiet dual pulse.
 */

import type { FlowTone } from '@/components/app-shell/overview/overview-nodes'
import { TONE_HEX } from '@/components/app-shell/overview/overview-nodes'

type Props = {
  tone?: FlowTone
  size?: number
  className?: string
  pulse?: 'calm' | 'soft' | 'hot'
}

export default function FlowConstellation({
  tone = 'ink',
  size = 28,
  className,
  pulse = 'calm',
}: Props) {
  const fill = TONE_HEX[tone] || TONE_HEX.ink
  const r = size / 2
  const core = pulse === 'hot' ? 4.2 : pulse === 'soft' ? 3.8 : 3.4
  const sat = pulse === 'hot' ? 5.6 : 5.1

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      <circle cx={r} cy={r} r={r - 0.5} fill={`${fill}14`} />
      <circle
        cx={r}
        cy={r}
        r={r - 3.5}
        fill="none"
        stroke={`${fill}${pulse === 'hot' ? '55' : '33'}`}
        strokeWidth="1.25"
      />
      <circle cx={r - 3.2} cy={r} r={core} fill={fill} />
      <circle cx={r + 3.6} cy={r} r={sat * 0.55} fill={`${fill}66`} />
    </svg>
  )
}
