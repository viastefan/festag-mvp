'use client'

import { Fragment, useEffect, useRef } from 'react'

type LineState = 'past' | 'adjacent' | 'active' | 'lead' | 'future'

type Props = {
  sentences: string[]
  activeIndex: number
  activeWordIndex: number
  animating: boolean
}

function lineState(index: number, active: number): LineState {
  if (active < 0) return index === 0 ? 'lead' : 'future'
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
  if (state !== 'active') {
    return <p className={`wsb-line wsb-line--${state}`}>{text}</p>
  }

  const words = text.split(/\s+/).filter(Boolean)

  return (
    <p className={`wsb-line wsb-line--${state}`}>
      {words.map((word, i) => {
        let wordState = 'pending'
        if (i < spokenThrough) wordState = 'spoken'
        else if (i === spokenThrough) wordState = 'current'

        return (
          <Fragment key={`${word}-${i}`}>
            <span className={`wsb-word wsb-word--${wordState}`}>{word}</span>
            {i < words.length - 1 ? ' ' : null}
          </Fragment>
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
    if (!stage || !track) return

    const focusIndex = activeIndex >= 0 ? activeIndex : 0
    const line = lineRefs.current[focusIndex]

    const position = () => {
      if (!line) {
        track.style.transform = 'translate3d(0, 0, 0)'
        return
      }

      if (activeIndex < 0) {
        track.style.transform = 'translate3d(0, 0, 0)'
        return
      }

      const target = line.offsetTop + line.offsetHeight / 2 - stage.clientHeight * 0.42
      track.style.transform = `translate3d(0, ${-Math.max(0, target)}px, 0)`
    }

    position()
    const ro = new ResizeObserver(position)
    ro.observe(stage)
    if (line) ro.observe(line)
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
