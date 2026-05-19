'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SpeakerHigh, X } from '@phosphor-icons/react'
import VoiceControls from '@/components/VoiceControls'
import { generateBriefingText } from '@/lib/briefings'
import type { BriefingType } from '@/lib/voice'

type VoiceBriefingButtonProps = {
  type: BriefingType
  label: string
  projectTitle?: string
  report?: string
  projectStatus?: string
  progress?: number
  blockerCount?: number
  decisionCount?: number
  nextSteps?: string[]
}

export default function VoiceBriefingButton(props: VoiceBriefingButtonProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ left: 16, top: 80 })
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const text = useMemo(() => generateBriefingText(props), [props.type, props.projectTitle, props.report, props.projectStatus, props.progress, props.blockerCount, props.decisionCount, props.nextSteps?.join('|')])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      const width = Math.min(420, window.innerWidth - 32)
      if (!rect) return
      // Anchor the popover's *left edge* to the button so it always
      // opens out to the right and never overlaps the sidebar (212px
      // wide on desktop). Clamps respect the viewport edge.
      const SIDEBAR_GUARD = 228          // 212 + 16px safe margin
      const desiredLeft = rect.left
      const maxLeft = Math.max(SIDEBAR_GUARD, window.innerWidth - width - 16)
      setPosition({
        left: Math.min(maxLeft, Math.max(SIDEBAR_GUARD, desiredLeft)),
        top: Math.max(16, Math.min(window.innerHeight - 260, rect.bottom + 10)),
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const popover = open && mounted ? createPortal(
    <>
      <div className="audio-briefing-backdrop" onMouseDown={() => setOpen(false)} />
      <div className="audio-briefing-layer" style={{ left: position.left, top: position.top }} role="dialog" aria-label="Tagro Voice Report">
        <div className="audio-briefing-head">
          <div>
            <p>Tagro Voice Report</p>
            <span>Executive Summary · startet nur manuell</span>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Voice Report schließen"><X size={14} /></button>
        </div>
        <p className="audio-briefing-text">{text}</p>
        <VoiceControls text={text} compact />
      </div>
    </>,
    document.body
  ) : null

  return (
    <div className="audio-briefing-wrap">
      <button ref={buttonRef} className="audio-briefing-button" type="button" onClick={() => setOpen((value) => !value)}>
        <SpeakerHigh size={15} />
        {props.label}
      </button>
      {popover}
    </div>
  )
}
