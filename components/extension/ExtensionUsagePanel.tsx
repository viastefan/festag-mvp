'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTagroHealth } from '@/hooks/useTagroHealth'
import { FESTAG_CHROME_EXTENSION } from '@/lib/extension/chrome-extension'

type Stats = {
  periodDays: number
  improveCount: number
  appliedCount: number
  hourlyRemaining: number
  hourlyLimit: number
  topActions: { action: string; count: number }[]
  topDomains: { domain: string; count: number }[]
  styleSnippet: string | null
}

const ACTION_LABEL: Record<string, string> = {
  clearer: 'Klarer',
  professional: 'Professioneller',
  shorter: 'Kürzer',
  casual: 'Lockerer',
  explain: 'Erklären',
  translate: 'Übersetzen',
  feedback: 'Live-Feedback',
}

export default function ExtensionUsagePanel() {
  const { installed, sessionOk, checking, ready } = useTagroHealth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (checking) return
    if (!sessionOk) {
      setLoading(false)
      setStats(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch('/api/extension/stats', { credentials: 'include' })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'stats_failed')
        if (!cancelled) {
          setStats(data.stats)
          setError(null)
        }
      } catch {
        if (!cancelled) setError('Statistiken gerade nicht verfügbar.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [checking, sessionOk])

  if (checking) {
    return (
      <>
        <p className="eup-loading">Tagro-Nutzung wird geladen…</p>
        <style suppressHydrationWarning>{CSS}</style>
      </>
    )
  }

  if (!installed) {
    return (
      <>
        <div className="eup-empty">
          <p className="eup-title">Noch keine Nutzungsdaten</p>
          <p className="eup-lead">
            Installiere Tagro, um zu sehen, wie oft du Texte verbesserst und wo du es am häufigsten nutzt.
          </p>
          <Link className="eup-cta" href={FESTAG_CHROME_EXTENSION.appDownloadPath}>
            Tagro installieren
          </Link>
        </div>
        <style suppressHydrationWarning>{CSS}</style>
      </>
    )
  }

  if (!sessionOk) {
    return (
      <>
        <div className="eup-empty">
          <p className="eup-title">Anmeldung nötig</p>
          <p className="eup-lead">
            Tagro ist installiert — melde dich bei Festag an, um deine Schreibhilfe-Statistiken zu sehen.
          </p>
          <Link className="eup-cta" href="/login?returnTo=/settings/apps">
            Anmelden
          </Link>
        </div>
        <style suppressHydrationWarning>{CSS}</style>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <p className="eup-loading">Tagro-Nutzung wird geladen…</p>
        <style suppressHydrationWarning>{CSS}</style>
      </>
    )
  }

  if (error || !stats) {
    return (
      <>
        <p className="eup-muted">{error ?? 'Keine Daten.'}</p>
        <style suppressHydrationWarning>{CSS}</style>
      </>
    )
  }

  const hasUsage = stats.improveCount > 0 || stats.appliedCount > 0

  return (
    <>
      <div className="eup-panel">
        <p className="eup-title">Deine Schreibhilfe</p>
        <p className="eup-lead">
          Letzte {stats.periodDays} Tage — Tagro lernt aus Übernahmen, nicht aus abgebrochenen Vorschlägen.
        </p>

        <div className="eup-metrics">
          <div className="eup-metric">
            <strong>{stats.improveCount}</strong>
            <span>Verbesserungen</span>
          </div>
          <div className="eup-metric">
            <strong>{stats.appliedCount}</strong>
            <span>Übernommen</span>
          </div>
          <div className="eup-metric">
            <strong>{stats.hourlyRemaining}</strong>
            <span>Verbleibend / Std.</span>
          </div>
        </div>

        {!hasUsage && ready ? (
          <p className="eup-hint">
            Noch keine Verbesserungen — markiere Text auf Gmail oder LinkedIn, nachdem du die Seite mit F5 neu geladen hast.
          </p>
        ) : null}

        {stats.topActions.length > 0 ? (
          <div className="eup-block">
            <p className="eup-kicker">Häufigste Aktionen</p>
            <div className="eup-chips">
              {stats.topActions.map((a) => (
                <span key={a.action} className="eup-chip">
                  {ACTION_LABEL[a.action] ?? a.action} ({a.count})
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {stats.topDomains.length > 0 ? (
          <div className="eup-block">
            <p className="eup-kicker">Top-Seiten</p>
            <ul className="eup-domains">
              {stats.topDomains.map((d) => (
                <li key={d.domain}>
                  <span>{d.domain}</span>
                  <span className="eup-count">{d.count}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {stats.styleSnippet ? (
          <div className="eup-block">
            <p className="eup-kicker">Gelernte Schreibpräferenz</p>
            <p className="eup-style">{stats.styleSnippet}</p>
          </div>
        ) : (
          <p className="eup-muted">
            Noch keine gelernte Schreibpräferenz — übernimm ein paar Vorschläge, dann passt Tagro sich an.
          </p>
        )}
      </div>
      <style suppressHydrationWarning>{CSS}</style>
    </>
  )
}

const CSS = `
  .eup-panel {
    margin-top: 20px;
    padding: 16px;
    border-radius: 16px;
    background: #f5f5f7;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }
  [data-theme="dark"] .eup-panel,
  [data-theme="classic-dark"] .eup-panel {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .eup-empty {
    margin-top: 20px;
    padding: 16px;
    border-radius: 16px;
    background: #f5f5f7;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }
  [data-theme="dark"] .eup-empty,
  [data-theme="classic-dark"] .eup-empty {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .eup-title {
    margin: 0 0 4px;
    font-size: 15px;
    font-weight: 600;
    color: var(--portal-text, #1d1d1f);
  }
  .eup-lead {
    margin: 0 0 14px;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
  .eup-empty .eup-lead { margin-bottom: 12px; }
  .eup-cta {
    display: inline-flex;
    align-items: center;
    height: 36px;
    padding: 0 14px;
    border-radius: 999px;
    background: var(--festag-btn-dark, #2d2e2c);
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
  }
  .eup-cta:hover { background: var(--festag-btn-dark-hover, #000); }
  .eup-hint {
    margin: 0 0 14px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #fff;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
  [data-theme="dark"] .eup-hint,
  [data-theme="classic-dark"] .eup-hint {
    background: rgba(255, 255, 255, 0.06);
  }
  .eup-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 14px;
  }
  .eup-metric {
    padding: 10px 12px;
    border-radius: 12px;
    background: #fff;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  [data-theme="dark"] .eup-metric,
  [data-theme="classic-dark"] .eup-metric {
    background: rgba(255, 255, 255, 0.06);
  }
  .eup-metric strong {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--portal-text, #1d1d1f);
  }
  .eup-metric span {
    font-size: 11px;
    color: var(--portal-muted, #86868b);
  }
  .eup-block { margin-bottom: 12px; }
  .eup-kicker {
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--portal-muted, #86868b);
  }
  .eup-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .eup-chip {
    display: inline-flex;
    height: 28px;
    align-items: center;
    padding: 0 10px;
    border-radius: 999px;
    background: #fff;
    font-size: 12px;
    color: var(--portal-text, #1d1d1f);
  }
  [data-theme="dark"] .eup-chip,
  [data-theme="classic-dark"] .eup-chip {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  .eup-domains {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .eup-domains li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 12.5px;
    color: var(--portal-text, #1d1d1f);
  }
  .eup-count {
    font-variant-numeric: tabular-nums;
    color: var(--portal-muted, #86868b);
  }
  .eup-style {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--portal-text, #1d1d1f);
  }
  .eup-muted, .eup-loading {
    margin: 16px 0 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
`
