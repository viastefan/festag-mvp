'use client'

import { Fragment, useEffect, useRef } from 'react'
import StatusSentenceActionCard, {
  type StatusSentenceAction,
} from '@/components/status/StatusSentenceActionCard'

type SentenceState = 'past' | 'adjacent' | 'active' | 'lead' | 'future'

type Props = {
  sentences: string[]
  activeIndex: number
  activeWordIndex: number
  /** When false, user has taken over scroll (Spotify lyrics behavior). */
  autoScroll?: boolean
  animating?: boolean
  onHoverPause?: () => void
  onUserScroll?: () => void
  className?: string
  /** Decision Engine inline cards keyed by sentence index. */
  sentenceActions?: Record<number, StatusSentenceAction[]>
  onDismissAction?: (id: string) => void
  onDecidedAction?: (id: string) => void
}

function sentenceState(index: number, active: number): SentenceState {
  if (active < 0) return index === 0 ? 'lead' : 'future'
  if (index === active) return 'active'
  if (index === active - 1 || index === active + 1) return 'adjacent'
  if (index < active) return 'past'
  return 'future'
}

function wordHighlight(
  state: SentenceState,
  wordIndex: number,
  activeWordIndex: number,
): 'spoken' | 'current' | 'pending' | 'idle' {
  if (state === 'active') {
    if (wordIndex < activeWordIndex) return 'spoken'
    if (wordIndex === activeWordIndex) return 'current'
    return 'pending'
  }
  if (state === 'past') return 'spoken'
  return 'idle'
}

export default function BriefingLyricsFlow({
  sentences,
  activeIndex,
  activeWordIndex,
  autoScroll = true,
  animating = true,
  onHoverPause,
  onUserScroll,
  className,
  sentenceActions,
  onDismissAction,
  onDecidedAction,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const activeWordRef = useRef<HTMLSpanElement | null>(null)
  const autoScrollRef = useRef(autoScroll)
  const onUserScrollRef = useRef(onUserScroll)

  useEffect(() => { autoScrollRef.current = autoScroll }, [autoScroll])
  useEffect(() => { onUserScrollRef.current = onUserScroll }, [onUserScroll])

  useEffect(() => {
    activeWordRef.current = null
  }, [sentences])

  useEffect(() => {
    const stage = stageRef.current
    const track = trackRef.current
    if (!stage || !track) return

    const position = () => {
      if (!autoScrollRef.current) return
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
  }, [activeIndex, activeWordIndex, sentences, animating, autoScroll, sentenceActions])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const markUserScroll = () => {
      if (!autoScrollRef.current) return
      onUserScrollRef.current?.()
    }

    const onWheel = () => markUserScroll()
    const onTouchMove = () => markUserScroll()
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') return
    }

    stage.addEventListener('wheel', onWheel, { passive: true })
    stage.addEventListener('touchmove', onTouchMove, { passive: true })
    stage.addEventListener('pointerdown', onPointerDown)
    return () => {
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('touchmove', onTouchMove)
      stage.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    const track = trackRef.current
    if (!stage || !track) return
    if (autoScroll) {
      stage.style.overflowY = 'hidden'
      track.style.transition = ''
      return
    }
    const match = /translate3d\(0,\s*(-?[\d.]+)px/.exec(track.style.transform || '')
    const offset = match ? Math.abs(parseFloat(match[1])) : 0
    track.style.transform = 'translate3d(0, 0, 0)'
    track.style.transition = 'none'
    stage.style.overflowY = 'auto'
    stage.scrollTop = offset
  }, [autoScroll])

  return (
    <div
      className={['wsb-lyrics-mask', className].filter(Boolean).join(' ')}
      onMouseEnter={onHoverPause}
      role="presentation"
    >
      <div
        className={[
          'wsb-lyrics-stage',
          activeIndex >= 0 ? 'wsb-lyrics-stage--live' : 'wsb-lyrics-stage--idle',
          !autoScroll ? 'wsb-lyrics-stage--manual' : '',
        ].filter(Boolean).join(' ')}
        ref={stageRef}
      >
        <div className="wsb-lyrics-track" ref={trackRef}>
          <div className="wsb-prose">
            {sentences.map((sentence, sentenceIdx) => {
              const state = sentenceState(sentenceIdx, activeIndex)
              const words = sentence.split(/\s+/).filter(Boolean)
              const actions = sentenceActions?.[sentenceIdx] || []
              const showCards =
                actions.length > 0 &&
                (activeIndex < 0 || state === 'active' || state === 'adjacent' || state === 'past')

              return (
                <div
                  key={`s-${sentenceIdx}`}
                  className={`wsb-prose-sentence wsb-prose-sentence--${state}`}
                >
                  <p className="wsb-prose-line">
                    {words.map((word, wordIdx) => {
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
                    })}
                  </p>
                  {showCards
                    ? actions.map(action => (
                        <StatusSentenceActionCard
                          key={action.id}
                          action={action}
                          onDismiss={id => onDismissAction?.(id)}
                          onDecided={id => onDecidedAction?.(id)}
                        />
                      ))
                    : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
