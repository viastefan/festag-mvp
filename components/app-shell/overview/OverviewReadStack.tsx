'use client'

/**
 * Overview editorial read stack — stable H1, continuous body,
 * Bericht via footer icon only, compact audio + notiz export, calm marks.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Article,
  Check,
  FilePdf,
  NoteBlank,
  Pause,
  PencilSimple,
  Play,
  SpeakerHigh,
  ShareNetwork,
} from '@phosphor-icons/react'
import type { FlowNodeId } from '@/components/app-shell/overview/overview-nodes'
import {
  formatBriefingReadDate,
  loadBriefingReadAt,
  markBriefingRead,
  todayBriefingKey,
} from '@/lib/overview/briefing-read'
import { downloadBriefingNote } from '@/lib/overview/download-briefing-note'
import { downloadBriefingPdf } from '@/lib/overview/download-briefing-pdf'

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

export type MarkTone = 'risk' | 'decision' | 'efficiency'

export type MarkPreview = {
  title: string
  hint?: string
}

export type MarkPreviews = Partial<Record<MarkTone, MarkPreview>>

export type MarkGateItem = {
  id: string
  title: string
  hint?: string
}

export type MarkGate = {
  items: MarkGateItem[]
  empty?: string
}

export type MarkGates = Partial<Record<MarkTone, MarkGate>>

type ReadSentence = {
  text: string
  topic: ReadBeat['topic']
}

type Props = {
  greeting: string
  firstName: string
  beats: ReadBeat[]
  filter: ReportFilter
  opening: { lead: string; rest: string }
  ctx: ReadStackContext
  onCreateProject?: () => void
  showCreateProject?: boolean
  onOpenMark?: (tone: MarkTone, itemId?: string) => void
  markPreviews?: MarkPreviews
  markGates?: MarkGates
  reportActive?: boolean
  onToggleReport?: () => void
}

function splitSentences(text: string): string[] {
  const parts = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…])\s+(?=[A-ZÄÖÜ0-9„"»])/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length ? parts : [text.trim()].filter(Boolean)
}

const MARK_RULES: Array<{ tone: MarkTone; re: RegExp }> = [
  {
    tone: 'risk',
    re: /\b(?:Risiko|Risiken|Blocker|Eskalation|Vorkommnisse|Verzögerungen)\b/gi,
  },
  {
    tone: 'decision',
    re: /\b(?:Entscheidung|Entscheidungen|Freigabe|Freigaben|Empfehlung|Empfehlungen)\b/gi,
  },
  {
    tone: 'efficiency',
    re: /\b(?:Projektstatus|Aufgaben|Fortschritt|Rhythmus)\b/gi,
  },
]

const MARK_ARIA: Record<MarkTone, string> = {
  risk: 'Risiken öffnen',
  decision: 'Entscheidungen öffnen',
  efficiency: 'Status öffnen',
}

function MarkChip({
  tone,
  children,
  preview,
  gate,
  onOpen,
}: {
  tone: MarkTone
  children: ReactNode
  preview?: MarkPreview
  gate?: MarkGate
  onOpen?: (tone: MarkTone, itemId?: string) => void
}) {
  const [tip, setTip] = useState(false)
  const closeTimer = useRef<number | null>(null)
  const items = gate?.items || []
  const empty = gate?.empty || preview?.hint || 'Nichts offen'

  function openTip() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setTip(true)
  }

  function scheduleClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setTip(false), 120)
  }

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
  }, [])

  return (
    <span
      className={`ffl-mark-wrap is-${tone}${tip ? ' is-open' : ''}`}
      onMouseEnter={openTip}
      onMouseLeave={scheduleClose}
    >
      <span className="ffl-mark-word">{children}</span>
      <button
        type="button"
        className={`ffl-mark-edit is-${tone}`}
        onClick={() => onOpen?.(tone)}
        onFocus={openTip}
        onBlur={scheduleClose}
        aria-label={MARK_ARIA[tone]}
        aria-expanded={tip}
      >
        <PencilSimple size={11} weight="bold" />
      </button>
      {tip ? (
        <span
          className="ffl-mark-tip"
          role="dialog"
          aria-label={MARK_ARIA[tone]}
          onMouseEnter={openTip}
          onMouseLeave={scheduleClose}
        >
          {items.length > 0 ? (
            <span className="ffl-mark-tip-list">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ffl-mark-tip-item"
                  onClick={() => {
                    setTip(false)
                    onOpen?.(tone, item.id)
                  }}
                >
                  <span className="ffl-mark-tip-title">{item.title}</span>
                  {item.hint ? <span className="ffl-mark-tip-hint">{item.hint}</span> : null}
                </button>
              ))}
            </span>
          ) : (
            <button
              type="button"
              className="ffl-mark-tip-item is-empty"
              onClick={() => {
                setTip(false)
                onOpen?.(tone)
              }}
            >
              <span className="ffl-mark-tip-title">{preview?.title || empty}</span>
              {preview?.hint || empty ? (
                <span className="ffl-mark-tip-hint">{preview?.hint || empty}</span>
              ) : null}
            </button>
          )}
        </span>
      ) : null}
    </span>
  )
}

function renderMarkedText(
  text: string,
  opts?: {
    onOpenMark?: (tone: MarkTone, itemId?: string) => void
    markPreviews?: MarkPreviews
    markGates?: MarkGates
  },
): ReactNode {
  type Hit = { start: number; end: number; tone: MarkTone }
  const hits: Hit[] = []
  for (const rule of MARK_RULES) {
    rule.re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = rule.re.exec(text)) !== null) {
      const start = m.index
      const end = start + m[0].length
      if (hits.some((h) => start < h.end && end > h.start)) continue
      hits.push({ start, end, tone: rule.tone })
    }
  }
  if (!hits.length) return text
  hits.sort((a, b) => a.start - b.start)
  const nodes: ReactNode[] = []
  let cursor = 0
  hits.forEach((h, i) => {
    if (h.start > cursor) nodes.push(text.slice(cursor, h.start))
    const chunk = text.slice(h.start, h.end)
    nodes.push(
      <MarkChip
        key={`${h.start}-${i}`}
        tone={h.tone}
        preview={opts?.markPreviews?.[h.tone]}
        gate={opts?.markGates?.[h.tone]}
        onOpen={opts?.onOpenMark}
      >
        {chunk}
      </MarkChip>,
    )
    cursor = h.end
  })
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

export default function OverviewReadStack({
  greeting,
  firstName,
  beats,
  filter,
  opening,
  ctx,
  onCreateProject,
  showCreateProject = false,
  onOpenMark,
  markPreviews,
  markGates,
  reportActive = false,
  onToggleReport,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sentRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [canScroll, setCanScroll] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [atEnd, setAtEnd] = useState(false)
  const [audioOpen, setAudioOpen] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [speakIndex, setSpeakIndex] = useState(-1)
  const [readAt, setReadAt] = useState<string | null>(null)
  const [plain, setPlain] = useState(false)
  const [shownHeadline, setShownHeadline] = useState(opening)
  const [shownFromScroll, setShownFromScroll] = useState(false)
  const ackSentRef = useRef(false)
  const speakQueueRef = useRef(0)
  const briefingKey = todayBriefingKey()

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

  const sentences = useMemo<ReadSentence[]>(
    () => visibleBeats.flatMap((b) => splitSentences(b.text).map((text) => ({ text, topic: b.topic }))),
    [visibleBeats],
  )

  const paragraphs = useMemo(() => {
    let offset = 0
    return visibleBeats.map((b) => {
      const parts = splitSentences(b.text)
      const start = offset
      offset += parts.length
      return { topic: b.topic, parts, start }
    })
  }, [visibleBeats])

  /* H1 stays on the opening — no scroll promotion, no mark colors */
  const headline = useMemo(
    () => ({ lead: opening.lead, rest: opening.rest, fromScroll: false }),
    [opening.lead, opening.rest],
  )

  const exportBody = useMemo(() => {
    const head = `${opening.lead}${opening.rest}`.trim()
    const body = visibleBeats.map((b) => b.text.trim()).filter(Boolean).join('\n\n')
    return [head, body].filter(Boolean).join('\n\n')
  }, [opening, visibleBeats])

  const publishProgress = useCallback((reading: boolean) => {
    const ffl = rootRef.current?.closest('.ffl') as HTMLElement | null
    if (ffl) {
      ffl.style.setProperty('--ffl-read', reading ? '1' : '0')
      ffl.classList.toggle('is-reading', reading)
    }
    window.dispatchEvent(new CustomEvent('festag-overview-read-progress'))
  }, [])

  /* Fluss stays compact — expanded reading only via Bericht icon */
  useEffect(() => {
    setPlain(reportActive)
    setActiveIndex(0)
    setShownHeadline(opening)
    setShownFromScroll(false)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    publishProgress(false)
  }, [reportActive, opening.lead, opening.rest, publishProgress])

  const syncScroll = useCallback(() => {
    const root = scrollRef.current
    if (!root) return

    const scrollTop = root.scrollTop
    const reading = !plain && scrollTop > 12
    publishProgress(reading)

    if (plain) {
      setActiveIndex(0)
      setCanScroll(root.scrollHeight > root.clientHeight + 8)
      setScrolled(scrollTop > 8)
      setAtEnd(scrollTop + root.clientHeight >= root.scrollHeight - 14)
      return
    }

    let past = 0
    const threshold = scrollTop + 12
    for (let i = 0; i < sentRefs.current.length; i++) {
      const el = sentRefs.current[i]
      if (!el) continue
      if (el.offsetTop + el.offsetHeight * 0.35 <= threshold) past += 1
      else break
    }
    setActiveIndex(Math.min(past, sentences.length))

    const can = root.scrollHeight > root.clientHeight + 8
    const ended = can && scrollTop + root.clientHeight >= root.scrollHeight - 14
    setCanScroll(can)
    setScrolled(scrollTop > 8)
    setAtEnd(ended)
  }, [publishProgress, plain, sentences.length])

  /* Instant H1 swap — no fade/layout thrash that stalls the wheel */
  useEffect(() => {
    setShownHeadline({ lead: headline.lead, rest: headline.rest })
    setShownFromScroll(headline.fromScroll)
  }, [headline.lead, headline.rest, headline.fromScroll])

  useEffect(() => {
    setShownHeadline(opening)
    setShownFromScroll(false)
    setActiveIndex(0)
  }, [filter, opening.lead, opening.rest])

  useEffect(() => {
    const existing = loadBriefingReadAt(briefingKey)
    setReadAt(existing)
    ackSentRef.current = Boolean(existing)
  }, [briefingKey])

  useEffect(() => {
    if (!atEnd || ackSentRef.current || filter !== 'all') return
    ackSentRef.current = true
    void markBriefingRead(briefingKey).then((iso) => setReadAt(iso))
  }, [atEnd, briefingKey, filter])

  useEffect(() => {
    publishProgress(false)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setActiveIndex(0)
    const id = window.requestAnimationFrame(() => syncScroll())
    return () => window.cancelAnimationFrame(id)
  }, [filter, sentences, opening.lead, syncScroll, publishProgress, plain])

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

  useEffect(() => {
    if (speakIndex < 1) return
    const root = scrollRef.current
    if (!root) return
    const el = root.querySelector(`.ffl-read-sent.is-live`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [speakIndex])

  const stopSpeak = useCallback(() => {
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    speakQueueRef.current += 1
    setSpeaking(false)
    setPaused(false)
    setSpeakIndex(-1)
  }, [])

  function speakFrom(startAt: number) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const queue = ++speakQueueRef.current
    window.speechSynthesis.cancel()

    const lines = [
      `${opening.lead}${opening.rest}`.trim(),
      ...sentences.map((s) => s.text),
    ].filter(Boolean)

    if (!lines.length) return

    let i = Math.max(0, Math.min(startAt, lines.length - 1))
    setSpeaking(true)
    setPaused(false)

    const next = () => {
      if (queue !== speakQueueRef.current) return
      if (i >= lines.length) {
        setSpeaking(false)
        setPaused(false)
        setSpeakIndex(-1)
        return
      }
      setSpeakIndex(i)
      const u = new SpeechSynthesisUtterance(lines[i])
      u.lang = 'de-DE'
      u.rate = 1.05
      u.onend = () => {
        i += 1
        next()
      }
      u.onerror = () => {
        if (queue !== speakQueueRef.current) return
        setSpeaking(false)
        setPaused(false)
        setSpeakIndex(-1)
      }
      window.speechSynthesis.speak(u)
    }
    next()
  }

  function toggleAudioDock() {
    if (audioOpen) {
      stopSpeak()
      setAudioOpen(false)
      return
    }
    setAudioOpen(true)
  }

  function togglePlayPause() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (!speaking) {
      speakFrom(speakIndex > 0 ? speakIndex : 0)
      return
    }
    if (paused) {
      window.speechSynthesis.resume()
      setPaused(false)
      return
    }
    window.speechSynthesis.pause()
    setPaused(true)
  }

  async function shareReport() {
    const payload = { title: 'Festag Bericht', text: exportBody }
    try {
      if (navigator.share) {
        await navigator.share(payload)
        return
      }
    } catch { /* cancelled */ }
    const wa = `https://wa.me/?text=${encodeURIComponent(exportBody)}`
    window.open(wa, '_blank', 'noopener,noreferrer')
  }

  function downloadPdf() {
    downloadBriefingPdf({
      title: 'Festag Bericht',
      body: exportBody,
      filename: `festag-bericht-${todayBriefingKey()}.pdf`,
    })
  }

  function downloadNote() {
    downloadBriefingNote({
      title: 'Festag Notiz',
      body: exportBody,
      filename: `festag-notiz-${todayBriefingKey()}.txt`,
    })
  }

  const playLabel = !speaking
    ? 'Vorlesen'
    : paused
      ? 'Weiter'
      : 'Pause'

  return (
    <div
      ref={rootRef}
      className={`ffl-read${shownFromScroll ? ' is-promoted-read' : ''}${plain ? ' is-plain' : ''}${audioOpen ? ' is-audio' : ''}`}
    >
      <h1 className="ffl-greet">
        <span className="ffl-greet-lead">{shownHeadline.lead}</span>
        {shownHeadline.rest ? (
          <span className="ffl-greet-rest"> {shownHeadline.rest}</span>
        ) : null}
      </h1>

      <div
        ref={scrollRef}
        className={[
          'ffl-read-scroll',
          scrolled ? 'is-scrolled' : '',
          atEnd || readAt ? 'is-end' : '',
        ].filter(Boolean).join(' ')}
        onScroll={syncScroll}
      >
        {paragraphs.map((p) => (
          <p key={`${p.topic}-${p.start}`} className={`ffl-read-line is-flow is-${p.topic}`}>
            {p.parts.map((text, i) => {
              const globalIndex = p.start + i
              const live = speaking && speakIndex === globalIndex + 1
              return (
                <span
                  key={`${p.topic}-${globalIndex}`}
                  ref={(node) => { sentRefs.current[globalIndex] = node }}
                  className={`ffl-read-sent${live ? ' is-live' : ''}`}
                >
                  {renderMarkedText(text, { onOpenMark, markPreviews, markGates })}
                  {i < p.parts.length - 1 ? ' ' : ''}
                </span>
              )
            })}
          </p>
        ))}
        {readAt || atEnd ? (
          <div className="ffl-read-ack" role="status" aria-live="polite">
            <span className="ffl-read-ack-mark" aria-hidden>
              <Check size={14} weight="bold" />
            </span>
            <span className="ffl-read-ack-label">Gelesen</span>
            <span className="ffl-read-ack-date">
              {formatBriefingReadDate(readAt || new Date().toISOString())}
            </span>
          </div>
        ) : null}
        <div className="ffl-read-scroll-pad" aria-hidden />
      </div>

      <div className="ffl-read-foot">
        <p className={`ffl-read-hint${canScroll && !atEnd && !readAt && !plain ? '' : ' is-hidden'}`}>
          Scrollen zum Weiterlesen
        </p>
        <div className={`ffl-read-actions${audioOpen ? ' is-audio-open' : ''}`} role="toolbar" aria-label="Bericht">
          {onToggleReport ? (
            <button
              type="button"
              className={`ffl-icon-btn${reportActive ? ' is-on' : ''}`}
              onClick={() => {
                stopSpeak()
                setAudioOpen(false)
                onToggleReport()
              }}
              aria-label={reportActive ? 'Zurück zum Fluss' : 'Bericht-Ansicht'}
              title={reportActive ? 'Fluss' : 'Bericht'}
              aria-pressed={reportActive}
            >
              <Article size={16} weight="regular" />
            </button>
          ) : null}
          <div className="ffl-audio-dock">
            <button
              type="button"
              className={`ffl-icon-btn ffl-audio-play${audioOpen ? ' is-shown' : ''}${speaking && !paused ? ' is-on' : ''}`}
              onClick={togglePlayPause}
              tabIndex={audioOpen ? 0 : -1}
              aria-hidden={!audioOpen}
              aria-label={playLabel}
              title={playLabel}
            >
              {speaking && !paused
                ? <Pause size={15} weight="fill" />
                : <Play size={15} weight="fill" />}
            </button>
            <button
              type="button"
              className={`ffl-icon-btn${audioOpen ? ' is-on' : ''}`}
              onClick={toggleAudioDock}
              aria-label={audioOpen ? 'Audio schließen' : 'Audio öffnen'}
              title={audioOpen ? 'Schließen' : 'Audio'}
              aria-expanded={audioOpen}
            >
              <SpeakerHigh size={16} weight="regular" />
            </button>
          </div>
          <button
            type="button"
            className="ffl-icon-btn"
            onClick={downloadNote}
            aria-label="Notizdatei herunterladen"
            title="Notiz"
          >
            <NoteBlank size={16} weight="regular" />
          </button>
          <button
            type="button"
            className="ffl-icon-btn"
            onClick={downloadPdf}
            aria-label="Als PDF herunterladen"
            title="PDF"
          >
            <FilePdf size={16} weight="regular" />
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

/** Continuous editorial paragraphs for the Overview body (second text). */
export function buildOverviewReadBeats(input: ReadStackContext): ReadBeat[] {
  const beats: ReadBeat[] = []
  const push = (topic: ReadBeat['topic'], text: string) => {
    const t = text.trim()
    if (t) beats.push({ topic, text: t })
  }

  const calm = endDot(input.calmLine)
  const acts = (input.activityTitles || []).filter(Boolean)
  const names = (input.teamNames || []).filter(Boolean)
  const projects = (input.projectTitles || []).filter(Boolean)
  const decision = input.decisionTitles?.[0]
  const health = input.healthLabel.toLowerCase()

  push(
    'all',
    [
      calm || 'Heute stehen vorerst keine weiteren Termine oder Aufgaben an.',
      'Tagro hat den Tag als ruhigen Betriebsbericht zusammengefasst — ohne Dashboard-Lärm, ohne technische Details, die dich nicht weiterbringen.',
      'Was zählt, liegt hier im Fließtext: Stand, Risiken, offene Freigaben und der nächste sinnvolle Schritt.',
    ].join(' '),
  )

  push(
    'communication',
    acts.length
      ? [
          `In der Kommunikation war zuletzt Bewegung zu ${acts[0].replace(/\.$/, '')}.`,
          acts[1] ? `Kurz davor: ${acts[1].replace(/\.$/, '')}.` : '',
          'Tagro fasst diese Signale ruhig zusammen und hält den Faden, ohne dass du in Chats oder Threads nachschlagen musst.',
          'Wenn etwas wirklich deine Aufmerksamkeit braucht, erscheint es hier — nicht als Alarm, sondern als klarer Satz.',
        ].filter(Boolean).join(' ')
      : [
          'Heute war die Kommunikation ruhig.',
          'Es gab keine dringenden Rückfragen, keine offenen Klärungen und keinen ungeklärten Feedback-Loop.',
          'Tagro hört weiter mit und meldet sich nur, wenn ein Signal den Projektverlauf wirklich verändert.',
        ].join(' '),
  )

  push(
    'risks',
    input.atRisk > 0
      ? [
          input.atRisk === 1
            ? 'Ein Risiko bleibt im Blick und sollte geklärt werden, bevor der Fortschritt stockt.'
            : `${input.atRisk} Risiken bleiben im Blick und sollten geklärt werden, bevor der Fortschritt stockt.`,
          'Tagro empfiehlt eine kurze, gezielte Klärung — nicht eine große Eskalation.',
          'Solange das offen ist, bleibt dieser Punkt im Bericht sichtbar, damit nichts zwischen den Stühlen verschwindet.',
        ].join(' ')
      : [
          'Abgesehen davon gibt es keine auffälligen Vorkommnisse.',
          'Keine Blocker, keine Eskalation, keine stillen Verzögerungen, die sich unbemerkt aufbauen würden.',
          'Der Blick bleibt ruhig — und genau deshalb kann der Bericht heute eher Orientierung als Alarm sein.',
        ].join(' '),
  )

  push(
    'decisions',
    input.pendingDecisions > 0
      ? [
          input.pendingDecisions === 1
            ? 'Eine Entscheidung wartet noch auf deine Freigabe.'
            : `${input.pendingDecisions} offene Entscheidungen warten noch auf deine Freigabe.`,
          decision ? `Aktuell im Vordergrund: ${decision.replace(/\.$/, '')}.` : '',
          'Tagro hat Empfehlungen vorbereitet — mit Begründung und Auswirkung.',
          'Du entscheidest; Festag trägt die Entscheidung danach in Plan, Status und Team weiter.',
        ].filter(Boolean).join(' ')
      : [
          'Aktuell wartet nichts auf deine Freigabe.',
          'Optional können wir später prüfen, wie die bisherigen Entscheidungen umgesetzt wurden und ob sich daraus ein klarerer Standard für ähnliche Fälle ergibt.',
          'Solange nichts Offen ist, bleibt dieser Abschnitt bewusst kurz und ruhig.',
        ].join(' '),
  )

  push(
    'status',
    [
      `Der Projektstatus steht auf ${health}.`,
      input.openTasks > 0
        ? `Tagro überwacht ${input.openTasks === 1 ? 'eine offene Aufgabe' : `${input.openTasks} Aufgaben`}, Entscheidungen und mögliche Blocker weiter.`
        : 'Tagro überwacht Tasks, Entscheidungen und mögliche Blocker weiter.',
      'Der Rhythmus bleibt erkennbar: was erledigt ist, was läuft, und was als Nächstes sinnvoll wäre — ohne dass du dafür ein zweites Tool öffnen musst.',
    ].join(' '),
  )

  push(
    'team',
    [
      names.length
        ? `Aktiv im Blick: ${names.slice(0, 3).join(', ')}.`
        : `Im Team sind ${Math.max(1, input.teamMembers)} Personen aktiv.`,
      'Rollen und Fortschritt bleiben für dich sichtbar, ohne dass daraus ein Überwachungsgefühl entsteht.',
      'Tagro hält den Überblick über Kapazität und Übergaben — du behältst die menschliche Entscheidung.',
    ].join(' '),
  )

  push(
    'project',
    [
      projects.length === 1
        ? `${projects[0]} ist dein aktueller Fokus.`
        : projects.length > 1
          ? `${projects.slice(0, 2).join(' und ')} sind im Blick.`
          : 'Dein Workspace fasst den Stand über die aktiven Projekte zusammen.',
      'Bei Bedarf können wir den bisherigen Fortschritt noch einmal ruhig durchgehen — Deliverables, offene Punkte und das, was als Nächstes Freigabe oder Fokus verdient.',
      'Dieser Gesamtbericht bleibt die Lesefläche für den Tag: einmal durchlesen, bestätigen, dann weiterarbeiten.',
      'Wenn du bis hierher gescrollt hast, ist der Bericht vollständig gelesen — unten erscheint die Bestätigung mit Datum, und Festag legt ihn als gelesen ab.',
    ].join(' '),
  )

  return beats
}
