'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  DotsThree,
  FunnelSimple,
  Lightning,
  PencilSimple,
  Play,
} from '@phosphor-icons/react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import { STATUS_EXECUTIVE_CSS } from '@/components/status/status-executive-styles'

const CARD_SUB = 'Ein Bericht deiner Gesamten Projekte'

type CardDef = {
  id: string
  title: string
  subtitle?: string
  href?: string
  onClick?: () => void
  icon?: 'play' | 'chevron'
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
      {card.icon === 'play' ? (
        <span className="st-ex-card-icon" aria-hidden>
          <Play size={28} weight="fill" />
        </span>
      ) : null}
      {card.icon === 'chevron' ? (
        <span className="st-ex-card-icon st-ex-card-icon--chevron" aria-hidden>&lt;</span>
      ) : null}
      <div>
        <p className="st-ex-card-title">{card.title}</p>
        <p className="st-ex-card-sub">{card.subtitle ?? CARD_SUB}</p>
      </div>
    </>
  )

  if (card.href) {
    return (
      <Link href={card.href} className="st-ex-card">
        {body}
      </Link>
    )
  }

  return (
    <button type="button" className="st-ex-card" onClick={card.onClick}>
      {body}
    </button>
  )
}

function CardRow({ cards }: { cards: CardDef[] }) {
  return (
    <div className="st-ex-row-wrap">
      <div className="st-ex-row">
        {cards.map(card => (
          <StatusCard key={card.id} card={card} />
        ))}
      </div>
      <div className="st-ex-row-fade" aria-hidden />
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
      icon: 'play',
      badge: showReportBadge ? 'offen' : undefined,
      onClick: onBriefing,
    },
    {
      id: '24h',
      title: 'Letzte 24h',
      icon: 'chevron',
      onClick: onPeriod24h ?? onBriefing,
    },
    {
      id: 'filter',
      title: 'Projektbericht filtern',
      onClick: onScopeFilter ?? onFilter,
    },
    {
      id: 'goals-report',
      title: 'Zieleindrücke',
      href: '/workspace',
    },
  ]

  const forecastCards: CardDef[] = [
    {
      id: 'decisions',
      title: 'Entscheidungen',
      href: '/decisions',
    },
    {
      id: 'tasks',
      title: 'Tasks',
      href: '/tasks',
    },
    {
      id: 'deliveries',
      title: 'Lieferungen',
      href: '/deliverables',
    },
    {
      id: 'goals-forecast',
      title: 'Zieleindrücke',
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
