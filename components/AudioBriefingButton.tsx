'use client'

import { useMemo, useState } from 'react'
import { SpeakerHigh, X } from '@phosphor-icons/react'
import VoiceControls from '@/components/VoiceControls'
import { generateBriefingText } from '@/lib/briefings'
import type { BriefingType } from '@/lib/voice'

type AudioBriefingButtonProps = {
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

export default function AudioBriefingButton(props: AudioBriefingButtonProps) {
  const [open, setOpen] = useState(false)
  const text = useMemo(() => generateBriefingText(props), [props.type, props.projectTitle, props.report, props.projectStatus, props.progress, props.blockerCount, props.decisionCount, props.nextSteps?.join('|')])

  return (
    <div className="audio-briefing-wrap">
      <button className="audio-briefing-button" type="button" onClick={() => setOpen((value) => !value)}>
        <SpeakerHigh size={15} />
        {props.label}
      </button>
      {open && (
        <div className="audio-briefing-popover">
          <div className="audio-briefing-head">
            <div>
              <p>Tagro Audio Briefing</p>
              <span>Executive Summary · startet nur manuell</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Audio Briefing schließen"><X size={14} /></button>
          </div>
          <p className="audio-briefing-text">{text}</p>
          <VoiceControls text={text} compact />
        </div>
      )}
    </div>
  )
}
