/**
 * Station mark — a solid tone core inside a soft halo of the same colour.
 *
 * The halo is what lets the spine run underneath without a hard mask: the route
 * fades into the glow instead of being cut by a ring in the canvas colour, so
 * the mark still reads correctly on any background. Pulse only changes weight —
 * a busier station glows wider, it does not gain extra geometry.
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
  size = 34,
  className,
  pulse = 'calm',
}: Props) {
  const fill = TONE_HEX[tone] || TONE_HEX.ink
  const c = size / 2
  const core = pulse === 'hot' ? 6 : pulse === 'soft' ? 5.4 : 5
  const halo = pulse === 'hot' ? 16 : pulse === 'soft' ? 14 : 12

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      <circle cx={c} cy={c} r={halo} fill={`${fill}1A`} />
      {pulse === 'hot' ? <circle cx={c} cy={c} r={halo * 0.66} fill={`${fill}22`} /> : null}
      <circle cx={c} cy={c} r={core} fill={fill} />
    </svg>
  )
}
