'use client'

import { useEffect, useState } from 'react'
import { WORKSPACE_CONTEXT_EXAMPLES } from '@/lib/platform/identity'

type Props = {
  /** Hide while the user has typed. */
  active: boolean
  /** Softer when the field is focused. */
  dimmed?: boolean
  /** Override examples (defaults to Identity Constitution Workspace Context list). */
  examples?: readonly string[]
  className?: string
}

/**
 * Calm rotating field placeholders — slow fade, no typing, no flash.
 * Identity constitution: Workspace Context examples.
 */
export default function RotatingFieldHint({
  active,
  dimmed = false,
  examples = WORKSPACE_CONTEXT_EXAMPLES,
  className = '',
}: Props) {
  const list = examples.length ? examples : WORKSPACE_CONTEXT_EXAMPLES
  const [idx, setIdx] = useState(0)
  const [entered, setEntered] = useState(true)

  useEffect(() => {
    if (!active || list.length < 2) return
    let fadeTimer: number | undefined
    const tick = window.setInterval(() => {
      setEntered(false)
      fadeTimer = window.setTimeout(() => {
        setIdx((i) => (i + 1) % list.length)
        setEntered(true)
      }, 420)
    }, 4200)
    return () => {
      window.clearInterval(tick)
      if (fadeTimer) window.clearTimeout(fadeTimer)
    }
  }, [active, list])

  if (!active) return null

  return (
    <span
      className={`onb-rotating-hint${entered ? ' is-in' : ''}${dimmed ? ' is-dim' : ''}${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      {list[idx % list.length]}
    </span>
  )
}

/** @deprecated Use WORKSPACE_CONTEXT_EXAMPLES from `@/lib/platform/identity`. */
export const DEV_FACTS_EXAMPLES = WORKSPACE_CONTEXT_EXAMPLES
