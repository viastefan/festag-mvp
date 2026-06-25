'use client'

import { useCallback, useEffect, useState } from 'react'
import { At, Image, Paperclip, SlidersHorizontal } from '@phosphor-icons/react'
import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import { openTagro, type TagroOpenDetail } from '@/components/TagroOverlay'

const DEFAULT_PROMPT = 'Lieferung prüfen und mit Tagro teilen'
const TYPE_MS = 42
const HOLD_MS = 2400
const RESET_MS = 600

type Props = {
  prompt?: string
  tagroContext?: TagroOpenDetail
}

export default function StatusExecutiveDeliveriesDemo({ prompt, tagroContext }: Props) {
  const fullPrompt = (prompt?.trim() || DEFAULT_PROMPT).trim()
  const [len, setLen] = useState(0)
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    setLen(0)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setLen(fullPrompt.length)
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
      if (index >= fullPrompt.length) {
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
  }, [fullPrompt])

  const ready = len >= fullPrompt.length
  const text = fullPrompt.slice(0, len)

  const openDemoTagro = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!ready) return
    openTagro({
      contextType: tagroContext?.contextType ?? 'status_report',
      id: tagroContext?.id ?? 'dashboard-deliveries',
      title: tagroContext?.title ?? 'Lieferungen',
      prefill: fullPrompt,
    })
  }, [fullPrompt, ready, tagroContext])

  return (
    <div className="st-ex-tagro-demo">
      <div className="st-ex-tagro-demo-scene" aria-hidden>
        <div className="st-ex-tagro-demo-glow" />
        <div className="st-ex-tagro-demo-portrait" />
      </div>
      <div
        className={`st-ex-tagro-demo-composer${ready ? ' is-ready' : ''}`}
        onClick={openDemoTagro}
        onKeyDown={(e) => {
          if (ready && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            e.stopPropagation()
            openTagro({
              contextType: tagroContext?.contextType ?? 'status_report',
              id: tagroContext?.id ?? 'dashboard-deliveries',
              title: tagroContext?.title ?? 'Lieferungen',
              prefill: fullPrompt,
            })
          }
        }}
        role={ready ? 'button' : undefined}
        tabIndex={ready ? 0 : -1}
        aria-label={ready ? 'Mit Tagro Lieferung besprechen' : undefined}
      >
        <p className="st-ex-tagro-demo-text">
          {text}
          <span className={`st-ex-tagro-demo-caret${showCursor ? ' on' : ''}`} />
        </p>
        <div className="st-ex-tagro-demo-toolbar">
          <div className="st-ex-tagro-demo-tools" aria-hidden>
            <Paperclip size={11} weight="regular" />
            <Image size={11} weight="regular" />
            <At size={11} weight="regular" />
            <span className="st-ex-tagro-demo-divider" />
            <SlidersHorizontal size={11} weight="regular" />
          </div>
          <span
            className={`st-ex-tagro-demo-send festag-tagro-compose-btn${ready ? ' ready' : ''}`}
            role="button"
            aria-disabled={!ready}
            aria-label="Mit Tagro bearbeiten"
            title="Mit Tagro bearbeiten"
            onClick={openDemoTagro}
            onKeyDown={(e) => {
              if (!ready) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                openTagro({
                  contextType: tagroContext?.contextType ?? 'status_report',
                  id: tagroContext?.id ?? 'dashboard-deliveries',
                  title: tagroContext?.title ?? 'Lieferungen',
                  prefill: fullPrompt,
                })
              }
            }}
          >
            <TagroComposeIcon size={13} />
          </span>
        </div>
      </div>
    </div>
  )
}
