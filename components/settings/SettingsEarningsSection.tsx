'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowClockwise, FileText, Wallet } from '@phosphor-icons/react'
import {
  EARNINGS_PERIODS,
  formatActivityDate,
  formatEurCents,
  formatShortDate,
  resolveEarningsView,
  type EarningsOverview,
  type EarningsPeriodKey,
  type EarningsView,
} from '@/lib/settings/earnings'
import { settingsHref } from '@/components/settings/settings-config'

type Props = {
  wsMode: 'delivery' | 'team' | 'agency' | null
  role: string | null | undefined
  setError: (msg: string) => void
}

const COPY: Record<
  EarningsView,
  {
    heroTitle: string
    balanceTitle: string
    availableLabel: string
    outstandingLabel: string
    emptyTitle: string
    emptyBody: string
    emptyCta: string
    emptyHref: string
    txEmpty: string
    activityEmpty: string
    detailsHref: string
    detailsLabel: string
    modeNote: ReactNode
  }
> = {
  agency: {
    heroTitle: 'Neueste Einnahmen',
    balanceTitle: 'Saldo',
    availableLabel: 'Zur Auszahlung verfügbar',
    outstandingLabel: 'Offene Rechnungen',
    emptyTitle: 'Noch keine Rechnungen',
    emptyBody:
      'Sobald du Rechnungen an Kunden stellst und Zahlungen eingehen, erscheinen sie hier — Beträge, Status und Aktivität.',
    emptyCta: 'Zu Dokumenten',
    emptyHref: '/documents',
    txEmpty: 'Keine Rechnungen in diesem Zeitraum.',
    activityEmpty: 'Noch keine Rechnungsaktivität in diesem Zeitraum.',
    detailsHref: '/documents',
    detailsLabel: 'Zu Dokumenten',
    modeNote: (
      <>
        Agency-Modus: Übersicht über <strong>Rechnungen</strong> und Kundenzahlungen.
      </>
    ),
  },
  earnings: {
    heroTitle: 'Neueste Verdienste',
    balanceTitle: 'Saldo',
    availableLabel: 'Zur Auszahlung verfügbar',
    outstandingLabel: 'Ausstehende Zahlungen',
    emptyTitle: 'Noch kein Verdienst',
    emptyBody:
      'Bezahlte Meilensteine und Verdienste aus deinen Projekten erscheinen hier — inklusive Auszahlungsübersicht und Aktivität.',
    emptyCta: 'Zu Projekten',
    emptyHref: '/projects',
    txEmpty: 'Keine Transaktionen in diesem Zeitraum.',
    activityEmpty: 'Noch keine Verdienst-Aktivität in diesem Zeitraum.',
    detailsHref: '/projects',
    detailsLabel: 'Zu Projekten',
    modeNote: (
      <>
        Verdienst-Ansicht: Übersicht über <strong>Verdienste</strong> und Auszahlungen aus Projekten.
      </>
    ),
  },
}

export default function SettingsEarningsSection({ wsMode, role, setError }: Props) {
  const viewHint = useMemo(() => resolveEarningsView(wsMode, role), [wsMode, role])
  const [period, setPeriod] = useState<EarningsPeriodKey>('year')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [data, setData] = useState<EarningsOverview | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    setError('')
    try {
      const res = await fetch(`/api/settings/earnings?period=${period}`, { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = json?.error || 'Einnahmen konnten nicht geladen werden.'
        setLoadError(msg)
        setError(msg)
        setData(null)
        return
      }
      setData(json as EarningsOverview)
    } catch {
      const msg = 'Einnahmen konnten nicht geladen werden.'
      setLoadError(msg)
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [period, setError])

  useEffect(() => {
    void load()
  }, [load])

  const view = data?.view ?? viewHint
  const copy = COPY[view]
  const heroCents = data?.hero.totalCents ?? 0
  const change = data?.hero.changePercent
  const chart = data?.chart ?? []
  const maxBar = Math.max(1, ...chart.map(c => c.cents))
  const yMax = niceCeil(maxBar / 100) * 100
  const yTicks = [0, Math.round(yMax / 3), Math.round((yMax * 2) / 3), yMax]
  const isEmpty = !loading && Boolean(data?.empty)
  const showRetry = !loading && Boolean(loadError) && !data

  return (
    <div className="earn-root" aria-busy={loading}>
      <style>{EARN_CSS}</style>

      <div className="earn-mode-note">{copy.modeNote}</div>

      {showRetry ? (
        <div className="earn-empty-card">
          <strong>Laden fehlgeschlagen</strong>
          <p>{loadError}</p>
          <button type="button" className="set-btn set-btn-primary" onClick={() => void load()}>
            <ArrowClockwise size={14} weight="regular" aria-hidden />
            Erneut laden
          </button>
        </div>
      ) : (
        <div className="earn-layout">
          <section className="earn-panel earn-hero-panel">
            <div className="earn-hero-top">
              <div className="earn-hero-copy">
                <div className="earn-section-label">{copy.heroTitle}</div>
                <div className="earn-hero-amount">
                  {loading ? <span className="earn-skel earn-skel-lg" /> : formatEurCents(heroCents)}
                </div>
                <div
                  className={`earn-hero-delta${
                    change == null ? '' : change > 0 ? ' is-up' : change < 0 ? ' is-down' : ''
                  }`}
                >
                  {loading
                    ? <span className="earn-skel earn-skel-sm" />
                    : change == null
                      ? 'Kein Vergleich zum vorherigen Zeitraum'
                      : `${change > 0 ? '+' : ''}${change} % ggü. dem vorherigen Zeitraum`}
                </div>
              </div>
              <label className="earn-period">
                <span className="sr-only">Zeitraum</span>
                <select
                  className="set-select earn-period-select"
                  value={period}
                  onChange={e => setPeriod(e.target.value as EarningsPeriodKey)}
                  disabled={loading}
                >
                  {EARNINGS_PERIODS.map(p => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="earn-chart" role="img" aria-label={`${copy.heroTitle}, Diagramm`}>
              <div className="earn-chart-y" aria-hidden>
                {[...yTicks].reverse().map(t => (
                  <span key={t}>{t}€</span>
                ))}
              </div>
              <div className="earn-chart-plot">
                <div className="earn-chart-grid" aria-hidden>
                  {yTicks.map(t => (
                    <span key={t} />
                  ))}
                </div>
                <div className="earn-chart-bars">
                  {chart.map(point => {
                    const h = yMax <= 0 ? 0 : Math.max(point.cents > 0 ? 4 : 0, (point.cents / (yMax * 100)) * 100)
                    return (
                      <div key={point.label} className="earn-bar-col" title={`${point.label}: ${formatEurCents(point.cents)}`}>
                        <div className={`earn-bar${loading ? ' is-loading' : ''}`} style={{ height: loading ? '18%' : `${h}%` }} />
                        <span className="earn-bar-label">{point.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          <aside className="earn-panel earn-saldo-panel">
            <div className="earn-section-label">{copy.balanceTitle}</div>
            <div className="earn-saldo-amount">
              {loading ? <span className="earn-skel earn-skel-lg" /> : formatEurCents(data?.balance.availableCents ?? 0)}
            </div>
            <div className="earn-saldo-rows">
              <div className="earn-saldo-row">
                <span>{copy.availableLabel}</span>
                <strong>{loading ? '—' : formatEurCents(data?.balance.availableCents ?? 0)}</strong>
              </div>
              <div className="earn-saldo-row">
                <span>{copy.outstandingLabel}</span>
                <strong>{loading ? '—' : formatEurCents(data?.balance.outstandingCents ?? 0)}</strong>
              </div>
              <div className="earn-saldo-row">
                <span>Nächste Auszahlung</span>
                <strong>{loading ? '—' : data?.balance.nextPayoutLabel || 'Nicht geplant'}</strong>
              </div>
            </div>
            <Link href={copy.detailsHref} className="set-btn earn-details-btn">
              {copy.detailsLabel}
            </Link>
          </aside>

          {isEmpty ? (
            <section className="earn-panel earn-empty-panel">
              <strong>{copy.emptyTitle}</strong>
              <p>{copy.emptyBody}</p>
              <div className="earn-empty-actions">
                <Link href={copy.emptyHref} className="set-btn set-btn-primary">
                  {copy.emptyCta}
                </Link>
                {view === 'agency' ? (
                  <Link href={settingsHref('documents')} className="set-btn">
                    Rechnungssteller
                  </Link>
                ) : null}
              </div>
            </section>
          ) : (
            <>
              <section className="earn-panel earn-tx-panel">
                <div className="earn-panel-head">
                  <div className="earn-section-label">Kürzliche Transaktionen</div>
                  <Link href={copy.detailsHref} className="earn-link">
                    Alle anzeigen
                  </Link>
                </div>

                {loading ? (
                  <p className="earn-empty-inline">Lade Transaktionen…</p>
                ) : !data?.transactions.length ? (
                  <p className="earn-empty-inline">{copy.txEmpty}</p>
                ) : (
                  <>
                    <div className="earn-table earn-table-desktop" role="table">
                      <div className="earn-tr earn-th" role="row">
                        <span role="columnheader">Datum</span>
                        <span role="columnheader">Status</span>
                        <span role="columnheader">Beschreibung</span>
                        <span role="columnheader">Betrag</span>
                        <span role="columnheader">Netto</span>
                      </div>
                      {data.transactions.map(tx => {
                        const row = (
                          <>
                            <span role="cell">{formatShortDate(tx.date)}</span>
                            <span role="cell">
                              <span className={`earn-badge${isPositiveStatus(tx.status) ? ' is-ok' : ''}`}>
                                {tx.statusLabel}
                              </span>
                            </span>
                            <span role="cell" className="earn-desc">
                              <span className="earn-desc-type">{tx.typeLabel}</span>
                              {tx.title ? <span className="earn-desc-title">{tx.title}</span> : null}
                            </span>
                            <span role="cell" className="earn-num">
                              {formatEurCents(tx.amountCents, tx.currency)}
                            </span>
                            <span role="cell" className="earn-num">
                              {formatNetto(tx.netCents, tx.currency)}
                            </span>
                          </>
                        )
                        return tx.href ? (
                          <Link key={tx.id} href={tx.href} className="earn-tr earn-tr-link" role="row">
                            {row}
                          </Link>
                        ) : (
                          <div key={tx.id} className="earn-tr" role="row">
                            {row}
                          </div>
                        )
                      })}
                    </div>
                    <div className="earn-table-mobile">
                      {data.transactions.map(tx => {
                        const body = (
                          <>
                            <div className="earn-tx-card-top">
                              <span>{formatShortDate(tx.date)}</span>
                              <span className={`earn-badge${isPositiveStatus(tx.status) ? ' is-ok' : ''}`}>
                                {tx.statusLabel}
                              </span>
                            </div>
                            <div className="earn-tx-card-mid">
                              <span>{tx.typeLabel}</span>
                              <strong>{formatEurCents(tx.amountCents, tx.currency)}</strong>
                            </div>
                            {tx.title ? <div className="earn-tx-card-sub">{tx.title}</div> : null}
                          </>
                        )
                        return tx.href ? (
                          <Link key={tx.id} href={tx.href} className="earn-tx-card earn-tx-card-link">
                            {body}
                          </Link>
                        ) : (
                          <div key={tx.id} className="earn-tx-card">
                            {body}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </section>

              <aside className="earn-panel earn-activity-panel">
                <div className="earn-panel-head">
                  <div className="earn-section-label">Aktivität</div>
                  <Link href={copy.detailsHref} className="earn-link">
                    Alle anzeigen
                  </Link>
                </div>
                {loading ? (
                  <p className="earn-empty-inline">Lade Aktivität…</p>
                ) : !data?.activity.length ? (
                  <p className="earn-empty-inline">{copy.activityEmpty}</p>
                ) : (
                  <ul className="earn-activity">
                    {data.activity.map(item => {
                      const inner = (
                        <>
                          <span className="earn-activity-icon" aria-hidden>
                            {view === 'agency' ? (
                              <FileText size={16} weight="regular" />
                            ) : (
                              <Wallet size={16} weight="regular" />
                            )}
                          </span>
                          <div>
                            <p>{item.text}</p>
                            <time dateTime={item.date}>{formatActivityDate(item.date)}</time>
                          </div>
                        </>
                      )
                      return (
                        <li key={item.id} className="earn-activity-item">
                          {item.href ? (
                            <Link href={item.href} className="earn-activity-link">
                              {inner}
                            </Link>
                          ) : (
                            inner
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </aside>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function isPositiveStatus(status: string) {
  return status === 'paid' || status === 'final'
}

function formatNetto(cents: number, currency = 'EUR') {
  const n = (cents || 0) / 100
  return `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ${currency}`
}

function niceCeil(n: number) {
  if (n <= 0) return 100
  const pow = 10 ** Math.floor(Math.log10(n))
  return Math.ceil(n / pow) * pow
}

const EARN_CSS = `
.earn-root {
  padding: 0 0 8px;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-weight: 400;
}
.earn-mode-note {
  margin: 0 24px 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--set-text) 4%, transparent);
  border: 1px solid var(--set-stroke);
  color: var(--set-text-muted);
  font-size: 13px;
  line-height: 1.5;
}
.earn-mode-note strong {
  color: var(--set-text);
  font-weight: 500;
}

.earn-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 0 24px 8px;
}
@media (min-width: 720px) {
  .earn-layout {
    grid-template-columns: minmax(0, 1.55fr) minmax(220px, 0.9fr);
    grid-template-areas:
      "hero saldo"
      "tx activity";
    gap: 16px 16px;
    align-items: start;
  }
  .earn-hero-panel { grid-area: hero; }
  .earn-saldo-panel { grid-area: saldo; }
  .earn-tx-panel { grid-area: tx; }
  .earn-activity-panel { grid-area: activity; }
  .earn-empty-panel {
    grid-column: 1 / -1;
  }
}

.earn-panel {
  background: var(--festag-glass-bg-soft, rgba(255, 255, 255, 0.42));
  border: 1px solid var(--festag-glass-border, rgba(255, 255, 255, 0.62));
  box-shadow: var(--festag-glass-shadow-soft, none);
  backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
  -webkit-backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
  border-radius: 16px;
  padding: 18px 18px 16px;
}
html[data-theme="dark"] .earn-panel,
html[data-theme="classic-dark"] .earn-panel {
  background: rgba(255, 255, 255, 0.035);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.earn-section-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--set-text);
  margin-bottom: 8px;
}

.earn-hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.earn-hero-amount {
  font-size: 34px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--set-text);
  font-weight: 400;
  min-height: 1.1em;
}
.earn-hero-delta {
  margin-top: 6px;
  font-size: 13px;
  color: var(--set-text-muted);
  min-height: 1.2em;
}
.earn-hero-delta.is-up { color: #1f8f5f; }
.earn-hero-delta.is-down { color: #b42318; }
html[data-theme="dark"] .earn-hero-delta.is-up,
html[data-theme="classic-dark"] .earn-hero-delta.is-up {
  color: #3dd68c;
}

.earn-period-select {
  min-width: 148px;
  height: 36px;
}

.earn-skel {
  display: inline-block;
  border-radius: 6px;
  background: color-mix(in srgb, var(--set-text) 8%, transparent);
  animation: earn-pulse 1.1s ease-in-out infinite;
}
.earn-skel-lg { width: 140px; height: 32px; }
.earn-skel-sm { width: 180px; height: 14px; }
@keyframes earn-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.85; }
}

.earn-chart {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 8px;
  min-height: 180px;
}
.earn-chart-y {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 0 22px;
  font-size: 11px;
  color: var(--set-text-muted);
}
.earn-chart-plot {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.earn-chart-grid {
  position: absolute;
  inset: 0 0 22px 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}
.earn-chart-grid span {
  display: block;
  height: 1px;
  background: color-mix(in srgb, var(--set-text) 8%, transparent);
}
.earn-chart-bars {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  min-height: 150px;
  padding-bottom: 22px;
}
.earn-bar-col {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}
.earn-bar {
  width: 70%;
  max-width: 28px;
  min-height: 0;
  border-radius: 4px 4px 2px 2px;
  background: color-mix(in srgb, #2f6f66 78%, #1d1d1f 22%);
  transition: height 0.25s ease;
}
.earn-bar.is-loading {
  opacity: 0.35;
}
html[data-theme="dark"] .earn-bar,
html[data-theme="classic-dark"] .earn-bar {
  background: color-mix(in srgb, #5bb8a8 70%, #ffffff 30%);
}
.earn-bar-label {
  font-size: 10px;
  line-height: 1.2;
  color: var(--set-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
}

.earn-saldo-amount {
  font-size: 30px;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin-bottom: 14px;
  min-height: 1.15em;
}
.earn-saldo-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}
.earn-saldo-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--set-text-muted);
}
.earn-saldo-row strong {
  color: var(--set-text);
  font-weight: 500;
  text-align: right;
}
.earn-details-btn {
  width: 100%;
  justify-content: center;
}

.earn-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.earn-panel-head .earn-section-label { margin-bottom: 0; }
.earn-link {
  font-size: 13px;
  color: var(--set-text-muted);
  text-decoration: none;
}
.earn-link:hover { color: var(--set-text); }

.earn-table { display: none; }
.earn-table-mobile { display: flex; flex-direction: column; gap: 8px; }
@media (min-width: 720px) {
  .earn-table-desktop { display: block; }
  .earn-table-mobile { display: none; }
}

.earn-tr {
  display: grid;
  grid-template-columns: 52px 0.85fr 1.4fr 0.9fr 0.9fr;
  gap: 8px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--set-text) 7%, transparent);
  font-size: 13px;
  color: var(--set-text);
  text-decoration: none;
}
.earn-tr-link:hover {
  background: color-mix(in srgb, var(--set-text) 3%, transparent);
}
.earn-th {
  color: var(--set-text-muted);
  font-size: 12px;
  padding-top: 0;
  border-bottom-color: color-mix(in srgb, var(--set-text) 10%, transparent);
}
.earn-num { text-align: right; font-variant-numeric: tabular-nums; }
.earn-desc {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.earn-desc-type { color: var(--set-text); }
.earn-desc-title {
  font-size: 12px;
  color: var(--set-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.earn-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  background: color-mix(in srgb, var(--set-text) 8%, transparent);
  color: var(--set-text);
}
.earn-badge.is-ok {
  background: color-mix(in srgb, #1f8f5f 18%, transparent);
  color: #146c47;
}
html[data-theme="dark"] .earn-badge.is-ok,
html[data-theme="classic-dark"] .earn-badge.is-ok {
  background: rgba(61, 214, 140, 0.16);
  color: #8ef0bf;
}

.earn-tx-card {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--set-stroke);
  background: transparent;
  text-decoration: none;
  color: inherit;
  display: block;
}
.earn-tx-card-link:hover {
  background: color-mix(in srgb, var(--set-text) 3%, transparent);
}
.earn-tx-card-top,
.earn-tx-card-mid {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.earn-tx-card-mid {
  margin-top: 8px;
  font-size: 14px;
}
.earn-tx-card-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--set-text-muted);
}

.earn-activity {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.earn-activity-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.earn-activity-link {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  text-decoration: none;
  color: inherit;
  width: 100%;
  border-radius: 8px;
}
.earn-activity-link:hover .earn-activity-icon {
  background: color-mix(in srgb, var(--set-text) 10%, transparent);
}
.earn-activity-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--set-text) 6%, transparent);
  color: var(--set-text-muted);
}
.earn-activity-item p {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--set-text);
}
.earn-activity-item time {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--set-text-muted);
}

.earn-empty-inline {
  margin: 8px 0 4px;
  font-size: 13px;
  color: var(--set-text-muted);
  line-height: 1.5;
}

.earn-empty-card,
.earn-empty-panel {
  margin: 0;
  padding: 18px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
.earn-empty-card {
  margin: 0 24px 16px;
  background: var(--festag-glass-bg-soft, rgba(255, 255, 255, 0.42));
  border: 1px solid var(--festag-glass-border, rgba(255, 255, 255, 0.62));
  box-shadow: var(--festag-glass-shadow-soft, none);
  backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
  -webkit-backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
}
html[data-theme="dark"] .earn-empty-card,
html[data-theme="classic-dark"] .earn-empty-card {
  background: rgba(255, 255, 255, 0.035);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.earn-empty-card strong,
.earn-empty-panel strong {
  font-size: 15px;
  font-weight: 500;
}
.earn-empty-card p,
.earn-empty-panel p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--set-text-muted);
  max-width: 52ch;
}
.earn-empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
.earn-empty-card .set-btn-primary,
.earn-empty-panel .set-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.set-codex-frame:has(.earn-root) {
  max-width: 960px;
}

@media (max-width: 768px) {
  .earn-mode-note,
  .earn-layout,
  .earn-empty-card {
    margin-left: 16px;
    margin-right: 16px;
  }
  .earn-layout { padding-left: 0; padding-right: 0; }
  .earn-mode-note { margin-left: 0; margin-right: 0; }
  .earn-empty-card { margin-left: 0; margin-right: 0; }
  .earn-hero-amount { font-size: 28px; }
  .earn-chart-bars { gap: 2px; }
  .earn-bar-label { font-size: 9px; }
  .earn-saldo-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .earn-saldo-row strong { text-align: left; }
}
`
