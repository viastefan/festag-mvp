'use client'

/**
 * Animated ink bridges from the focused Fluss node to every detail card on the right.
 * Drawn in viewport space so sticky columns stay connected while the page scrolls.
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
  len: number
}

function cubic(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(48, Math.abs(x2 - x1) * 0.42)
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

function pathLength(d: string): number {
  try {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    p.setAttribute('d', d)
    return p.getTotalLength()
  } catch {
    return 240
  }
}

export default function FlowDetailBridge({ active, focus, rootRef, tone = 'ink' }: Props) {
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

      const orb = root.querySelector(`[data-ffl-node="${focus}"] .ffl-node-orb`) as HTMLElement | null
      const targets = Array.from(
        root.querySelectorAll('[data-ffl-bridge-target]'),
      ) as HTMLElement[]

      const w = window.innerWidth
      const h = window.innerHeight
      setSize({ w, h })

      if (!orb || targets.length === 0) {
        lastCount = 0
        setPaths([])
        return
      }

      const orbBox = orb.getBoundingClientRect()
      const x1 = orbBox.left + orbBox.width / 2
      const y1 = orbBox.top + orbBox.height / 2

      const next: BridgePath[] = targets.map((el, i) => {
        const box = el.getBoundingClientRect()
        const x2 = box.left + 4
        const y2 = box.top + Math.min(Math.max(box.height * 0.22, 18), 40)
        const staggerY = (i - (targets.length - 1) / 2) * 5
        const d = cubic(x1, y1, x2, y2 + staggerY)
        return { d, len: pathLength(d) }
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

    // Only watch the detail column — never the bridge SVG (would loop).
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

  const stroke =
    tone === 'green' ? 'rgba(46, 155, 82, 0.55)'
      : tone === 'red' ? 'rgba(196, 60, 60, 0.5)'
        : tone === 'blue' ? 'rgba(59, 111, 212, 0.5)'
          : 'rgba(30, 30, 32, 0.28)'

  return (
    <svg
      className="ffl-bridge"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      aria-hidden
    >
      {paths.map((p, i) => (
        <path
          key={`${tick}-${i}`}
          className="ffl-bridge-path"
          d={p.d}
          style={{
            stroke,
            strokeDasharray: p.len,
            strokeDashoffset: p.len,
            animationDelay: `${i * 40}ms`,
          }}
        />
      ))}
    </svg>
  )
}
