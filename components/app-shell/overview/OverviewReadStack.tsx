'use client'

/**
 * Overview editorial read stack — scroll promotes line pairs into the H1,
 * body fades downward, quiet audio + share, filters sync with Fluss.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SpeakerHigh, SpeakerSlash, ShareNetwork } from '@phosphor-icons/react'
import type { FlowNodeId } from '@/components/app-shell/overview/overview-nodes'

export type ReadBeat = {
  text: string
  topic: FlowNodeId | 'all'
}

export type ReportFilter = FlowNodeId | 'all'

export const REPORT_FILTERS: Array<{ id: ReportFilter; label: string }> = [
  { id: 'all', label: 'Alles' },
  { id: 'communication', label: 'Kommunikation' },
  { id: 'risks', label: 'Risiken' },
  { id: 'decisions', label: 'Entscheidungen' },
  { id: 'status', label: 'Status' },
  { id: 'team', label: 'Team' },
  { id: 'project', label: 'Projekt' },
]

type Props = {
  greeting: string
  firstName: string
  beats: ReadBeat[]
  filter: ReportFilter
  onCreateProject?: () => void
  showCreateProject?: boolean
}

export default function OverviewReadStack({
  greeting,
  firstName,
  beats,
  filter,
  onCreateProject,
  showCreateProject = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const [pairIndex, setPairIndex] = useState(0)
  const [canScroll, setCanScroll] = useState(false)
  const [atEnd, setAtEnd] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  const visibleBeats = useMemo(
    () => (filter === 'all' ? beats : beats.filter((b) => b.topic === 'all' || b.topic === filter)),
    [beats, filter],
  )

  const greetingLead = `${greeting}, ${firstName}.`
  const greetingRest = ' Alles läuft vorerst ruhig.'

  const headline = useMemo(() => {
    if (pairIndex <= 0) {
      return { lead: greetingLead, rest: greetingRest }
    }
    const start = (pairIndex - 1) * 2
    const a = visibleBeats[start]?.text || ''
    const b = visibleBeats[start + 1]?.text || ''
    if (!a && !b) return { lead: greetingLead, rest: greetingRest }
    if (a && b) {
      const mid = Math.min(a.length, Math.floor(a.length * 0.55))
      const split = a.lastIndexOf(' ', mid)
      const cut = split > 8 ? split : mid
      return { lead: a.slice(0, cut).trim(), rest: ` ${`${a.slice(cut).trim()} ${b}`.trim()}` }
    }
    return { lead: a || b, rest: '' }
  }, [pairIndex, visibleBeats, greetingLead, greetingRest])

  const syncScroll = useCallback(() => {
    const root = scrollRef.current
    if (!root) return
    const top = root.getBoundingClientRect().top + 8
    let past = 0
    for (const el of lineRefs.current) {
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (rect.bottom <= top + 2) past += 1
      else break
    }
    const nextPair = Math.min(
      Math.floor(past / 2),
      Math.max(0, Math.ceil(visibleBeats.length / 2)),
    )
    setPairIndex(nextPair)
    const can = root.scrollHeight > root.clientHeight + 4
    setCanScroll(can)
    setAtEnd(!can || root.scrollTop + root.clientHeight >= root.scrollHeight - 8)
  }, [visibleBeats.length])

  useEffect(() => {
    setPairIndex(0)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    const id = window.requestAnimationFrame(() => syncScroll())
    return () => window.cancelAnimationFrame(id)
  }, [filter, visibleBeats, syncScroll])

  useEffect(() => {
    const root = scrollRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => syncScroll())
    ro.observe(root)
    return () => ro.disconnect()
  }, [syncScroll])

  useEffect(() => () => {
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
  }, [])

  const fullText = useMemo(() => {
    const head = `${headline.lead}${headline.rest}`.trim()
    return [head, ...visibleBeats.map((b) => b.text)].join(' ')
  }, [headline, visibleBeats])

  function toggleSpeak() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const u = new SpeechSynthesisUtterance(fullText)
    u.lang = 'de-DE'
    u.rate = 1
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    utterRef.current = u
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }

  async function shareReport() {
    const payload = { title: 'Festag Bericht', text: fullText }
    try {
      if (navigator.share) {
        await navigator.share(payload)
        return
      }
    } catch { /* cancelled */ }
    const wa = `https://wa.me/?text=${encodeURIComponent(fullText)}`
    window.open(wa, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="ffl-read">
      <h1 className="ffl-greet" key={`${pairIndex}-${headline.lead}`}>
        <span className="ffl-greet-lead">{headline.lead}</span>
        {headline.rest ? <span className="ffl-greet-rest">{headline.rest}</span> : null}
      </h1>

      <div
        ref={scrollRef}
        className={`ffl-read-scroll${atEnd ? ' is-end' : ''}`}
        onScroll={syncScroll}
      >
        {visibleBeats.map((beat, i) => (
          <p
            key={`${beat.topic}-${i}-${beat.text.slice(0, 24)}`}
            ref={(el) => { lineRefs.current[i] = el }}
            className="ffl-read-line"
          >
            {beat.text}
          </p>
        ))}
      </div>

      <div className="ffl-read-foot">
        <p className={`ffl-read-hint${canScroll && !atEnd ? '' : ' is-hidden'}`}>
          Scrollen — je zwei Zeilen werden zur Überschrift
        </p>
        <div className="ffl-read-actions">
          <button
            type="button"
            className={`ffl-icon-btn${speaking ? ' is-on' : ''}`}
            onClick={toggleSpeak}
            aria-label={speaking ? 'Vorlesen stoppen' : 'Bericht vorlesen'}
            title={speaking ? 'Stoppen' : 'Vorlesen'}
          >
            {speaking ? <SpeakerSlash size={16} weight="regular" /> : <SpeakerHigh size={16} weight="regular" />}
          </button>
          <button
            type="button"
            className="ffl-icon-btn"
            onClick={() => void shareReport()}
            aria-label="Bericht teilen"
            title="Teilen"
          >
            <ShareNetwork size={16} weight="regular" />
          </button>
        </div>
      </div>

      {showCreateProject && onCreateProject ? (
        <button type="button" className="ffl-cta" onClick={onCreateProject}>
          Erstes Projekt anlegen
        </button>
      ) : null}
    </div>
  )
}

export function buildOverviewReadBeats(input: {
  calmLine: string
  pendingDecisions: number
  atRisk: number
  openTasks: number
  teamMembers: number
  healthLabel: string
  activityTitle?: string | null
  briefingLines?: string[]
}): ReadBeat[] {
  const beats: ReadBeat[] = []
  const briefing = (input.briefingLines || []).map((l) => l.trim()).filter(Boolean)
  if (briefing.length) {
    briefing.forEach((text, i) => {
      const topic: ReadBeat['topic'] =
        /risiko/i.test(text) ? 'risks'
          : /entscheid/i.test(text) ? 'decisions'
            : /team|entwickl/i.test(text) ? 'team'
              : /kommunik|signal|still/i.test(text) ? 'communication'
                : /status|fortschritt|phase/i.test(text) ? 'status'
                  : i === 0 ? 'all' : 'project'
      beats.push({ text: text.endsWith('.') ? text : `${text}.`, topic })
    })
    return beats
  }

  const calm = input.calmLine.trim()
  beats.push({
    text: calm.endsWith('.') ? calm : `${calm}.`,
    topic: 'all',
  })

  if (input.pendingDecisions > 0) {
    beats.push({
      text:
        input.pendingDecisions === 1
          ? 'Eine Entscheidung wartet noch auf deine Freigabe.'
          : `${input.pendingDecisions} offene Entscheidungen warten noch auf deine Freigabe.`,
      topic: 'decisions',
    })
  } else {
    beats.push({
      text: 'Optional könnten wir prüfen, wie die bisherigen Entscheidungen umgesetzt wurden.',
      topic: 'decisions',
    })
  }

  if (input.atRisk > 0) {
    beats.push({
      text:
        input.atRisk === 1
          ? 'Ein Risiko bleibt im Blick.'
          : `${input.atRisk} Risiken bleiben im Blick.`,
      topic: 'risks',
    })
  } else {
    beats.push({
      text: 'Abgesehen davon gibt es keine auffälligen Vorkommnisse.',
      topic: 'risks',
    })
  }

  beats.push({
    text:
      input.openTasks > 0
        ? `Tagro überwacht ${input.openTasks === 1 ? 'eine offene Aufgabe' : `${input.openTasks} Aufgaben`}, Entscheidungen und Blocker weiter.`
        : 'Tagro überwacht Tasks, Entscheidungen und Blocker weiter.',
    topic: 'status',
  })

  if (input.activityTitle) {
    beats.push({ text: `${input.activityTitle}.`, topic: 'communication' })
  } else {
    beats.push({
      text: 'Heute war die Kommunikation ruhig — keine dringenden Signale.',
      topic: 'communication',
    })
  }

  beats.push({
    text: `Team: ${Math.max(1, input.teamMembers)} aktiv. Projektstatus ${input.healthLabel.toLowerCase()}.`,
    topic: 'team',
  })

  beats.push({
    text: 'Bei Bedarf können wir den bisherigen Fortschritt noch einmal durchgehen.',
    topic: 'project',
  })

  return beats
}
