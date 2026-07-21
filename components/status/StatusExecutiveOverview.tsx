'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CaretLeft,
  CaretRight,
  Check,
  DotsThree,
  FunnelSimple,
  Lightning,
  Pause,
  Play,
} from '@phosphor-icons/react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import { openTagro } from '@/components/TagroOverlay'
import { STATUSABFRAGE_CSS } from '@/components/dashboard/statusabfrage-styles'
import StatusExecutiveCardArt, {
  type StatusExecutiveCardGraphic,
} from '@/components/status/StatusExecutiveCardArt'
import { STATUS_EXECUTIVE_CSS } from '@/components/status/status-executive-styles'
import { FESTAG_SCROLL_FADE_CSS } from '@/components/mobile/mobile-codex-list-styles'
import DeliveryPulseCard from '@/components/pulse/DeliveryPulseCard'
import type { StatusCardHighlight, StatusCardHighlightsMap } from '@/lib/client/status-card-highlights'
import { openWeeklyBriefing } from '@/lib/weekly-briefing'

const CARD_SUB = 'Ein Bericht deiner Gesamten Projekte'

const STATUS_TAGRO_CONTEXT = {
  contextType: 'status_report' as const,
  id: 'dashboard',
  title: 'Statusabfrage, Heute',
}

type ScopeOption = {
  id: string
  label: string
  color?: string | null
}

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
  scopeOptions: ScopeOption[]
  activeScopeId: string
  onScopeChange: (id: string) => void
  period: string
  periodOptions: readonly string[]
  onPeriodChange: (period: string) => void
  onRefresh?: () => void
  onReadReport?: () => void
  onPeriod24h?: () => void
  onIntelligenceRules?: () => void
  showReportBadge?: boolean
  busy?: boolean
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

function StatusCard({
  card,
  enterDelay = 0,
  tagroContext,
}: {
  card: CardDef
  enterDelay?: number
  tagroContext?: typeof STATUS_TAGRO_CONTEXT
}) {
  const enterStyle = enterDelay > 0 ? { animationDelay: `${enterDelay}ms` } : undefined
  const body = (
    <>
      {card.badge ? <span className="st-ex-card-badge">{card.badge}</span> : null}
      <StatusExecutiveCardArt
        graphic={card.graphic}
        highlight={card.highlight}
        tagroContext={card.graphic === 'deliveries' ? tagroContext : undefined}
      />
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

const AUTO_PLAY_MS = 5200

function activeCardIndex(el: HTMLDivElement): number {
  const cardEls = Array.from(el.querySelectorAll<HTMLElement>('.st-ex-card'))
  if (!cardEls.length) return 0
  const anchor = el.scrollLeft + 12
  let idx = 0
  for (let i = cardEls.length - 1; i >= 0; i--) {
    if (cardEls[i].offsetLeft <= anchor + 4) {
      idx = i
      break
    }
  }
  return idx
}

function CardRow({
  cards,
  tagroContext,
}: {
  cards: CardDef[]
  tagroContext?: typeof STATUS_TAGRO_CONTEXT
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const pageIndexRef = useRef(0)
  const [showFade, setShowFade] = useState(true)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const playStartRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  const syncFromScroll = useCallback(() => {
    const el = rowRef.current
    if (!el) return
    const count = cards.length
    const overflow = el.scrollWidth > el.clientWidth + 4
    if (count <= 1) {
      setPageCount(1)
      setPageIndex(0)
      setShowFade(false)
      return
    }
    setPageCount(count)
    const idx = activeCardIndex(el)
    setPageIndex(idx)
    pageIndexRef.current = idx
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
    setShowFade(overflow && !atEnd)
  }, [cards.length])

  const scrollToPage = useCallback((idx: number) => {
    const el = rowRef.current
    if (!el) return
    const cardEls = el.querySelectorAll<HTMLElement>('.st-ex-card')
    if (!cardEls.length) return
    const clamped = Math.max(0, Math.min(idx, cardEls.length - 1))
    const target = cardEls[clamped]
    pageIndexRef.current = clamped
    el.scrollTo({ left: target.offsetLeft, behavior: 'smooth' })
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
        const el = rowRef.current
        const current = el ? activeCardIndex(el) : pageIndexRef.current
        const next = current >= pageCount - 1 ? 0 : current + 1
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
  }, [playing, pageCount, scrollToPage])

  const showNav = cards.length > 1

  return (
    <div className="st-ex-row-wrap">
      <div ref={rowRef} className="st-ex-row" role="list">
        {cards.map((card, i) => (
          <StatusCard key={card.id} card={card} enterDelay={i * 200} tagroContext={tagroContext} />
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
  scopeOptions,
  activeScopeId,
  onScopeChange,
  period,
  periodOptions,
  onPeriodChange,
  onRefresh,
  onReadReport,
  onPeriod24h,
  onIntelligenceRules,
  showReportBadge = true,
  busy = false,
}: Props) {
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(false)
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [highlights, setHighlights] = useState<StatusCardHighlightsMap>({})

  const closeToolbarMenus = useCallback(() => {
    setScopeMenuOpen(false)
    setMoreMenuOpen(false)
  }, [])

  const openScopeMenu = useCallback(() => {
    setMoreMenuOpen(false)
    setScopeMenuOpen(true)
  }, [])

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

  function openIntelligence() {
    if (onIntelligenceRules) onIntelligenceRules()
    else router.push('/settings/intelligence')
  }

  const reportCards: CardDef[] = [
    {
      id: 'overall',
      title: 'Mein Gesamtbericht',
      graphic: 'overall',
      highlight: highlights.overall,
      badge: cardBadge(highlights, 'overall', showReportBadge),
      subtitle: highlights.overall?.subtitle ?? CARD_SUB,
      onClick: () => openWeeklyBriefing(),
    },
    {
      id: '24h',
      title: 'Letzte 24h',
      graphic: '24h',
      highlight: highlights['24h'],
      subtitle: highlights['24h']?.subtitle ?? 'Was sich in den letzten 24 Stunden verändert hat',
      onClick: onPeriod24h,
    },
    {
      id: 'filter',
      title: 'Projektbericht filtern',
      graphic: 'filter',
      highlight: highlights.filter,
      subtitle: highlights.filter?.subtitle ?? 'Bericht auf einzelne Projekte eingrenzen',
      onClick: openScopeMenu,
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

  const workflowCards: CardDef[] = [
    {
      id: 'workflow-push',
      title: 'Deploy-Push',
      graphic: 'workflow-push',
      badge: 'Vorlage',
      subtitle: 'Bei jedem Deploy Push eine Nachricht in Festag',
      onClick: openIntelligence,
    },
    {
      id: 'workflow-blocker',
      title: 'Nur Blocker',
      graphic: 'workflow-blocker',
      badge: 'Vorlage',
      subtitle: 'Benachrichtigung nur wenn etwas blockiert',
      onClick: openIntelligence,
    },
    {
      id: 'workflow-whatsapp',
      title: 'WhatsApp Kanal',
      graphic: 'workflow-channel',
      badge: 'Vorlage',
      subtitle: 'Updates vom Festag-Kanal auf dein Handy',
      onClick: openIntelligence,
    },
    {
      id: 'workflow-rules',
      title: 'Eigene Regel',
      graphic: 'workflow-rules',
      subtitle: 'Weitere Workflows in den Intelligenz-Einstellungen',
      onClick: openIntelligence,
    },
  ]

  return (
    <div className="st-ex">
      <style>{STATUS_EXECUTIVE_CSS}{FESTAG_SCROLL_FADE_CSS}{STATUSABFRAGE_CSS}</style>

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
        <div className="st-ex-hero-inner">
          <div className="st-ex-hero-copy">
            <h1 className="st-ex-title">
              Wir starten hier.
              <span className="st-ex-title-muted">Projektanalyse.</span>
            </h1>
            <div className="st-ex-toolbar">
              <div className="st-ex-tool-wrap">
                <button
                  type="button"
                  className={`st-ex-tool${scopeMenuOpen ? ' on' : ''}`}
                  aria-label="Projekt filtern"
                  title="Projekt filtern"
                  aria-expanded={scopeMenuOpen}
                  onClick={() => {
                    setScopeMenuOpen((open) => !open)
                    setMoreMenuOpen(false)
                  }}
                >
                  <FunnelSimple size={20} weight="regular" />
                </button>
                {scopeMenuOpen ? (
                  <>
                    <button
                      type="button"
                      className="st-backdrop"
                      aria-label="Schließen"
                      onClick={closeToolbarMenus}
                    />
                    <div className="st-menu st-menu-left st-ex-tool-menu" role="listbox" aria-label="Projekt filtern">
                      {scopeOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          role="option"
                          aria-selected={option.id === activeScopeId}
                          className={`st-menu-item${option.id === activeScopeId ? ' on' : ''}`}
                          onClick={() => {
                            onScopeChange(option.id)
                            closeToolbarMenus()
                          }}
                        >
                          <span className="st-dot" style={{ background: option.color || '#5B647D' }} />
                          <span className="st-menu-label">{option.label}</span>
                          {option.id === activeScopeId ? <Check size={12} weight="bold" /> : null}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
              <button
                type="button"
                className="st-ex-tool"
                aria-label="Status aktualisieren"
                title="Status aktualisieren"
                disabled={busy}
                onClick={onRefresh}
              >
                <Lightning size={15} weight="regular" className="st-ex-tool-icon--lightning" />
              </button>
              <button
                type="button"
                className="st-ex-tool"
                aria-label="Mit Tagro bearbeiten"
                title="Mit Tagro bearbeiten"
                onClick={() => openTagro(STATUS_TAGRO_CONTEXT)}
              >
                <TagroComposeIcon size={18} />
              </button>
              <div className="st-ex-tool-wrap">
                <button
                  type="button"
                  className={`st-ex-tool${moreMenuOpen ? ' on' : ''}`}
                  aria-label="Weitere Status-Aktionen"
                  title="Weitere Status-Aktionen"
                  aria-expanded={moreMenuOpen}
                  onClick={() => {
                    setMoreMenuOpen((open) => !open)
                    setScopeMenuOpen(false)
                  }}
                >
                  <DotsThree size={22} weight="bold" />
                </button>
                {moreMenuOpen ? (
                  <>
                    <button
                      type="button"
                      className="st-backdrop"
                      aria-label="Schließen"
                      onClick={closeToolbarMenus}
                    />
                    <div className="st-menu st-ex-tool-menu" role="menu" aria-label="Status-Aktionen">
                      <p className="st-ex-tool-menu-label">Zeitraum</p>
                      {periodOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          role="menuitem"
                          className={`st-menu-item${option === period ? ' on' : ''}`}
                          onClick={() => {
                            onPeriodChange(option)
                            closeToolbarMenus()
                          }}
                        >
                          <span className="st-menu-label">{option}</span>
                          {option === period ? <Check size={12} weight="bold" /> : null}
                        </button>
                      ))}
                      <div className="st-ex-tool-menu-divider" role="separator" />
                      <button
                        type="button"
                        role="menuitem"
                        className="st-menu-item"
                        onClick={() => {
                          openWeeklyBriefing()
                          closeToolbarMenus()
                        }}
                      >
                        <span className="st-menu-label">Wöchentliches Briefing</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="st-menu-item"
                        onClick={() => {
                          onReadReport?.()
                          closeToolbarMenus()
                        }}
                      >
                        <span className="st-menu-label">Statusbericht lesen</span>
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <button type="button" className="st-ex-cta" onClick={openIntelligence}>
            Intelligenz regeln
          </button>
        </div>
      </header>

      <div className="st-ex-pulse-wrap">
        <DeliveryPulseCard
          scope={activeScopeId === 'overall' ? 'overall' : 'project'}
          projectId={activeScopeId === 'overall' ? null : activeScopeId}
        />
      </div>

      <section className="st-ex-block" aria-labelledby="st-ex-report">
        <h2 id="st-ex-report" className="st-ex-block-title">Projektbericht</h2>
        <CardRow cards={reportCards} />
      </section>

      <section className="st-ex-block" aria-labelledby="st-ex-forecast">
        <h2 id="st-ex-forecast" className="st-ex-block-title">Projektprognose</h2>
        <CardRow cards={forecastCards} tagroContext={STATUS_TAGRO_CONTEXT} />
      </section>

      <section className="st-ex-block" aria-labelledby="st-ex-workflows">
        <h2 id="st-ex-workflows" className="st-ex-block-title">Intelligenz-Workflows</h2>
        <CardRow cards={workflowCards} />
      </section>
    </div>
  )
}
