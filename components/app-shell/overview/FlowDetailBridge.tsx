'use client'

/**
 * Animated ink bridges from the focused Fluss node to every detail card.
 * Starts at the node's right edge (never through the label), light gray dotted,
 * small terminal dots — matching the Entwickler rail reference.
 */

import { useEffect, useState, type RefObject } from 'react'
import type { FlowNodeId } from '@/components/app-shell/overview/overview-nodes'

type Props = {
  active: boolean
  focus: FlowNodeId | null
  rootRef: RefObject<HTMLElement | null>
  tone?: string
}

type BridgePath = {
  d: string
  x2: number
  y2: number
}

function cubic(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(56, Math.abs(x2 - x1) * 0.48)
  /* Lift mid control so the curve stays clear of the node copy */
  const lift = Math.abs(y2 - y1) < 28 ? (y2 >= y1 ? 18 : -18) : 0
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + dx).toFixed(1)} ${(y1 + lift).toFixed(1)}, ${(x2 - dx * 0.55).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

export default function FlowDetailBridge({ active, focus, rootRef }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [paths, setPaths] = useState<BridgePath[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!active || !focus) {
      setPaths([])
      return
    }

    let cancelled = false
    let rafPending = 0
    let lastCount = 0

    function measure(animate: boolean) {
      const root = rootRef.current
      if (!root || cancelled) return

      const node = root.querySelector(`[data-ffl-node="${focus}"]`) as HTMLElement | null
      const targets = Array.from(
        root.querySelectorAll('[data-ffl-bridge-target]'),
      ) as HTMLElement[]

      const w = window.innerWidth
      const h = window.innerHeight
      setSize({ w, h })

      if (!node || targets.length === 0) {
        lastCount = 0
        setPaths([])
        return
      }

      const nodeBox = node.getBoundingClientRect()
      /* Leave from the right edge of the whole node — never through the sentence */
      const x1 = nodeBox.right + 2
      const y1 = nodeBox.top + nodeBox.height / 2

      const next: BridgePath[] = targets.map((el, i) => {
        const box = el.getBoundingClientRect()
        const x2 = box.left - 2
        const y2 = box.top + Math.min(Math.max(box.height * 0.18, 14), 28)
        const staggerY = (i - (targets.length - 1) / 2) * 10
        const d = cubic(x1, y1, x2, y2 + staggerY)
        return { d, x2, y2: y2 + staggerY }
      })

      const grew = next.length > lastCount
      lastCount = next.length
      setPaths(next)
      if (animate || grew) setTick((t) => t + 1)
    }

    function measureAnimated() {
      measure(true)
    }

    function measureQuiet() {
      if (rafPending) return
      rafPending = window.requestAnimationFrame(() => {
        rafPending = 0
        measure(false)
      })
    }

    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(measureAnimated)
    })
    const settle = window.setTimeout(measureAnimated, 90)

    const root = rootRef.current
    const detail = root?.querySelector('.ffl-detail') as HTMLElement | null
    const scrollParent = (root?.closest('.fas-content') as HTMLElement | null) || null

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureQuiet) : null
    if (root && ro) ro.observe(root)
    if (detail && ro) ro.observe(detail)

    const mo =
      typeof MutationObserver !== 'undefined' && detail
        ? new MutationObserver(() => measureQuiet())
        : null
    mo?.observe(detail!, { childList: true, subtree: true })

    window.addEventListener('resize', measureQuiet)
    scrollParent?.addEventListener('scroll', measureQuiet, { passive: true })
    window.addEventListener('scroll', measureQuiet, { passive: true })
    window.addEventListener('festag-overview-read-progress', measureQuiet)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      if (rafPending) window.cancelAnimationFrame(rafPending)
      window.clearTimeout(settle)
      ro?.disconnect()
      mo?.disconnect()
      window.removeEventListener('resize', measureQuiet)
      scrollParent?.removeEventListener('scroll', measureQuiet)
      window.removeEventListener('scroll', measureQuiet)
      window.removeEventListener('festag-overview-read-progress', measureQuiet)
    }
  }, [active, focus, rootRef])

  if (!active || !focus || paths.length === 0 || size.w < 8) return null

  const stroke = 'rgba(58, 58, 66, 0.22)'
  const dot = 'rgba(58, 58, 66, 0.38)'

  return (
    <svg
      className="ffl-bridge"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      aria-hidden
    >
      {paths.map((p, i) => (
        <g key={`${tick}-${i}`}>
          <path
            className="ffl-bridge-path"
            d={p.d}
            style={{
              stroke,
              animationDelay: `${i * 50}ms`,
            }}
          />
          <circle
            className="ffl-bridge-dot"
            cx={p.x2}
            cy={p.y2}
            r={2.2}
            fill={dot}
            style={{ animationDelay: `${140 + i * 50}ms` }}
          />
        </g>
      ))}
    </svg>
  )
}
