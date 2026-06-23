'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DotsThree,
  FunnelSimple,
  Lightning,
  PencilSimple,
} from '@phosphor-icons/react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import StatusExecutiveCardArt, {
  type StatusExecutiveCardGraphic,
} from '@/components/status/StatusExecutiveCardArt'
import { STATUS_EXECUTIVE_CSS } from '@/components/status/status-executive-styles'

const CARD_SUB = 'Ein Bericht deiner Gesamten Projekte'

type CardDef = {
  id: string
  title: string
  subtitle?: string
  href?: string
  onClick?: () => void
  graphic: StatusExecutiveCardGraphic
  badge?: string
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

function StatusCard({ card }: { card: CardDef }) {
  const body = (
    <>
      {card.badge ? <span className="st-ex-card-badge">{card.badge}</span> : null}
      <StatusExecutiveCardArt graphic={card.graphic} />
      <div className="st-ex-card-copy">
        <p className="st-ex-card-title">{card.title}</p>
        <p className="st-ex-card-sub">{card.subtitle ?? CARD_SUB}</p>
      </div>
    </>
  )

  if (card.href) {
    return (
      <Link href={card.href} className="st-ex-card" role="listitem">
        {body}
      </Link>
    )
  }

  return (
    <button type="button" className="st-ex-card" role="listitem" onClick={card.onClick}>
      {body}
    </button>
  )
}

function CardRow({ cards }: { cards: CardDef[] }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [showFade, setShowFade] = useState(true)

  const updateFade = useCallback(() => {
    const el = rowRef.current
    if (!el) return
    const overflow = el.scrollWidth > el.clientWidth + 4
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
    setShowFade(overflow && !atEnd)
  }, [])

  useEffect(() => {
    updateFade()
    const el = rowRef.current
    if (!el) return
    el.addEventListener('scroll', updateFade, { passive: true })
    const ro = new ResizeObserver(updateFade)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateFade)
      ro.disconnect()
    }
  }, [cards, updateFade])

  return (
    <div className="st-ex-row-wrap">
      <div ref={rowRef} className="st-ex-row" role="list">
        {cards.map(card => (
          <StatusCard key={card.id} card={card} />
        ))}
      </div>
      <div className={`st-ex-row-fade${showFade ? ' on' : ''}`} aria-hidden />
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

  const reportCards: CardDef[] = [
    {
      id: 'overall',
      title: 'Mein Gesamtbericht',
      graphic: 'overall',
      badge: showReportBadge ? 'offen' : undefined,
      onClick: onBriefing,
    },
    {
      id: '24h',
      title: 'Letzte 24h',
      graphic: '24h',
      subtitle: 'Was sich in den letzten 24 Stunden verändert hat',
      onClick: onPeriod24h ?? onBriefing,
    },
    {
      id: 'filter',
      title: 'Projektbericht filtern',
      graphic: 'filter',
      subtitle: 'Bericht auf einzelne Projekte eingrenzen',
      onClick: onScopeFilter ?? onFilter,
    },
    {
      id: 'goals-report',
      title: 'Zieleindrücke',
      graphic: 'goals',
      subtitle: 'Fortschritt gegenüber deinen Zielen',
      href: '/workspace',
    },
  ]

  const forecastCards: CardDef[] = [
    {
      id: 'decisions',
      title: 'Entscheidungen',
      graphic: 'decisions',
      subtitle: 'Offene und kürzlich getroffene Entscheidungen',
      href: '/decisions',
    },
    {
      id: 'tasks',
      title: 'Tasks',
      graphic: 'tasks',
      subtitle: 'Aktuelle Aufgaben und Blocker im Blick',
      href: '/tasks',
    },
    {
      id: 'deliveries',
      title: 'Lieferungen',
      graphic: 'deliveries',
      subtitle: 'Anstehende und abgeschlossene Lieferungen',
      href: '/deliverables',
    },
    {
      id: 'goals-forecast',
      title: 'Zieleindrücke',
      graphic: 'goals',
      subtitle: 'Prognose für deine Projektziele',
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
              <Lightning size={20} weight="fill" />
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
