'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, ChartLineUp, Sparkle } from '@phosphor-icons/react'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { EXECUTIVE_CSS } from '@/components/executive/executive-styles'
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
  const [generatingReport, setGeneratingReport] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [overviewRes, reportRes] = await Promise.all([
        fetch('/api/executive/overview', { credentials: 'include' }),
        fetch('/api/executive/daily-report', { credentials: 'include' }),
      ])
      const overviewData = overviewRes.ok ? await overviewRes.json().catch(() => null) : null
      const reportData = reportRes.ok ? await reportRes.json().catch(() => null) : null
      setOverview(overviewData?.overview ?? null)
      setDailyReport(reportData?.report ?? null)
    } catch {
      setOverview(null)
      setDailyReport(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const generateDailyReport = useCallback(async () => {
    setGeneratingReport(true)
    try {
      const res = await fetch('/api/executive/daily-report', {
        method: 'POST',
        credentials: 'include',
      })
      const data = res.ok ? await res.json().catch(() => null) : null
      if (data?.report) setDailyReport(data.report)
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

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <header className="dec-page-head">
            <div className="dec-page-head-copy dec-m-title">
              <h1 className="dec-page-title">
                <span className="dec-dt">Executive</span>
                <span className="dec-m-t">Executive</span>
              </h1>
              <div className="dec-page-lead dec-dt">
                <p className="dec-page-lead-line">
                  {loading ? 'Lade Überblick…' : overview?.headline ?? 'Operational Intelligence'}
                </p>
                {!loading && overview?.summary && (
                  <p className="dec-page-lead-line">{overview.summary}</p>
                )}
              </div>
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
          {!loading && overview && (
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
                  <p className="dec-empty">Noch keine Projekte — Executive View füllt sich automatisch.</p>
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
                <Link href="/decisions" className="exec-foot-link">Entscheidungen</Link>
                <Link href="/dashboard" className="exec-foot-link">
                  <ChartLineUp size={14} />
                  Statusabfrage
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
