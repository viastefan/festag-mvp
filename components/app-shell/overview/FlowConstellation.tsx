/**
 * Station mark — a solid tone core inside a soft radial glow.
 *
 * The glow is a real gradient, not a flat disc: a single low-alpha circle reads
 * as a grey plate sitting behind the dot, while a gradient falls off to nothing
 * and reads as light. That falloff is also what lets the spine pass underneath
 * without a hard mask in the canvas colour.
 *
 * Pulse only changes weight — a busier station glows a little wider and warmer,
 * it never gains extra geometry.
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
  size = 44,
  className,
  pulse = 'calm',
}: Props) {
  const fill = TONE_HEX[tone] || TONE_HEX.ink
  const c = size / 2
  const core = pulse === 'hot' ? 8 : pulse === 'soft' ? 7.5 : 7
  /* How far the light reaches, as a fraction of the box. */
  const reach = pulse === 'hot' ? 1 : pulse === 'soft' ? 0.94 : 0.86
  const peak = pulse === 'hot' ? 0.4 : 0.32
  /* The centre of the gradient is hidden under the core, so the alpha has to
     still be near its peak where the core ends — otherwise the only part you
     can actually see is the tail, and the glow reads as absent. */
  const coreEdge = `${Math.round((core / (c * reach)) * 100)}%`

  /* Shared per tone+pulse — identical defs, so a repeated id is harmless. */
  const gid = `ffl-glow-${tone}-${pulse}`

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      <defs>
        <radialGradient id={gid}>
          <stop offset="0%" stopColor={fill} stopOpacity={peak} />
          <stop offset={coreEdge} stopColor={fill} stopOpacity={peak * 0.92} />
          <stop offset="62%" stopColor={fill} stopOpacity={peak * 0.42} />
          <stop offset="100%" stopColor={fill} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={c} cy={c} r={c * reach} fill={`url(#${gid})`} />
      <circle cx={c} cy={c} r={core} fill={fill} />
    </svg>
  )
}
