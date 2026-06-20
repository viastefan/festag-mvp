'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, ChartLineUp, Sparkle, WarningCircle } from '@phosphor-icons/react'
import MobilePageHeader from '@/components/MobilePageHeader'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { EXECUTIVE_CSS } from '@/components/executive/executive-styles'
import { fetchJson } from '@/lib/portal/fetch-api'
import type { ExecutiveOverview, ExecutiveHealth, ExecutiveDailyReport } from '@/lib/executive/types'

const HEALTH_LABEL: Record<ExecutiveHealth, string> = {
  healthy: 'Planmäßig',
  watch: 'Im Blick',
  risk: 'Erhöhtes Risiko',
  blocked: 'Blockiert',
}

export default function ExecutivePage() {
  const [overview, setOverview] = useState<ExecutiveOverview | null>(null)
  const [dailyReport, setDailyReport] = useState<ExecutiveDailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchJson<{ overview: ExecutiveOverview }>('/api/executive/overview')
    if (res.ok && res.data?.overview) {
      setOverview(res.data.overview)
    } else {
      setOverview(null)
      setError(
        res.status === 401
          ? 'Bitte erneut anmelden.'
          : res.error || 'Executive-Überblick konnte nicht geladen werden.',
      )
    }
    setLoading(false)
  }, [])

  const loadDailyReport = useCallback(async () => {
    setReportLoading(true)
    const res = await fetchJson<{ report: ExecutiveDailyReport }>('/api/executive/daily-report')
    if (res.ok && res.data?.report) setDailyReport(res.data.report)
    setReportLoading(false)
  }, [])

  const load = useCallback(async () => {
    await loadOverview()
    void loadDailyReport()
  }, [loadOverview, loadDailyReport])

  const generateDailyReport = useCallback(async () => {
    setGeneratingReport(true)
    try {
      const res = await fetchJson<{ report: ExecutiveDailyReport }>(
        '/api/executive/daily-report',
        { method: 'POST' },
        60_000,
      )
      if (res.ok && res.data?.report) setDailyReport(res.data.report)
    } finally {
      setGeneratingReport(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const forecastText =
    overview?.forecast_days_min != null && overview.forecast_days_max != null
      ? `Geschätzte Verzögerung bei aktuellen Blockern: ${overview.forecast_days_min}–${overview.forecast_days_max} Tage.`
      : null

  return (
    <div className="dec-os">
      <style>{DECISION_CSS}</style>
      <style>{EXECUTIVE_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <div className="dec-legacy-mph">
            <MobilePageHeader
              title="Executive"
              menuItems={[
                { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
                { id: 'tagro', label: 'Tagro Tagesbericht', onClick: () => void generateDailyReport() },
              ]}
            />
          </div>

          <header className="dec-page-head">
            <div className="dec-page-head-copy dec-m-title">
              <h1 className="dec-page-title">
                <span className="dec-dt">Executive</span>
                <span className="dec-m-t">Executive</span>
              </h1>
              <p className="dec-m-subline">
                <span className="dec-m-t dec-m-sub">
                  {loading
                    ? 'Lade…'
                    : overview
                      ? `${overview.projects.length} Projekt${overview.projects.length === 1 ? '' : 'e'} · ${HEALTH_LABEL[overview.health]}`
                      : 'Operational Intelligence'}
                </span>
              </p>
              <div className="dec-page-lead dec-dt">
                <p className="dec-page-lead-line">
                  {loading
                    ? 'Portfolio-Überblick wird geladen…'
                    : overview?.headline ?? error ?? 'Operational Intelligence für Führungskräfte.'}
                </p>
                {!loading && overview?.summary && (
                  <p className="dec-page-lead-line">{overview.summary}</p>
                )}
              </div>
            </div>

            <div className="dec-m-head-actions">
              <CodexMobileActionPill
                onMenu={() => setNavOpen(true)}
                onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              />
            </div>

            <div className="dec-page-actions dec-dt">
              <button
                type="button"
                className="dec-head-tool"
                title="Aktualisieren"
                aria-label="Aktualisieren"
                onClick={() => void load()}
              >
                <ArrowsClockwise size={15} weight="regular" />
              </button>
            </div>
          </header>
        </div>

        <div className="dec-scroll-body">
          {loading ? (
            <p className="dec-empty">Lade Executive-Überblick…</p>
          ) : error ? (
            <div className="dec-empty">
              <WarningCircle size={16} />
              <p>{error}</p>
              <small>Prüfe deine Verbindung oder lade die Seite neu.</small>
              <button type="button" className="dec-cta" style={{ marginTop: 16 }} onClick={() => void load()}>
                Erneut laden
              </button>
            </div>
          ) : overview ? (
            <>
              <div className={`exec-health exec-health--${overview.health}`}>
                <span className="exec-health-dot" />
                {HEALTH_LABEL[overview.health]}
              </div>

              <div className="exec-metrics">
                <div className="exec-metric">
                  <p className="exec-metric-label">Fortschritt</p>
                  <p className="exec-metric-value">{overview.progress_pct}%</p>
                  <p className="exec-metric-sub">über alle Projekte</p>
                </div>
                <div className="exec-metric">
                  <p className="exec-metric-label">Issues</p>
                  <p className="exec-metric-value">{overview.open_issues}</p>
                  <p className="exec-metric-sub">{overview.critical_issues} kritisch</p>
                </div>
                <div className="exec-metric">
                  <p className="exec-metric-label">Entscheidungen</p>
                  <p className="exec-metric-value">{overview.open_decisions}</p>
                  <p className="exec-metric-sub">offen</p>
                </div>
                <Link href="/objectives" className="exec-metric exec-metric--link">
                  <p className="exec-metric-label">Objectives</p>
                  <p className="exec-metric-value">{overview.active_objectives}</p>
                  <p className="exec-metric-sub">{overview.objectives_at_risk} at risk</p>
                </Link>
                <div className="exec-metric">
                  <p className="exec-metric-label">Velocity</p>
                  <p className="exec-metric-value">{overview.velocity_7d}</p>
                  <p className="exec-metric-sub">abgeschlossen · 7 Tage</p>
                </div>
              </div>

              {forecastText && (
                <p className="exec-forecast">{forecastText}</p>
              )}

              {reportLoading && !dailyReport && (
                <p className="dec-empty" style={{ padding: '12px 0' }}>Tagro Tagesbericht wird geladen…</p>
              )}

              {dailyReport && (
                <section className="exec-daily" aria-label="Tagro Tagesbericht">
                  <div className="exec-daily-head">
                    <div>
                      <p className="exec-daily-kicker">{dailyReport.title}</p>
                      <p className="exec-daily-date">{dailyReport.date_label}</p>
                    </div>
                    <button
                      type="button"
                      className="exec-daily-gen"
                      disabled={generatingReport}
                      onClick={() => void generateDailyReport()}
                      title="Tagro Tagesbericht neu generieren"
                    >
                      <Sparkle size={14} weight="regular" />
                      {generatingReport ? 'Generiere…' : 'Tagro'}
                    </button>
                  </div>
                  <div className="exec-daily-body">
                    {dailyReport.body.split('\n').map((line, i) => (
                      line.trim() ? <p key={i}>{line}</p> : <br key={i} />
                    ))}
                  </div>
                  {dailyReport.highlights.length > 0 && (
                    <ul className="exec-daily-highlights">
                      {dailyReport.highlights.map(h => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              <div className="exec-projects">
                {overview.projects.length === 0 ? (
                  <div className="dec-empty">
                    <ChartLineUp size={16} />
                    <p>Noch keine Projekte im Executive-Überblick.</p>
                    <small>Sobald Projekte laufen, zeigt Festag hier Fortschritt, Risiken und Forecast.</small>
                    <Link href="/projects" className="dec-cta" style={{ marginTop: 16, display: 'inline-flex' }}>
                      Projekte öffnen
                    </Link>
                  </div>
                ) : overview.projects.map(p => (
                  <Link key={p.id} href={`/project/${p.id}`} className="exec-project-row">
                    <div>
                      <div className="exec-project-title">
                        <span className="exec-project-dot" style={{ background: p.color || '#64748b' }} />
                        <p className="exec-project-name">{p.title}</p>
                      </div>
                      {p.summary && <p className="exec-project-summary">{p.summary}</p>}
                    </div>
                    <div className="exec-cell">
                      <strong>{p.progress_pct}%</strong>
                      Fortschritt
                    </div>
                    <div className="exec-cell">
                      <strong>{p.open_issues}</strong>
                      Issues
                    </div>
                    <div className="exec-cell">
                      <strong>{p.open_decisions}</strong>
                      Entscheidungen
                    </div>
                    <div className="exec-cell">
                      <strong>{HEALTH_LABEL[p.health]}</strong>
                      Status
                    </div>
                  </Link>
                ))}
              </div>

              <div className="exec-foot">
                <Link href="/issues" className="exec-foot-link">Issues</Link>
                <Link href="/objectives" className="exec-foot-link">Objectives</Link>
                <Link href="/decisions" className="exec-foot-link">Entscheidungen</Link>
                <Link href="/dashboard" className="exec-foot-link">
                  <ChartLineUp size={14} />
                  Statusabfrage
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{
            contextType: 'empty',
            id: 'executive',
            title: 'Executive · Portfolio',
            subtitle: overview
              ? `${overview.projects.length} Projekte · ${HEALTH_LABEL[overview.health]}`
              : 'Operational Intelligence',
          }}
        />
      </div>
    </div>
  )
}
