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

export type ReadStackContext = {
  calmLine: string
  pendingDecisions: number
  atRisk: number
  openTasks: number
  teamMembers: number
  healthLabel: string
  activityTitles?: string[]
  projectTitles?: string[]
  decisionTitles?: string[]
  teamNames?: string[]
  briefingLines?: string[]
}

type Props = {
  greeting: string
  firstName: string
  beats: ReadBeat[]
  filter: ReportFilter
  opening: { lead: string; rest: string }
  onCreateProject?: () => void
  showCreateProject?: boolean
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

export default function OverviewReadStack({
  beats,
  filter,
  opening,
  onCreateProject,
  showCreateProject = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const [pairIndex, setPairIndex] = useState(0)
  const [canScroll, setCanScroll] = useState(false)
  const [atEnd, setAtEnd] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  const visibleBeats = useMemo(() => {
    if (filter !== 'all') return beats.filter((b) => b.topic === filter)
    const seen = new Set<string>()
    const out: ReadBeat[] = []
    for (const b of beats) {
      if (b.topic === 'all') {
        out.push(b)
        continue
      }
      if (seen.has(b.topic)) continue
      seen.add(b.topic)
      out.push(b)
    }
    return out
  }, [beats, filter])

  const headline = useMemo(() => {
    if (pairIndex <= 0) {
      return { ...fitHeadline(opening.lead, opening.rest), fromScroll: false }
    }
    const line = visibleBeats[(pairIndex - 1) * 2]?.text
      || visibleBeats[(pairIndex - 1) * 2 + 1]?.text
      || ''
    if (!line) return { ...fitHeadline(opening.lead, opening.rest), fromScroll: false }

    const mid = Math.min(line.length, Math.floor(line.length * 0.48))
    const sp = line.lastIndexOf(' ', mid)
    const cut = sp > 10 ? sp : mid
    const lead = line.slice(0, cut).trim()
    const rest = line.slice(cut).trim()
    return { ...fitHeadline(lead, rest), fromScroll: true }
  }, [pairIndex, visibleBeats, opening])

  const publishProgress = useCallback((raw: number) => {
    const p = Math.max(0, Math.min(1, raw))
    const eased = easeOutCubic(p)
    const ffl = rootRef.current?.closest('.ffl') as HTMLElement | null
    if (ffl) {
      ffl.style.setProperty('--ffl-read', eased.toFixed(4))
      ffl.classList.toggle('is-reading', eased > 0.04)
    }
    window.dispatchEvent(new CustomEvent('festag-overview-read-progress'))
  }, [])

  const syncScroll = useCallback(() => {
    const root = scrollRef.current
    if (!root) return

    const scrollTop = root.scrollTop
    const range = Math.max(1, root.scrollHeight - root.clientHeight)
    publishProgress(scrollTop / range)

    let past = 0
    for (let i = 0; i < lineRefs.current.length; i++) {
      const el = lineRefs.current[i]
      if (!el) continue
      const mid = el.offsetTop + el.offsetHeight * 0.55
      if (mid <= scrollTop + 2) past += 1
      else break
    }

    const maxPair = Math.max(0, Math.ceil(visibleBeats.length / 2))
    const nextPair = Math.min(Math.floor(past / 2), maxPair)
    setPairIndex(nextPair)

    const can = root.scrollHeight > root.clientHeight + 8
    setCanScroll(can)
    setAtEnd(!can || scrollTop + root.clientHeight >= root.scrollHeight - 10)
  }, [visibleBeats.length, publishProgress])

  useEffect(() => {
    setPairIndex(0)
    publishProgress(0)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    const id = window.requestAnimationFrame(() => syncScroll())
    return () => window.cancelAnimationFrame(id)
  }, [filter, visibleBeats, opening.lead, syncScroll, publishProgress])

  useEffect(() => {
    const root = scrollRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => syncScroll())
    ro.observe(root)
    return () => ro.disconnect()
  }, [syncScroll])

  useEffect(() => () => {
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    const ffl = rootRef.current?.closest('.ffl') as HTMLElement | null
    if (ffl) {
      ffl.style.setProperty('--ffl-read', '0')
      ffl.classList.remove('is-reading')
    }
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
    <div ref={rootRef} className={`ffl-read${headline.fromScroll ? ' is-promoted-read' : ''}`}>
      <h1
        className={`ffl-greet${headline.fromScroll ? ' is-promoted' : ''}`}
        key={`${filter}-${pairIndex}-${headline.lead}`}
      >
        <span className="ffl-greet-lead">{headline.lead}</span>
        {headline.rest ? <span className="ffl-greet-rest">{headline.rest}</span> : null}
      </h1>

      <div
        ref={scrollRef}
        className="ffl-read-scroll"
        onScroll={syncScroll}
      >
        {visibleBeats.map((beat, i) => {
          const promoted = pairIndex > 0 && i < pairIndex * 2
          return (
            <p
              key={`${beat.topic}-${i}-${beat.text.slice(0, 24)}`}
              ref={(el) => { lineRefs.current[i] = el }}
              className={`ffl-read-line${promoted ? ' is-up' : ''}`}
              aria-hidden={promoted || undefined}
            >
              {beat.text}
            </p>
          )
        })}
        <div className="ffl-read-scroll-pad" aria-hidden />
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

function endDot(s: string) {
  const t = s.trim()
  if (!t) return t
  return /[.!?…]$/.test(t) ? t : `${t}.`
}

/** Keep H1 optically short — ~2 lines lead, short muted rest. */
function fitHeadline(lead: string, rest: string): { lead: string; rest: string } {
  const softCut = (text: string, max: number) => {
    const t = text.trim()
    if (t.length <= max) return t
    const slice = t.slice(0, max)
    const at = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('—'), slice.lastIndexOf(','))
    const cut = at > Math.floor(max * 0.45) ? at : max
    return `${slice.slice(0, cut).trim().replace(/[,—:\s]+$/, '')}…`
  }

  let L = lead.trim()
  let R = rest.trim()

  // Prefer one crisp sentence as lead; move overflow into rest.
  if (L.length > 36) {
    const mid = Math.min(L.length, 34)
    const sp = L.lastIndexOf(' ', mid)
    const cut = sp > 12 ? sp : mid
    const head = L.slice(0, cut).trim()
    const tail = L.slice(cut).trim()
    L = head
    R = [tail, R].filter(Boolean).join(' ')
  }

  L = softCut(L, 40)
  if (R) R = softCut(R, 44)
  return {
    lead: L,
    rest: R ? (R.startsWith(' ') ? R : ` ${R}`) : '',
  }
}

/** H1 for the current filter — ink lead + muted rest, topic-matched. */
export function buildOverviewOpening(
  filter: ReportFilter,
  greeting: string,
  firstName: string,
  ctx: ReadStackContext,
): { lead: string; rest: string } {
  const name = firstName.trim() || 'du'
  if (filter === 'all') {
    return fitHeadline(`${greeting}, ${name}.`, 'Alles läuft vorerst ruhig.')
  }

  if (filter === 'communication') {
    const latest = ctx.activityTitles?.[0]
    if (latest) {
      return fitHeadline('Bewegung in der Kommunikation.', `Zuletzt: ${latest.replace(/\.$/, '')}.`)
    }
    return fitHeadline('Kommunikation ist ruhig.', 'Tagro hört mit.')
  }

  if (filter === 'risks') {
    if (ctx.atRisk > 0) {
      return fitHeadline(
        ctx.atRisk === 1 ? 'Ein Risiko im Blick.' : `${ctx.atRisk} Risiken im Blick.`,
        'Tagro empfiehlt Klärung.',
      )
    }
    return fitHeadline('Keine offenen Risiken.', 'Der Blick bleibt ruhig.')
  }

  if (filter === 'decisions') {
    if (ctx.pendingDecisions > 0) {
      return fitHeadline(
        ctx.pendingDecisions === 1
          ? 'Eine Entscheidung wartet.'
          : `${ctx.pendingDecisions} Entscheidungen warten.`,
        'Tagro hat Empfehlungen.',
      )
    }
    return fitHeadline('Keine offenen Entscheidungen.', 'Freigaben sind erledigt.')
  }

  if (filter === 'status') {
    const label = ctx.healthLabel.toLowerCase()
    return fitHeadline(
      `Status: ${label}.`,
      ctx.openTasks > 0
        ? `${ctx.openTasks === 1 ? 'Eine Aufgabe' : `${ctx.openTasks} Aufgaben`} in Arbeit.`
        : 'Keine dringenden Aufgaben.',
    )
  }

  if (filter === 'team') {
    const n = Math.max(1, ctx.teamMembers)
    return fitHeadline(
      n === 1 ? 'Dein Team ist aktiv.' : `${n} Personen aktiv.`,
      'Tagro hält den Überblick.',
    )
  }

  const project = ctx.projectTitles?.[0]
  return fitHeadline(
    project ? `${project}.` : 'Dein Projekt.',
    'Der Gesamtbericht fasst den Stand.',
  )
}

export function buildOverviewReadBeats(input: ReadStackContext): ReadBeat[] {
  const beats: ReadBeat[] = []
  const push = (topic: ReadBeat['topic'], text: string) => {
    const t = endDot(text)
    if (t) beats.push({ topic, text: t })
  }

  const calm = endDot(input.calmLine)
  if (calm) push('all', calm)

  const acts = (input.activityTitles || []).filter(Boolean)
  if (acts.length) {
    // Opening H1 already carries the latest signal — body continues from there.
    if (acts[1]) push('communication', `Davor: ${acts[1]}`)
    push('communication', 'Tagro fasst Signale ruhig zusammen, ohne Lärm.')
    push('communication', 'Du musst nichts nachfragen — der Stand bleibt sichtbar.')
  } else {
    push('communication', 'Heute war die Kommunikation ruhig — keine dringenden Signale.')
    push('communication', 'Tagro hört weiter mit und meldet sich nur, wenn es zählt.')
    push('communication', 'Du musst nichts nachfragen — der Stand bleibt sichtbar.')
  }

  if (input.atRisk > 0) {
    push(
      'risks',
      input.atRisk === 1
        ? 'Ein Risiko bleibt im Blick und sollte geklärt werden.'
        : `${input.atRisk} Risiken bleiben im Blick und sollten geklärt werden.`,
    )
    push('risks', 'Tagro empfiehlt eine kurze Klärung, bevor der Fortschritt stockt.')
  } else {
    push('risks', 'Abgesehen davon gibt es keine auffälligen Vorkommnisse.')
    push('risks', 'Keine Blocker, keine Eskalation — der Blick bleibt ruhig.')
  }

  if (input.pendingDecisions > 0) {
    push(
      'decisions',
      input.pendingDecisions === 1
        ? 'Eine Entscheidung wartet noch auf deine Freigabe.'
        : `${input.pendingDecisions} offene Entscheidungen warten noch auf deine Freigabe.`,
    )
    const first = input.decisionTitles?.[0]
    if (first) push('decisions', first)
    push('decisions', 'Tagro hat Empfehlungen vorbereitet — du entscheidest.')
  } else {
    push('decisions', 'Optional könnten wir prüfen, wie die bisherigen Entscheidungen umgesetzt wurden.')
    push('decisions', 'Aktuell wartet nichts auf deine Freigabe.')
  }

  push('status', `Projektstatus ${input.healthLabel.toLowerCase()}.`)
  push(
    'status',
    input.openTasks > 0
      ? `Tagro überwacht ${input.openTasks === 1 ? 'eine offene Aufgabe' : `${input.openTasks} Aufgaben`}, Entscheidungen und Blocker weiter.`
      : 'Tagro überwacht Tasks, Entscheidungen und Blocker weiter.',
  )
  push('status', 'Der Rhythmus bleibt erkennbar — ohne Dashboard-Lärm.')

  const names = (input.teamNames || []).filter(Boolean)
  push(
    'team',
    names.length
      ? `Aktiv: ${names.slice(0, 3).join(', ')}.`
      : `Team: ${Math.max(1, input.teamMembers)} aktiv.`,
  )
  push('team', 'Rollen und Fortschritt bleiben für dich sichtbar.')
  push('team', 'Tagro hält den Überblick, ohne jemanden zu überwachen.')

  const projects = (input.projectTitles || []).filter(Boolean)
  if (projects.length) {
    push(
      'project',
      projects.length === 1
        ? `${projects[0]} ist dein aktueller Fokus.`
        : `${projects.slice(0, 2).join(' und ')} sind im Blick.`,
    )
  }
  push('project', 'Bei Bedarf können wir den bisherigen Fortschritt noch einmal durchgehen.')
  push('project', 'Der Gesamtbericht bleibt die ruhige Lesefläche für den Stand.')

  return beats
}
