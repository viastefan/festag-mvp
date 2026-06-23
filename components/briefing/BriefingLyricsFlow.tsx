'use client'

import { useEffect, useRef } from 'react'

type LineState = 'past' | 'adjacent' | 'active' | 'future'

type Props = {
  sentences: string[]
  activeIndex: number
  activeWordIndex: number
  animating: boolean
}

function lineState(index: number, active: number): LineState {
  if (active < 0) return 'future'
  if (index === active) return 'active'
  if (index === active - 1 || index === active + 1) return 'adjacent'
  if (index < active) return 'past'
  return 'future'
}

function BriefingLine({
  text,
  state,
  spokenThrough,
}: {
  text: string
  state: LineState
  spokenThrough: number
}) {
  const words = text.split(/\s+/).filter(Boolean)

  return (
    <p className={`wsb-line wsb-line--${state}`}>
      {words.map((word, i) => {
        let wordState = 'pending'
        if (state === 'active') {
          if (i < spokenThrough) wordState = 'spoken'
          else if (i === spokenThrough) wordState = 'current'
        } else if (state === 'past' || spokenThrough >= words.length) {
          wordState = 'spoken'
        }
        return (
          <span key={`${word}-${i}`} className={`wsb-word wsb-word--${wordState}`}>
            {word}
          </span>
        )
      })}
    </p>
  )
}

export default function BriefingLyricsFlow({ sentences, activeIndex, activeWordIndex, animating }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    lineRefs.current = []
  }, [sentences])

  useEffect(() => {
    const stage = stageRef.current
    const track = trackRef.current
    const line = activeIndex >= 0 ? lineRefs.current[activeIndex] : null
    if (!stage || !track || !line) {
      if (track) track.style.transform = 'translate3d(0, 0, 0)'
      return
    }

    const center = () => {
      const target = line.offsetTop + line.offsetHeight / 2 - stage.clientHeight / 2
      track.style.transform = `translate3d(0, ${-Math.max(0, target)}px, 0)`
    }

    center()
    const ro = new ResizeObserver(center)
    ro.observe(stage)
    ro.observe(line)
    return () => ro.disconnect()
  }, [activeIndex, sentences, animating])

  return (
    <div className="wsb-lyrics-mask">
      <div className="wsb-lyrics-stage" ref={stageRef}>
        <div className="wsb-lyrics-track" ref={trackRef}>
          {sentences.map((sentence, i) => {
            const state = lineState(i, activeIndex)
            const spokenThrough =
              state === 'past'
                ? sentence.split(/\s+/).filter(Boolean).length
                : state === 'active'
                  ? Math.max(0, activeWordIndex)
                  : 0
            return (
              <div
                key={`${i}-${sentence.slice(0, 24)}`}
                ref={(el) => {
                  lineRefs.current[i] = el
                }}
                className="wsb-line-wrap"
              >
                <BriefingLine text={sentence} state={state} spokenThrough={spokenThrough} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
