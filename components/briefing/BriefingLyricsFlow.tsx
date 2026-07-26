'use client'

import { Fragment, useEffect, useRef } from 'react'

type SentenceState = 'past' | 'adjacent' | 'active' | 'lead' | 'future'

type Props = {
  sentences: string[]
  activeIndex: number
  activeWordIndex: number
  animating: boolean
  onHoverPause?: () => void
}

function sentenceState(index: number, active: number): SentenceState {
  if (active < 0) return index === 0 ? 'lead' : 'future'
  if (index === active) return 'active'
  if (index === active - 1 || index === active + 1) return 'adjacent'
  if (index < active) return 'past'
  return 'future'
}

function wordHighlight(
  sentenceState: SentenceState,
  wordIndex: number,
  activeWordIndex: number,
): 'spoken' | 'current' | 'pending' | 'idle' {
  if (sentenceState === 'active') {
    if (wordIndex < activeWordIndex) return 'spoken'
    if (wordIndex === activeWordIndex) return 'current'
    return 'pending'
  }
  if (sentenceState === 'past') return 'spoken'
  return 'idle'
}

export default function BriefingLyricsFlow({
  sentences,
  activeIndex,
  activeWordIndex,
  animating,
  onHoverPause,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const activeWordRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    activeWordRef.current = null
  }, [sentences])

  useEffect(() => {
    const stage = stageRef.current
    const track = trackRef.current
    if (!stage || !track) return

    const position = () => {
      if (activeIndex < 0) {
        track.style.transform = 'translate3d(0, 0, 0)'
        return
      }

      const word = activeWordRef.current
      if (!word) return

      const focusY = stage.clientHeight * 0.42
      const target = word.offsetTop + word.offsetHeight / 2 - focusY
      track.style.transform = `translate3d(0, ${-Math.max(0, target)}px, 0)`
    }

    position()
    const ro = new ResizeObserver(position)
    ro.observe(stage)
    if (activeWordRef.current) ro.observe(activeWordRef.current)
    return () => ro.disconnect()
  }, [activeIndex, activeWordIndex, sentences, animating])

  return (
    <div
      className="wsb-lyrics-mask"
      onMouseEnter={onHoverPause}
      role="presentation"
    >
      <div
        className={[
          'wsb-lyrics-stage',
          activeIndex >= 0 ? 'wsb-lyrics-stage--live' : 'wsb-lyrics-stage--idle',
        ].filter(Boolean).join(' ')}
        ref={stageRef}
      >
        <div className="wsb-lyrics-track" ref={trackRef}>
          <p className="wsb-prose">
            {sentences.map((sentence, sentenceIdx) => {
              const state = sentenceState(sentenceIdx, activeIndex)
              const words = sentence.split(/\s+/).filter(Boolean)
              return words.map((word, wordIdx) => {
                const highlight = wordHighlight(state, wordIdx, activeWordIndex)
                const isCurrent = activeIndex === sentenceIdx && wordIdx === activeWordIndex
                return (
                  <Fragment key={`${sentenceIdx}-${wordIdx}-${word}`}>
                    <span
                      ref={isCurrent ? activeWordRef : undefined}
                      className={[
                        'wsb-prose-word',
                        `wsb-prose-word--${state}`,
                        highlight !== 'idle' ? `wsb-prose-word--${highlight}` : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {word}
                    </span>
                    {' '}
                  </Fragment>
                )
              })
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
