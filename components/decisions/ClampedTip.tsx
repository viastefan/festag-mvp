'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  text: string
  lines?: number
  className?: string
}

/** Two-line clamp with ellipsis; full text in a hover popup when truncated. */
export default function ClampedTip({ text, lines = 2, className = 'dec-card-muted' }: Props) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 2)
    check()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [text, lines])

  return (
    <div
      className="dec-clamp-wrap"
      onMouseEnter={() => overflows && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => overflows && setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <p
        ref={ref}
        className={`${className} dec-clamp-text`}
        style={{ WebkitLineClamp: lines } as React.CSSProperties}
        title={overflows ? undefined : text}
      >
        {text}
      </p>
      {open && overflows && (
        <div className="dec-tip-popup" role="tooltip">
          {text}
        </div>
      )}
    </div>
  )
}
