'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CaretLeft,
  CaretRight,
  DotsThree,
  FunnelSimple,
  Lightning,
  Pause,
  PencilSimple,
  Play,
} from '@phosphor-icons/react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import StatusExecutiveCardArt, {
  type StatusExecutiveCardGraphic,
} from '@/components/status/StatusExecutiveCardArt'
import { STATUS_EXECUTIVE_CSS } from '@/components/status/status-executive-styles'
import type { StatusCardHighlight, StatusCardHighlightsMap } from '@/lib/client/status-card-highlights'

const CARD_SUB = 'Ein Bericht deiner Gesamten Projekte'

type CardDef = {
  id: string
  title: string
  subtitle?: string
  href?: string
  onClick?: () => void
  graphic: StatusExecutiveCardGraphic
  badge?: string
  highlight?: StatusCardHighlight
}

type Props = {
  onBriefing?: () => void
  onFilter?: () => void
  onScopeFilter?: () => void
  onPeriod24h?: () => void
  onIntelligenceRules?: () => void
  onCreateReport?: () => void
  showReportBadge?: boolean
}

function cardBadge(
  highlights: StatusCardHighlightsMap,
  graphic: StatusExecutiveCardGraphic,
  showFallback?: boolean,
): string | undefined {
  const badge = highlights[graphic]?.badge
  if (badge) return badge
  if (showFallback && !highlights[graphic]) return 'offen'
  return undefined
}

function StatusCard({ card, enterDelay = 0 }: { card: CardDef; enterDelay?: number }) {
  const enterStyle = enterDelay > 0 ? { animationDelay: `${enterDelay}ms` } : undefined
  const body = (
    <>
      {card.badge ? <span className="st-ex-card-badge">{card.badge}</span> : null}
      <StatusExecutiveCardArt graphic={card.graphic} highlight={card.highlight} />
      <div className="st-ex-card-copy">
        <p className="st-ex-card-title">{card.title}</p>
        <p className="st-ex-card-sub">{card.subtitle ?? CARD_SUB}</p>
      </div>
    </>
  )

  if (card.href) {
    return (
      <Link
        href={card.href}
        className="st-ex-card st-ex-card--enter"
        style={enterStyle}
        role="listitem"
      >
        {body}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className="st-ex-card st-ex-card--enter"
      style={enterStyle}
      role="listitem"
      onClick={card.onClick}
    >
      {body}
    </button>
  )
}

const CARD_GAP = 16
const AUTO_PLAY_MS = 5200

function cardStep(el: HTMLDivElement) {
  const first = el.querySelector<HTMLElement>('.st-ex-card')
  return first ? first.offsetWidth + CARD_GAP : 308
}

function CardRow({ cards }: { cards: CardDef[] }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [showFade, setShowFade] = useState(true)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [canScroll, setCanScroll] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const playStartRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  const syncFromScroll = useCallback(() => {
    const el = rowRef.current
    if (!el) return
    const overflow = el.scrollWidth > el.clientWidth + 4
    setCanScroll(overflow)
    if (!overflow) {
      setPageCount(1)
      setPageIndex(0)
      setShowFade(false)
      return
    }
    const step = cardStep(el)
    const maxScroll = el.scrollWidth - el.clientWidth
    const pages = Math.max(1, Math.round(maxScroll / step) + 1)
    const idx = Math.min(Math.round(el.scrollLeft / step), pages - 1)
    setPageCount(pages)
    setPageIndex(idx)
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
    setShowFade(overflow && !atEnd)
  }, [])

  const scrollToPage = useCallback((idx: number) => {
    const el = rowRef.current
    if (!el) return
    const step = cardStep(el)
    const maxScroll = el.scrollWidth - el.clientWidth
    const pages = Math.max(1, Math.round(maxScroll / step) + 1)
    const clamped = Math.max(0, Math.min(idx, pages - 1))
    const target = clamped >= pages - 1 ? maxScroll : clamped * step
    el.scrollTo({ left: target, behavior: 'smooth' })
    playStartRef.current = performance.now()
    setProgress(0)
  }, [])

  useEffect(() => {
    syncFromScroll()
    const el = rowRef.current
    if (!el) return
    el.addEventListener('scroll', syncFromScroll, { passive: true })
    const ro = new ResizeObserver(syncFromScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', syncFromScroll)
      ro.disconnect()
    }
  }, [cards, syncFromScroll])

  useEffect(() => {
    if (!playing || pageCount <= 1) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      setProgress(0)
      return
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPlaying(false)
      return
    }

    playStartRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = now - playStartRef.current
      const pct = Math.min(1, elapsed / AUTO_PLAY_MS)
      setProgress(pct)
      if (pct >= 1) {
        const next = pageIndex >= pageCount - 1 ? 0 : pageIndex + 1
        scrollToPage(next)
        playStartRef.current = now
        setProgress(0)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, pageCount, pageIndex, scrollToPage])

  const showNav = canScroll && pageCount > 1

  return (
    <div className="st-ex-row-wrap">
      <div ref={rowRef} className="st-ex-row" role="list">
        {cards.map((card, i) => (
          <StatusCard key={card.id} card={card} enterDelay={i * 200} />
        ))}
      </div>
      <div className={`st-ex-row-fade${showFade ? ' on' : ''}`} aria-hidden />
      {showNav ? (
        <div className="st-ex-row-controls">
          <div className="st-ex-row-controls-start">
            <div className="st-ex-dotnav" role="tablist" aria-label="Karten-Navigation">
              <span className="st-ex-dotnav-bg" aria-hidden />
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === pageIndex}
                  aria-label={`Seite ${i + 1} von ${pageCount}`}
                  className={`st-ex-dotnav-item${i === pageIndex ? ' on' : ''}`}
                  onClick={() => scrollToPage(i)}
                >
                  {i === pageIndex ? (
                    <span
                      className="st-ex-dotnav-progress"
                      style={{ transform: `scaleX(${playing ? progress : 1})` }}
                      aria-hidden
                    />
                  ) : null}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="st-ex-play"
              aria-label={playing ? 'Automatisches Blättern pausieren' : 'Automatisches Blättern starten'}
              onClick={() => setPlaying(p => !p)}
            >
              {playing ? (
                <Pause size={18} weight="fill" />
              ) : (
                <Play size={18} weight="fill" />
              )}
            </button>
          </div>
          <ul className="st-ex-paddlenav" aria-label="Manuell blättern">
            <li>
              <button
                type="button"
                className="st-ex-paddle"
                aria-label="Zurück"
                disabled={pageIndex <= 0}
                onClick={() => scrollToPage(pageIndex - 1)}
              >
                <CaretLeft size={16} weight="bold" />
              </button>
            </li>
            <li>
              <button
                type="button"
                className="st-ex-paddle"
                aria-label="Weiter"
                disabled={pageIndex >= pageCount - 1}
                onClick={() => scrollToPage(pageIndex + 1)}
              >
                <CaretRight size={16} weight="bold" />
              </button>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default function StatusExecutiveOverview({
  onBriefing,
  onFilter,
  onScopeFilter,
  onPeriod24h,
  onIntelligenceRules,
  onCreateReport,
  showReportBadge = true,
}: Props) {
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(false)
  const [highlights, setHighlights] = useState<StatusCardHighlightsMap>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/client/status-highlights', { credentials: 'include' })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled && data?.cards) setHighlights(data.cards)
      } catch {
        /* cards keep fallback art */
      }
    })()
    return () => { cancelled = true }
  }, [])

  const reportCards: CardDef[] = [
    {
      id: 'overall',
      title: 'Mein Gesamtbericht',
      graphic: 'overall',
      highlight: highlights.overall,
      badge: cardBadge(highlights, 'overall', showReportBadge),
      subtitle: highlights.overall?.subtitle ?? CARD_SUB,
      onClick: onBriefing,
    },
    {
      id: '24h',
      title: 'Letzte 24h',
      graphic: '24h',
      highlight: highlights['24h'],
      subtitle: highlights['24h']?.subtitle ?? 'Was sich in den letzten 24 Stunden verändert hat',
      onClick: onPeriod24h ?? onBriefing,
    },
    {
      id: 'filter',
      title: 'Projektbericht filtern',
      graphic: 'filter',
      highlight: highlights.filter,
      subtitle: highlights.filter?.subtitle ?? 'Bericht auf einzelne Projekte eingrenzen',
      onClick: onScopeFilter ?? onFilter,
    },
    {
      id: 'goals-report',
      title: 'Zieleindrücke',
      graphic: 'goals',
      highlight: highlights.goals,
      subtitle: highlights.goals?.subtitle ?? 'Fortschritt gegenüber deinen Zielen',
      href: '/workspace',
    },
  ]

  const forecastCards: CardDef[] = [
    {
      id: 'decisions',
      title: 'Entscheidungen',
      graphic: 'decisions',
      highlight: highlights.decisions,
      subtitle: highlights.decisions?.subtitle ?? 'Offene und kürzlich getroffene Entscheidungen',
      badge: highlights.decisions?.badge ?? undefined,
      href: '/decisions',
    },
    {
      id: 'tasks',
      title: 'Tasks',
      graphic: 'tasks',
      highlight: highlights.tasks,
      subtitle: highlights.tasks?.subtitle ?? 'Aktuelle Aufgaben und Blocker im Blick',
      badge: highlights.tasks?.badge ?? undefined,
      href: '/tasks',
    },
    {
      id: 'deliveries',
      title: 'Lieferungen',
      graphic: 'deliveries',
      highlight: highlights.deliveries,
      subtitle: highlights.deliveries?.subtitle ?? 'Anstehende und abgeschlossene Lieferungen',
      badge: highlights.deliveries?.badge ?? undefined,
      href: '/deliverables',
    },
    {
      id: 'goals-forecast',
      title: 'Zieleindrücke',
      graphic: 'goals',
      highlight: highlights.goals,
      subtitle: highlights.goals?.subtitle ?? 'Prognose für deine Projektziele',
      href: '/workspace',
    },
  ]

  function openIntelligence() {
    if (onIntelligenceRules) onIntelligenceRules()
    else router.push('/settings/intelligence')
  }

  return (
    <div className="st-ex">
      <style>{STATUS_EXECUTIVE_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="st-ex-mobile-head">
        <div>
          <h1 className="st-ex-title" style={{ fontSize: 29, margin: 0 }}>
            Wir starten hier.
          </h1>
          <span className="st-ex-title-muted" style={{ fontSize: 29 }}>Projektanalyse.</span>
        </div>
        <CodexMobileActionPill
          onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          onMenu={() => setNavOpen(true)}
        />
      </div>

      <header className="st-ex-hero">
        <div className="st-ex-hero-copy">
          <h1 className="st-ex-title">
            Wir starten hier.
            <span className="st-ex-title-muted">Projektanalyse.</span>
          </h1>
          <div className="st-ex-toolbar">
            <button
              type="button"
              className="st-ex-tool"
              aria-label="Bericht filtern"
              onClick={onFilter}
            >
              <FunnelSimple size={20} weight="regular" />
            </button>
            <button
              type="button"
              className="st-ex-tool"
              aria-label="Tagro Aktualisierung"
              onClick={onBriefing}
            >
              <Lightning size={15} weight="regular" className="st-ex-tool-icon--lightning" />
            </button>
            <button
              type="button"
              className="st-ex-tool"
              aria-label="Weitere Aktionen"
              onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            >
              <DotsThree size={22} weight="bold" />
            </button>
          </div>
        </div>
        <button type="button" className="st-ex-cta" onClick={openIntelligence}>
          Intelligenz regeln
        </button>
      </header>

      <section className="st-ex-block" aria-labelledby="st-ex-report">
        <h2 id="st-ex-report" className="st-ex-block-title">Projektbericht</h2>
        <CardRow cards={reportCards} />
      </section>

      <section className="st-ex-block" aria-labelledby="st-ex-forecast">
        <h2 id="st-ex-forecast" className="st-ex-block-title">Projektprognose</h2>
        <CardRow cards={forecastCards} />
      </section>

      <button
        type="button"
        className="st-ex-fab"
        aria-label="Bericht erstellen"
        onClick={onCreateReport ?? onBriefing}
      >
        <PencilSimple size={26} weight="regular" />
      </button>
    </div>
  )
}
