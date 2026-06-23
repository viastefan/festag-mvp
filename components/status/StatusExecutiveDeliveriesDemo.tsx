'use client'

import { useEffect, useState } from 'react'
import { ArrowUp, At, Image, Paperclip, SlidersHorizontal } from '@phosphor-icons/react'

const PROMPT =
  'Lieferung für Acme vorbereiten und mit Julia teilen'
const TYPE_MS = 42
const HOLD_MS = 2400
const RESET_MS = 600

export default function StatusExecutiveDeliveriesDemo() {
  const [len, setLen] = useState(0)
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setLen(PROMPT.length)
      return
    }

    let index = 0
    let typingTimer: ReturnType<typeof setTimeout> | null = null
    let holdTimer: ReturnType<typeof setTimeout> | null = null
    let resetTimer: ReturnType<typeof setTimeout> | null = null
    let cursorTimer: ReturnType<typeof setInterval> | null = null

    const scheduleReset = () => {
      resetTimer = setTimeout(() => {
        index = 0
        setLen(0)
        typeNext()
      }, RESET_MS)
    }

    const typeNext = () => {
      if (index >= PROMPT.length) {
        holdTimer = setTimeout(scheduleReset, HOLD_MS)
        return
      }
      index += 1
      setLen(index)
      typingTimer = setTimeout(typeNext, TYPE_MS)
    }

    cursorTimer = setInterval(() => setShowCursor(v => !v), 530)
    typeNext()

    return () => {
      if (typingTimer) clearTimeout(typingTimer)
      if (holdTimer) clearTimeout(holdTimer)
      if (resetTimer) clearTimeout(resetTimer)
      if (cursorTimer) clearInterval(cursorTimer)
    }
  }, [])

  const text = PROMPT.slice(0, len)

  return (
    <div className="st-ex-tagro-demo" aria-hidden>
      <div className="st-ex-tagro-demo-scene">
        <div className="st-ex-tagro-demo-glow" />
        <div className="st-ex-tagro-demo-portrait" />
      </div>
      <div className="st-ex-tagro-demo-composer">
        <p className="st-ex-tagro-demo-text">
          {text}
          <span className={`st-ex-tagro-demo-caret${showCursor ? ' on' : ''}`} />
        </p>
        <div className="st-ex-tagro-demo-toolbar">
          <div className="st-ex-tagro-demo-tools">
            <Paperclip size={11} weight="regular" />
            <Image size={11} weight="regular" />
            <At size={11} weight="regular" />
            <span className="st-ex-tagro-demo-divider" />
            <SlidersHorizontal size={11} weight="regular" />
          </div>
          <span className={`st-ex-tagro-demo-send${len >= PROMPT.length ? ' ready' : ''}`}>
            <ArrowUp size={12} weight="bold" />
          </span>
        </div>
      </div>
    </div>
  )
}
