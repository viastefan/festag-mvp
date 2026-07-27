'use client'

/**
 * Status day surface — one addictive daily ritual.
 * Hero status report + quiet signals. No carousels, no cinema cards.
 */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ArrowUp,
  Check,
  Play,
  Scales,
  CheckSquare,
  Package,
} from '@phosphor-icons/react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import { openTagro } from '@/components/TagroOverlay'
import { STATUS_DAY_CSS } from '@/components/status/status-day-styles'
import type { StatusCardHighlightsMap } from '@/lib/client/status-card-highlights'
import { openWeeklyBriefing } from '@/lib/weekly-briefing'

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
  title?: string
}

function formatTodayLabel(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d)
  } catch {
    return 'Heute'
  }
}

function capitalize(s: string) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
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
  busy = false,
  title,
}: Props) {
  const [navOpen, setNavOpen] = useState(false)
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false)
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false)
  const [highlights, setHighlights] = useState<StatusCardHighlightsMap>({})

  const activeScope = scopeOptions.find(o => o.id === activeScopeId)
  const mobileTitle = title || activeScope?.label || 'Status'
  const todayLabel = useMemo(() => capitalize(formatTodayLabel()), [])

  const closeMenus = useCallback(() => {
    setScopeMenuOpen(false)
    setPeriodMenuOpen(false)
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
        /* keep empty */
      }
    })()
    return () => { cancelled = true }
  }, [])

  const overall = highlights.overall
  const previewLines = (overall?.lines ?? []).slice(0, 3)
  const metaParts = [
    highlights.decisions?.badge ? `${highlights.decisions.badge} Entscheidungen` : null,
    highlights.tasks?.badge ? `${highlights.tasks.badge} Tasks` : null,
    highlights.deliveries?.badge ? `${highlights.deliveries.badge} Lieferungen` : null,
  ].filter(Boolean) as string[]

  const signals = [
    {
      id: 'decisions',
      label: 'Entscheidungen',
      hint: highlights.decisions?.subtitle || 'Offene und kürzlich getroffene',
      badge: highlights.decisions?.badge,
      href: '/decisions',
      Icon: Scales,
    },
    {
      id: 'tasks',
      label: 'Aufgaben',
      hint: highlights.tasks?.subtitle || 'Aktuelle Tasks und Blocker',
      badge: highlights.tasks?.badge,
      href: '/tasks',
      Icon: CheckSquare,
    },
    {
      id: 'deliveries',
      label: 'Lieferungen',
      hint: highlights.deliveries?.subtitle || 'Anstehend und erledigt',
      badge: highlights.deliveries?.badge,
      href: '/deliverables',
      Icon: Package,
    },
  ]

  function openHero() {
    openWeeklyBriefing()
  }

  function openListen() {
    if (onReadReport) onReadReport()
    else openWeeklyBriefing()
  }

  return (
    <div className="st-day">
      <style>{STATUS_DAY_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="st-day-mobile-chrome">
        <header className="st-day-mobile-head">
          <div className="st-day-mobile-nav">
            <span className="st-day-mobile-nav-spacer" aria-hidden />
            <CodexMobileActionPill
              onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              onMenu={() => setNavOpen(true)}
            />
          </div>
          <h1 className="st-day-mobile-title">{mobileTitle}</h1>
        </header>
      </div>

      <div className="st-day-inner">
        <header className="st-day-top">
          <div className="st-day-context">
            <button
              type="button"
              className={`st-day-pill${scopeMenuOpen ? ' on' : ''}`}
              aria-label="Scope"
              aria-expanded={scopeMenuOpen}
              onClick={() => {
                setScopeMenuOpen(o => !o)
                setPeriodMenuOpen(false)
              }}
            >
              <span
                className="st-day-dot"
                style={{ background: activeScope?.color || '#F0F2F5' }}
              />
              <span>{activeScope?.label || 'Workspace'}</span>
            </button>
            <button
              type="button"
              className={`st-day-pill${periodMenuOpen ? ' on' : ''}`}
              aria-label="Zeitraum"
              aria-expanded={periodMenuOpen}
              onClick={() => {
                setPeriodMenuOpen(o => !o)
                setScopeMenuOpen(false)
              }}
            >
              {period}
            </button>

            {(scopeMenuOpen || periodMenuOpen) ? (
              <button type="button" className="st-day-backdrop" aria-label="Schließen" onClick={closeMenus} />
            ) : null}

            {scopeMenuOpen ? (
              <div className="st-day-menu st-day-menu--scope" role="listbox" aria-label="Scope">
                {scopeOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={option.id === activeScopeId}
                    className={`st-day-menu-item${option.id === activeScopeId ? ' on' : ''}`}
                    onClick={() => {
                      onScopeChange(option.id)
                      closeMenus()
                    }}
                  >
                    <span className="st-day-dot" style={{ background: option.color || '#F0F2F5' }} />
                    <span className="st-day-menu-label">{option.label}</span>
                    {option.id === activeScopeId ? <Check size={12} weight="bold" /> : null}
                  </button>
                ))}
              </div>
            ) : null}

            {periodMenuOpen ? (
              <div className="st-day-menu st-day-menu--period" role="menu" aria-label="Zeitraum">
                {periodOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    role="menuitem"
                    className={`st-day-menu-item${option === period ? ' on' : ''}`}
                    onClick={() => {
                      onPeriodChange(option)
                      closeMenus()
                    }}
                  >
                    <span className="st-day-menu-label">{option}</span>
                    {option === period ? <Check size={12} weight="bold" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="st-day-refresh"
            disabled={busy}
            onClick={onRefresh}
            aria-label="Status aktualisieren"
            title="Aktualisieren"
          >
            {busy ? 'Aktualisiert…' : 'Aktualisieren'}
          </button>
        </header>

        <button type="button" className="st-day-hero" onClick={openHero} disabled={busy && !previewLines.length}>
          <div className="st-day-hero-top">
            <p className="st-day-hero-date">{todayLabel}</p>
            {overall?.badge ? <span className="st-day-hero-badge">{overall.badge}</span> : null}
          </div>
          <h2 className="st-day-hero-title">Statusbericht</h2>
          <p className="st-day-hero-sub">
            {overall?.subtitle
              || (metaParts.length ? metaParts.join(', ') : 'Dein klarer Überblick für heute')}
          </p>
          {previewLines.length > 0 ? (
            <ul className="st-day-hero-lines">
              {previewLines.map(line => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="st-day-hero-empty">
              {busy ? 'Tagro schreibt den Bericht…' : 'Tippen, um den heutigen Bericht zu öffnen.'}
            </p>
          )}
          <div className="st-day-hero-actions" onClick={e => e.stopPropagation()}>
            <button type="button" className="st-day-btn st-day-btn--ghost" onClick={openListen} disabled={busy}>
              <Play size={13} weight="fill" />
              Anhören
            </button>
            <button type="button" className="st-day-btn st-day-btn--primary" onClick={openHero}>
              Öffnen
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>
        </button>

        <section className="st-day-signals" aria-label="Signale">
          {signals.map(signal => {
            const Icon = signal.Icon
            return (
              <Link key={signal.id} href={signal.href} className="st-day-signal">
                <span className="st-day-signal-ico" aria-hidden>
                  <Icon size={16} weight="regular" />
                </span>
                <span className="st-day-signal-copy">
                  <span className="st-day-signal-label">{signal.label}</span>
                  <span className="st-day-signal-hint">{signal.hint}</span>
                </span>
                {signal.badge ? <span className="st-day-signal-badge">{signal.badge}</span> : null}
                <ArrowRight size={12} weight="bold" className="st-day-signal-arrow" />
              </Link>
            )
          })}
        </section>

        <button
          type="button"
          className="st-day-ask"
          onClick={() => openTagro({
            ...STATUS_TAGRO_CONTEXT,
            prefill: 'Gib mir einen ruhigen Überblick: Status, Risiken, offene Entscheidungen und nächste Schritte.',
          })}
        >
          <span className="st-day-ask-mark" aria-hidden>
            <TagroComposeIcon size={15} />
          </span>
          <span className="st-day-ask-placeholder">Status, Risiken, nächste Schritte…</span>
          <span className="st-day-ask-send" aria-hidden>
            <ArrowUp size={13} weight="bold" />
          </span>
        </button>
      </div>
    </div>
  )
}
